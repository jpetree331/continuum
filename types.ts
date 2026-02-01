export interface Schedule {
  id: string;
  name: string;
  type: 'interval' | 'specific';
  cron: string; // Used for interval: "10s", "1m", etc.
  time?: string; // Used for specific: "HH:MM" (24h)
  days?: number[]; // Used for specific: 0=Sun, 1=Mon, etc.
  prompt: string;
  targetChatId: string;
  enabled: boolean;
  lastRun?: number;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  scheduleId: string;
  prompt: string;
  response: string;
  mood?: string;
  status: 'success' | 'failed' | 'pending';
}

export interface MemoryStub {
  id: string;
  key: string;
  value: string;
  importance: number; // 0-100
  lastAccessed: number;
}

export interface ChatThread {
  id: string;
  title: string;
}

export interface OpenWebUIConfig {
  baseUrl: string;
  apiKey: string;
}

export type View = 'dashboard' | 'schedules' | 'memory' | 'settings';