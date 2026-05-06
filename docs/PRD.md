# SignalDesk Product Requirements Document

## Product Summary
SignalDesk is a Chinese-first personal intelligence dashboard for tracking high-signal developments across AI, crypto, stocks, robotics, energy, policy, macro, and geopolitics. It is designed for focused daily scanning, saving, and synthesis without feeling like a trading terminal, chat product, or generic social feed.

## Problem And User Value
- Important developments are scattered across noisy sources and inconsistent formats.
- The target user wants a calm, mobile-first place to monitor a curated set of strategic topics.
- The product must support Chinese-first reading while preserving access to English-source context when that context matters.

## Product Principles
- Preserve the dark dotted-grid, cyan-accent, mobile-first SignalDesk identity.
- Keep the experience calm, premium, and scan-friendly instead of dense or overly operational.
- Stay local-first for reliability and speed.
- Treat personalization and saved state as part of the product, not as a separate utility layer.

## Current Capabilities
- Today feed for high-signal developments
- Topic Radar
- Watchlist
- Research Library
- Bilingual detail reading
- Topic personalization
- Settings
- PWA install support
- Local-first persistence
- Supabase account sync for user state

## Current Shipped Scope
- The current shipped product includes local-first persistence with optional Supabase account sync.
- Product content still comes from mock fixtures in the frontend.
- Supabase is used for account-level user state only:
  - onboarding completion
  - settings
  - selected core domains
  - followed and muted topics
  - saved items
  - watchlist items
  - notes and lightweight feedback state
- If Supabase is not configured or the user is signed out, SignalDesk must continue working in local-only mode.

## Core Requirements
- SignalDesk must remain useful without requiring sign-in.
- Local state should update immediately on device and remain the first source of UX continuity.
- Optional Supabase sync should extend the local-first experience rather than replace it.
- The product should keep content coverage focused on high-signal domains:
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

## Non-Goals
- No live market terminal behavior
- No generic social feed behavior
- No backend content ingestion in the current shipped product
- No repositioning toward defense-monitoring aesthetics
- No requirement that users authenticate before they can use core product flows

## Roadmap Alignment
- Phase 1: stabilization completed
- Phase 1.5: topic personalization completed
- Phase 2: PWA install support completed
- Phase 3: local-first persistence with optional Supabase account sync for user state completed
- Next planned phases remain:
  - Phase 4: data ingestion
  - Phase 5: AI summarization / translation / Ask SignalDesk
