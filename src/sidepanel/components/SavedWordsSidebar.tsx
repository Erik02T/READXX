import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Lock,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "../../shared/cn";

export type SavedWord = {
  id: number;
  word: string;
  context: string;
  lang: string;
  sourceUrl: string;
  srsStatus: "new" | "learning" | "mastered";
  nextReview: number;
  savedAt: number;
};

type SavedWordsSidebarProps = {
  words: SavedWord[];
  searchQuery: string;
  selectedLang: string | null;
  sortBy: string;
  isPremium: boolean;
  onSearch: (q: string) => void;
  onFilterLang: (lang: string | null) => void;
  onSort: (by: string) => void;
  onDelete: (id: number) => void;
  onExportAnki: () => void;
  onStudyWord: (id: number) => void;
};

const LANGUAGES: Array<{ code: string | null; label: string }> = [
  { code: null, label: "All" },
  { code: "EN", label: "EN" },
  { code: "JA", label: "JA" },
  { code: "ZH", label: "ZH" },
  { code: "ES", label: "ES" },
  { code: "PT", label: "PT" },
  { code: "FR", label: "FR" },
  { code: "DE", label: "DE" },
  { code: "KO", label: "KO" },
];

const SRS_STATUS_CONFIG = {
  new: { label: "Due", className: "border-amber-500/30 bg-amber-500/20 text-amber-400" },
  learning: { label: "Learning", className: "border-blue-500/30 bg-blue-500/20 text-blue-400" },
  mastered: { label: "Mastered", className: "border-emerald-500/30 bg-emerald-500/20 text-emerald-400" },
};

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain.length > 20 ? `${domain.slice(0, 20)}...` : domain;
  } catch {
    return url;
  }
}

function WordRow({
  word,
  onDelete,
  onStudyWord,
}: {
  word: SavedWord;
  onDelete: (id: number) => void;
  onStudyWord: (id: number) => void;
}): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const status = SRS_STATUS_CONFIG[word.srsStatus];

  return (
    <div
      className={cn("group border-b border-border/50 transition-colors", isExpanded ? "bg-muted/30" : "hover:bg-muted/20")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="w-full cursor-pointer px-4 py-3 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-base font-medium text-foreground">{word.word}</span>
                <span className="h-4 rounded border border-border/50 bg-muted/50 px-1.5 py-0 text-[10px] leading-4 text-muted-foreground">
                  {word.lang}
                </span>
              </div>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{word.context}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className={cn("h-4 rounded border px-1.5 py-0 text-[10px] leading-4", status.className)}>
                {status.label}
              </span>
              <span className="text-[10px] text-muted-foreground/60">{extractDomain(word.sourceUrl)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/40">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>{isExpanded ? "Collapse" : "Expand"}</span>
          </div>
        </button>

        {isHovered && !isExpanded && (
          <button
            type="button"
            className="absolute right-4 bottom-3 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive-foreground"
            onClick={() => onDelete(word.id)}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3 px-4 pb-4">
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">{word.context}</p>
            <a
              href={word.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              {extractDomain(word.sourceUrl)}
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 flex-1 items-center justify-center rounded bg-emerald-600 px-3 text-xs text-white transition-colors hover:bg-emerald-700"
              onClick={() => onStudyWord(word.id)}
            >
              <BookOpen className="mr-1 h-3 w-3" />
              Study now
            </button>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded border border-border px-3 text-xs transition-colors hover:bg-secondary"
              onClick={() => onDelete(word.id)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </button>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded border border-border px-3 text-xs transition-colors hover:bg-secondary"
            >
              <Download className="mr-1 h-3 w-3" />
              Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SavedWordsSidebar({
  words,
  searchQuery,
  selectedLang,
  sortBy,
  isPremium,
  onSearch,
  onFilterLang,
  onSort,
  onDelete,
  onExportAnki,
  onStudyWord,
}: SavedWordsSidebarProps): JSX.Element {
  const filteredWords = useMemo(() => {
    let result = [...words];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) => item.word.toLowerCase().includes(query) || item.context.toLowerCase().includes(query)
      );
    }
    if (selectedLang) {
      result = result.filter((item) => item.lang === selectedLang);
    }
    if (sortBy === "recent") result.sort((a, b) => b.savedAt - a.savedAt);
    if (sortBy === "due") result.sort((a, b) => a.nextReview - b.nextReview);
    if (sortBy === "alpha") result.sort((a, b) => a.word.localeCompare(b.word));
    return result;
  }, [searchQuery, selectedLang, sortBy, words]);

  const dueCount = words.filter((item) => item.srsStatus === "new" || item.nextReview <= Date.now()).length;

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-background">
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Saved words</h2>
          <span className="rounded bg-secondary px-2 py-1 text-xs">{words.length} total</span>
        </div>
      </div>

      <div className="shrink-0 space-y-3 border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search words..."
            value={searchQuery}
            onChange={(event) => onSearch(event.target.value)}
            className="h-9 w-full rounded-md border border-border/50 bg-muted/30 pr-3 pl-9 text-sm outline-none transition focus:border-ring"
          />
        </div>

        <div className="scrollbar-hide flex items-center gap-1.5 overflow-x-auto pb-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code ?? "all"}
              type="button"
              onClick={() => onFilterLang(lang.code)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors",
                selectedLang === lang.code
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(event) => onSort(event.target.value)}
          className="h-8 w-full rounded-md border border-border/50 bg-muted/30 px-2 text-xs outline-none transition focus:border-ring"
        >
          <option value="recent">Saved recently</option>
          <option value="due">Review due</option>
          <option value="alpha">A-Z</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredWords.length > 0 ? (
          <div>
            {filteredWords.map((word) => (
              <WordRow key={word.id} word={word} onDelete={onDelete} onStudyWord={onStudyWord} />
            ))}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
            <Search className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">No words found</p>
            <p className="text-xs opacity-60">Try adjusting filters</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-muted/20 px-4 py-3">
        <button
          type="button"
          onClick={onExportAnki}
          disabled={!isPremium}
          className={cn(
            "flex h-10 w-full items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
            isPremium
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "cursor-not-allowed bg-muted text-muted-foreground"
          )}
        >
          {!isPremium && <Lock className="mr-2 h-4 w-4" />}
          Export to Anki
          {!isPremium && (
            <span className="ml-2 rounded border border-amber-500/50 px-1.5 py-0 text-[10px] text-amber-400">
              Premium
            </span>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {words.length} words . {dueCount} due today
        </p>
      </div>
    </div>
  );
}
