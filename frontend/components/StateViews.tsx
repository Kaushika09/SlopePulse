"use client";

import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

/**
 * Loading, error and empty states.
 *
 * Errors name the failure and the fix rather than apologising — on an
 * operations screen "something went wrong" wastes the operator's time.
 */

export function LoadingBlock({
  label = "Loading",
  rows = 3,
  hint,
}: {
  label?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <div className="p-4" role="status" aria-live="polite">
      <p className="eyebrow mb-1">{label}…</p>
      {hint && <p className="mb-3 text-2xs text-faint">{hint}</p>}
      <div className="mt-2 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-8 animate-pulse rounded-sm bg-line/50"
            style={{ animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 p-4" role="alert">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-hidden />
        <div>
          <p className="text-sm font-medium text-ink">Could not load data</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-muted transition-colors hover:border-muted hover:text-ink"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-6 text-muted">
      <Inbox className="h-4 w-4 shrink-0" aria-hidden />
      <p className="text-xs">{message}</p>
    </div>
  );
}
