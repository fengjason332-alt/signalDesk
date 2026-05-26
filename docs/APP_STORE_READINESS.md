# SignalDesk App Store Readiness

## 1. Current State

- SignalDesk is currently a React/Vite PWA-style app.
- Today and Detail can preview real content behind feature flags.
- Radar, Watchlist, and Library still have mock or incomplete real-data integration.
- non-AI RSS ingestion may become scheduled before any AI enrichment scheduling is approved.
- AI enrichment is server-side only through Supabase Edge Functions.
- AI enrichment remains manual-only in Phase 4.
- No frontend AI keys or service-role keys exist.

## 2. Recommended Future Route

- Use Capacitor later to package the existing React/Vite app into an iOS app.
- Do not use a simple remote WebView shell.
- The native shell should load bundled app assets.
- Keep Supabase and DeepSeek secrets server-side.
- Treat packaging as a later delivery step after product completeness, not as the way to make the product App Store-ready.

## 3. App Store Review Risks

- Pure web wrapper risk:
  Apple review can reject apps that mainly feel like repackaged websites rather than complete app experiences.
- Too much mock/demo content risk:
  SignalDesk should not ship a reviewer-visible build where core tabs still look obviously placeholder-driven.
- News aggregation and provenance risk:
  real content needs visible source transparency, safe outbound links, and honest preview language.
- AI-generated summary transparency risk:
  if AI summaries or translations are shown later, the app should clearly distinguish them from raw source text.
- Privacy disclosure requirements:
  Supabase-backed user state, analytics, and any later AI provider transfer all need accurate App Privacy disclosures.
- Paid digital access risk:
  if paid digital access or subscriptions are introduced later, evaluate Apple In-App Purchase requirements before submission.

## 4. Product Readiness Checklist Before App Store Submission

- Today real feed is stable enough to be the default launch experience.
- Detail is stable on mobile-sized screens.
- Watchlist supports real saved signals.
- Library supports saved history or another clearly useful real-content workflow.
- Radar is either real, clearly labeled beta, or hidden from the launch build.
- Settings includes privacy, data source, and about sections.
- Source links and provenance are visible.
- Empty states are polished.
- No fake article bodies are shown.
- No obvious placeholder-only screens remain in the reviewer-visible build.

## 5. Technical Readiness Checklist

- Capacitor is initialized in a future branch only.
- iOS safe-area support is reviewed.
- App icon and launch screen assets exist.
- Native share sheet support is added for signal detail.
- Optional local cache or offline fallback is planned.
- Optional push notification plan exists, but it is not required initially.
- App versioning, build signing, and release workflow are documented.
- App Store Connect metadata and screenshots are prepared.
- Privacy nutrition labels are prepared.

## 6. Security Checklist

- `DEEPSEEK_API_KEY` must never be bundled in the frontend or iOS app.
- `SUPABASE_SERVICE_ROLE_KEY` must never be bundled in the frontend or iOS app.
- `PHASE4_WRITE_AUTH_TOKEN` must never be bundled in the frontend or iOS app.
- Only the publishable / anon Supabase key can be bundled.
- All AI writes remain server-side.
- No frontend write path should exist for content enrichment.

## 7. Proposed Phase 5 Tasks

- Phase 5A: Capacitor proof-of-build only.
- Phase 5B: mobile polish, safe-area handling, and native share support.
- Phase 5C: Watchlist and Library real saved-item functionality.
- Phase 5D: privacy, about, and source-transparency screens.
- Phase 5E: TestFlight build.
- Phase 5F: App Store submission package.

## 8. Explicit Non-Goals For Now

- Do not add Capacitor in Phase 4.
- Do not add `ios/` yet.
- Do not change runtime behavior for native packaging yet.
- Do not switch default Today yet.
- Do not switch Radar yet.
- Do not add paid subscription / In-App Purchase yet.
- Do not add push notification support yet.

## Notes

- This document is planning-only for a future Phase 5 path.
- It is compatible with Phase 4 continuing to harden non-AI ingestion before any AI automation work.
- It does not approve native runtime work in Phase 4.
- It does not change current web deployment behavior.
- Current Apple reference points worth checking before real implementation:
  - [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
  - [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
  - [App Review Overview](https://developer.apple.com/app-store/review/)
