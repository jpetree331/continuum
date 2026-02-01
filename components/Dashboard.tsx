import React, { useEffect, useRef, useState } from 'react';
import { JournalEntry } from '../types';
import * as journalService from '../services/journalService';
import { Clock, MessageSquare, Terminal, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const PAGE_SIZE = 30;

interface DashboardProps {
  journal: JournalEntry[];
  nextRun: number | null;
  bridgeUrl?: string;
  bridgeApiKey?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ journal, nextRun, bridgeUrl, bridgeApiKey }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [bridgeJournal, setBridgeJournal] = useState<JournalEntry[]>([]);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeModels, setBridgeModels] = useState<string[]>([]);
  const [bridgeThreads, setBridgeThreads] = useState<journalService.ThreadInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedThread, setSelectedThread] = useState('');
  const [filterScheduleId, setFilterScheduleId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const displayJournal = bridgeUrl ? bridgeJournal : journal;

  useEffect(() => {
    if (!bridgeUrl) return;
    let cancelled = false;
    (async () => {
      setBridgeLoading(true);
      setBridgeError(null);
      try {
        const [models, threads] = await Promise.all([
          journalService.getModels(bridgeUrl, bridgeApiKey),
          journalService.getThreads(bridgeUrl, { limit: 100 }, bridgeApiKey),
        ]);
        if (cancelled) return;
        setBridgeModels(models);
        setBridgeThreads(threads);
        if (models.length && !selectedModel) setSelectedModel(models[0]);
      } catch (e) {
        if (!cancelled) setBridgeError(e instanceof Error ? e.message : 'Failed to load bridge');
      } finally {
        if (!cancelled) setBridgeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bridgeUrl, bridgeApiKey]);

  useEffect(() => {
    if (!bridgeUrl) return;
    setSkip(0);
    let cancelled = false;
    (async () => {
      setBridgeLoading(true);
      setBridgeError(null);
      try {
        const res = await journalService.getJournalEntries(
          bridgeUrl,
          {
            modelId: selectedModel || undefined,
            threadId: selectedThread || undefined,
            scheduleId: filterScheduleId || undefined,
            fromDate: filterFromDate || undefined,
            toDate: filterToDate || undefined,
            limit: PAGE_SIZE,
            skip: 0,
          },
          bridgeApiKey
        );
        if (cancelled) return;
        setBridgeJournal((res.entries || []).map(journalService.bridgeEntryToJournal));
        setHasMore(!!res.has_more);
      } catch (e) {
        if (!cancelled) setBridgeError(e instanceof Error ? e.message : 'Failed to load journal');
      } finally {
        if (!cancelled) setBridgeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bridgeUrl, bridgeApiKey, selectedModel, selectedThread, filterScheduleId, filterFromDate, filterToDate]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString();
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  const refreshBridgeJournal = () => {
    if (!bridgeUrl) return;
    setSkip(0);
    setBridgeLoading(true);
    journalService.getJournalEntries(
      bridgeUrl,
      {
        modelId: selectedModel || undefined,
        threadId: selectedThread || undefined,
        scheduleId: filterScheduleId || undefined,
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        limit: PAGE_SIZE,
        skip: 0,
      },
      bridgeApiKey
    ).then(res => {
      setBridgeJournal((res.entries || []).map(journalService.bridgeEntryToJournal));
      setHasMore(!!res.has_more);
    }).catch(() => setBridgeError('Refresh failed'))
      .finally(() => setBridgeLoading(false));
  };

  const loadMoreBridgeJournal = () => {
    if (!bridgeUrl || bridgeLoading || !hasMore) return;
    const nextSkip = skip + PAGE_SIZE;
    setBridgeLoading(true);
    journalService.getJournalEntries(
      bridgeUrl,
      {
        modelId: selectedModel || undefined,
        threadId: selectedThread || undefined,
        scheduleId: filterScheduleId || undefined,
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        limit: PAGE_SIZE,
        skip: nextSkip,
      },
      bridgeApiKey
    ).then(res => {
      const more = (res.entries || []).map(journalService.bridgeEntryToJournal);
      setBridgeJournal(prev => [...prev, ...more]);
      setHasMore(!!res.has_more);
      setSkip(nextSkip);
    }).catch(() => setBridgeError('Load more failed'))
      .finally(() => setBridgeLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* Bridge filters (model / thread) when bridge is configured */}
      {bridgeUrl && (
        <div className="bg-cyber-800/80 border border-cyber-600 p-4 rounded-xl flex flex-wrap items-center gap-4">
          <span className="text-cyber-400 text-xs font-mono uppercase tracking-widest">VAULT</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-cyber-900 border border-cyber-700 rounded px-3 py-2 text-white font-mono text-sm focus:border-cyber-accent focus:outline-none"
          >
            <option value="">— model —</option>
            {bridgeModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="text-cyber-400 text-xs font-mono uppercase tracking-widest">THREAD</span>
          <select
            value={selectedThread}
            onChange={(e) => setSelectedThread(e.target.value)}
            className="bg-cyber-900 border border-cyber-700 rounded px-3 py-2 text-white font-mono text-sm focus:border-cyber-accent focus:outline-none min-w-[180px]"
          >
            <option value="">All threads</option>
            {bridgeThreads.map(t => (
              <option key={t.id} value={t.id}>{t.title ?? t.id}</option>
            ))}
          </select>
          <span className="text-cyber-400 text-xs font-mono uppercase tracking-widest">SCHEDULE</span>
          <input
            type="text"
            value={filterScheduleId}
            onChange={(e) => setFilterScheduleId(e.target.value)}
            placeholder="Schedule ID"
            className="bg-cyber-900 border border-cyber-700 rounded px-3 py-2 text-white font-mono text-sm w-32 focus:border-cyber-accent focus:outline-none"
          />
          <span className="text-cyber-400 text-xs font-mono uppercase tracking-widest">FROM</span>
          <input
            type="date"
            value={filterFromDate}
            onChange={(e) => setFilterFromDate(e.target.value)}
            className="bg-cyber-900 border border-cyber-700 rounded px-3 py-2 text-white font-mono text-sm focus:border-cyber-accent focus:outline-none"
          />
          <span className="text-cyber-400 text-xs font-mono uppercase tracking-widest">TO</span>
          <input
            type="date"
            value={filterToDate}
            onChange={(e) => setFilterToDate(e.target.value)}
            className="bg-cyber-900 border border-cyber-700 rounded px-3 py-2 text-white font-mono text-sm focus:border-cyber-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={refreshBridgeJournal}
            disabled={bridgeLoading}
            className="text-cyber-400 hover:text-white text-xs font-mono flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} /> {bridgeLoading ? 'Loading…' : 'Refresh'}
          </button>
          {bridgeError && <span className="text-cyber-danger text-xs font-mono">{bridgeError}</span>}
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-cyber-800/80 backdrop-blur border border-cyber-600 p-4 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Terminal size={64} />
          </div>
          <h3 className="text-cyber-400 text-xs font-mono uppercase tracking-widest mb-1">Total Logs</h3>
          <p className="text-3xl font-bold text-white font-mono">{displayJournal.length}</p>
        </div>
        
        <div className="bg-cyber-800/80 backdrop-blur border border-cyber-600 p-4 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={64} />
          </div>
          <h3 className="text-cyber-400 text-xs font-mono uppercase tracking-widest mb-1">Next Cycle</h3>
          <p className="text-3xl font-bold text-cyber-accent font-mono">
            {nextRun ? new Date(nextRun).toLocaleTimeString() : 'IDLE'}
          </p>
        </div>

        <div className="bg-cyber-800/80 backdrop-blur border border-cyber-600 p-4 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <MessageSquare size={64} />
          </div>
          <h3 className="text-cyber-400 text-xs font-mono uppercase tracking-widest mb-1">Agent Status</h3>
          <p className="text-3xl font-bold text-white font-mono flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyber-accent"></span> ACTIVE
          </p>
        </div>
      </div>

      {/* Journal Feed */}
      <div className="bg-cyber-800/90 backdrop-blur border border-cyber-600 rounded-xl shadow-2xl flex flex-col h-[600px]">
        <div className="p-4 border-b border-cyber-600 flex justify-between items-center bg-cyber-800/50 rounded-t-xl">
          <h2 className="font-mono text-cyber-accent text-lg flex items-center gap-2">
            <Terminal size={18} /> CAPTAIN'S LOG
          </h2>
          <span className="text-xs text-cyber-500 font-mono">LIVE FEED</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayJournal.length === 0 ? (
            <div className="text-center text-cyber-500 py-20 font-mono">
              <p>// NO ENTRIES FOUND</p>
              <p className="text-sm mt-2">
                {bridgeUrl ? 'No journal entries in vault for this model/thread, or run a schedule with bridge enabled.' : 'Initialize a schedule to begin recording.'}
              </p>
            </div>
          ) : (
            displayJournal.map((entry) => (
              <div 
                key={entry.id} 
                className="group relative pl-6 border-l-2 border-cyber-600 hover:border-cyber-accent transition-colors duration-300 animate-in fade-in slide-in-from-bottom-4"
              >
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyber-900 border-2 border-cyber-600 group-hover:border-cyber-accent transition-colors"></div>
                
                <div className="mb-2 flex items-center gap-3">
                  <span className="font-mono text-xs text-cyber-500">
                    [{formatDate(entry.timestamp)} {formatTime(entry.timestamp)}]
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    entry.status === 'success' ? 'bg-cyber-accent/10 text-cyber-accent' : 
                    entry.status === 'failed' ? 'bg-cyber-danger/10 text-cyber-danger' : 'bg-cyber-warn/10 text-cyber-warn'
                  }`}>
                    {entry.status}
                  </span>
                  <span className="text-xs text-cyber-500 font-mono border border-cyber-700 px-2 rounded">
                    ID: {entry.scheduleId.split('-')[0]}
                  </span>
                </div>

                <div className="bg-cyber-900/50 p-4 rounded-lg border border-cyber-700/50 group-hover:border-cyber-600 transition-colors">
                  <div className="mb-3 text-sm text-cyber-400 font-mono border-b border-cyber-800 pb-2">
                    <span className="text-cyber-600 mr-2">$</span>
                    {entry.prompt}
                  </div>
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
                    {entry.response}
                  </div>
                </div>
              </div>
            ))
          )}
          {bridgeUrl && hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={loadMoreBridgeJournal}
                disabled={bridgeLoading}
                className="text-cyber-400 hover:text-white text-sm font-mono border border-cyber-600 px-4 py-2 rounded disabled:opacity-50"
              >
                {bridgeLoading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};