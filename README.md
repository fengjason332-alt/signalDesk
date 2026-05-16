# SignalDesk

SignalDesk is a Chinese-first, mobile-first intelligence dashboard for tracking high-signal developments across AI, crypto, stocks, robotics, energy, macro, geopolitics, and policy domains.

The current product is intentionally:
- dark, dotted-grid, cyan-accent, and card-based
- local-first for user state
- optionally synced to Supabase when configured and signed in
- still powered by mock/demo content for the Today feed and related intelligence cards

## Current State

Completed phases:
- Phase 1: frontend shell and navigation
- Phase 1.5: topic personalization
- Phase 2: PWA install support
- Phase 3: local-first persistence with optional Supabase user-state sync
- Phase 4 Task 0: content-model foundation types, additive mapper utilities, and a Supabase content-schema draft

Not yet implemented:
- RSS ingestion
- paid market or policy APIs
- AI-generated summaries or translations
- real-content Today feed wiring

## Tech Stack

- React 19
- TypeScript
- Vite 6
- Tailwind CSS v4
- Supabase Auth + Postgres for optional user-state sync

## Local Development

Prerequisites:
- Node.js 20+

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

## Environment Variables

Current client-safe env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Notes:
- If these are missing, SignalDesk still works in local-only mode.
- Do not commit `.env` or secrets.
- Future Phase 4 server-side ingestion and AI steps will require server-only secrets, not client env vars.

See [.env.example](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/.env.example) for the current shape.

## Verification Commands

Run from the repo root:

```bash
node --import tsx --test src/detailPayload.test.ts src/topicPreferences.test.ts src/persistenceV2.test.ts src/supabaseSchema.test.ts src/supabaseUserState.test.ts
npm run lint
npm run build
```

## Product Constraints

- Preserve the current dark dotted-grid SignalDesk visual style
- Preserve local-first user-state behavior
- Preserve working Supabase user-state sync
- Do not move mock news content into Supabase unless the current phase explicitly requires it
- Do not expose ingestion or AI secrets to the client
- Do not redesign the UI unless the task explicitly calls for it

## Where To Read Next

Start with:
- [AGENTS.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/AGENTS.md)
- [PROJECT_CONTEXT.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/PROJECT_CONTEXT.md)
- [ROADMAP.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/ROADMAP.md)
- [docs/PRD.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PRD.md)
- [docs/PHASE3_CHANGES_SUMMARY.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE3_CHANGES_SUMMARY.md)
- [docs/PHASE_4_PLAN.md](/Users/jasonfeng/Desktop/project3_signalDESK/signaldesk/docs/PHASE_4_PLAN.md)
