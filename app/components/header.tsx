import Link from "next/link";

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
        <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link className="transition-colors hover:text-foreground" href="/">Home</Link>
          <Link className="transition-colors hover:text-foreground" href="/experiment">Experiment</Link>
          <Link className="transition-colors hover:text-foreground" href="/contact">Contact</Link>
        </div>
      </div>
    </nav>
  );
}