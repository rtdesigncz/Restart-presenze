// src/app/layout.tsx
import "./polyfills"; // <--- IMPORTA POLYFILL PRIMA DI TUTTO
import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ToastProvider";
import NoServiceWorker from "@/components/NoServiceWorker";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#1eb4b9",
  width: "device-width",
  initialScale: 1
};

export const metadata: Metadata = {
  title: "Presenze Restart",
  description: "Gestione presenze - Restart Fitness Club",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon-v2.ico?v=3", sizes: "any" }],
    apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased min-h-screen">
        <NoServiceWorker />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}