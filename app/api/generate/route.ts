import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a strict context-grounded RAG assistant. Use only the retrieved context to answer the user question. If the answer is not explicitly supported by the context, say you do not know based on the provided context. Do not use outside knowledge. Keep the answer concise and factual.`;

export async function POST(request: Request) {
  try {
    const { query, context, model } = (await request.json()) as { query?: string; context?: string; model?: string };

    if (!query || !context) {
      return NextResponse.json({ error: "Query and context are required." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || "gemini-3.6-flash")}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${SYSTEM_PROMPT}

Question:
${query}

Retrieved context:
${context}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.05,
            topP: 1,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!response.ok) {
      const payload = await response.text();
      return NextResponse.json({ error: `Gemini request failed: ${response.status}`, details: payload }, { status: 500 });
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const answer = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!answer) {
      return NextResponse.json({ error: "Gemini returned an empty answer." }, { status: 500 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation request failed." },
      { status: 500 },
    );
  }
}
