/**
 * Continuum persistence via GAM-Memvid bridge (Option B).
 * When Bridge URL is set, schedules and settings are stored on the bridge server
 * (DATA_DIR/continuum on GAM-Memvid). Requires bridge API key if server enforces it.
 */
import { Schedule } from '../types';

export interface ContinuumSettings {
  owaConfig?: { baseUrl: string; apiKey: string };
  geminiKey?: string;
}

function ensureNoTrailingSlash(baseUrl: string): string {
  return (baseUrl || '').replace(/\/$/, '');
}

function bridgeHeaders(apiKey?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    h['Authorization'] = `Bearer ${apiKey}`;
    h['X-API-Key'] = apiKey;
  }
  return h;
}

export async function getSchedulesFromBridge(
  bridgeBaseUrl: string,
  apiKey?: string | null
): Promise<Schedule[]> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const res = await fetch(`${base}/continuum/schedules`, { headers: bridgeHeaders(apiKey) });
  if (!res.ok) throw new Error(`Bridge schedules failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function saveSchedulesToBridge(
  bridgeBaseUrl: string,
  schedules: Schedule[],
  apiKey?: string | null
): Promise<void> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const res = await fetch(`${base}/continuum/schedules`, {
    method: 'PUT',
    headers: bridgeHeaders(apiKey),
    body: JSON.stringify(schedules),
  });
  if (!res.ok) throw new Error(`Bridge save schedules failed: ${res.status}`);
}

export async function getSettingsFromBridge(
  bridgeBaseUrl: string,
  apiKey?: string | null
): Promise<ContinuumSettings> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const res = await fetch(`${base}/continuum/settings`, { headers: bridgeHeaders(apiKey) });
  if (!res.ok) throw new Error(`Bridge settings failed: ${res.status}`);
  const data = await res.json();
  return typeof data === 'object' && data !== null ? data : {};
}

export async function saveSettingsToBridge(
  bridgeBaseUrl: string,
  settings: ContinuumSettings,
  apiKey?: string | null
): Promise<void> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const res = await fetch(`${base}/continuum/settings`, {
    method: 'PUT',
    headers: bridgeHeaders(apiKey),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Bridge save settings failed: ${res.status}`);
}
