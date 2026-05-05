import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Plus, LayoutGrid, StretchHorizontal, MoreVertical, TrendingUp, TrendingDown, Bell, Eye, Trash2 } from 'lucide-react';
import { MOCK_WATCHLIST } from '../mockData';
import { WatchlistItem } from '../types';
import { useApp } from '../AppContext';
import AddWatchItemModal from '../components/AddWatchItemModal';
import { motion, AnimatePresence } from 'motion/react';

interface WatchlistViewProps {
  onSelectItem: (item: WatchlistItem) => void;
  onResultSelect?: (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => void;
}

export default function WatchlistView({ onSelectItem, onResultSelect }: WatchlistViewProps) {
  const { watchlist, addToWatchlist, removeFromWatchlist, showPrototypeToast } = useApp();
  const [isCompact, setIsCompact] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const watchedItems = MOCK_WATCHLIST.filter(item => watchlist.includes(item.id));

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  return (
    <div className="flex flex-col min-h-full relative px-4 py-2">
      <Header title="Watchlist" onResultSelect={onResultSelect} />
      
      <main onClick={() => setActiveMenuId(null)}>
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight mb-1 font-bold text-on-surface">Watchlist</h2>
            <p className="text-on-surface-variant text-sm">Strategic entities being tracked.</p>
          </div>
          <div className="flex bg-surface-high rounded-lg p-1 border border-outline/10">
            <button 
              onClick={() => setIsCompact(true)}
              className={`p-1.5 rounded-md transition-all ${isCompact ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setIsCompact(false)}
              className={`p-1.5 rounded-md transition-all ${!isCompact ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <StretchHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {watchedItems.length > 0 ? (
              watchedItems.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={item.id} 
                  onClick={() => onSelectItem(item)}
                  className={`bg-surface rounded-2xl border border-outline/20 p-4 relative group hover:border-primary/20 transition-all cursor-pointer ${isCompact ? 'flex items-center justify-between' : ''}`}
                >
                  <div className={`flex items-start justify-between ${isCompact ? 'w-full' : 'mb-2'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-surface-high border border-outline/20 flex items-center justify-center font-bold text-xl text-primary shadow-sm group-hover:bg-primary/5 transition-colors">
                        {item.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">{item.name}</h3>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant flex items-center gap-1 opacity-60">
                          {item.type}
                        </div>
                      </div>
                    </div>
                    
                    {!isCompact && (
                      <div className="text-right">
                        {item.value && (
                          <>
                            <div className="font-mono font-bold text-base text-on-surface">{item.value}</div>
                            <div className={`flex items-center justify-end gap-1 text-[10px] font-bold font-mono ${item.valueTrend === 'up' ? 'text-success' : 'text-error'}`}>
                              {item.valueTrend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              2.4%
                            </div>
                          </>
                        )}
                        {!item.value && (
                          <div className="relative">
                            <button 
                              onClick={(e) => toggleMenu(e, item.id)}
                              className="text-on-surface-variant p-2 hover:bg-white/5 rounded-full"
                            >
                              <MoreVertical size={18} />
                            </button>
                            {activeMenuId === item.id && (
                              <div className="absolute right-0 top-full mt-1 w-32 bg-surface-high border border-outline/20 rounded-xl shadow-2xl z-10 overflow-hidden">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    showPrototypeToast();
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                                >
                                  <Bell size={12} /> Mute
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    removeFromWatchlist(item.id);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-error hover:bg-error/10 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isCompact && (
                      <div className="flex items-center gap-6">
                        {item.value && (
                          <div className="text-right">
                            <div className="font-mono font-bold text-sm text-on-surface">{item.value}</div>
                            <div className={`text-[10px] font-bold font-mono ${item.valueTrend === 'up' ? 'text-success' : 'text-error'}`}>
                              +2.4%
                            </div>
                          </div>
                        )}
                        <span className="p-2 rounded-lg bg-surface-high border border-outline/10 text-primary">
                          <Eye size={16} />
                        </span>
                      </div>
                    )}
                  </div>

                  {!isCompact && (
                    <div className="mt-4 pt-4 border-t border-outline/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          item.status?.includes('Critical') || item.status?.includes('High')
                            ? 'bg-error/10 text-error border-error/20' 
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        <span className="font-bold text-on-surface">{item.importantUpdates} updates</span> • {item.totalMentions} mentions in past 7d
                      </p>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center px-8 border-2 border-dashed border-outline/10 rounded-3xl">
                <Bell size={48} strokeWidth={1} className="text-on-surface-variant/20 mb-4" />
                <h3 className="text-on-surface font-bold mb-1">Your watchlist is empty</h3>
                <p className="text-sm text-on-surface-variant">Track companies, topics, or people to never miss a signal.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Add Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary rounded-full shadow-[0_8px_32px_rgba(0,229,255,0.4)] flex items-center justify-center text-on-primary active:scale-95 hover:scale-105 transition-all z-10"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      <AddWatchItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onAdd={addToWatchlist}
        existingIds={watchlist}
      />
    </div>
  );
}
