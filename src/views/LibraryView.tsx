import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Search, Bookmark, BookOpen, Trash2, Filter } from 'lucide-react';
import { MOCK_LIBRARY, MOCK_SIGNALS } from '../mockData';
import { Signal, LibraryItem } from '../types';
import { useApp } from '../AppContext';
import { motion, AnimatePresence } from 'motion/react';

interface LibraryViewProps {
  onSignalClick: (signal: Signal) => void;
  onResultSelect?: (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => void;
}

export default function LibraryView({ onSignalClick, onResultSelect }: LibraryViewProps) {
  const { savedSignals, toggleSaveSignal } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const categories = ['All', 'Investment Research', 'Tech Trends', 'Industry Intelligence'];

  // Combine saved signals and library items for the view
  const savedSignalsList = MOCK_SIGNALS.filter(s => savedSignals.includes(s.id));
  
  const allItems = [
    ...savedSignalsList.map(s => ({
      id: s.id,
      source: s.source,
      date: s.timestamp,
      title: s.titleZh,
      summaryZh: s.summaryZh,
      whyItMatters: s.whyItMatters[0],
      tags: s.tags,
      category: 'Industry Intelligence',
      isSignal: true,
      original: s
    })),
    ...MOCK_LIBRARY.map(l => ({
      ...l,
      isSignal: false
    }))
  ];

  const filteredItems = allItems.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleItemClick = (item: any) => {
    if (item.isSignal) {
      onSignalClick(item.original);
    } else {
      // Create a mock signal from library item for detail view compatibility
      onSignalClick({
        id: item.id,
        category: 'Macro',
        titleZh: item.title,
        titleEn: 'Research Document',
        summaryZh: item.summaryZh,
        whyItMatters: [item.whyItMatters],
        importance: 9.0,
        source: item.source,
        timestamp: item.date,
        tags: item.tags,
        content: [{ en: 'This is a research document from the library.', zh: '这是一份来自图书馆的研究文档。' }]
      } as Signal);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header onResultSelect={onResultSelect} />
      
      <main className="px-6 py-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-on-surface mb-1">Research Library</h2>
          <p className="text-on-surface-variant text-sm">Strategic intelligence and saved signals.</p>
        </div>

        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input 
            type="text" 
            placeholder="Search saved intelligence..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-outline/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40"
          />
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap uppercase tracking-widest transition-all ${
                activeCategory === cat 
                  ? 'bg-primary text-on-primary shadow-sm border border-primary' 
                  : 'bg-surface text-on-surface-variant border border-outline/10 hover:border-outline/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="bg-surface rounded-2xl border border-outline/10 p-5 space-y-4 hover:border-primary/20 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase opacity-60">
                      {item.source} · {item.date}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.isSignal) {
                          toggleSaveSignal(item.id);
                        }
                      }}
                      className="text-primary hover:text-primary/70 transition-colors"
                    >
                      <Bookmark size={18} fill="currentColor" />
                    </button>
                  </div>

                  <h3 className="font-bold text-on-surface text-lg leading-tight group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  <div className="space-y-2">
                    <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">
                      {item.summaryZh}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-outline/5">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-bold uppercase tracking-tighter text-on-surface-variant/60 bg-surface-high px-2 py-0.5 rounded border border-outline/5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center flex flex-col items-center justify-center opacity-40 italic">
                <BookOpen size={48} strokeWidth={1} className="mb-4" />
                <p>No matches found in your library.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
