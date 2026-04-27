import { ApiError } from "./types";

export const TODO_ENDPOINT = "/api/todos";
export const TODO_STREAM_ENDPOINT = "/api/todos/stream";

export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ApiError;
    if (typeof data.error === "string" && data.error.trim() !== "") {
      return data.error;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to the provided message.
  }

  return fallback;
}
