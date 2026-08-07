"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Boxes, MessageSquare, Search, SplitSquareHorizontal } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateGroundedAnswer, type PipelineResponse } from "@/lib/api";
import { runLocalPipeline } from "@/lib/pipeline";
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
      "This stage only changes the browser-side embedding strategy. The output shows the chunk text and the vectors produced from that text.",
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
  { value: "character", label: "Fixed Character", description: "Simple uniform segmentation based on predetermined character length. Best for fast iteration and low-overhead demos." },
  { value: "recursive", label: "Recursive Character", description: "Preserves paragraph and sentence boundaries first, then falls back to smaller separators when needed." },
  { value: "token", label: "Token Aware", description: "Uses word-like boundaries while keeping chunks within an approximate browser-friendly budget." },
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

export const defaultSourceText = `What is Retrieval-Augmented Generation?
Retrieval-Augmented Generation (RAG) is the process of optimizing the output of a large language model, so it references an authoritative knowledge base outside of its training data sources before generating a response. Large Language Models (LLMs) are trained on vast volumes of data and use billions of parameters to generate original output for tasks like answering questions, translating languages, and completing sentences. RAG extends the already powerful capabilities of LLMs to specific domains or an organization's internal knowledge base, all without the need to retrain the model. It is a cost-effective approach to improving LLM output so it remains relevant, accurate, and useful in various contexts.

Why is Retrieval-Augmented Generation important?
LLMs are a key artificial intelligence (AI) technology powering intelligent chatbots and other natural language processing (NLP) applications. The goal is to create bots that can answer user questions in various contexts by cross-referencing authoritative knowledge sources. Unfortunately, the nature of LLM technology introduces unpredictability in LLM responses. Additionally, LLM training data is static and introduces a cut-off date on the knowledge it has.

Known challenges of LLMs include:
- Presenting false information when it does not have the answer.
- Presenting out-of-date or generic information when the user expects a specific, current response.
- Creating a response from non-authoritative sources.
- Creating inaccurate responses due to terminology confusion, wherein different training sources use the same terminology to talk about different things.

You can think of the Large Language Model as an over-enthusiastic new employee who refuses to stay informed with current events but will always answer every question with absolute confidence. Unfortunately, such an attitude can negatively impact user trust and is not something you want your chatbots to emulate.

RAG is one approach to solving some of these challenges. It redirects the LLM to retrieve relevant information from authoritative, pre-determined knowledge sources. Organizations have greater control over the generated text output, and users gain insights into how the LLM generates the response.

What are the benefits of Retrieval-Augmented Generation?
RAG technology brings several benefits to an organization's generative AI efforts.

Cost-effective implementation
Chatbot development typically begins using a foundation model. Foundation models (FMs) are API-accessible LLMs trained on a broad spectrum of generalized and unlabeled data. The computational and financial costs of retraining FMs for organization or domain-specific information are high. RAG is a more cost-effective approach to introducing new data to the LLM. It makes generative artificial intelligence (generative AI) technology more broadly accessible and usable.

Current information
Even if the original training data sources for an LLM are suitable for your needs, it is challenging to maintain relevancy. RAG allows developers to provide the latest research, statistics, or news to the generative models. They can use RAG to connect the LLM directly to live social media feeds, news sites, or other frequently-updated information sources. The LLM can then provide the latest information to the users.

Enhanced user trust
RAG allows the LLM to present accurate information with source attribution. The output can include citations or references to sources. Users can also look up source documents themselves if they require further clarification or more detail. This can increase trust and confidence in your generative AI solution.

More developer control
With RAG, developers can test and improve their chat applications more efficiently. They can control and change the LLM's information sources to adapt to changing requirements or cross-functional usage. Developers can also restrict sensitive information retrieval to different authorization levels and ensure the LLM generates appropriate responses. In addition, they can also troubleshoot and make fixes if the LLM references incorrect information sources for specific questions. Organizations can implement generative AI technology more confidently for a broader range of applications.

How does Retrieval-Augmented Generation work?
Without RAG, the LLM takes the user input and creates a response based on information it was trained on, or what it already knows. With RAG, an information retrieval component is introduced that utilizes the user input to first pull information from a new data source. The user query and the relevant information are both given to the LLM. The LLM uses the new knowledge and its training data to create better responses. The following sections provide an overview of the process.

Create external data
The new data outside of the LLM's original training data set is called external data. It can come from multiple data sources, such as APIs, databases, or document repositories. The data may exist in various formats like files, database records, or long-form text. Another AI technique, called embedding language models, converts data into numerical representations and stores it in a vector database. This process creates a knowledge library that the generative AI models can understand.

Retrieve relevant information
The next step is to perform a relevancy search. The user query is converted to a vector representation and matched with the vector databases. For example, consider a smart chatbot that can answer human resource questions for an organization. If an employee searches, "How much annual leave do I have?" the system will retrieve annual leave policy documents alongside the individual employee's past leave record. These specific documents will be returned because they are highly relevant to what the employee has input. The relevancy was calculated and established using mathematical vector calculations and representations.

Augment the LLM prompt
Next, the RAG model augments the user input, or prompts, by adding the relevant retrieved data in context. This step uses prompt engineering techniques to communicate effectively with the LLM. The augmented prompt allows the large language models to generate an accurate answer to user queries.

Update external data
The next question may be what if the external data becomes stale? To maintain current information for retrieval, asynchronously update the documents and update embedding representation of the documents. You can do this through automated real-time processes or periodic batch processing. This is a common challenge in data analytics, and different data-science approaches to change management can be used.

What is the difference between Retrieval-Augmented Generation and semantic search?
Semantic search enhances RAG results for organizations wanting to add vast external knowledge sources to their LLM applications. Modern enterprises store vast amounts of information like manuals, FAQs, research reports, customer service guides, and human resource document repositories across various systems. Context retrieval is challenging at scale and consequently lowers generative output quality.

Semantic search technologies can scan large databases of disparate information and retrieve data more accurately. For example, they can answer questions such as, "How much was spent on machinery repairs last year?" by mapping the question to the relevant documents and returning specific text instead of search results. Developers can then use that answer to provide more context to the LLM.

Conventional or keyword search solutions in RAG produce limited results for knowledge-intensive tasks. Developers must also deal with word embeddings, document chunking, and other complexities as they manually prepare their data. In contrast, semantic search technologies do all the work of knowledge base preparation so developers do not have to. They also generate semantically relevant passages and token words ordered by relevance to maximize the quality of the RAG payload.`;

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
  const [vectorStore, setVectorStore] = useState<VectorStoreValue>("cosine");
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
      const nextResult = runLocalPipeline({
        query,
        sourceText,
        sourceTitle: "Editable source paragraph",
        chunker,
        chunkSize,
        chunkOverlap,
        embeddingModel,
        vectorStore,
        topK,
      });

      if (activeStep === "generation") {
        if (!nextResult.context.trim()) {
          setResult({ ...nextResult, answer: "I do not know based on the provided context." });
        } else {
          const answer = await generateGroundedAnswer({
            query: nextResult.query,
            context: nextResult.context,
          });
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

  return (
    <Tabs value={activeStep} onValueChange={handleStepChange} className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-[#ececec] bg-[#f5f5f5] p-1 dark:border-[#2a2a2a] dark:bg-[#151515] md:grid-cols-4">
        <TabsTrigger value="text-splitting" className="space-x-2 text-[#5f6b7a] dark:text-[#8c8c8c] data-[state=active]:bg-white data-[state=active]:text-[#0f172a] data-[state=active]:shadow-none dark:data-[state=active]:bg-[#222222] dark:data-[state=active]:text-[#f3f3f3] dark:data-[state=active]:shadow-none"><SplitSquareHorizontal className="h-4 w-4" /><span>Text Splitting</span></TabsTrigger>
        <TabsTrigger value="embedding" className="space-x-2 text-[#5f6b7a] dark:text-[#8c8c8c] data-[state=active]:bg-white data-[state=active]:text-[#0f172a] data-[state=active]:shadow-none dark:data-[state=active]:bg-[#222222] dark:data-[state=active]:text-[#f3f3f3] dark:data-[state=active]:shadow-none"><Boxes className="h-4 w-4" /><span>Vector Embedding</span></TabsTrigger>
        <TabsTrigger value="semantic-search" className="space-x-2 text-[#5f6b7a] dark:text-[#8c8c8c] data-[state=active]:bg-white data-[state=active]:text-[#0f172a] data-[state=active]:shadow-none dark:data-[state=active]:bg-[#222222] dark:data-[state=active]:text-[#f3f3f3] dark:data-[state=active]:shadow-none"><Search className="h-4 w-4" /><span>Semantic Search</span></TabsTrigger>
        <TabsTrigger value="generation" className="space-x-2 text-[#5f6b7a] dark:text-[#8c8c8c] data-[state=active]:bg-white data-[state=active]:text-[#0f172a] data-[state=active]:shadow-none dark:data-[state=active]:bg-[#222222] dark:data-[state=active]:text-[#f3f3f3] dark:data-[state=active]:shadow-none"><MessageSquare className="h-4 w-4" /><span>Context Generation</span></TabsTrigger>
      </TabsList>
      <TabsContent value="text-splitting" className="stage-panel-shell" forceMount><TextSplittingTab currentStage={currentStage} sourceText={sourceText} setSourceText={setSourceText} chunker={chunker} setChunker={setChunker} chunkSize={chunkSize} setChunkSize={setChunkSize} chunkOverlap={chunkOverlap} setChunkOverlap={setChunkOverlap} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
      <TabsContent value="embedding" className="stage-panel-shell" forceMount><EmbeddingTab currentStage={currentStage} embeddingModel={embeddingModel} setEmbeddingModel={setEmbeddingModel} loading={loading} error={error} result={result} points={chunkEmbeddingPoints} onRun={handleRun} /></TabsContent>
      <TabsContent value="semantic-search" className="stage-panel-shell" forceMount><SemanticSearchTab currentStage={currentStage} query={query} setQuery={setQuery} vectorStore={vectorStore} setVectorStore={setVectorStore} topK={topK} setTopK={setTopK} loading={loading} error={error} result={result} points={semanticEmbeddingPoints.points} queryPoint={semanticEmbeddingPoints.queryPoint} onRun={handleRun} /></TabsContent>
      <TabsContent value="generation" className="stage-panel-shell" forceMount><GenerationTab currentStage={currentStage} loading={loading} error={error} result={result} onRun={handleRun} /></TabsContent>
    </Tabs>
  );
}