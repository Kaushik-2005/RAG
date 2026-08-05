import Link from "next/link";
import { ArrowRight, Boxes, FileSearch, Lightbulb, MessageSquare, Search, SplitSquareHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

const repositoryUrl = "https://github.com/Kaushik-2005/RAG";
const featureRequestUrl = "https://github.com/Kaushik-2005/RAG/issues/new?title=Feature%20request%3A%20";

const Arrow = () => (
  <div className="hidden items-center justify-center lg:flex">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary/30">
      <path d="M0 12H22.5M22.5 12L16.5 6M22.5 12L16.5 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  </div>
);

const features = [
  {
    title: "Text Splitting",
    description: "Visualize how documents are split into meaningful chunks while preserving semantic coherence and context.",
    icon: <SplitSquareHorizontal className="h-6 w-6 text-primary" />,
    href: "/experiment?step=text-splitting",
  },
  {
    title: "Vector Embedding",
    description: "See how text is transformed into numerical vectors and visualize their relationships in high-dimensional space.",
    icon: <Boxes className="h-6 w-6 text-primary" />,
    href: "/experiment?step=embedding",
  },
  {
    title: "Semantic Search",
    description: "Experience vector similarity search and inspect how relevant context is retrieved from the knowledge base.",
    icon: <Search className="h-6 w-6 text-primary" />,
    href: "/experiment?step=semantic-search",
  },
  {
    title: "Context Generation",
    description: "Watch how retrieved context and the query combine to produce a grounded answer.",
    icon: <MessageSquare className="h-6 w-6 text-primary" />,
    href: "/experiment?step=generation",
  },
];

const learningGoals = [
  {
    title: "What this is",
    description: "RAG Lab is an interactive learning tool for understanding how retrieval-augmented generation systems work, stage by stage.",
    icon: <FileSearch className="h-5 w-5 text-primary" />,
  },
  {
    title: "Why it exists",
    description: "Most demos jump from question to answer. This project makes the intermediate decisions visible so learners can understand chunking, retrieval, and grounding instead of treating them as black boxes.",
    icon: <Lightbulb className="h-5 w-5 text-primary" />,
  },
  {
    title: "What you can learn",
    description: "Use the current pipeline to study how source text becomes chunks, how chunks become vectors, how relevant chunks are retrieved, and how context becomes a grounded answer.",
    icon: <Search className="h-5 w-5 text-primary" />,
  },
];

function FeatureCard({ feature }: { feature: (typeof features)[0] }) {
  return (
    <Link
      href={feature.href}
      className="group relative block h-[230px] overflow-hidden rounded-2xl border bg-background p-6 transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Open ${feature.title} experiment step`}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3">{feature.icon}</div>
      <h2 className="mb-3 text-lg font-bold">{feature.title}</h2>
      <p className="line-clamp-4 text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background pt-20">
      <section className="container relative mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">Interactive RAG Lab</h1>
            <p className="mx-auto max-w-[760px] text-gray-500 dark:text-gray-400 md:text-xl">
              Debug, visualize, and understand Retrieval-Augmented Generation through a frontend-first interactive lab.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="group h-12 px-8" asChild>
              <Link href="/experiment">
                Start Experiment
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" asChild>
              <Link href="/contact">Contact / Request Features</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {learningGoals.map((goal) => (
            <article key={goal.title} className="rounded-2xl border bg-background p-6">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3">{goal.icon}</div>
              <h2 className="mb-3 text-xl font-semibold">{goal.title}</h2>
              <p className="text-sm leading-7 text-muted-foreground">{goal.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current scope</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Learn the current core RAG loop before the production pipeline gets broader.</h2>
          <p className="text-base leading-8 text-muted-foreground sm:text-lg">
            The current version focuses on the essential loop: text splitting, embeddings, semantic search, and response generation.
            Future milestones will expand this into a fuller production RAG learning tool with ingestion, parsing, metadata enrichment,
            vector indexing, filtering, reranking, citations, evaluation, and monitoring.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-6 lg:flex-row">
          {features.map((feature, index) => (
            <div key={feature.title} className="contents">
              <div className="w-[280px] shrink-0">
                <FeatureCard feature={feature} />
              </div>
              {index < features.length - 1 ? <Arrow /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border bg-background px-8 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">Want to suggest a feature or ask for a stage to be added?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            RAG Lab is being built incrementally toward a production-grade educational pipeline. If you want a specific stage,
            comparison mode, visualization, or debugging workflow, send a feature request through GitHub.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button className="h-11 px-6" asChild>
              <Link href={featureRequestUrl} target="_blank" rel="noopener noreferrer">Request a Feature</Link>
            </Button>
            <Button variant="outline" className="h-11 px-6" asChild>
              <Link href={repositoryUrl} target="_blank" rel="noopener noreferrer">View Project Repository</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}