# SignalDesk Agent Guidance

## Product Purpose
SignalDesk is a mobile-first PWA-style personal intelligence dashboard for tracking high-signal developments across a focused set of strategic domains. It is Chinese-first, but supports bilingual reading for English source material. The product is meant to help a user scan, save, track, and synthesize important developments without feeling like a trading app, chat app, or generic news reader.

## Current Tech Stack
- React 19
- TypeScript
- Vite 6
- Tailwind CSS v4
- `motion` / `motion/react` for transitions
- Local React state plus `AppContext`
- `localStorage` for persisted client-side preferences
- Frontend-only mock-data prototype

## Current Development Phase
- Phase 1: stabilization completed
- Phase 1.5: topic personalization completed
- Current app status: frontend-only, mock-data-backed, locally persisted user preferences
- Next major work is PWA support and persistence, not backend feature expansion by default

## Visual Design Rules
- Preserve the current dark-first SignalDesk look
- Keep the subtle dotted-grid background
- Keep cyan as the primary accent
- Keep rounded dark cards and the mobile-first bottom navigation
- Favor a calm, premium intelligence-reading experience over flashy dashboard chrome
- Do not redesign screens unless fixing a clear usability bug
- Do not make the app look like a trading terminal
- Do not make the app look like a military command center

## Product Rules
- Chinese-first reading experience is a core product constraint
- English source context should remain available where appropriate
- The app should feel like a personal intelligence desk, not a feed of noisy headlines
- Focus on high-signal domains only:
  - AI
  - Crypto
  - Stocks
  - Robotics
  - Energy
  - US Policy
  - China Policy
  - Australia Policy
  - Macro
  - Geopolitics
- Topic personalization should influence the Today feed, Radar, Settings, and future recommendation behavior

## Data And State Rules
- The app currently uses mock data only
- `src/mockData.ts` is the source of truth for prototype content fixtures
- Persisted client state belongs in `localStorage` until a later persistence phase
- Current persisted user state includes:
  - onboarding completion
  - settings
  - selected core domains
  - followed topics
  - muted topics
  - saved signals
  - watchlist ids
  - notes
- Keep signal data normalized around:
  - `categories: string[]`
  - `topics: string[]`
  - `entities: string[]`
  - `tags: string[]`
- Do not reintroduce legacy single-category behavior
- Detail screens should receive normalized detail payloads, not ad hoc partial signal objects

## Do Not Do Without Explicit Approval
- Do not add backend services
- Do not add real APIs or external data ingestion
- Do not add Supabase integration
- Do not add authentication
- Do not redesign the visual system
- Do not replace the current navigation model with a full router unless requested
- Do not remove the mock-data workflow
- Do not introduce a new design system or component library
- Do not make major dependency additions unless clearly necessary
- Do not change product positioning toward trading, chat, or defense-monitoring aesthetics

## Testing Commands
Run these from the repo root:

```bash
node --import tsx --test src/detailPayload.test.ts src/topicPreferences.test.ts
npm run lint
npm run build
```

Add or update focused tests when behavior changes, especially for:
- detail payload mapping
- topic filtering
- localStorage safety
- onboarding persistence

## Commit And PR Expectations
- Keep commits scoped and readable
- Use clear commit messages that describe the behavior change
- Mention any mock-data changes explicitly
- Mention any localStorage schema or persistence changes explicitly
- Before opening a PR, run lint and build and report the results
- PR descriptions should include:
  - what changed
  - why it changed
  - how it was verified
  - screenshots or short notes for visible UI changes
