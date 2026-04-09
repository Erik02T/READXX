import { useEffect, useMemo, useState } from "react";
import { sendMessage } from "../shared/messages";
import { ReadxxPopup, type PopupSyncStatus } from "./components/ReadxxPopup";

const DEFAULT_TITLE = "Readxx";

function toWordEstimate(value: string): number {
  return value.split(/\s+/g).filter(Boolean).length;
}

export function PopupApp(): JSX.Element {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState("browser-en");
  const [isPremium, setIsPremium] = useState(false);
  const [syncStatus, setSyncStatus] = useState<PopupSyncStatus>("synced");
  const [pageTitle, setPageTitle] = useState(DEFAULT_TITLE);

  useEffect(() => {
    void (async () => {
      try {
        const settings = await sendMessage({ type: "SETTINGS_GET" });
        if (settings?.rate) {
          setSpeed(settings.rate);
        }
        if (settings?.voice) {
          setVoice(settings.voice);
        }
      } catch {
        // Ignore popup boot errors.
      }

      try {
        const auth = await sendMessage({ type: "AUTH_STATUS" });
        setIsPremium(auth?.plan === "premium");
      } catch {
        setIsPremium(false);
      }

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.title?.trim()) {
          setPageTitle(tab.title.trim());
        }
      } catch {
        setPageTitle(DEFAULT_TITLE);
      }
    })();
  }, []);

  useEffect(() => {
    const updateFromConnectivity = (): void => {
      if (!navigator.onLine) {
        setSyncStatus("offline");
        return;
      }
      setSyncStatus("synced");
    };

    window.addEventListener("online", updateFromConnectivity);
    window.addEventListener("offline", updateFromConnectivity);
    updateFromConnectivity();

    return () => {
      window.removeEventListener("online", updateFromConnectivity);
      window.removeEventListener("offline", updateFromConnectivity);
    };
  }, []);

  useEffect(() => {
    const poll = window.setInterval(() => {
      void (async () => {
        try {
          const status = await sendMessage({ type: "TTS_STATUS_REQUEST" });
          setIsPlaying(Boolean(status?.playing));
          setProgress(Math.max(0, Math.min(100, status?.position ?? 0)));
        } catch {
          setIsPlaying(false);
        }
      })();
    }, 1500);
    return () => window.clearInterval(poll);
  }, []);

  const wordCount = useMemo(() => {
    const total = Math.max(1, toWordEstimate(pageTitle) * 30);
    const current = Math.max(0, Math.round((progress / 100) * total));
    return { current, total };
  }, [pageTitle, progress]);

  const onPlay = async (): Promise<void> => {
    setIsPlaying(true);
    setSyncStatus("syncing");
    try {
      await sendMessage({
        type: "TTS_PLAY",
        text: pageTitle,
        voice,
        rate: speed,
      });
      setSyncStatus("synced");
    } catch {
      setIsPlaying(false);
      setSyncStatus("error");
    }
  };

  const onPause = async (): Promise<void> => {
    setIsPlaying(false);
    try {
      await sendMessage({ type: "TTS_PAUSE" });
    } catch {
      setSyncStatus("error");
    }
  };

  const onSpeedChange = (nextSpeed: number): void => {
    setSpeed(nextSpeed);
    setSyncStatus("syncing");
    void sendMessage({ type: "SETTINGS_SET", settings: { rate: nextSpeed } })
      .then(() => setSyncStatus("synced"))
      .catch(() => setSyncStatus("error"));
  };

  const onVoiceChange = (nextVoice: string): void => {
    setVoice(nextVoice);
    setSyncStatus("syncing");
    void sendMessage({ type: "SETTINGS_SET", settings: { voice: nextVoice } })
      .then(() => setSyncStatus("synced"))
      .catch(() => setSyncStatus("error"));
  };

  const onSaveWord = (): void => {
    const fallbackWord = pageTitle.split(" ").filter(Boolean)[0] ?? "readxx";
    void sendMessage({
      type: "WORD_SAVE",
      word: fallbackWord,
      context: pageTitle,
      url: "about:blank",
      lang: "en",
    }).catch(() => {
      setSyncStatus("error");
    });
  };

  const onTranslate = (): void => {
    void sendMessage({
      type: "TRANSLATE",
      text: pageTitle,
      sourceLang: "auto",
      targetLang: "en",
    }).catch(() => {
      setSyncStatus("error");
    });
  };

  const onOpenPanel = (): void => {
    void (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id !== undefined) {
          await chrome.sidePanel.open({ tabId: tab.id });
        }
      } catch {
        // No-op.
      }
    })();
  };

  const onSettings = (): void => {
    void onOpenPanel();
  };

  const onUpgrade = (): void => {
    void chrome.tabs.create({ url: "https://readxx.app" });
  };

  return (
    <ReadxxPopup
      isPlaying={isPlaying}
      progress={progress}
      wordCount={wordCount}
      speed={speed}
      voice={voice}
      isPremium={isPremium}
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
