export const STORAGE_KEYS = {
  settings: 'signaldesk_settings',
  savedSignals: 'signaldesk_saved',
  watchlist: 'signaldesk_watchlist',
  notes: 'signaldesk_notes',
  onboardingComplete: 'signaldesk_onboarding_complete',
} as const;

const getStorage = (): Storage | null => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
};

export function readJsonStorage<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) {
    return fallback;
  }

  const rawValue = storage.getItem(key);
  if (rawValue === null) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures in the prototype shell.
  }
}

export function readBooleanStorage(key: string, fallback: boolean) {
  const storage = getStorage();
  if (!storage) {
    return fallback;
  }

  const rawValue = storage.getItem(key);
  if (rawValue === null) {
    return fallback;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return typeof parsed === 'boolean' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeBooleanStorage(key: string, value: boolean) {
  writeJsonStorage(key, value);
}

export function removeStorageKey(key: string) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage delete failures in the prototype shell.
  }
}
