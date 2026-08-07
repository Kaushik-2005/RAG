import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

const repositoryUrl = "https://github.com/Kaushik-2005/RAG";

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M12 0.5C5.648 0.5 0.5 5.648 0.5 12c0 5.082 3.292 9.395 7.862 10.916.575.106.785-.25.785-.556 0-.274-.01-1-.016-1.962-3.198.695-3.873-1.541-3.873-1.541-.523-1.33-1.277-1.684-1.277-1.684-1.044-.714.079-.699.079-.699 1.155.081 1.763 1.186 1.763 1.186 1.026 1.759 2.692 1.251 3.348.957.104-.743.402-1.251.732-1.539-2.553-.29-5.236-1.276-5.236-5.682 0-1.255.449-2.281 1.184-3.085-.119-.291-.513-1.462.112-3.049 0 0 .965-.309 3.162 1.178A10.98 10.98 0 0 1 12 6.04c.975.005 1.958.132 2.876.388 2.195-1.487 3.158-1.178 3.158-1.178.627 1.587.233 2.758.114 3.049.738.804 1.183 1.83 1.183 3.085 0 4.417-2.688 5.389-5.251 5.673.414.357.783 1.062.783 2.141 0 1.546-.014 2.792-.014 3.172 0 .309.207.668.79.555C20.211 21.391 23.5 17.08 23.5 12 23.5 5.648 18.352.5 12 .5Z" />
    </svg>
  );
}

export function Header() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="mr-6 flex items-center space-x-3" href="/">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            R
          </div>
          <span className="text-xl font-semibold">RAG Lab</span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground sm:gap-6">
          <Link className="transition-colors hover:text-foreground" href="/">Home</Link>
          <Link className="transition-colors hover:text-foreground" href="/experiment">Experiment</Link>
          <Link className="transition-colors hover:text-foreground" href="/contact">Contact</Link>
          {/* <Link
            className="transition-colors hover:text-foreground"
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open GitHub repository"
          >
            <GitHubMark />
          </Link> */}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}