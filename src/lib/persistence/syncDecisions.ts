import type { PersistedUserStateV2 } from '../../types';

export type InitialSyncAction =
  | 'push_local_to_remote'
  | 'pull_remote_to_local'
  | 'merge_local_and_remote'
  | 'stay_local_only';

export function decideInitialSyncAction(
  localState: PersistedUserStateV2 | null,
  remoteState: PersistedUserStateV2 | null,
): InitialSyncAction {
  if (!localState && !remoteState) {
    return 'stay_local_only';
  }

  if (localState && !remoteState) {
    return 'push_local_to_remote';
  }

  if (!localState && remoteState) {
    return 'pull_remote_to_local';
  }

  return 'merge_local_and_remote';
}

export function buildMissingDeleteIds(
  remoteRows: Array<{ id: string; key: string }>,
  localKeys: Set<string>,
) {
  return remoteRows
    .filter(row => !localKeys.has(row.key))
    .map(row => row.id);
}
