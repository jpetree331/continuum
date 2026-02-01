import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ScheduleManager } from './components/ScheduleManager';
import { Schedule, JournalEntry, View, MemoryStub, ChatThread, OpenWebUIConfig } from './types';
import { Storage } from './services/storage';
import { openWebUi } from './services/openWebUi';
import * as journalService from './services/journalService';
import * as bridgeStorage from './services/bridgeStorage';
import { Settings, Save, BrainCircuit, RefreshCw, Server, Plus } from 'lucide-react';

const App = () => {
  const [view, setView] = useState<View>('dashboard');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [memories, setMemories] = useState<MemoryStub[]>([]);
  const [chats, setChats] = useState<ChatThread[]>([]);
  
  // Settings
  const [geminiKey, setGeminiKey] = useState('');
  const [owaConfig, setOwaConfig] = useState<OpenWebUIConfig>({ baseUrl: '', apiKey: '' });
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [bridgeApiKey, setBridgeApiKey] = useState('');
  const [nextRunTime, setNextRunTime] = useState<number | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Initialization: bridge URL/key from localStorage; then schedules/settings from bridge or localStorage
  useEffect(() => {
    const savedBridge = Storage.getBridgeUrl();
    const savedBridgeKey = Storage.getBridgeApiKey();
    if (savedBridge) setBridgeUrl(savedBridge);
    if (savedBridgeKey) setBridgeApiKey(savedBridgeKey);

    setJournal(Storage.getJournal());
    setMemories(Storage.getMemories());

    if (savedBridge) {
      Promise.all([
        bridgeStorage.getSchedulesFromBridge(savedBridge, savedBridgeKey || undefined),
        bridgeStorage.getSettingsFromBridge(savedBridge, savedBridgeKey || undefined),
      ]).then(([scheds, settings]) => {
        setSchedules(Array.isArray(scheds) ? scheds : []);
        if (settings.owaConfig) {
          setOwaConfig(settings.owaConfig);
          openWebUi.updateOWAConfig(settings.owaConfig);
        }
        if (settings.geminiKey != null) {
          setGeminiKey(settings.geminiKey);
          openWebUi.updateGeminiKey(settings.geminiKey);
        }
        setInitialLoadDone(true);
        refreshChats();
      }).catch(() => {
        setSchedules(Storage.getSchedules());
        const savedKey = Storage.getGeminiKey();
        if (savedKey) setGeminiKey(savedKey);
        const savedOwa = Storage.getOWAConfig();
        if (savedOwa) setOwaConfig(savedOwa);
        setInitialLoadDone(true);
      });
    } else {
      setSchedules(Storage.getSchedules());
      const savedKey = Storage.getGeminiKey();
      if (savedKey) {
        setGeminiKey(savedKey);
        openWebUi.updateGeminiKey(savedKey);
      }
      const savedOwa = Storage.getOWAConfig();
      if (savedOwa) {
        setOwaConfig(savedOwa);
        openWebUi.updateOWAConfig(savedOwa);
        refreshChats();
      }
      setInitialLoadDone(true);
    }
  }, []);

  // Persistence: after initial load, when bridge is set save schedules to bridge; else localStorage
  useEffect(() => {
    if (!initialLoadDone) return;
    if (bridgeUrl) {
      bridgeStorage.saveSchedulesToBridge(bridgeUrl, schedules, bridgeApiKey || undefined).catch(() => {});
    } else {
      Storage.saveSchedules(schedules);
    }
  }, [schedules, bridgeUrl, bridgeApiKey, initialLoadDone]);
  useEffect(() => Storage.saveJournal(journal), [journal]);
  useEffect(() => Storage.saveMemories(memories), [memories]);

  const refreshChats = async () => {
    const fetchedChats = await openWebUi.getChats();
    setChats(fetchedChats);
  };

  const handleSaveSettings = () => {
    Storage.saveBridgeUrl(bridgeUrl);
    Storage.saveBridgeApiKey(bridgeApiKey);
    Storage.saveGeminiKey(geminiKey);
    Storage.saveOWAConfig(owaConfig);
    openWebUi.updateGeminiKey(geminiKey);
    if (owaConfig.baseUrl) {
      openWebUi.updateOWAConfig(owaConfig);
      refreshChats();
    }

    if (bridgeUrl) {
      bridgeStorage.saveSettingsToBridge(
        bridgeUrl,
        { owaConfig, geminiKey },
        bridgeApiKey || undefined
      ).then(() => alert("System Core: Configuration Updated."))
       .catch(() => alert("Saved locally; bridge save failed."));
    } else {
      alert("System Core: Configuration Updated.");
    }
  };

  // -------------------------
  // SCHEDULER LOGIC
  // -------------------------
  useEffect(() => {
    const checkSchedules = async () => {
      const now = new Date();
      const nowTs = now.getTime();
      let nextRun = Infinity;

      for (const schedule of schedules) {
        if (!schedule.enabled) continue;
        
        const lastRun = schedule.lastRun || 0;
        let shouldTrigger = false;

        // 1. INTERVAL MODE
        if (schedule.type === 'interval' || !schedule.type) { // Fallback for old data
          let intervalMs = 60000; // Default 1m
          const cron = schedule.cron || '1m';
          if (cron.endsWith('s')) intervalMs = parseInt(cron) * 1000;
          if (cron.endsWith('m')) intervalMs = parseInt(cron) * 60000;
          if (cron.endsWith('h')) intervalMs = parseInt(cron) * 3600000;
          if (cron === '24h') intervalMs = 86400000;

          if (nowTs - lastRun >= intervalMs) {
            shouldTrigger = true;
          } else {
             const runTime = lastRun + intervalMs;
             if (runTime < nextRun) nextRun = runTime;
          }
        } 
        
        // 2. SPECIFIC TIME MODE
        else if (schedule.type === 'specific' && schedule.time && schedule.days) {
          const currentDay = now.getDay(); // 0-6
          const currentHours = now.getHours();
          const currentMinutes = now.getMinutes();
          const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

          // Check if today is a scheduled day
          if (schedule.days.includes(currentDay)) {
             // Check if time matches current minute
             if (schedule.time === currentTimeStr) {
                // Ensure we haven't run already this minute
                // "Last run was not within the last 60 seconds" is a safe enough check
                if (nowTs - lastRun > 60000) {
                   shouldTrigger = true;
                }
             }
          }
        }

        if (shouldTrigger) {
          await triggerSchedule(schedule);
        }
      }
      setNextRunTime(nextRun === Infinity ? null : nextRun);
    };

    const timer = setInterval(checkSchedules, 1000);
    return () => clearInterval(timer);
  }, [schedules]);

  const triggerSchedule = async (schedule: Schedule) => {
    // 1. Update last run immediately
    const updatedSchedule = { ...schedule, lastRun: Date.now() };
    setSchedules(prev => prev.map(s => s.id === schedule.id ? updatedSchedule : s));

    // 2. Create Pending Entry
    const entryId = crypto.randomUUID();
    const pendingEntry: JournalEntry = {
      id: entryId,
      timestamp: Date.now(),
      scheduleId: schedule.id,
      prompt: schedule.prompt,
      response: "Transmitting...",
      status: 'pending'
    };
    setJournal(prev => [pendingEntry, ...prev]);

    // 3. Call AI (bridge stores in GAM-Memvid vault when configured; fallback to OpenWebUI if bridge down)
    try {
      let response: string;
      if (bridgeUrl) {
        try {
          const result = await journalService.triggerJournal(
            bridgeUrl,
            schedule.targetChatId,
            schedule.prompt,
            schedule.id,
            bridgeApiKey || undefined
          );
          response = result.response;
        } catch (bridgeErr) {
          // Phase 4 fallback: if bridge returns 502/503/network error, use direct OpenWebUI (no vault save)
          const context = `
Current Time: ${new Date().toISOString()}
Available Memories: ${memories.map(m => `[${m.key}: ${m.value}]`).join(', ')}
Instruction: Respond to the prompt.
`;
          response = await openWebUi.postMessage(schedule.targetChatId, schedule.prompt, context);
        }
      } else {
        const context = `
Current Time: ${new Date().toISOString()}
Available Memories: ${memories.map(m => `[${m.key}: ${m.value}]`).join(', ')}
Instruction: Respond to the prompt.
`;
        response = await openWebUi.postMessage(schedule.targetChatId, schedule.prompt, context);
      }

      // 4. Update Entry
      setJournal(prev => prev.map(e => e.id === entryId ? {
        ...e,
        response,
        status: 'success'
      } : e));
    } catch (error) {
      setJournal(prev => prev.map(e => e.id === entryId ? {
        ...e,
        response: error instanceof Error ? error.message : "Connection to Agent failed.",
        status: 'failed'
      } : e));
    }
  };

  return (
    <Layout currentView={view} onNavigate={setView}>
      {view === 'dashboard' && (
        <Dashboard
          journal={journal}
          nextRun={nextRunTime}
          bridgeUrl={bridgeUrl || undefined}
          bridgeApiKey={bridgeApiKey || undefined}
        />
      )}

      {view === 'schedules' && (
        <ScheduleManager 
          schedules={schedules} 
          availableChats={chats}
          onAdd={s => setSchedules([...schedules, s])}
          onDelete={id => setSchedules(schedules.filter(s => s.id !== id))}
          onToggle={id => setSchedules(schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))}
          onTriggerNow={triggerSchedule}
        />
      )}

      {view === 'memory' && (
        <div className="space-y-6">
           <div className="bg-cyber-800 border border-cyber-600 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-6">
                <BrainCircuit className="text-cyber-accent" size={32} />
                <div>
                    <h2 className="text-2xl font-bold text-white">Memory Core</h2>
                    <p className="text-cyber-500 font-mono text-sm">Static Context Blocks</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {memories.map(mem => (
                      <div key={mem.id} className="bg-cyber-900 border border-cyber-700 p-4 rounded">
                          <h4 className="font-mono text-cyber-accent text-sm mb-2">[{mem.key}]</h4>
                          <p className="text-cyber-300 text-sm line-clamp-3">{mem.value}</p>
                      </div>
                  ))}
                  <button 
                    onClick={() => {
                        const key = prompt("Memory Key");
                        const val = prompt("Content");
                        if (key && val) {
                            setMemories([...memories, {
                                id: crypto.randomUUID(), key, value: val, importance: 50, lastAccessed: Date.now()
                            }])
                        }
                    }}
                    className="border-2 border-dashed border-cyber-700 p-4 rounded flex items-center justify-center text-cyber-500 hover:text-cyber-accent transition-colors"
                  >
                      <Plus size={24} />
                  </button>
              </div>
           </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="max-w-3xl mx-auto space-y-8">
           {/* GAM-Memvid Bridge (journal → memory vault) */}
           <div className="bg-cyber-800 border border-cyber-600 rounded-xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 border-b border-cyber-700 pb-4">
                <Server className="text-cyber-accent" size={24} />
                <div>
                    <h2 className="text-xl font-bold text-white">GAM-Memvid Bridge</h2>
                    <p className="text-cyber-500 text-xs font-mono">When set, journal entries are stored in the memory vault (ai_reflection) and scheduler uses bridge.</p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-mono text-cyber-400 mb-2">BRIDGE URL (GAM-Memvid server)</label>
                  <input
                    type="text"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="http://localhost:8100"
                    className="w-full bg-cyber-900 border border-cyber-700 rounded p-3 text-white font-mono focus:border-cyber-accent focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-cyber-400 mb-2">BRIDGE API KEY (optional)</label>
                  <input
                    type="password"
                    value={bridgeApiKey}
                    onChange={(e) => setBridgeApiKey(e.target.value)}
                    placeholder="Required if server has CONTINUUM_BRIDGE_API_KEY set"
                    className="w-full bg-cyber-900 border border-cyber-700 rounded p-3 text-white font-mono focus:border-cyber-accent focus:outline-none text-sm"
                  />
                </div>
                <p className="text-[10px] text-cyber-500">Leave URL empty to use local journal only. Set to your GAM-Memvid server to store journal in vault. API key required if the bridge enforces auth.</p>
              </div>
           </div>

           {/* OpenWebUI Config */}
           <div className="bg-cyber-800 border border-cyber-600 rounded-xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 border-b border-cyber-700 pb-4">
                <Server className="text-cyber-accent" size={24} />
                <div>
                    <h2 className="text-xl font-bold text-white">OpenWebUI Connection</h2>
                    <p className="text-cyber-500 text-xs font-mono">Connect to external Agent Instance (Railway/Localhost)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-mono text-cyber-400 mb-2">INSTANCE URL</label>
                        <input 
                          type="text" 
                          value={owaConfig.baseUrl}
                          onChange={(e) => setOwaConfig({...owaConfig, baseUrl: e.target.value})}
                          placeholder="https://my-openwebui.railway.app"
                          className="w-full bg-cyber-900 border border-cyber-700 rounded p-3 text-white font-mono focus:border-cyber-accent focus:outline-none text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-cyber-400 mb-2">API KEY (BEARER)</label>
                        <input 
                          type="password" 
                          value={owaConfig.apiKey}
                          onChange={(e) => setOwaConfig({...owaConfig, apiKey: e.target.value})}
                          placeholder="sk-..."
                          className="w-full bg-cyber-900 border border-cyber-700 rounded p-3 text-white font-mono focus:border-cyber-accent focus:outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <button 
                       onClick={refreshChats}
                       className="text-cyber-400 hover:text-white text-xs font-mono flex items-center gap-2"
                    >
                        <RefreshCw size={14} /> REFRESH CHAT LIST ({chats.length} FOUND)
                    </button>
                </div>
              </div>
           </div>

           {/* Fallback Config */}
           <div className="bg-cyber-800 border border-cyber-600 rounded-xl p-8 shadow-2xl opacity-75">
              <div className="flex items-center gap-3 mb-6">
                 <BrainCircuit className="text-cyber-400" size={24} />
                 <h2 className="text-xl font-bold text-white">Simulation Core (Fallback)</h2>
              </div>
              <div>
                <label className="block text-xs font-mono text-cyber-400 mb-2">GEMINI API KEY</label>
                <input 
                  type="password" 
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-cyber-900 border border-cyber-700 rounded p-3 text-white font-mono focus:border-cyber-accent focus:outline-none text-sm"
                />
                <p className="text-[10px] text-cyber-500 mt-2">Used only if OpenWebUI is disconnected or for internal thought processes.</p>
              </div>
           </div>

           <div className="flex justify-end">
              <button 
                  onClick={handleSaveSettings}
                  className="bg-cyber-600 hover:bg-cyber-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg"
                >
                  <Save size={18} /> SAVE CONFIGURATION
                </button>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;