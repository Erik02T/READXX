import type { AuthState } from "../shared/types";
import { AuthManager } from "./AuthManager";

export class AuthError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthError";
  }
}

type RequestOptions = {
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: "json" | "text" | "stream";
};

export class ApiClient {
  private readonly authManager: AuthManager;
  private readonly baseUrl: string;

  constructor(authManager: AuthManager) {
    this.authManager = authManager;
    this.baseUrl = this.resolveBaseUrl(import.meta.env.VITE_API_BASE_URL as string);
  }

  private resolveBaseUrl(rawBaseUrl: string): string {
    const fallback = "https://api.readxx.app";
    try {
      const parsed = new URL(rawBaseUrl || fallback);
      if (parsed.protocol !== "https:") return fallback;
      return parsed.origin;
    } catch {
      return fallback;
    }
  }

  private async request<T>(
    path: string,
    options: Omit<RequestOptions, "responseType"> & {
      responseType?: RequestOptions["responseType"];
    },
    retrying = false
  ): Promise<T> {
    const token = await this.authManager.getAccessToken();

    const headers: Record<string, string> = {
      ...(options.headers ?? {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (options.body !== undefined && headers["Content-Type"] === undefined) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    }).finally(() => {
      clearTimeout(timeout);
    });

    if (res.status === 401) {
      if (!retrying) {
        const refreshed = await this.authManager.refreshToken();
        if (refreshed) {
          return this.request<T>(path, options, true);
        }
      }

      await this.authManager.clearAuth();
      throw new AuthError();
    }

    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }

    const responseType = options.responseType ?? "json";
    if (responseType === "stream") {
      const body = res.body;
      if (!body) throw new Error("Missing response stream body");
      return body as unknown as T;
    }

    if (responseType === "text") {
      return (await res.text()) as unknown as T;
    }

    if (res.status === 204) return undefined as T;
    const raw = await res.text();
    if (!raw) return undefined as T;

    try {
      const json = JSON.parse(raw) as T;
      return json;
    } catch {
      // Some backends return plain strings with JSON content-types.
      return raw as unknown as T;
    }
  }

  async login(email: string, password: string): Promise<AuthState> {
    return this.request<AuthState>("/auth/login", {
      method: "POST",
      body: { email, password },
      responseType: "json",
    });
  }

  async logout(): Promise<void> {
    await this.request<void>("/auth/logout", {
      method: "POST",
      responseType: "json",
    });
  }

  async saveWord(word: {
    word: string;
    context: string;
    url: string;
    lang: string;
  }): Promise<{ serverId: string }> {
    return this.request<{ serverId: string }>("/words", {
      method: "POST",
      body: word,
      responseType: "json",
    });
  }

  async syncPush(changes: any[]): Promise<void> {
    await this.request<void>("/sync/push", {
      method: "POST",
      body: changes,
      responseType: "json",
    });
  }

  async syncPull(since: number): Promise<any[]> {
    return this.request<any[]>(`/sync/pull?since=${encodeURIComponent(String(since))}`, {
      method: "GET",
      responseType: "json",
    });
  }

  async getTtsStream(text: string, voice: string): Promise<ReadableStream> {
    return this.request<ReadableStream>("/tts/stream", {
      method: "POST",
      body: { text, voice },
      responseType: "stream",
    });
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    return this.request<string>("/translate", {
      method: "POST",
      body: { text, sourceLang, targetLang },
      responseType: "json",
    });
  }

  async explain(word: string, context: string, lang: string): Promise<string> {
    return this.request<string>("/explain", {
      method: "POST",
      body: { word, context, lang },
      responseType: "json",
    });
  }
}

