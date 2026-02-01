import React, { useState } from 'react';
import { Schedule, ChatThread } from '../types';
import { Plus, Trash2, Clock, Calendar, Zap, MessageSquare } from 'lucide-react';

interface ScheduleManagerProps {
  schedules: Schedule[];
  availableChats: ChatThread[];
  onAdd: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onTriggerNow: (schedule: Schedule) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({ 
  schedules, 
  availableChats,
  onAdd, 
  onDelete, 
  onToggle,
  onTriggerNow
}) => {
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'interval' | 'specific'>('interval');
  const [cron, setCron] = useState('1h');
  const [time, setTime] = useState('09:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [promptText, setPromptText] = useState('');
  const [targetChatId, setTargetChatId] = useState('');

  const resetForm = () => {
    setName('');
    setType('interval');
    setCron('1h');
    setTime('09:00');
    setDays([1, 2, 3, 4, 5]);
    setPromptText('');
    setTargetChatId(availableChats.length > 0 ? availableChats[0].id : 'simulation');
  };

  const toggleDay = (dayIndex: number) => {
    if (days.includes(dayIndex)) {
      setDays(days.filter(d => d !== dayIndex));
    } else {
      setDays([...days, dayIndex].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !promptText) return;

    onAdd({
      id: crypto.randomUUID(),
      name,
      type,
      cron: type === 'interval' ? cron : '',
      time: type === 'specific' ? time : undefined,
      days: type === 'specific' ? days : undefined,
      prompt: promptText,
      targetChatId: targetChatId || 'simulation',
      enabled: true,
      lastRun: 0
    });
    setIsAdding(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Schedules</h2>
          <p className="text-cyber-500 text-sm font-mono">Manage autonomous trigger events</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); resetForm(); }}
          className="bg-cyber-accent text-cyber-900 px-4 py-2 rounded font-bold hover:bg-white transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> NEW DIRECTIVE
        </button>
      </div>

      {isAdding && (
        <div className="bg-cyber-800 border border-cyber-600 p-6 rounded-xl shadow-2xl animate-in fade-in zoom-in-95">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-cyber-700 pb-2">
            <Calendar size={18} /> DEFINE NEW DIRECTIVE
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-cyber-400 font-mono mb-1">DIRECTIVE NAME</label>
                <input 
                  className="w-full bg-cyber-900 border border-cyber-600 rounded p-2 text-white focus:border-cyber-accent focus:outline-none font-mono text-sm"
                  placeholder="e.g. Daily Reflection"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-cyber-400 font-mono mb-1">TARGET THREAD</label>
                <select 
                  className="w-full bg-cyber-900 border border-cyber-600 rounded p-2 text-white focus:border-cyber-accent focus:outline-none font-mono text-sm"
                  value={targetChatId}
                  onChange={e => setTargetChatId(e.target.value)}
                >
                  <option value="simulation">Simulation Mode (Internal)</option>
                  {availableChats.map(chat => (
                    <option key={chat.id} value={chat.id}>
                      {chat.title.substring(0, 30)}{chat.title.length > 30 ? '...' : ''}
                    </option>
                  ))}
                </select>
                {availableChats.length === 0 && (
                   <p className="text-[10px] text-cyber-500 mt-1">* Configure OpenWebUI in settings to see threads</p>
                )}
              </div>
            </div>

            {/* Scheduling Type */}
            <div className="bg-cyber-900/50 p-4 rounded-lg border border-cyber-700">
              <label className="block text-xs text-cyber-400 font-mono mb-3">TRIGGER MODE</label>
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setType('interval')}
                  className={`flex-1 py-2 rounded text-sm font-mono border ${type === 'interval' ? 'bg-cyber-600 border-cyber-accent text-white' : 'bg-cyber-900 border-cyber-700 text-cyber-500'}`}
                >
                  LOOP (INTERVAL)
                </button>
                <button
                   type="button"
                   onClick={() => setType('specific')}
                   className={`flex-1 py-2 rounded text-sm font-mono border ${type === 'specific' ? 'bg-cyber-600 border-cyber-accent text-white' : 'bg-cyber-900 border-cyber-700 text-cyber-500'}`}
                >
                  SCHEDULED (TIME)
                </button>
              </div>

              {type === 'interval' ? (
                <div>
                   <label className="block text-xs text-cyber-500 font-mono mb-1">RUN EVERY</label>
                   <select 
                    className="w-full bg-cyber-900 border border-cyber-600 rounded p-2 text-white font-mono text-sm"
                    value={cron}
                    onChange={e => setCron(e.target.value)}
                  >
                    <option value="10s">10 Seconds (Testing)</option>
                    <option value="30s">30 Seconds</option>
                    <option value="1m">1 Minute</option>
                    <option value="15m">15 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="24h">24 Hours</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="flex-1">
                        <label className="block text-xs text-cyber-500 font-mono mb-1">TIME (24H)</label>
                        <input 
                          type="time" 
                          value={time}
                          onChange={e => setTime(e.target.value)}
                          className="w-full bg-cyber-900 border border-cyber-600 rounded p-2 text-white font-mono text-sm"
                        />
                     </div>
                  </div>
                  <div>
                    <label className="block text-xs text-cyber-500 font-mono mb-2">ACTIVE DAYS</label>
                    <div className="flex justify-between gap-1">
                      {DAYS.map((d, i) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(i)}
                          className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                            days.includes(i) ? 'bg-cyber-accent text-cyber-900' : 'bg-cyber-800 text-cyber-600 border border-cyber-700'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Prompt */}
            <div>
              <label className="block text-xs text-cyber-400 font-mono mb-1">PROMPT PAYLOAD</label>
              <textarea 
                className="w-full bg-cyber-900 border border-cyber-600 rounded p-2 text-white focus:border-cyber-accent focus:outline-none font-mono text-sm h-24"
                placeholder="Agent instruction..."
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 rounded text-cyber-400 hover:text-white font-mono text-sm"
              >
                CANCEL
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-cyber-600 hover:bg-cyber-500 text-white rounded font-mono text-sm font-bold border border-cyber-500"
              >
                INITIALIZE DIRECTIVE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule List */}
      <div className="grid gap-4">
        {schedules.map(schedule => {
          // Helper to display schedule details
          const isSpecific = schedule.type === 'specific';
          const chatName = availableChats.find(c => c.id === schedule.targetChatId)?.title || (schedule.targetChatId === 'simulation' ? 'Internal Sim' : 'Unknown Chat');
          
          return (
            <div key={schedule.id} className="bg-cyber-800/50 border border-cyber-700 p-4 rounded-lg flex items-center justify-between hover:border-cyber-500 transition-colors group">
              <div className="flex items-center gap-4">
                <div onClick={() => onToggle(schedule.id)} className={`cursor-pointer w-10 h-6 rounded-full relative transition-colors ${schedule.enabled ? 'bg-cyber-accent' : 'bg-cyber-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-cyber-900 transition-all ${schedule.enabled ? 'left-5' : 'left-1'}`} />
                </div>
                
                <div>
                  <h4 className={`font-bold ${schedule.enabled ? 'text-white' : 'text-cyber-500'}`}>{schedule.name}</h4>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs text-cyber-400 font-mono mt-1">
                    <span className="flex items-center gap-1 bg-cyber-900 px-2 py-0.5 rounded border border-cyber-700">
                      {isSpecific ? <Calendar size={12} /> : <Clock size={12} />} 
                      {isSpecific 
                        ? `${schedule.time} on [${schedule.days?.map(d => DAYS[d]).join(',')}]` 
                        : `Every ${schedule.cron}`
                      }
                    </span>
                    <span className="flex items-center gap-1 text-cyber-500">
                       <MessageSquare size={12} /> {chatName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onTriggerNow(schedule)}
                  className="p-2 text-cyber-400 hover:text-cyber-accent hover:bg-cyber-900 rounded transition-colors"
                  title="Trigger Now"
                >
                  <Zap size={18} />
                </button>
                <button 
                  onClick={() => onDelete(schedule.id)}
                  className="p-2 text-cyber-400 hover:text-cyber-danger hover:bg-cyber-900 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        
        {schedules.length === 0 && !isAdding && (
          <div className="text-center py-12 border-2 border-dashed border-cyber-800 rounded-xl">
            <p className="text-cyber-600 font-mono">NO ACTIVE DIRECTIVES</p>
          </div>
        )}
      </div>
    </div>
  );
};