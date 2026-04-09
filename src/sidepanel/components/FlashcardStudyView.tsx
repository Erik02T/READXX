import { PartyPopper } from "lucide-react";
import { cn } from "../../shared/cn";

type FlashcardData = {
  word: string;
  context: string;
  translation: string;
  lang: string;
  sourceUrl: string;
};

type FlashcardStudyViewProps = {
  card: FlashcardData | null;
  cardIndex: number;
  totalCards: number;
  isFlipped: boolean;
  nextIntervals: { again: string; hard: string; good: string; easy: string };
  onFlip: () => void;
  onRate: (rating: "again" | "hard" | "good" | "easy") => void;
  onSkip: () => void;
};

function RatingButton({
  label,
  interval,
  variant,
  onClick,
}: {
  label: string;
  interval: string;
  variant: "again" | "hard" | "good" | "easy";
  onClick: () => void;
}): JSX.Element {
  const styles = {
    again: "bg-red-500/20 text-red-400 hover:bg-red-500/30",
    hard: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30",
    good: "bg-green-500/20 text-green-400 hover:bg-green-500/30",
    easy: "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors", styles[variant])}
    >
      <span>{label}</span>
      <span className="text-xs opacity-70">{interval}</span>
    </button>
  );
}

export function FlashcardStudyView({
  card,
  cardIndex,
  totalCards,
  isFlipped,
  nextIntervals,
  onFlip,
  onRate,
  onSkip,
}: FlashcardStudyViewProps): JSX.Element {
  const progress = totalCards > 0 ? (cardIndex / totalCards) * 100 : 0;
  const cardsDue = Math.max(0, totalCards - cardIndex);

  if (!card) {
    return (
      <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <PartyPopper className="h-8 w-8 text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold">All reviewed</h2>
            <p className="mt-1 text-sm text-muted-foreground">Come back later for the next session.</p>
          </div>
        </div>
        <div className="p-4 text-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <header className="flex flex-col gap-3 border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Study session</h1>
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
            {cardsDue} due
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">
            {cardIndex} / {totalCards}
          </span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-sidebar-accent">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full cursor-pointer" style={{ perspective: "1000px" }} onClick={!isFlipped ? onFlip : undefined}>
          <div
            className={cn(
              "relative h-[220px] w-full transition-transform duration-500 [transform-style:preserve-3d]",
              isFlipped && "[transform:rotateY(180deg)]"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent p-6 [backface-visibility:hidden]"
              )}
            >
              <span className="text-2xl font-bold">{card.word}</span>
              <span className="rounded bg-sidebar-border px-2 py-0.5 text-xs uppercase text-muted-foreground">
                {card.lang}
              </span>
              <span className="mt-4 text-xs text-muted-foreground">Tap to reveal</span>
            </div>
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]"
              )}
            >
              <span className="text-xl font-semibold text-emerald-400">{card.translation}</span>
              <p className="text-center text-sm italic text-muted-foreground">"{card.context}"</p>
              <span className="mt-2 text-xs text-muted-foreground/60">{new URL(card.sourceUrl).hostname}</span>
            </div>
          </div>
        </div>

        {isFlipped && (
          <div className="mt-6 grid w-full grid-cols-4 gap-2">
            <RatingButton label="Again" interval={nextIntervals.again} variant="again" onClick={() => onRate("again")} />
            <RatingButton label="Hard" interval={nextIntervals.hard} variant="hard" onClick={() => onRate("hard")} />
            <RatingButton label="Good" interval={nextIntervals.good} variant="good" onClick={() => onRate("good")} />
            <RatingButton label="Easy" interval={nextIntervals.easy} variant="easy" onClick={() => onRate("easy")} />
          </div>
        )}
      </div>

      <div className="p-4 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip session
        </button>
      </div>
    </div>
  );
}
