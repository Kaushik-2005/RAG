import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "RAG Lab",
  description: "Educational RAG exploration platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
