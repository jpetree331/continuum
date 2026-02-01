import { Schedule, JournalEntry, MemoryStub, OpenWebUIConfig } from '../types';

const KEYS = {
  SCHEDULES: 'continuum_schedules',
  JOURNAL: 'continuum_journal',
  MEMORY: 'continuum_memory',
  GEMINI_KEY: 'continuum_api_key',
  OWA_CONFIG: 'continuum_owa_config',
  BRIDGE_URL: 'continuum_bridge_url',
  BRIDGE_API_KEY: 'continuum_bridge_api_key'
};

export const Storage = {
  getSchedules: (): Schedule[] => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.SCHEDULES) || '[]');
    } catch { return []; }
  },
  saveSchedules: (schedules: Schedule[]) => {
    localStorage.setItem(KEYS.SCHEDULES, JSON.stringify(schedules));
  },
  getJournal: (): JournalEntry[] => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.JOURNAL) || '[]');
    } catch { return []; }
  },
  saveJournal: (entries: JournalEntry[]) => {
    localStorage.setItem(KEYS.JOURNAL, JSON.stringify(entries));
  },
  getMemories: (): MemoryStub[] => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.MEMORY) || '[]');
    } catch { return []; }
  },
  saveMemories: (memories: MemoryStub[]) => {
    localStorage.setItem(KEYS.MEMORY, JSON.stringify(memories));
  },
  getGeminiKey: (): string | null => {
    return localStorage.getItem(KEYS.GEMINI_KEY);
  },
  saveGeminiKey: (key: string) => {
    localStorage.setItem(KEYS.GEMINI_KEY, key);
  },
  getOWAConfig: (): OpenWebUIConfig | null => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.OWA_CONFIG) || 'null');
    } catch { return null; }
  },
  saveOWAConfig: (config: OpenWebUIConfig) => {
    localStorage.setItem(KEYS.OWA_CONFIG, JSON.stringify(config));
  },
  getBridgeUrl: (): string => {
    return localStorage.getItem(KEYS.BRIDGE_URL) || '';
  },
  saveBridgeUrl: (url: string) => {
    if (url) localStorage.setItem(KEYS.BRIDGE_URL, url);
    else localStorage.removeItem(KEYS.BRIDGE_URL);
  },
  getBridgeApiKey: (): string => localStorage.getItem(KEYS.BRIDGE_API_KEY) || '',
  saveBridgeApiKey: (key: string) => {
    if (key) localStorage.setItem(KEYS.BRIDGE_API_KEY, key);
    else localStorage.removeItem(KEYS.BRIDGE_API_KEY);
  }
};