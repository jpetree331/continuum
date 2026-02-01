import React, { ReactNode } from 'react';
import { Activity, Calendar, Database, Settings, Terminal, Cpu } from 'lucide-react';
import { View } from '../types';

interface LayoutProps {
  children: ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
}

const NavItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-cyber-600 text-cyber-accent border-l-4 border-cyber-accent' 
        : 'text-cyber-400 hover:bg-cyber-700 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-mono text-sm tracking-wide">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  return (
    <div className="flex h-screen bg-cyber-900 text-white overflow-hidden selection:bg-cyber-accent selection:text-cyber-900">
      {/* Sidebar */}
      <div className="w-64 bg-cyber-800 border-r border-cyber-700 flex flex-col shadow-2xl z-10">
        <div className="p-6 flex items-center space-x-3 border-b border-cyber-700">
          <div className="p-2 bg-cyber-700 rounded-lg border border-cyber-500">
             <Cpu className="text-cyber-accent" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-white">CONTINUUM</h1>
            <p className="text-xs text-cyber-500 font-mono">v1.0.4 ONLINE</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={Activity} 
            label="DASHBOARD" 
            active={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')} 
          />
          <NavItem 
            icon={Calendar} 
            label="SCHEDULES" 
            active={currentView === 'schedules'} 
            onClick={() => onNavigate('schedules')} 
          />
          <NavItem 
            icon={Database} 
            label="MEMORY CORE" 
            active={currentView === 'memory'} 
            onClick={() => onNavigate('memory')} 
          />
          <NavItem 
            icon={Settings} 
            label="SYSTEM" 
            active={currentView === 'settings'} 
            onClick={() => onNavigate('settings')} 
          />
        </nav>

        <div className="p-4 border-t border-cyber-700 bg-cyber-900/50">
          <div className="flex items-center space-x-2 text-xs text-cyber-500 font-mono">
            <div className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse"></div>
            <span>SYSTEM STABLE</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        <div className="absolute inset-0 bg-cyber-900/90 pointer-events-none"></div>
        <div className="relative z-0 p-8 min-h-full">
            {children}
        </div>
      </main>
    </div>
  );
};