import type { CategoryKey } from './types.ts';

export interface CanonicalTopicDefinition {
  id: string;
  categoryKey: CategoryKey;
  name: string;
  aliases: string[];
}

export const CANONICAL_TOPICS: CanonicalTopicDefinition[] = [
  {
    id: 'topic_ai_data_center_power',
    categoryKey: 'ai',
    name: 'AI Data Center Power Demand',
    aliases: ['AI Data Center Power Demand', 'data center power', 'AI power demand'],
  },
  {
    id: 'topic_nuclear_energy',
    categoryKey: 'energy',
    name: 'Nuclear Energy',
    aliases: ['Nuclear Energy', 'nuclear power'],
  },
  {
    id: 'topic_us_chip_export_controls',
    categoryKey: 'us_policy',
    name: 'US Chip Export Controls',
    aliases: ['US Chip Export Controls', 'AI chip export controls', 'chip export controls'],
  },
  {
    id: 'topic_china_ai_policy',
    categoryKey: 'china_policy',
    name: 'China AI Policy',
    aliases: ['China AI Policy', 'Chinese AI policy'],
  },
  {
    id: 'topic_australia_critical_minerals',
    categoryKey: 'australia_policy',
    name: 'Australia Critical Minerals',
    aliases: ['Australia Critical Minerals', 'critical minerals'],
  },
  {
    id: 'topic_bitcoin_etf',
    categoryKey: 'crypto',
    name: 'Bitcoin ETF',
    aliases: ['Bitcoin ETF', 'spot bitcoin etf'],
  },
  {
    id: 'topic_stablecoin_regulation',
    categoryKey: 'crypto',
    name: 'Stablecoin Regulation',
    aliases: ['Stablecoin Regulation', 'stablecoin policy'],
  },
  {
    id: 'topic_humanoid_robotics',
    categoryKey: 'robotics',
    name: 'Humanoid Robotics',
    aliases: ['Humanoid Robotics', 'humanoid robots'],
  },
  {
    id: 'topic_ai_agents',
    categoryKey: 'ai',
    name: 'AI Agents',
    aliases: ['AI Agents', 'agents'],
  },
  {
    id: 'topic_semiconductor_supply_chain',
    categoryKey: 'stocks',
    name: 'Semiconductor Supply Chain',
    aliases: ['Semiconductor Supply Chain', 'chip supply chain'],
  },
  {
    id: 'topic_battery_tech',
    categoryKey: 'energy',
    name: 'Battery Tech',
    aliases: ['Battery Tech', 'battery technology'],
  },
  {
    id: 'topic_nvidia_earnings',
    categoryKey: 'stocks',
    name: 'NVIDIA Earnings',
    aliases: ['NVIDIA Earnings', 'nvidia results'],
  },
  {
    id: 'topic_ai_regulation',
    categoryKey: 'us_policy',
    name: 'AI Regulation',
    aliases: ['AI Regulation', 'AI policy'],
  },
];

const canonicalTopicById = new Map(
  CANONICAL_TOPICS.map(topic => [topic.id, topic] as const),
);

export const getCanonicalTopicById = (topicId: string) =>
  canonicalTopicById.get(topicId) ?? null;
