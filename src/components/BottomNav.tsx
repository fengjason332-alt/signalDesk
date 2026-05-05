import React from 'react';
import { LayoutGrid, Radar, Eye, BookOpen, Settings } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: 'today' | 'radar' | 'watchlist' | 'library' | 'settings';
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'today', icon: LayoutGrid, label: 'Today' },
    { id: 'radar', icon: Radar, label: 'Radar' },
    { id: 'watchlist', icon: Eye, label: 'Watchlist' },
    { id: 'library', icon: BookOpen, label: 'Library' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav
      className="fixed bottom-0 w-full max-w-md bg-surface/80 backdrop-blur-md border-t border-outline/20 p-2 flex justify-around items-end"
      style={{paddingBottom: 'calc(0.5rem + var(--safe-area-inset-bottom, var(--safe-area-bottom)))'}}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center gap-1 transition-colors relative tap-highlight-none"
          >
            <tab.icon 
              size={24} 
              className={isActive ? 'text-primary' : 'text-on-surface-variant'} 
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="nav-dot"
                className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_#00e5ff]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
