import { ApiError } from "./types";

export const SESSION_ENDPOINT = "/api/auth/session";
export const LOGIN_ENDPOINT = "/api/auth/login";
export const LOGOUT_ENDPOINT = "/api/auth/logout";
export const RESET_PASSWORD_ENDPOINT = "/api/auth/reset-password";
export const WORKSPACE_ENDPOINT = "/api/workspaces";
export const TODO_ENDPOINT = "/api/todos";
export const SHARE_ENDPOINT = "/api/shares";

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
