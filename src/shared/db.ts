import Dexie, { type Table } from "dexie";
import type { HistoryEntry, UserSettings, Word } from "./types";

export const DEFAULT_USER_SETTINGS: UserSettings = {
  voice: "",
  rate: 1.0,
  pitch: 1.0,
  autoPlay: false,
  highlightWords: true,
  targetLang: "en",
};

const USER_SETTINGS_KEY = "userSettings";

export type SettingsRow = { key: string; value: any };

export type SyncQueueRow = {
  id?: number;
  entity: string;
  entityId: number;
  operation: "create" | "update" | "delete";
  payload: any;
  createdAt: number;
};

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function isSameLocalDay(a: number, b: number): boolean {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function mergeUserSettings(base: UserSettings, patch: Partial<UserSettings>): UserSettings {
  return { ...base, ...patch };
}

export class ReadxxDB extends Dexie {
  words!: Table<Word>;
  history!: Table<HistoryEntry>;
  settings!: Table<SettingsRow>;
  syncQueue!: Table<SyncQueueRow>;

  constructor() {
    super("readxx");

    this.version(1).stores({
      words:
        "++id, serverId, word, lang, syncStatus, [lang+srs.nextReview], savedAt",
      history: "++id, url, visitedAt, domain, syncStatus, [url+visitedAt]",
      settings: "key",
      syncQueue: "++id, entity, createdAt",
    });
  }

  async getSettings(): Promise<UserSettings> {
    const row = await this.settings.get(USER_SETTINGS_KEY);
    const stored = row?.value;
    if (stored && typeof stored === "object" && stored !== null) {
      return mergeUserSettings(DEFAULT_USER_SETTINGS, stored as Partial<UserSettings>);
    }
    return { ...DEFAULT_USER_SETTINGS };
  }

  async saveSettings(s: Partial<UserSettings>): Promise<void> {
    const current = await this.getSettings();
    const next = mergeUserSettings(current, s);
    await this.settings.put({ key: USER_SETTINGS_KEY, value: next });
  }

  async getPendingWords(): Promise<Word[]> {
    return this.words.where("syncStatus").equals("pending").toArray();
  }

  async getPendingHistory(): Promise<HistoryEntry[]> {
    return this.history.where("syncStatus").equals("pending").toArray();
  }

  async getDueWords(lang?: string): Promise<Word[]> {
    const now = Date.now();
    const all = await this.words
      .filter((w) => {
        if (w.srs.nextReview > now) {
          return false;
        }
        if (lang !== undefined && w.lang !== lang) {
          return false;
        }
        return true;
      })
      .toArray();
    return all;
  }

  async upsertHistory(
    url: string,
    title: string,
    charsRead: number
  ): Promise<void> {
    const now = Date.now();
    const domain = domainFromUrl(url);

    const existing = await this.history
      .where("url")
      .equals(url)
      .filter((h) => isSameLocalDay(h.visitedAt, now))
      .first();

    if (existing?.id !== undefined) {
      await this.history.update(existing.id, {
        title,
        domain,
        charsRead: existing.charsRead + charsRead,
      });
    } else {
      await this.history.add({
        url,
        title,
        domain,
        charsRead,
        timeSpentSeconds: 0,
        visitedAt: now,
        syncStatus: "pending",
      });
    }
  }
}

export const db = new ReadxxDB();
