import React, { useEffect, useRef, useState } from 'react';
import { Header } from '../components/Header';
import { SignalCard } from '../components/SignalCard';
import { MOCK_SIGNALS } from '../mockData';
import { getCategoryLabel, Signal, Category } from '../types';
import { useApp } from '../AppContext';
import { Plus } from 'lucide-react';
import { AddTopicModal } from '../components/AddTopicModal';
import { getTodayFilterOptions, getVisibleTodaySignals } from '../topicPreferences';
import {
  getTodayFeedEmptyStateMessage,
  isRealContentFeedEnabled,
  resolveTodayFeedDisabledReason,
  todayRealFeedRolloutMode,
  type RealContentFeedLoaderClient,
  loadTodaySignals,
  REAL_CONTENT_FEED_FALLBACK_MESSAGE,
  type LoadTodaySignalsResult,
} from '../lib/content/realContentFeed';
import { supabase } from '../lib/supabase/client';

interface TodayViewProps {
  onSignalClick: (signal: Signal) => void;
  onResultSelect?: (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => void;
}

export default function TodayView({ onSignalClick, onResultSelect }: TodayViewProps) {
  const { settings, showPrototypeToast } = useApp();
  const disabledFeedReason = resolveTodayFeedDisabledReason(todayRealFeedRolloutMode);
  const [activeFilter, setActiveFilter] = useState<Category | 'All'>('All');
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const prototypeToastRef = useRef(showPrototypeToast);
  const [feedSignals, setFeedSignals] = useState<Signal[]>(
    isRealContentFeedEnabled ? [] : MOCK_SIGNALS,
  );
  const [isLoadingRealFeed, setIsLoadingRealFeed] = useState(isRealContentFeedEnabled);
  const [feedMode, setFeedMode] = useState<'mock' | 'real' | 'fallback_to_mock' | 'real_empty'>(
    isRealContentFeedEnabled ? 'real_empty' : 'mock',
  );
  const [feedReason, setFeedReason] = useState<LoadTodaySignalsResult['feedReason']>(
    isRealContentFeedEnabled ? 'real_zero_rows' : disabledFeedReason,
  );
  const realContentClient = supabase as unknown as RealContentFeedLoaderClient | null;
  
  const filters = getTodayFilterOptions(settings.preferredTopics);
  const filteredSignals = getVisibleTodaySignals(feedSignals, settings, activeFilter);

  useEffect(() => {
    if (activeFilter !== 'All' && !settings.preferredTopics.includes(activeFilter)) {
      setActiveFilter('All');
    }
  }, [activeFilter, settings.preferredTopics]);

  useEffect(() => {
    prototypeToastRef.current = showPrototypeToast;
  }, [showPrototypeToast]);

  useEffect(() => {
    if (!isRealContentFeedEnabled) {
      setFeedSignals(MOCK_SIGNALS);
      setIsLoadingRealFeed(false);
      setFeedMode('mock');
      setFeedReason(disabledFeedReason);
      return;
    }

    let isCancelled = false;
    setIsLoadingRealFeed(true);

    void loadTodaySignals({
      enableRealContentFeed: true,
      client: realContentClient,
      mockSignals: MOCK_SIGNALS,
    })
      .then(result => {
        if (isCancelled) {
          return;
        }

        setFeedSignals(result.signals);
        setIsLoadingRealFeed(false);
        setFeedMode(result.feedMode);
        setFeedReason(result.feedReason);

        if (result.usedFallback) {
          console.warn(
            result.errorMessage ?? '[Phase 4 real content preview] Falling back to mock feed.',
          );
          prototypeToastRef.current(REAL_CONTENT_FEED_FALLBACK_MESSAGE);
        }
      })
      .catch(error => {
        if (isCancelled) {
          return;
        }

        console.warn(
          '[Phase 4 real content preview] Unexpected TodayView load failure, showing mock feed.',
          error,
        );
        setFeedSignals(MOCK_SIGNALS);
        setFeedMode('fallback_to_mock');
        setFeedReason('fallback_read_failed');
        setIsLoadingRealFeed(false);
        prototypeToastRef.current(REAL_CONTENT_FEED_FALLBACK_MESSAGE);
      });

    return () => {
      isCancelled = true;
    };
  }, [disabledFeedReason, realContentClient]);

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
              {filter === 'All' ? filter : getCategoryLabel(filter)}
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
          {isLoadingRealFeed ? (
            <div className="py-20 text-center text-on-surface-variant/40 italic flex flex-col items-center justify-center">
              <p>Loading real-content preview...</p>
            </div>
          ) : filteredSignals.length > 0 ? (
            filteredSignals.map(signal => (
              <SignalCard key={signal.id} signal={signal} onClick={onSignalClick} />
            ))
          ) : (
            <div className="py-20 text-center text-on-surface-variant/40 italic flex flex-col items-center justify-center">
              <p>
                {getTodayFeedEmptyStateMessage({
                  feedMode,
                  feedReason,
                  totalFeedSignals: feedSignals.length,
                  filteredSignalCount: filteredSignals.length,
                })}
              </p>
            </div>
          )}
        </div>
      </main>

      <AddTopicModal
        isOpen={isAddTopicModalOpen}
        onClose={() => setIsAddTopicModalOpen(false)}
        title="Add Topic"
      />
    </div>
  );
}
