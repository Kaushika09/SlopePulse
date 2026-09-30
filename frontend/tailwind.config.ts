import type { Config } from "tailwindcss";

/**
 * SlopePulse design tokens.
 *
 * Colour discipline: risk severity is the ONLY saturated colour in this
 * interface. Every other surface is a neutral slate. That is deliberate — on
 * an operations screen a coloured element must mean something, so if a road
 * segment is orange the operator knows instantly that is a severity signal
 * and not branding.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral command-centre surfaces, cool-shifted so the risk hues pop.
        base: "#0A101B",       // page background
        panel: "#121B2A",      // cards, panels
        line: "#22314A",       // hairline borders
        ink: "#E8EEF8",        // primary text
        muted: "#8DA0BC",      // secondary text
        faint: "#5B6E8C",      // tertiary text, axis labels

        // Risk scale. Mandated by the brief: LOW green -> CRITICAL red.
        // Tuned for contrast against #0A101B rather than taken from defaults.
        low: "#39A56B",
        moderate: "#D9A62E",
        high: "#E07B33",
        critical: "#DC4438",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Tight utility sizes for dense data display.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        // Small, consistent radii. Nothing pill-shaped: this is an
        // instrument panel, not a marketing page.
        panel: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
