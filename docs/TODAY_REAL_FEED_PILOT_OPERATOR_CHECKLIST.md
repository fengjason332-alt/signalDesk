# Today Real-Feed Pilot Operator Checklist

This document is maintained through Phase 4 Task 45.

It is the operator-facing checklist for a real human Today pilot pass. It does not switch Today to real-feed by default. Today still remains mock-by-default.

## Safety First

- Do not commit local/private evidence files.
- Do not commit local/private pilot report files.
- Do not upload or share secrets.
- Do not paste `VITE_SUPABASE_ANON_KEY`, service-role keys, DeepSeek keys, or write tokens into screenshots or notes.
- Do not change Radar, Watchlist, or Library during this pilot.
- Do not turn this into a default-rollout task yet.

## Before You Start

You will use:
- `npm run phase4:today-pilot-check`
- `npm run phase4:create-today-evidence`
- optional: `npm run phase4:create-today-evidence -- --out docs/evidence/today-real-feed-pilot-evidence.private.json`
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset real-cards-rendered`
- `npm run phase4:today-evidence-review -- docs/evidence/today-real-feed-pilot-evidence.local.json`
- `npm run phase4:today-evidence-next -- docs/evidence/today-real-feed-pilot-evidence.local.json`
- `npm run phase4:today-evidence-status -- docs/evidence/today-real-feed-pilot-evidence.local.json`
- `npm run phase4:today-pilot-report -- docs/evidence/today-real-feed-pilot-evidence.local.json --out docs/evidence/today-real-feed-pilot-report.local.md`
- `npm run phase4:today-help`
- `npm run dev`

Your local evidence file should live at:
- `docs/evidence/today-real-feed-pilot-evidence.local.json`

Create/update only accept gitignored `docs/evidence/*.local.*` or `docs/evidence/*.private.*` paths by default.

Review/next/status/report also accept the shipped `docs/examples/today-real-feed-pilot-evidence*.json` files for local practice.

Use `--allow-any-path` only when you intentionally need to bypass those local-only guards.

If you already have a local evidence file, start with review, not create.
Start from mock mode before the real-feed pass.

## 1. Baseline mock confirmation

What to do:
- Set `VITE_USE_REAL_CONTENT_FEED=false`.
- Run `npm run phase4:today-pilot-check`.

What to observe:
- The helper should report `mode: mock_default`.

What evidence field to update:
- Add one `reviewerNotes` note only if the baseline was surprising.

Exact command:
- `npm run phase4:today-pilot-check`

What screenshot/note to collect:
- Optional terminal note confirming `mock_default`.

What counts as pass:
- Mock mode is active and Today is still expected to stay mock-by-default.

What counts as fail:
- The helper shows a real-feed mode or an unexpected warning before real-feed is enabled.

## 2. Real-feed env confirmation

What to do:
- Set `VITE_USE_REAL_CONTENT_FEED=true`.
- Set `VITE_SUPABASE_URL`.
- Set `VITE_SUPABASE_ANON_KEY`.
- Rerun `npm run phase4:today-pilot-check`.

What to observe:
- The helper should report `mode: pilot_ready`.

What evidence field to update:
- `envFlagsChecked`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --env-flag "VITE_USE_REAL_CONTENT_FEED=true"`

What screenshot/note to collect:
- One safe note confirming the env flags were present.

What counts as pass:
- `pilot_ready` is reported and no secret values are printed.

What counts as fail:
- Missing env keys, broken local wiring, preview-read policy failures or wrong-project wiring, or secret leakage in terminal output.

## 3. Today real-card render check

What to do:
- Start the app with `npm run dev`.
- Open Today with real-feed enabled.

What to observe:
- Real cards render with the existing style.

What evidence field to update:
- `observedFeedMode`
- `realCardsRendered`
- `realCardsObservedCount`
- optional `sampleCardIdsOrTitles`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset real-cards-rendered --sample-card "Add one sampled real card title here."`

What screenshot/note to collect:
- One Today screenshot showing real cards.

What counts as pass:
- At least one real card renders and looks readable.

What counts as fail:
- Today crashes, shows broken layout, or never leaves a safe fallback/mock state when real rows should exist.

## 4. Detail page safety check

What to do:
- Open one real card into Detail.

What to observe:
- Detail opens safely.
- No fake full article body appears.

What evidence field to update:
- `detailCheckedCount`
- `detailOpenedSafely`
- `fakeFullArticleBodyAbsent`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset detail-safe`

What screenshot/note to collect:
- One Detail screenshot or operator note.

What counts as pass:
- Detail opens and stays preview-safe.

What counts as fail:
- Detail crashes, shows fake full-body text, or shows unsafe broken placeholders.

## 5. Source/provenance check

What to do:
- Inspect the opened real Detail card for provenance or source links.

What to observe:
- Source/provenance is visible when available.

What evidence field to update:
- `provenanceOrSourceLinksVisible`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset provenance-visible`

What screenshot/note to collect:
- One cropped provenance/source screenshot.

What counts as pass:
- Source provenance stays visible and understandable.

What counts as fail:
- No provenance appears when it should, or the source area looks broken.

## 6. Enrichment behavior check

What to do:
- Find one completed non-empty enrichment case if available.
- Find one incomplete or blank fallback case if available.

What to observe:
- Completed non-empty enriched text wins.
- Pending/failed/skipped/not-requested/blank enrichment falls back safely.

What evidence field to update:
- `completedNonEmptyEnrichedContentObserved`
- `completedNonEmptyEnrichedContentWon`
- `completedBlankEnrichedContentFallbackWorked`
- `incompleteEnrichmentDeterministicFallbackWorked`
- `enrichedSummaryCases`
- `deterministicFallbackCases`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset enriched-non-empty-wins --enriched-case "Describe the enriched-content win"`
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset blank-enrichment-fallback --deterministic-fallback-case "Describe the blank fallback case"`
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --incomplete-enrichment-fallback true --deterministic-fallback-case "Describe the incomplete fallback case"`

What screenshot/note to collect:
- One note naming the sampled cards and what won or fell back.

What counts as pass:
- Enriched text is only preferred when completed and non-empty.

What counts as fail:
- Blank or incomplete enrichment displaces useful deterministic preview text.

## 7. Filter behavior check

What to do:
- Run the AI/OpenAI filter when matching real cards are available.
- Run one clearly nonmatching filter.

What to observe:
- AI/OpenAI matches real cards when applicable.
- Nonmatching filters show the normal filter-empty state.

What evidence field to update:
- `aiOrOpenAiFilterMatchedWhenApplicable`
- `nonMatchingFiltersShowedNormalFilterEmptyState`
- `filterChecks`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset filter-ai-openai-works --preset filter-empty-works --filter-check "Describe the matching and nonmatching filter behavior"`

What screenshot/note to collect:
- One screenshot or note for the filter result.

What counts as pass:
- Matching filters work and nonmatching filters still look normal.

What counts as fail:
- Filter chips break, hide matching cards, or show the wrong empty-state treatment.

## 8. real_empty check

What to do:
- If you can reach a genuine real-empty state, capture it.

What to observe:
- `real_empty` stays distinct from `filter_empty`.

What evidence field to update:
- `realEmptyDistinctFromFilterEmpty`
- `emptyStateChecks`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset real-empty-observed --empty-state-check "Describe why this was genuine real_empty"`

What screenshot/note to collect:
- One screenshot proving this is real-empty rather than filter-empty.

What counts as pass:
- The state is clearly understandable and distinct from filter-empty.
- Earlier successful real-card evidence still remains intact if this was a later pass in the same local file.

What counts as fail:
- The state looks like a crash, a filter issue, or a misconfigured fallback without explanation.

## 9. Mobile quality check

What to do:
- Check Today and Detail on a narrow/mobile viewport.

What to observe:
- Cards, chips, provenance, and fallback text remain readable.

What evidence field to update:
- `mobileQualityAcceptable`
- `mobileQualityNotes`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset mobile-acceptable --mobile-note "Describe the tested viewport/device"`

What screenshot/note to collect:
- One mobile-width screenshot or note.

What counts as pass:
- Mobile quality is acceptable.

What counts as fail:
- Layout overlap, clipped provenance, unreadable copy, or broken chips.

## 10. Freshness check

What to do:
- Inspect publish dates or recency cues for the cards you observed.

What to observe:
- The feed feels acceptably fresh for the pilot environment.

What evidence field to update:
- `dataFreshnessAcceptable`
- `freshnessNotes`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset freshness-acceptable --freshness-note "Describe the recency evidence"`

What screenshot/note to collect:
- One note with the recency reasoning.

What counts as pass:
- Publish dates or freshness cues look reasonable.

What counts as fail:
- Cards feel stale or freshness cannot be judged safely.

## 11. Source coverage check

What to do:
- Inspect the source mix of the real cards you saw.

What to observe:
- The source mix feels broad enough for the pilot.

What evidence field to update:
- `sourceCount`
- `sourceCoverageAcceptable`
- `sourceCoverageNotes`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset source-coverage-acceptable --source-count 3 --source-coverage-note "Describe the stable source mix"`

What screenshot/note to collect:
- One note with the sampled source mix.

What counts as pass:
- Source coverage looks broad enough for a controlled pilot.

What counts as fail:
- Cards all come from an overly narrow or unstable source slice.

## 12. Rollback-to-mock check

What to do:
- Set `VITE_USE_REAL_CONTENT_FEED=false`.
- Restart or rebuild/redeploy as needed.

What to observe:
- Today returns to mock.

What evidence field to update:
- `rollbackToMockVerified`

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset rollback-tested`

What screenshot/note to collect:
- One rollback note or safe terminal note.

What counts as pass:
- Mock returns cleanly.

What counts as fail:
- Real-feed remains active or rollback behavior is confusing.

## 13. Evidence update commands

What to do:
- Update the local evidence JSON only.
- Prefer one missing bucket at a time instead of trying to fill everything at once.

What to observe:
- Presets and explicit notes update only local evidence.

What evidence field to update:
- Whatever the current missing bucket requires.

Exact command:
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset real-cards-rendered --dry-run`
- `npm run phase4:update-today-evidence -- docs/evidence/today-real-feed-pilot-evidence.local.json --preset detail-safe`

What screenshot/note to collect:
- Optional note about which preset you used.

What counts as pass:
- The updater changes only the intended local evidence file.

What counts as fail:
- The updater tries to call Supabase, AI, or write anything outside the local evidence JSON.

## 14. Evidence review command

What to do:
- Review the current local evidence file.
- If review stays `continue_pilot`, follow the first `must collect before rollout` bucket only.

What to observe:
- The review, next-step helper, and status dashboard all agree on the current gaps.

What evidence field to update:
- No direct field update here; this step tells you what to update next.

Exact command:
- `npm run phase4:today-evidence-review -- docs/evidence/today-real-feed-pilot-evidence.local.json`
- `npm run phase4:today-evidence-next -- docs/evidence/today-real-feed-pilot-evidence.local.json`
- `npm run phase4:today-evidence-status -- docs/evidence/today-real-feed-pilot-evidence.local.json`

What screenshot/note to collect:
- Terminal output from review or status if helpful.

What counts as pass:
- The current recommendation is clear and the next commands are clear.

What counts as fail:
- The evidence state is contradictory, blocked, or unclear to the operator.

## 15. Sanitized report command

What to do:
- Generate a local-only sanitized Markdown report.

What to observe:
- The report summarizes the current recommendation and keeps secret-looking values redacted.

What evidence field to update:
- None. This is a local report step, not an evidence-field step.

Exact command:
- `npm run phase4:today-pilot-report -- docs/evidence/today-real-feed-pilot-evidence.local.json --out docs/evidence/today-real-feed-pilot-report.local.md`

What screenshot/note to collect:
- Optional report excerpt for local handoff only.

What counts as pass:
- The report is generated locally and stays sanitized.

What counts as fail:
- Secret-looking values or local/private paths leak into the report.

## Exact Field Mapping For The Current Missing Evidence

- genuine `real_empty`
  - `realEmptyDistinctFromFilterEmpty=true`
  - add one `emptyStateChecks` note
- completed non-empty enriched-content win
  - `completedNonEmptyEnrichedContentObserved=true`
  - `completedNonEmptyEnrichedContentWon=true`
  - add one `enrichedSummaryCases` note
- completed-but-blank enrichment fallback
  - `completedBlankEnrichedContentFallbackWorked=true`
  - add one `deterministicFallbackCases` note
- mobile quality
  - `mobileQualityAcceptable=true`
  - add one `mobileQualityNotes` note
- freshness
  - `dataFreshnessAcceptable=true`
  - add one `freshnessNotes` note
- source coverage
  - `sourceCoverageAcceptable=true`
  - update `sourceCount`
  - add one `sourceCoverageNotes` note

## What To Check In The App

- Today real cards render with the existing style.
- Detail is safe.
- Source/provenance area is visible.
- Safe source links render when available.
- No fake full article body appears.
- Completed enriched text wins only when non-empty.
- Deterministic fallback still works when enrichment is incomplete.
- AI/OpenAI filter still matches the expected real cards.
- Nonmatching filters show the normal empty state.
- `real_empty` is different from `filter_empty`.
- Broken preview reads fall back safely to mock.
- No secrets or raw internal errors appear in UI.
- Radar, Watchlist, and Library remain unchanged.

## What Screenshots Or Notes Should I Collect

- Today showing real cards
- one Detail page for a real card
- the source/provenance area
- filter behavior
- empty state if available
- the terminal output from the evidence-review command
- short notes about mobile quality
- short notes about bilingual quality

## Privacy Reminder

- Do not upload or share secrets.
- Do not include publishable keys, service-role keys, DeepSeek keys, or write tokens in screenshots.
- Do not commit your local/private evidence files.
- Do not commit your local/private pilot report files either.

## Rollback Reminder

If anything looks unsafe or confusing:
1. Set `VITE_USE_REAL_CONTENT_FEED=false`
2. Restart locally with `npm run dev`, or rebuild/redeploy
3. Open Today
4. Confirm the mock feed is back
