const KEY_VALUE_SECRET_PATTERN =
  /\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET)[A-Z0-9_]*)\b\s*[:=]\s*([^\s,;]+)/g;
const FRONTEND_SUPABASE_VALUE_PATTERN =
  /\b(VITE_SUPABASE_(?:URL|ANON_KEY))\b\s*[:=]\s*([^\s,;]+)/g;
const SUPABASE_URL_PATTERN = /https:\/\/[^\s)"']*supabase[^\s)"']*/gi;

export function sanitizeTodayPilotDisplayText(value: string): string {
  return value
    .replace(KEY_VALUE_SECRET_PATTERN, (_, keyName: string) => `${keyName}=[redacted]`)
    .replace(
      FRONTEND_SUPABASE_VALUE_PATTERN,
      (_, keyName: string) => `${keyName}=[redacted]`,
    )
    .replace(SUPABASE_URL_PATTERN, '[redacted-supabase-url]');
}

export function sanitizeTodayPilotDisplayLines(values: string[]): string[] {
  return values.map((value) => sanitizeTodayPilotDisplayText(value));
}
