import test from 'node:test';
import assert from 'node:assert/strict';

import { createFreshPersistedStateV2 } from './storage';
import {
  createUserStateSyncController,
  SYNC_DEBOUNCE_MS,
} from './lib/persistence/useUserStateSync';
import {
  buildMissingDeleteIds,
  decideInitialSyncAction,
} from './lib/persistence/syncDecisions';
import type { PersistedUserStateV2 } from './types';

const USER_A = '00000000-0000-0000-0000-000000000001';
const USER_B = '00000000-0000-0000-0000-000000000002';

const cloneState = (state: PersistedUserStateV2) =>
  JSON.parse(JSON.stringify(state)) as PersistedUserStateV2;

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

class Deferred<T> {
  promise: Promise<T>;
  resolve!: (value: T | PromiseLike<T>) => void;
  reject!: (reason?: unknown) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

class FakeTimerScheduler {
  private nextId = 1;
  private tasks = new Map<number, { fn: () => void | Promise<void>; ms: number }>();

  setTimeout(fn: () => void | Promise<void>, ms: number) {
    const id = this.nextId++;
    this.tasks.set(id, { fn, ms });
    return id;
  }

  clearTimeout(id: number) {
    this.tasks.delete(id);
  }

  get pendingCount() {
    return this.tasks.size;
  }

  get pendingDelays() {
    return Array.from(this.tasks.values(), task => task.ms);
  }

  async runAll() {
    const tasks = Array.from(this.tasks.values());
    this.tasks.clear();

    for (const task of tasks) {
      await task.fn();
    }
  }
}

function createStateWithSavedSignals(signalIds: string[]) {
  const state = createFreshPersistedStateV2();
  state.saved_items = signalIds.map((signalId, index) => ({
    target_type: 'signal',
    target_id: signalId,
    created_at: `2026-05-06T00:0${index}:00.000Z`,
    updated_at: `2026-05-06T00:0${index}:00.000Z`,
  }));
  return state;
}

function createSyncHarness(options?: {
  localState?: PersistedUserStateV2;
  remoteStatesByUser?: Record<string, PersistedUserStateV2 | null>;
  pauseSaveCalls?: boolean;
  loadFailuresByUser?: Record<string, Error>;
}) {
  const scheduler = new FakeTimerScheduler();
  const localWrites: PersistedUserStateV2[] = [];
  const loadCalls: string[] = [];
  const saveCalls: Array<{ userId: string; state: PersistedUserStateV2 }> = [];
  const remoteStatesByUser = new Map<string, PersistedUserStateV2>();
  const loadFailuresByUser = new Map<string, Error>();
  const pendingSaveDeferreds: Deferred<void>[] = [];
  let currentState = cloneState(options?.localState ?? createFreshPersistedStateV2());
  let pauseSaveCalls = options?.pauseSaveCalls ?? false;
  let activeSaveCount = 0;
  let maxConcurrentSaveCount = 0;
  let controller: ReturnType<typeof createUserStateSyncController>;

  for (const [userId, state] of Object.entries(options?.remoteStatesByUser ?? {})) {
    if (state) {
      remoteStatesByUser.set(userId, cloneState(state));
    }
  }

  for (const [userId, error] of Object.entries(options?.loadFailuresByUser ?? {})) {
    loadFailuresByUser.set(userId, error);
  }

  controller = createUserStateSyncController({
    getPersistedState: () => cloneState(currentState),
    replacePersistedState: nextState => {
      currentState = cloneState(nextState);
      localWrites.push(cloneState(nextState));
      controller.syncPersistedState(currentState);
    },
    loadRemoteUserState: async userId => {
      loadCalls.push(userId);
      const loadFailure = loadFailuresByUser.get(userId);
      if (loadFailure) {
        throw loadFailure;
      }

      const remoteState = remoteStatesByUser.get(userId);
      return remoteState ? cloneState(remoteState) : null;
    },
    saveRemoteUserState: async (userId, state) => {
      const cloned = cloneState(state);
      saveCalls.push({ userId, state: cloned });
      activeSaveCount += 1;
      maxConcurrentSaveCount = Math.max(maxConcurrentSaveCount, activeSaveCount);

      try {
        if (pauseSaveCalls) {
          const deferred = new Deferred<void>();
          pendingSaveDeferreds.push(deferred);
          await deferred.promise;
        }

        remoteStatesByUser.set(userId, cloned);
      } finally {
        activeSaveCount -= 1;
      }
    },
    scheduleTimeout: (callback, delayMs) => scheduler.setTimeout(callback, delayMs),
    clearScheduledTimeout: timerId => scheduler.clearTimeout(timerId as number),
  });

  return {
    controller,
    scheduler,
    loadCalls,
    localWrites,
    saveCalls,
    getCurrentState: () => cloneState(currentState),
    getRemoteState: (userId: string) => {
      const state = remoteStatesByUser.get(userId);
      return state ? cloneState(state) : null;
    },
    get maxConcurrentSaveCount() {
      return maxConcurrentSaveCount;
    },
    setPauseSaveCalls(nextValue: boolean) {
      pauseSaveCalls = nextValue;
    },
    setLoadFailure(userId: string, error: Error) {
      loadFailuresByUser.set(userId, error);
    },
    clearLoadFailure(userId: string) {
      loadFailuresByUser.delete(userId);
    },
    async releaseNextSave() {
      const deferred = pendingSaveDeferreds.shift();
      if (!deferred) {
        throw new Error('No pending save to release');
      }

      deferred.resolve();
      await flushMicrotasks();
    },
    updateLocalState(nextState: PersistedUserStateV2) {
      currentState = cloneState(nextState);
      controller.syncPersistedState(currentState);
    },
  };
}

test('controller merges remote hydration into local state instead of replacing local-only rows', async () => {
  const localState = createFreshPersistedStateV2();
  localState.watchlist_items = [
    {
      entity_id: 'entity_nvda',
      created_at: '2026-05-06T00:00:00.000Z',
      updated_at: '2026-05-06T00:00:00.000Z',
      sort_order: 0,
    },
  ];

  const remoteState = createFreshPersistedStateV2();
  remoteState.saved_items = [
    {
      target_type: 'signal',
      target_id: 's9',
      created_at: '2026-05-06T01:00:00.000Z',
      updated_at: '2026-05-06T01:00:00.000Z',
    },
  ];

  const harness = createSyncHarness({
    localState,
    remoteStatesByUser: {
      [USER_A]: remoteState,
    },
  });

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_A,
  });

  assert.equal(harness.loadCalls.length, 1);
  assert.equal(harness.localWrites.length, 1);
  assert.deepEqual(
    harness.getCurrentState().watchlist_items.map(item => item.entity_id),
    ['entity_nvda'],
  );
  assert.deepEqual(
    harness.getCurrentState().saved_items.map(item => item.target_id),
    ['s9'],
  );
  assert.equal(harness.saveCalls.length, 1);
  assert.deepEqual(
    harness.saveCalls[0].state.saved_items.map(item => item.target_id),
    ['s9'],
  );
  assert.deepEqual(
    harness.saveCalls[0].state.watchlist_items.map(item => item.entity_id),
    ['entity_nvda'],
  );
});

test('controller debounces remote saves and flushes only the latest state snapshot', async () => {
  const harness = createSyncHarness();

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_A,
  });

  const firstUpdate = harness.getCurrentState();
  firstUpdate.saved_items = [
    {
      target_type: 'signal',
      target_id: 's1',
      created_at: '2026-05-06T02:00:00.000Z',
      updated_at: '2026-05-06T02:00:00.000Z',
    },
  ];
  harness.updateLocalState(firstUpdate);

  const secondUpdate = harness.getCurrentState();
  secondUpdate.saved_items = [
    {
      target_type: 'signal',
      target_id: 's2',
      created_at: '2026-05-06T03:00:00.000Z',
      updated_at: '2026-05-06T03:00:00.000Z',
    },
  ];
  harness.updateLocalState(secondUpdate);

  assert.equal(harness.saveCalls.length, 1);
  assert.equal(harness.scheduler.pendingCount, 1);
  assert.deepEqual(harness.scheduler.pendingDelays, [SYNC_DEBOUNCE_MS]);

  await harness.scheduler.runAll();

  assert.equal(harness.saveCalls.length, 2);
  assert.deepEqual(
    harness.saveCalls[1].state.saved_items.map(item => item.target_id),
    ['s2'],
  );
});

test('controller does not merge a prior user-owned local snapshot into a different account', async () => {
  const localState = createStateWithSavedSignals(['local-a1']);
  const remoteStateForA = createStateWithSavedSignals(['remote-a1']);
  const remoteStateForB = createStateWithSavedSignals(['remote-b1']);

  const harness = createSyncHarness({
    localState,
    remoteStatesByUser: {
      [USER_A]: remoteStateForA,
      [USER_B]: remoteStateForB,
    },
  });

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_A,
  });

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: null,
  });

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_B,
  });

  assert.deepEqual(
    harness.getCurrentState().saved_items.map(item => item.target_id),
    ['remote-b1'],
  );
  assert.deepEqual(
    harness.getRemoteState(USER_B)?.saved_items.map(item => item.target_id),
    ['remote-b1'],
  );
});

test('controller serializes remote saves so a newer same-user save cannot overlap an older replace-sync save', async () => {
  const harness = createSyncHarness({ pauseSaveCalls: true });

  const hydrationPromise = harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_A,
  });

  await flushMicrotasks();
  assert.equal(harness.saveCalls.length, 1);
  assert.equal(harness.maxConcurrentSaveCount, 1);

  const nextState = harness.getCurrentState();
  nextState.saved_items = [
    {
      target_type: 'signal',
      target_id: 'latest-only',
      created_at: '2026-05-06T04:00:00.000Z',
      updated_at: '2026-05-06T04:00:00.000Z',
    },
  ];
  harness.updateLocalState(nextState);
  await harness.scheduler.runAll();
  await flushMicrotasks();

  assert.equal(harness.saveCalls.length, 1);
  assert.equal(harness.maxConcurrentSaveCount, 1);

  harness.setPauseSaveCalls(false);
  await harness.releaseNextSave();
  await hydrationPromise;
  await flushMicrotasks();

  assert.equal(harness.saveCalls.length, 2);
  assert.equal(harness.maxConcurrentSaveCount, 1);
  assert.deepEqual(
    harness.getRemoteState(USER_A)?.saved_items.map(item => item.target_id),
    ['latest-only'],
  );
});

test('controller keeps failed initial remote load in local-only mode and does not unlock later blind writes', async () => {
  const harness = createSyncHarness({
    loadFailuresByUser: {
      [USER_A]: new Error('load failed'),
    },
  });

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_A,
  });

  const nextState = harness.getCurrentState();
  nextState.notes = [
    {
      target_type: 'signal',
      target_id: 's1',
      body: 'local note only',
      created_at: '2026-05-06T05:00:00.000Z',
      updated_at: '2026-05-06T05:00:00.000Z',
    },
  ];
  harness.updateLocalState(nextState);
  await harness.scheduler.runAll();

  assert.equal(harness.loadCalls.length, 1);
  assert.equal(harness.saveCalls.length, 0);
  assert.equal(harness.getRemoteState(USER_A), null);
});

test('controller keeps a deleted local row from reappearing after sign-out and same-user re-auth with an unsynced delete', async () => {
  const remoteState = createStateWithSavedSignals(['s1', 's2']);
  const harness = createSyncHarness({
    remoteStatesByUser: {
      [USER_A]: remoteState,
    },
  });

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_A,
  });

  const afterDelete = harness.getCurrentState();
  afterDelete.saved_items = afterDelete.saved_items.filter(item => item.target_id !== 's2');
  harness.updateLocalState(afterDelete);

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: null,
  });
  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_A,
  });
  await flushMicrotasks();

  assert.deepEqual(
    harness.getCurrentState().saved_items.map(item => item.target_id),
    ['s1'],
  );
  assert.deepEqual(
    harness.getRemoteState(USER_A)?.saved_items.map(item => item.target_id),
    ['s1'],
  );
});

test('controller waits for auth session loading before starting remote sync', async () => {
  const harness = createSyncHarness();

  harness.controller.syncPersistedState(harness.getCurrentState());
  await harness.controller.syncAuthState({
    hasLoadedSession: false,
    isConfigured: true,
    sessionUserId: USER_A,
  });

  assert.equal(harness.loadCalls.length, 0);
  assert.equal(harness.saveCalls.length, 0);
  assert.equal(harness.scheduler.pendingCount, 0);
});

test('controller stays safe in local-only mode when Supabase is unavailable or there is no session', async () => {
  const harness = createSyncHarness();

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: false,
    sessionUserId: USER_A,
  });
  harness.controller.syncPersistedState(harness.getCurrentState());
  await harness.scheduler.runAll();

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: null,
  });
  harness.controller.syncPersistedState(harness.getCurrentState());
  await harness.scheduler.runAll();

  assert.equal(harness.loadCalls.length, 0);
  assert.equal(harness.saveCalls.length, 0);
});

test('controller cancels pending debounced saves when the session changes to a different account', async () => {
  const harness = createSyncHarness({
    remoteStatesByUser: {
      [USER_B]: createStateWithSavedSignals(['remote-b1']),
    },
  });

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_A,
  });

  const nextState = harness.getCurrentState();
  nextState.notes = [
    {
      target_type: 'signal',
      target_id: 's1',
      body: 'queued note',
      created_at: '2026-05-06T04:00:00.000Z',
      updated_at: '2026-05-06T04:00:00.000Z',
    },
  ];
  harness.updateLocalState(nextState);

  await harness.controller.syncAuthState({
    hasLoadedSession: true,
    isConfigured: true,
    sessionUserId: USER_B,
  });
  await harness.scheduler.runAll();

  assert.equal(harness.saveCalls.some(call => call.userId === USER_A && call.state.notes.length > 0), false);
  assert.deepEqual(
    harness.getRemoteState(USER_B)?.saved_items.map(item => item.target_id),
    ['remote-b1'],
  );
});

test('decideInitialSyncAction stays local only when neither side has state', () => {
  assert.equal(decideInitialSyncAction(null, null), 'stay_local_only');
});

test('decideInitialSyncAction pushes local state when remote is empty', () => {
  const localState = createFreshPersistedStateV2();

  assert.equal(decideInitialSyncAction(localState, null), 'push_local_to_remote');
});

test('decideInitialSyncAction pulls remote state when local is empty', () => {
  const remoteState = createFreshPersistedStateV2();

  assert.equal(decideInitialSyncAction(null, remoteState), 'pull_remote_to_local');
});

test('decideInitialSyncAction merges when both local and remote state exist', () => {
  const localState = createFreshPersistedStateV2();
  const remoteState = createFreshPersistedStateV2();

  assert.equal(decideInitialSyncAction(localState, remoteState), 'merge_local_and_remote');
});

test('buildMissingDeleteIds returns only remote ids missing from the local key set', () => {
  const deleteIds = buildMissingDeleteIds(
    [
      { id: 'row-1', key: 'signal:s1' },
      { id: 'row-2', key: 'signal:s2' },
      { id: 'row-3', key: 'topic:topic_ai_agents' },
    ],
    new Set(['signal:s1', 'topic:topic_ai_agents']),
  );

  assert.deepEqual(deleteIds, ['row-2']);
});
