export const DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH =
  'docs/evidence/today-real-feed-pilot-evidence.local.json';
export const DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH =
  'docs/evidence/today-real-feed-pilot-report.local.md';

export const TODAY_REAL_FEED_EVIDENCE_IGNORE_PATTERNS = [
  'docs/evidence/*.local.json',
  'docs/evidence/*.private.json',
] as const;

export const TODAY_REAL_FEED_REPORT_IGNORE_PATTERNS = [
  'docs/evidence/*.local.md',
  'docs/evidence/*.private.md',
] as const;

export interface TodayRealFeedEvidenceStarterPlan {
  createCommand: string;
  outputPath: string;
  templatePath: string;
  overwrite: boolean;
  reviewCommand: string;
  shouldWrite: boolean;
  nextSteps: string[];
}

export interface BuildTodayRealFeedEvidenceStarterPlanOptions {
  fileAlreadyExists: boolean;
  outputPath?: string;
  templatePath?: string;
  overwrite?: boolean;
}

function normalizeOutputPath(outputPath: string | undefined): string {
  if (typeof outputPath !== 'string' || outputPath.trim().length === 0) {
    return DEFAULT_TODAY_REAL_FEED_EVIDENCE_OUTPUT_PATH;
  }

  return outputPath.trim();
}

export function buildTodayRealFeedEvidenceStarterPlan(
  options: BuildTodayRealFeedEvidenceStarterPlanOptions,
): TodayRealFeedEvidenceStarterPlan {
  const outputPath = normalizeOutputPath(options.outputPath);
  const templatePath =
    typeof options.templatePath === 'string' && options.templatePath.trim().length > 0
      ? options.templatePath.trim()
      : 'docs/examples/today-real-feed-pilot-evidence.template.json';
  const overwrite = options.overwrite === true;
  const shouldWrite = overwrite || !options.fileAlreadyExists;
  const reviewCommand = `npm run phase4:today-evidence-review -- ${outputPath}`;

  return {
    createCommand: 'npm run phase4:create-today-evidence',
    outputPath,
    templatePath,
    overwrite,
    reviewCommand,
    shouldWrite,
    nextSteps: [
      'Set VITE_USE_REAL_CONTENT_FEED=true.',
      'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.',
      'Run npm run phase4:today-pilot-check.',
      'Run npm run dev.',
      'Open Today.',
      `Fill or update the evidence JSON at ${outputPath} while testing.`,
      `Use npm run phase4:update-today-evidence -- ${outputPath} to capture local checks safely.`,
      `Run ${reviewCommand}.`,
      `Generate a local report with npm run phase4:today-pilot-report -- ${outputPath} --out ${DEFAULT_TODAY_REAL_FEED_REPORT_OUTPUT_PATH}.`,
      'Roll back with VITE_USE_REAL_CONTENT_FEED=false.',
    ],
  };
}
