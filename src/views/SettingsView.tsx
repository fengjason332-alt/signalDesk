import React from 'react';
import { Header } from '../components/Header';
import { motion } from 'motion/react';
import { User, Bell, Languages, Layout, Shield, ChevronRight, Globe, Gauge, Moon, Zap, MousePointer2, Plus, VolumeX, Heart, Hash } from 'lucide-react';
import { useApp } from '../AppContext';
import { getCategoryLabel, ReadingMode } from '../types';
import { ViewType } from '../App';
import { AddTopicModal } from '../components/AddTopicModal';

interface SettingsViewProps {
  onPreviewState?: (state: ViewType) => void;
  onResultSelect?: (type: 'signal' | 'topic' | 'library' | 'watchlist', item: any) => void;
  onResetOnboarding?: () => void;
}

export default function SettingsView({ onPreviewState, onResultSelect, onResetOnboarding }: SettingsViewProps) {
  const { settings, updateSettings, showPrototypeToast, sync } = useApp();
  const [isManageModalOpen, setIsManageModalOpen] = React.useState(false);
  const [syncEmail, setSyncEmail] = React.useState('');
  const [syncPendingAction, setSyncPendingAction] = React.useState<'sign-in' | 'sign-out' | null>(null);
  const [syncFeedback, setSyncFeedback] = React.useState<{
    kind: 'status' | 'error';
    message: string;
  } | null>(null);

  const handleSyncSignIn = async () => {
    const normalizedEmail = syncEmail.trim();
    if (!normalizedEmail) {
      setSyncFeedback({
        kind: 'error',
        message: 'Enter an email address to receive a sign-in link.',
      });
      return;
    }

    setSyncPendingAction('sign-in');
    setSyncFeedback(null);

    try {
      await sync.signInWithOtp(normalizedEmail);
      setSyncFeedback({
        kind: 'status',
        message: 'Check your email for the sign-in link.',
      });
    } catch (error) {
      setSyncFeedback({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to send sign-in email.',
      });
    } finally {
      setSyncPendingAction(null);
    }
  };

  const handleSyncSignOut = async () => {
    setSyncPendingAction('sign-out');
    setSyncFeedback(null);

    try {
      await sync.signOut();
      setSyncFeedback({
        kind: 'status',
        message: 'Signed out. SignalDesk will keep using local storage on this device.',
      });
    } catch (error) {
      setSyncFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to sign out right now.',
      });
    } finally {
      setSyncPendingAction(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header onResultSelect={onResultSelect} />
      
      <main className="px-6 py-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-on-surface mb-1 text-on-surface">Settings</h2>
          <p className="text-on-surface-variant text-sm">Tailor your intelligence feed and reading experience.</p>
        </div>

        <div className="space-y-10">
          {/* Reading Preferences */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Languages size={14} />
               Reading Preferences
            </h3>
            <div className="bg-surface rounded-2xl border border-outline/20 divide-y divide-outline/10">
              <div className="p-4 flex flex-col gap-3">
                <span className="text-sm font-medium text-on-surface">Default Reading Mode</span>
                <div className="flex bg-surface-high rounded-xl p-1 border border-outline/10 overflow-hidden">
                  {(['Chinese Only', 'Bilingual', 'Original'] as ReadingMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => updateSettings({ readingMode: mode })}
                      className={`flex-1 py-2 px-2 rounded-lg text-[9px] font-bold transition-all ${
                        settings.readingMode === mode 
                          ? 'bg-surface text-primary shadow-sm border border-outline/10' 
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => showPrototypeToast()}
                className="w-full p-4 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-colors text-left"
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-on-surface block">Translation Style</span>
                  <span className="text-[10px] text-primary font-bold">{settings.translationStyle}</span>
                </div>
                <ChevronRight size={16} className="text-on-surface-variant" />
              </button>
            </div>
          </section>

          {/* Topic Management */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Layout size={14} />
              Topic Management
            </h3>
            <div className="bg-surface rounded-2xl border border-outline/20 divide-y divide-outline/10 overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                    <Heart size={12} className="text-primary" />
                    Core Domains
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {settings.preferredTopics.map(topic => (
                      <span key={topic} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                        {getCategoryLabel(topic)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                    <Hash size={12} className="text-secondary" />
                    Followed Topics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {settings.followedTopics.length > 0 ? settings.followedTopics.map(topic => (
                      <span key={topic} className="px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-[10px] font-bold border border-secondary/20">
                        {topic}
                      </span>
                    )) : (
                      <span className="text-[10px] text-on-surface-variant italic">No followed topics</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                    <VolumeX size={12} className="text-on-surface-variant" />
                    Muted Topics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {settings.mutedTopics.length > 0 ? settings.mutedTopics.map(topic => (
                      <span key={topic} className="px-2.5 py-1 rounded-lg bg-surface-highest text-on-surface-variant text-[10px] font-bold border border-outline/10">
                        {topic}
                      </span>
                    )) : (
                      <span className="text-[10px] text-on-surface-variant italic">No muted topics</span>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsManageModalOpen(true)}
                className="w-full p-4 flex items-center justify-center gap-2 bg-surface hover:bg-white/5 transition-all text-xs font-bold text-primary group"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                Manage Topics & Interests
              </button>
            </div>
          </section>

          {/* Sync */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Globe size={14} />
              Sync
            </h3>
            <div className="bg-surface rounded-2xl border border-outline/20">
              <div className="p-4 space-y-3">
                {sync.mode === 'not-configured' && (
                  <>
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-on-surface block">Sync not configured</span>
                      <span className="text-[10px] text-on-surface-variant block">
                        Supabase is unavailable, so SignalDesk stays local-only on this device.
                      </span>
                    </div>
                  </>
                )}

                {sync.mode === 'loading' && (
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-on-surface block">Checking sync status...</span>
                    <span className="text-[10px] text-on-surface-variant block">
                      Local data remains available while your session loads.
                    </span>
                  </div>
                )}

                {sync.mode === 'signed-out' && (
                  <>
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-on-surface block">Sign in to sync</span>
                      <span className="text-[10px] text-on-surface-variant block">
                        SignalDesk stays local-first until you connect a sync account.
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="email"
                        value={syncEmail}
                        onChange={event => {
                          setSyncEmail(event.target.value);
                          if (syncFeedback?.kind === 'error') {
                            setSyncFeedback(null);
                          }
                        }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={syncPendingAction !== null || !sync.hasLoadedSession}
                        className="w-full rounded-xl border border-outline/20 bg-surface-high px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        onClick={() => {
                          void handleSyncSignIn();
                        }}
                        disabled={
                          syncPendingAction !== null ||
                          !sync.hasLoadedSession ||
                          syncEmail.trim().length === 0
                        }
                        className="self-start rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {syncPendingAction === 'sign-in' ? 'Sending...' : 'Send Sign-In Link'}
                      </button>
                    </div>
                  </>
                )}

                {sync.mode === 'signed-in' && (
                  <>
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-on-surface block">Sync connected</span>
                      <span className="text-[10px] text-on-surface-variant block">
                        Signed in as {sync.email}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        void handleSyncSignOut();
                      }}
                      disabled={syncPendingAction !== null}
                      className="rounded-xl border border-outline/20 bg-surface-high px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {syncPendingAction === 'sign-out' ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </>
                )}

                {syncFeedback && sync.mode !== 'not-configured' && (
                  <p
                    className={`text-[10px] ${
                      syncFeedback.kind === 'error' ? 'text-error' : 'text-primary'
                    }`}
                  >
                    {syncFeedback.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* System */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Shield size={14} />
              System
            </h3>
            <div className="bg-surface rounded-2xl border border-outline/20 divide-y divide-outline/10">
              <div className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-on-surface block">Critical Alerts</span>
                  <span className="text-[10px] text-on-surface-variant block">Push notifications for importance {'>'} 9.0</span>
                </div>
                <button 
                  onClick={() => updateSettings({ criticalAlerts: !settings.criticalAlerts })}
                  className={`w-10 h-6 rounded-full relative transition-colors border ${
                    settings.criticalAlerts ? 'bg-primary border-primary/30 shadow-[0_0_8px_#00e5ff]' : 'bg-surface-highest border-outline/10'
                  }`}
                >
                  <motion.div 
                    animate={{ x: settings.criticalAlerts ? 18 : 2 }}
                    className={`absolute top-1 w-3.5 h-3.5 rounded-full shadow-sm ${
                      settings.criticalAlerts ? 'bg-on-primary' : 'bg-on-surface-variant/30'
                    }`}
                  />
                </button>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-on-surface block">Theme</span>
                  <span className="text-[10px] text-on-surface-variant block">Optimized for long-form intelligence reading.</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-high border border-outline/10">
                  <Moon size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Dark Mode Only</span>
                </div>
              </div>
            </div>
          </section>

          {/* Prototype Debug */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-warning flex items-center gap-2">
              <Zap size={14} />
              Prototype Debug
            </h3>
            <div className="bg-surface rounded-2xl border border-outline/20 divide-y divide-outline/10 overflow-hidden">
              <button 
                onClick={() => onPreviewState?.('loading')}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Gauge size={16} className="text-on-surface-variant" />
                  <span className="text-sm font-medium text-on-surface">Preview Loading State</span>
                </div>
                <ChevronRight size={16} className="text-on-surface-variant/40" />
              </button>
              <button 
                onClick={() => onPreviewState?.('empty')}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MousePointer2 size={16} className="text-on-surface-variant" />
                  <span className="text-sm font-medium text-on-surface">Preview Empty State</span>
                </div>
                <ChevronRight size={16} className="text-on-surface-variant/40" />
              </button>
              {onResetOnboarding && (
                <button 
                  onClick={onResetOnboarding}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-on-surface-variant" />
                    <span className="text-sm font-medium text-on-surface">Reset Onboarding</span>
                  </div>
                  <ChevronRight size={16} className="text-on-surface-variant/40" />
                </button>
              )}
            </div>
          </section>

          <footer className="py-10 text-center space-y-4">
            <div className="text-[10px] text-on-surface-variant/30 uppercase tracking-[4px] font-bold">SignalDesk v0.4.2</div>
            <button
              onClick={() => showPrototypeToast()}
              className="text-xs font-bold text-error border border-error/20 px-6 py-2 rounded-xl hover:bg-error/5 transition-colors"
            >
              Log Out of Intelligence Feed
            </button>
          </footer>
        </div>
      </main>

      <AddTopicModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        title="Manage Topics"
        includeMutedTopics
      />
    </div>
  );
}
