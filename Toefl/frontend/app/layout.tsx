import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "TOEFL Writing Practice",
  description: "TOEFL Writing practice aligned to the 2026 pattern",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">TOEFL Writing Practice (2026)</h1>
            <nav className="flex gap-3">
              <Link href="/" className="text-accent hover:underline">
                Practice
              </Link>
              <Link href="/history" className="text-accent hover:underline">
                History
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
