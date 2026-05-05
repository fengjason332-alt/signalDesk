
export type Category = 
  | 'AI' 
  | 'Crypto' 
  | 'Stocks' 
  | 'Robotics' 
  | 'Energy' 
  | 'US Policy' 
  | 'China Policy' 
  | 'Australia Policy' 
  | 'Macro' 
  | 'Geopolitics';

export type ReadingMode = 'Chinese Only' | 'Bilingual' | 'Original';
export type TranslationStyle = 'Professional Analysis' | 'Simple Chinese' | 'Accurate Translation' | 'Student-Friendly Explanation';

export interface AppSettings {
  readingMode: ReadingMode;
  translationStyle: TranslationStyle;
  preferredTopics: Category[]; // These are core domains
  followedTopics: string[];    // These are specific interests
  mutedTopics: string[];       // These are hidden topics
  criticalAlerts: boolean;
  darkMode: boolean;
}

export interface Signal {
  id: string;
  category?: Category; // Legacy, optional
  categories: Category[];
  topics: string[];
  entities: string[];
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  whyItMatters: string[];
  importance: number;
  source: string;
  timestamp: string;
  tags: string[];
  isSaved?: boolean;
  content?: {
    en: string;
    zh: string;
  }[];
  glossary?: {
    term: string;
    definition: string;
  }[];
}

export interface Topic {
  id: string;
  category: Category;
  name: string;
  momentum: number;
  explanationZh: string;
  tags: string[];
  signalCount: number;
}

export interface WatchlistItem {
  id: string;
  name: string;
  type: 'Company' | 'Organization' | 'Stock' | 'Crypto' | 'Topic' | 'Policy' | 'Person' | 'Macro Indicator';
  status: string;
  importantUpdates: number;
  totalMentions: number;
  value?: string;
  valueTrend?: 'up' | 'down';
  description?: string;
  signals?: Signal[];
}

export interface LibraryItem {
  id: string;
  source: string;
  date: string;
  title: string;
  summaryZh: string;
  whyItMatters: string;
  tags: string[];
  notePreview?: string;
  category: string;
}
