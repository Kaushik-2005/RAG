import { Suspense } from "react";
import { ExperimentContent } from "./components/experiment-content";

export default function ExperimentPage() {
  return (
    <main className="container mx-auto max-w-7xl px-4 py-10 pt-20 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RAG Lab</h1>
          <p className="text-muted-foreground">Explore each step of the RAG pipeline through interactive visualizations.</p>
        </div>
        <Suspense fallback={null}>
          <ExperimentContent />
        </Suspense>
      </div>
    </main>
  );
}
