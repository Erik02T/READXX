import {
  BookOpen,
  Globe,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Save,
  Settings,
} from "lucide-react";
import { cn } from "../../shared/cn";

export type PopupSyncStatus = "synced" | "syncing" | "error" | "offline";

type ReadxxPopupProps = {
  isPlaying: boolean;
  progress: number;
  wordCount: { current: number; total: number };
  speed: number;
  voice: string;
  isPremium: boolean;
  isLoading?: boolean;
  translateResult?: string | null;
  syncStatus: PopupSyncStatus;
  pageTitle?: string;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (s: number) => void;
  onVoiceChange: (v: string) => void;
  onSaveWord: () => void;
  onTranslate: () => void;
  onOpenPanel: () => void;
  onSettings: () => void;
  onUpgrade: () => void;
};

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

const VOICE_OPTIONS = [
  { value: "browser-en", label: "English", flag: "US", type: "browser" as const },
  { value: "browser-jp", label: "Japanese", flag: "JP", type: "browser" as const },
  { value: "ai-en", label: "English AI", flag: "US", type: "ai" as const },
  { value: "ai-jp", label: "Japanese AI", flag: "JP", type: "ai" as const },
];

export function ReadxxPopup({
  isPlaying,
  progress,
  wordCount,
  speed,
  voice,
  isPremium,
  isLoading = false,
  translateResult = null,
  syncStatus,
  pageTitle = "Readxx",
  onPlay,
  onPause,
  onSpeedChange,
  onVoiceChange,
  onSaveWord,
  onTranslate,
  onOpenPanel,
  onSettings,
  onUpgrade,
}: ReadxxPopupProps): JSX.Element {
  const syncDisplay =
    syncStatus === "synced"
      ? { color: "bg-emerald-500", text: "Synced 2m ago" }
      : syncStatus === "syncing"
        ? { color: "bg-amber-500 animate-pulse", text: "Syncing..." }
        : syncStatus === "error"
          ? { color: "bg-red-500", text: "Sync failed" }
          : { color: "bg-muted-foreground", text: "Offline" };

  return (
    <div className="dark w-[360px] max-h-[500px] overflow-hidden bg-background text-foreground">
      <header className="px-4 pt-4 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">READXX</h1>
          <button
            type="button"
            onClick={onSettings}
            className="rounded-md p-1.5 transition-colors hover:bg-secondary"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <p className="truncate text-[13px] text-muted-foreground">{pageTitle}</p>
      </header>

      <section className="px-4 py-4">
        <div className="mb-5 flex items-center justify-center gap-4">
          <button
            type="button"
            className="rounded-full p-2.5 transition-colors hover:bg-secondary"
            aria-label="Back 10 seconds"
          >
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={isPlaying ? onPause : onPlay}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6 fill-current text-primary-foreground" />
            ) : (
              <Play className="ml-0.5 h-6 w-6 fill-current text-primary-foreground" />
            )}
          </button>
          <button
            type="button"
            className="rounded-full p-2.5 transition-colors hover:bg-secondary"
            aria-label="Forward 30 seconds"
          >
            <RotateCw className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="mb-5 flex items-center justify-center gap-1.5">
          {SPEED_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSpeedChange(item)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                speed === item
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {item}x
            </button>
          ))}
        </div>

        <div className="mb-2 h-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {wordCount.current.toLocaleString()} / {wordCount.total.toLocaleString()} words
        </p>
      </section>

      <section className="px-4 pb-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <label htmlFor="popup-voice-select" className="mb-2 block text-xs text-muted-foreground">
            Voice
          </label>
          <select
            id="popup-voice-select"
            value={voice}
            onChange={(event) => onVoiceChange(event.target.value)}
            className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <optgroup label="Browser (Free)">
              {VOICE_OPTIONS.filter((item) => item.type === "browser").map((item) => (
                <option key={item.value} value={item.value}>
                  {item.flag} {item.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="AI Voice (Premium)">
              {VOICE_OPTIONS.filter((item) => item.type === "ai").map((item) => (
                <option key={item.value} value={item.value} disabled={!isPremium}>
                  {item.flag} {item.label} {!isPremium ? " [locked]" : ""}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </section>

      <section className="px-4 pb-4">
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={onSaveWord}
            className="flex flex-1 items-center justify-center gap-2 border-r border-border py-2.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={onTranslate}
            className="flex flex-1 items-center justify-center gap-2 border-r border-border py-2.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Translate</span>
          </button>
          <button
            type="button"
            onClick={onOpenPanel}
            className="flex flex-1 items-center justify-center gap-2 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Study</span>
          </button>
        </div>
      </section>

      {translateResult ? (
        <section className="px-4 pb-4">
          <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-primary">Translation</div>
            <div className="text-sm text-foreground">{translateResult}</div>
          </div>
        </section>
      ) : null}

      <footer className="mt-auto border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs">
            {isPremium ? (
              <span className="font-medium text-primary">Premium plan</span>
            ) : (
              <>
                <span className="text-muted-foreground">Free plan</span>
                <span className="text-muted-foreground">.</span>
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="font-medium text-primary hover:underline"
                >
                  Upgrade
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", syncDisplay.color)} />
            <span>{syncDisplay.text}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
