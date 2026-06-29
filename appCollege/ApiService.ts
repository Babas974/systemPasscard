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

// Cache: dernier succes de decouverte (timestamp ms)
let lastSuccessAt = 0;
const SUCCESS_CACHE_MS = 5000;

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

export const formatLocalDateTime = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export type NetworkErrorKind = 'timeout' | 'proxy' | 'dns' | 'refused' | 'offline' | 'unknown';

export interface NetworkError {
  kind: NetworkErrorKind;
  message: string;
  original?: unknown;
}

const classifyNetworkError = (err: unknown): NetworkError => {
  if (err instanceof Error) {
    const name = err.name.toLowerCase();
    const msg = err.message.toLowerCase();

    if (name === 'aborterror' || name === 'timeout' || msg.includes('timeout')) {
      return { kind: 'timeout', message: 'Delai depasse', original: err };
    }
    if (msg.includes('proxy') || msg.includes('192.168.224.1')) {
      return { kind: 'proxy', message: 'Erreur proxy reseau', original: err };
    }
    if (msg.includes('networkrequestfailed') || msg.includes('unable to resolve host') || msg.includes('enotfound')) {
      return { kind: 'dns', message: 'Impossible de resoudre le nom', original: err };
    }
    if (msg.includes('connection refused') || msg.includes('econnrefused')) {
      return { kind: 'refused', message: 'Connexion refusee', original: err };
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('internet')) {
      return { kind: 'offline', message: 'Reseu indisponible', original: err };
    }
  }
  return { kind: 'unknown', message: String(err), original: err };
};

const isProxyError = (err: unknown): boolean => {
  return classifyNetworkError(err).kind === 'proxy';
};

const isTransientError = (err: unknown): boolean => {
  const kind = classifyNetworkError(err).kind;
  return kind === 'timeout' || kind === 'proxy' || kind === 'offline';
};

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
  lastSuccessAt = Date.now();
  notifyListeners();
  await Promise.all([saveIP(ip), savePort(port)]);
};

// Resolution de l'URL active
export const resolveBaseUrl = async (): Promise<string> => {
  // Attendre le chargement du config sauvegarde (max 500ms)
  await attendreConfig();

  // Cache: si on a un succes recent (< 5s), retourner sans re-pinger
  if (currentBaseUrl && connecte && (Date.now() - lastSuccessAt) < SUCCESS_CACHE_MS) {
    return currentBaseUrl;
  }

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
    logError('ApiService', `Deconnexion detectee (tentative #${tentativeEchecs})`).catch(() => {});
  } else {
    tentativeEchecs++;
  }

  // Si le proxy est suspecte, essayer plus tot
  const backoff = getBackoffMs();
  if (backoff > 0 && tentativeEchecs <= 2) {
    await new Promise<void>((r) => setTimeout(r, Math.min(backoff, 2000)));
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
          body: JSON.stringify({ contenu, date_heure: formatLocalDateTime() }),
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
      const ne = classifyNetworkError(e);
      return {
        statut: 'erreur',
        message: `${ne.message}: ${baseUrl}`,
        erreur: ne.kind,
      };
    }
  };

  const first = await sendOnce();
  if (first.statut === 'ok') return first;

  // Retry immediat pour erreurs transientes (proxy, timeout)
  const firstErr = first.erreur as NetworkErrorKind | undefined;
  const delay = firstErr === 'proxy' || firstErr === 'timeout' ? 300 : 500;

  logError('ApiService', `Envoi echoue (1ere tentative): ${first.message}`);
  await new Promise<void>((r) => setTimeout(r, delay));
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

export const supprimerToutServeur = async (): Promise<boolean> => {
  const baseUrl = await resolveBaseUrl();
  if (!baseUrl) {
    logError('ApiService', 'supprimerToutServeur: aucun serveur trouve').catch(() => {});
    return false;
  }
  try {
    logInfo('ApiService', `DELETE ${baseUrl}/scans/all`).catch(() => {});
    const response = await fetchWithTimeout(
      `${baseUrl}/scans/all`,
      { method: 'DELETE' },
      REQUEST_TIMEOUT_MS,
    );
    if (response.ok) {
      logInfo('ApiService', 'supprimerToutServeur: succes').catch(() => {});
    } else {
      logError('ApiService', `supprimerToutServeur: echec HTTP ${response.status}`).catch(() => {});
    }
    return response.ok;
  } catch (e) {
    logError('ApiService', `supprimerToutServeur: exception ${e}`).catch(() => {});
    return false;
  }
};

export const supprimerParType = async (type: 'tout' | 'aujourd-hui' | 'precedents'): Promise<boolean> => {
  const baseUrl = await resolveBaseUrl();
  if (!baseUrl) {
    logError('ApiService', `supprimerParType(${type}): aucun serveur trouve`).catch(() => {});
    return false;
  }
  const endpoint = type === 'tout' ? '/scans/all' : type === 'aujourd-hui' ? '/scans/today' : '/scans/previous';
  try {
    logInfo('ApiService', `DELETE ${baseUrl}${endpoint}`).catch(() => {});
    const response = await fetchWithTimeout(
      `${baseUrl}${endpoint}`,
      { method: 'DELETE' },
      REQUEST_TIMEOUT_MS,
    );
    if (response.ok) {
      logInfo('ApiService', `supprimerParType(${type}): succes`).catch(() => {});
    } else {
      logError('ApiService', `supprimerParType(${type}): echec HTTP ${response.status}`).catch(() => {});
    }
    return response.ok;
  } catch (e) {
    logError('ApiService', `supprimerParType(${type}): exception ${e}`).catch(() => {});
    return false;
  }
};
