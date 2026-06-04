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
  'sections:',
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

lines.push('next commands:');
for (const command of result.nextCommands) {
  lines.push(`- ${command}`);
}

lines.push('rollback steps:');
for (const step of result.rollbackSteps) {
  lines.push(`- ${step}`);
}

lines.push('pass criteria:');
for (const criterion of result.passCriteria) {
  lines.push(`- ${criterion}`);
}

lines.push('evidence to collect:');
for (const item of result.evidenceToCollect) {
  lines.push(`- ${item}`);
}

lines.push('default-switch blockers:');
for (const blocker of result.blockers) {
  lines.push(`- ${blocker}`);
}

process.stdout.write(`${lines.join('\n')}\n`);
