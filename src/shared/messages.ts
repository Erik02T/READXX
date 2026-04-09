import type { AuthState, UserSettings } from "./types";

export type ExtMessage =
  | {
      type: "TTS_PLAY";
      text: string;
      voice: string;
      rate: number;
    }
  | { type: "TTS_PAUSE" }
  | { type: "TTS_RESUME" }
  | { type: "TTS_STOP" }
  | { type: "TTS_STATUS_REQUEST" }
  | {
      type: "WORD_SAVE";
      word: string;
      context: string;
      url: string;
      lang: string;
    }
  | { type: "WORD_DELETE"; localId: number }
  | { type: "SYNC_NOW" }
  | { type: "AUTH_LOGIN"; email: string; password: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_STATUS" }
  | {
      type: "TRANSLATE";
      text: string;
      sourceLang: string;
      targetLang: string;
    }
  | { type: "EXPLAIN"; word: string; context: string; lang: string }
  | { type: "OCR_REQUEST"; imageDataUrl: string; lang: string }
  | { type: "OCR_RESULT"; jobId: string }
  | { type: "SETTINGS_GET" }
  | { type: "SETTINGS_SET"; settings: Partial<UserSettings> };

export type TtsStatusResponse = {
  playing: boolean;
  position: number;
};

export type MessageResponseFor<T extends ExtMessage["type"]> = T extends "TTS_STATUS_REQUEST"
  ? TtsStatusResponse
  : T extends "AUTH_STATUS"
    ? AuthState
    : T extends "SETTINGS_GET"
      ? UserSettings
      : void;

export async function sendMessage<M extends ExtMessage>(
  message: M
): Promise<MessageResponseFor<M["type"]>> {
  return chrome.runtime.sendMessage(message) as Promise<MessageResponseFor<M["type"]>>;
}
