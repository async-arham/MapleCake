import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SprintBeacon - project health for developers",
    template: "%s | SprintBeacon",
  },
  description:
    "Track tasks, deadlines and team activity, and see a clear 0-100 health score for every project.",
};

export const viewport: Viewport = {
  themeColor: "#12303b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
