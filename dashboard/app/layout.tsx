#!/usr/bin/env ts-node
/**
 * layout.tsx --- root layout for the llmjudge dashboard
 *
 * Contains:
 *   metadata: document title and description
 *   ScalesMark: the balance that carries the brand
 *   RootLayout: wraps every page with the app shell
 */

import "./globals.css";

export const metadata = {
  title: "llmjudge",
  description: "LLM evaluation regression dashboard",
  icons: { icon: "/favicon.svg" },
};

function ScalesMark() {
  /**
   * Renders the balance used as the product mark.
   *
   * @returns mark - Inline SVG scales, sized to the header.
   */
  return (
    <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
      <g
        stroke="#c9a227"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      >
        <path d="M32 13v37" />
        <path d="M12 20h40" />
        <path d="M12 20 4 34h16zM52 20l-8 14h16z" />
        <path d="M4 34a8 8 0 0 0 16 0M44 34a8 8 0 0 0 16 0" />
      </g>
      <circle cx="32" cy="11" r="3.2" fill="#c9a227" />
      <rect x="21" y="49" width="22" height="3.4" rx="1.4" fill="#c9a227" />
      <rect x="15" y="52.4" width="34" height="3.8" rx="1.6" fill="#c9a227" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <a className="brand" href="/">
            <ScalesMark />
            <span className="brand-name">LLMJUDGE</span>
          </a>
          <nav className="app-nav">
            <a href="/">Overview</a>
            <a href="/trends">Trends</a>
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
