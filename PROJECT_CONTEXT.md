# SignalDesk Project Context

SignalDesk is a Chinese-first personal intelligence dashboard for monitoring high-signal developments across a curated set of strategic topics.

## Coverage Areas
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

## Product Character
- Chinese-first interface and reading flow
- Bilingual reading for English-source material
- Personal intelligence dashboard, not a generic news feed
- Calm, premium, mobile-first experience
- local-first product behavior, with optional account sync instead of sync-required usage

## Current Visual Language
- Dark dotted-grid background
- Cyan primary accents
- Rounded dark cards
- Mobile-first bottom navigation

## Current Product Capabilities
- Today feed
- Topic personalization
- Topic Radar
- Watchlist
- Research Library
- Bilingual detail reading
- Settings
- PWA install support
- Local-first persistence
- Supabase account sync for user state

## Current Technical Reality
- PWA-style client experience
- Uses mock data only for product content in the current shipped product
- Persists user state locally first in `localStorage`
- Supports optional Supabase account sync for user state
- Does not yet ingest backend content in the current shipped product

## Important Non-Goals
- It should not look like a trading app
- It should not look like a military terminal
- It should not drift into generic dashboard clutter
- It should not become a live market terminal
- It should not become a generic social feed
- It should not move content ingestion to the backend in the current shipped product
