from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from textwrap import shorten
from typing import Callable
import re

import numpy as np
from groq import Groq
from sklearn.feature_extraction.text import TfidfVectorizer

from app.core.config import settings
from app.schemas import (
    ChunkModel,
    ChunkerName,
    DemoDatasetDetail,
    DemoDatasetSummary,
    PipelineRunResponse,
    PipelineStep,
    RetrievalMatch,
    VectorStoreName,
)


@dataclass(slots=True)
class ChunkingPlan:
    chunks: list[ChunkModel]
    strategy_note: str


@dataclass(slots=True)
class EmbeddingBackend:
    name: str
    model_name: str
    dimension: int
    encode: Callable[[list[str]], np.ndarray]


@dataclass(slots=True)
class SearchOutcome:
    results: list[RetrievalMatch]
    backend_name: str


DEMO_DATASETS: list[DemoDatasetDetail] = [
    DemoDatasetDetail(
        id="intro-rag",
        name="Intro to RAG",
        description="A short explanation of what retrieval-augmented generation does.",
        preview="RAG combines retrieval with generation so answers can stay grounded in source text.",
        content=(
            "Retrieval-augmented generation, or RAG, connects a language model to external information. "
            "Instead of asking the model to answer from memory only, the system first retrieves relevant chunks from a knowledge base. "
            "The retrieved context is then passed into the language model so it can answer with better grounding.\n\n"
            "A typical RAG pipeline has three core stages. First, documents are loaded and split into manageable chunks. "
            "Second, each chunk is embedded into vectors so the system can measure semantic similarity. "
            "Third, the query is embedded, the closest chunks are retrieved, and the model generates a response from that context."
        ),
        topics=["rag", "retrieval", "generation", "embeddings"],
        recommended_chunker="recursive",
    ),
    DemoDatasetDetail(
        id="docs-pipeline",
        name="Document Pipeline",
        description="A markdown-style dataset showing the stages of a document workflow.",
        preview="The loader reads text, chunking splits structure, embeddings capture meaning, and retrieval selects context.",
        content=(
            "# Document Pipeline\n\n"
            "## Load\n"
            "Documents arrive as text, markdown, or PDF content.\n\n"
            "## Chunk\n"
            "The loader splits the document into chunks with enough overlap to preserve meaning.\n\n"
            "## Embed\n"
            "Every chunk is converted into a vector that captures semantic similarity.\n\n"
            "## Retrieve\n"
            "The query vector is compared with chunk vectors to find the best matches.\n\n"
            "## Generate\n"
            "The selected chunks become context for the answer generation step."
        ),
        topics=["loader", "chunking", "embedding", "retrieval", "markdown"],
        recommended_chunker="markdown",
    ),
    DemoDatasetDetail(
        id="quality-notes",
        name="Chunking Notes",
        description="A longer text that makes chunk boundaries and overlap easier to inspect.",
        preview="Chunk size and overlap change what the retriever can see and how much context survives.",
        content=(
            "Chunk size controls how much text ends up inside a single unit. If chunks are too small, meaning can get fragmented. "
            "If chunks are too large, retrieval becomes less precise and context windows fill up faster. Overlap helps preserve continuity across boundaries.\n\n"
            "Recursive chunking works well when the source has structure because it tries larger separators first and only falls back to smaller ones when needed. "
            "Token chunking is useful when you care about model token budgets. Character chunking is simple and fast, which makes it easy to explain in an educational interface."
        ),
        topics=["chunk size", "overlap", "tokens", "recursive"],
        recommended_chunker="character",
    ),
]


def list_dataset_summaries() -> list[DemoDatasetSummary]:
    return [
        DemoDatasetSummary(
            id=dataset.id,
            name=dataset.name,
            description=dataset.description,
            source=dataset.source,
            recommended_chunker=dataset.recommended_chunker,
            preview=dataset.preview,
        )
        for dataset in DEMO_DATASETS
    ]


def get_dataset(dataset_id: str | None) -> DemoDatasetDetail:
    if not dataset_id:
        return DEMO_DATASETS[0]
    for dataset in DEMO_DATASETS:
        if dataset.id == dataset_id:
            return dataset
    return DEMO_DATASETS[0]


async def run_pipeline(
    query: str,
    dataset_id: str | None,
    chunker: ChunkerName,
    vector_store: VectorStoreName,
    top_k: int,
) -> PipelineRunResponse:
    source = get_dataset(dataset_id)
    chunk_plan = build_chunks(source.content, chunker)
    chunk_texts = [chunk.text for chunk in chunk_plan.chunks]
    embedding_backend = build_embedding_backend(chunk_texts or [source.content or query])
    chunk_vectors = embedding_backend.encode(chunk_texts or [source.content or query])
    query_vector = embedding_backend.encode([query])[0]
    search_outcome = search_vectors(vector_store, query_vector, chunk_vectors, chunk_texts, top_k)
    context = build_context(search_outcome.results)
    answer, llm_backend = await generate_answer(query, context)

    steps = [
        PipelineStep(id="load", title="Load source", description=f"Loaded {source.name} from the built-in catalog.", explanation="The pipeline uses a built-in dataset so the flow stays focused on explanation instead of file handling."),
        PipelineStep(id="chunk", title="Chunk document", description=chunk_plan.strategy_note, explanation="Chunking breaks long text into smaller pieces so retrieval can compare them efficiently."),
        PipelineStep(id="embed", title="Embed chunks", description=f"Created {len(chunk_vectors)} vectors with {embedding_backend.name}.", explanation="Embeddings turn text into numeric vectors so semantic similarity can be measured."),
        PipelineStep(id="retrieve", title="Retrieve matches", description=f"Retrieved the top {len(search_outcome.results)} chunks using {search_outcome.backend_name}.", explanation="The query vector is compared with chunk vectors to find the most relevant context."),
        PipelineStep(id="generate", title="Generate answer", description=f"Generated an educational answer with {llm_backend}.", explanation="The final answer is produced from the retrieved context rather than from memory alone."),
    ]

    visuals = {
        "chunk_lengths": [chunk.char_count for chunk in chunk_plan.chunks],
        "scores": [match.score for match in search_outcome.results],
        "retrieved_indices": [match.chunk_index for match in search_outcome.results],
        "embedding_provider": embedding_backend.name,
        "embedding_model": embedding_backend.model_name,
        "vector_store_backend": search_outcome.backend_name,
        "source_kind": source.source,
        "top_k": top_k,
        "chunker": chunker,
    }

    return PipelineRunResponse(
        query=query,
        dataset=DemoDatasetSummary(
            id=source.id,
            name=source.name,
            description=source.description,
            source=source.source,
            recommended_chunker=source.recommended_chunker,
            preview=source.preview,
        ),
        loader=source.source,
        chunker=chunker,
        embedding_provider=embedding_backend.name,
        embedding_model=embedding_backend.model_name,
        vector_store=vector_store,
        llm_provider=llm_backend,
        answer=answer,
        context=context,
        chunks=chunk_plan.chunks,
        retrieved_chunks=search_outcome.results,
        steps=steps,
        visuals=visuals,
    )


def build_chunks(text: str, chunker: ChunkerName, chunk_size: int = 320, overlap: int = 50) -> ChunkingPlan:
    normalized = re.sub(r"\r\n", "\n", text).strip()
    if not normalized:
        return ChunkingPlan(chunks=[], strategy_note="No content was available to chunk.")

    if chunker == "character":
        pieces = _chunk_by_characters(normalized, chunk_size, overlap)
        note = "Character chunking creates fixed-size slices and is the simplest strategy to explain."
    elif chunker == "token":
        pieces = _chunk_by_tokens(normalized, chunk_size, overlap)
        note = "Token chunking groups words into token-budget-friendly windows."
    elif chunker == "markdown":
        pieces = _chunk_markdown(normalized, chunk_size, overlap)
        note = "Markdown chunking respects headings and section boundaries before splitting long sections."
    else:
        pieces = _chunk_recursive(normalized, chunk_size, overlap)
        note = "Recursive chunking tries paragraph and sentence boundaries before falling back to smaller splits."

    chunks = [
        ChunkModel(
            index=index,
            text=piece["text"],
            char_count=len(piece["text"]),
            word_count=len(piece["text"].split()),
            start_char=piece["start_char"],
            end_char=piece["end_char"],
        )
        for index, piece in enumerate(pieces)
    ]
    return ChunkingPlan(chunks=chunks, strategy_note=note)


def _chunk_by_characters(text: str, chunk_size: int, overlap: int) -> list[dict[str, int | str]]:
    step = max(1, chunk_size - overlap)
    pieces: list[dict[str, int | str]] = []
    for start in range(0, len(text), step):
        end = min(len(text), start + chunk_size)
        chunk = text[start:end].strip()
        if chunk:
            pieces.append({"text": chunk, "start_char": start, "end_char": end})
        if end >= len(text):
            break
    return pieces


def _chunk_by_tokens(text: str, chunk_size: int, overlap: int) -> list[dict[str, int | str]]:
    tokens = text.split()
    step = max(1, chunk_size - overlap)
    pieces: list[dict[str, int | str]] = []
    for start in range(0, len(tokens), step):
        end = min(len(tokens), start + chunk_size)
        chunk_tokens = tokens[start:end]
        chunk = " ".join(chunk_tokens).strip()
        if chunk:
            pieces.append({"text": chunk, "start_char": start, "end_char": end})
        if end >= len(tokens):
            break
    return pieces


def _chunk_markdown(text: str, chunk_size: int, overlap: int) -> list[dict[str, int | str]]:
    sections: list[str] = []
    current: list[str] = []
    for line in text.splitlines():
        if line.startswith("#") and current:
            sections.append("\n".join(current).strip())
            current = [line]
        else:
            current.append(line)
    if current:
        sections.append("\n".join(current).strip())

    pieces: list[dict[str, int | str]] = []
    position = 0
    for section in sections:
        if len(section) <= chunk_size:
            pieces.append({"text": section, "start_char": position, "end_char": position + len(section)})
            position += len(section)
            continue
        for item in _chunk_recursive(section, chunk_size, overlap):
            pieces.append({"text": item["text"], "start_char": position, "end_char": position + len(item["text"])})
            position += len(item["text"])
    return pieces


def _chunk_recursive(text: str, chunk_size: int, overlap: int) -> list[dict[str, int | str]]:
    separators = ["\n\n", "\n", ". ", " "]
    segments = _recursive_split(text, chunk_size, separators)
    if not segments:
        return []

    merged: list[str] = []
    buffer = ""
    for segment in segments:
        candidate = f"{buffer}{(' ' if buffer and not buffer.endswith(' ') else '')}{segment}".strip()
        if len(candidate) <= chunk_size:
            buffer = candidate
            continue
        if buffer:
            merged.append(buffer.strip())
        buffer = segment.strip()
    if buffer:
        merged.append(buffer.strip())

    pieces: list[dict[str, int | str]] = []
    cursor = 0
    step = max(1, chunk_size - overlap)
    for chunk in merged:
        if len(chunk) <= chunk_size:
            pieces.append({"text": chunk, "start_char": cursor, "end_char": cursor + len(chunk)})
            cursor += len(chunk)
            continue
        for start in range(0, len(chunk), step):
            end = min(len(chunk), start + chunk_size)
            piece = chunk[start:end].strip()
            if piece:
                pieces.append({"text": piece, "start_char": cursor + start, "end_char": cursor + end})
            if end >= len(chunk):
                break
        cursor += len(chunk)
    return pieces


def _recursive_split(text: str, chunk_size: int, separators: list[str]) -> list[str]:
    if len(text) <= chunk_size or not separators:
        return [text.strip()]
    separator = separators[0]
    parts = text.split(separator)
    if len(parts) == 1:
        return _recursive_split(text, chunk_size, separators[1:])
    results: list[str] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if len(part) <= chunk_size:
            results.append(part)
        else:
            results.extend(_recursive_split(part, chunk_size, separators[1:]))
    return results


def build_embedding_backend(corpus_texts: list[str]) -> EmbeddingBackend:
    provider = settings.embedding_provider.lower().strip()
    if provider in {"auto", "sentence-transformers", "sentence_transformer", "st"}:
        backend = _try_sentence_transformers()
        if backend is not None:
            return backend

    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform(corpus_texts)
    dimension = matrix.shape[1] if matrix.shape[1] else 1
    return EmbeddingBackend(
        name="tfidf",
        model_name="TfidfVectorizer",
        dimension=dimension,
        encode=lambda texts: vectorizer.transform(texts).toarray(),
    )


@lru_cache(maxsize=1)
def _try_sentence_transformers() -> EmbeddingBackend | None:
    try:
        from sentence_transformers import SentenceTransformer
    except Exception:
        return None

    try:
        model = SentenceTransformer(settings.embedding_model)
        sample = model.encode(["RAG Lab"], normalize_embeddings=True)
        dimension = int(sample.shape[1]) if len(sample.shape) > 1 else int(sample.shape[0])
        return EmbeddingBackend(
            name="sentence-transformers",
            model_name=settings.embedding_model,
            dimension=dimension,
            encode=lambda texts: model.encode(texts, normalize_embeddings=True),
        )
    except Exception:
        return None


def search_vectors(
    vector_store: VectorStoreName,
    query_vector: np.ndarray,
    chunk_vectors: np.ndarray,
    chunks: list[str],
    top_k: int,
) -> SearchOutcome:
    if vector_store == "faiss":
        return _search_with_faiss(query_vector, chunk_vectors, chunks, top_k)
    return _search_with_cosine(query_vector, chunk_vectors, chunks, top_k, backend_name="chroma")


def _search_with_faiss(query_vector: np.ndarray, chunk_vectors: np.ndarray, chunks: list[str], top_k: int) -> SearchOutcome:
    try:
        import faiss
    except Exception:
        return _search_with_cosine(query_vector, chunk_vectors, chunks, top_k, backend_name="faiss")

    if not len(chunk_vectors):
        return SearchOutcome(results=[], backend_name="faiss")

    vectors = _normalize(chunk_vectors)
    query = _normalize(query_vector.reshape(1, -1))
    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors.astype(np.float32))
    scores, indices = index.search(query.astype(np.float32), min(top_k, len(chunks)))
    results: list[RetrievalMatch] = []
    for rank, (idx, score) in enumerate(zip(indices[0], scores[0]), start=1):
        if idx < 0:
            continue
        results.append(RetrievalMatch(rank=rank, chunk_index=int(idx), score=float(score), text=chunks[int(idx)]))
    return SearchOutcome(results=results, backend_name="faiss")


def _search_with_cosine(
    query_vector: np.ndarray,
    chunk_vectors: np.ndarray,
    chunks: list[str],
    top_k: int,
    backend_name: str,
) -> SearchOutcome:
    if not len(chunk_vectors):
        return SearchOutcome(results=[], backend_name=backend_name)

    normalized_chunks = _normalize(chunk_vectors)
    normalized_query = _normalize(query_vector.reshape(1, -1))
    scores = normalized_chunks @ normalized_query.T
    scores = scores.reshape(-1)
    ranked = np.argsort(scores)[::-1][: min(top_k, len(chunks))]
    results = [
        RetrievalMatch(rank=rank, chunk_index=int(idx), score=float(scores[idx]), text=chunks[int(idx)])
        for rank, idx in enumerate(ranked, start=1)
    ]
    return SearchOutcome(results=results, backend_name=backend_name)


def _normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    return vectors / norms


async def generate_answer(query: str, context: str) -> tuple[str, str]:
    if settings.groq_api_key:
        try:
            return _call_groq_api(query, context)
        except Exception:
            pass
    return _template_answer(query, context), "template"


def _call_groq_api(query: str, context: str) -> tuple[str, str]:
    client = Groq(api_key=settings.groq_api_key)
    completion = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {
                "role": "system",
                "content": "You are an educational RAG assistant. Answer from the provided context and explain the reasoning clearly.",
            },
            {
                "role": "user",
                "content": f"Question:\n{query}\n\nContext:\n{context}",
            },
        ],
        temperature=settings.groq_temperature,
        max_completion_tokens=settings.groq_max_completion_tokens,
        top_p=settings.groq_top_p,
        stream=False,
    )
    answer = completion.choices[0].message.content or ""
    return answer, "groq"


def _template_answer(query: str, context: str) -> str:
    trimmed_context = shorten(context.replace("\n", " "), width=700, placeholder="...")
    return (
        f"Question: {query}\n\n"
        f"Answer: The retrieved context suggests that the main idea is grounded in the selected chunks. A compact summary is: {trimmed_context}\n\n"
        "Explanation: This fallback answer is generated locally so the pipeline stays runnable without a Groq API key. "
        "Set GROQ_API_KEY in .env to use Groq for answer generation."
    )


def build_context(matches: list[RetrievalMatch]) -> str:
    if not matches:
        return "No relevant chunks were retrieved."
    return "\n\n".join(f"Chunk {match.chunk_index}: {match.text}" for match in matches)
