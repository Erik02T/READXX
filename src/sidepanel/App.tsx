import { useEffect, useMemo, useState, type FormEvent } from "react";
import { sendMessage } from "../shared/messages";
import type { AuthState, Word } from "../shared/types";
import { FlashcardStudyView } from "./components/FlashcardStudyView";
import { ReadingHistory, type ReadingHistoryEntry } from "./components/ReadingHistory";
import { SavedWordsSidebar, type SavedWord } from "./components/SavedWordsSidebar";
import { TtsPlayer, type Article, type Voice } from "./components/TtsPlayer";
import { useHistory } from "./hooks/useHistory";
import { useTts } from "./hooks/useTts";
import { useWords } from "./hooks/useWords";

type TabId = "player" | "study" | "words" | "history";
type WordSortBy = "savedAt" | "nextReview" | "word";

const ACTIVE_TAB_KEY = "sidepanelActiveTab";

const tabs: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "player", label: "Player", icon: "Play" },
  { id: "study", label: "Study", icon: "Cards" },
  { id: "words", label: "Words", icon: "Words" },
  { id: "history", label: "History", icon: "Logs" },
];

const DEFAULT_VOICE: Voice = {
  id: "browser-en",
  name: "Browser Voice",
  lang: "en-US",
  isPremium: false,
};

function isLoggedIn(auth: AuthState | null): boolean {
  return Boolean(auth?.accessToken && auth?.userId);
}

function toSrsStatus(word: Word): SavedWord["srsStatus"] {
  if (word.srs.repetitions >= 5) return "mastered";
  if (word.srs.repetitions >= 1) return "learning";
  return "new";
}

function toSavedWord(word: Word): SavedWord | null {
  if (word.id === undefined) return null;
  return {
    id: word.id,
    word: word.word,
    context: word.context,
    lang: word.lang.toUpperCase(),
    sourceUrl: word.sourceUrl,
    srsStatus: toSrsStatus(word),
    nextReview: word.srs.nextReview,
    savedAt: word.savedAt,
  };
}

function toHistoryEntries(rows: ReturnType<typeof useHistory>["history"]): ReadingHistoryEntry[] {
  return rows.map((item, index) => ({
    id: item.id ?? index + 1,
    url: item.url,
    title: item.title,
    domain: item.domain,
    faviconUrl: `https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`,
    charsRead: item.charsRead,
    totalChars: item.charsRead,
    timeSpentSeconds: item.timeSpentSeconds,
    visitedAt: item.visitedAt,
  }));
}

function sortToUi(sort: WordSortBy): string {
  if (sort === "savedAt") return "recent";
  if (sort === "nextReview") return "due";
  return "alpha";
}

function sortFromUi(value: string): WordSortBy {
  if (value === "recent") return "savedAt";
  if (value === "due") return "nextReview";
  return "word";
}

export default function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("player");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [playerText, setPlayerText] = useState("");
  const [volume, setVolume] = useState(75);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(DEFAULT_VOICE);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyFlipped, setStudyFlipped] = useState(false);

  const tts = useTts();
  const words = useWords();
  const history = useHistory();

  useEffect(() => {
    void (async () => {
      const tabStore = await chrome.storage.session.get(ACTIVE_TAB_KEY);
      const storedTab = tabStore[ACTIVE_TAB_KEY] as TabId | undefined;
      if (storedTab && tabs.some((item) => item.id === storedTab)) {
        setActiveTab(storedTab);
      }

      try {
        const settings = await sendMessage({ type: "SETTINGS_GET" });
        if (settings?.voice) {
          setSelectedVoice({
            id: settings.voice,
            name: settings.voice.startsWith("browser-") ? "Browser Voice" : "AI Voice",
            lang: "en-US",
            isPremium: settings.voice.startsWith("ai-"),
          });
        }
      } catch {
        // Ignore boot setting load errors.
      }

      const status = await sendMessage({ type: "AUTH_STATUS" });
      setAuth(status);
    })();
  }, []);

  useEffect(() => {
    void chrome.storage.session.set({ [ACTIVE_TAB_KEY]: activeTab });
  }, [activeTab]);

  const onLogin = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);
    try {
      const result = (await sendMessage({
        type: "AUTH_LOGIN",
        email,
        password,
      })) as AuthState;
      setAuth(result);
      setEmail("");
      setPassword("");
    } catch {
      setAuthError("Login failed. Check credentials and try again.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const isPremium = auth?.plan === "premium";

  const playerArticle: Article = useMemo(() => {
    const latest = history.history[0];
    if (!latest) {
      return {
        title: "No recent article captured yet",
        domain: "readxx.app",
        faviconUrl: "https://www.google.com/s2/favicons?domain=readxx.app&sz=32",
        wordCount: 0,
        estimatedMinutes: 0,
      };
    }

    return {
      title: latest.title || latest.url,
      domain: latest.domain || "unknown",
      faviconUrl: `https://www.google.com/s2/favicons?domain=${latest.domain}&sz=32`,
      wordCount: Math.round(latest.charsRead / 5),
      estimatedMinutes: Math.max(1, Math.round(latest.charsRead / 900)),
    };
  }, [history.history]);

  const savedWords = useMemo(() => words.words.map(toSavedWord).filter((item): item is SavedWord => item !== null), [words.words]);

  const studyCards = useMemo(
    () =>
      words.dueWords
        .filter((item) => item.id !== undefined)
        .map((item) => ({
          id: item.id as number,
          word: item.word,
          context: item.context,
          translation: item.word,
          lang: item.lang.toUpperCase(),
          sourceUrl: item.sourceUrl,
        })),
    [words.dueWords]
  );

  const studyCard = studyCards[studyIndex] ?? null;

  const readingHistoryEntries = useMemo(() => toHistoryEntries(history.history), [history.history]);
  const recentSavedWords = useMemo(() => savedWords.slice(0, 4).map((item) => item.word), [savedWords]);

  const onPlayTts = (): void => {
    const text = playerText.trim() || tts.currentSentence.trim() || playerArticle.title;
    void tts.onPlay(text);
  };

  const onSaveWordFromPlayer = (word: string): void => {
    void sendMessage({
      type: "WORD_SAVE",
      word,
      context: tts.currentSentence || playerText || playerArticle.title,
      url: history.history[0]?.url ?? "about:blank",
      lang: "en",
    });
  };

  const onVoiceChange = (nextVoice: Voice): void => {
    setSelectedVoice(nextVoice);
    void sendMessage({
      type: "SETTINGS_SET",
      settings: { voice: nextVoice.id },
    });
  };

  const onStudyRate = (rating: "again" | "hard" | "good" | "easy"): void => {
    if (!studyCard) return;
    void words.onRate(studyCard.id, rating);
    setStudyFlipped(false);
    setStudyIndex((current) => Math.min(current + 1, studyCards.length));
  };

  const onStudyNow = (id: number): void => {
    const nextIndex = studyCards.findIndex((item) => item.id === id);
    if (nextIndex >= 0) {
      setStudyIndex(nextIndex);
    } else {
      setStudyIndex(0);
    }
    setStudyFlipped(false);
    setActiveTab("study");
  };

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">READXX</h1>
      </header>

      <main className="flex-1 overflow-hidden pb-[76px]">
        {activeTab === "player" && (
          <TtsPlayer
            article={playerArticle}
            progress={tts.progress}
            currentSentence={tts.currentSentence}
            isPlaying={tts.isPlaying}
            speed={tts.speed}
            volume={volume}
            voice={selectedVoice}
            recentWords={recentSavedWords}
            textToPlay={playerText}
            onTextToPlayChange={setPlayerText}
            onPlay={onPlayTts}
            onPause={() => void tts.onPause()}
            onSpeedChange={(value) => void tts.onSpeedChange(value)}
            onVolumeChange={setVolume}
            onVoiceChange={onVoiceChange}
            onWordSave={onSaveWordFromPlayer}
            onSkipBack={() => setPlayerText((current) => current.slice(0, Math.max(0, current.length - 20)))}
            onSkipForward={() => setPlayerText((current) => `${current} ...`)}
          />
        )}

        {activeTab === "study" && (
          <FlashcardStudyView
            card={studyCard}
            cardIndex={Math.min(studyIndex + 1, Math.max(studyCards.length, 1))}
            totalCards={studyCards.length}
            isFlipped={studyFlipped}
            nextIntervals={{
              again: "1d",
              hard: "3d",
              good: "7d",
              easy: "21d",
            }}
            onFlip={() => setStudyFlipped(true)}
            onRate={onStudyRate}
            onSkip={() => {
              setStudyFlipped(false);
              setStudyIndex(0);
              setActiveTab("words");
            }}
          />
        )}

        {activeTab === "words" && (
          <SavedWordsSidebar
            words={savedWords}
            searchQuery={words.search}
            selectedLang={words.langFilter === "all" ? null : words.langFilter.toUpperCase()}
            sortBy={sortToUi(words.sortBy)}
            isPremium={isPremium}
            onSearch={words.onSearch}
            onFilterLang={(lang) => words.setLangFilter(lang === null ? "all" : lang.toLowerCase())}
            onSort={(value) => words.setSortBy(sortFromUi(value))}
            onDelete={(id) => {
              void words.onDelete(id);
            }}
            onExportAnki={() => {
              if (!isPremium) return;
              const content = savedWords
                .map((item) => `${item.word}\t${item.context}\t${item.lang}\t${item.sourceUrl}`)
                .join("\n");
              const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              void chrome.tabs.create({ url });
            }}
            onStudyWord={onStudyNow}
          />
        )}

        {activeTab === "history" && (
          <ReadingHistory
            entries={readingHistoryEntries}
            stats={history.stats}
            isPremium={isPremium}
            onOpenUrl={(url) => {
              void chrome.tabs.create({ url });
            }}
            onUpgrade={() => {
              void chrome.tabs.create({ url: "https://readxx.app" });
            }}
          />
        )}
      </main>

      <nav
        className="fixed right-0 bottom-0 left-0 grid grid-cols-4 gap-2 border-t border-border bg-background px-3 py-2"
        aria-label="Side panel navigation"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-md border border-border px-2 py-2 text-[11px] transition-colors",
              tab.id === activeTab ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-card"
            )}
          >
            <span className="block text-[10px] uppercase tracking-wide opacity-80">{tab.icon}</span>
            <span className="block">{tab.label}</span>
          </button>
        ))}
      </nav>

      {!isLoggedIn(auth) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form onSubmit={onLogin} className="grid w-full max-w-[360px] gap-3 rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Login</h2>
            <label className="grid gap-1 text-sm">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="h-10 rounded-md border border-input bg-background px-3 outline-none focus:border-ring"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="h-10 rounded-md border border-input bg-background px-3 outline-none focus:border-ring"
              />
            </label>
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <button
              type="submit"
              disabled={isAuthLoading}
              className="h-10 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
