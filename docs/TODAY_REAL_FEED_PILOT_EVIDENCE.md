# Today Real-Feed Pilot Evidence

This document is maintained through Phase 4 Task 36. It prepares the target-environment Today real-feed pilot to be executed consistently and reviewed as evidence, without switching Today to real by default.

Today remains mock by default. No production default switch is made in this task.

## Pilot Objective

- gather bounded evidence about whether Today real-feed mode is safe and useful in a target environment
- confirm that real-feed behavior is understandable without weakening the mock fallback
- confirm that Detail remains honest about preview-only content
- confirm that a future default switch would be an explicit product decision, not an accidental side effect

## Required Environment

Client-side env:
- `VITE_USE_REAL_CONTENT_FEED=true`
- `VITE_SUPABASE_URL=<project url>`
- `VITE_SUPABASE_ANON_KEY=<publishable key>`
- `VITE_USE_REAL_CONTENT_FEED=false` should also be checked later during rollback verification

Local helper command:
- `npm run phase4:today-pilot-check`
- `npm run phase4:create-today-evidence`
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --real-cards-rendered true`
- `npm run phase4:today-evidence-review -- docs/examples/today-real-feed-pilot-evidence.example.json`
- `npm run phase4:today-pilot-report -- docs/evidence/today-real-feed-pilot-evidence.local.json --out docs/evidence/today-real-feed-pilot-report.local.md`
- `npm run phase4:today-help`
- `npm run phase4:create-today-evidence -- --out docs/evidence/today-real-feed-pilot-evidence.private.json`
- The evidence-review command is local-only. It does not call Supabase, does not call AI providers, and does not write content.
- The evidence-update and pilot-report commands are also local-only. They do not call Supabase, do not call AI providers, and do not write app content.
- Local operator evidence should live in `docs/evidence/today-real-feed-pilot-evidence.local.json` or another gitignored local/private JSON path.
- Local operator reports should live in `docs/evidence/today-real-feed-pilot-report.local.md` or another gitignored local/private Markdown path.
- The helper commands now refuse non-gitignored evidence/report paths by default unless `--allow-any-path` is passed intentionally.

Important boundaries:
- no `SUPABASE_SERVICE_ROLE_KEY` in the frontend
- no `DEEPSEEK_API_KEY` in the frontend
- no `PHASE4_WRITE_AUTH_TOKEN` in the frontend
- no frontend AI calls
- no frontend writes
- no frontend content writes

## Baseline Mock Check

1. Set `VITE_USE_REAL_CONTENT_FEED=false`.
2. Run `npm run phase4:today-pilot-check`.
3. Confirm the helper reports `mode: mock_default`.
4. Start the app and confirm Today shows the existing mock feed.
5. Confirm no real-feed-only empty state appears.

## Real-Feed Pilot Check

1. Set:
   - `VITE_USE_REAL_CONTENT_FEED=true`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Run `npm run phase4:today-pilot-check`.
3. Confirm the helper reports:
   - `mode: pilot_ready`
   - `shouldAttemptRealFeedRead: true`
   - note: `pilot_ready` only means the local env keys are present; preview-read policy failures, empty datasets, or wrong-project wiring can still surface later in-browser as `fallback_to_mock` or `real_empty`
4. Open Today and confirm real cards load with the existing style.

## Manual QA Checklist

- Confirm real cards render with the existing style.
- Confirm clicking a real card opens Detail safely.
- Confirm Detail never fabricates a full article body.
- Confirm source provenance and safe source links remain visible.
- Confirm completed and non-empty enriched text wins over deterministic preview text.
- Confirm completed but blank enriched text falls back safely to deterministic preview text.
- Confirm deterministic fallback appears when enrichment is missing, pending, failed, skipped, not requested, or blank.
- Confirm AI/OpenAI filters still match real cards when applicable.
- Confirm nonmatching filters show the normal filter-empty state.
- Confirm `real_empty` is distinguishable from `filter_empty`.
- Confirm a broken preview read falls back safely to mock.
- Confirm Radar, Watchlist, and Library remain unchanged.
- Confirm no secrets or raw internal errors appear in UI.
- Confirm bilingual quality is acceptable.
- Confirm mobile quality is acceptable.
- Confirm data freshness is acceptable.
- Confirm source coverage is acceptable.
- Confirm preview read policies and anon reads are confirmed for the tested environment.

## Rollback Checklist

1. Set `VITE_USE_REAL_CONTENT_FEED=false`.
2. Restart locally with `npm run dev`, or rebuild/redeploy the target environment.
3. Open Today and confirm the mock feed is back.
4. Confirm no Supabase preview read is attempted in mock mode.
5. Confirm Radar, Watchlist, and Library remain unchanged.

## Pass Criteria

- real cards are readable and useful
- Detail opens safely
- no fake full article body appears
- enriched text wins only when completed and non-empty
- deterministic fallback remains useful when enrichment is missing
- fallback to mock remains safe and understandable
- the app stays useful even when real rows are sparse

## What Evidence Should Be Collected

- screenshots or notes showing real-card rendering in Today
- one safe Detail example with provenance visible
- one example where completed enriched text wins
- one example where deterministic fallback is used
- one example of AI/OpenAI filter behavior
- one example of nonmatching filter-empty behavior
- one example of `real_empty` if available
- one example or note proving fallback to mock remains safe
- one note confirming rollback to mock succeeded

## Recommendation Categories

- `blocked`
  - one or more critical checks failed
- `continue_pilot`
  - evidence is incomplete and more target-environment review is needed
- `keep_mock_default`
  - the evidence is valid, but current observations still do not justify a default switch
- `ready_for_controlled_default_rollout`
  - all required checks passed and a later explicit rollout-preparation task can be considered

## Local Review Workflow

Use the fake example JSON files first:

```bash
npm run phase4:today-evidence-review -- docs/examples/today-real-feed-pilot-evidence.example.json
npm run phase4:today-evidence-review -- docs/examples/today-real-feed-pilot-evidence.passing.example.json
npm run phase4:today-evidence-review -- docs/examples/today-real-feed-pilot-evidence.blocked.example.json
```

Then review your own local pilot evidence JSON:

```bash
npm run phase4:today-evidence-review -- <path-to-local-evidence-json>
```

Expected conceptually:
- incomplete example => `continue_pilot`
- blocked example => `blocked`
- passing example => `ready_for_controlled_default_rollout`

Use the beginner-friendly template to start:

```bash
npm run phase4:create-today-evidence
```

That command creates `docs/evidence/today-real-feed-pilot-evidence.local.json` unless it already exists.
It uses `docs/examples/today-real-feed-pilot-evidence.template.json` as the starter template.
You can also pass `--out`, `--output`, `--overwrite`, or `--from-template` for a bounded local-only workflow.

Then fill in the fields in that local file and review it locally:

```bash
npm run phase4:today-evidence-review -- docs/evidence/today-real-feed-pilot-evidence.local.json
```

If you prefer not to hand-edit JSON, update the file incrementally:

```bash
npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --real-cards-rendered true --detail-opened-safely true
```

The updater covers the common pilot fields such as observed feed mode, detail count, env flags checked, sample cards, fallback checks, rollback checks, and final recommendation. Hand-edit the JSON only if you need a rarer field that is still not exposed as a flag.

Generate a local Markdown report after review:

```bash
npm run phase4:today-pilot-report -- docs/evidence/today-real-feed-pilot-evidence.local.json --out docs/evidence/today-real-feed-pilot-report.local.md
```

Do not commit local/private evidence files. Keep real operator notes in gitignored files such as:
- `docs/evidence/*.local.json`
- `docs/evidence/*.private.json`
- `docs/evidence/*.local.md`
- `docs/evidence/*.private.md`

The local evidence file and local report file should not be committed.

Even a passing local report does not switch Today by default. A separate controlled rollout task is still required.

## Template Field Meanings

- `pilot_environment`
  - a short label for where you tested, such as `localhost-preview` or `private-preview`
- `tested_at`
  - when you ran the pilot
- `tester`
  - who ran the test
- `app_url_or_localhost`
  - where the app was opened
- `env_flags_checked`
  - which real-feed flags or rollback flags you actually verified
- `source_count`
  - how many useful real sources appeared in the pilot environment
- `real_card_count`
  - how many real Today cards you actually saw
- `sample_card_ids_or_titles`
  - a few example cards that prove the pilot used real data
- `detail_checked_count`
  - how many real cards you opened and checked in Detail
- `source_links_visible`
  - whether provenance/source links were actually visible
- `no_fake_article_body`
  - whether Detail stayed honest about missing full article body content
- `enriched_summary_cases`
  - short notes describing where enriched text was shown correctly
- `deterministic_fallback_cases`
  - short notes describing where deterministic fallback was shown correctly
- `filter_checks`
  - notes about AI/OpenAI filter and nonmatching filter behavior
- `empty_state_checks`
  - notes about `real_empty`, `filter_empty`, and fallback behavior
- `rollback_checked`
  - whether you really switched back to mock and confirmed it
- `rls_read_policy_confirmed`
  - whether preview-read policies were confirmed for the tested environment
- `mobile_quality_notes`
  - short notes about the phone-sized experience
- `bilingual_quality_notes`
  - short notes about Chinese/English readability
- `blocker_notes`
  - anything serious enough to stop rollout
- `screenshots_or_notes`
  - paths or notes for supporting evidence
- `final_operator_recommendation`
  - the operator's own final recommendation, which may still be reviewed by the local tool

## What Would Justify A Future Default Switch

- multiple stable sources are producing usable recent signals
- real cards are consistently readable and useful
- Detail is safe and honest about preview-only limits
- source provenance is visible
- preview-read policies and anon reads are reliable in the target environment
- AI enrichment is optional and not required for card rendering
- rollback has been tested and remains simple

## What Would Block A Default Switch

- preview-read fallback is unreliable or confusing
- real cards are sparse, stale, or low-value
- Detail appears misleading without a stored full body
- source provenance disappears or becomes unclear
- secrets or raw internals appear in UI
- the pilot would require frontend writes or frontend AI calls
- Radar, Watchlist, or Library become coupled to the Today rollout unexpectedly
