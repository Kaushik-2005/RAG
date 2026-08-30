import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">404</p>
        <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          The page you requested does not exist or may have been moved.
        </p>
        <div>
          <Link href="/" className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
