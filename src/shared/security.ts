const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const MULTISPACE = /\s+/g;
const SENSITIVE_QUERY_PARAM = /^(access_token|token|api_key|apikey|session|auth|code|state)$/i;
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizePlainText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(CONTROL_CHARS, "").replace(MULTISPACE, " ").trim();
  if (!cleaned) return "";
  return cleaned.slice(0, Math.max(0, maxLength));
}

export function sanitizeSourceUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const input = value.trim();
  if (!input) return "";

  try {
    const parsed = new URL(input);
    if (!isHttpUrl(parsed.toString())) return "";

    const normalized = new URL(parsed.origin + parsed.pathname);
    let acceptedParams = 0;
    for (const [key, rawValue] of parsed.searchParams.entries()) {
      if (SENSITIVE_QUERY_PARAM.test(key)) continue;
      if (acceptedParams >= 20) break;
      normalized.searchParams.append(key, rawValue.slice(0, 120));
      acceptedParams += 1;
    }
    normalized.hash = "";
    return normalized.toString().slice(0, 2048);
  } catch {
    return "";
  }
}

export function sanitizeLanguage(value: unknown, fallback = "en"): string {
  if (typeof value !== "string") return fallback;
  const lang = value.trim().toLowerCase();
  if (!lang) return fallback;
  if (lang === "auto") return "auto";
  if (!LANGUAGE_TAG.test(lang)) return fallback;
  return lang.slice(0, 16);
}

export function sanitizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return "";
  return email;
}

export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

