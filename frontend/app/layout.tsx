import type { Metadata } from "next";
// Leaflet's core stylesheet must be part of the main CSS bundle. Importing it
// inside the dynamically imported map component placed it in a lazily loaded
// chunk that the initial HTML did not reference, so the map rendered with no
// pane positioning at all - blank tiles, polylines and markers.
import "leaflet/dist/leaflet.css";
import "./globals.css";

/**
 * Type pairing: IBM Plex Sans for interface text, IBM Plex Mono for every
 * number. Plex was drawn for technical and industrial contexts and its mono
 * has genuinely distinct 0/O and 1/l — which matters when someone reads a road
 * id off a screen at speed. Numerals are set in the mono face throughout so
 * figures align in columns.
 *
 * Loaded via <link> rather than next/font on purpose. next/font downloads the
 * files at BUILD time, so a machine without internet access — or with a
 * blocked font CDN — fails the build outright. Loading at runtime means the
 * build always succeeds and a font failure degrades to the system stack
 * instead of breaking the deployment.
 */
export const metadata: Metadata = {
  title: "SlopePulse — AI Landslide Early Warning & Response",
  description:
    "Prototype decision-support for district landslide early warning. Simulated data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
