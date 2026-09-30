import { RISK_CLASSES } from "@/lib/risk";
import type { RiskLevel } from "@/lib/types";

/** Severity label. The only place a saturated colour appears in text form. */
export default function RiskBadge({
  level,
  size = "sm",
}: {
  level: RiskLevel;
  size?: "sm" | "lg";
}) {
  const tone = RISK_CLASSES[level];
  return (
    <span
      className={`inline-flex items-center border font-mono uppercase tracking-[0.12em] ${tone.text} ${tone.bg} ${tone.border} ${
        size === "lg" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-2xs"
      }`}
    >
      {level}
    </span>
  );
}
