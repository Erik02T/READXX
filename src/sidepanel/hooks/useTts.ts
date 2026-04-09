import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sendMessage } from "../../shared/messages";
import { db } from "../../shared/db";

type UseTtsResult = {
  isPlaying: boolean;
  progress: number;
  currentSentence: string;
  speed: number;
  voice: string;
  wordCount: number;
  onPlay: (text: string) => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => Promise<void>;
  onSpeedChange: (s: number) => Promise<void>;
};

export function useTts(): UseTtsResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSentence, setCurrentSentence] = useState("");
  const [speed, setSpeed] = useState(1);
  const [voice] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const status = await sendMessage({ type: "TTS_STATUS_REQUEST" });
        const nextPlaying = Boolean(status?.playing);
        setIsPlaying(nextPlaying);
        setProgress(Math.max(0, Math.min(100, status?.position ?? 0)));
        if (!nextPlaying) {
          stopPolling();
        }
      } catch {
        setIsPlaying(false);
        stopPolling();
      }
    }, 500);
  }, [stopPolling]);

  const onPlay = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setCurrentSentence(trimmed);
      setWordCount(trimmed.split(/\s+/g).filter(Boolean).length);
      setProgress(0);
      setIsPlaying(true);
      await sendMessage({ type: "TTS_PLAY", text: trimmed, voice, rate: speed });
      startPolling();
    },
    [speed, startPolling, voice]
  );

  const onPause = useCallback(async () => {
    await sendMessage({ type: "TTS_PAUSE" });
    setIsPlaying(false);
    stopPolling();
  }, [stopPolling]);

  const onResume = useCallback(async () => {
    await sendMessage({ type: "TTS_RESUME" });
    setIsPlaying(true);
    startPolling();
  }, [startPolling]);

  const onStop = useCallback(async () => {
    await sendMessage({ type: "TTS_STOP" });
    setIsPlaying(false);
    setProgress(0);
    stopPolling();
  }, [stopPolling]);

  const onSpeedChange = useCallback(async (s: number) => {
    setSpeed(s);
    await db.saveSettings({ rate: s });
    await sendMessage({ type: "SETTINGS_SET", settings: { rate: s } });
  }, []);

  useEffect(() => {
    void (async () => {
      const settings = await db.getSettings();
      setSpeed(settings.rate);
    })();
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      stopPolling();
    }
  }, [isPlaying, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  return useMemo(
    () => ({
      isPlaying,
      progress,
      currentSentence,
      speed,
      voice,
      wordCount,
      onPlay,
      onPause,
      onResume,
      onStop,
      onSpeedChange,
    }),
    [
      currentSentence,
      isPlaying,
      onPause,
      onPlay,
      onResume,
      onSpeedChange,
      onStop,
      progress,
      speed,
      voice,
      wordCount,
    ]
  );
}

