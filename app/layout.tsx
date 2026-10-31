import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/700.css";
import "@fontsource/patrick-hand/400.css";
import "@fontsource/special-elite/400.css";
import { RoughDefs } from "@/components/paper-ui/doodles";
import { ToastProvider } from "@/lib/toast";
import { AuthProvider } from "@/lib/auth";
import PerfGate from "@/lib/perf";
import { CheckProvider } from "@/lib/checks";
import { MarketProvider } from "@/lib/market";
import Nav from "@/components/paper-ui/Nav";

export const metadata: Metadata = {
  title: "Paper Trader — the paper trading game",
  description:
    "Trade imaginary stocks on paper. Hand-drawn charts, sticky-note gossip, ink-stamped orders, an open ledger. No real money, just ink.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Paper Trader",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c4f28",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PerfGate />
        <RoughDefs />
        <ToastProvider>
          <AuthProvider>
            <CheckProvider>
              <MarketProvider>
                <Nav />
                {children}
              </MarketProvider>
            </CheckProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
