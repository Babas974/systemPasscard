// ApiService.ts
// Service HTTP adaptive : essaie plusieurs URLs candidates (USB tunnel,
// Wi-Fi partage, localhost) et garde en cache celle qui repond.
// La verification periodique permet le failover si une methode tombe.

const PORT = 8389;
const REQUEST_TIMEOUT_MS = 10000;
const PING_TIMEOUT_MS = 1500;

const CANDIDATE_URLS: string[] = [
  `http://127.0.0.1:${PORT}`,
  `http://10.154.202.45:${PORT}`,
  `http://localhost:${PORT}`,
];

let currentBaseUrl: string = CANDIDATE_URLS[0];

export const setIP = (ip: string) => {
  const candidate = `http://${ip.trim()}:${PORT}`;
  if (!CANDIDATE_URLS.includes(candidate)) {
    CANDIDATE_URLS.unshift(candidate);
  }
  currentBaseUrl = candidate;
};

export const getIP = (): string => {
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

export const resolveBaseUrl = async (): Promise<string> => {
  if (await pingUrl(currentBaseUrl)) return currentBaseUrl;
  for (const url of CANDIDATE_URLS) {
    if (url === currentBaseUrl) continue;
    if (await pingUrl(url)) {
      currentBaseUrl = url;
      return url;
    }
  }
  return currentBaseUrl;
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
