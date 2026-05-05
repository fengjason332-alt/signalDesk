import React, { useState } from 'react';
import { X, Search, Plus, Check, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WatchlistItem } from '../types';
import { MOCK_WATCHLIST } from '../mockData';

interface AddWatchItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: string[]) => void;
  existingIds: string[];
}

const CATEGORIES = ['All', 'Company', 'Crypto', 'Person', 'Topic', 'Macro'];

export default function AddWatchItemModal({ isOpen, onClose, onAdd, existingIds }: AddWatchItemModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredItems = MOCK_WATCHLIST.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.type === activeCategory;
    const isNotAdded = !existingIds.includes(item.id);
    return matchesSearch && matchesCategory && isNotAdded;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDone = () => {
    onAdd(selectedIds);
    onClose();
    setSelectedIds([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-surface border-t sm:border border-outline/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 flex items-center justify-between border-b border-outline/5">
            <h2 className="text-xl font-bold text-on-surface">Add to Watchlist</h2>
            <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
              <input 
                type="text"
                placeholder="Search companies, people, tickers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 bg-background border border-outline/10 rounded-2xl pl-12 pr-4 text-on-surface focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap ${
                    activeCategory === cat 
                      ? 'bg-primary text-on-primary shadow-[0_4px_12px_rgba(0,229,255,0.3)]' 
                      : 'bg-surface text-on-surface-variant border border-outline/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Suggestions */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Suggestions</h3>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected ? 'bg-primary/5 border-primary' : 'bg-background border-outline/5 hover:border-outline/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant'
                        }`}>
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-on-surface text-sm">{item.name}</div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/60">
                            {item.type}
                          </div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-primary text-on-primary' : 'border border-outline/20 text-transparent'
                      }`}>
                        {isSelected ? <Check size={14} strokeWidth={3} /> : <Plus size={14} />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-on-surface-variant/40 italic text-sm">
                  No matches found for your search
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-surface border-t border-outline/5 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border border-outline/10 text-on-surface font-bold text-sm hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleDone}
              disabled={selectedIds.length === 0}
              className="flex-[2] h-12 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-[0_8px_24px_rgba(0,229,255,0.3)] disabled:opacity-50 disabled:shadow-none hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Done {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
