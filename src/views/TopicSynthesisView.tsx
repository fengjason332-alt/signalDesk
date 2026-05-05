import React from 'react';
import { ArrowLeft, Share2, TrendingUp, Users, MessageSquare, Zap } from 'lucide-react';
import { Topic, Signal } from '../types';
import { MOCK_SIGNALS } from '../mockData';
import { SignalCard } from '../components/SignalCard';
import { isSignalRelatedToTopic } from '../detailPayload';
import { useApp } from '../AppContext';

interface TopicSynthesisViewProps {
  topic: Topic | null;
  onBack: () => void;
  onSignalClick: (signal: Signal) => void;
}

export default function TopicSynthesisView({ topic, onBack, onSignalClick }: TopicSynthesisViewProps) {
  const { showPrototypeToast } = useApp();

  if (!topic) return null;

  const relatedSignals = MOCK_SIGNALS.filter(signal => isSignalRelatedToTopic(signal, topic));

  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-outline/10 px-4 pb-4 flex items-center justify-between"
        style={{
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          minHeight: 'calc(4rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <button onClick={onBack} className="p-2 -ml-2 text-on-surface hover:bg-surface rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-bold tracking-widest uppercase text-on-surface-variant">Synthesis</span>
        <button
          onClick={() => showPrototypeToast()}
          className="p-2 -mr-2 text-on-surface hover:bg-surface rounded-full transition-colors"
        >
          <Share2 size={20} />
        </button>
      </header>

      <main className="px-6 py-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
            {topic.category}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-success">
            <TrendingUp size={12} />
            {topic.momentum}% Momentum
          </span>
        </div>

        <h1 className="text-3xl font-bold text-on-surface leading-tight mb-6">
          {topic.name}
        </h1>

        <div className="p-5 rounded-2xl bg-surface border border-outline/10 mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
            <Zap size={14} />
            AI Executive Summary
          </h2>
          <p className="text-on-surface-variant leading-relaxed mb-4">
            {topic.explanationZh}
          </p>
          <div className="flex gap-4 pt-4 border-t border-outline/5">
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant/60">Signals</span>
              <span className="font-mono text-lg font-bold text-on-surface">{topic.signalCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant/60">Interest</span>
              <div className="flex items-center gap-1">
                <Users size={14} className="text-on-surface-variant" />
                <span className="font-mono text-lg font-bold text-on-surface">Level 4</span>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            Strategic Implications
          </h2>
          <div className="space-y-4">
            {[
              "Market position disruption likely within 6-12 months.",
              "Regulatory scrutiny expected to intensify in key regions.",
              "Resource allocation shift toward vertical AI integration."
            ].map((impact, i) => (
              <div key={i} className="flex gap-3 items-start group">
                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="text-on-surface-variant text-sm leading-relaxed group-hover:text-on-surface transition-colors">
                  {impact}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-4">
            Underlying Signals
          </h2>
          <div className="space-y-4">
            {relatedSignals.map(signal => (
              <SignalCard 
                key={signal.id} 
                signal={signal} 
                onClick={() => onSignalClick(signal)} 
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
