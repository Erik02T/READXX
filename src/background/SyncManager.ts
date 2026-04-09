import type { HistoryEntry, Word } from "../shared/types";
import type { ReadxxDB } from "../shared/db";
import type { ApiClient } from "./ApiClient";

type PulledItem =
  | { kind: "word"; payload: Word }
  | { kind: "history"; payload: HistoryEntry }
  | { entity: "word"; payload: Word }
  | { entity: "history"; payload: HistoryEntry }
  | any;

const LAST_SYNC_KEY = "lastSyncTimestamp";

function sameLocalDay(a: number, b: number): boolean {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export class SyncManager {
  private readonly apiClient: ApiClient;
  private readonly db: ReadxxDB;

  constructor(apiClient: ApiClient, db: ReadxxDB) {
    this.apiClient = apiClient;
    this.db = db;
  }

  async sync(): Promise<void> {
    const pendingWords = await this.db.getPendingWords();
    const pendingHistory = await this.db.getPendingHistory();

    const lastSync = await chrome.storage.local.get(LAST_SYNC_KEY);
    const lastSyncTimestamp =
      typeof lastSync[LAST_SYNC_KEY] === "number" ? lastSync[LAST_SYNC_KEY] : 0;

    const changes = [
      ...pendingWords.map((w) => ({ kind: "word", payload: w })),
      ...pendingHistory.map((h) => ({ kind: "history", payload: h })),
    ];

    await this.apiClient.syncPush(changes);

    const pulled = await this.apiClient.syncPull(lastSyncTimestamp);
    const now = Date.now();

    for (const item of pulled as PulledItem[]) {
      const kind = (item as any).kind ?? (item as any).entity ?? (item as any).type;
      const payload = (item as any).payload ?? item;
      if (!kind || !payload) continue;

      if (kind === "word") {
        const word = payload as Word;
        if (!word.serverId) continue;

        const existing = await this.db.words
          .where("serverId")
          .equals(word.serverId)
          .first();

        if (existing?.id !== undefined) {
          await this.db.words.update(existing.id, {
            ...word,
            syncStatus: "synced",
            updatedAt: now,
          });
        } else {
          await this.db.words.add({
            ...word,
            syncStatus: "synced",
            updatedAt: word.updatedAt ?? now,
          });
        }
      }

      if (kind === "history") {
        const history = payload as HistoryEntry;
        const url = history.url;
        const visitedAt = history.visitedAt;

        const existing = await this.db.history
          .where("url")
          .equals(url)
          .filter((h) => sameLocalDay(h.visitedAt, visitedAt))
          .first();

        if (existing?.id !== undefined) {
          await this.db.history.update(existing.id, {
            ...history,
            syncStatus: "synced",
          });
        } else {
          await this.db.history.add({
            ...history,
            syncStatus: "synced",
          });
        }
      }
    }

    await chrome.storage.local.set({ [LAST_SYNC_KEY]: now });

    // Mark all items we attempted to sync as synced.
    await Promise.all(
      pendingWords.map((w) => {
        if (w.id === undefined) return Promise.resolve();
        return this.db.words.update(w.id, { syncStatus: "synced", updatedAt: now });
      })
    );
    await Promise.all(
      pendingHistory.map((h) => {
        if (h.id === undefined) return Promise.resolve();
        return this.db.history.update(h.id, { syncStatus: "synced" });
      })
    );
  }
}

