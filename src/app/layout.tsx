import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title:       "InfoRyse — QR Ordering",
  description: "Digital Menu & QR Ordering SaaS",
  viewport:    "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`min-h-screen bg-white text-gray-900 antialiased ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
