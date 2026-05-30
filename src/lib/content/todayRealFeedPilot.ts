export const TODAY_REAL_FEED_REQUIRED_ENV_KEYS = [
  'VITE_USE_REAL_CONTENT_FEED',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

export const TODAY_REAL_FEED_PILOT_CHECKS = [
  'Confirm Today stays mock by default when VITE_USE_REAL_CONTENT_FEED=false.',
  'Confirm real cards render with the existing style when VITE_USE_REAL_CONTENT_FEED=true.',
  'Confirm Detail opens safely for real cards and never fabricates a full article body.',
  'Confirm completed and non-empty enriched text wins over deterministic preview text.',
  'Confirm deterministic preview text remains visible when enrichment is pending, failed, skipped, not requested, or blank.',
  'Confirm AI/OpenAI filters still match real cards when applicable.',
  'Confirm real_empty is distinguishable from filter_empty.',
  'Confirm Supabase read failures fallback safely to mock without exposing raw internals.',
] as const;

type TodayRealFeedRequiredEnvKey = (typeof TODAY_REAL_FEED_REQUIRED_ENV_KEYS)[number];

export interface TodayRealFeedPilotEnv {
  VITE_USE_REAL_CONTENT_FEED?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export interface TodayRealFeedPilotCheck {
  mode: 'mock_default' | 'pilot_ready' | 'pilot_misconfigured';
  shouldAttemptRealFeedRead: boolean;
  missingEnvKeys: TodayRealFeedRequiredEnvKey[];
  requiredEnvKeys: readonly TodayRealFeedRequiredEnvKey[];
  rollbackEnv: {
    VITE_USE_REAL_CONTENT_FEED: 'false';
  };
  warnings: string[];
  checks: readonly string[];
}

function hasNonEmptyValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function buildTodayRealFeedPilotCheck(
  env: TodayRealFeedPilotEnv,
): TodayRealFeedPilotCheck {
  const realFeedEnabled = env.VITE_USE_REAL_CONTENT_FEED === 'true';
  const missingEnvKeys = (['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const).filter(
    (key) => !hasNonEmptyValue(env[key]),
  );

  if (!realFeedEnabled) {
    return {
      mode: 'mock_default',
      shouldAttemptRealFeedRead: false,
      missingEnvKeys: [],
      requiredEnvKeys: TODAY_REAL_FEED_REQUIRED_ENV_KEYS,
      rollbackEnv: {
        VITE_USE_REAL_CONTENT_FEED: 'false',
      },
      warnings: [
        'Today remains mock by default until VITE_USE_REAL_CONTENT_FEED=true is explicitly enabled.',
      ],
      checks: TODAY_REAL_FEED_PILOT_CHECKS,
    };
  }

  if (missingEnvKeys.length > 0) {
    return {
      mode: 'pilot_misconfigured',
      shouldAttemptRealFeedRead: false,
      missingEnvKeys,
      requiredEnvKeys: TODAY_REAL_FEED_REQUIRED_ENV_KEYS,
      rollbackEnv: {
        VITE_USE_REAL_CONTENT_FEED: 'false',
      },
      warnings: [
        `Today real-feed is enabled but missing required Supabase env: ${missingEnvKeys.join(', ')}.`,
        'The app should fallback to mock safely until the missing env is restored.',
      ],
      checks: TODAY_REAL_FEED_PILOT_CHECKS,
    };
  }

  return {
    mode: 'pilot_ready',
    shouldAttemptRealFeedRead: true,
    missingEnvKeys: [],
    requiredEnvKeys: TODAY_REAL_FEED_REQUIRED_ENV_KEYS,
    rollbackEnv: {
      VITE_USE_REAL_CONTENT_FEED: 'false',
    },
    warnings: [],
    checks: TODAY_REAL_FEED_PILOT_CHECKS,
  };
}
