export type SpaObserverReason = "mutation" | "navigation";

export type SpaObserverCallback = (reason: SpaObserverReason) => void;

export class SpaObserver {
  private readonly callback: SpaObserverCallback;
  private mutationObserver: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHash: string | null = null;
  private started = false;

  private originalPushState?: History["pushState"];
  private originalReplaceState?: History["replaceState"];

  private readonly onPopState = (): void => {
    void this.maybeTrigger("navigation");
  };

  constructor(callback: SpaObserverCallback) {
    this.callback = callback;
  }

  private computeHash(): string {
    const text = document.body?.innerText ?? "";
    return text.slice(0, 200);
  }

  private async maybeTrigger(reason: SpaObserverReason): Promise<void> {
    const hash = this.computeHash();
    if (this.lastHash !== null && hash === this.lastHash) return;
    this.lastHash = hash;
    this.callback(reason);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.lastHash = this.computeHash();

    const body = document.body;
    if (body) {
      this.mutationObserver = new MutationObserver(() => {
        if (!this.started) return;
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          void this.maybeTrigger("mutation");
        }, 600);
      });

      this.mutationObserver.observe(body, {
        childList: true,
        subtree: true,
      });
    }

    // Monkey-patch history methods to catch SPA navigations.
    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;

    const self = this;
    history.pushState = function pushState(
      this: History,
      ...args: any[]
    ) {
      // @ts-expect-error - runtime patch
      const ret = self.originalPushState!.apply(this, args);
      void self.maybeTrigger("navigation");
      return ret;
    } as History["pushState"];

    history.replaceState = function replaceState(
      this: History,
      ...args: any[]
    ) {
      // @ts-expect-error - runtime patch
      const ret = self.originalReplaceState!.apply(this, args);
      void self.maybeTrigger("navigation");
      return ret;
    } as History["replaceState"];

    window.addEventListener("popstate", this.onPopState);
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Restore original history methods.
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }

    window.removeEventListener("popstate", this.onPopState);
  }
}
