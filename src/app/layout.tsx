import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import "katex/dist/katex.min.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-reading-serif",
  display: "swap",
});
// NOTE: use a distinct `-src` variable name so it never collides with the
// Tailwind `--font-mono` theme token below (a self-reference would break it).
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-src", display: "swap" });

export const metadata: Metadata = {
  title: { default: "GitRead — Read your GitHub notes beautifully", template: "%s · GitRead" },
  description:
    "GitRead turns GitHub Markdown repositories into a premium, distraction-free reading experience.",
};

export const viewport: Viewport = {
  // Explicit mobile viewport — layout width must equal the device width so
  // Android Chrome never renders the page zoomed-out.
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcf9" },
    { media: "(prefers-color-scheme: dark)", color: "#161821" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
