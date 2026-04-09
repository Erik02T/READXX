import { Crown, ExternalLink } from "lucide-react";

export type ReadingHistoryEntry = {
  id: number;
  url: string;
  title: string;
  domain: string;
  faviconUrl: string;
  charsRead: number;
  timeSpentSeconds: number;
  visitedAt: number;
  totalChars?: number;
};

type Stats = {
  totalChars: number;
  streak: number;
  weeklyChars: number;
};

type ReadingHistoryProps = {
  entries: ReadingHistoryEntry[];
  stats: Stats;
  isPremium: boolean;
  onOpenUrl: (url: string) => void;
  onUpgrade: () => void;
};

function formatChars(chars: number): string {
  if (chars >= 1_000_000) {
    return `${(chars / 1_000_000).toFixed(1)}M`;
  }
  if (chars >= 1_000) {
    return `${(chars / 1_000).toFixed(1)}k`;
  }
  return String(chars);
}

function formatTime(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "<1 min";
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }
  return `${minutes} min`;
}

function dateGroup(timestamp: number, baseTimestamp?: number): string {
  const date = new Date(timestamp);
  const now = baseTimestamp ? new Date(baseTimestamp) : new Date();

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterday = new Date(today.getTime() - 86400000);
  const entryDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  if (entryDate.getTime() === today.getTime()) return "Today";
  if (entryDate.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDay(entries: ReadingHistoryEntry[]): Map<string, ReadingHistoryEntry[]> {
  const groups = new Map<string, ReadingHistoryEntry[]>();
  const sorted = [...entries].sort((a, b) => b.visitedAt - a.visitedAt);

  for (const entry of sorted) {
    const key = dateGroup(entry.visitedAt);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)?.push(entry);
  }

  return groups;
}

function progress(entry: ReadingHistoryEntry): number {
  if (!entry.totalChars || entry.totalChars === 0) return 100;
  return Math.min(100, Math.round((entry.charsRead / entry.totalChars) * 100));
}

function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-secondary/50 px-3 py-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function HistoryItem({
  entry,
  onOpenUrl,
}: {
  entry: ReadingHistoryEntry;
  onOpenUrl: (url: string) => void;
}): JSX.Element {
  const completion = progress(entry);

  return (
    <div className="group flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/50">
      <div className="flex min-w-0 flex-1 gap-2.5">
        <img
          src={entry.faviconUrl}
          alt=""
          className="mt-0.5 h-4 w-4 shrink-0 rounded"
          onError={(event) => {
            event.currentTarget.src = `https://www.google.com/s2/favicons?domain=${entry.domain}&sz=32`;
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground">{entry.domain}</p>
          <p className="truncate text-sm text-muted-foreground">{entry.title}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatChars(entry.charsRead)} chars</span>
          <span className="text-border">.</span>
          <span>{formatTime(entry.timeSpentSeconds)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {completion}% read
          </span>
          <button
            type="button"
            onClick={() => onOpenUrl(entry.url)}
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
            aria-label="Open page"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UpgradeBanner({ onUpgrade }: { onUpgrade: () => void }): JSX.Element {
  return (
    <div className="mx-3 mb-3 overflow-hidden rounded-lg border border-chart-1/30 bg-chart-1/10">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-1/20">
            <Crown className="h-4 w-4 text-chart-1" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Full history unlock</p>
            <p className="text-xs text-muted-foreground">Upgrade to view your complete timeline</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="rounded-md bg-chart-1 px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-chart-1/90"
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}

export function ReadingHistory({
  entries,
  stats,
  isPremium,
  onOpenUrl,
  onUpgrade,
}: ReadingHistoryProps): JSX.Element {
  const groupedEntries = groupByDay(entries);
  const maxFreeEntries = 7;
  let displayedCount = 0;
  const limitedGroups = new Map<string, ReadingHistoryEntry[]>();

  if (!isPremium) {
    for (const [date, dayEntries] of groupedEntries) {
      const remaining = maxFreeEntries - displayedCount;
      if (remaining <= 0) break;
      const rows = dayEntries.slice(0, remaining);
      limitedGroups.set(date, rows);
      displayedCount += rows.length;
    }
  }

  const displayGroups = isPremium ? groupedEntries : limitedGroups;
  const showUpgradeBanner = !isPremium && entries.length > maxFreeEntries;

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div className="flex gap-2 border-b border-border p-3">
        <StatCard label="Total read" value={`${formatChars(stats.totalChars)} chars`} />
        <StatCard label="Streak" value={`${stats.streak} days`} />
        <StatCard label="This week" value={`${formatChars(stats.weeklyChars)} chars`} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {Array.from(displayGroups.entries()).map(([group, dayEntries]) => (
          <div key={group}>
            <div className="sticky top-0 bg-background/95 px-3 py-2 backdrop-blur-sm">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group}</h3>
            </div>
            <div className="space-y-0.5 pb-2">
              {dayEntries.map((entry) => (
                <HistoryItem key={entry.id} entry={entry} onOpenUrl={onOpenUrl} />
              ))}
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No reading history yet.</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Start reading to populate your timeline.</p>
          </div>
        )}
      </div>

      {showUpgradeBanner && <UpgradeBanner onUpgrade={onUpgrade} />}
    </div>
  );
}
