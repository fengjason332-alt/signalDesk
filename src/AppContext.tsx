import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, Category } from './types';
import { CORE_DOMAINS, MOCK_WATCHLIST } from './mockData';
import { readJsonStorage, STORAGE_KEYS, writeJsonStorage } from './storage';

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
  prototypeToast: string | null;
  showPrototypeToast: (message?: string) => void;
  clearPrototypeToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_PROTOTYPE_TOAST = 'Prototype only: this action is not wired yet.';
const VALID_CATEGORIES = new Set<Category>(CORE_DOMAINS);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const sanitizeStringArray = (value: unknown, fallback: string[]) =>
  isStringArray(value) ? value : fallback;

const sanitizeNotes = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, noteValue]) => typeof noteValue === 'string')
  );
};

const sanitizeSettings = (value: unknown): AppSettings => {
  const defaultSettings: AppSettings = {
    readingMode: 'Bilingual',
    translationStyle: 'Professional Analysis',
    preferredTopics: ['AI', 'Energy'],
    followedTopics: ['AI Data Center Power Demand', 'Nuclear Energy'],
    mutedTopics: ['Meme Coins'],
    criticalAlerts: true,
    darkMode: true,
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultSettings;
  }

  const parsed = value as Partial<AppSettings>;
  const preferredTopics = sanitizeStringArray(parsed.preferredTopics, defaultSettings.preferredTopics)
    .filter((topic): topic is Category => VALID_CATEGORIES.has(topic as Category));

  return {
    readingMode:
      parsed.readingMode === 'Chinese Only' ||
      parsed.readingMode === 'Bilingual' ||
      parsed.readingMode === 'Original'
        ? parsed.readingMode
        : defaultSettings.readingMode,
    translationStyle:
      parsed.translationStyle === 'Professional Analysis' ||
      parsed.translationStyle === 'Simple Chinese' ||
      parsed.translationStyle === 'Accurate Translation' ||
      parsed.translationStyle === 'Student-Friendly Explanation'
        ? parsed.translationStyle
        : defaultSettings.translationStyle,
    preferredTopics: preferredTopics.length > 0 ? preferredTopics : defaultSettings.preferredTopics,
    followedTopics: sanitizeStringArray(parsed.followedTopics, defaultSettings.followedTopics),
    mutedTopics: sanitizeStringArray(parsed.mutedTopics, defaultSettings.mutedTopics),
    criticalAlerts:
      typeof parsed.criticalAlerts === 'boolean'
        ? parsed.criticalAlerts
        : defaultSettings.criticalAlerts,
    darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : defaultSettings.darkMode,
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() =>
    sanitizeSettings(readJsonStorage(STORAGE_KEYS.settings, null))
  );

  const [savedSignals, setSavedSignals] = useState<string[]>(() =>
    sanitizeStringArray(readJsonStorage(STORAGE_KEYS.savedSignals, []), [])
  );

  const [watchlist, setWatchlist] = useState<string[]>(() =>
    sanitizeStringArray(
      readJsonStorage(STORAGE_KEYS.watchlist, MOCK_WATCHLIST.map(item => item.id)),
      MOCK_WATCHLIST.map(item => item.id)
    )
  );

  const [notes, setNotes] = useState<Record<string, string>>(() =>
    sanitizeNotes(readJsonStorage(STORAGE_KEYS.notes, {}))
  );
  const [prototypeToast, setPrototypeToast] = useState<string | null>(null);

  useEffect(() => {
    writeJsonStorage(STORAGE_KEYS.settings, settings);
  }, [settings]);

  useEffect(() => {
    writeJsonStorage(STORAGE_KEYS.savedSignals, savedSignals);
  }, [savedSignals]);

  useEffect(() => {
    writeJsonStorage(STORAGE_KEYS.watchlist, watchlist);
  }, [watchlist]);

  useEffect(() => {
    writeJsonStorage(STORAGE_KEYS.notes, notes);
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

  const showPrototypeToast = (message = DEFAULT_PROTOTYPE_TOAST) => {
    setPrototypeToast(message);
  };

  const clearPrototypeToast = () => {
    setPrototypeToast(null);
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
      saveNote,
      prototypeToast,
      showPrototypeToast,
      clearPrototypeToast
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
