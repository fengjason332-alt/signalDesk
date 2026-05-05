import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, Category } from './types';
import { MOCK_WATCHLIST } from './mockData';
import { readJsonStorage, STORAGE_KEYS, writeJsonStorage } from './storage';
import {
  DEFAULT_CORE_DOMAINS,
  DEFAULT_FOLLOWED_TOPICS,
  DEFAULT_MUTED_TOPICS,
  sanitizeCoreDomains,
  sanitizeFollowedTopics,
  sanitizeMutedTopics,
  uniqueStrings,
} from './topicPreferences';

interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  setCoreDomains: (domains: Category[]) => void;
  addCoreDomains: (domains: Category[]) => void;
  removeCoreDomain: (domain: Category) => void;
  setFollowedTopics: (topics: string[]) => void;
  addFollowedTopics: (topics: string[]) => void;
  removeFollowedTopic: (topic: string) => void;
  toggleFollowedTopic: (topic: string) => void;
  setMutedTopics: (topics: string[]) => void;
  addMutedTopics: (topics: string[]) => void;
  unmuteTopic: (topic: string) => void;
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
    preferredTopics: DEFAULT_CORE_DOMAINS,
    followedTopics: DEFAULT_FOLLOWED_TOPICS,
    mutedTopics: DEFAULT_MUTED_TOPICS,
    criticalAlerts: true,
    darkMode: true,
  };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultSettings;
  }

  const parsed = value as Partial<AppSettings>;
  const preferredTopics = sanitizeCoreDomains(
    sanitizeStringArray(parsed.preferredTopics, defaultSettings.preferredTopics)
  );

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
    followedTopics: sanitizeFollowedTopics(
      sanitizeStringArray(parsed.followedTopics, defaultSettings.followedTopics)
    ),
    mutedTopics: sanitizeMutedTopics(
      sanitizeStringArray(parsed.mutedTopics, defaultSettings.mutedTopics)
    ),
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
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      preferredTopics: newSettings.preferredTopics
        ? sanitizeCoreDomains(newSettings.preferredTopics)
        : prev.preferredTopics,
      followedTopics: newSettings.followedTopics
        ? sanitizeFollowedTopics(newSettings.followedTopics)
        : prev.followedTopics,
      mutedTopics: newSettings.mutedTopics
        ? sanitizeMutedTopics(newSettings.mutedTopics)
        : prev.mutedTopics,
    }));
  };

  const setCoreDomains = (domains: Category[]) => {
    updateSettings({
      preferredTopics: sanitizeCoreDomains(domains).length > 0
        ? sanitizeCoreDomains(domains)
        : DEFAULT_CORE_DOMAINS,
    });
  };

  const addCoreDomains = (domains: Category[]) => {
    setCoreDomains(uniqueStrings([...settings.preferredTopics, ...domains]) as Category[]);
  };

  const removeCoreDomain = (domain: Category) => {
    const nextDomains = settings.preferredTopics.filter(topic => topic !== domain);
    setCoreDomains(nextDomains.length > 0 ? nextDomains : DEFAULT_CORE_DOMAINS);
  };

  const setFollowedTopics = (topics: string[]) => {
    updateSettings({ followedTopics: sanitizeFollowedTopics(topics) });
  };

  const addFollowedTopics = (topics: string[]) => {
    setFollowedTopics([...settings.followedTopics, ...topics]);
  };

  const removeFollowedTopic = (topic: string) => {
    setFollowedTopics(settings.followedTopics.filter(currentTopic => currentTopic !== topic));
  };

  const toggleFollowedTopic = (topic: string) => {
    if (settings.followedTopics.includes(topic)) {
      removeFollowedTopic(topic);
    } else {
      addFollowedTopics([topic]);
    }
  };

  const setMutedTopics = (topics: string[]) => {
    updateSettings({ mutedTopics: sanitizeMutedTopics(topics) });
  };

  const addMutedTopics = (topics: string[]) => {
    setMutedTopics([...settings.mutedTopics, ...topics]);
  };

  const unmuteTopic = (topic: string) => {
    setMutedTopics(settings.mutedTopics.filter(currentTopic => currentTopic !== topic));
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
      setCoreDomains,
      addCoreDomains,
      removeCoreDomain,
      setFollowedTopics,
      addFollowedTopics,
      removeFollowedTopic,
      toggleFollowedTopic,
      setMutedTopics,
      addMutedTopics,
      unmuteTopic,
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
