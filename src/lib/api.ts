/**
 * Resilient API client with automated network retry and backoff
 * Handles transient connection glitches and brief server restarts gracefully
 */

export interface ApiFetchOptions extends RequestInit {
  retries?: number;
  retryDelayMs?: number;
}

export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { retries = 2, retryDelayMs = 900, ...fetchOptions } = options;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // If server returned a transient 503 or 429 and we have retries left, wait and retry
      if ((response.status === 503 || response.status === 429) && attempt < retries) {
        await new Promise((res) => setTimeout(res, retryDelayMs * (attempt + 1)));
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      // Network errors like "Failed to fetch" (e.g. during server reboots or network blips)
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, retryDelayMs * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error(`Network request to ${url} failed.`);
}

export async function apiPost<T = any>(
  url: string,
  body: any,
  options: ApiFetchOptions = {}
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await apiFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Server request failed with status ${response.status}`
    );
  }

  return response.json();
}
