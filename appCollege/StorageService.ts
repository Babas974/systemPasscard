// StorageService.ts
// Wrapper AsyncStorage pour IP, file d'attente, historique.
// Resistant aux erreurs (module natif non lie, etc.) : fallback en memoire.
// Utilise un `require` dynamique pour eviter que l'absence du natif
// fasse crasher l'import du module lui-meme (le `import` ES est hoisted
// et ne peut pas etre protege par un try/catch).

import { logWarn, logError } from './Logger';

const KEYS = {
  IP: '@appCollege/ip',
  PORT: '@appCollege/port',
  QUEUE: '@appCollege/queue',
  HISTORY: '@appCollege/history',
};

export const DEFAULT_IP = '127.0.0.1';
export const HISTORY_LIMIT = 50;

export interface QueueEntry {
  id: string;
  contenu: string;
  creeLe: number;
}

export interface HistoryEntry extends QueueEntry {
  statut: 'envoye' | 'en_attente' | 'erreur';
  envoyeLe?: number;
  erreur?: string;
}

const inMemoryFallback: {
  ip?: string;
  queue?: QueueEntry[];
  history?: HistoryEntry[];
} = {};

let storageBroken = false;
let storageWarned = false;

const warnOnce = () => {
  if (storageWarned) return;
  storageWarned = true;
  logWarn(
    'Storage',
    'AsyncStorage indisponible (module natif non lie). Mode memoire active.',
  ).catch(() => {});
};

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getAsyncStorage = (): any | null => {
  if (storageBroken) return null;
  try {
    // require dynamique : si le natif est absent, on capture ici
    // sans crasher le module au load.
    const mod = require('@react-native-async-storage/async-storage');
    return mod && mod.default ? mod.default : mod;
  } catch (e) {
    storageBroken = true;
    return null;
  }
};

export const loadIP = async (): Promise<string> => {
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return inMemoryFallback.ip ?? DEFAULT_IP;
  }
  try {
    const v = await AS.getItem(KEYS.IP);
    if (v && v.trim().length > 0) {
      inMemoryFallback.ip = v;
      return v;
    }
    return DEFAULT_IP;
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'loadIP a echoue, fallback memoire', e).catch(() => {});
    return inMemoryFallback.ip ?? DEFAULT_IP;
  }
};

export const saveIP = async (ip: string): Promise<void> => {
  inMemoryFallback.ip = ip.trim();
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return;
  }
  try {
    await AS.setItem(KEYS.IP, ip.trim());
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'saveIP a echoue, fallback memoire', e).catch(() => {});
  }
};

export const loadQueue = async (): Promise<QueueEntry[]> => {
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return inMemoryFallback.queue ?? [];
  }
  try {
    const raw = await AS.getItem(KEYS.QUEUE);
    const parsed = safeParse<QueueEntry[]>(raw, []);
    inMemoryFallback.queue = parsed;
    return parsed;
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'loadQueue a echoue, fallback memoire', e).catch(() => {});
    return inMemoryFallback.queue ?? [];
  }
};

export const saveQueue = async (queue: QueueEntry[]): Promise<void> => {
  inMemoryFallback.queue = queue;
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return;
  }
  try {
    await AS.setItem(KEYS.QUEUE, JSON.stringify(queue));
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'saveQueue a echoue, fallback memoire', e).catch(() => {});
  }
};

export const loadHistory = async (): Promise<HistoryEntry[]> => {
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return inMemoryFallback.history ?? [];
  }
  try {
    const raw = await AS.getItem(KEYS.HISTORY);
    const parsed = safeParse<HistoryEntry[]>(raw, []);
    inMemoryFallback.history = parsed;
    return parsed;
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'loadHistory a echoue, fallback memoire', e).catch(
      () => {},
    );
    return inMemoryFallback.history ?? [];
  }
};

export const saveHistory = async (history: HistoryEntry[]): Promise<void> => {
  inMemoryFallback.history = history;
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return;
  }
  try {
    await AS.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'saveHistory a echoue, fallback memoire', e).catch(
      () => {},
    );
  }
};

export const clearHistory = async (): Promise<void> => {
  inMemoryFallback.history = [];
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return;
  }
  try {
    await AS.removeItem(KEYS.HISTORY);
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'clearHistory a echoue', e).catch(() => {});
  }
};

export const clearQueue = async (): Promise<void> => {
  inMemoryFallback.queue = [];
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return;
  }
  try {
    await AS.removeItem(KEYS.QUEUE);
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'clearQueue a echoue', e).catch(() => {});
  }
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const isStoragePersistant = (): boolean => {
  return !storageBroken && getAsyncStorage() !== null;
};

export const loadPort = async (): Promise<number | null> => {
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return null;
  }
  try {
    const v = await AS.getItem(KEYS.PORT);
    if (v && v.trim().length > 0) {
      const port = Number(v);
      if (!isNaN(port) && port > 0) {
        return port;
      }
    }
    return null;
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'loadPort a echoue, fallback memoire', e).catch(() => {});
    return null;
  }
};

export const savePort = async (port: number): Promise<void> => {
  const AS = getAsyncStorage();
  if (!AS) {
    warnOnce();
    return;
  }
  try {
    await AS.setItem(KEYS.PORT, String(port));
  } catch (e) {
    storageBroken = true;
    logError('Storage', 'savePort a echoue, fallback memoire', e).catch(() => {});
  }
};
