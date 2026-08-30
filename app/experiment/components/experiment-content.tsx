"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Boxes, Database, FileText, Filter, ListOrdered, MessageSquare, ScanText, Search, SplitSquareHorizontal, Tags, Waypoints, FileSearch } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateGroundedAnswer, type PipelineResponse } from "@/lib/api";
import { buildMetadata, cleanDocument, ingestDocument, type CleaningOptions } from "@/lib/document-prep";
import { runLocalPipeline } from "@/lib/pipeline";
import { embedTo2D } from "@/lib/utils";
import { DataSourcesTab } from "./data-sources-tab";
import { EmbeddingTab } from "./embedding-tab";
import { GenerationTab } from "./generation-tab";
import { IngestionTab } from "./ingestion-tab";
import { MetadataEnrichmentTab } from "./metadata-enrichment-tab";
import { ParsingCleaningTab } from "./parsing-cleaning-tab";
import { CandidateRetrievalTab } from "./candidate-retrieval-tab";
import { FilteringTab } from "./filtering-tab";
import { QueryProcessingTab } from "./query-processing-tab";
import { SemanticSearchTab } from "./semantic-search-tab";
import { TextSplittingTab } from "./text-splitting-tab";
import { VectorIndexTab } from "./vector-index-tab";

export const phaseTabs = [
  {
    id: "document-prep",
    label: "Document Prep",
    description: "Prepare source content before it is embedded or searched.",
  },
  {
    id: "retrieval-setup",
    label: "Retrieval Setup",
    description: "Build vector representations and indexing-time retrieval artifacts.",
  },
  {
    id: "query-time-retrieval",
    label: "Query-Time Retrieval",
    description: "Process the query and inspect how relevant chunks are selected.",
  },
  {
    id: "response-assembly",
    label: "Response Assembly",
    description: "Construct grounded context and generate the final answer.",
  },
] as const;

export const stageTabs = [
  {
    id: "data-sources",
    phase: "document-prep",
    label: "Data Sources",
    hint: "Document input",
    title: "Data Sources",
    description: "Choose the source material, label its format, and establish the raw input the rest of document preparation will operate on.",
    explanation: "Production RAG starts with source selection. Before any cleaning or chunking, the system needs to know what kind of document it is dealing with and what raw text should move into ingestion.",
    icon: FileText,
  },
  {
    id: "ingestion",
    phase: "document-prep",
    label: "Ingestion",
    hint: "Working document",
    title: "Ingestion",
    description: "Convert the raw source into a stable working document with normalized structure and baseline counts.",
    explanation: "Ingestion is where raw content becomes pipeline-ready. It does not decide meaning yet, but it creates the canonical document representation that later stages can clean, annotate, and split consistently.",
    icon: Database,
  },
  {
    id: "parsing-cleaning",
    phase: "document-prep",
    label: "Parsing & Cleaning",
    hint: "Normalization",
    title: "Parsing & Cleaning",
    description: "Remove formatting noise and normalize spacing so later chunking decisions are made on cleaner text.",
    explanation: "This stage reduces structural noise without changing the document's meaning. Even small cleanup choices can change chunk boundaries, keyword extraction, and retrieval precision.",
    icon: ScanText,
  },
  {
    id: "metadata-enrichment",
    phase: "document-prep",
    label: "Metadata Enrichment",
    hint: "Document signals",
    title: "Metadata Enrichment",
    description: "Attach document-level signals such as identifiers, keywords, and chunking recommendations before indexing.",
    explanation: "Metadata is how later phases reason about more than plain text. It supports filtering, observability, routing, and retrieval policy decisions before embeddings are created.",
    icon: Tags,
  },
  {
    id: "text-splitting",
    phase: "document-prep",
    label: "Text Splitting",
    hint: "Chunk strategy",
    title: "Text Splitting",
    description: "Split the cleaned document into retrieval units while balancing semantic coherence, size, and overlap.",
    explanation: "Chunking defines the units retrieval can search. This stage applies the selected splitter to the cleaned document and shows exactly what passages the rest of the pipeline will embed.",
    icon: SplitSquareHorizontal,
  },
  {
    id: "embedding",
    phase: "retrieval-setup",
    label: "Vector Embedding",
    hint: "Embedding model",
    title: "Vector Embedding",
    description: "View the chunks and their vector embeddings side by side before any query-time retrieval happens.",
    explanation: "This stage only changes the browser-side embedding strategy. The output shows the chunk text and the vectors produced from that text.",
    icon: Boxes,
  },
  {
    id: "vector-index",
    phase: "retrieval-setup",
    label: "Vector Index",
    hint: "Indexed store",
    title: "Vector Index",
    description: "Inspect how chunk embeddings are organized into an index structure before any user query is scored.",
    explanation: "Embeddings are only useful for retrieval after they are stored in an index. This stage makes that indexing step explicit so learners can see what retrieval actually searches over.",
    icon: Waypoints,
  },
  {
    id: "query-processing",
    phase: "query-time-retrieval",
    label: "Query Processing",
    hint: "Normalize query",
    title: "Query Processing",
    description: "Normalize and inspect the user question before it is embedded and matched against the vector index.",
    explanation: "Production retrieval often begins with query cleanup and inspection. This stage makes the pre-embedding query representation visible before similarity search runs.",
    icon: FileSearch,
  },
  {
    id: "candidate-retrieval",
    phase: "query-time-retrieval",
    label: "Candidate Retrieval",
    hint: "Score candidates",
    title: "Candidate Retrieval",
    description: "Score every indexed chunk against the processed query and inspect the ranked candidate pool before the final search view.",
    explanation: "This stage makes the retrieval cutoff explicit. Every indexed chunk receives a score, then the system selects the current top-k candidates to carry forward.",
    icon: ListOrdered,
  },
  {
    id: "filtering",
    phase: "query-time-retrieval",
    label: "Filtering",
    hint: "Prune candidates",
    title: "Filtering",
    description: "Remove weak or unsuitable candidates from the selected retrieval window before the final semantic-search view.",
    explanation: "Production pipelines often filter candidates by score, metadata, permissions, freshness, or lexical constraints. This stage makes that pruning step explicit.",
    icon: Filter,
  },
  {
    id: "semantic-search",
    phase: "query-time-retrieval",
    label: "Semantic Search",
    hint: "Query and ranking",
    title: "Semantic Search",
    description: "Embed a query, compare it against the knowledge-base vectors, and inspect the chunks selected for retrieval.",
    explanation: "This stage only changes the query and retrieval settings. The output shows the query embedding, similarity scores, and the retrieved chunks.",
    icon: Search,
  },
  {
    id: "generation",
    phase: "response-assembly",
    label: "Context Generation",
    hint: "Answer output",
    title: "Context Generation",
    description: "Observe how the LLM combines retrieved context with the user query to generate a grounded response.",
    explanation: "This stage uses the retrieved chunks and query from the previous step. The output shows the final answer and the exact context passed to the model.",
    icon: MessageSquare,
  },
] as const;

export const sourceKindOptions = [
  { value: "essay", label: "Essay / article" },
  { value: "markdown", label: "Markdown document" },
  { value: "notes", label: "Notes / KB entry" },
] as const;

export const chunkerOptions = [
  { value: "character", label: "Fixed Character", description: "Simple uniform segmentation based on predetermined character length. Best for fast iteration and low-overhead demos." },
  { value: "recursive", label: "Recursive Character", description: "Preserves paragraph and sentence boundaries first, then falls back to smaller separators when needed." },
  { value: "token", label: "Token Aware", description: "Uses a real token-based splitter so chunk size and overlap are measured in tokens rather than raw characters." },
  { value: "markdown", label: "Markdown Structure", description: "Uses headings and markdown structure first so sections stay grouped logically." },
] as const;

export const embeddingOptions = [
  { value: "tfidf", label: "TF-IDF (Browser)" },
  { value: "hashing-384", label: "Hashing 384d (Browser)" },
  { value: "chargram-384", label: "Char N-grams 384d (Browser)" },
] as const;

export const vectorStoreOptions = [
  { value: "cosine", label: "Cosine Similarity" },
  { value: "dot", label: "Dot Product" },
] as const;

export const defaultSourceText = `  Retrieval-augmented generation, or RAG, is a system design pattern that improves the output of a large language model by connecting it to external knowledge before an answer is produced.  Instead of relying only on what the model memorized during training, a RAG system retrieves relevant information from trusted sources and passes that information into the prompt as context. This makes the final answer more grounded, more current, and easier to inspect. In practice, teams adopt RAG when they want higher factual accuracy, better control over responses, and clearer visibility into which documents influenced an answer.   

Large language models are capable of fluent and useful text generation, but they also have structural limitations.   Their training data may be stale, they may answer confidently even when evidence is weak, and they may not naturally prioritize authoritative internal documents over broad public knowledge. RAG addresses these weaknesses by explicitly retrieving information from selected data sources at question time. This allows an application to respond using updated manuals, policies, technical documentation, research notes, or knowledge-base records without retraining the base model. In production systems, this pattern improves trust, reduces hallucination risk, and makes it easier to connect model outputs to real business data.



A central step in RAG is chunking, which is the process of splitting a long source document into smaller units before embeddings are created. A full document is often too large and too mixed in topic to compare directly against a short user query, so the pipeline breaks it into manageable passages.  Each chunk should be large enough to preserve meaning, but small enough to isolate relevant information. Good chunking improves retrieval because the system compares the user query with focused passages instead of one long block of unrelated material. If chunking is poor, the retriever may miss relevant evidence, return noisy passages, or dilute the importance of the information that actually matters.

Chunking matters because it affects nearly every downstream stage in the pipeline. If chunks are too short, they may lose context and no longer contain enough information to answer a question. If chunks are too large, similarity search becomes less precise because a single chunk may contain several unrelated ideas. Overlap is often added so that information near boundaries is not lost when a sentence or concept spans two chunks. Different chunking strategies create different tradeoffs. Fixed-size chunking is simple and predictable. Recursive chunking tries to preserve paragraph and sentence boundaries. Token-aware chunking aligns better with model context windows. Markdown-aware chunking uses visible document structure such as headings, lists, and sections to keep related material together.    

After chunking, each passage is transformed into a vector representation called an embedding. An embedding is a numerical representation of text that places semantically related passages near each other in vector space. The goal is not to preserve the exact words of a chunk, but to preserve enough meaning that similar text can be found later. Queries are embedded with the same model so the system can compare a user question to stored document chunks mathematically. This makes semantic retrieval possible even when the question and the document do not use exactly the same wording.

At query time, the user question is converted into its own embedding and compared with the chunk embeddings stored in the index. The system ranks candidate chunks by similarity and selects the top matches for further processing. This is the retrieval step. Retrieval is critical because the model can only generate a grounded answer if the relevant evidence is actually surfaced. If the correct chunk is never retrieved, the generation model does not have the information it needs. That is why retrieval quality is often the most important bottleneck in a production RAG system.

Many production RAG systems add logic after the first retrieval pass. Metadata filtering narrows the candidate set based on source, date, document type, permissions, or section labels. Reranking then reorders the retrieved candidates using a more precise model or heuristic so that the strongest evidence is prioritized.  The first retrieval step is optimized for speed, while reranking is optimized for relevance. This two-stage design often improves answer quality because the final context is built from the best candidates rather than only the fastest approximate matches.


Once the system has selected the most relevant chunks, it assembles them into the prompt context passed to the language model. This stage is often called context construction or prompt augmentation. The system may include chunk text, source titles, metadata, timestamps, and citations. The final prompt should be structured so the model can clearly separate the user question from the retrieved evidence. Good context construction reduces ambiguity, improves citation quality, and helps the model stay grounded. Bad context construction can waste context window space or bury the most useful evidence under less relevant text.

Response generation is the final step where the language model produces an answer using the retrieved context. In a grounded RAG system, the model should answer only from the supplied evidence. If the answer is not supported by the retrieved context, the system should abstain or explicitly state that the information is not available. This is a deliberate product choice. In many applications, it is better for a system to admit uncertainty than to generate a confident but unsupported answer. Strict grounding is especially valuable in high-trust workflows such as internal knowledge assistants, compliance tools, research support systems, and enterprise search experiences.

A useful RAG application should not only give an answer, but also show why that answer was produced. Citations connect the response back to the retrieved source chunks. This lets users inspect the original evidence and judge whether the answer is justified. It also helps developers debug failures. When an answer is wrong, the problem could come from ingestion, parsing, cleaning, chunking, embeddings, retrieval, reranking, context construction, or generation. Showing the retrieved chunks makes the pipeline observable rather than opaque and turns the system into something engineers can improve systematically.

A basic demo pipeline usually shows text splitting, embeddings, retrieval, and response generation. A production RAG system adds more stages before and after that core loop. Upstream stages may include data ingestion, parsing, cleaning, deduplication, metadata enrichment, and indexing. Query-time stages may include normalization, expansion, candidate retrieval, filtering, reranking, and context packing. Downstream stages may include citation rendering, groundedness checks, evaluation, latency tracking, and monitoring. These additions are not cosmetic. They are the difference between a toy example and a system that can be trusted in real use.

RAG is therefore not just a prompt trick. It is an engineering pipeline that combines document preparation, semantic retrieval, and grounded generation. Chunking matters because it determines the units the retriever can search. Embeddings matter because they translate meaning into vector space. Retrieval matters because only retrieved evidence can support the answer. Context construction matters because the model needs clean and relevant evidence. Generation matters because the final answer should be concise, factual, and limited to what the context supports. A strong RAG system is the result of many good decisions across the full pipeline, not just a single model call.   `;

export const sourceTitleSamples = {
  essay: "RAG reference essay",
  markdown: "RAG architecture markdown guide",
  notes: "RAG implementation notes",
} as const;

export const sourceTextSamples = {
  essay: defaultSourceText,
  markdown: `# Retrieval-Augmented Generation  

Retrieval-augmented generation (RAG) connects a language model to external knowledge so answers can be grounded in source material instead of relying only on model memory.   

## Why teams use it

- improve factual grounding  
- use current internal documents
- inspect which passages influenced an answer
- reduce unsupported generations


## Core preparation flow

Before retrieval can work well, source documents have to be prepared carefully.  A production pipeline usually ingests files from trusted systems, normalizes formatting, extracts metadata, and splits content into chunks that are suitable for embedding.

## Why chunking matters

Chunking defines the units retrieval can search. Very small chunks may lose context.   Very large chunks may mix unrelated ideas. Recursive or markdown-aware chunking often works well for structured technical content because section boundaries already carry meaning.

## Metadata examples

Useful metadata may include:

- document id
- source type
- team ownership
- updated date
- security label
- section title


## Downstream use

After chunking, each passage is embedded into a vector. At query time, the user question is embedded with the same model, the nearest chunks are retrieved, and the best context is passed into the generation step.   `,
  notes: `  RAG implementation notes

RAG improves LLM answers by retrieving external evidence first.   

Practical goals:
- keep answers grounded
- show supporting passages
- reduce hallucinations
- support fresh internal knowledge


Document prep matters.
Raw text is rarely ready for retrieval.
Common steps:
- ingest source
- normalize formatting
- remove noisy spacing
- add metadata
- split into chunks

Chunking guidance:
- tiny chunks lose context
- huge chunks reduce precision
- overlap helps preserve boundary meaning
- recursive chunking is a good general default

Metadata can help later with:
- filtering by source or team
- routing by document type
- showing citations
- debugging retrieval mistakes


Retrieval flow:
query -> query embedding -> candidate chunks -> ranking -> context -> answer

Grounded generation rule:
If the answer is not supported by retrieved context, the system should abstain instead of inventing facts.   `
} as const;

export type ExperimentPhase = (typeof phaseTabs)[number]["id"];
export type ExperimentStep = (typeof stageTabs)[number]["id"];
export type SourceKindValue = (typeof sourceKindOptions)[number]["value"];
export type ChunkerValue = (typeof chunkerOptions)[number]["value"];
export type EmbeddingValue = (typeof embeddingOptions)[number]["value"];
export type VectorStoreValue = (typeof vectorStoreOptions)[number]["value"];

export const chunkerPresets: Record<ChunkerValue, { chunkSize: number; chunkOverlap: number }> = {
  character: { chunkSize: 500, chunkOverlap: 50 },
  recursive: { chunkSize: 500, chunkOverlap: 50 },
  token: { chunkSize: 120, chunkOverlap: 20 },
  markdown: { chunkSize: 400, chunkOverlap: 40 },
};

const isExperimentPhase = (phase: string | null): phase is ExperimentPhase => phaseTabs.some((item) => item.id === phase);
const isExperimentStep = (step: string | null): step is ExperimentStep => stageTabs.some((item) => item.id === step);
const getStagesForPhase = (phase: ExperimentPhase) => stageTabs.filter((stage) => stage.phase === phase);

function injectFormattingNoise(value: string, sourceKind: SourceKindValue) {
  const categoryIndex = [
    value.split("  ").length,
    value.split("\n\n\n").length,
    value.split("\n   ").length,
    value.split("- ").length,
    value.split("# ").length,
  ].reduce((total, count) => total + count, 0) % 5;

  if (sourceKind === "markdown") {
    const variants = [
      (text: string) => text.replace(/A production pipeline usually ingests files/, "A production pipeline  usually ingests files"),
      (text: string) => text.replace(/\n\n## Why teams use it/, "\n\n\n## Why teams use it"),
      (text: string) => text.replace(/^# /m, "  # "),
      (text: string) => text.replace(/- document id/, "-  document id"),
      (text: string) => text.replace(/## Downstream use/, " ## Downstream use"),
    ];

    return variants[categoryIndex]?.(value).concat("\n") ?? value.concat("\n");
  }

  if (sourceKind === "notes") {
    const variants = [
      (text: string) => text.replace(/retrieving external evidence first\./, "retrieving external evidence first.   "),
      (text: string) => text.replace(/\n\nDocument prep matters\./, "\n\n\nDocument prep matters."),
      (text: string) => text.replace(/^RAG implementation notes/m, "  RAG implementation notes"),
      (text: string) => text.replace(/- keep answers grounded/, "-  keep answers grounded"),
      (text: string) => text.replace(/Metadata can help later with:/, " Metadata can help later with:"),
    ];

    return variants[categoryIndex]?.(value).concat("\n") ?? value.concat("\n");
  }

  const variants = [
    (text: string) => text.replace(/before an answer is produced\./, "before an answer is produced.  "),
    (text: string) => text.replace(/\n\nA central step in RAG is chunking/, "\n\n\nA central step in RAG is chunking"),
    (text: string) => text.replace(/^/, "  "),
    (text: string) => text.replace(/Instead of relying only on what the model memorized during training/, "Instead of relying only on what the model memorized during training\n-"),
    (text: string) => text.replace(/Reranking then reorders the retrieved candidates/, " Reranking then reorders the retrieved candidates"),
  ];

  return variants[categoryIndex]?.(value).concat(" ") ?? value.concat(" ");
}

export function ExperimentContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedPhase = searchParams.get("phase");
  const requestedStep = searchParams.get("step");

  const defaultStage = stageTabs[0];
  const activePhase = isExperimentPhase(requestedPhase)
    ? requestedPhase
    : isExperimentStep(requestedStep)
      ? stageTabs.find((stage) => stage.id === requestedStep)?.phase ?? defaultStage.phase
      : defaultStage.phase;

  const stagesInActivePhase = getStagesForPhase(activePhase);
  const activeStep = isExperimentStep(requestedStep) && stagesInActivePhase.some((stage) => stage.id === requestedStep)
    ? requestedStep
    : stagesInActivePhase[0]?.id ?? defaultStage.id;

  const [sourceTitle, setSourceTitle] = useState<string>(sourceTitleSamples.essay);
  const [sourceKind, setSourceKind] = useState<SourceKindValue>("essay");
  const [sourceText, setSourceText] = useState<string>(sourceTextSamples.essay);
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    trimLines: true,
    normalizeSpaces: true,
    collapseBlankLines: true,
  });
  const [query, setQuery] = useState("What is RAG?");
  const [chunker, setChunker] = useState<ChunkerValue>("recursive");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [embeddingModel, setEmbeddingModel] = useState<EmbeddingValue>("tfidf");
  const [vectorStore, setVectorStore] = useState<VectorStoreValue>("cosine");
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0);
  const [requireKeywordOverlap, setRequireKeywordOverlap] = useState(false);
  const [minWordCount, setMinWordCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResponse | null>(null);

  const ingestedDocument = useMemo(() => ingestDocument({ title: sourceTitle, sourceKind, text: sourceText }), [sourceKind, sourceText, sourceTitle]);
  const cleanedDocument = useMemo(() => cleanDocument(ingestedDocument.normalizedText, cleaningOptions), [cleaningOptions, ingestedDocument.normalizedText]);
  const documentMetadata = useMemo(() => buildMetadata({ title: sourceTitle, sourceKind, ingested: ingestedDocument, cleaned: cleanedDocument }), [cleanedDocument, ingestedDocument, sourceKind, sourceTitle]);

  const currentPhase = useMemo(() => phaseTabs.find((phase) => phase.id === activePhase) ?? phaseTabs[0], [activePhase]);
  const currentStage = useMemo(() => stageTabs.find((stage) => stage.id === activeStep) ?? stageTabs[0], [activeStep]);

  const chunkEmbeddingPoints = useMemo(() => {
    if (!result?.chunk_embeddings?.length) return [] as Array<{ x: number; y: number; label: string; chunk: number }>;
    try {
      return embedTo2D(result.chunk_embeddings).map((point, index) => ({ x: point.x, y: point.y, label: `Chunk ${index + 1}`, chunk: index + 1 }));
    } catch {
      return [] as Array<{ x: number; y: number; label: string; chunk: number }>;
    }
  }, [result]);

  const semanticEmbeddingPoints = useMemo(() => {
    if (!result?.query_embedding?.length || !result?.chunk_embeddings?.length) {
      return { queryPoint: null as { x: number; y: number } | null, points: [] as Array<{ x: number; y: number; label: string; chunk: number }> };
    }
    try {
      const embedding2d = embedTo2D([result.query_embedding, ...result.chunk_embeddings]);
      return {
        queryPoint: { x: embedding2d[0].x, y: embedding2d[0].y },
        points: embedding2d.slice(1).map((point, index) => ({ x: point.x, y: point.y, label: `Chunk ${index + 1}`, chunk: index + 1 })),
      };
    } catch {
      return { queryPoint: null as { x: number; y: number } | null, points: [] as Array<{ x: number; y: number; label: string; chunk: number }> };
    }
  }, [result]);

  const updateRoute = (phase: ExperimentPhase, step: ExperimentStep) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("phase", phase);
    params.set("step", step);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePhaseChange = (nextPhase: string) => {
    if (!isExperimentPhase(nextPhase)) return;
    const firstStage = getStagesForPhase(nextPhase)[0];
    if (!firstStage) return;
    updateRoute(nextPhase, firstStage.id);
  };

  const handleStepChange = (nextStep: string) => {
    if (!isExperimentStep(nextStep)) return;
    const stage = stageTabs.find((item) => item.id === nextStep);
    if (!stage) return;
    updateRoute(stage.phase, stage.id);
  };

  const handleSourceKindChange = (value: SourceKindValue) => {
    setSourceKind(value);
    setSourceTitle(sourceTitleSamples[value]);
    setSourceText(sourceTextSamples[value]);
    setResult(null);
    setError(null);
  };

  const handleInjectNoise = () => {
    setSourceText((current) => injectFormattingNoise(current, sourceKind));
    setResult(null);
    setError(null);
  };

  const handleChunkerChange = (value: ChunkerValue) => {
    setChunker(value);
    const preset = chunkerPresets[value];
    setChunkSize(preset.chunkSize);
    setChunkOverlap(preset.chunkOverlap);
    setResult(null);
    setError(null);
  };

  async function handleRun(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const nextResult = await runLocalPipeline({
        query,
        sourceText: cleanedDocument.text,
        sourceTitle,
        chunker,
        chunkSize,
        chunkOverlap,
        embeddingModel,
        vectorStore,
        topK,
        minScore,
        requireKeywordOverlap,
        minWordCount,
      });

      if (activeStep === "generation") {
        if (!nextResult.context.trim()) {
          setResult({ ...nextResult, answer: "I do not know based on the provided context." });
        } else {
          const answer = await generateGroundedAnswer({ query: nextResult.query, context: nextResult.context });
          setResult({ ...nextResult, answer });
        }
      } else {
        setResult(nextResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline request failed.");
    } finally {
      setLoading(false);
    }
  }

  const stageGridClass = stagesInActivePhase.length === 1 ? "grid-cols-1" : stagesInActivePhase.length === 2 ? "grid-cols-2" : stagesInActivePhase.length <= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-5";

  return (
    <div className="space-y-4">
      <Tabs value={activePhase} onValueChange={handlePhaseChange} className="space-y-3">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-[#ececec] bg-[#f5f5f5] p-1 dark:border-[#2a2a2a] dark:bg-[#151515] md:grid-cols-4">
          {phaseTabs.map((phase) => (
            <TabsTrigger key={phase.id} value={phase.id} className="space-x-2 text-[#5f6b7a] dark:text-[#8c8c8c] data-[state=active]:bg-white data-[state=active]:text-[#0f172a] data-[state=active]:shadow-none dark:data-[state=active]:bg-[#222222] dark:data-[state=active]:text-[#f3f3f3] dark:data-[state=active]:shadow-none">
              <span>{phase.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          <span>{currentPhase.label}</span>
        </div>
        <p className="text-sm text-muted-foreground">{currentPhase.description}</p>
      </div>

      <Tabs value={activeStep} onValueChange={handleStepChange} className="space-y-4">
        <TabsList className={`grid h-auto w-full gap-1 rounded-2xl border border-[#ececec] bg-[#f5f5f5] p-1 dark:border-[#2a2a2a] dark:bg-[#151515] ${stageGridClass}`}>
          {stagesInActivePhase.map((stage) => {
            const Icon = stage.icon;
            return (
              <TabsTrigger key={stage.id} value={stage.id} className="space-x-2 text-[#5f6b7a] dark:text-[#8c8c8c] data-[state=active]:bg-white data-[state=active]:text-[#0f172a] data-[state=active]:shadow-none dark:data-[state=active]:bg-[#222222] dark:data-[state=active]:text-[#f3f3f3] dark:data-[state=active]:shadow-none">
                <Icon className="h-4 w-4" />
                <span>{stage.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="data-sources" className="stage-panel-shell" forceMount hidden={activeStep != "data-sources"}>
          <DataSourcesTab currentStage={currentStage} sourceTitle={sourceTitle} setSourceTitle={setSourceTitle} sourceKind={sourceKind} setSourceKind={handleSourceKindChange} sourceText={sourceText} setSourceText={setSourceText} onInjectNoise={handleInjectNoise} charCount={ingestedDocument.charCount} wordCount={ingestedDocument.wordCount} paragraphCount={ingestedDocument.paragraphCount} estimatedTokens={ingestedDocument.estimatedTokens} />
        </TabsContent>
        <TabsContent value="ingestion" className="stage-panel-shell" forceMount hidden={activeStep != "ingestion"}>
          <IngestionTab currentStage={currentStage} sourceText={sourceText} ingestedDocument={ingestedDocument} />
        </TabsContent>
        <TabsContent value="parsing-cleaning" className="stage-panel-shell" forceMount hidden={activeStep != "parsing-cleaning"}>
          <ParsingCleaningTab currentStage={currentStage} ingestedDocument={ingestedDocument} cleanedDocument={cleanedDocument} cleaningOptions={cleaningOptions} setCleaningOptions={setCleaningOptions} />
        </TabsContent>
        <TabsContent value="metadata-enrichment" className="stage-panel-shell" forceMount hidden={activeStep != "metadata-enrichment"}>
          <MetadataEnrichmentTab currentStage={currentStage} metadata={documentMetadata} />
        </TabsContent>
        <TabsContent value="text-splitting" className="stage-panel-shell" forceMount hidden={activeStep != "text-splitting"}>
          <TextSplittingTab currentStage={currentStage} sourceText={cleanedDocument.text} setSourceText={setSourceText} chunker={chunker} setChunker={handleChunkerChange} chunkSize={chunkSize} setChunkSize={setChunkSize} chunkOverlap={chunkOverlap} setChunkOverlap={setChunkOverlap} recommendedChunker={documentMetadata.recommendedChunker} recommendedChunkSize={documentMetadata.recommendedChunkSize} loading={loading} error={error} result={result} onRun={handleRun} />
        </TabsContent>
        <TabsContent value="embedding" className="stage-panel-shell" forceMount hidden={activeStep != "embedding"}>
          <EmbeddingTab currentStage={currentStage} embeddingModel={embeddingModel} setEmbeddingModel={setEmbeddingModel} loading={loading} error={error} result={result} points={chunkEmbeddingPoints} onRun={handleRun} />
        </TabsContent>
        <TabsContent value="vector-index" className="stage-panel-shell" forceMount hidden={activeStep != "vector-index"}>
          <VectorIndexTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} />
        </TabsContent>
        <TabsContent value="query-processing" className="stage-panel-shell" forceMount hidden={activeStep != "query-processing"}>
          <QueryProcessingTab currentStage={currentStage} query={query} setQuery={setQuery} loading={loading} error={error} result={result} onRun={handleRun} />
        </TabsContent>
        <TabsContent value="candidate-retrieval" className="stage-panel-shell" forceMount hidden={activeStep != "candidate-retrieval"}>
          <CandidateRetrievalTab currentStage={currentStage} topK={topK} setTopK={setTopK} vectorStore={vectorStore} setVectorStore={setVectorStore} loading={loading} error={error} result={result} onRun={handleRun} />
        </TabsContent>
        <TabsContent value="filtering" className="stage-panel-shell" forceMount hidden={activeStep != "filtering"}>
          <FilteringTab currentStage={currentStage} minScore={minScore} setMinScore={setMinScore} requireKeywordOverlap={requireKeywordOverlap} setRequireKeywordOverlap={setRequireKeywordOverlap} minWordCount={minWordCount} setMinWordCount={setMinWordCount} loading={loading} error={error} result={result} onRun={handleRun} />
        </TabsContent>
        <TabsContent value="semantic-search" className="stage-panel-shell" forceMount hidden={activeStep != "semantic-search"}>
          <SemanticSearchTab currentStage={currentStage} query={query} setQuery={setQuery} vectorStore={vectorStore} setVectorStore={setVectorStore} topK={topK} setTopK={setTopK} loading={loading} error={error} result={result} points={semanticEmbeddingPoints.points} queryPoint={semanticEmbeddingPoints.queryPoint} onRun={handleRun} />
        </TabsContent>
        <TabsContent value="generation" className="stage-panel-shell" forceMount hidden={activeStep != "generation"}>
          <GenerationTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
