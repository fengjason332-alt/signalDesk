import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { CANONICAL_TOPICS } from './topicRegistry';

const migrationsDir = resolve(process.cwd(), 'supabase/migrations');
const canonicalTopicsSeedMigrationPattern = /^\d+_seed_canonical_topics\.sql$/;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();
const toSqlStringLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;

const getLatestCanonicalTopicsSeedMigrationPath = () => {
  const matchingFiles = readdirSync(migrationsDir)
    .filter(fileName => canonicalTopicsSeedMigrationPattern.test(fileName))
    .sort();

  assert.ok(
    matchingFiles.length > 0,
    'expected at least one canonical topics seed migration in supabase/migrations',
  );

  return resolve(migrationsDir, matchingFiles.at(-1)!);
};

const extractSeededTopicIds = (sql: string) => {
  const seededTopicIds = new Set<string>();

  for (const match of sql.matchAll(/\(\s*'((?:''|[^'])+)'\s*,\s*'((?:''|[^'])+)'\s*,/gi)) {
    seededTopicIds.add(match[1].replace(/''/g, "'"));
  }

  return seededTopicIds;
};

test('latest canonical topics seed migration uses the expected idempotent upsert shape', () => {
  const sql = normalizeWhitespace(readFileSync(getLatestCanonicalTopicsSeedMigrationPath(), 'utf8'));

  assert.match(
    sql,
    /insert into public\.canonical_topics \(id, category_key, name, aliases\) values/i,
  );
  assert.match(sql, /on conflict \(id\) do update set/i);
  assert.match(sql, /category_key = excluded\.category_key/i);
  assert.match(sql, /name = excluded\.name/i);
  assert.match(sql, /aliases = excluded\.aliases/i);
  assert.match(sql, /is_active = true/i);
  assert.match(sql, /updated_at = now\(\)/i);
});

test('latest canonical topics seed migration stays aligned with the current V2 topic registry ids', () => {
  const sql = normalizeWhitespace(readFileSync(getLatestCanonicalTopicsSeedMigrationPath(), 'utf8'));
  const seededTopicIds = extractSeededTopicIds(sql);
  const registryTopicIds = new Set(CANONICAL_TOPICS.map(topic => topic.id));

  assert.deepEqual(seededTopicIds, registryTopicIds);
});

test('latest canonical topics seed migration preserves each registry topic payload', () => {
  const sql = normalizeWhitespace(readFileSync(getLatestCanonicalTopicsSeedMigrationPath(), 'utf8'));

  for (const topic of CANONICAL_TOPICS) {
    const aliasList = topic.aliases
      .map(toSqlStringLiteral)
      .join(', ');

    const rowPattern = new RegExp(
      `\\(\\s*${escapeRegExp(toSqlStringLiteral(topic.id))},\\s*${escapeRegExp(
        toSqlStringLiteral(topic.categoryKey),
      )},\\s*${escapeRegExp(toSqlStringLiteral(topic.name))},\\s*array\\[${escapeRegExp(
        aliasList,
      )}\\]::text\\[\\]\\s*\\)`,
      'i',
    );

    assert.match(sql, rowPattern, `missing seed row for ${topic.id} (${topic.name})`);
  }
});
