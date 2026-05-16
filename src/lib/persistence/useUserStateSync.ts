import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';

import { createFreshPersistedStateV2 } from '../../storage';
import type { PersistedUserStateV2 } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { mergeUserStates } from './mergeUserState';
import {
  loadRemoteUserState,
  saveRemoteUserState,
} from './supabaseUserStateStore';

export const SYNC_DEBOUNCE_MS = 750;

const logSyncErrorInDev = (error: unknown) => {
  if (!import.meta.env?.DEV) {
    return;
  }

  console.error('[SignalDesk sync] Remote user-state sync failed.', error);
};

interface UserStateSyncAuthSnapshot {
  hasLoadedSession: boolean;
  isConfigured: boolean;
  sessionUserId: string | null;
}

type SyncTimerHandle = ReturnType<typeof setTimeout>;
type UserSaveChain = Promise<void>;

interface UserStateSyncControllerDeps {
  getPersistedState: () => PersistedUserStateV2;
  replacePersistedState: (state: PersistedUserStateV2) => void;
  loadRemoteUserState?: (userId: string) => Promise<PersistedUserStateV2 | null>;
  saveRemoteUserState?: (userId: string, state: PersistedUserStateV2) => Promise<void>;
  scheduleTimeout?: (callback: () => void | Promise<void>, delayMs: number) => unknown;
  clearScheduledTimeout?: (timerId: unknown) => void;
  debounceMs?: number;
  onError?: (error: unknown) => void;
}

interface UserStateSyncController {
  dispose: () => void;
  syncAuthState: (authState: UserStateSyncAuthSnapshot) => Promise<void>;
  syncPersistedState: (state: PersistedUserStateV2) => void;
}

const defaultScheduleTimeout = (
  callback: () => void | Promise<void>,
  delayMs: number,
) => setTimeout(callback, delayMs);

const defaultClearScheduledTimeout = (timerId: unknown) => {
  clearTimeout(timerId as SyncTimerHandle);
};

const buildHydratedState = (args: {
  currentLocalState: PersistedUserStateV2;
  remoteState: PersistedUserStateV2 | null;
  allowLocalMerge: boolean;
}) => {
  if (args.allowLocalMerge) {
    return mergeUserStates(args.currentLocalState, args.remoteState);
  }

  if (!args.remoteState) {
    return createFreshPersistedStateV2();
  }

  return mergeUserStates(createFreshPersistedStateV2(), args.remoteState);
};

export function createUserStateSyncController(
  deps: UserStateSyncControllerDeps,
): UserStateSyncController {
  const scheduleTimeout = deps.scheduleTimeout ?? defaultScheduleTimeout;
  const clearScheduledTimeout =
    deps.clearScheduledTimeout ?? defaultClearScheduledTimeout;
  const runLoadRemoteUserState = deps.loadRemoteUserState ?? loadRemoteUserState;
  const runSaveRemoteUserState = deps.saveRemoteUserState ?? saveRemoteUserState;
  const debounceMs = deps.debounceMs ?? SYNC_DEBOUNCE_MS;
  const reportError = deps.onError ?? (() => {});

  let disposed = false;
  let activeUserId: string | null = null;
  let hasHydratedActiveUser = false;
  let localSnapshotOwnerUserId: string | null = null;
  let localSnapshotVersion = 0;
  let lastRemoteAckedVersion = 0;
  let skipNextPersistedStateSync = false;
  let pendingSaveTimer: unknown = null;
  let pendingSaveState: PersistedUserStateV2 | null = null;
  let pendingSaveVersion = 0;
  let hydrationRunId = 0;
  const saveChainsByUser = new Map<string, UserSaveChain>();

  const hasUnsyncedLocalChanges = () =>
    localSnapshotOwnerUserId !== null &&
    localSnapshotVersion > lastRemoteAckedVersion;

  const cancelPendingSave = () => {
    if (pendingSaveTimer !== null) {
      clearScheduledTimeout(pendingSaveTimer);
      pendingSaveTimer = null;
    }

    pendingSaveState = null;
    pendingSaveVersion = 0;
  };

  const enqueueRemoteSave = (
    userId: string,
    state: PersistedUserStateV2,
    version: number,
  ) => {
    const previousChain = saveChainsByUser.get(userId) ?? Promise.resolve();
    const nextChain = previousChain
      .catch(() => {})
      .then(async () => {
        await runSaveRemoteUserState(userId, state);

        if (localSnapshotOwnerUserId === userId) {
          lastRemoteAckedVersion = Math.max(lastRemoteAckedVersion, version);
        }
      })
      .catch(error => {
        reportError(error);
      });

    const trackedChain = nextChain.finally(() => {
      if (saveChainsByUser.get(userId) === trackedChain) {
        saveChainsByUser.delete(userId);
      }
    });

    saveChainsByUser.set(userId, trackedChain);
    return trackedChain;
  };

  return {
    dispose() {
      disposed = true;
      hydrationRunId += 1;
      activeUserId = null;
      hasHydratedActiveUser = false;
      skipNextPersistedStateSync = false;
      cancelPendingSave();
    },

    async syncAuthState(authState) {
      if (
        !authState.hasLoadedSession ||
        !authState.isConfigured ||
        !authState.sessionUserId
      ) {
        hydrationRunId += 1;
        activeUserId = null;
        hasHydratedActiveUser = false;
        skipNextPersistedStateSync = false;
        cancelPendingSave();
        return;
      }

      if (activeUserId === authState.sessionUserId && hasHydratedActiveUser) {
        return;
      }

      hydrationRunId += 1;
      const nextRunId = hydrationRunId;

      activeUserId = authState.sessionUserId;
      hasHydratedActiveUser = false;
      skipNextPersistedStateSync = false;
      cancelPendingSave();

      if (
        localSnapshotOwnerUserId === authState.sessionUserId &&
        hasUnsyncedLocalChanges()
      ) {
        hasHydratedActiveUser = true;
        await enqueueRemoteSave(
          authState.sessionUserId,
          deps.getPersistedState(),
          localSnapshotVersion,
        );
        return;
      }

      try {
        const remoteState = await runLoadRemoteUserState(authState.sessionUserId);
        if (
          disposed ||
          nextRunId !== hydrationRunId ||
          activeUserId !== authState.sessionUserId
        ) {
          return;
        }

        const allowLocalMerge =
          localSnapshotOwnerUserId === null ||
          localSnapshotOwnerUserId === authState.sessionUserId;
        const mergedState = buildHydratedState({
          currentLocalState: deps.getPersistedState(),
          remoteState,
          allowLocalMerge,
        });

        localSnapshotOwnerUserId = authState.sessionUserId;
        localSnapshotVersion = 0;
        lastRemoteAckedVersion = 0;
        skipNextPersistedStateSync = true;
        deps.replacePersistedState(mergedState);
        hasHydratedActiveUser = true;

        await enqueueRemoteSave(authState.sessionUserId, mergedState, 0);
      } catch (error) {
        if (disposed || nextRunId !== hydrationRunId) {
          return;
        }

        reportError(error);
      }
    },

    syncPersistedState(state) {
      if (skipNextPersistedStateSync) {
        skipNextPersistedStateSync = false;
        return;
      }

      if (!activeUserId || !hasHydratedActiveUser) {
        return;
      }

      localSnapshotVersion += 1;
      pendingSaveState = state;
      pendingSaveVersion = localSnapshotVersion;
      if (pendingSaveTimer !== null) {
        clearScheduledTimeout(pendingSaveTimer);
      }

      pendingSaveTimer = scheduleTimeout(() => {
        const userId = activeUserId;
        const stateToSave = pendingSaveState;
        const versionToSave = pendingSaveVersion;

        pendingSaveTimer = null;
        pendingSaveState = null;
        pendingSaveVersion = 0;

        if (!userId || !stateToSave) {
          return;
        }

        void enqueueRemoteSave(userId, stateToSave, versionToSave);
      }, debounceMs);
    },
  };
}

interface UseUserStateSyncArgs {
  persistedState: PersistedUserStateV2;
  setPersistedState: Dispatch<SetStateAction<PersistedUserStateV2>>;
}

export function useUserStateSync({
  persistedState,
  setPersistedState,
}: UseUserStateSyncArgs) {
  const { session, isConfigured, hasLoadedSession } = useAuth();
  const persistedStateRef = useRef(persistedState);
  const controllerRef = useRef<UserStateSyncController | null>(null);

  persistedStateRef.current = persistedState;

  if (controllerRef.current === null) {
    controllerRef.current = createUserStateSyncController({
      getPersistedState: () => persistedStateRef.current,
      replacePersistedState: nextState => {
        setPersistedState(nextState);
      },
      onError: logSyncErrorInDev,
    });
  }

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) {
      return;
    }

    void controller.syncAuthState({
      hasLoadedSession,
      isConfigured,
      sessionUserId: session?.user.id ?? null,
    });
  }, [hasLoadedSession, isConfigured, session?.user.id]);

  useEffect(() => {
    controllerRef.current?.syncPersistedState(persistedState);
  }, [persistedState]);

  useEffect(() => {
    return () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);
}
