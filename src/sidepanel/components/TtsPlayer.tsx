import { useMemo, useState } from "react";
import { Bookmark, ChevronDown, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { cn } from "../../shared/cn";

export type Article = {
  title: string;
  domain: string;
  faviconUrl: string;
  wordCount: number;
  estimatedMinutes: number;
};

export type Voice = {
  id: string;
  name: string;
  lang: string;
  isPremium: boolean;
};

type TtsPlayerProps = {
  article: Article;
  progress: number;
  currentSentence: string;
  isPlaying: boolean;
  speed: number;
  volume: number;
  voice: Voice;
  recentWords: string[];
  textToPlay: string;
  onTextToPlayChange: (text: string) => void;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onVoiceChange: (voice: Voice) => void;
  onWordSave: (word: string) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
};

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

const PREMIUM_VOICES: Voice[] = [
  { id: "alloy", name: "Alloy", lang: "en-US", isPremium: true },
  { id: "echo", name: "Echo", lang: "en-US", isPremium: true },
  { id: "nova", name: "Nova", lang: "en-US", isPremium: true },
  { id: "shimmer", name: "Shimmer", lang: "en-US", isPremium: true },
];

const WAVEFORM_HEIGHTS = [
  28, 35, 42, 30, 45, 38, 32, 48, 25, 40, 33, 50, 27, 43, 36, 29, 47, 31, 44, 26,
  39, 34, 49, 28, 41, 37, 30, 46, 32, 42, 35, 48, 27, 44, 38, 31, 45, 29, 40, 33,
];

function WaveformProgress({ progress }: { progress: number }): JSX.Element {
  const bars = 40;
  const progressIndex = Math.floor((progress / 100) * bars);

  return (
    <div className="flex h-16 items-end justify-center gap-0.5 px-2">
      {Array.from({ length: bars }).map((_, index) => {
        const height = WAVEFORM_HEIGHTS[index];
        const isActive = index <= progressIndex;
        return (
          <div
            key={index}
            className={cn("w-1.5 rounded-full transition-all duration-150", isActive ? "bg-primary" : "bg-muted")}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}

function formatWordCount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getFlagCode(lang: string): string {
  const flags: Record<string, string> = {
    "en-US": "US",
    "en-GB": "GB",
    "pt-BR": "BR",
    "es-ES": "ES",
    "fr-FR": "FR",
    "de-DE": "DE",
    "ja-JP": "JP",
  };
  return flags[lang] ?? "US";
}

export function TtsPlayer({
  article,
  progress,
  currentSentence,
  isPlaying,
  speed,
  volume,
  voice,
  recentWords,
  textToPlay,
  onTextToPlayChange,
  onPlay,
  onPause,
  onSpeedChange,
  onVolumeChange,
  onVoiceChange,
  onWordSave,
  onSkipBack,
  onSkipForward,
}: TtsPlayerProps): JSX.Element {
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [isPremiumMode, setIsPremiumMode] = useState(voice.isPremium);

  const progressRounded = useMemo(() => Math.max(0, Math.min(100, Math.round(progress))), [progress]);

  const handleWordSave = (): void => {
    const normalized = wordInput.trim();
    if (!normalized) return;
    onWordSave(normalized);
    setWordInput("");
  };

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div className="border-b border-border p-4">
        <div className="mb-2 flex items-center gap-2">
          {article.faviconUrl ? (
            <img src={article.faviconUrl} alt="" className="h-4 w-4 rounded-full" />
          ) : (
            <div className="h-4 w-4 rounded-full bg-muted" />
          )}
          <span className="truncate text-sm text-muted-foreground">{article.domain}</span>
        </div>
        <h2 className="mb-2 text-[15px] font-bold leading-tight text-foreground">{article.title}</h2>
        <p className="text-xs text-muted-foreground">
          ~{article.estimatedMinutes} min . {formatWordCount(article.wordCount)} words
        </p>
      </div>

      <div className="border-b border-border p-4">
        <label htmlFor="tts-text-area" className="mb-2 block text-xs font-medium text-muted-foreground">
          Text to play
        </label>
        <textarea
          id="tts-text-area"
          rows={4}
          value={textToPlay}
          onChange={(event) => onTextToPlayChange(event.target.value)}
          placeholder="Paste text to read with TTS..."
          className="w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm outline-none ring-0 transition focus:border-ring"
        />
      </div>

      <div className="border-b border-border p-4">
        <WaveformProgress progress={progressRounded} />
        <div className="mt-3 flex items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{progressRounded}%</span>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-card p-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {currentSentence || "Play text to see the current spoken segment."}
          </p>
        </div>
      </div>

      <div className="border-b border-border p-4">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onSkipBack}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={isPlaying ? onPause : onPlay}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
          <button
            type="button"
            onClick={onSkipForward}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Forward"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSpeedChange(option)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                speed === option
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {option}x
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 px-2">
          <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            className="h-1.5 w-full accent-primary"
          />
        </div>
      </div>

      <div className="border-b border-border">
        <button
          type="button"
          onClick={() => setVoicePanelOpen((current) => !current)}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-card/50"
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{getFlagCode(voice.lang)}</span>
            <span className="text-sm font-medium text-foreground">{voice.name}</span>
            {voice.isPremium && (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Premium
              </span>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", voicePanelOpen && "rotate-180")} />
        </button>

        {voicePanelOpen && (
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPremiumMode(false)}
                className={cn(
                  "flex-1 rounded-md py-2 text-xs font-medium transition-colors",
                  !isPremiumMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}
              >
                Browser
              </button>
              <button
                type="button"
                onClick={() => setIsPremiumMode(true)}
                className={cn(
                  "flex-1 rounded-md py-2 text-xs font-medium transition-colors",
                  isPremiumMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}
              >
                AI premium
              </button>
            </div>
            {isPremiumMode ? (
              <div className="grid grid-cols-2 gap-2">
                {PREMIUM_VOICES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onVoiceChange(item)}
                    className={cn(
                      "rounded-md border p-2 text-sm font-medium transition-colors",
                      voice.id === item.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
                Browser voice selected. Voice settings are managed by your browser engine.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={wordInput}
            onChange={(event) => setWordInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleWordSave();
              }
            }}
            placeholder="Save a word..."
            className="h-8 flex-1 rounded-md border border-input bg-card px-3 text-sm outline-none transition focus:border-ring"
          />
          <button
            type="button"
            onClick={handleWordSave}
            disabled={!wordInput.trim()}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
        {recentWords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recentWords.slice(0, 4).map((word, index) => (
              <span
                key={`${word}-${index}`}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {word}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
