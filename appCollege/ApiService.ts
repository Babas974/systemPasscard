// ApiService.ts
// Service HTTP adaptive : decouvre automatiquement le serveur sur le reseau local
// via le module Kotlin natif (scan reseau + ping natif + IP device).
// Ports adaptatifs : scanne 8389-8399.

import { NativeModules, Platform } from 'react-native';
import { logInfo, logError } from './Logger';
import { loadPort, savePort, loadIP, saveIP } from './StorageService';

const { NetworkModule } = NativeModules;

const PORT_MIN = 8389; // SYNC: NetworkModule.kt, main.rs
const PORT_MAX = 8399; // SYNC: NetworkModule.kt, main.rs
const REQUEST_TIMEOUT_MS = 10000;
const PING_TIMEOUT_MS = 800;

// URL active (IP:port du PC)
let currentBaseUrl: string = '';
let discoveryEnCours = false;
let deviceIP: string | null = null;

// Etat de reconnexion
let connecte = false;
let tentativeEchecs = 0;
let listeners: Array<(connecte: boolean) => void> = [];

// Charge IP + port sauvegardes au demarrage
const loadSavedConfig = async (): Promise<void> => {
  try {
    const [savedIP, savedPort] = await Promise.all([loadIP(), loadPort()]);
    const ip = savedIP && savedIP.trim().length > 0 ? savedIP.trim() : null;
    const port = savedPort && savedPort >= PORT_MIN && savedPort <= PORT_MAX ? savedPort : PORT_MIN;
    if (ip) {
      currentBaseUrl = `http://${ip}:${port}`;
      deviceIP = ip;
    }
  } catch {}
};

const configReady: Promise<void> = loadSavedConfig().catch(() => {});

// Attendre que le config soit charge (max 500ms) avant la 1ere requete
const attendreConfig = (): Promise<void> => {
  return Promise.race([
    configReady,
    new Promise<void>((r) => setTimeout(r, 500)),
  ]);
};

export const onConnectionChange = (cb: (connecte: boolean) => void) => {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
};

const notifyListeners = () => {
  for (const l of listeners) l(connecte);
};

export const setIP = (ip: string) => {
  const trimmed = ip.trim();
  if (!trimmed) return;
  const port = discoveredPort();
  currentBaseUrl = `http://${trimmed}:${port}`;
  deviceIP = trimmed;
  saveIP(trimmed);
};

export const getIP = (): string => {
  if (deviceIP) return deviceIP;
  const m = currentBaseUrl.match(/^http:\/\/([^:]+):/);
  return m ? m[1] : '';
};

export const getApiBaseUrl = (): string => currentBaseUrl;

export const isConnecte = (): boolean => connecte;

export const getDiscoveredPort = (): number => discoveredPort();

const discoveredPort = (): number => {
  const m = currentBaseUrl.match(/:(\d+)$/);
  return m ? Number(m[1]) : PORT_MIN;
};

export const getBackoffMs = (): number => {
  if (connecte) return 0;
  const delays = [2000, 4000, 8000, 16000, 30000];
  return delays[Math.min(tentativeEchecs, delays.length - 1)];
};

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

const pingNative = async (ip: string): Promise<number> => {
  try {
    if (Platform.OS === 'android' && NetworkModule) {
      return await NetworkModule.pingServer(ip);
    }
  } catch {}
  return 0;
};

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

const extractIP = (url: string): string | null => {
  const m = url.match(/^http:\/\/([^:]+):\d+$/);
  return m ? m[1] : null;
};

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

const scanNetworkNative = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'android' && NetworkModule) {
      const result = await NetworkModule.scanNetwork();
      return result;
    }
    return null;
  } catch {
    return null;
  }
};

const parseIpPort = (s: string): { ip: string; port: number } | null => {
  const m = s.match(/^([^:]+):(\d+)$/);
  if (m) {
    return { ip: m[1], port: Number(m[2]) };
  }
  return null;
};

const persistDiscovered = async (ip: string, port: number): Promise<void> => {
  currentBaseUrl = `http://${ip}:${port}`;
  deviceIP = ip;
  connecte = true;
  tentativeEchecs = 0;
  notifyListeners();
  await Promise.all([saveIP(ip), savePort(port)]);
};

// Resolution de l'URL active
export const resolveBaseUrl = async (): Promise<string> => {
  // Attendre le chargement du config sauvegarde (max 500ms)
  await attendreConfig();

  // 1. Si on a une IP connue, la tester d'abord
  if (currentBaseUrl) {
    const ip = extractIP(currentBaseUrl);
    if (ip) {
      const port = await pingNative(ip);
      if (port > 0) {
        if (port !== discoveredPort()) {
          await persistDiscovered(ip, port);
        } else if (!connecte) {
          connecte = true;
          tentativeEchecs = 0;
          notifyListeners();
          logInfo('ApiService', `Reconnecte a ${currentBaseUrl}`);
        }
        return currentBaseUrl;
      }
    }
  }

  // 2. Obtenir l'IP du device pour le scan
  const myIP = deviceIP || await getDeviceIP();
  if (myIP && myIP !== '127.0.0.1') {
    // Scanner le meme /24 que la tablette
    const port = await pingNative(myIP);
    if (port > 0) {
      await persistDiscovered(myIP, port);
      logInfo('ApiService', `Serveur trouve sur IP device: ${myIP}:${port}`);
      return currentBaseUrl;
    }
  }

  // 3. Scan reseau complet
  if (!discoveryEnCours) {
    discoveryEnCours = true;
    try {
      logInfo('ApiService', 'Scan reseau en cours...');
      const found = await scanNetworkNative();
      if (found) {
        const parsed = parseIpPort(found);
        if (parsed) {
          logInfo('ApiService', `Serveur trouve via scan: ${parsed.ip}:${parsed.port}`);
          await persistDiscovered(parsed.ip, parsed.port);
          return currentBaseUrl;
        }
      }
    } finally {
      discoveryEnCours = false;
    }
  }

  // 4. Echec
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

export const initDeviceIP = async (): Promise<void> => {
  const ip = await getDeviceIP();
  if (ip && ip !== '127.0.0.1') {
    deviceIP = ip;
  }
};

export const envoyerScan = async (contenu: string): Promise<ScanResult> => {
  const sendOnce = async (): Promise<ScanResult> => {
    const baseUrl = await resolveBaseUrl();
    if (!baseUrl) {
      return { statut: 'erreur', message: 'Aucun serveur trouve sur le reseau' };
    }
    const url = `${baseUrl}/scan`;

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contenu, date_heure: new Date().toISOString() }),
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
  await new Promise<void>((r) => setTimeout(r, 500));
  const second = await sendOnce();
  if (second.statut !== 'ok') {
    logError('ApiService', `Envoi echoue (2eme tentative): ${second.message}`);
  }
  return second;
};

export const testerConnexion = async (): Promise<boolean> => {
  const baseUrl = await resolveBaseUrl();
  if (!baseUrl) return false;
  const ip = extractIP(baseUrl);
  const port = ip ? await pingNative(ip) : await pingUrl(baseUrl, PING_TIMEOUT_MS);
  return port > 0;
};
