import type { ExtMessage } from "../shared/messages";
import type { UserSettings, Word } from "../shared/types";
import { db } from "../shared/db";
import {
  clampNumber,
  isHttpUrl,
  sanitizeEmail,
  sanitizeLanguage,
  sanitizePlainText,
  sanitizeSourceUrl,
} from "../shared/security";
import { AuthManager } from "./AuthManager";
import { ApiClient } from "./ApiClient";
import { SyncManager } from "./SyncManager";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const EXTENSION_BASE = `chrome-extension://${chrome.runtime.id}/`;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS: Partial<Record<ExtMessage["type"], number>> = {
  TTS_PLAY: 20,
  TRANSLATE: 30,
  EXPLAIN: 30,
  OCR_REQUEST: 8,
  AUTH_LOGIN: 10,
};

type RateLimitState = { startedAt: number; count: number };

const rateLimiter = new Map<string, RateLimitState>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractPayload(record: Record<string, unknown>): Record<string, unknown> {
  const payload = record.payload;
  return isRecord(payload) ? payload : record;
}

function sanitizePassword(value: unknown): string {
  if (typeof value !== "string") return "";
  if (value.length < 1 || value.length > 128) return "";
  if (CONTROL_CHARS.test(value)) return "";
  return value;
}

function normalizeSettingsPatch(raw: unknown): Partial<UserSettings> {
  if (!isRecord(raw)) return {};

  const out: Partial<UserSettings> = {};
  if (typeof raw.voice === "string") {
    out.voice = sanitizePlainText(raw.voice, 32);
  }
  if (typeof raw.rate === "number") {
    out.rate = clampNumber(raw.rate, 0.5, 2, 1);
  }
  if (typeof raw.pitch === "number") {
    out.pitch = clampNumber(raw.pitch, 0.5, 2, 1);
  }
  if (typeof raw.autoPlay === "boolean") {
    out.autoPlay = raw.autoPlay;
  }
  if (typeof raw.highlightWords === "boolean") {
    out.highlightWords = raw.highlightWords;
  }
  if (typeof raw.targetLang === "string") {
    out.targetLang = sanitizeLanguage(raw.targetLang, "en");
  }
  return out;
}

function normalizeMessage(raw: unknown): ExtMessage | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;
  const type = raw.type as ExtMessage["type"];
  const payload = extractPayload(raw);

  switch (type) {
    case "AUTH_LOGIN": {
      const email = sanitizeEmail(payload.email);
      const password = sanitizePassword(payload.password);
      if (!email || !password) return null;
      return { type, email, password };
    }
    case "AUTH_LOGOUT":
    case "AUTH_STATUS":
    case "SYNC_NOW":
    case "SETTINGS_GET":
    case "TTS_PAUSE":
    case "TTS_RESUME":
    case "TTS_STOP":
    case "TTS_STATUS_REQUEST":
      return { type };
    case "WORD_SAVE": {
      const word = sanitizePlainText(payload.word, 120);
      const context = sanitizePlainText(payload.context, 1200);
      const url = sanitizeSourceUrl(payload.url);
      const lang = sanitizeLanguage(payload.lang, "en");
      if (!word || !url) return null;
      return { type, word, context, url, lang };
    }
    case "WORD_DELETE": {
      const localId = Number(payload.localId);
      if (!Number.isInteger(localId) || localId <= 0) return null;
      return { type, localId };
    }
    case "TRANSLATE": {
      const text = sanitizePlainText(payload.text, 4000);
      if (!text) return null;
      return {
        type,
        text,
        sourceLang: sanitizeLanguage(payload.sourceLang, "auto"),
        targetLang: sanitizeLanguage(payload.targetLang, "en"),
      };
    }
    case "EXPLAIN": {
      const word = sanitizePlainText(payload.word, 120);
      if (!word) return null;
      return {
        type,
        word,
        context: sanitizePlainText(payload.context, 800),
        lang: sanitizeLanguage(payload.lang, "en"),
      };
    }
    case "TTS_PLAY": {
      const text = sanitizePlainText(payload.text, 6000);
      if (!text) return null;
      return {
        type,
        text,
        voice: sanitizePlainText(payload.voice, 24),
        rate: clampNumber(payload.rate, 0.5, 2, 1),
      };
    }
    case "OCR_REQUEST": {
      const imageDataUrl =
        typeof payload.imageDataUrl === "string" ? payload.imageDataUrl.trim() : "";
      if (!imageDataUrl.startsWith("data:image/")) return null;
      if (imageDataUrl.length > 14_000_000) return null;
      return {
        type,
        imageDataUrl,
        lang: sanitizeLanguage(payload.lang, "en"),
      };
    }
    case "OCR_RESULT": {
      const jobId = sanitizePlainText(payload.jobId, 128);
      if (!jobId) return null;
      return { type, jobId };
    }
    case "SETTINGS_SET":
      return { type, settings: normalizeSettingsPatch(payload.settings) };
    default:
      return null;
  }
}

function isTrustedSender(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id) return false;
  if (!sender.url) return true;
  if (sender.url.startsWith(EXTENSION_BASE)) return true;
  return isHttpUrl(sender.url);
}

function senderCanUseMessage(
  sender: chrome.runtime.MessageSender,
  messageType: ExtMessage["type"]
): boolean {
  const senderUrl = sender.url ?? "";
  const extensionPageSender = !senderUrl || senderUrl.startsWith(EXTENSION_BASE);
  if (extensionPageSender) return true;

  // Content scripts run on web pages. Keep this allowlist minimal.
  const contentScriptAllowed = new Set<ExtMessage["type"]>([
    "TTS_PLAY",
    "TTS_PAUSE",
    "TTS_RESUME",
    "TTS_STOP",
    "TTS_STATUS_REQUEST",
    "WORD_SAVE",
    "TRANSLATE",
    "EXPLAIN",
    "SETTINGS_GET",
    "SETTINGS_SET",
  ]);
  return contentScriptAllowed.has(messageType);
}

function withinRateLimit(
  sender: chrome.runtime.MessageSender,
  messageType: ExtMessage["type"]
): boolean {
  const limit = RATE_LIMITS[messageType];
  if (!limit) return true;

  const senderKey =
    sender.documentId ??
    (typeof sender.tab?.id === "number" ? `tab:${sender.tab.id}` : sender.url ?? "extension");
  const key = `${senderKey}:${messageType}`;
  const now = Date.now();
  const existing = rateLimiter.get(key);

  if (!existing || now - existing.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimiter.set(key, { startedAt: now, count: 1 });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

function buildWordFromMessage(message: Extract<ExtMessage, { type: "WORD_SAVE" }>): Word {
  const now = Date.now();
  return {
    word: message.word,
    context: message.context,
    sourceUrl: message.url,
    lang: message.lang,
    savedAt: now,
    updatedAt: now,
    syncStatus: "pending",
    srs: {
      ease: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: now,
    },
  };
}

async function routeMessage(
  message: ExtMessage,
  authManager: AuthManager,
  apiClient: ApiClient,
  syncManager: SyncManager
): Promise<unknown> {
  switch (message.type) {
    case "AUTH_LOGIN": {
      const state = await apiClient.login(message.email, message.password);
      await authManager.setAuthState(state);
      return state;
    }
    case "AUTH_LOGOUT": {
      await apiClient.logout();
      await authManager.clearAuth();
      return;
    }
    case "AUTH_STATUS": {
      return authManager.getAuthState();
    }
    case "WORD_SAVE": {
      const word = buildWordFromMessage(message);
      const localId = await db.words.add(word);

      // Fire-and-forget: update the local record with serverId once saved.
      void apiClient
        .saveWord({
          word: message.word,
          context: message.context,
          url: message.url,
          lang: message.lang,
        })
        .then(async (result) => {
          await db.words.update(localId, {
            serverId: result.serverId,
            updatedAt: Date.now(),
          });
        })
        .catch(() => {
          console.warn("saveWord sync failed");
        });

      return;
    }
    case "WORD_DELETE": {
      await db.words.delete(message.localId);
      return;
    }
    case "SYNC_NOW": {
      await syncManager.sync();
      return;
    }
    case "TRANSLATE":
      return apiClient.translate(message.text, message.sourceLang, message.targetLang);
    case "EXPLAIN":
      return apiClient.explain(message.word, message.context, message.lang);
    case "SETTINGS_GET":
      return db.getSettings();
    case "SETTINGS_SET":
      await db.saveSettings(message.settings);
      return;
    case "TTS_PLAY":
    case "TTS_PAUSE":
    case "TTS_RESUME":
    case "TTS_STOP":
    case "TTS_STATUS_REQUEST":
    case "OCR_REQUEST":
    case "OCR_RESULT":
      return;
    default:
      return;
  }
}

const authManager = new AuthManager();
const apiClient = new ApiClient(authManager);
const syncManager = new SyncManager(apiClient, db);

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms
    .create("sync", { periodInMinutes: 5 })
    .catch?.(() => {
      // Ignore if alarm exists.
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "sync") return;
  void (async () => {
    const token = await authManager.getAccessToken();
    if (!token) return;

    try {
      await syncManager.sync();
    } catch {
      console.warn("sync failed");
    }
  })();
});

chrome.runtime.onMessage.addListener((rawMessage: unknown, sender, sendResponse) => {
  const message = normalizeMessage(rawMessage);
  if (!message || !isTrustedSender(sender) || !senderCanUseMessage(sender, message.type)) {
    sendResponse(undefined);
    return false;
  }

  if (!withinRateLimit(sender, message.type)) {
    sendResponse(undefined);
    return false;
  }

  void (async () => {
    try {
      const result = await routeMessage(message, authManager, apiClient, syncManager);
      sendResponse(result);
    } catch {
      console.error("message routing failed");
      sendResponse(undefined);
    }
  })();

  // Keep the message channel open for async responses.
  return true;
});

