import {
  buildTodayRealFeedPilotCheck,
  TODAY_REAL_FEED_REQUIRED_ENV_KEYS,
} from '../src/lib/content/todayRealFeedPilot';

const result = buildTodayRealFeedPilotCheck({
  VITE_USE_REAL_CONTENT_FEED: process.env.VITE_USE_REAL_CONTENT_FEED,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
});

const lines = [
  'SignalDesk Today real-feed pilot check',
  `mode: ${result.mode}`,
  `shouldAttemptRealFeedRead: ${result.shouldAttemptRealFeedRead}`,
  `requiredEnvKeys: ${TODAY_REAL_FEED_REQUIRED_ENV_KEYS.join(', ')}`,
  `missingEnvKeys: ${result.missingEnvKeys.length > 0 ? result.missingEnvKeys.join(', ') : '(none)'}`,
  `rollback: VITE_USE_REAL_CONTENT_FEED=${result.rollbackEnv.VITE_USE_REAL_CONTENT_FEED}`,
];

if (result.warnings.length > 0) {
  lines.push('warnings:');
  for (const warning of result.warnings) {
    lines.push(`- ${warning}`);
  }
}

lines.push('manual checks:');
for (const check of result.checks) {
  lines.push(`- ${check}`);
}

process.stdout.write(`${lines.join('\n')}\n`);
