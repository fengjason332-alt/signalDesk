import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, Plus, Hash, Layers, VolumeX } from 'lucide-react';
import { useApp } from '../AppContext';
import {
  FOLLOWED_TOPIC_OPTIONS,
  MUTED_TOPIC_OPTIONS,
} from '../mockData';
import { Category } from '../types';
import {
  DEFAULT_CORE_DOMAINS,
  getSuggestedTopics,
  getTopicsForTab,
  sanitizeCoreDomains,
  sanitizeFollowedTopics,
  sanitizeMutedTopics,
  TOPIC_MODAL_TABS,
  TopicModalTab,
  topicKindForValue,
} from '../topicPreferences';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  includeMutedTopics?: boolean;
}

export function AddTopicModal({
  isOpen,
  onClose,
  title = 'Add Topic',
  includeMutedTopics = false,
}: AddTopicModalProps) {
  const {
    settings,
    setCoreDomains,
    setFollowedTopics,
    setMutedTopics,
  } = useApp();
  const [activeTab, setActiveTab] = useState<TopicModalTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [draftCoreDomains, setDraftCoreDomains] = useState<Category[]>(settings.preferredTopics);
  const [draftFollowedTopics, setDraftFollowedTopics] = useState<string[]>(settings.followedTopics);
  const [draftMutedTopics, setDraftMutedTopics] = useState<string[]>(settings.mutedTopics);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab('All');
    setSearchQuery('');
    setDraftCoreDomains(settings.preferredTopics);
    setDraftFollowedTopics(settings.followedTopics);
    setDraftMutedTopics(settings.mutedTopics);
  }, [isOpen, settings.preferredTopics, settings.followedTopics, settings.mutedTopics]);

  const filterItems = (items: string[]) =>
    items.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));

  const isCoreSelected = (domain: Category) => draftCoreDomains.includes(domain);
  const isFollowedSelected = (topic: string) => draftFollowedTopics.includes(topic);
  const isMutedSelected = (topic: string) => draftMutedTopics.includes(topic);

  const toggleCoreDomain = (domain: Category) => {
    if (isCoreSelected(domain)) {
      if (draftCoreDomains.length === 1) {
        return;
      }

      setDraftCoreDomains(current => current.filter(item => item !== domain));
      return;
    }

    setDraftCoreDomains(current => sanitizeCoreDomains([...current, domain]));
  };

  const toggleFollowedTopic = (topic: string) => {
    setDraftFollowedTopics(current =>
      current.includes(topic)
        ? current.filter(item => item !== topic)
        : sanitizeFollowedTopics([...current, topic])
    );
  };

  const toggleMutedTopic = (topic: string) => {
    setDraftMutedTopics(current =>
      current.includes(topic)
        ? current.filter(item => item !== topic)
        : sanitizeMutedTopics([...current, topic])
    );
  };

  const handleToggleItem = (item: string) => {
    const kind = topicKindForValue(item);
    if (kind === 'core') {
      toggleCoreDomain(item as Category);
    } else if (kind === 'muted') {
      toggleMutedTopic(item);
    } else {
      toggleFollowedTopic(item);
    }
  };

  const isItemSelected = (item: string) => {
    const kind = topicKindForValue(item);
    if (kind === 'core') {
      return isCoreSelected(item as Category);
    }

    if (kind === 'muted') {
      return isMutedSelected(item);
    }

    return isFollowedSelected(item);
  };

  const getItemIcon = (item: string) => {
    const kind = topicKindForValue(item);
    if (kind === 'core') {
      return <Layers size={16} />;
    }

    if (kind === 'muted') {
      return <VolumeX size={16} />;
    }

    return <Hash size={16} />;
  };

  const getSectionItems = (items: string[]) => uniqueItems(items);

  const renderSection = (sectionTitle: string, items: string[]) => {
    const filtered = filterItems(getSectionItems(items));
    if (filtered.length === 0) return null;

    return (
      <div className="space-y-3 mb-6">
        <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest px-1">{sectionTitle}</h3>
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(item => {
            const isSelected = isItemSelected(item);
            
            return (
              <button
                key={item}
                onClick={() => handleToggleItem(item)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                  isSelected 
                    ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(0,229,255,0.1)]' 
                    : 'bg-surface border-outline/10 hover:border-outline/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-high text-on-surface-variant'}`}>
                    {getItemIcon(item)}
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

  const handleDone = () => {
    setCoreDomains(draftCoreDomains.length > 0 ? draftCoreDomains : DEFAULT_CORE_DOMAINS);
    setFollowedTopics(draftFollowedTopics);
    if (includeMutedTopics) {
      setMutedTopics(draftMutedTopics);
    }
    onClose();
  };

  const uniqueItems = (items: string[]) => Array.from(new Set(items));

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
                <h2 className="text-xl font-bold text-on-surface">{title}</h2>
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
                  placeholder="Search topics, policies, sectors..."
                  className="w-full bg-surface-high border border-outline/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {TOPIC_MODAL_TABS.map(tab => (
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
              {activeTab === 'All' && renderSection('Suggested Topics', getSuggestedTopics())}
              {(activeTab === 'All' || activeTab === 'Core Domains') && renderSection('Core Domains', getTopicsForTab('Core Domains'))}
              {(activeTab === 'All' || activeTab === 'Policy') && renderSection('Policy', getTopicsForTab('Policy'))}
              {(activeTab === 'All' || activeTab === 'Technology') && renderSection('Technology', getTopicsForTab('Technology'))}
              {(activeTab === 'All' || activeTab === 'Markets') && renderSection('Markets', getTopicsForTab('Markets'))}
              {(activeTab === 'All' || activeTab === 'Energy') && renderSection('Energy', getTopicsForTab('Energy'))}
              {(activeTab === 'All' || activeTab === 'Followed Topics') && renderSection('Followed Topics', FOLLOWED_TOPIC_OPTIONS)}
              {includeMutedTopics && renderSection('Muted Topics', MUTED_TOPIC_OPTIONS)}
            </div>
            
            <div className="p-6 bg-surface-high/50 border-t border-outline/5 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 border border-outline/10 py-4 rounded-2xl text-on-surface font-bold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDone}
                className="flex-1 bg-primary py-4 rounded-2xl text-on-primary font-bold shadow-[0_8px_24px_rgba(0,229,255,0.3)] active:scale-95 transition-all"
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
