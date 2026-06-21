import { basename, relative, resolve } from 'node:path';

const KEY_VALUE_SECRET_PATTERN =
  /\b([A-Za-z0-9_]*(?:key|token|secret)[A-Za-z0-9_]*)\b\s*[:=]\s*([^\s,;]+)/gi;
const AUTHORIZATION_HEADER_PATTERN =
  /\bAuthorization\b\s*:\s*(Bearer|Basic)\s+([^\s,;]+)/gi;
const FRONTEND_SUPABASE_VALUE_PATTERN =
  /\b(VITE_SUPABASE_(?:URL|ANON_KEY))\b\s*[:=]\s*([^\s,;]+)/g;
const LOCAL_ABSOLUTE_PATH_PATTERN =
  /(^|[\s(])((?:\/Users\/|\/private\/|\/tmp\/|\/var\/|[A-Za-z]:[\\/])(?:[^\s)"',;]+))/g;
const SUPABASE_URL_PATTERN = /https:\/\/[^\s)"']*supabase[^\s)"']*/gi;
const GENERIC_URL_PATTERN = /https?:\/\/[^\s)"']+/gi;
const REPO_DOCS_EVIDENCE_DIR = resolve(process.cwd(), 'docs/evidence');
const REPO_DOCS_EXAMPLES_DIR = resolve(process.cwd(), 'docs/examples');

function isWithinDirectory(basePath: string, candidatePath: string): boolean {
  const relativePath = relative(basePath, candidatePath).replace(/\\/g, '/');

  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith('../') && relativePath !== '..')
  );
}

export function isTodayPilotRepoEvidencePath(value: string): boolean {
  return isWithinDirectory(REPO_DOCS_EVIDENCE_DIR, resolve(process.cwd(), value));
}

export function isTodayPilotRepoExamplePath(value: string): boolean {
  const resolvedPath = resolve(process.cwd(), value);
  const filename = basename(resolvedPath);

  return (
    isWithinDirectory(REPO_DOCS_EXAMPLES_DIR, resolvedPath) &&
    filename.startsWith('today-real-feed-pilot-evidence') &&
    filename.endsWith('.json')
  );
}

export function sanitizeTodayPilotDisplayText(value: string): string {
  return value
    .replace(KEY_VALUE_SECRET_PATTERN, (_, keyName: string) => `${keyName}=[redacted]`)
    .replace(
      AUTHORIZATION_HEADER_PATTERN,
      (_, scheme: string) => `Authorization: ${scheme} [redacted]`,
    )
    .replace(
      FRONTEND_SUPABASE_VALUE_PATTERN,
      (_, keyName: string) => `${keyName}=[redacted]`,
    )
    .replace(LOCAL_ABSOLUTE_PATH_PATTERN, (_, prefix: string) => {
      return `${prefix}[redacted-local-path]`;
    })
    .replace(SUPABASE_URL_PATTERN, '[redacted-supabase-url]')
    .replace(GENERIC_URL_PATTERN, '[redacted-url]');
}

export function sanitizeTodayPilotDisplayLines(values: string[]): string[] {
  return values.map((value) => sanitizeTodayPilotDisplayText(value));
}

export function sanitizeTodayPilotDisplayPath(value: string): string {
  const resolvedPath = resolve(process.cwd(), value);

  if (
    isTodayPilotRepoEvidencePath(value) ||
    isTodayPilotRepoExamplePath(value)
  ) {
    return sanitizeTodayPilotDisplayText(
      relative(process.cwd(), resolvedPath).replace(/\\/g, '/'),
    );
  }

  return '<path-to-local-evidence-json>';
}
