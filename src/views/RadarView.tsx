import React from 'react';
import { Header } from '../components/Header';
import { MOCK_TOPICS } from '../mockData';
import { Topic } from '../types';
import { Zap, TrendingUp, ChevronRight, Plus, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../AppContext';

interface RadarViewProps {
  onTopicClick: (topic: Topic) => void;
  onResultSelect?: (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => void;
}

export default function RadarView({ onTopicClick, onResultSelect }: RadarViewProps) {
  const { settings, updateSettings } = useApp();

  const handleToggleFollow = (e: React.MouseEvent, topicName: string) => {
    e.stopPropagation();
    const current = settings.followedTopics;
    if (current.includes(topicName)) {
      updateSettings({ followedTopics: current.filter(t => t !== topicName) });
    } else {
      updateSettings({ followedTopics: [...current, topicName] });
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header onResultSelect={onResultSelect} />
      
      <main className="px-6 py-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-on-surface mb-1">Topic Radar</h2>
          <p className="text-on-surface-variant text-sm">Navigating the rising trends in tech and finance.</p>
        </div>

        {/* Radar Visualization Card */}
        <div className="relative aspect-square bg-surface-lowest rounded-3xl border border-outline/10 mb-10 overflow-hidden flex items-center justify-center group shadow-2xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-0 w-full h-px bg-on-surface" />
            <div className="absolute left-1/2 top-0 w-px h-full bg-on-surface" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border border-on-surface rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 border border-on-surface rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 h-1/4 border border-on-surface rounded-full" />
          </div>

          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent rotate-45" />
          </motion.div>

          {/* Individual Dots for topics */}
          {MOCK_TOPICS.map((topic, i) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.4 }}
              onClick={() => onTopicClick(topic)}
              className="absolute w-5 h-5 bg-primary rounded-full shadow-[0_0_20px_rgba(0,229,255,0.8)] flex items-center justify-center cursor-pointer z-10"
              style={{
                top: `${20 + i * 40}%`,
                left: `${30 + i * 30}%`
              }}
            >
              <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
            </motion.div>
          ))}
          
          <div className="absolute bottom-6 left-6 bg-surface/90 backdrop-blur-md p-4 rounded-2xl border border-outline/10 text-[10px] space-y-2 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#00e5ff]" />
              <span className="text-on-surface-variant uppercase font-bold tracking-widest opacity-70">Center = Urgent</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-secondary rounded-full" />
              <span className="text-on-surface-variant uppercase font-bold tracking-widest opacity-70">Outer = Developing</span>
            </div>
          </div>
        </div>

        {/* List */}
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
          <Zap size={14} fill="currentColor" />
          Trending Synthesis
        </h3>
        <div className="space-y-4 pb-20">
          {MOCK_TOPICS.map(topic => {
            const isFollowed = settings.followedTopics.includes(topic.name);
            return (
              <div 
                key={topic.id} 
                onClick={() => onTopicClick(topic)}
                className="bg-surface rounded-2xl border border-outline/10 p-5 hover:border-primary/30 transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/5 text-primary text-[8px] font-bold tracking-widest uppercase">
                        {topic.category}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-success">
                        <TrendingUp size={10} />
                        {topic.momentum}%
                      </div>
                    </div>
                    <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">{topic.name}</h4>
                  </div>
                  <button 
                    onClick={(e) => handleToggleFollow(e, topic.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${
                      isFollowed
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-surface-high text-on-surface-variant border-outline/10 hover:border-primary/40'
                    }`}
                  >
                    {isFollowed ? <Check size={12} /> : <Plus size={12} />}
                    {isFollowed ? 'Following' : 'Follow Topic'}
                  </button>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="text-[10px] text-on-surface-variant/60 uppercase tracking-tighter">
                    {topic.signalCount} signals aggregated
                  </div>
                  <div className="text-[10px] text-primary font-bold flex items-center gap-1">
                    View Synthesis <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
