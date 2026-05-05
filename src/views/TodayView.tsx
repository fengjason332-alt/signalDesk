import React, { useState } from 'react';
import { Header } from '../components/Header';
import { SignalCard } from '../components/SignalCard';
import { MOCK_SIGNALS } from '../mockData';
import { Signal, Category } from '../types';
import { useApp } from '../AppContext';
import { Plus } from 'lucide-react';
import { AddTopicModal } from '../components/AddTopicModal';

interface TodayViewProps {
  onSignalClick: (signal: Signal) => void;
  onResultSelect?: (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => void;
}

export default function TodayView({ onSignalClick, onResultSelect }: TodayViewProps) {
  const { settings } = useApp();
  const [activeFilter, setActiveFilter] = useState<Category | 'All'>('All');
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  
  const filters: (Category | 'All')[] = ['All', ...settings.preferredTopics];

  const filteredSignals = MOCK_SIGNALS.filter(signal => {
    // If "All" is active, show signals that match ANY of the user's preferred topics
    if (activeFilter === 'All') {
      return signal.categories.some(cat => settings.preferredTopics.includes(cat));
    }
    // If specific filter is active, show signals matching that filter
    return signal.categories.includes(activeFilter as Category);
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header onResultSelect={onResultSelect} />
      
      <main className="px-6 py-4">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-on-surface">Intelligence Feed</h2>
          <p className="text-on-surface-variant text-sm border-l border-primary/30 pl-3">Your curated strategic signals for today.</p>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar py-2 -mx-6 px-6">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-5 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-all border ${
                activeFilter === filter 
                  ? 'bg-primary text-on-primary border-primary shadow-[0_8px_16px_rgba(0,229,255,0.3)]' 
                  : 'bg-surface text-on-surface-variant border-outline/10 hover:border-outline/30'
              }`}
            >
              {filter}
            </button>
          ))}
          <button 
            onClick={() => setIsAddTopicModalOpen(true)}
            className="px-5 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-all border bg-surface/50 text-primary border-primary/20 hover:border-primary/40 flex items-center gap-2"
          >
            <Plus size={14} />
            Add Topic
          </button>
        </div>

        <div className="space-y-4 pb-20">
          {filteredSignals.length > 0 ? (
            filteredSignals.map(signal => (
              <SignalCard key={signal.id} signal={signal} onClick={onSignalClick} />
            ))
          ) : (
            <div className="py-20 text-center text-on-surface-variant/40 italic flex flex-col items-center justify-center">
              <p>No signals found matching your current filters.</p>
            </div>
          )}
        </div>
      </main>

      <AddTopicModal isOpen={isAddTopicModalOpen} onClose={() => setIsAddTopicModalOpen(false)} />
    </div>
  );
}
