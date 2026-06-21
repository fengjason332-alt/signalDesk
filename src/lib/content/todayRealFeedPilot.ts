import {
  DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH,
  DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH,
} from './todayRealFeedEvidenceStarter';

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

export const TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS = [
  'Set VITE_USE_REAL_CONTENT_FEED=false.',
  'Restart locally with npm run dev, or rebuild/redeploy the target environment.',
  'Open Today and confirm the mock feed is back.',
  'Confirm no Supabase preview read is attempted in mock mode.',
  'Confirm Radar, Watchlist, and Library remain unchanged.',
] as const;

export const TODAY_REAL_FEED_PILOT_PASS_CRITERIA = [
  'Real cards remain readable and useful.',
  'Detail opens safely and does not fabricate a full article body.',
  'Completed and non-empty enriched text wins over deterministic preview text.',
  'Deterministic fallback stays useful when enrichment is missing, pending, failed, skipped, not requested, or blank.',
  'AI/OpenAI filters still match real cards when applicable.',
  'real_empty remains distinguishable from filter_empty.',
  'Fallback to mock remains safe and understandable.',
] as const;

export const TODAY_REAL_FEED_PILOT_EVIDENCE_TO_COLLECT = [
  'Capture whether Today loaded real cards, real_empty, or fallback_to_mock.',
  'Capture at least one safe Detail view with visible provenance and no fake body content.',
  'Capture one example where completed enriched text is present and wins.',
  'Capture one example where deterministic fallback appears because enrichment is pending, failed, skipped, not requested, or blank.',
  'Capture AI/OpenAI filter behavior and a nonmatching filter-empty state.',
  'Capture the rollback confirmation after returning to mock mode.',
] as const;

export const TODAY_REAL_FEED_PILOT_BLOCKERS = [
  'Preview-read fallback is unreliable or confusing.',
  'Real cards are unreadable, sparse, or obviously prototype-only.',
  'Detail suggests a full article body exists when it does not.',
  'Provenance or safe source links disappear unexpectedly.',
  'The pilot would require frontend secrets, frontend writes, or frontend AI calls.',
  'Radar, Watchlist, or Library behavior changes unexpectedly.',
] as const;

export const TODAY_REAL_FEED_PILOT_NEXT_COMMANDS = [
  'npm run phase4:today-help',
  'npm run phase4:create-today-evidence',
  'npm run phase4:today-pilot-check',
  `npm run phase4:update-today-evidence -- ${DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH}`,
  'npm run dev',
  `npm run phase4:today-evidence-review -- ${DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH}`,
  `npm run phase4:today-evidence-next -- ${DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH}`,
  `npm run phase4:today-pilot-report -- ${DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH} --out ${DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH}`,
] as const;

export const TODAY_REAL_FEED_PILOT_BOUNDARIES = [
  'Local-only helper flow.',
  'No Supabase call unless the app is running separately during manual QA.',
  'No AI call.',
  'No content write.',
  'No secret values printed.',
  'Do not commit local evidence or local pilot reports.',
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
  nextCommands: readonly string[];
  rollbackEnv: {
    VITE_USE_REAL_CONTENT_FEED: 'false';
  };
  warnings: string[];
  checks: readonly string[];
  rollbackSteps: readonly string[];
  passCriteria: readonly string[];
  evidenceToCollect: readonly string[];
  blockers: readonly string[];
  boundaries: readonly string[];
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
      nextCommands: TODAY_REAL_FEED_PILOT_NEXT_COMMANDS,
      rollbackEnv: {
        VITE_USE_REAL_CONTENT_FEED: 'false',
      },
      warnings: [
        'Today remains mock by default until VITE_USE_REAL_CONTENT_FEED=true is explicitly enabled.',
      ],
      checks: TODAY_REAL_FEED_PILOT_CHECKS,
      rollbackSteps: TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS,
      passCriteria: TODAY_REAL_FEED_PILOT_PASS_CRITERIA,
      evidenceToCollect: TODAY_REAL_FEED_PILOT_EVIDENCE_TO_COLLECT,
      blockers: TODAY_REAL_FEED_PILOT_BLOCKERS,
      boundaries: TODAY_REAL_FEED_PILOT_BOUNDARIES,
    };
  }

  if (missingEnvKeys.length > 0) {
    return {
      mode: 'pilot_misconfigured',
      shouldAttemptRealFeedRead: false,
      missingEnvKeys,
      requiredEnvKeys: TODAY_REAL_FEED_REQUIRED_ENV_KEYS,
      nextCommands: TODAY_REAL_FEED_PILOT_NEXT_COMMANDS,
      rollbackEnv: {
        VITE_USE_REAL_CONTENT_FEED: 'false',
      },
      warnings: [
        `Today real-feed is enabled but missing required Supabase env: ${missingEnvKeys.join(', ')}.`,
        'The app should fallback to mock safely until the missing env is restored.',
      ],
      checks: TODAY_REAL_FEED_PILOT_CHECKS,
      rollbackSteps: TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS,
      passCriteria: TODAY_REAL_FEED_PILOT_PASS_CRITERIA,
      evidenceToCollect: TODAY_REAL_FEED_PILOT_EVIDENCE_TO_COLLECT,
      blockers: TODAY_REAL_FEED_PILOT_BLOCKERS,
      boundaries: TODAY_REAL_FEED_PILOT_BOUNDARIES,
    };
  }

  return {
    mode: 'pilot_ready',
    shouldAttemptRealFeedRead: true,
    missingEnvKeys: [],
    requiredEnvKeys: TODAY_REAL_FEED_REQUIRED_ENV_KEYS,
    nextCommands: TODAY_REAL_FEED_PILOT_NEXT_COMMANDS,
    rollbackEnv: {
      VITE_USE_REAL_CONTENT_FEED: 'false',
    },
    warnings: [
      'This preflight only checks local env presence; it does not verify preview-read policies, dataset freshness, or whether the selected Supabase project has preview-safe rows yet.',
      'A browser run can still end in fallback_to_mock or real_empty even when this helper says pilot_ready.',
    ],
    checks: TODAY_REAL_FEED_PILOT_CHECKS,
    rollbackSteps: TODAY_REAL_FEED_PILOT_ROLLBACK_STEPS,
    passCriteria: TODAY_REAL_FEED_PILOT_PASS_CRITERIA,
    evidenceToCollect: TODAY_REAL_FEED_PILOT_EVIDENCE_TO_COLLECT,
    blockers: TODAY_REAL_FEED_PILOT_BLOCKERS,
    boundaries: TODAY_REAL_FEED_PILOT_BOUNDARIES,
  };
}
