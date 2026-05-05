import React from 'react';
import { Radar } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-12">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Glowing Background Ring */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
        />
        
        {/* Animated Spin Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-t-2 border-primary rounded-full shadow-[0_-4px_12px_#00e5ff]"
        />

        <div className="w-20 h-20 bg-surface rounded-2xl border border-outline/20 flex items-center justify-center relative z-10 shadow-2xl">
          <Radar size={40} className="text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-display font-bold tracking-tight text-on-surface">SignalDesk</h2>
        <div className="space-y-1 flex flex-col items-center">
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-on-surface-variant font-medium"
          >
            Analyzing today's signals...
          </motion.div>
          <div className="flex gap-2 mt-4">
            {['Global Markets', 'News Feeds', 'AI Sources'].map((m, i) => (
              <motion.span 
                key={m}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: i * 0.5 }}
                className="text-[10px] uppercase font-bold tracking-widest text-outline border border-outline-variant/30 px-2 py-0.5 rounded"
              >
                {m}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
