import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "RAG Lab",
  description: "Educational RAG exploration platform",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/pipeline", label: "Pipeline" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div>
              <p className="eyebrow">RAG Lab</p>
              <p className="topbar-copy">Educational RAG playground. Local-first. Free-to-run by default.</p>
            </div>
            <nav className="nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
          <footer className="footer">
            <p>Built for learning the RAG pipeline, step by step.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
