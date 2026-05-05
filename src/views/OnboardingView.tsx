import React, { useState } from 'react';
import { Zap, Cpu, Bitcoin, TrendingUp, Bot, Globe, AlertCircle, Shield, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { Category } from '../types';
import {
  DEFAULT_CORE_DOMAINS,
  DEFAULT_FOLLOWED_TOPICS,
  DEFAULT_MUTED_TOPICS,
} from '../topicPreferences';

interface OnboardingViewProps {
  onComplete: () => void;
}

export default function OnboardingView({ onComplete }: OnboardingViewProps) {
  const { setCoreDomains, setFollowedTopics, setMutedTopics } = useApp();
  const [selectedDomains, setSelectedDomains] = useState<Category[]>(DEFAULT_CORE_DOMAINS);
  const [showWarning, setShowWarning] = useState(false);

  const domains = [
    { name: 'AI' as Category, icon: Cpu },
    { name: 'Crypto' as Category, icon: Bitcoin },
    { name: 'Stocks' as Category, icon: TrendingUp },
    { name: 'Robotics' as Category, icon: Bot },
    { name: 'Energy' as Category, icon: Zap },
    { name: 'US Policy' as Category, icon: Shield },
    { name: 'China Policy' as Category, icon: Globe },
    { name: 'Australia Policy' as Category, icon: Target },
    { name: 'Macro' as Category, icon: TrendingUp },
    { name: 'Geopolitics' as Category, icon: Globe },
  ];

  const toggleDomain = (name: Category) => {
    setSelectedDomains(prev => {
      const newSelection = prev.includes(name) 
        ? prev.filter(d => d !== name)
        : [...prev, name];
      
      if (newSelection.length > 0) setShowWarning(false);
      return newSelection;
    });
  };

  const handleComplete = () => {
    if (selectedDomains.length === 0) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    setCoreDomains(selectedDomains);
    setFollowedTopics(DEFAULT_FOLLOWED_TOPICS);
    setMutedTopics(DEFAULT_MUTED_TOPICS);
    onComplete();
  };

  return (
    <div className="flex flex-col min-h-screen relative p-6 justify-between overflow-hidden bg-background">
      <div className="space-y-12 relative z-10 pt-12">
        <div className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i === 1 ? 'bg-primary shadow-[0_0_8px_#00e5ff]' : 'bg-surface-high'}`} />
            ))}
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-on-surface">
            Tell SignalDesk what you care about
          </h1>
          <p className="text-on-surface-variant text-lg">
            Select your core domains to personalize your intelligence feed.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto no-scrollbar pb-10">
          {domains.map((d, i) => {
            const isActive = selectedDomains.includes(d.name);
            return (
              <motion.button
                key={d.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => toggleDomain(d.name)}
                className={`flex flex-col gap-8 p-5 h-40 rounded-2xl border transition-all text-left group relative overflow-hidden ${
                  isActive 
                    ? 'bg-surface border-primary shadow-[0_4px_24px_rgba(0,229,255,0.15)]' 
                    : 'bg-surface-lowest border-outline/10 hover:border-outline/40'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-glow" 
                    className="absolute inset-x-0 bottom-0 h-1 bg-primary blur-[4px]" 
                  />
                )}
                <d.icon 
                  size={32} 
                  className={isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'} 
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <span className={`text-xl font-bold ${isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                  {d.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 py-8 space-y-4">
        <AnimatePresence>
          {showWarning && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-warning text-sm font-bold"
            >
              <AlertCircle size={16} />
              Please select at least one domain
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={handleComplete}
          className="w-full bg-primary py-5 rounded-2xl text-on-primary font-bold text-lg shadow-[0_8px_32px_rgba(0,229,255,0.4)] active:scale-95 transition-all"
        >
          Continue →
        </button>
      </div>

      {/* Decorative Blur */}
      <div className="absolute top-[-10%] right-[-20%] w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-20%] w-64 h-64 bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />
    </div>
  );
}
