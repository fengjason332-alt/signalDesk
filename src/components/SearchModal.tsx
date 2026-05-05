import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Signal as SignalIcon, Bookmark, Radar, TrendingUp, ChevronRight, FileText } from 'lucide-react';
import { MOCK_SIGNALS, MOCK_TOPICS, MOCK_LIBRARY, MOCK_WATCHLIST } from '../mockData';
import { Signal, Topic, LibraryItem, WatchlistItem } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => void;
}

export function SearchModal({ isOpen, onClose, onResultClick }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredSignals = query 
    ? MOCK_SIGNALS.filter(s => 
        s.titleZh.toLowerCase().includes(query.toLowerCase()) || 
        s.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ||
        s.source.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 3)
    : [];

  const filteredTopics = query
    ? MOCK_TOPICS.filter(t => t.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  const filteredLibrary = query
    ? MOCK_LIBRARY.filter(l => l.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  const filteredWatchlist = query
    ? MOCK_WATCHLIST.filter(w => w.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  const hasResults = filteredSignals.length > 0 || filteredTopics.length > 0 || filteredLibrary.length > 0 || filteredWatchlist.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col pt-16 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-lg mx-auto bg-surface border border-outline/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="p-4 border-b border-outline/5 flex items-center gap-3">
              <Search size={20} className="text-primary" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search signals, topics, sources..."
                className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/40 font-medium"
              />
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-surface-high rounded-full border border-outline/10 text-on-surface-variant"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {query && !hasResults && (
                <div className="py-12 text-center text-on-surface-variant/40 space-y-2">
                  <p className="text-sm font-medium">No matching signals found.</p>
                  <p className="text-[10px] uppercase tracking-widest">Try different keywords</p>
                </div>
              )}

              {query && hasResults && (
                <div className="space-y-6 p-2">
                  {filteredSignals.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="px-3 text-[10px] font-bold text-primary uppercase tracking-widest">Signals</h3>
                      {filteredSignals.map(s => (
                        <button
                          key={s.id}
                          onClick={() => onResultClick('signal', s)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <SignalIcon size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">{s.titleZh}</p>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{s.source} · {s.timestamp}</p>
                          </div>
                          <ChevronRight size={14} className="text-on-surface-variant/20" />
                        </button>
                      ))}
                    </section>
                  )}

                  {filteredTopics.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="px-3 text-[10px] font-bold text-secondary uppercase tracking-widest">Top Topics</h3>
                      {filteredTopics.map(t => (
                        <button
                          key={t.id}
                          onClick={() => onResultClick('topic', t)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                            <Radar size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate group-hover:text-secondary transition-colors">{t.name}</p>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{t.signalCount} Signals</p>
                          </div>
                          <ChevronRight size={14} className="text-on-surface-variant/20" />
                        </button>
                      ))}
                    </section>
                  )}

                  {filteredLibrary.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="px-3 text-[10px] font-bold text-[#ffae00] uppercase tracking-widest">Library</h3>
                      {filteredLibrary.map(l => (
                        <button
                          key={l.id}
                          onClick={() => onResultClick('library', l)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#ffae00]/10 flex items-center justify-center text-[#ffae00]">
                            <Bookmark size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate group-hover:text-[#ffae00] transition-colors">{l.title}</p>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{l.source}</p>
                          </div>
                          <ChevronRight size={14} className="text-on-surface-variant/20" />
                        </button>
                      ))}
                    </section>
                  )}

                  {filteredWatchlist.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="px-3 text-[10px] font-bold text-success uppercase tracking-widest">Watchlist</h3>
                      {filteredWatchlist.map(w => (
                        <button
                          key={w.id}
                          onClick={() => onResultClick('watchlist', w)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                            <TrendingUp size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate group-hover:text-success transition-colors">{w.name}</p>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{w.status}</p>
                          </div>
                          <ChevronRight size={14} className="text-on-surface-variant/20" />
                        </button>
                      ))}
                    </section>
                  )}
                </div>
              )}

              {!query && (
                <div className="p-4 space-y-4">
                  <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Recent Activity</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['NVIDIA Earnings', 'Bitcoin ETF', 'OpenAI Sora', 'Fed Rates'].map(term => (
                      <button 
                        key={term}
                        onClick={() => setQuery(term)}
                        className="py-2 px-3 rounded-xl bg-surface-high border border-outline/5 text-xs text-on-surface text-left hover:border-primary transition-all"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-surface-high/50 border-t border-outline/5 flex justify-between items-center px-6">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 opacity-40">
                  <div className="px-1 py-0.5 rounded bg-on-surface-variant/20 text-[8px] font-bold">ESC</div>
                  <span className="text-[9px] uppercase tracking-widest">Close</span>
                </div>
              </div>
              <div className="text-[9px] font-bold text-primary uppercase tracking-[2px]">Neural Search Enabled</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
