insert into public.canonical_topics (id, category_key, name, aliases)
values
  (
    'topic_ai_data_center_power',
    'ai',
    'AI Data Center Power Demand',
    array['AI Data Center Power Demand', 'data center power', 'AI power demand']::text[]
  ),
  (
    'topic_nuclear_energy',
    'energy',
    'Nuclear Energy',
    array['Nuclear Energy', 'nuclear power']::text[]
  ),
  (
    'topic_us_chip_export_controls',
    'us_policy',
    'US Chip Export Controls',
    array['US Chip Export Controls', 'AI chip export controls', 'chip export controls']::text[]
  ),
  (
    'topic_china_ai_policy',
    'china_policy',
    'China AI Policy',
    array['China AI Policy', 'Chinese AI policy']::text[]
  ),
  (
    'topic_australia_critical_minerals',
    'australia_policy',
    'Australia Critical Minerals',
    array['Australia Critical Minerals', 'critical minerals']::text[]
  ),
  (
    'topic_bitcoin_etf',
    'crypto',
    'Bitcoin ETF',
    array['Bitcoin ETF', 'spot bitcoin etf']::text[]
  ),
  (
    'topic_stablecoin_regulation',
    'crypto',
    'Stablecoin Regulation',
    array['Stablecoin Regulation', 'stablecoin policy']::text[]
  ),
  (
    'topic_humanoid_robotics',
    'robotics',
    'Humanoid Robotics',
    array['Humanoid Robotics', 'humanoid robots']::text[]
  ),
  (
    'topic_ai_agents',
    'ai',
    'AI Agents',
    array['AI Agents', 'agents']::text[]
  ),
  (
    'topic_semiconductor_supply_chain',
    'stocks',
    'Semiconductor Supply Chain',
    array['Semiconductor Supply Chain', 'chip supply chain']::text[]
  ),
  (
    'topic_battery_tech',
    'energy',
    'Battery Tech',
    array['Battery Tech', 'battery technology']::text[]
  ),
  (
    'topic_nvidia_earnings',
    'stocks',
    'NVIDIA Earnings',
    array['NVIDIA Earnings', 'nvidia results']::text[]
  ),
  (
    'topic_ai_regulation',
    'us_policy',
    'AI Regulation',
    array['AI Regulation', 'AI policy']::text[]
  )
on conflict (id) do update
set
  category_key = excluded.category_key,
  name = excluded.name,
  aliases = excluded.aliases,
  is_active = true,
  updated_at = now();
