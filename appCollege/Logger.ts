// Logger.ts
// Service de logs HTTP temps-reel : envoie chaque log/erreur au serveur PC
// via POST /debug/log.
// - FATAL/ERROR : flush immediat (fetch synchrone) pour ne pas perdre
//   les messages lors d'un crash rapide.
// - INFO/WARN/DEBUG : file d'attente + flush periodique.
// - Lock anti-double-envoi entre le flush periodique et le flush immediat.

import { getApiBaseUrl } from './ApiService';

export type NiveauLog = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface QueueItem {
  source: string;
  niveau: NiveauLog;
  message: string;
}

const fileQueue: QueueItem[] = [];
const MAX_QUEUE = 200;

let flushInterval: ReturnType<typeof setInterval> | null = null;
let flushEnCours = false;
let flushImmediatEnCours = false;

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
      body: JSON.stringify({ source, niveau, message }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function envoyerLot(items: QueueItem[]): Promise<QueueItem[]> {
  const nonEnvoyes: QueueItem[] = [];
  for (const item of items) {
    const ok = await envoyerLog(item.source, item.niveau, item.message);
    if (!ok) nonEnvoyes.push(item);
  }
  return nonEnvoyes;
}

async function flushPeriodique(): Promise<void> {
  if (flushEnCours) return;
  if (fileQueue.length === 0) return;
  flushEnCours = true;
  try {
    const items = fileQueue.splice(0, fileQueue.length);
    const nonEnvoyes = await envoyerLot(items);
    if (nonEnvoyes.length > 0) {
      fileQueue.unshift(...nonEnvoyes);
    }
  } finally {
    flushEnCours = false;
  }
}

async function flushImmediat(item: QueueItem): Promise<void> {
  // N'envoie que cet item, sans toucher a la queue (evite conflits avec periodique)
  if (flushImmediatEnCours) {
    // Si deja en cours, on remet dans la queue pour le prochain flush
    fileQueue.push(item);
    return;
  }
  flushImmediatEnCours = true;
  try {
    await envoyerLog(item.source, item.niveau, item.message);
  } finally {
    flushImmediatEnCours = false;
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
  const ligne = `[${niveau.toUpperCase()}] [${source}] ${message}`;

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

  // FATAL/ERROR : flush immediat (ne pas perdre en cas de crash rapide)
  if (niveau === 'fatal' || niveau === 'error') {
    flushImmediat({ source, niveau, message }).catch(() => {});
    return;
  }

  // DEBUG/INFO/WARN : file d'attente + flush periodique
  if (fileQueue.length >= MAX_QUEUE) {
    fileQueue.shift();
  }
  fileQueue.push({ source, niveau, message });
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
