import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppSettings,
  Category,
  PersistedUserStateV2,
  SavedItemTargetType,
} from './types';
import {
  buildTopicPreferenceRecordsForUserInput,
  deriveNotesMap,
  deriveSavedSignalIds,
  deriveSettingsFromPersistedState,
  deriveWatchlistEntityIds,
  hydratePersistedStateV2,
  inferNoteTargetType,
  isOnboardingComplete,
  writePersistedStateV2,
} from './storage';
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
  isSavedItem: (targetType: SavedItemTargetType, targetId: string) => boolean;
  toggleSavedItem: (targetType: SavedItemTargetType, targetId: string) => void;
  watchlist: string[];
  addToWatchlist: (itemIds: string[]) => void;
  removeFromWatchlist: (itemId: string) => void;
  notes: Record<string, string>;
  saveNote: (id: string, text: string) => void;
  isOnboardingComplete: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  prototypeToast: string | null;
  showPrototypeToast: (message?: string) => void;
  clearPrototypeToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_PROTOTYPE_TOAST = 'Prototype only: this action is not wired yet.';

const updateTopicPreferenceSet = (
  state: PersistedUserStateV2,
  preferenceType: 'followed' | 'muted',
  topics: string[],
) => {
  const sanitizedTopics =
    preferenceType === 'followed'
      ? sanitizeFollowedTopics(topics)
      : sanitizeMutedTopics(topics);
  const preservedRecords = state.topic_preferences.filter(
    record => record.preference_type !== preferenceType,
  );

  return [
    ...preservedRecords,
    ...buildTopicPreferenceRecordsForUserInput(sanitizedTopics, preferenceType),
  ];
};

const updateProfileState = (
  state: PersistedUserStateV2,
  updates: Partial<PersistedUserStateV2['profile']>,
): PersistedUserStateV2['profile'] => ({
  ...state.profile,
  ...updates,
  updated_at: new Date().toISOString(),
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persistedState, setPersistedState] = useState<PersistedUserStateV2>(() =>
    hydratePersistedStateV2(),
  );
  const [prototypeToast, setPrototypeToast] = useState<string | null>(null);

  useEffect(() => {
    writePersistedStateV2(persistedState);
  }, [persistedState]);

  const settings = deriveSettingsFromPersistedState(persistedState);
  const savedSignals = deriveSavedSignalIds(persistedState);
  const watchlist = deriveWatchlistEntityIds(persistedState);
  const notes = deriveNotesMap(persistedState);
  const onboardingComplete = isOnboardingComplete(persistedState);
  const isSavedItem = (targetType: SavedItemTargetType, targetId: string) =>
    persistedState.saved_items.some(
      item => item.target_type === targetType && item.target_id === targetId,
    );

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setPersistedState(prev => {
      let nextState = prev;

      if (newSettings.preferredTopics) {
        const nextDomains = sanitizeCoreDomains(newSettings.preferredTopics);
        nextState = {
          ...nextState,
          profile: updateProfileState(nextState, {
            core_domains: nextDomains.length > 0 ? nextDomains : DEFAULT_CORE_DOMAINS,
          }),
        };
      }

      if (newSettings.followedTopics) {
        nextState = {
          ...nextState,
          topic_preferences: updateTopicPreferenceSet(
            nextState,
            'followed',
            newSettings.followedTopics,
          ),
        };
      }

      if (newSettings.mutedTopics) {
        nextState = {
          ...nextState,
          topic_preferences: updateTopicPreferenceSet(
            nextState,
            'muted',
            newSettings.mutedTopics,
          ),
        };
      }

      return {
        ...nextState,
        profile: updateProfileState(nextState, {
          reading_mode: newSettings.readingMode ?? nextState.profile.reading_mode,
          translation_style:
            newSettings.translationStyle ?? nextState.profile.translation_style,
          critical_alerts:
            typeof newSettings.criticalAlerts === 'boolean'
              ? newSettings.criticalAlerts
              : nextState.profile.critical_alerts,
          dark_mode:
            typeof newSettings.darkMode === 'boolean'
              ? newSettings.darkMode
              : nextState.profile.dark_mode,
        }),
      };
    });
  };

  const setCoreDomains = (domains: Category[]) => {
    const sanitizedDomains = sanitizeCoreDomains(domains);
    updateSettings({
      preferredTopics:
        sanitizedDomains.length > 0 ? sanitizedDomains : DEFAULT_CORE_DOMAINS,
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
    setFollowedTopics(
      settings.followedTopics.filter(currentTopic => currentTopic !== topic),
    );
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

  const toggleSavedItem = (targetType: SavedItemTargetType, targetId: string) => {
    setPersistedState(prev => {
      const existingRecord = prev.saved_items.find(
        item => item.target_type === targetType && item.target_id === targetId,
      );

      if (existingRecord) {
        return {
          ...prev,
          saved_items: prev.saved_items.filter(
            item => !(item.target_type === targetType && item.target_id === targetId),
          ),
        };
      }

      const timestamp = new Date().toISOString();
      return {
        ...prev,
        saved_items: [
          ...prev.saved_items,
          {
            target_type: targetType,
            target_id: targetId,
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
      };
    });
  };

  const toggleSaveSignal = (signalId: string) => {
    toggleSavedItem('signal', signalId);
  };

  const addToWatchlist = (itemIds: string[]) => {
    setPersistedState(prev => {
      const existingIds = new Set(prev.watchlist_items.map(item => item.entity_id));
      const nextIds = sanitizeFollowedTopics(itemIds).filter(itemId => !existingIds.has(itemId));
      if (nextIds.length === 0) {
        return prev;
      }

      const timestamp = new Date().toISOString();
      const nextSortOrder = prev.watchlist_items.reduce(
        (highest, item) => Math.max(highest, item.sort_order),
        -1,
      );

      return {
        ...prev,
        watchlist_items: [
          ...prev.watchlist_items,
          ...nextIds.map((entityId, index) => ({
            entity_id: entityId,
            created_at: timestamp,
            updated_at: timestamp,
            sort_order: nextSortOrder + index + 1,
          })),
        ],
      };
    });
  };

  const removeFromWatchlist = (itemId: string) => {
    setPersistedState(prev => ({
      ...prev,
      watchlist_items: prev.watchlist_items.filter(item => item.entity_id !== itemId),
    }));
  };

  const saveNote = (id: string, text: string) => {
    setPersistedState(prev => {
      const targetType = inferNoteTargetType(id);
      const existingRecord = prev.notes.find(
        note => note.target_id === id && note.target_type === targetType,
      );
      const timestamp = new Date().toISOString();

      if (existingRecord) {
        return {
          ...prev,
          notes: prev.notes.map(note =>
            note.target_id === id && note.target_type === targetType
              ? {
                  ...note,
                  body: text,
                  updated_at: timestamp,
                }
              : note,
          ),
        };
      }

      return {
        ...prev,
        notes: [
          ...prev.notes,
          {
            target_type: targetType,
            target_id: id,
            body: text,
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
      };
    });
  };

  const completeOnboarding = () => {
    setPersistedState(prev => ({
      ...prev,
      profile: updateProfileState(prev, {
        onboarding_completed: true,
      }),
    }));
  };

  const resetOnboarding = () => {
    setPersistedState(prev => ({
      ...prev,
      profile: updateProfileState(prev, {
        onboarding_completed: false,
      }),
    }));
  };

  const showPrototypeToast = (message = DEFAULT_PROTOTYPE_TOAST) => {
    setPrototypeToast(message);
  };

  const clearPrototypeToast = () => {
    setPrototypeToast(null);
  };

  return (
    <AppContext.Provider
      value={{
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
        isSavedItem,
        toggleSavedItem,
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        notes,
        saveNote,
        isOnboardingComplete: onboardingComplete,
        completeOnboarding,
        resetOnboarding,
        prototypeToast,
        showPrototypeToast,
        clearPrototypeToast,
      }}
    >
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
