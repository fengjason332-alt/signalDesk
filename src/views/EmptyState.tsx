import React from 'react';
import { Satellite, Radar, Filter, RefreshCw } from 'lucide-react';
import { Header } from '../components/Header';

interface EmptyStateProps {
  onReset?: () => void;
}

export default function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      <main className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="w-32 h-32 bg-surface-low rounded-full flex items-center justify-center border border-outline/10 shadow-inner relative overflow-hidden group">
          <div className="absolute inset-0 opacity-20 border-[8px] border-on-surface rounded-full border-dashed animate-[spin_20s_linear_infinite]" />
          <Satellite size={64} className="text-primary/40 group-hover:text-primary transition-colors" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-on-surface max-w-[280px] mx-auto leading-tight">
            Signal Silence
          </h2>
          <p className="text-on-surface-variant text-sm max-w-[300px] leading-relaxed">
            The satellites are silent. No high-priority signals match your current profile filters.
          </p>
        </div>

        <div className="flex flex-col w-full gap-3 pt-6">
          <button 
            onClick={onReset}
            className="flex items-center justify-center gap-2 w-full bg-primary py-4 rounded-2xl text-on-primary font-bold shadow-[0_8px_24px_rgba(0,229,255,0.3)] active:scale-[0.98] transition-all"
          >
            <RefreshCw size={18} />
            Reset Intelligence Feed
          </button>
          <button 
            className="flex items-center justify-center gap-2 w-full bg-surface border border-outline/20 py-4 rounded-2xl text-on-surface font-bold hover:bg-surface-high transition-all active:scale-[0.98]"
          >
            <Filter size={18} />
            Adjust Strategic Filters
          </button>
        </div>
      </main>
    </div>
  );
}
