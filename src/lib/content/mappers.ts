import type { Signal } from '../../types';
import type { GeneratedSignalRecord } from './types';

const clampImportance = (overallScore: number) => {
  const boundedScore = Math.max(0, Math.min(100, overallScore));
  return Number((boundedScore / 10).toFixed(1));
};

const fallbackText = (preferred: string, fallback: string) =>
  preferred.trim() || fallback.trim();

export function toDisplaySignalFromGeneratedSignal(
  generatedSignal: GeneratedSignalRecord,
): Signal {
  return {
    id: generatedSignal.id,
    category: generatedSignal.primary_category,
    categories: [...generatedSignal.categories],
    topics: [...(generatedSignal.topic_ids ?? [])],
    entities: [...(generatedSignal.entity_names ?? [])],
    titleZh: fallbackText(generatedSignal.headline_zh, generatedSignal.headline_en),
    titleEn: generatedSignal.headline_en,
    summaryZh: fallbackText(generatedSignal.summary_zh, generatedSignal.summary_en),
    whyItMatters:
      generatedSignal.why_it_matters_en.length > 0
        ? [...generatedSignal.why_it_matters_en]
        : [...generatedSignal.why_it_matters_zh],
    importance: clampImportance(generatedSignal.scores.overall_score),
    source: generatedSignal.primary_source_name,
    timestamp: generatedSignal.published_at,
    tags: [...(generatedSignal.tags ?? [])],
  };
}
