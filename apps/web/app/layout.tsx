import type { Metadata } from "next";
import "./globals.css";

const TITLE = "Live Call Copilot — real-time agent assist";
const DESCRIPTION =
  "Talk into your mic and watch a live transcript, auto-drafted call notes, RAG-retrieved procedure docs, and a sub-second sentiment/frustration alert. Built by Harrison Jansma.";

export const metadata: Metadata = {
  metadataBase: new URL("https://agentassistdemo.harrisonjansma.com"),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://agentassistdemo.harrisonjansma.com",
    siteName: "Live Call Copilot",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Live Call Copilot" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
