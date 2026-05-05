import React, { useState } from 'react';
import { Signal } from '../types';
import { Bookmark, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';
import { useApp } from '../AppContext';

interface SignalCardProps {
  signal: Signal;
  onClick: (signal: Signal) => void;
  key?: string | number;
}

export function SignalCard({ signal, onClick }: SignalCardProps) {
  const { savedSignals, toggleSaveSignal } = useApp();
  const [feedback, setFeedback] = useState<'useful' | 'not-useful' | null>(null);
  const isSaved = savedSignals.includes(signal.id);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveSignal(signal.id);
  };

  const handleFeedback = (e: React.MouseEvent, type: 'useful' | 'not-useful') => {
    e.stopPropagation();
    setFeedback(prev => prev === type ? null : type);
  };

  return (
    <div 
      onClick={() => onClick(signal)}
      className="bg-surface rounded-xl border border-outline/20 p-4 mb-4 hover:border-primary/30 transition-all cursor-pointer group active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {signal.categories.map(cat => (
            <span key={cat} className="text-[10px] uppercase font-bold tracking-widest text-[#00e5ff] bg-primary/10 px-2 py-0.5 rounded whitespace-nowrap">
              {cat}
            </span>
          ))}
          <span className="text-[10px] text-on-surface-variant flex items-center gap-1 border border-outline/10 px-1.5 py-0.5 rounded whitespace-nowrap">
             Bilingual
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Zap size={14} fill="currentColor" />
          <span className="text-xs font-bold leading-none">{signal.importance.toFixed(1)} <span className="opacity-40">/ 10</span></span>
        </div>
      </div>

      <h3 className="text-lg font-bold leading-tight mb-1 text-on-surface">
        {signal.titleZh}
      </h3>
      <p className="text-sm italic text-on-surface-variant mb-3 leading-tight opacity-70">
        {signal.titleEn}
      </p>

      <div className="text-[10px] text-on-surface-variant font-medium mb-4 flex items-center gap-2 uppercase tracking-wide">
        {signal.source} · {signal.timestamp}
      </div>

      <div className="bg-surface-high/50 rounded-lg p-3 mb-4 border border-outline/5 transition-colors group-hover:bg-surface-high">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">核心洞察 (Why it matters)</h4>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {signal.summaryZh}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {signal.tags.map(tag => (
            <span key={tag} className="text-[10px] text-on-surface-variant bg-surface-highest px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => handleFeedback(e, 'not-useful')}
            className={`transition-colors ${feedback === 'not-useful' ? 'text-error' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <ThumbsDown size={16} fill={feedback === 'not-useful' ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={(e) => handleFeedback(e, 'useful')}
            className={`transition-colors ${feedback === 'useful' ? 'text-success' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <ThumbsUp size={16} fill={feedback === 'useful' ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={handleToggleSave}
            className={`transition-colors ${isSaved ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
}
