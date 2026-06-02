import { NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { ContainerClient } from "@azure/storage-blob";

// ── Azure OpenAI client ──────────────────────────────────────────────────────

const ENDPOINT  = "https://filechecker-foundary.cognitiveservices.azure.com/";
const API_KEY   = process.env.AZURE_OPENAI_API_KEY!;
const MODEL     = "gpt-5.1";
const API_VER   = "2024-12-01-preview";

function getAIClient() {
  return new AzureOpenAI({
    endpoint:   ENDPOINT,
    apiKey:     API_KEY,
    deployment: MODEL,
    apiVersion: API_VER,
  });
}

// ── Azure Blob helpers ───────────────────────────────────────────────────────

function getContainerClient(): ContainerClient {
  const accountUrl   = process.env.AZURE_STORAGE_ACCOUNT_URL!;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;
  const sasToken     = process.env.AZURE_STORAGE_SAS_TOKEN!;

  if (!accountUrl || !containerName || !sasToken) {
    throw new Error("Azure Storage credentials are not configured.");
  }

  const cleanSas = sasToken.startsWith("?") ? sasToken.slice(1) : sasToken;
  return new ContainerClient(
    `${accountUrl.replace(/\/$/, "")}/${containerName}?${cleanSas}`
  );
}

/** Fetch all OCR text files from Blob Storage and return them as a map of filename → text. */
async function loadAllOcrDocuments(): Promise<{ name: string; text: string }[]> {
  const container = getContainerClient();
  const docs: { name: string; text: string }[] = [];

  for await (const blob of container.listBlobsFlat()) {
    if (!blob.name.endsWith(".ocr.txt")) continue;

    // Derive the human-readable original filename from the blob name:
    // format: <timestamp>-<safeName>.ocr.txt
    const displayName = blob.name
      .replace(/\.ocr\.txt$/, "")   // strip .ocr.txt
      .replace(/^\d+-/, "");         // strip leading timestamp

    try {
      const blobClient = container.getBlobClient(blob.name);
      const download = await blobClient.download();
      const chunks: Buffer[] = [];
      for await (const chunk of download.readableStreamBody as AsyncIterable<Buffer>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const text = Buffer.concat(chunks).toString("utf-8").trim();

      // Skip empty / failed OCR blobs
      if (text && !text.startsWith("[OCR failed:")) {
        docs.push({ name: displayName, text });
      }
    } catch (e) {
      console.warn(`[chat] Could not read blob ${blob.name}:`, e);
    }
  }

  return docs;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Load every OCR document from Blob Storage
    const docs = await loadAllOcrDocuments();

    if (docs.length === 0) {
      return NextResponse.json({
        answer: "هیچ فایلێک بار نەکراوە. تکایە پێشتر فایلەکان بار بکە.",
        summary: "No documents have been uploaded yet.",
        sources: [],
      });
    }

    // 2. Build the full context block — one section per document
    const contextBlock = docs
      .map(
        (doc, i) =>
          `=== فایل ${i + 1}: ${doc.name} ===\n${doc.text}\n=== کۆتایی فایل ${i + 1} ===`
      )
      .join("\n\n");

    // 3. System prompt — Kurdish-first, multilingual
    const systemPrompt = `You are an expert document analyst specializing in Kurdish (Sorani), Arabic, and Persian documents related to construction projects, government contracts, and urban development.

Your task:
- Read ALL the documents provided below carefully.
- Find ALL documents that are relevant to the user's question (there may be more than one).
- Answer the question directly and accurately.
- Always respond in the SAME language as the user's question. If the question is in Kurdish (Sorani), answer fully in Kurdish (Sorani).
- Be specific: extract dates, names, amounts, locations, and project details when asked.
- If no document contains the answer, say so clearly.

Return your response as a JSON object with exactly these keys:
{
  "answer": "<your detailed answer in the same language as the question>",
  "summary": "<a short 1-2 sentence summary>",
  "sources": [
    { "title": "<filename of MOST relevant doc>", "note": "<one sentence why this is most relevant>" },
    { "title": "<filename of second relevant doc>", "note": "<one sentence why>" }
  ]
}

Rules for sources:
- Order sources from MOST relevant to LEAST relevant.
- Include ALL documents that mention or relate to the question — do not omit any.
- The "note" should be in the same language as the user's question.
- Do NOT include documents that have no relation to the question.

Do NOT wrap the JSON in markdown code blocks.

--- DOCUMENTS ---
${contextBlock}
--- END OF DOCUMENTS ---`;

    // 4. Call GPT-5.1
    const client = getAIClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: query },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    let parsed: {
      answer?: string;
      summary?: string;
      sources?: ({ title: string; note?: string } | string)[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { answer: raw, summary: "" };
    }

    // Normalise sources — GPT may return objects or plain strings
    const sources = (parsed.sources ?? []).map((s) => ({
      title: typeof s === "string" ? s : s.title,
      note:  typeof s === "string" ? "" : (s.note ?? ""),
    }));

    return NextResponse.json({
      answer:  parsed.answer  || "ناتوانم وەڵامێکی دیاری بدەمەوە.",
      summary: parsed.summary || "",
      sources,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[chat] Error:", message);
    return NextResponse.json(
      { error: `Failed to process query: ${message}` },
      { status: 500 }
    );
  }
}
