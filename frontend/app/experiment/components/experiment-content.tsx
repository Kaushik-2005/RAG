"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Boxes, MessageSquare, Search, SplitSquareHorizontal } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { runPipeline, type PipelineResponse } from "@/lib/api";
import { embedTo2D } from "@/lib/utils";
import { EmbeddingTab } from "./embedding-tab";
import { GenerationTab } from "./generation-tab";
import { SemanticSearchTab } from "./semantic-search-tab";
import { TextSplittingTab } from "./text-splitting-tab";

export const stageTabs = [
  {
    id: "text-splitting",
    label: "Text Splitting",
    hint: "Chunk strategy",
    title: "Text Splitting",
    description: "Visualize how documents are split into meaningful chunks while preserving semantic coherence.",
    explanation:
      "This stage only changes how the source paragraph is split. The rest of the pipeline runs later, but the output here is the chunk list and chunk size summary.",
  },
  {
    id: "embedding",
    label: "Vector Embedding",
    hint: "Embedding model",
    title: "Vector Embedding",
    description: "View the chunks and their vector embeddings side by side before any query-time retrieval happens.",
    explanation:
      "This stage only changes the embedding model. The output shows the chunk text and the vectors produced from that text.",
  },
  {
    id: "semantic-search",
    label: "Semantic Search",
    hint: "Query and ranking",
    title: "Semantic Search",
    description: "Embed a query, compare it against the knowledge-base vectors, and inspect the chunks selected for retrieval.",
    explanation:
      "This stage only changes the query and retrieval settings. The output shows the query embedding, similarity scores, and the retrieved chunks.",
  },
  {
    id: "generation",
    label: "Context Generation",
    hint: "Answer output",
    title: "Context Generation",
    description: "Observe how the LLM combines retrieved context with the user query to generate a grounded response.",
    explanation:
      "This stage uses the retrieved chunks and query from the previous step. The output shows the final answer and the exact context passed to the model.",
  },
] as const;

export const chunkerOptions = [
  { value: "recursive", label: "Recursive", description: "Preserves natural boundaries first, then falls back to smaller separators when needed." },
  { value: "character", label: "Fixed Character", description: "Splits at a fixed length. Fast and simple, but less aware of sentence meaning." },
  { value: "token", label: "Token Aware", description: "Splits by approximate token budget so chunks align better with model context windows." },
  { value: "markdown", label: "Markdown", description: "Uses headings and markdown structure first so sections stay grouped logically." },
] as const;

export const embeddingOptions = [
  { value: "tfidf", label: "TF-IDF" },
  { value: "all-MiniLM-L6-v2", label: "all-MiniLM-L6-v2" },
  { value: "paraphrase-MiniLM-L3-v2", label: "paraphrase-MiniLM-L3-v2" },
] as const;

export const vectorStoreOptions = [
  { value: "faiss", label: "FAISS" },
  { value: "chroma", label: "Cosine fallback" },
] as const;

export const defaultSourceText =
  "Retrieval-augmented generation, or RAG, connects a language model to external information so it can answer with more grounding than memory alone. The workflow usually begins by loading a source passage, then splitting it into chunks that are small enough to compare but still large enough to preserve meaning. Each chunk is embedded into vectors so semantic similarity can be measured, the query is embedded with the same model, and the closest chunks are retrieved to form context. The final model answer should stay anchored to that retrieved context and avoid inventing facts that are not present in the source.";

export type ExperimentStep = (typeof stageTabs)[number]["id"];
export type ChunkerValue = (typeof chunkerOptions)[number]["value"];
export type EmbeddingValue = (typeof embeddingOptions)[number]["value"];
export type VectorStoreValue = (typeof vectorStoreOptions)[number]["value"];

const isExperimentStep = (step: string | null): step is ExperimentStep => stageTabs.some((item) => item.id === step);

export function ExperimentContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedStep = searchParams.get("step");
  const activeStep = isExperimentStep(requestedStep) ? requestedStep : "text-splitting";

  const [sourceText, setSourceText] = useState(defaultSourceText);
  const [query, setQuery] = useState("What is RAG and why does chunking matter?");
  const [chunker, setChunker] = useState<ChunkerValue>("recursive");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [embeddingModel, setEmbeddingModel] = useState<EmbeddingValue>("tfidf");
  const [vectorStore, setVectorStore] = useState<VectorStoreValue>("faiss");
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResponse | null>(null);

  const currentStage = useMemo(() => stageTabs.find((stage) => stage.id === activeStep) ?? stageTabs[0], [activeStep]);

  const chunkEmbeddingPoints = useMemo(() => {
    if (!result?.chunk_embeddings?.length) {
      return [] as Array<{ x: number; y: number; label: string; chunk: number }>;
    }

    try {
      return embedTo2D(result.chunk_embeddings).map((point, index) => ({
        x: point.x,
        y: point.y,
        label: `Chunk ${index + 1}`,
        chunk: index + 1,
      }));
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
        points: embedding2d.slice(1).map((point, index) => ({
          x: point.x,
          y: point.y,
          label: `Chunk ${index + 1}`,
          chunk: index + 1,
        })),
      };
    } catch {
      return { queryPoint: null as { x: number; y: number } | null, points: [] as Array<{ x: number; y: number; label: string; chunk: number }> };
    }
  }, [result]);

  const handleStepChange = (nextStep: string) => {
    if (!isExperimentStep(nextStep)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", nextStep);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  async function handleRun(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("query", query);
      formData.append("source_text", sourceText);
      formData.append("source_title", "Editable source paragraph");
      formData.append("chunker", chunker);
      formData.append("chunk_size", String(chunkSize));
      formData.append("chunk_overlap", String(chunkOverlap));
      formData.append("embedding_model", embeddingModel);
      formData.append("vector_store", vectorStore);
      formData.append("top_k", String(topK));
      const response = await runPipeline(formData);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs value={activeStep} onValueChange={handleStepChange} className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
        <TabsTrigger value="text-splitting" className="space-x-2"><SplitSquareHorizontal className="h-4 w-4" /><span>Text Splitting</span></TabsTrigger>
        <TabsTrigger value="embedding" className="space-x-2"><Boxes className="h-4 w-4" /><span>Vector Embedding</span></TabsTrigger>
        <TabsTrigger value="semantic-search" className="space-x-2"><Search className="h-4 w-4" /><span>Semantic Search</span></TabsTrigger>
        <TabsTrigger value="generation" className="space-x-2"><MessageSquare className="h-4 w-4" /><span>Context Generation</span></TabsTrigger>
      </TabsList>
      <TabsContent value="text-splitting" forceMount><TextSplittingTab currentStage={currentStage} sourceText={sourceText} setSourceText={setSourceText} chunker={chunker} setChunker={setChunker} chunkSize={chunkSize} setChunkSize={setChunkSize} chunkOverlap={chunkOverlap} setChunkOverlap={setChunkOverlap} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
      <TabsContent value="embedding" forceMount><EmbeddingTab currentStage={currentStage} embeddingModel={embeddingModel} setEmbeddingModel={setEmbeddingModel} loading={loading} error={error} result={result} points={chunkEmbeddingPoints} onRun={handleRun} /></TabsContent>
      <TabsContent value="semantic-search" forceMount><SemanticSearchTab currentStage={currentStage} query={query} setQuery={setQuery} vectorStore={vectorStore} setVectorStore={setVectorStore} topK={topK} setTopK={setTopK} loading={loading} error={error} result={result} points={semanticEmbeddingPoints.points} queryPoint={semanticEmbeddingPoints.queryPoint} onRun={handleRun} /></TabsContent>
      <TabsContent value="generation" forceMount><GenerationTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
    </Tabs>
  );
}
