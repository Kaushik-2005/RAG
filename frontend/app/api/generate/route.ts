import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a strict context-grounded RAG assistant. Use only the retrieved context to answer the user question. If the answer is not explicitly supported by the context, say you do not know based on the provided context. Do not use outside knowledge. Keep the answer concise and factual.`;

export async function POST(request: Request) {
  try {
    const { query, context, model } = (await request.json()) as { query?: string; context?: string; model?: string };

    if (!query || !context) {
      return NextResponse.json({ error: "Query and context are required." }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "llama-3.1-8b-instant",
        temperature: 0.2,
        top_p: 1,
        max_completion_tokens: 1024,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Question:\n${query}\n\nRetrieved context:\n${context}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      return NextResponse.json({ error: `Groq request failed: ${response.status}`, details: payload }, { status: 500 });
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: "Groq returned an empty answer." }, { status: 500 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation request failed." },
      { status: 500 },
    );
  }
}