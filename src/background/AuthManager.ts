import type { AuthState } from "../shared/types";

const AUTH_STORAGE_KEY = "auth";

function defaultAuthState(): AuthState {
  return {
    accessToken: null,
    userId: null,
    email: null,
    plan: "free",
    expiresAt: null,
  };
}

export class AuthManager {
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

  async getAccessToken(): Promise<string | null> {
    const result = await chrome.storage.session.get(AUTH_STORAGE_KEY);
    const state = result[AUTH_STORAGE_KEY] as AuthState | undefined;
    return state?.accessToken ?? null;
  }

  async getAuthState(): Promise<AuthState> {
    const result = await chrome.storage.session.get(AUTH_STORAGE_KEY);
    const state = result[AUTH_STORAGE_KEY] as AuthState | undefined;
    return state ?? defaultAuthState();
  }

  async setAuthState(state: AuthState): Promise<void> {
    await chrome.storage.session.set({ [AUTH_STORAGE_KEY]: state });
  }

  async clearAuth(): Promise<void> {
    await chrome.storage.session.remove(AUTH_STORAGE_KEY);
  }

  async isTokenExpired(): Promise<boolean> {
    const state = await this.getAuthState();
    if (!state.expiresAt) return true;
    return state.expiresAt <= Date.now();
  }

  async refreshToken(): Promise<boolean> {
    const baseUrl = this.resolveBaseUrl(import.meta.env.VITE_API_BASE_URL as string);
    const token = await this.getAccessToken();
    if (!token) return false;

    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "omit",
        cache: "no-store",
      });

      if (!res.ok) return false;
      const data = (await res.json()) as AuthState;
      if (!data?.accessToken) return false;

      await this.setAuthState(data);
      return true;
    } catch {
      return false;
    }
  }
}

