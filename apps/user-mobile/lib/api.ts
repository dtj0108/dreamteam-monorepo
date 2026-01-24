import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const WORKSPACE_ID_KEY = "currentWorkspaceId";

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
  // Get current session (Supabase handles token refresh automatically)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get workspace ID from storage
  const workspaceId = await AsyncStorage.getItem(WORKSPACE_ID_KEY);

  // Build URL with workspaceId query parameter
  const url = new URL(`${API_URL}${endpoint}`);
  if (workspaceId) {
    url.searchParams.append("workspaceId", workspaceId);
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: session ? `Bearer ${session.access_token}` : "",
      ...options.headers,
    },
  });

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


