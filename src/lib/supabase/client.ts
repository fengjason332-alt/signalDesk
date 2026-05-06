import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const normalizeSupabaseEnvValue = (
  value: string | undefined,
): string | undefined => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
};

export const resolveSupabaseClientConfig = ({
  url,
  anonKey,
}: {
  url: string | undefined;
  anonKey: string | undefined;
}) => {
  const normalizedUrl = normalizeSupabaseEnvValue(url);
  const normalizedAnonKey = normalizeSupabaseEnvValue(anonKey);

  return {
    url: normalizedUrl,
    anonKey: normalizedAnonKey,
    isConfigured: Boolean(normalizedUrl && normalizedAnonKey),
  };
};

const supabaseConfig = resolveSupabaseClientConfig({
  url: import.meta.env?.VITE_SUPABASE_URL,
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY,
});

export const isSupabaseConfigured = supabaseConfig.isConfigured;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseConfig.url!, supabaseConfig.anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
