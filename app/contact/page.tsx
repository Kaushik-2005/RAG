import Link from "next/link";
import { FolderGit2, Lightbulb, Mail, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";

const repositoryUrl = "https://github.com/Kaushik-2005/RAG";
const issuesUrl = "https://github.com/Kaushik-2005/RAG/issues";
const featureRequestUrl = "https://github.com/Kaushik-2005/RAG/issues/new?title=Feature%20request%3A%20";

const contactOptions = [
  {
    title: "Request a feature",
    description: "Ask for a new pipeline stage, visualization, comparison workflow, or educational explanation.",
    href: featureRequestUrl,
    icon: <Lightbulb className="h-5 w-5 text-primary" />,
    cta: "Open feature request",
  },
  {
    title: "Report an issue",
    description: "If something is broken, confusing, or incomplete, open an issue with reproduction steps and screenshots.",
    href: issuesUrl,
    icon: <MessageSquare className="h-5 w-5 text-primary" />,
    cta: "Open issues",
  },
  {
    title: "Project repository",
    description: "Review the code, roadmap, and current implementation details directly in the GitHub repository.",
    href: repositoryUrl,
    icon: <FolderGit2 className="h-5 w-5 text-primary" />,
    cta: "View repository",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background pt-20">
      <section className="container mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">Contact</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Contact RAG Lab or request a feature</h1>
          <p className="mt-6 text-base leading-8 text-muted-foreground sm:text-lg">
            RAG Lab is being built as a production-grade educational RAG learning tool. The best current way to request a feature,
            report a bug, or follow the roadmap is through the GitHub project.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {contactOptions.map((option) => (
            <article key={option.title} className="rounded-2xl border bg-background p-6">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3">{option.icon}</div>
              <h2 className="text-xl font-semibold">{option.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{option.description}</p>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href={option.href} target="_blank" rel="noopener noreferrer">{option.cta}</Link>
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border bg-background px-8 py-10">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">What to include in a good feature request</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <li>- Which stage of the RAG pipeline the feature belongs to</li>
                <li>- What the learner should be able to see or understand after using it</li>
                <li>- Any reference screenshots, products, or papers that explain the idea</li>
                <li>- Whether the feature is educational, debugging-focused, or production-simulation focused</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}