import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { sendMessage } from "../shared/messages";
import {
  sanitizeLanguage,
  sanitizePlainText,
  sanitizeSourceUrl,
} from "../shared/security";
import type { AuthState } from "../shared/types";
import { ReadxxPopup, type PopupSyncStatus } from "./components/ReadxxPopup";
import "./popup.css";

const DEFAULT_TITLE = "Readxx";

type ExtractedTabText = {
  text: string;
  wordCount: number;
};

type TabSelection = {
  selection: string;
  context: string;
  lang: string;
};

function estimateWordCount(text: string): number {
  return text.split(/\s+/g).filter(Boolean).length;
}

function normalizeProgress(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

function normalizeWordCount(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  if (value <= 0) {
    return null;
  }
  return Math.floor(value);
}

function normalizeTranslateResult(value: unknown): string | null {
  if (typeof value === "string") {
    const text = sanitizePlainText(value, 1200);
    return text || null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const translation = sanitizePlainText(String(record.translation ?? ""), 1200);
    if (translation) {
      return translation;
    }
    const result = sanitizePlainText(String(record.result ?? ""), 1200);
    if (result) {
      return result;
    }
  }

  return null;
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

async function requestContentExtractText(tabId: number): Promise<ExtractedTabText | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "READXX_EXTRACT_TEXT",
    });
    if (!response || typeof response !== "object") {
      return null;
    }
    const record = response as Record<string, unknown>;
    const text = sanitizePlainText(String(record.text ?? ""), 6000);
    if (!text) {
      return null;
    }
    const wordCount = normalizeWordCount(record.wordCount) ?? estimateWordCount(text);
    return { text, wordCount };
  } catch {
    return null;
  }
}

async function extractTabTextWithScript(tabId: number): Promise<ExtractedTabText | null> {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const text = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
        const limited = text.slice(0, 6000);
        const wordCount = limited ? limited.split(/\s+/g).filter(Boolean).length : 0;
        return { text: limited, wordCount };
      },
    });
    const payload = result[0]?.result;
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const record = payload as Record<string, unknown>;
    const text = sanitizePlainText(String(record.text ?? ""), 6000);
    if (!text) {
      return null;
    }
    const wordCount = normalizeWordCount(record.wordCount) ?? estimateWordCount(text);
    return { text, wordCount };
  } catch {
    return null;
  }
}

async function getSelectionFromActiveTab(tabId: number): Promise<TabSelection | null> {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const selection = window.getSelection();
        const selectedText = (selection?.toString() ?? "").replace(/\s+/g, " ").trim();
        let context = selectedText;
        if (selection && selection.rangeCount > 0) {
          const nodeText = selection.anchorNode?.textContent ?? selectedText;
          const offset = Math.max(0, selection.anchorOffset ?? 0);
          const start = Math.max(0, offset - 120);
          const end = Math.min(nodeText.length, offset + 120);
          context = nodeText.slice(start, end).replace(/\s+/g, " ").trim() || selectedText;
        }
        const lang = (document.documentElement.lang || navigator.language || "en")
          .toLowerCase()
          .trim();
        return { selection: selectedText, context, lang };
      },
    });
    const payload = result[0]?.result;
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const record = payload as Record<string, unknown>;
    const selection = sanitizePlainText(String(record.selection ?? ""), 120);
    if (!selection) {
      return null;
    }
    const context = sanitizePlainText(String(record.context ?? selection), 1200);
    const lang = sanitizeLanguage(String(record.lang ?? "en"), "en");
    return {
      selection,
      context: context || selection,
      lang,
    };
  } catch {
    return null;
  }
}

export function Popup(): JSX.Element {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [wordCount, setWordCount] = useState({ current: 0, total: 0 });
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState("browser-en");
  const [pageTitle, setPageTitle] = useState(DEFAULT_TITLE);
  const [syncStatus, setSyncStatus] = useState<PopupSyncStatus>("synced");
  const [isLoading, setIsLoading] = useState(false);
  const [translateResult, setTranslateResult] = useState<string | null>(null);

  const totalWordsRef = useRef(0);
  useEffect(() => {
    totalWordsRef.current = wordCount.total;
  }, [wordCount.total]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      try {
        const auth = await sendMessage({ type: "AUTH_STATUS" });
        if (!cancelled && auth) {
          setAuthState(auth);
        }
      } catch {
        if (!cancelled) {
          setAuthState({
            accessToken: null,
            userId: null,
            email: null,
            plan: "free",
            expiresAt: null,
          });
        }
      }

      try {
        const settings = await sendMessage({ type: "SETTINGS_GET" });
        if (!cancelled && settings) {
          if (typeof settings.rate === "number") {
            setSpeed(settings.rate);
          }
          if (typeof settings.voice === "string" && settings.voice.trim()) {
            setVoice(settings.voice.trim());
          }
        }
      } catch {
        // Ignore popup bootstrap setting errors.
      }

      try {
        const activeTab = await getActiveTab();
        if (!cancelled && activeTab?.title?.trim()) {
          setPageTitle(activeTab.title.trim());
        }
      } catch {
        if (!cancelled) {
          setPageTitle(DEFAULT_TITLE);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pollId = window.setInterval(() => {
      void (async () => {
        try {
          const status = (await sendMessage({ type: "TTS_STATUS_REQUEST" })) as
            | Record<string, unknown>
            | undefined;

          const nextPlaying = Boolean(status?.playing);
          const nextProgress = normalizeProgress(status?.position);
          const statusTotalWords =
            normalizeWordCount(status?.wordCount) ??
            normalizeWordCount(status?.totalWords);
          const statusCurrentWords =
            normalizeWordCount(status?.currentWordCount) ??
            normalizeWordCount(status?.currentWords);

          setIsPlaying(nextPlaying);
          setProgress(nextProgress);
          setWordCount((previous) => {
            const total = statusTotalWords ?? previous.total ?? totalWordsRef.current;
            const estimatedCurrent =
              statusCurrentWords ?? Math.round((nextProgress / 100) * Math.max(total, 0));
            const boundedCurrent = Math.max(
              0,
              total > 0 ? Math.min(estimatedCurrent, total) : estimatedCurrent
            );
            return {
              current: boundedCurrent,
              total: Math.max(0, total),
            };
          });
        } catch {
          setIsPlaying(false);
        }
      })();
    }, 500);

    return () => {
      window.clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const applySyncStatus = (lastSyncAt: unknown): void => {
      if (disposed) {
        return;
      }
      if (!navigator.onLine) {
        setSyncStatus("offline");
        return;
      }
      if (typeof lastSyncAt === "number" && Number.isFinite(lastSyncAt) && lastSyncAt > 0) {
        setSyncStatus("synced");
        return;
      }
      setSyncStatus("syncing");
    };

    void chrome.storage.local
      .get("lastSyncAt")
      .then((result) => applySyncStatus(result.lastSyncAt))
      .catch(() => {
        if (!disposed) {
          setSyncStatus(navigator.onLine ? "synced" : "offline");
        }
      });

    const onStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ): void => {
      if (areaName !== "local" || !changes.lastSyncAt) {
        return;
      }
      applySyncStatus(changes.lastSyncAt.newValue);
    };

    const onOnline = (): void => {
      void chrome.storage.local
        .get("lastSyncAt")
        .then((result) => applySyncStatus(result.lastSyncAt))
        .catch(() => {
          if (!disposed) {
            setSyncStatus("synced");
          }
        });
    };

    const onOffline = (): void => {
      if (!disposed) {
        setSyncStatus("offline");
      }
    };

    chrome.storage.onChanged.addListener(onStorageChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      disposed = true;
      chrome.storage.onChanged.removeListener(onStorageChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const onPlay = useCallback((): void => {
    void (async () => {
      setIsLoading(true);
      setTranslateResult(null);
      try {
        const activeTab = await getActiveTab();
        if (!activeTab?.id) {
          return;
        }

        const fromContent = await requestContentExtractText(activeTab.id);
        const extracted = fromContent ?? (await extractTabTextWithScript(activeTab.id));
        const text = sanitizePlainText(
          extracted?.text ?? activeTab.title ?? DEFAULT_TITLE,
          6000
        );
        if (!text) {
          return;
        }

        const totalWords = extracted?.wordCount ?? estimateWordCount(text);
        setWordCount({
          current: 0,
          total: Math.max(0, totalWords),
        });
        setProgress(0);

        await sendMessage({
          type: "TTS_PLAY",
          text,
          voice,
          rate: speed,
        });
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [speed, voice]);

  const onPause = useCallback((): void => {
    void (async () => {
      try {
        await sendMessage({ type: "TTS_PAUSE" });
      } finally {
        setIsPlaying(false);
      }
    })();
  }, []);

  const onSpeedChange = useCallback((nextSpeed: number): void => {
    setSpeed(nextSpeed);
    void sendMessage({ type: "SETTINGS_SET", settings: { rate: nextSpeed } }).catch(() => {
      setSyncStatus("error");
    });
  }, []);

  const onVoiceChange = useCallback((nextVoice: string): void => {
    setVoice(nextVoice);
    void sendMessage({ type: "SETTINGS_SET", settings: { voice: nextVoice } }).catch(() => {
      setSyncStatus("error");
    });
  }, []);

  const onSaveWord = useCallback((): void => {
    void (async () => {
      try {
        const activeTab = await getActiveTab();
        if (!activeTab?.id) {
          return;
        }

        const selection = await getSelectionFromActiveTab(activeTab.id);
        if (!selection?.selection) {
          return;
        }

        const url = sanitizeSourceUrl(activeTab.url ?? "");
        if (!url) {
          return;
        }

        setSyncStatus("syncing");
        await sendMessage({
          type: "WORD_SAVE",
          word: selection.selection,
          context: selection.context,
          url,
          lang: sanitizeLanguage(selection.lang, "en"),
        });
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    })();
  }, []);

  const onTranslate = useCallback((): void => {
    void (async () => {
      try {
        const activeTab = await getActiveTab();
        if (!activeTab?.id) {
          setTranslateResult("No active tab.");
          return;
        }

        const selection = await getSelectionFromActiveTab(activeTab.id);
        if (!selection?.selection) {
          setTranslateResult("Select text on the page first.");
          return;
        }

        const response = await sendMessage({
          type: "TRANSLATE",
          text: selection.selection,
          sourceLang: "auto",
          targetLang: "en",
        });
        setTranslateResult(
          normalizeTranslateResult(response) ?? "No translation returned."
        );
      } catch {
        setTranslateResult("Translate failed.");
      }
    })();
  }, []);

  const onOpenPanel = useCallback((): void => {
    void (async () => {
      try {
        const activeTab = await getActiveTab();
        if (activeTab?.windowId !== undefined) {
          await chrome.sidePanel.open({ windowId: activeTab.windowId });
        }
      } catch {
        // Ignore side panel open errors from popup.
      }
    })();
  }, []);

  const onSettings = useCallback((): void => {
    void chrome.runtime.openOptionsPage();
  }, []);

  const onUpgrade = useCallback((): void => {
    void chrome.tabs.create({ url: "https://readxx.app/upgrade" });
  }, []);

  return (
    <ReadxxPopup
      isPlaying={isPlaying}
      isLoading={isLoading}
      progress={progress}
      wordCount={wordCount}
      speed={speed}
      voice={voice}
      isPremium={authState?.plan === "premium"}
      translateResult={translateResult}
      syncStatus={syncStatus}
      pageTitle={pageTitle}
      onPlay={onPlay}
      onPause={onPause}
      onSpeedChange={onSpeedChange}
      onVoiceChange={onVoiceChange}
      onSaveWord={onSaveWord}
      onTranslate={onTranslate}
      onOpenPanel={onOpenPanel}
      onSettings={onSettings}
      onUpgrade={onUpgrade}
    />
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element for popup mount.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);

