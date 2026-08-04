import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-10 md:h-24 md:py-0">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            Built for learning Retrieval-Augmented Generation. Design reference inspired by{" "}
            <Link
              href="https://rag-play.vercel.app/"
              target="_blank"
              rel="noopener nofollow"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              RAG Play
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
