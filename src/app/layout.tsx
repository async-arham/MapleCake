import type { Metadata, Viewport } from "next";
import { DialogProvider } from "@/components/ui/DialogProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Maplecake - project health for developers",
    template: "%s | Maplecake",
  },
  description: "Track tasks, deadlines and team activity, and see a clear 0-100 health score for every project.",
};

export const viewport: Viewport = {
  themeColor: "#ffdd00",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.9.1/fonts/remixicon.css" />
      </head>
      <body>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
