// ApiService.ts
// Service HTTP adaptive : decouvre automatiquement le serveur sur le reseau local
// via le module Kotlin natif (scan reseau + ping natif + IP device).

import { NativeModules, Platform } from 'react-native';
import { logInfo, logError } from './Logger';

const { NetworkModule } = NativeModules;

const PORT = 8389; // SYNC: NetworkModule.kt, main.rs
const REQUEST_TIMEOUT_MS = 10000;
const PING_TIMEOUT_MS = 800;

const CANDIDATE_URLS: string[] = [
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${PORT}`,
];

let currentBaseUrl: string = CANDIDATE_URLS[0];
let discoveryEnCours = false;
let deviceIP: string | null = null;

// Etat de reconnexion
let connecte = false;
let tentativeEchecs = 0;
let listeners: Array<(connecte: boolean) => void> = [];

export const onConnectionChange = (cb: (connecte: boolean) => void) => {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
};

const notifyListeners = () => {
  for (const l of listeners) l(connecte);
};

export const setIP = (ip: string) => {
  const candidate = `http://${ip.trim()}:${PORT}`;
  if (!CANDIDATE_URLS.includes(candidate)) {
    CANDIDATE_URLS.unshift(candidate);
  }
  currentBaseUrl = candidate;
  deviceIP = ip.trim();
};

export const getIP = (): string => {
  if (deviceIP) return deviceIP;
  const m = currentBaseUrl.match(/^http:\/\/([^:]+):/);
  return m ? m[1] : '127.0.0.1';
};

export const getApiBaseUrl = (): string => currentBaseUrl;

export const getCandidateUrls = (): string[] => [...CANDIDATE_URLS];

export const isConnecte = (): boolean => connecte;

export const getBackoffMs = (): number => {
  if (connecte) return 0;
  const delays = [2000, 4000, 8000, 16000, 30000];
  return delays[Math.min(tentativeEchecs, delays.length - 1)];
};

export interface ScanResult {
  statut: 'ok' | 'erreur';
  message: string;
  erreur?: string;
}

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Ping natif Kotlin : 200ms au lieu de 800ms avec fetch
const pingNative = async (ip: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && NetworkModule) {
      return await NetworkModule.pingServer(ip);
    }
  } catch {}
  return false;
};

// Ping HTTP classique (fallback)
const pingUrl = async (url: string, timeoutMs: number = PING_TIMEOUT_MS): Promise<boolean> => {
  try {
    const res = await fetchWithTimeout(`${url}/scans`, { method: 'GET' }, timeoutMs);
    return res.ok;
  } catch {
    return false;
  }
};

// Extraire l'IP d'une URL candidate
const extractIP = (url: string): string | null => {
  const m = url.match(/^http:\/\/([^:]+):\d+$/);
  return m ? m[1] : null;
};

// Obtenir l'IP de la tablette via Kotlin natif
const getDeviceIP = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'android' && NetworkModule) {
      const ip = await NetworkModule.getDeviceIP();
      return ip;
    }
    return null;
  } catch {
    return null;
  }
};

// Scanner le reseau via Kotlin natif
const scanNetworkNative = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'android' && NetworkModule) {
      const ip = await NetworkModule.scanNetwork();
      return ip;
    }
    return null;
  } catch {
    return null;
  }
};

// Test rapide : ping natif sur l'URL courante
const testCurrentUrl = async (): Promise<boolean> => {
  const ip = extractIP(currentBaseUrl);
  if (ip) {
    return pingNative(ip);
  }
  return pingUrl(currentBaseUrl, PING_TIMEOUT_MS);
};

// Resolution rapide de l'URL active
export const resolveBaseUrl = async (): Promise<string> => {
  // 1. Tester l'URL courante (ping natif 200ms)
  if (await testCurrentUrl()) {
    if (!connecte) {
      connecte = true;
      tentativeEchecs = 0;
      notifyListeners();
      logInfo('ApiService', `Reconnecte a ${currentBaseUrl}`);
    }
    return currentBaseUrl;
  }

  // 2. Tester les URLs candidates (ping natif en parallele)
  const tests = CANDIDATE_URLS.filter((u) => u !== currentBaseUrl).map(async (url) => {
    const ip = extractIP(url);
    const ok = ip ? await pingNative(ip) : await pingUrl(url, PING_TIMEOUT_MS);
    return { url, ok };
  });
  const results = await Promise.all(tests);
  for (const { url, ok } of results) {
    if (ok) {
      currentBaseUrl = url;
      if (!connecte) {
        connecte = true;
        tentativeEchecs = 0;
        notifyListeners();
        logInfo('ApiService', `Reconnecte a ${url}`);
      }
      return url;
    }
  }

  // 3. Scan reseau complet (seulement si pas de discovery en cours)
  if (!discoveryEnCours) {
    discoveryEnCours = true;
    try {
      logInfo('ApiService', 'Scan reseau en cours...');
      const found = await scanNetworkNative();
      if (found) {
        const url = `http://${found}:${PORT}`;
        logInfo('ApiService', `Serveur trouve via scan: ${url}`);
        if (!CANDIDATE_URLS.includes(url)) {
          CANDIDATE_URLS.unshift(url);
        }
        currentBaseUrl = url;
        connecte = true;
        tentativeEchecs = 0;
        notifyListeners();
        return url;
      }
    } finally {
      discoveryEnCours = false;
    }
  }

  // 4. Echec total
  if (connecte) {
    connecte = false;
    tentativeEchecs++;
    notifyListeners();
    logError('ApiService', `Deconnexion detectee (tentative #${tentativeEchecs})`);
  } else {
    tentativeEchecs++;
  }
  return currentBaseUrl;
};

// Initialiser l'IP du device au demarrage
export const initDeviceIP = async (): Promise<void> => {
  const ip = await getDeviceIP();
  if (ip && ip !== '127.0.0.1') {
    deviceIP = ip;
  }
};

export const envoyerScan = async (contenu: string): Promise<ScanResult> => {
  const sendOnce = async (): Promise<ScanResult> => {
    const baseUrl = await resolveBaseUrl();
    const url = `${baseUrl}/scan`;

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contenu }),
        },
        REQUEST_TIMEOUT_MS,
      );

      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ erreur: 'Erreur serveur' }));
        return {
          statut: 'erreur',
          message: err.erreur || 'Erreur serveur',
          erreur: err.erreur,
        };
      }

      return await response.json();
    } catch (e) {
      return {
        statut: 'erreur',
        message: `Impossible de joindre le PC: ${baseUrl}`,
      };
    }
  };

  const first = await sendOnce();
  if (first.statut === 'ok') return first;

  logError('ApiService', `Envoi echoue (1ere tentative): ${first.message}`);
  // Retry immediat apres 500ms
  await new Promise((r) => setTimeout(r, 500));
  const second = await sendOnce();
  if (second.statut !== 'ok') {
    logError('ApiService', `Envoi echoue (2eme tentative): ${second.message}`);
  }
  return second;
};

export const testerConnexion = async (): Promise<boolean> => {
  const baseUrl = await resolveBaseUrl();
  const ip = extractIP(baseUrl);
  return ip ? pingNative(ip) : pingUrl(baseUrl, PING_TIMEOUT_MS);
};
