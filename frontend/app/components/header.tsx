import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function Header() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="mr-6 flex items-center space-x-3" href="/">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            R
          </div>
          <span className="text-xl font-semibold">RAG Play</span>
        </Link>

        <Link
          href="https://github.com/Kain-90/RAG-Play"
          target="_blank"
          rel="noopener nofollow"
          className="flex items-center space-x-2 text-foreground/60 transition-colors hover:text-foreground"
          aria-label="View source on ExternalLink"
        >
          <ExternalLink className="h-6 w-6" />
        </Link>
      </div>
    </nav>
  );
}


