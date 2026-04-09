import { Readability } from "@mozilla/readability";
import DOMPurify from "dompurify";

export type ExtractedContent = {
  text: string;
  title: string;
  wordCount: number;
  lang: string;
  strategy: "readability" | "shadowdom" | "fullbody" | "failed";
  isImageHeavy: boolean;
};

function detectLang(): string {
  const htmlLang = document.documentElement.getAttribute("lang");
  return htmlLang || navigator.language || "en";
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function computeWordCount(text: string): number {
  return text.split(/\s+/g).filter(Boolean).length;
}

function isImageHeavyFromText(text: string): boolean {
  const images = document.images.length;
  const canvases = document.getElementsByTagName("canvas").length;
  const bodyText = document.body?.innerText ?? "";
  const textDensity = bodyText.length > 0 ? text.length / bodyText.length : 0;

  return (images > 5 && textDensity < 0.1) || canvases > 0;
}

function shouldSkipElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "script" || tag === "style" || tag === "noscript") return true;
  // Skip SVG text collection.
  if (el.namespaceURI === "http://www.w3.org/2000/svg") return true;
  if ((el as HTMLElement).hidden) return true;
  return false;
}

export class DomExtractor {
  extract(): ExtractedContent {
    const purify = DOMPurify(window);
    const title = document.title || "";
    const MIN_TEXT_CHARS = 200;
    const MAX_SHADOW_DEPTH = 10;

    // 1) READABILITY
    try {
      const clonedDoc = document.cloneNode(true) as Document;
      const reader = new Readability(clonedDoc);
      const parsed = reader.parse();
      const rawText = parsed?.textContent ?? "";

      if (rawText && rawText.length >= MIN_TEXT_CHARS) {
        const sanitizedText = purify.sanitize(rawText, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
          KEEP_CONTENT: true,
        }) as string;
        const text = normalizeWhitespace(sanitizedText);

        if (text.length >= MIN_TEXT_CHARS) {
          const lang = detectLang();
          return {
            text,
            title: parsed?.title ?? title,
            wordCount: computeWordCount(text),
            lang,
            strategy: "readability",
            isImageHeavy: isImageHeavyFromText(text),
          };
        }
      }
    } catch {
      // Fall through to next strategy.
    }

    // 2) SHADOW DOM WALK
    try {
      const body = document.body;
      if (body) {
        const parts: string[] = [];

        const collectTextFromElement = (el: Element): void => {
          if (shouldSkipElement(el)) return;

          for (const node of Array.from(el.childNodes)) {
            if (node.nodeType !== Node.TEXT_NODE) continue;
            const v = node.nodeValue;
            if (!v) continue;
            const t = normalizeWhitespace(v);
            if (t) parts.push(t);
          }
        };

        const walk = (root: ParentNode, depth: number): void => {
          if (depth > MAX_SHADOW_DEPTH) return;
          for (const el of Array.from(root.querySelectorAll("*"))) {
            if (shouldSkipElement(el)) continue;

            collectTextFromElement(el);

            const maybeShadow =
              (el as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot ??
              null;
            if (maybeShadow) walk(maybeShadow, depth + 1);
          }
        };

        walk(body, 0);
        const text = normalizeWhitespace(parts.join(" "));

        if (text.length >= MIN_TEXT_CHARS) {
          const lang = detectLang();
          return {
            text,
            title,
            wordCount: computeWordCount(text),
            lang,
            strategy: "shadowdom",
            isImageHeavy: isImageHeavyFromText(text),
          };
        }
      }
    } catch {
      // Fall through to next strategy.
    }

    // 3) FULL BODY FALLBACK
    const rawBodyText = document.body?.innerText ?? "";
    const text = normalizeWhitespace(
      purify.sanitize(rawBodyText, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      }) as string
    );
    const lang = detectLang();
    const strategy = text.length >= MIN_TEXT_CHARS ? "fullbody" : "failed";

    return {
      text,
      title,
      wordCount: computeWordCount(text),
      lang,
      strategy,
      isImageHeavy: isImageHeavyFromText(text),
    };
  }
}
