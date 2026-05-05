import React, { useEffect, useState } from 'react';
import { 
  TodayView, 
  RadarView, 
  WatchlistView, 
  LibraryView, 
  SettingsView, 
  DetailView, 
  OnboardingView,
  LoadingState,
  EmptyState
} from './views';
import TopicSynthesisView from './views/TopicSynthesisView';
import WatchlistItemDetailView from './views/WatchlistItemDetailView';
import { BottomNav } from './components/BottomNav';
import { Signal, WatchlistItem, Topic } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useApp } from './AppContext';
import { DetailPayload, toDetailPayloadFromLibraryItem, toDetailPayloadFromSignal } from './detailPayload';
import { readBooleanStorage, removeStorageKey, STORAGE_KEYS, writeBooleanStorage } from './storage';

export type ViewType = 
  | 'today' 
  | 'radar' 
  | 'watchlist' 
  | 'library' 
  | 'settings' 
  | 'detail' 
  | 'onboarding' 
  | 'loading' 
  | 'empty'
  | 'topic-synthesis'
  | 'watchlist-detail';

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

function AppShell() {
  const [currentView, setCurrentView] = useState<ViewType>(() =>
    readBooleanStorage(STORAGE_KEYS.onboardingComplete, false) ? 'today' : 'onboarding'
  );
  const [navigationStack, setNavigationStack] = useState<ViewType[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<DetailPayload | null>(null);
  const [selectedWatchItem, setSelectedWatchItem] = useState<WatchlistItem | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const { prototypeToast, clearPrototypeToast } = useApp();

  useEffect(() => {
    if (!prototypeToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearPrototypeToast();
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [prototypeToast, clearPrototypeToast]);

  const navigateTo = (view: ViewType) => {
    setNavigationStack(prev => [...prev, currentView]);
    setCurrentView(view);
  };

  const goBack = () => {
    if (navigationStack.length > 0) {
      const prev = navigationStack[navigationStack.length - 1];
      setNavigationStack(prev => prev.slice(0, -1));
      setCurrentView(prev);
    } else {
      setCurrentView('today');
    }
  };

  const openDetail = (detail: DetailPayload) => {
    setSelectedDetail(detail);
    navigateTo('detail');
  };

  const navigateToSignal = (signal: Signal) => {
    openDetail(toDetailPayloadFromSignal(signal));
  };

  const navigateToTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    navigateTo('topic-synthesis');
  };

  const navigateToWatchItem = (item: WatchlistItem) => {
    setSelectedWatchItem(item);
    navigateTo('watchlist-detail');
  };

  const handleOnboardingComplete = () => {
    writeBooleanStorage(STORAGE_KEYS.onboardingComplete, true);
    setCurrentView('loading');
    setTimeout(() => {
      setCurrentView('today');
    }, 2000);
  };

  const handleResetOnboarding = () => {
    removeStorageKey(STORAGE_KEYS.onboardingComplete);
    setNavigationStack([]);
    setSelectedDetail(null);
    setSelectedTopic(null);
    setSelectedWatchItem(null);
    setCurrentView('onboarding');
  };

  const handleSearchResultSelect = (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => {
    if (type === 'signal') {
      openDetail(toDetailPayloadFromSignal(item));
    } else if (type === 'library') {
      openDetail(toDetailPayloadFromLibraryItem(item));
    } else if (type === 'topic') {
      navigateToTopic(item);
    } else if (type === 'watchlist') {
      navigateToWatchItem(item);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'onboarding':
        return <OnboardingView onComplete={handleOnboardingComplete} />;
      case 'loading':
        return <LoadingState />;
      case 'today':
        return <TodayView onSignalClick={navigateToSignal} onResultSelect={handleSearchResultSelect} />;
      case 'radar':
        return <RadarView onTopicClick={navigateToTopic} onResultSelect={handleSearchResultSelect} />;
      case 'watchlist':
        return <WatchlistView onSelectItem={navigateToWatchItem} onResultSelect={handleSearchResultSelect} />;
      case 'library':
        return <LibraryView onOpenDetail={openDetail} onResultSelect={handleSearchResultSelect} />;
      case 'settings':
        return (
          <SettingsView
            onPreviewState={(state) => setCurrentView(state)}
            onResultSelect={handleSearchResultSelect}
            onResetOnboarding={handleResetOnboarding}
          />
        );
      case 'detail':
        return <DetailView detail={selectedDetail} onBack={goBack} />;
      case 'topic-synthesis':
        return <TopicSynthesisView topic={selectedTopic} onBack={goBack} onSignalClick={navigateToSignal} />;
      case 'watchlist-detail':
        return <WatchlistItemDetailView item={selectedWatchItem} onBack={goBack} onSignalClick={navigateToSignal} />;
      case 'empty':
        return <EmptyState onReset={() => setCurrentView('today')} />;
      default:
        return <TodayView onSignalClick={navigateToSignal} onResultSelect={handleSearchResultSelect} />;
    }
  };

  const showNav = !['onboarding', 'loading', 'detail', 'topic-synthesis', 'watchlist-detail'].includes(currentView);

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative shadow-2xl bg-background border-x border-outline/10">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 pb-24"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {prototypeToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-28 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-primary/20 bg-surface/95 px-4 py-3 text-sm text-on-surface shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-md"
          >
            {prototypeToast}
          </motion.div>
        )}
      </AnimatePresence>

      {showNav && (
        <BottomNav 
          activeTab={currentView as any} 
          onTabChange={(view) => setCurrentView(view as any)} 
        />
      )}
    </div>
  );
}
