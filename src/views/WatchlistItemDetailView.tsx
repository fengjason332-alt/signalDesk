import React from 'react';
import { ArrowLeft, MoreVertical, TrendingUp, TrendingDown, Bell, Globe, Activity } from 'lucide-react';
import { WatchlistItem, Signal } from '../types';
import { MOCK_SIGNALS } from '../mockData';
import { SignalCard } from '../components/SignalCard';
import { isSignalRelatedToWatchlistItem } from '../detailPayload';
import { useApp } from '../AppContext';

interface WatchlistItemDetailViewProps {
  item: WatchlistItem | null;
  onBack: () => void;
  onSignalClick: (signal: Signal) => void;
}

export default function WatchlistItemDetailView({ item, onBack, onSignalClick }: WatchlistItemDetailViewProps) {
  const { showPrototypeToast } = useApp();

  if (!item) return null;

  const relatedSignals = MOCK_SIGNALS.filter(signal => isSignalRelatedToWatchlistItem(signal, item));

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-outline/10 px-4 h-16 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-on-surface hover:bg-surface rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-bold tracking-widest uppercase text-on-surface-variant">Entity Profile</span>
        <button
          onClick={() => showPrototypeToast()}
          className="p-2 -mr-2 text-on-surface hover:bg-surface rounded-full transition-colors"
        >
          <MoreVertical size={20} />
        </button>
      </header>

      <main className="px-6 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-surface border border-outline/5 text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                {item.type}
              </span>
              {item.status && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-success animate-pulse">
                  <Activity size={12} />
                  {item.status}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-on-surface tracking-tight">
              {item.name}
            </h1>
          </div>
          {item.value && (
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-on-surface">{item.value}</div>
              <div className={`flex items-center justify-end gap-1 text-sm font-mono ${item.valueTrend === 'up' ? 'text-success' : 'text-error'}`}>
                {item.valueTrend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                2.4%
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-surface border border-outline/5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-1">Signal Density</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-on-surface">{item.totalMentions}</span>
              <span className="text-xs text-success">+3 today</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-outline/5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-1">Alert Level</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-primary">High</span>
              <Bell size={14} className="text-primary" />
            </div>
          </div>
        </div>

        {item.description && (
          <section className="mb-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">About</h2>
            <p className="text-on-surface-variant leading-relaxed text-sm">
              {item.description}
            </p>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface">Recent Coverage</h2>
            <button
              onClick={() => showPrototypeToast()}
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {relatedSignals.length > 0 ? (
              relatedSignals.map(signal => (
                <SignalCard 
                  key={signal.id} 
                  signal={signal} 
                  onClick={() => onSignalClick(signal)} 
                />
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant/40 italic">
                <Globe size={32} strokeWidth={1} className="mb-2" />
                <p className="text-sm">No recent signals found for this entity</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
