export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.readxx.app";

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}
