export interface Word {
  id?: number;
  serverId?: string;
  word: string;
  context: string;
  sourceUrl: string;
  lang: string;
  savedAt: number;
  updatedAt: number;
  syncStatus: "pending" | "synced" | "conflict";
  srs: {
    ease: number;
    interval: number;
    repetitions: number;
    nextReview: number;
  };
}

export interface HistoryEntry {
  id?: number;
  url: string;
  title: string;
  domain: string;
  charsRead: number;
  timeSpentSeconds: number;
  visitedAt: number;
  syncStatus: "pending" | "synced";
}

export interface UserSettings {
  voice: string;
  rate: number;
  pitch: number;
  autoPlay: boolean;
  highlightWords: boolean;
  targetLang: string;
}

export type UserPlan = "free" | "premium";

export interface AuthState {
  accessToken: string | null;
  userId: string | null;
  email: string | null;
  plan: UserPlan;
  expiresAt: number | null;
}
