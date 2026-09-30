"use client";

/**
 * SlopePulse API client.
 *
 * The base URL comes from NEXT_PUBLIC_API_URL and is never hard-coded, so the
 * same build runs against a local backend or the deployed Render service.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const CONFIGURED_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * True when NEXT_PUBLIC_API_URL was actually provided at build time.
 *
 * The localhost fallback below is a convenience for local development only. On
 * a deployed site it would be worse than useless: the browser would try to
 * reach the judge's own machine and fail with a confusing network error. The
 * dashboard checks this flag and shows a configuration banner instead, so a
 * missing Vercel environment variable is diagnosed in one glance rather than
 * mistaken for a broken backend.
 */
export const API_URL_CONFIGURED = Boolean(CONFIGURED_URL);

/** Trailing slashes are a common paste error and produce `//api/...` URLs. */
export const API_BASE = (CONFIGURED_URL ?? "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Fetch JSON from the API.
 *
 * A free-tier backend can be asleep, so the timeout is generous — 45s rather
 * than the browser default. A cold start that eventually succeeds is much
 * better than a fast failure a judge sees as a broken demo.
 */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 45_000);

  // Combine the caller's abort signal with our timeout.
  signal?.addEventListener("abort", () => timeout.abort());

  try {
    response = await fetch(`${API_BASE}${path}`, {
      signal: timeout.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new ApiError(
        "The API did not respond in time. A free-tier backend can take up to a minute to wake up.",
        0,
      );
    }
    throw new ApiError(
      `Cannot reach the API at ${API_BASE}. Check that the backend is running and that NEXT_PUBLIC_API_URL is correct.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // The backend always returns {"detail": "..."} for errors.
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* response had no JSON body — keep the status message */
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

/**
 * POST JSON to the API. Used by the scenario simulator, which drives
 * /api/simulate so the model genuinely re-scores rather than the browser
 * reformatting numbers it already has.
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 45_000);
  signal?.addEventListener("abort", () => timeout.abort());

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      signal: timeout.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new ApiError("The API did not respond in time.", 0);
    }
    throw new ApiError(`Cannot reach the API at ${API_BASE}.`, 0);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const parsed = await response.json();
      if (parsed?.detail) detail = String(parsed.detail);
    } catch {
      /* no JSON body */
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Load a GET endpoint with loading, error and retry handling.
 *
 * `path` may be null to skip the request entirely — used when a detail panel
 * has nothing selected yet.
 */
export function useApi<T>(path: string | null, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (path === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++latest.current;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    apiGet<T>(path, controller.signal)
      .then((result) => {
        // Ignore responses from superseded requests, otherwise fast scenario
        // switching can render stale data.
        if (requestId === latest.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: ApiError) => {
        if (requestId === latest.current && err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  return { data, loading, error, reload };
}
