import type { RiskLevel } from "./types";

/**
 * Single source of truth for risk presentation.
 *
 * Hex values are needed as literals for Leaflet (which draws to canvas and
 * cannot read Tailwind classes), so they live here alongside the class names
 * rather than being duplicated across components.
 */
export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "#39A56B",
  MODERATE: "#D9A62E",
  HIGH: "#E07B33",
  CRITICAL: "#DC4438",
};

export const RISK_ORDER: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];

/** Tailwind classes for badges, kept beside the hex so they cannot drift apart. */
export const RISK_CLASSES: Record<RiskLevel, { text: string; bg: string; border: string }> = {
  LOW: { text: "text-low", bg: "bg-low/10", border: "border-low/40" },
  MODERATE: { text: "text-moderate", bg: "bg-moderate/10", border: "border-moderate/40" },
  HIGH: { text: "text-high", bg: "bg-high/10", border: "border-high/40" },
  CRITICAL: { text: "text-critical", bg: "bg-critical/10", border: "border-critical/40" },
};

export function riskColor(level: RiskLevel): string {
  return RISK_COLORS[level] ?? RISK_COLORS.LOW;
}

/** Line weight scales with severity so the map reads correctly in greyscale too. */
export function riskWeight(level: RiskLevel): number {
  switch (level) {
    case "CRITICAL":
      return 7;
    case "HIGH":
      return 6;
    case "MODERATE":
      return 5;
    default:
      return 4;
  }
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-IN");
}
