import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for learning Retrieval-Augmented Generation. Reference design inspired by{" "}
            <Link
              href="https://github.com/Kain-90/RAG-Play"
              target="_blank"
              rel="noopener nofollow"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              RAG-Play
            </Link>
            .
          </p>
          <Link
            href="https://github.com/Kain-90/RAG-Play"
            target="_blank"
            rel="noopener nofollow"
            className="group inline-flex h-9 w-9 items-center justify-center rounded-md bg-background hover:bg-muted"
          >
            <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            <span className="sr-only">ExternalLink</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}


