import React from "react";
import ReactDOM from "react-dom/client";
import FloatingToolbar from "./overlay/FloatingToolbar";
import { sendMessage } from "../shared/messages";
import {
  sanitizeLanguage,
  sanitizePlainText,
  sanitizeSourceUrl,
} from "../shared/security";

type ToolbarState = {
  x: number;
  y: number;
  selectedText: string;
  isLoading: boolean;
  loadingAction: "translate" | "explain" | null;
  translateResult: string | null;
  explainResult: string | null;
};

const MIN_SELECTION_CHARS = 3;
const MAX_SELECTION_CHARS = 2000;
const MAX_CONTEXT_CHARS = 300;

let host: HTMLDivElement | null = null;
let root: ReactDOM.Root | null = null;
let currentState: ToolbarState | null = null;
let selectionRect: DOMRect | null = null;

function sanitizeSelectionText(raw: string): string {
  return sanitizePlainText(raw, MAX_SELECTION_CHARS);
}

function getActiveSelectionText(): string {
  const selection = window.getSelection();
  return sanitizeSelectionText(selection?.toString() ?? "");
}

function getSurroundingContext(): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";

  const range = selection.getRangeAt(0);
  const node = selection.anchorNode;
  if (!node) return sanitizePlainText(selection.toString(), MAX_CONTEXT_CHARS);

  const textNode =
    node.nodeType === Node.TEXT_NODE
      ? node
      : node.firstChild?.nodeType === Node.TEXT_NODE
        ? node.firstChild
        : null;
  const text = textNode?.textContent ?? selection.toString();
  if (!text) return "";

  let offset = selection.anchorOffset;
  if (offset < 0) offset = 0;
  if (offset > text.length) offset = text.length;

  const start = Math.max(0, offset - 120);
  const end = Math.min(text.length, offset + 120);
  const selected = sanitizeSelectionText(range.toString());
  const context = sanitizePlainText(text.slice(start, end), MAX_CONTEXT_CHARS);
  if (!selected) return context;
  if (context.includes(selected)) return context;
  return sanitizePlainText(`${context} ${selected}`, MAX_CONTEXT_CHARS);
}

function unmountToolbar(): void {
  if (root) {
    root.unmount();
    root = null;
  }
  if (host && host.parentNode) {
    host.parentNode.removeChild(host);
  }
  host = null;
  currentState = null;
  selectionRect = null;
}

function ensureMount(): void {
  if (host && root) return;
  if (!document.body) return;

  host = document.createElement("div");
  host.setAttribute("data-readxx-overlay", "toolbar");
  host.style.position = "absolute";
  host.style.top = "0";
  host.style.left = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";

  const shadow = host.attachShadow({ mode: "open" });
  const mountDiv = document.createElement("div");
  shadow.appendChild(mountDiv);

  document.body.appendChild(host);
  root = ReactDOM.createRoot(mountDiv);
}

function renderToolbar(): void {
  if (!root || !currentState) return;

  const {
    x,
    y,
    selectedText,
    isLoading,
    loadingAction,
    translateResult,
    explainResult,
  } = currentState;

  const onRead = async (): Promise<void> => {
    if (!currentState) return;
    currentState = {
      ...currentState,
      isLoading: true,
      loadingAction: null,
      translateResult: null,
      explainResult: null,
    };
    renderToolbar();
    try {
      await sendMessage({
        type: "TTS_PLAY",
        text: selectedText,
        voice: "",
        rate: 1,
      });
      currentState = {
        ...currentState,
        isLoading: false,
        loadingAction: null,
      };
    } catch {
      currentState = {
        ...currentState,
        isLoading: false,
        loadingAction: null,
      };
    }
    renderToolbar();
  };

  const onSave = async (): Promise<void> => {
    if (!currentState) return;
    currentState = {
      ...currentState,
      isLoading: true,
      loadingAction: null,
      translateResult: null,
      explainResult: null,
    };
    renderToolbar();
    try {
      await sendMessage({
        type: "WORD_SAVE",
        word: selectedText,
        context: getSurroundingContext(),
        url: sanitizeSourceUrl(location.href),
        lang: sanitizeLanguage(
          document.documentElement.lang || navigator.language || "en",
          "en"
        ),
      });
      currentState = { ...currentState, isLoading: false, loadingAction: null };
    } catch {
      currentState = { ...currentState, isLoading: false, loadingAction: null };
    }
    renderToolbar();
  };

  const onTranslate = async (): Promise<void> => {
    if (!currentState) return;
    currentState = {
      ...currentState,
      isLoading: true,
      loadingAction: "translate",
      translateResult: null,
      explainResult: null,
    };
    renderToolbar();
    try {
      const translated = await sendMessage({
        type: "TRANSLATE",
        text: selectedText,
        sourceLang: "auto",
        targetLang: "en",
      });
      currentState = {
        ...currentState,
        isLoading: false,
        loadingAction: null,
        translateResult: typeof translated === "string" ? translated : "Done",
        explainResult: null,
      };
    } catch {
      currentState = {
        ...currentState,
        isLoading: false,
        loadingAction: null,
        translateResult: "Translate failed",
      };
    }
    renderToolbar();
  };

  const onExplain = async (): Promise<void> => {
    if (!currentState) return;
    currentState = {
      ...currentState,
      isLoading: true,
      loadingAction: "explain",
      translateResult: null,
      explainResult: null,
    };
    renderToolbar();
    try {
      const explanation = await sendMessage({
        type: "EXPLAIN",
        word: selectedText,
        context: getSurroundingContext(),
        lang: sanitizeLanguage(
          document.documentElement.lang || navigator.language || "en",
          "en"
        ),
      });
      currentState = {
        ...currentState,
        isLoading: false,
        loadingAction: null,
        explainResult: typeof explanation === "string" ? explanation : "Done",
        translateResult: null,
      };
    } catch {
      currentState = {
        ...currentState,
        isLoading: false,
        loadingAction: null,
        explainResult: "Explain failed",
      };
    }
    renderToolbar();
  };

  const onClose = (): void => {
    if (!currentState) return;
    currentState = {
      ...currentState,
      translateResult: null,
      explainResult: null,
      loadingAction: null,
    };
    renderToolbar();
  };

  root.render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(FloatingToolbar, {
        x,
        y,
        isLoading,
        loadingAction,
        translateResult,
        explainResult,
        onRead,
        onSave,
        onTranslate,
        onExplain,
        onClose,
      })
    )
  );
}

function showToolbarAtSelection(): void {
  const selection = window.getSelection();
  const selectedText = sanitizeSelectionText(selection?.toString() ?? "");
  if (!selection || selection.rangeCount === 0 || selectedText.length < MIN_SELECTION_CHARS) {
    unmountToolbar();
    return;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  selectionRect = rect;
  const x = rect.left + rect.width / 2;
  const y = rect.top + window.scrollY - 8;

  ensureMount();
  currentState = {
    x,
    y,
    selectedText,
    isLoading: false,
    loadingAction: null,
    translateResult: null,
    explainResult: null,
  };
  renderToolbar();
}

function onSelectionChange(): void {
  const selectedText = getActiveSelectionText();
  if (!selectedText || selectedText.length < MIN_SELECTION_CHARS) {
    unmountToolbar();
  }
}

function onMouseUp(): void {
  showToolbarAtSelection();
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    unmountToolbar();
  }
}

function onPointerDown(e: MouseEvent): void {
  const selection = window.getSelection();
  const hasSelection = (sanitizeSelectionText(selection?.toString() ?? "").length ?? 0) >= MIN_SELECTION_CHARS;
  if (!hasSelection) {
    unmountToolbar();
    return;
  }

  // Ignore clicks inside toolbar shadow root.
  if (host?.shadowRoot && e.composedPath().includes(host.shadowRoot)) {
    return;
  }

  if (!selectionRect) {
    unmountToolbar();
    return;
  }

  const x = e.clientX;
  const y = e.clientY;
  const withinSelection =
    x >= selectionRect.left &&
    x <= selectionRect.right &&
    y >= selectionRect.top &&
    y <= selectionRect.bottom;
  if (!withinSelection) {
    unmountToolbar();
  }
}

document.addEventListener("mouseup", onMouseUp);
document.addEventListener("selectionchange", onSelectionChange);
document.addEventListener("keydown", onKeyDown);
document.addEventListener("mousedown", onPointerDown);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }
  const payload = message as { type?: string };
  if (payload.type !== "READXX_EXTRACT_TEXT") {
    return false;
  }

  const extracted = sanitizePlainText(document.body?.innerText ?? "", 6000);
  const wordCount = extracted ? extracted.split(/\s+/g).filter(Boolean).length : 0;
  sendResponse({ text: extracted, wordCount });
  return false;
});
