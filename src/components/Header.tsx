import React, { useState } from 'react';
import { Search, User } from 'lucide-react';
import { SearchModal } from './SearchModal';
import { Signal, Topic, LibraryItem, WatchlistItem } from '../types';

interface HeaderProps {
  title?: string;
  showAvatar?: boolean;
  showSearch?: boolean;
  onResultSelect?: (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => void;
}

export function Header({ title, showAvatar = true, showSearch = true, onResultSelect }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleResultClick = (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => {
    setIsSearchOpen(false);
    if (onResultSelect) {
      onResultSelect(type, item);
    }
  };

  return (
    <>
      <header
        className="flex items-center justify-between p-4 sticky top-0 bg-background/50 backdrop-blur-sm z-10"
        style={{paddingTop: 'calc(1rem + var(--safe-area-top))'}}
      >
        <div className="flex items-center gap-3">
          {showAvatar && (
            <div className="w-8 h-8 rounded-full bg-surface-high border border-outline/20 flex items-center justify-center overflow-hidden">
              <User size={18} className="text-on-surface-variant" />
            </div>
          )}
          {title ? (
            <h1 className="font-display text-lg font-bold tracking-tight">{title}</h1>
          ) : (
            <span className="font-display text-lg font-bold tracking-tight text-primary">SignalDesk</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showSearch && (
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center bg-surface rounded-full border border-outline/20 active:scale-90 transition-all hover:border-primary/50"
            >
              <Search size={18} className="text-on-surface-variant" />
            </button>
          )}
        </div>
      </header>

      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onResultClick={handleResultClick}
      />
    </>
  );
}
