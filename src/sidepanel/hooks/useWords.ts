import { useCallback, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Word } from "../../shared/types";
import { db } from "../../shared/db";
import { sendMessage } from "../../shared/messages";

type Rating = "again" | "hard" | "good" | "easy";
type SortBy = "savedAt" | "nextReview" | "word";

type UseWordsResult = {
  words: Word[];
  filteredWords: Word[];
  dueWords: Word[];
  search: string;
  langFilter: string;
  sortBy: SortBy;
  setLangFilter: (lang: string) => void;
  setSortBy: (sort: SortBy) => void;
  onDelete: (id: number) => Promise<void>;
  onRate: (id: number, rating: Rating) => Promise<void>;
  onSearch: (q: string) => void;
};

function sortWords(words: Word[], sortBy: SortBy): Word[] {
  const out = [...words];
  if (sortBy === "savedAt") out.sort((a, b) => b.savedAt - a.savedAt);
  if (sortBy === "nextReview") out.sort((a, b) => a.srs.nextReview - b.srs.nextReview);
  if (sortBy === "word") out.sort((a, b) => a.word.localeCompare(b.word));
  return out;
}

export function useWords(): UseWordsResult {
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("savedAt");

  const words =
    useLiveQuery(async () => db.words.orderBy("savedAt").reverse().toArray(), [], []) ?? [];

  const dueWords = useMemo(() => {
    const now = Date.now();
    return words.filter((w) => w.srs.nextReview <= now);
  }, [words]);

  const filteredWords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byLang =
      langFilter === "all" ? words : words.filter((w) => w.lang.toLowerCase() === langFilter.toLowerCase());
    const bySearch =
      q.length === 0
        ? byLang
        : byLang.filter((w) => {
            const hay = `${w.word} ${w.context} ${w.lang}`.toLowerCase();
            return hay.includes(q);
          });
    return sortWords(bySearch, sortBy);
  }, [langFilter, search, sortBy, words]);

  const onDelete = useCallback(async (id: number) => {
    await db.words.delete(id);
    await sendMessage({ type: "WORD_DELETE", localId: id });
  }, []);

  const onRate = useCallback(async (id: number, rating: Rating) => {
    const current = await db.words.get(id);
    if (!current) return;

    let ease = current.srs.ease;
    let interval = current.srs.interval;
    let repetitions = current.srs.repetitions;

    switch (rating) {
      case "again":
        ease -= 0.2;
        interval = 1;
        repetitions = 0;
        break;
      case "hard":
        ease -= 0.15;
        interval = Math.max(1, interval * 1.2);
        repetitions += 1;
        break;
      case "good":
        interval = interval * ease;
        repetitions += 1;
        break;
      case "easy":
        ease += 0.1;
        interval = interval * ease * 1.3;
        repetitions += 1;
        break;
      default:
        break;
    }

    if (ease < 1.3) ease = 1.3;
    const nextReview = Date.now() + interval * 86400000;

    await db.words.update(id, {
      updatedAt: Date.now(),
      syncStatus: "pending",
      srs: {
        ease,
        interval,
        repetitions,
        nextReview,
      },
    });
  }, []);

  const onSearch = useCallback((q: string) => {
    setSearch(q);
  }, []);

  return {
    words,
    filteredWords,
    dueWords,
    search,
    langFilter,
    sortBy,
    setLangFilter,
    setSortBy,
    onDelete,
    onRate,
    onSearch,
  };
}

