import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings, Signal, Category, ReadingMode, TranslationStyle } from './types';
import { MOCK_SIGNALS, MOCK_WATCHLIST } from './mockData';

interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  savedSignals: string[];
  toggleSaveSignal: (signalId: string) => void;
  watchlist: string[];
  addToWatchlist: (itemIds: string[]) => void;
  removeFromWatchlist: (itemId: string) => void;
  notes: Record<string, string>;
  saveNote: (id: string, text: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings: AppSettings = {
      readingMode: 'Bilingual',
      translationStyle: 'Professional Analysis',
      preferredTopics: ['AI', 'Energy'],
      followedTopics: ['AI Data Center Power Demand', 'Nuclear Energy'],
      mutedTopics: ['Meme Coins'],
      criticalAlerts: true,
      darkMode: true,
    };
    const saved = localStorage.getItem('signaldesk_settings');
    if (!saved) return defaultSettings;
    
    try {
      const parsed = JSON.parse(saved);
      // Merge saved settings with defaults to ensure new fields are present
      return { ...defaultSettings, ...parsed };
    } catch (e) {
      console.error('Error parsing settings', e);
      return defaultSettings;
    }
  });

  const [savedSignals, setSavedSignals] = useState<string[]>(() => {
    const saved = localStorage.getItem('signaldesk_saved');
    return saved ? JSON.parse(saved) : [];
  });

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('signaldesk_watchlist');
    return saved ? JSON.parse(saved) : MOCK_WATCHLIST.map(w => w.id);
  });

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('signaldesk_notes');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('signaldesk_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('signaldesk_saved', JSON.stringify(savedSignals));
  }, [savedSignals]);

  useEffect(() => {
    localStorage.setItem('signaldesk_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('signaldesk_notes', JSON.stringify(notes));
  }, [notes]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleSaveSignal = (signalId: string) => {
    setSavedSignals(prev => 
      prev.includes(signalId) 
        ? prev.filter(id => id !== signalId)
        : [...prev, signalId]
    );
  };

  const addToWatchlist = (itemIds: string[]) => {
    setWatchlist(prev => Array.from(new Set([...prev, ...itemIds])));
  };

  const removeFromWatchlist = (itemId: string) => {
    setWatchlist(prev => prev.filter(id => id !== itemId));
  };

  const saveNote = (id: string, text: string) => {
    setNotes(prev => ({ ...prev, [id]: text }));
  };

  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      savedSignals,
      toggleSaveSignal,
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      notes,
      saveNote
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
