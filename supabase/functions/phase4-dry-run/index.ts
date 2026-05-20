// @ts-ignore Supabase Edge Functions resolves Deno npm specifiers during bundling.
import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  createPhase4DryRunHandler,
  createPhase4IngestionHandler,
} from '../_shared/phase4DryRun.ts';
import { createSupabaseContentStore } from '../_shared/supabaseContentStore.ts';

export {
  createPhase4DryRunHandler,
  createPhase4IngestionHandler,
} from '../_shared/phase4DryRun.ts';

const denoGlobal = globalThis as typeof globalThis & {
  Deno?: {
    env?: {
      get: (key: string) => string | undefined;
    };
    serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  };
};

const getServerEnv = (key: string) => denoGlobal.Deno?.env?.get(key)?.trim() || undefined;

const isEnabled = (key: string) => getServerEnv(key) === 'true';

export function createConfiguredPhase4Handler() {
  const supabaseUrl = getServerEnv('SUPABASE_URL');
  const serviceRoleKey = getServerEnv('SUPABASE_SERVICE_ROLE_KEY');
  const allowWrites = isEnabled('PHASE4_ENABLE_CONTENT_WRITES');
  const allowLiveFetch = isEnabled('PHASE4_ENABLE_LIVE_FETCH');
  const writeAuthToken = getServerEnv('PHASE4_WRITE_AUTH_TOKEN');
  const canCreateStore = Boolean(supabaseUrl && serviceRoleKey);

  const contentStore =
    canCreateStore
      ? createSupabaseContentStore(createClient(supabaseUrl!, serviceRoleKey!))
      : null;

  return createPhase4IngestionHandler({
    allowLiveFetch,
    allowWrites: allowWrites && Boolean(contentStore),
    writeAuthToken: writeAuthToken ?? null,
    contentStore,
  });
}

export const handler = createConfiguredPhase4Handler();

if (denoGlobal.Deno?.serve) {
  denoGlobal.Deno.serve(handler);
}
