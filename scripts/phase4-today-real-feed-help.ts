import {
  DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH,
} from '../src/lib/content/todayRealFeedEvidenceStarter';
import {
  DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH,
} from '../src/lib/content/todayRealFeedPilotReport';

const lines = [
  'SignalDesk Today real-feed local operator help',
  '',
  'Commands:',
  '- npm run phase4:create-today-evidence',
  '- npm run phase4:today-pilot-check',
  `- npm run phase4:update-today-evidence -- ${DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH} --real-cards-rendered true`,
  `- npm run phase4:today-evidence-review -- ${DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH}`,
  `- npm run phase4:today-pilot-report -- ${DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH} --out ${DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH}`,
  '',
  'Rollback reminder:',
  '- Set VITE_USE_REAL_CONTENT_FEED=false, then restart or rebuild/redeploy and confirm Today returns to mock.',
  '',
  'Boundaries:',
  '- Local-only helper flow.',
  '- No Supabase call unless the app is running separately during manual QA.',
  '- No AI call.',
  '- No content write.',
  '- No secret values printed.',
  '- Do not commit local evidence or local pilot reports.',
];

process.stdout.write(`${lines.join('\n')}\n`);
