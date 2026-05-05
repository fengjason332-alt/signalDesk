import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, Plus, Hash, Layers, Cpu, Shield, Zap, Globe, Target } from 'lucide-react';
import { useApp } from '../AppContext';
import { AVAILABLE_TOPICS, CORE_DOMAINS } from '../mockData';
import { Category } from '../types';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'All' | 'Core Domains' | 'Policy' | 'Technology' | 'Markets' | 'Followed Topics';

export function AddTopicModal({ isOpen, onClose }: AddTopicModalProps) {
  const { settings, updateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: Tab[] = ['All', 'Core Domains', 'Policy', 'Technology', 'Markets', 'Followed Topics'];

  const handleToggleCoreDomain = (domain: Category) => {
    const current = settings.preferredTopics;
    if (current.includes(domain)) {
      if (current.length > 1) {
        updateSettings({ preferredTopics: current.filter(d => d !== domain) });
      }
    } else {
      updateSettings({ preferredTopics: [...current, domain] });
    }
  };

  const handleToggleFollowedTopic = (topic: string) => {
    const current = settings.followedTopics;
    if (current.includes(topic)) {
      updateSettings({ followedTopics: current.filter(t => t !== topic) });
    } else {
      updateSettings({ followedTopics: [...current, topic] });
    }
  };

  const isCoreDomain = (item: string) => CORE_DOMAINS.includes(item as Category);

  const filterItems = (items: string[]) => {
    return items.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const renderSection = (title: string, items: string[], type: 'core' | 'followed') => {
    const filtered = filterItems(items);
    if (filtered.length === 0) return null;

    return (
      <div className="space-y-3 mb-6">
        <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">{title}</h3>
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(item => {
            const isSelected = type === 'core' 
              ? settings.preferredTopics.includes(item as Category)
              : settings.followedTopics.includes(item);
            
            return (
              <button
                key={item}
                onClick={() => type === 'core' ? handleToggleCoreDomain(item as Category) : handleToggleFollowedTopic(item)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                  isSelected 
                    ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(0,229,255,0.1)]' 
                    : 'bg-surface border-outline/10 hover:border-outline/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-high text-on-surface-variant'}`}>
                    {type === 'core' ? <Layers size={16} /> : <Hash size={16} />}
                  </div>
                  <span className={`font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{item}</span>
                </div>
                {isSelected ? <Check size={18} className="text-primary" /> : <Plus size={18} className="text-on-surface-variant/40" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface border border-outline/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-6 border-b border-outline/5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-on-surface">Manage Interests</h2>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center bg-surface-high rounded-full border border-outline/10 text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search domains, policies, tech..."
                  className="w-full bg-surface-high border border-outline/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                      activeTab === tab 
                        ? 'bg-primary text-on-primary' 
                        : 'bg-surface-high text-on-surface-variant'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              {(activeTab === 'All' || activeTab === 'Core Domains') && renderSection('Core Domains', CORE_DOMAINS, 'core')}
              {(activeTab === 'All' || activeTab === 'Policy') && renderSection('Geopolitics & Policy', AVAILABLE_TOPICS.Policy, 'followed')}
              {(activeTab === 'All' || activeTab === 'Technology') && renderSection('Technology Trends', AVAILABLE_TOPICS.Technology, 'followed')}
              {(activeTab === 'All' || activeTab === 'Markets') && renderSection('Market Segments', AVAILABLE_TOPICS.Markets, 'followed')}
              {(activeTab === 'All' || activeTab === 'Followed Topics') && renderSection('Your Followed Topics', settings.followedTopics, 'followed')}
            </div>
            
            <div className="p-6 bg-surface-high/50 border-t border-outline/5">
              <button 
                onClick={onClose}
                className="w-full bg-primary py-4 rounded-2xl text-on-primary font-bold shadow-[0_8px_24px_rgba(0,229,255,0.3)] active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
