import type { Metadata } from "next";
import "github-markdown-css/github-markdown.css";
import "./globals.css";

import { Footer } from "@/app/components/footer";
import { Header } from "@/app/components/header";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "RAG Lab - Interactive RAG Pipeline Visualization",
  description: "An interactive tool for visualizing and understanding Retrieval-Augmented Generation pipelines with a Python backend.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Header />
        {children}
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
