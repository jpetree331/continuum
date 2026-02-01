/**
 * Journal service - GAM-Memvid bridge API client.
 * Used when Continuum is connected to the bridge: journal entries are stored
 * in the memory vault (ai_reflection pearls) and can be filtered by model/thread.
 */
import { JournalEntry } from '../types';

export interface BridgeJournalEntry {
  id: string;
  user_message: string;
  ai_response: string;
  content?: string;
  metadata?: { schedule_id?: string; thread_id?: string; source?: string };
  created_at?: string | null;
  [key: string]: unknown;
}

export interface JournalTriggerResponse {
  entry_id: string;
  response: string;
  timestamp: string;
  model_id?: string | null;
}

export interface JournalEntriesResponse {
  entries: BridgeJournalEntry[];
  count: number;
  model_id: string | null;
  has_more?: boolean;
}

export interface ThreadInfo {
  id: string;
  title?: string;
  model?: string;
  [key: string]: unknown;
}

function ensureNoTrailingSlash(baseUrl: string): string {
  return (baseUrl || '').replace(/\/$/, '');
}

/**
 * Map a bridge entry (hydrated pearl) to the app's JournalEntry type.
 */
export function bridgeEntryToJournal(entry: BridgeJournalEntry): JournalEntry {
  const createdAt = entry.created_at
    ? (typeof entry.created_at === 'string'
        ? new Date(entry.created_at).getTime()
        : Number(entry.created_at))
    : Date.now();
  const scheduleId = entry.metadata?.schedule_id ?? entry.id;
  return {
    id: entry.id,
    timestamp: createdAt,
    scheduleId: String(scheduleId),
    prompt: entry.user_message || '',
    response: entry.ai_response || '',
    status: 'success',
  };
}

function bridgeHeaders(apiKey?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    h['Authorization'] = `Bearer ${apiKey}`;
    h['X-API-Key'] = apiKey;
  }
  return h;
}

/**
 * Trigger a journal entry via the bridge: send prompt to OpenWebUI thread,
 * capture AI response, store as ai_reflection in GAM-Memvid vault.
 */
export async function triggerJournal(
  bridgeBaseUrl: string,
  threadId: string,
  prompt: string,
  scheduleId: string,
  apiKey?: string | null
): Promise<JournalTriggerResponse> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const res = await fetch(`${base}/continuum/journal/trigger`, {
    method: 'POST',
    headers: bridgeHeaders(apiKey),
    body: JSON.stringify({ thread_id: threadId, prompt, schedule_id: scheduleId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bridge trigger failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Fetch journal entries (ai_reflection pearls) from the bridge.
 */
export async function getJournalEntries(
  bridgeBaseUrl: string,
  options?: {
    modelId?: string | null;
    threadId?: string | null;
    scheduleId?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
    limit?: number;
    skip?: number;
  },
  apiKey?: string | null
): Promise<JournalEntriesResponse> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const params = new URLSearchParams();
  if (options?.modelId) params.set('model_id', options.modelId);
  if (options?.threadId) params.set('thread_id', options.threadId);
  if (options?.scheduleId) params.set('schedule_id', options.scheduleId);
  if (options?.fromDate) params.set('from_date', options.fromDate);
  if (options?.toDate) params.set('to_date', options.toDate);
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.skip != null) params.set('skip', String(options.skip));
  const qs = params.toString();
  const url = qs ? `${base}/continuum/journal/entries?${qs}` : `${base}/continuum/journal/entries`;
  const res = await fetch(url, { headers: bridgeHeaders(apiKey) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bridge journal entries failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * List models (vaults) from the bridge (GAM-Memvid /models).
 */
export async function getModels(bridgeBaseUrl: string, apiKey?: string | null): Promise<string[]> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const res = await fetch(`${base}/models`, { headers: bridgeHeaders(apiKey) });
  if (!res.ok) return [];
  const data = await res.json();
  const list = data?.models ?? data?.all_vault_files ?? [];
  if (Array.isArray(list)) {
    return list.map((m: string) => (typeof m === 'string' && m.endsWith('.mv2') ? m.replace('.mv2', '') : m));
  }
  return [];
}

/**
 * List threads from the bridge (proxies OpenWebUI chats).
 */
export async function getThreads(
  bridgeBaseUrl: string,
  options?: { skip?: number; limit?: number },
  apiKey?: string | null
): Promise<ThreadInfo[]> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const params = new URLSearchParams();
  if (options?.skip != null) params.set('skip', String(options.skip));
  if (options?.limit != null) params.set('limit', String(options.limit));
  const qs = params.toString();
  const url = qs ? `${base}/continuum/threads?${qs}` : `${base}/continuum/threads`;
  const res = await fetch(url, { headers: bridgeHeaders(apiKey) });
  if (!res.ok) return [];
  const data = await res.json();
  const list = data?.threads ?? data?.chats ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Resolve thread_id to model_id (vault identifier).
 */
export async function getModelForThread(
  bridgeBaseUrl: string,
  threadId: string,
  apiKey?: string | null
): Promise<string | null> {
  const base = ensureNoTrailingSlash(bridgeBaseUrl);
  const res = await fetch(`${base}/continuum/threads/${encodeURIComponent(threadId)}/model`, {
    headers: bridgeHeaders(apiKey),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.model_id ?? null;
}
