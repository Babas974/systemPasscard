// ApiService.ts
// Service HTTP adaptive : decouvre automatiquement le serveur sur le reseau local
// via le module Kotlin natif (scan reseau + IP device).

import { NativeModules, Platform } from 'react-native';

const { NetworkModule } = NativeModules;

const PORT = 8389;
const REQUEST_TIMEOUT_MS = 10000;
const PING_TIMEOUT_MS = 800;

const CANDIDATE_URLS: string[] = [
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${PORT}`,
];

let currentBaseUrl: string = CANDIDATE_URLS[0];
let discoveryEnCours = false;
let deviceIP: string | null = null;

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

const pingUrl = async (url: string, timeoutMs: number = PING_TIMEOUT_MS): Promise<boolean> => {
  try {
    const res = await fetchWithTimeout(`${url}/scans`, { method: 'GET' }, timeoutMs);
    return res.ok;
  } catch {
    return false;
  }
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

// Scanner le reseau via Kotlin natif (beaucoup plus rapide que JS)
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

export const resolveBaseUrl = async (): Promise<string> => {
  // D'abord tester l'URL actuelle
  if (await pingUrl(currentBaseUrl)) return currentBaseUrl;

  // Tester les URLs candidates
  for (const url of CANDIDATE_URLS) {
    if (url === currentBaseUrl) continue;
    if (await pingUrl(url)) {
      currentBaseUrl = url;
      return url;
    }
  }

  // Scanner le reseau via Kotlin natif
  if (!discoveryEnCours) {
    discoveryEnCours = true;
    try {
      const found = await scanNetworkNative();
      if (found) {
        const url = `http://${found}:${PORT}`;
        if (!CANDIDATE_URLS.includes(url)) {
          CANDIDATE_URLS.unshift(url);
        }
        currentBaseUrl = url;
        return url;
      }
    } finally {
      discoveryEnCours = false;
    }
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

export const testerConnexion = async (): Promise<boolean> => {
  const baseUrl = await resolveBaseUrl();
  return pingUrl(baseUrl, PING_TIMEOUT_MS);
};
