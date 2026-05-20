-- Manual Phase 4 smoke-test seed only.
-- Run this manually after applying:
-- supabase/migrations/202605170001_phase4_content_foundation.sql

insert into public.content_sources (
  id,
  name,
  source_type,
  category_key,
  publisher,
  base_url,
  feed_url,
  reliability_tier,
  active,
  metadata,
  updated_at
)
values
  (
    'rss_openai_blog_ai',
    'OpenAI News',
    'rss',
    'ai',
    'OpenAI',
    'https://openai.com',
    'https://openai.com/news/rss.xml',
    'official',
    true,
    jsonb_build_object(
      'notes', 'Official product and research updates from OpenAI.',
      'seed_set', 'phase4_smoke_subset',
      'manual_only', true
    ),
    now()
  ),
  (
    'rss_yahoo_finance_markets',
    'Yahoo Finance News',
    'rss',
    'stocks',
    'Yahoo Finance',
    'https://finance.yahoo.com',
    'https://finance.yahoo.com/news/rssindex',
    'aggregator',
    true,
    jsonb_build_object(
      'notes', 'Broad markets feed used as the current semiconductor-adjacent smoke source.',
      'seed_set', 'phase4_smoke_subset',
      'manual_only', true
    ),
    now()
  ),
  (
    'rss_coindesk_crypto',
    'CoinDesk',
    'rss',
    'crypto',
    'CoinDesk',
    'https://www.coindesk.com',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'specialist',
    true,
    jsonb_build_object(
      'notes', 'Crypto-native reporting and market structure coverage.',
      'seed_set', 'phase4_smoke_subset',
      'manual_only', true
    ),
    now()
  ),
  (
    'rss_white_house_briefing',
    'The White House Briefing Room',
    'rss',
    'us_policy',
    'The White House',
    'https://www.whitehouse.gov',
    'https://www.whitehouse.gov/briefing-room/feed/',
    'official',
    true,
    jsonb_build_object(
      'notes', 'Official US administration releases and policy announcements.',
      'seed_set', 'phase4_smoke_subset',
      'manual_only', true
    ),
    now()
  )
on conflict (id) do update
set
  name = excluded.name,
  source_type = excluded.source_type,
  category_key = excluded.category_key,
  publisher = excluded.publisher,
  base_url = excluded.base_url,
  feed_url = excluded.feed_url,
  reliability_tier = excluded.reliability_tier,
  active = excluded.active,
  metadata = excluded.metadata,
  updated_at = now();
