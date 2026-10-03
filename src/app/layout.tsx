import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scooter Battery",
  description: "Live battery, range and cell health for your e-scooter",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Scooter",
  },
};

export const viewport: Viewport = {
  themeColor: "#040605",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${barlow.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
