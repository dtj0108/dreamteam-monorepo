import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const WORKSPACE_ID_KEY = "currentWorkspaceId";
const REQUEST_TIMEOUT_MS = 15000;

function normalizeApiBaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);

    // dreamteam.ai redirects /api/* to www.dreamteam.ai (307).
    // Redirects across hosts can drop Authorization headers in fetch.
    // Normalize to canonical host to avoid auth loss.
    if (parsed.hostname === "dreamteam.ai") {
      parsed.hostname = "www.dreamteam.ai";
    }

    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return rawUrl.replace(/\/+$/, "");
  }
}

const API_BASE_URL = normalizeApiBaseUrl(API_URL);

function buildApiUrl(endpoint: string): URL {
  const base = API_BASE_URL;
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Allow EXPO_PUBLIC_API_URL to be either:
  // - https://example.com
  // - https://example.com/api
  // while endpoints remain /api/...
  const normalizedPath =
    base.endsWith("/api") && path.startsWith("/api/")
      ? path.slice(4)
      : path;

  return new URL(`${base}${normalizedPath}`);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Authenticated API client that automatically attaches the user's session token
 * and workspace ID to all requests.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get current session token.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let accessToken = session?.access_token;

  // If token is near expiry, refresh proactively to reduce startup 401 races.
  if (session?.expires_at) {
    const expiresAtMs = session.expires_at * 1000;
    const isExpiringSoon = expiresAtMs <= Date.now() + 60_000;
    if (isExpiringSoon) {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token) {
        accessToken = data.session.access_token;
      }
    }
  }

  if (!accessToken) {
    throw new ApiError(401, "Unauthorized");
  }

  // Get workspace ID from storage
  const workspaceId = await AsyncStorage.getItem(WORKSPACE_ID_KEY);

  // Build URL with workspaceId query parameter
  const url = buildApiUrl(endpoint);
  if (workspaceId) {
    url.searchParams.append("workspaceId", workspaceId);
  }

  const makeRequest = async (token?: string): Promise<Response> => {
    const headers = new Headers(options.headers);
    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abortHandler = () => controller.abort();

    options.signal?.addEventListener("abort", abortHandler, { once: true });

    try {
      return await fetch(url.toString(), {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (options.signal?.aborted) {
          throw error;
        }
        throw new ApiError(408, "Request timed out. Please try again.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", abortHandler);
    }
  };

  let response = await makeRequest(accessToken);

  // Retry once if autoRefreshToken has already provided a fresh token.
  // We intentionally use getSession() instead of refreshSession() to avoid
  // firing auth state change events that race with the built-in auto-refresh.
  if (response.status === 401) {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const currentToken = currentSession?.access_token;
    if (currentToken && currentToken !== accessToken) {
      response = await makeRequest(currentToken);
    }

    // If still unauthorized, force a token refresh once and retry.
    // This covers startup races where the stored access token is stale
    // but refresh token is still valid.
    if (response.status === 401) {
      const { data, error } = await supabase.auth.refreshSession();
      const refreshedToken = data.session?.access_token;
      if (!error && refreshedToken) {
        response = await makeRequest(refreshedToken);
      }
    }
  }

  if (!response.ok) {
    const errorText = await response.text();

    // Check if response is HTML (server error page)
    if (errorText.includes("<!DOCTYPE") || errorText.includes("<html")) {
      throw new ApiError(
        response.status,
        response.status === 404
          ? "API endpoint not found. Check your API URL configuration."
          : `Server error (${response.status}). Please try again.`
      );
    }

    // Try to parse as JSON error
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      // Not JSON, use raw text
    }
    throw new ApiError(response.status, errorMessage);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

/**
 * GET request helper
 */
export function get<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: "GET" });
}

/**
 * POST request helper
 */
export function post<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: RequestInit
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export function put<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: RequestInit
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export function del<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: "DELETE" });
}

/**
 * PATCH request helper
 */
export function patch<T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: RequestInit
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}
