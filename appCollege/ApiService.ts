// ApiService.ts
// Service HTTP adaptive : decouvre automatiquement le serveur sur le reseau local
// via le module Kotlin natif (scan reseau + ping natif + IP device).
// Ports adaptatifs : scanne 8389-8399.

import { NativeModules, Platform } from 'react-native';
import { logInfo, logError } from './Logger';
import { loadPort, savePort } from './StorageService';

const { NetworkModule } = NativeModules;

const PORT_MIN = 8389; // SYNC: NetworkModule.kt, main.rs
const PORT_MAX = 8399; // SYNC: NetworkModule.kt, main.rs
const REQUEST_TIMEOUT_MS = 10000;
const PING_TIMEOUT_MS = 800;

// Port decouvert dynamiquement
let discoveredPort: number = PORT_MIN;
let currentBaseUrl: string = `http://127.0.0.1:${PORT_MIN}`;
let discoveryEnCours = false;
let deviceIP: string | null = null;

// URLs candidates (127.0.0.1 + localhost sur tous les ports possibles)
const CANDIDATE_URLS: string[] = [
  `http://127.0.0.1:${PORT_MIN}`,
  `http://localhost:${PORT_MIN}`,
];

// Etat de reconnexion
let connecte = false;
let tentativeEchecs = 0;
let listeners: Array<(connecte: boolean) => void> = [];

// Charge le port sauvegarde au demarrage
const loadSavedConfig = async (): Promise<void> => {
  try {
    const savedPort = await loadPort();
    if (savedPort && savedPort >= PORT_MIN && savedPort <= PORT_MAX) {
      discoveredPort = savedPort;
      currentBaseUrl = `http://127.0.0.1:${discoveredPort}`;
    }
  } catch {}
};

const configReady: Promise<void> = loadSavedConfig();

export const onConnectionChange = (cb: (connecte: boolean) => void) => {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
};

const notifyListeners = () => {
  for (const l of listeners) l(connecte);
};

// Construire les URLs candidates pour toutes les plages de ports
const buildCandidateUrls = (ip: string): string[] => {
  const urls: string[] = [];
  for (let port = PORT_MIN; port <= PORT_MAX; port++) {
    urls.push(`http://${ip}:${port}`);
  }
  return urls;
};

export const setIP = (ip: string) => {
  const candidate = `http://${ip.trim()}:${discoveredPort}`;
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

export const getDiscoveredPort = (): number => discoveredPort;

export const getBackoffMs = (): number => {
  if (connecte) return 0;
  const delays = [2000, 4000, 8000, 16000, 30000];
  return delays[Math.min(tentativeEchecs, delays.length - 1)];
};

// Reset du backoff (utilise apres une longue veille)
export const resetBackoff = (): void => {
  tentativeEchecs = 0;
  connecte = false;
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

// Ping natif Kotlin : retourne le port trouve ou 0 si aucun
const pingNative = async (ip: string): Promise<number> => {
  try {
    if (Platform.OS === 'android' && NetworkModule) {
      return await NetworkModule.pingServer(ip);
    }
  } catch {}
  return 0;
};

// Ping HTTP classique (fallback) — retourne le port ou 0
const pingUrl = async (url: string, timeoutMs: number = PING_TIMEOUT_MS): Promise<number> => {
  try {
    const res = await fetchWithTimeout(`${url}/scans`, { method: 'GET' }, timeoutMs);
    if (res.ok) {
      const m = url.match(/:(\d+)$/);
      return m ? Number(m[1]) : PORT_MIN;
    }
  } catch {}
  return 0;
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

// Scanner le reseau via Kotlin natif — retourne "IP:port"
const scanNetworkNative = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'android' && NetworkModule) {
      const result = await NetworkModule.scanNetwork();
      return result; // Format: "IP:port"
    }
    return null;
  } catch {
    return null;
  }
};

// Extraire IP et port d'une chaine "IP:port"
const parseIpPort = (s: string): { ip: string; port: number } | null => {
  const m = s.match(/^([^:]+):(\d+)$/);
  if (m) {
    return { ip: m[1], port: Number(m[2]) };
  }
  return null;
};

// Test rapide : ping natif sur l'URL courante
const testCurrentUrl = async (): Promise<number> => {
  const ip = extractIP(currentBaseUrl);
  if (ip) {
    return pingNative(ip);
  }
  return pingUrl(currentBaseUrl, PING_TIMEOUT_MS);
};

// Sauvegarder le port decouvert
const persistDiscoveredPort = async (port: number): Promise<void> => {
  discoveredPort = port;
  await savePort(port);
};

// Resolution rapide de l'URL active
export const resolveBaseUrl = async (): Promise<string> => {
  await configReady;
  // 1. Tester l'URL courante (ping natif 200ms)
  const foundPort = await testCurrentUrl();
  if (foundPort > 0) {
    if (foundPort !== discoveredPort) {
      await persistDiscoveredPort(foundPort);
    }
    currentBaseUrl = `http://${getIP()}:${foundPort}`;
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
    const port = ip ? await pingNative(ip) : await pingUrl(url, PING_TIMEOUT_MS);
    return { url, ip, port };
  });
  const results = await Promise.all(tests);
  for (const { url, ip, port } of results) {
    if (port > 0) {
      if (port !== discoveredPort) {
        await persistDiscoveredPort(port);
      }
      currentBaseUrl = `http://${ip || extractIP(url)}:${port}`;
      if (!connecte) {
        connecte = true;
        tentativeEchecs = 0;
        notifyListeners();
        logInfo('ApiService', `Reconnecte a ${currentBaseUrl}`);
      }
      return currentBaseUrl;
    }
  }

  // 3. Scan reseau complet (seulement si pas de discovery en cours)
  if (!discoveryEnCours) {
    discoveryEnCours = true;
    try {
      logInfo('ApiService', 'Scan reseau en cours...');
      const found = await scanNetworkNative();
      if (found) {
        const parsed = parseIpPort(found);
        if (parsed) {
          const url = `http://${parsed.ip}:${parsed.port}`;
          logInfo('ApiService', `Serveur trouve via scan: ${url}`);
          await persistDiscoveredPort(parsed.port);
          if (!CANDIDATE_URLS.includes(url)) {
            CANDIDATE_URLS.unshift(url);
          }
          currentBaseUrl = url;
          deviceIP = parsed.ip;
          connecte = true;
          tentativeEchecs = 0;
          notifyListeners();
          return url;
        }
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
  await new Promise<void>((r) => setTimeout(r, 500));
  const second = await sendOnce();
  if (second.statut !== 'ok') {
    logError('ApiService', `Envoi echoue (2eme tentative): ${second.message}`);
  }
  return second;
};

export const testerConnexion = async (): Promise<boolean> => {
  const baseUrl = await resolveBaseUrl();
  const ip = extractIP(baseUrl);
  const port = ip ? await pingNative(ip) : await pingUrl(baseUrl, PING_TIMEOUT_MS);
  return port > 0;
};
