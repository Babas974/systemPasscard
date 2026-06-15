// Logger.ts
// Service de logs avec stockage local + envoi HTTP au PC.
// - Stockage local : les logs survivent a la deconnexion
// - Envoi HTTP : flush periodique vers POST /debug/log
// - FATAL/ERROR : flush immediat
// - Buffer local accessible pour la console debug

import { getApiBaseUrl, isConnecte } from './ApiService';

export type NiveauLog = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  source: string;
  niveau: NiveauLog;
  message: string;
  timestamp: number;
  envoye: boolean;
}

// Buffer local des logs (max 500)
const logsLocaux: LogEntry[] = [];
const MAX_LOGS_LOCAUX = 500;

// Queue d'envoi au PC
const fileQueue: LogEntry[] = [];
const MAX_QUEUE = 200;

let flushInterval: ReturnType<typeof setInterval> | null = null;
let flushEnCours = false;

// --- Stockage local ---

function ajouterLogLocal(entry: LogEntry): void {
  logsLocaux.unshift(entry);
  if (logsLocaux.length > MAX_LOGS_LOCAUX) {
    logsLocaux.pop();
  }
}

export function getLogsLocaux(limit: number = 100): LogEntry[] {
  return logsLocaux.slice(0, limit);
}

export function getNbErreursLocales(): number {
  return logsLocaux.filter(
    (l) => l.niveau === 'error' || l.niveau === 'fatal',
  ).length;
}

// --- Envoi HTTP ---

async function envoyerLog(
  source: string,
  niveau: NiveauLog,
  message: string,
): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/debug/log`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        niveau,
        message,
        date_heure: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function flushPeriodique(): Promise<void> {
  if (flushEnCours) return;
  if (fileQueue.length === 0) return;
  if (!isConnecte()) return; // Pas de réseau, on attend

  flushEnCours = true;
  try {
    const restants: LogEntry[] = [];
    for (const item of fileQueue) {
      const ok = await envoyerLog(item.source, item.niveau, item.message);
      if (ok) {
        item.envoye = true;
      } else {
        restants.push(item);
      }
    }
    // Remplacer la queue par les non-envoyes
    fileQueue.length = 0;
    fileQueue.push(...restants);
  } finally {
    flushEnCours = false;
  }
}

export function startLogFlusher(intervalMs: number = 3000): void {
  if (flushInterval) return;
  flushInterval = setInterval(() => {
    flushPeriodique().catch(() => {});
  }, intervalMs);
}

export function stopLogFlusher(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

export async function log(
  source: string,
  niveau: NiveauLog,
  message: string,
): Promise<void> {
  const timestamp = Date.now();
  const ligne = `[${niveau.toUpperCase()}] [${source}] ${message}`;

  // Toujours log dans la console natif
  switch (niveau) {
    case 'debug':
      console.debug(ligne);
      break;
    case 'info':
      console.info(ligne);
      break;
    case 'warn':
      console.warn(ligne);
      break;
    case 'error':
    case 'fatal':
      console.error(ligne);
      break;
  }

  // Stocker localement (toujours)
  const entry: LogEntry = { source, niveau, message, timestamp, envoye: false };
  ajouterLogLocal(entry);

  // FATAL/ERROR : flush immediat vers le PC
  if (niveau === 'fatal' || niveau === 'error') {
    if (isConnecte()) {
      envoyerLog(source, niveau, message).then((ok) => {
        if (ok) entry.envoye = true;
      });
    } else {
      fileQueue.push(entry);
    }
    return;
  }

  // DEBUG/INFO/WARN : file d'attente
  if (fileQueue.length >= MAX_QUEUE) {
    fileQueue.shift();
  }
  fileQueue.push(entry);
}

export async function logInfo(source: string, message: string): Promise<void> {
  return log(source, 'info', message);
}

export async function logWarn(source: string, message: string): Promise<void> {
  return log(source, 'warn', message);
}

export async function logError(
  source: string,
  message: string,
  err?: unknown,
): Promise<void> {
  let detail = message;
  if (err !== undefined) {
    if (err instanceof Error) {
      detail = `${message} | ${err.name}: ${err.message}`;
      if (err.stack) {
        detail += `\n${err.stack}`;
      }
    } else {
      try {
        detail = `${message} | ${JSON.stringify(err)}`;
      } catch {
        detail = `${message} | ${String(err)}`;
      }
    }
  }
  return log(source, 'error', detail);
}

export async function logFatal(
  source: string,
  message: string,
  err?: unknown,
): Promise<void> {
  let detail = message;
  if (err !== undefined) {
    if (err instanceof Error) {
      detail = `${message} | ${err.name}: ${err.message}`;
      if (err.stack) {
        detail += `\n${err.stack}`;
      }
    } else {
      detail = `${message} | ${String(err)}`;
    }
  }
  return log(source, 'fatal', detail);
}

export function installGlobalErrorHandler(source: string = 'Global'): void {
  const ErrorUtils = (globalThis as any).ErrorUtils;
  if (!ErrorUtils) return;

  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler(async (err: Error, isFatal?: boolean) => {
    try {
      await logFatal(
        source,
        isFatal ? 'FATAL_ERROR' : 'UNCAUGHT_ERROR',
        err,
      );
    } catch {}
    if (originalHandler) {
      originalHandler(err, isFatal);
    }
  });
}
