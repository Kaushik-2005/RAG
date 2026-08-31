"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Boxes, Database, FileSearch, FileText, Filter, ListOrdered, MessageSquare, ScanText, Search, SplitSquareHorizontal, Tags, Waypoints } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateGroundedAnswer, type PipelineResponse } from "@/lib/api";
import { buildMetadata, cleanDocument, ingestDocument, type CleaningOptions, type SourceKindValue } from "@/lib/document-prep";
import { demoCorpus, demoCorpusById, type CorpusDocument } from "@/lib/demo-corpus";
import { evaluateGeneratedAnswer, runLocalPipeline } from "@/lib/pipeline";
import { embedTo2D } from "@/lib/utils";
import { CandidateRetrievalTab } from "./candidate-retrieval-tab";
import { DataSourcesTab } from "./data-sources-tab";
import { ContextConstructionTab } from "./context-construction-tab";
import { CitationsTab } from "./citations-tab";
import { EmbeddingTab } from "./embedding-tab";
import { EvaluationTab } from "./evaluation-tab";
import { FilteringTab } from "./filtering-tab";
import { GenerationTab } from "./generation-tab";
import { IngestionTab } from "./ingestion-tab";
import { MetadataEnrichmentTab } from "./metadata-enrichment-tab";
import { ParsingCleaningTab } from "./parsing-cleaning-tab";
import { QueryProcessingTab } from './query-processing-tab';
import { RerankingTab } from './reranking-tab';
import { SemanticSearchTab } from "./semantic-search-tab";
import { TextSplittingTab } from "./text-splitting-tab";
import { VectorIndexTab } from "./vector-index-tab";

export const phaseTabs = [
  { id: "document-prep", label: "Document Prep", description: "Prepare the corpus documents before they are embedded or searched." },
  { id: "retrieval-setup", label: "Index-Time Retrieval Setup", description: "Create embeddings and vector index structures over the full corpus before any user query is searched." },
  { id: "query-time-retrieval", label: "Query-Time Retrieval", description: "Process the query, retrieve candidates, and inspect the ranking pipeline." },
  { id: "response-assembly", label: "Response Assembly", description: "Assemble retrieved evidence, attach citations, generate the answer, and inspect quality signals." },
] as const;

export const stageTabs = [
  { id: "data-sources", phase: "document-prep", label: "Data Sources", hint: "Corpus selection", title: "Data Sources", description: "Choose which corpus document you are editing while keeping all corpus documents available for later indexing and retrieval.", explanation: "Production RAG starts with source data. In this lab you edit one active document at a time, but the later retrieval phases index and search the whole corpus.", icon: FileText },
  { id: "ingestion", phase: "document-prep", label: "Ingestion", hint: "Working document", title: "Ingestion", description: "Convert the active raw source into a stable working document with normalized structure and baseline counts.", explanation: "Ingestion turns the selected document into the canonical representation that later stages clean, annotate, split, and eventually contribute to the full corpus index.", icon: Database },
  { id: "parsing-cleaning", phase: "document-prep", label: "Parsing & Cleaning", hint: "Normalization", title: "Parsing & Cleaning", description: "Remove formatting noise and normalize spacing so chunking is based on cleaner text.", explanation: "This stage makes document cleanup visible. It removes structural noise without trying to change meaning.", icon: ScanText },
  { id: "metadata-enrichment", phase: "document-prep", label: "Metadata Enrichment", hint: "Document signals", title: "Metadata Enrichment", description: "Attach document-level signals such as identifiers, keywords, and recommended chunking policies.", explanation: "Metadata supports downstream filtering, routing, observability, and retrieval policy decisions.", icon: Tags },
  { id: "text-splitting", phase: "document-prep", label: "Text Splitting", hint: "Chunk strategy", title: "Text Splitting", description: "Split the cleaned active document into retrieval units while balancing size, overlap, and semantic coherence.", explanation: "Chunking defines the units retrieval can search. This stage operates on the active document only so the chunking effects are easy to inspect.", icon: SplitSquareHorizontal },
  { id: "embedding", phase: "retrieval-setup", label: "Vector Embedding", hint: "Embedding model", title: "Vector Embedding", description: "Inspect the vectors produced for the active document while the full corpus is still prepared for indexing.", explanation: "You inspect one document at a time, but the chosen embedding backend is applied across the full corpus during indexing and retrieval.", icon: Boxes },
  { id: "vector-index", phase: "retrieval-setup", label: "Vector Index", hint: "Indexed store", title: "Vector Index", description: "Inspect how all corpus chunk embeddings are stored in the searchable vector index.", explanation: "Indexing is the first place where the multi-document corpus matters. The retriever searches this full indexed pool, not just the active document.", icon: Waypoints },
  { id: "query-processing", phase: "query-time-retrieval", label: "Query Processing", hint: "Normalize query", title: "Query Processing", description: "Normalize and inspect the user question before it is embedded and matched against the corpus index.", explanation: "This stage shows the query object that downstream retrieval logic actually uses.", icon: FileSearch },
  { id: "candidate-retrieval", phase: "query-time-retrieval", label: "Candidate Retrieval", hint: "Score candidates", title: "Candidate Retrieval", description: "Score every indexed corpus chunk against the processed query and inspect the ranked candidate pool.", explanation: "Every chunk in the corpus index receives a score. This stage exposes the full ranked pool before later pruning.", icon: ListOrdered },
  { id: "filtering", phase: "query-time-retrieval", label: "Filtering", hint: "Prune candidates", title: "Filtering", description: "Remove weak or unsuitable candidates from the top-k window before the final semantic-search view.", explanation: "Production systems often prune by score, metadata, policy, or lexical rules before constructing final context.", icon: Filter },
  { id: "semantic-search", phase: "query-time-retrieval", label: "Semantic Search", hint: "Query and ranking", title: "Semantic Search", description: "Embed a query, compare it against the corpus vectors, and inspect the retrieved evidence that survives filtering.", explanation: "This stage focuses on the final remaining matches and the query-to-chunk geometric relationship.", icon: Search },
  { id: "context-construction", phase: "response-assembly", label: "Context Construction", hint: "Evidence package", title: "Context Construction", description: "Assemble the surviving evidence blocks into the exact context package used by the generator.", explanation: "This stage turns retrieved chunks into a prompt-ready context bundle with stable ordering and source identity.", icon: FileText },
  { id: "citations", phase: "response-assembly", label: "Citations", hint: "Source trace", title: "Citations", description: "Inspect the source references that can be attached to the final answer for traceability.", explanation: "Citations preserve where each evidence block came from so the answer can remain auditable.", icon: Tags },
  { id: "generation", phase: "response-assembly", label: "Response Generation", hint: "Answer output", title: "Response Generation", description: "Observe how the model combines the retrieved evidence with the user query to generate a grounded response.", explanation: "The final answer should stay anchored to the retrieved context and abstain when support is missing.", icon: MessageSquare },
  { id: "evaluation", phase: "response-assembly", label: "Evaluation", hint: "Quality signals", title: "Evaluation", description: "Inspect lightweight quality signals that estimate whether the answer stayed grounded in the assembled context.", explanation: "This stage adds practical eval signals without claiming to replace full production evaluation systems.", icon: Search },
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

export type ExperimentPhase = (typeof phaseTabs)[number]["id"];
export type ExperimentStep = (typeof stageTabs)[number]["id"];
export type ChunkerValue = (typeof chunkerOptions)[number]["value"];
export type EmbeddingValue = (typeof embeddingOptions)[number]["value"];
export type VectorStoreValue = (typeof vectorStoreOptions)[number]["value"];
export type { SourceKindValue };

export const chunkerPresets: Record<ChunkerValue, { chunkSize: number; chunkOverlap: number }> = {
  character: { chunkSize: 500, chunkOverlap: 50 },
  recursive: { chunkSize: 500, chunkOverlap: 50 },
  token: { chunkSize: 120, chunkOverlap: 20 },
  markdown: { chunkSize: 400, chunkOverlap: 40 },
};

const isExperimentPhase = (phase: string | null): phase is ExperimentPhase => phaseTabs.some((item) => item.id === phase);
const isExperimentStep = (step: string | null): step is ExperimentStep => stageTabs.some((item) => item.id === step);
const getStagesForPhase = (phase: ExperimentPhase) => stageTabs.filter((stage) => stage.phase === phase);

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

  const [documents, setDocuments] = useState<CorpusDocument[]>(demoCorpus);
  const [activeDocumentId, setActiveDocumentId] = useState<string>(demoCorpus[0]?.id ?? "");
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({ trimLines: true, normalizeSpaces: true, collapseBlankLines: true });
  const [query, setQuery] = useState("What is RAG?");
  const [chunker, setChunker] = useState<ChunkerValue>("recursive");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [embeddingModel, setEmbeddingModel] = useState<EmbeddingValue>("tfidf");
  const [vectorStore, setVectorStore] = useState<VectorStoreValue>("cosine");
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.18);
  const [requireKeywordOverlap, setRequireKeywordOverlap] = useState(true);
  const [minWordCount, setMinWordCount] = useState(35);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResponse | null>(null);

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? documents[0] ?? demoCorpusById[demoCorpus[0].id],
    [activeDocumentId, documents],
  );

  const ingestedDocument = useMemo(
    () => ingestDocument({ title: activeDocument?.title ?? "Untitled document", sourceKind: activeDocument?.sourceKind ?? "essay", text: activeDocument?.text ?? "" }),
    [activeDocument],
  );

  const cleanedDocument = useMemo(
    () => cleanDocument(ingestedDocument.normalizedText, cleaningOptions),
    [cleaningOptions, ingestedDocument.normalizedText],
  );

  const documentMetadata = useMemo(
    () => buildMetadata({ title: activeDocument?.title ?? "Untitled document", sourceKind: activeDocument?.sourceKind ?? "essay", ingested: ingestedDocument, cleaned: cleanedDocument }),
    [activeDocument, cleanedDocument, ingestedDocument],
  );

  const currentPhase = useMemo(() => phaseTabs.find((phase) => phase.id === activePhase) ?? phaseTabs[0], [activePhase]);
  const currentStage = useMemo(() => stageTabs.find((stage) => stage.id === activeStep) ?? stageTabs[0], [activeStep]);

  const activeDocumentEmbeddingData = useMemo(() => {
    if (!result?.chunks?.length || !result?.chunk_embeddings?.length || !activeDocument) {
      return { points: [] as Array<{ x: number; y: number; label: string; chunk: number }> };
    }

    const rows = result.chunks
      .map((chunk, index) => ({ chunk, vector: result.chunk_embeddings[index] }))
      .filter((row) => row.chunk.document_id === activeDocument.id && row.vector);

    if (!rows.length) {
      return { points: [] as Array<{ x: number; y: number; label: string; chunk: number }> };
    }

    try {
      const points = embedTo2D(rows.map((row) => row.vector)).map((point, index) => ({
        x: point.x,
        y: point.y,
        label: `${rows[index].chunk.document_title} · Chunk ${rows[index].chunk.document_chunk_index + 1}`,
        chunk: rows[index].chunk.document_chunk_index + 1,
      }));
      return { points };
    } catch {
      return { points: [] as Array<{ x: number; y: number; label: string; chunk: number }> };
    }
  }, [activeDocument, result]);

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
          label: `${result.chunks[index]?.document_title ?? "Document"} · Chunk ${(result.chunks[index]?.document_chunk_index ?? index) + 1}`,
          chunk: (result.chunks[index]?.document_chunk_index ?? index) + 1,
        })),
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

  const clearPipelineState = () => {
    setResult(null);
    setError(null);
  };

  const handleDocumentSwitch = (documentId: string) => {
    setActiveDocumentId(documentId);
    clearPipelineState();
  };

  const updateActiveDocument = (updater: (document: CorpusDocument) => CorpusDocument) => {
    setDocuments((current) => current.map((document) => document.id === activeDocumentId ? updater(document) : document));
    clearPipelineState();
  };

  const resetActiveDocument = () => {
    const fallback = demoCorpusById[activeDocumentId] ?? demoCorpus[0];
    if (!fallback) return;
    setDocuments((current) => current.map((document) => document.id === fallback.id ? { ...fallback } : document));
    clearPipelineState();
  };

  const handleChunkerChange = (value: ChunkerValue) => {
    setChunker(value);
    const preset = chunkerPresets[value];
    setChunkSize(preset.chunkSize);
    setChunkOverlap(preset.chunkOverlap);
    clearPipelineState();
  };

  async function handleRun(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const nextResult = await runLocalPipeline({
        query,
        documents: documents.map((document) => document.id === activeDocumentId ? { ...document, text: cleanedDocument.text } : document),
        activeDocumentId,
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

      if (activeStep === "generation" || activeStep === "evaluation") {
        if (!nextResult.context.trim()) {
          setResult({ ...nextResult, answer: "I do not know based on the provided context." });
        } else {
          const answer = await generateGroundedAnswer({ query: nextResult.query, context: nextResult.context });
          const evaluation = evaluateGeneratedAnswer(answer, nextResult.query, nextResult.context_construction, nextResult.citations);
          setResult({ ...nextResult, answer, evaluation });
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
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground"><Database className="h-3.5 w-3.5" /><span>{currentPhase.label}</span></div>
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

        <TabsContent value="data-sources" className="stage-panel-shell" forceMount hidden={activeStep !== "data-sources"}><DataSourcesTab currentStage={currentStage} documents={documents} activeDocumentId={activeDocumentId} setActiveDocumentId={handleDocumentSwitch} sourceTitle={activeDocument?.title ?? ""} setSourceTitle={(value) => updateActiveDocument((document) => ({ ...document, title: value }))} sourceKind={activeDocument?.sourceKind ?? "essay"} sourceText={activeDocument?.text ?? ""} setSourceText={(value) => updateActiveDocument((document) => ({ ...document, text: value }))} onResetDocument={resetActiveDocument} charCount={ingestedDocument.charCount} wordCount={ingestedDocument.wordCount} paragraphCount={ingestedDocument.paragraphCount} estimatedTokens={ingestedDocument.estimatedTokens} /></TabsContent>
        <TabsContent value="ingestion" className="stage-panel-shell" forceMount hidden={activeStep !== "ingestion"}><IngestionTab currentStage={currentStage} sourceText={activeDocument?.text ?? ""} ingestedDocument={ingestedDocument} /></TabsContent>
        <TabsContent value="parsing-cleaning" className="stage-panel-shell" forceMount hidden={activeStep !== "parsing-cleaning"}><ParsingCleaningTab currentStage={currentStage} ingestedDocument={ingestedDocument} cleanedDocument={cleanedDocument} cleaningOptions={cleaningOptions} setCleaningOptions={setCleaningOptions} /></TabsContent>
        <TabsContent value="metadata-enrichment" className="stage-panel-shell" forceMount hidden={activeStep !== "metadata-enrichment"}><MetadataEnrichmentTab currentStage={currentStage} metadata={documentMetadata} /></TabsContent>
        <TabsContent value="text-splitting" className="stage-panel-shell" forceMount hidden={activeStep !== "text-splitting"}><TextSplittingTab currentStage={currentStage} sourceText={cleanedDocument.text} setSourceText={(value) => updateActiveDocument((document) => ({ ...document, text: value }))} chunker={chunker} setChunker={handleChunkerChange} chunkSize={chunkSize} setChunkSize={setChunkSize} chunkOverlap={chunkOverlap} setChunkOverlap={setChunkOverlap} recommendedChunker={documentMetadata.recommendedChunker} recommendedChunkSize={documentMetadata.recommendedChunkSize} loading={loading} error={error} result={result} onRun={handleRun} onResetSourceDocument={resetActiveDocument} /></TabsContent>
        <TabsContent value="embedding" className="stage-panel-shell" forceMount hidden={activeStep !== "embedding"}><EmbeddingTab currentStage={currentStage} embeddingModel={embeddingModel} setEmbeddingModel={setEmbeddingModel} loading={loading} error={error} result={result} points={activeDocumentEmbeddingData.points} activeDocumentId={activeDocumentId} onRun={handleRun} /></TabsContent>
        <TabsContent value="vector-index" className="stage-panel-shell" forceMount hidden={activeStep !== "vector-index"}><VectorIndexTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
        <TabsContent value="query-processing" className="stage-panel-shell" forceMount hidden={activeStep !== "query-processing"}><QueryProcessingTab currentStage={currentStage} query={query} setQuery={setQuery} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
        <TabsContent value="candidate-retrieval" className="stage-panel-shell" forceMount hidden={activeStep !== "candidate-retrieval"}><CandidateRetrievalTab currentStage={currentStage} topK={topK} setTopK={setTopK} vectorStore={vectorStore} setVectorStore={setVectorStore} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
        <TabsContent value="filtering" className="stage-panel-shell" forceMount hidden={activeStep !== "filtering"}><FilteringTab currentStage={currentStage} minScore={minScore} setMinScore={setMinScore} requireKeywordOverlap={requireKeywordOverlap} setRequireKeywordOverlap={setRequireKeywordOverlap} minWordCount={minWordCount} setMinWordCount={setMinWordCount} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
        <TabsContent value="semantic-search" className="stage-panel-shell" forceMount hidden={activeStep !== "semantic-search"}><SemanticSearchTab currentStage={currentStage} query={query} setQuery={setQuery} vectorStore={vectorStore} setVectorStore={setVectorStore} topK={topK} setTopK={setTopK} loading={loading} error={error} result={result} points={semanticEmbeddingPoints.points} queryPoint={semanticEmbeddingPoints.queryPoint} onRun={handleRun} /></TabsContent>
        <TabsContent value="context-construction" className="stage-panel-shell" forceMount hidden={activeStep !== "context-construction"}><ContextConstructionTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
        <TabsContent value="citations" className="stage-panel-shell" forceMount hidden={activeStep !== "citations"}><CitationsTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
        <TabsContent value="generation" className="stage-panel-shell" forceMount hidden={activeStep !== "generation"}><GenerationTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
        <TabsContent value="evaluation" className="stage-panel-shell" forceMount hidden={activeStep !== "evaluation"}><EvaluationTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
      </Tabs>
    </div>
  );
}
