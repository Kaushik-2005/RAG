import Link from "next/link";
import { ArrowRight, Boxes, MessageSquare, Search, SplitSquareHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

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
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
          <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">Interactive RAG Lab</h1>
            <p className="mx-auto max-w-[700px] text-gray-500 dark:text-gray-400 md:text-xl">
              Debug, visualize, and understand Retrieval-Augmented Generation through a Python-backed interactive lab.
            </p>
          </div>
          <div className="flex space-x-4">
            <Button size="lg" className="group h-12 px-8" asChild>
              <Link href="/experiment">
                Start Experiment
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
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
    </main>
  );
}
