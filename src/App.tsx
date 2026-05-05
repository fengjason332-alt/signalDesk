import React, { useState } from 'react';
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
import { AppProvider } from './AppContext';

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
  const [currentView, setCurrentView] = useState<ViewType>('onboarding');
  const [navigationStack, setNavigationStack] = useState<ViewType[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedWatchItem, setSelectedWatchItem] = useState<WatchlistItem | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

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

  const navigateToSignal = (signal: Signal) => {
    setSelectedSignal(signal);
    navigateTo('detail');
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
    setCurrentView('loading');
    setTimeout(() => {
      setCurrentView('today');
    }, 2000);
  };

  const handleSearchResultSelect = (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => {
    if (type === 'signal' || type === 'library') {
      // Library items are mapped to signals in the view, 
      // but for direct search results we might need to handle them
      navigateToSignal(item);
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
        return <LibraryView onSignalClick={navigateToSignal} onResultSelect={handleSearchResultSelect} />;
      case 'settings':
        return <SettingsView onPreviewState={(state) => setCurrentView(state)} onResultSelect={handleSearchResultSelect} />;
      case 'detail':
        return <DetailView signal={selectedSignal} onBack={goBack} />;
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
    <AppProvider>
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

        {showNav && (
          <BottomNav 
            activeTab={currentView as any} 
            onTabChange={(view) => setCurrentView(view as any)} 
          />
        )}
      </div>
    </AppProvider>
  );
}
