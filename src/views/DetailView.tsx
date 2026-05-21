import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bookmark, ChevronDown, Share2, Globe, FileText, Languages, CheckCircle2, ExternalLink, Zap } from 'lucide-react';
import { getCategoryLabel, ReadingMode, TranslationStyle } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { DetailPayload } from '../detailPayload';

interface DetailViewProps {
  detail: DetailPayload | null;
  onBack: () => void;
}

const TRANSLATION_STYLES: TranslationStyle[] = [
  'Professional Analysis',
  'Simple Chinese',
  'Accurate Translation',
  'Student-Friendly Explanation'
];

export function getRealContentSummarySupportMessage(
  detail: Pick<
    DetailPayload,
    'previewMode' | 'usesEnrichedSummary' | 'summaryStatus' | 'enrichmentStatus'
  >,
) {
  if (detail.previewMode !== 'real_content' || detail.usesEnrichedSummary) {
    return null;
  }

  const effectiveStatus =
    detail.summaryStatus && detail.summaryStatus !== 'not_requested'
      ? detail.summaryStatus
      : detail.enrichmentStatus ?? detail.summaryStatus ?? 'not_requested';

  switch (effectiveStatus) {
    case 'pending':
      return 'Enrichment pending. Showing the available preview summary for now.';
    case 'failed':
      return 'Enrichment failed. Showing the available preview summary for now.';
    case 'skipped':
      return 'Enrichment skipped. Showing the available preview summary for now.';
    case 'completed':
      return 'Enrichment completed without a richer summary. Showing the available preview summary for now.';
    case 'not_requested':
    default:
      return 'Enrichment not generated yet. Showing the available preview summary for now.';
  }
}

export default function DetailView({ detail, onBack }: DetailViewProps) {
  const {
    settings,
    updateSettings,
    isSavedItem,
    toggleSavedItem,
    notes,
    saveNote,
    showPrototypeToast,
  } = useApp();
  const [localNote, setLocalNote] = useState('');
  const [isNoteSaved, setIsNoteSaved] = useState(false);
  const [showStyles, setShowStyles] = useState(false);

  useEffect(() => {
    if (detail) {
      setLocalNote(notes[detail.id] || '');
    }
  }, [detail, notes]);

  if (!detail) return null;

  const saveTargetType = detail.kind === 'signal' ? 'signal' : 'library_item';
  const isSaved = isSavedItem(saveTargetType, detail.id);
  const provenanceSourceCount =
    detail.previewMode === 'real_content'
      ? Math.max(detail.provenanceSourceCount ?? 0, detail.provenanceSources?.length ?? 0)
      : detail.provenanceSources?.length ?? 0;
  const realContentSummarySupportMessage = getRealContentSummarySupportMessage(detail);

  const handleSaveNote = () => {
    saveNote(detail.id, localNote);
    setIsNoteSaved(true);
    setTimeout(() => setIsNoteSaved(false), 2000);
  };

  const readingMode = settings.readingMode;

  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      {/* Detail Header */}
      <header
        className="flex items-center justify-between px-4 pb-4 sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-outline/10"
        style={{
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          minHeight: 'calc(4rem + env(safe-area-inset-top, 0px))',
        }}
      >
        <button onClick={onBack} className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="font-display font-bold text-sm tracking-tight text-on-surface">SignalDetail</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              toggleSavedItem(saveTargetType, detail.id);
            }}
            className={`p-2 transition-colors ${isSaved ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => showPrototypeToast()}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <Share2 size={20} />
          </button>
        </div>
      </header>

      <div className="px-4 py-8 max-w-2xl mx-auto space-y-8">
        {/* Intro */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            {detail.categories.map(cat => (
              <span key={cat} className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded whitespace-nowrap">
                {getCategoryLabel(cat as any)}
              </span>
            ))}
            {detail.libraryMeta && (
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#ffae00] bg-[#ffae00]/10 px-2 py-0.5 rounded whitespace-nowrap">
                {detail.libraryMeta.title}
              </span>
            )}
            <span className="text-[10px] text-on-surface-variant tracking-wide font-medium whitespace-nowrap">
              {detail.source.toUpperCase()} · {detail.timestamp.toUpperCase()}
            </span>
            {detail.previewMode === 'real_content' && provenanceSourceCount > 1 && (
              <span className="text-[10px] text-on-surface-variant tracking-wide font-medium whitespace-nowrap">
                {provenanceSourceCount} SOURCES
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-on-surface leading-tight">
            {detail.titleZh}
          </h1>
          {detail.titleEn && (
            <p className="text-sm italic text-on-surface-variant opacity-70">
              {detail.titleEn}
            </p>
          )}
        </section>

        {/* Quick Summary Card */}
        <div className="bg-surface rounded-2xl border border-outline/20 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              AI Summary / 核心洞察
            </h3>
            {detail.previewMode === 'real_content' && (
              <div className="flex items-center gap-2 text-primary text-xs font-bold whitespace-nowrap">
                <Zap size={12} fill="currentColor" />
                <span>{detail.importance.toFixed(1)} / 10</span>
              </div>
            )}
          </div>
          <p className="text-xl text-on-surface font-medium leading-relaxed">
            {detail.summaryZh}
          </p>
          {realContentSummarySupportMessage && (
            <p className="text-xs text-on-surface-variant/70">
              {realContentSummarySupportMessage}
            </p>
          )}
        </div>

        {/* Why it matters */}
        {detail.whyItMatters.length > 0 && (
          <div className="bg-surface-low rounded-2xl border border-outline/10 p-6 space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Why it matters / 为什么重要
            </h3>
            <ul className="space-y-4">
              {detail.whyItMatters.map((item, i) => (
                <li key={i} className="flex gap-4 text-sm text-on-surface-variant leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_#00e5ff]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {detail.provenanceSources && detail.provenanceSources.length > 0 && (
          <div className="bg-surface-low rounded-2xl border border-outline/10 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                Source Provenance / 来源溯源
              </h3>
              {detail.previewMode !== 'real_content' && (
                <div className="flex items-center gap-2 text-primary text-xs font-bold">
                  <Zap size={12} fill="currentColor" />
                  <span>{detail.importance.toFixed(1)} / 10</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {detail.provenanceSources.map((source, index) => (
                <div
                  key={`${source.rawSourceItemId ?? source.sourceUrl ?? source.sourceName}-${index}`}
                  className="rounded-xl border border-outline/10 bg-surface-high/50 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-on-surface">
                      {source.sourceName}
                    </div>
                    {source.isPrimary && (
                      <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded whitespace-nowrap">
                        Primary source
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-on-surface-variant space-y-1">
                    {source.publishedAt && <div>Published: {source.publishedAt}</div>}
                    {source.sourceId &&
                      source.sourceId !== source.sourceName &&
                      source.sourceId.length <= 32 && (
                        <div>Source ID: {source.sourceId}</div>
                      )}
                  </div>
                  {source.sourceUrl && (
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink size={12} />
                      View source link
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Glossary */}
        {detail.glossary && (
          <div className="bg-surface-lowest rounded-2xl border border-outline/5 p-6 space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Glossary / 术语解释
            </h3>
            <div className="grid gap-4">
              {detail.glossary.map((g, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-on-surface">{g.term}</span>
                  <span className="text-xs text-on-surface-variant leading-relaxed">{g.definition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reading Controls */}
        <div
          className="sticky bg-background/95 backdrop-blur-md z-10 py-6 -mx-4 px-4 flex flex-col gap-4 border-b border-outline/10"
          style={{top: 'calc(4rem + env(safe-area-inset-top, 0px))'}}
        >
          <div className="flex bg-surface-high rounded-full p-1 border border-outline/10">
            {(['Chinese Only', 'Bilingual', 'Original'] as ReadingMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => updateSettings({ readingMode: mode })}
                className={`flex-1 py-2 rounded-full text-[10px] font-bold transition-all ${
                  readingMode === mode 
                    ? 'bg-surface border border-outline/20 text-primary shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowStyles(!showStyles)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface rounded-xl border border-outline/20 text-xs font-semibold text-on-surface"
            >
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-primary" />
                {settings.translationStyle}
              </div>
              <ChevronDown size={16} className={`transition-transform ${showStyles ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showStyles && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-surface-high border border-outline/20 rounded-xl shadow-2xl z-30 overflow-hidden"
                >
                  {TRANSLATION_STYLES.map(style => (
                    <button
                      key={style}
                      onClick={() => {
                        updateSettings({ translationStyle: style });
                        setShowStyles(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-xs transition-colors hover:bg-surface border-b border-outline/5 last:border-none ${
                        settings.translationStyle === style ? 'text-primary font-bold bg-primary/5' : 'text-on-surface-variant'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content Feed */}
        <article className="space-y-12 pb-12">
          {detail.content?.map((p, i) => (
            <div key={i} className="space-y-4">
              {(readingMode === 'Bilingual' || readingMode === 'Original') && (
                <p className="text-sm text-on-surface-variant leading-relaxed font-serif tracking-wide italic opacity-80 pl-6 border-l-2 border-primary/20">
                  {p.en}
                </p>
              )}
              {(readingMode === 'Bilingual' || readingMode === 'Chinese Only') && (
                <p className="text-base text-on-surface leading-loose font-medium">
                  {p.zh}
                </p>
              )}
            </div>
          ))}
          {!detail.content && (
            <div className="py-20 text-center text-on-surface-variant/40 italic flex flex-col items-center">
              <FileText size={48} strokeWidth={1} className="mb-4 opacity-20" />
              <p>
                {detail.kind === 'library'
                  ? 'Full document content is not available in this prototype yet.'
                  : detail.previewMode === 'real_content'
                    ? 'This preview includes headline, summary, score, and source provenance only. Full article body is not stored yet.'
                    : 'Detailed analysis for this signal is being synthesized...'}
              </p>
            </div>
          )}
        </article>

        {/* My Notes Area */}
        <div className="bg-surface rounded-2xl border border-outline/20 p-6 mb-12 space-y-4 shadow-lg">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages size={14} className="text-primary" />
              My Research Notes
            </div>
            {isNoteSaved && <span className="text-success flex items-center gap-1 font-bold lowercase tracking-normal"><CheckCircle2 size={12} /> saved</span>}
          </h3>
          <textarea 
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            className="w-full bg-surface-high border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary h-32 placeholder:text-outline-variant transition-all"
            placeholder="Add context or strategic implications..."
          />
          <button 
            onClick={handleSaveNote}
            disabled={localNote === (notes[detail.id] || '')}
            className="w-full bg-primary/10 text-primary border border-primary/20 py-3 rounded-xl text-xs font-bold hover:bg-primary/20 active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100 transition-all uppercase tracking-wider"
          >
            {isNoteSaved ? 'Note Saved' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
