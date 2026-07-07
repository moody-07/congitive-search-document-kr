import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { ContainerClient } from "@azure/storage-blob";

// ── Azure OpenAI client ──────────────────────────────────────────────────────

const ENDPOINT  = "https://filechecker-foundary.cognitiveservices.azure.com/";
const API_KEY   = "5CU49McL0XK9z87wOms8mUc2u1aqgWrrJdMoSnHLpnCQpwv3XMaeJQQJ99CEAC5RqLJXJ3w3AAAAACOGRBx1";
const MODEL     = "gpt-5.1";
const API_VER   = "2024-12-01-preview";

function getAIClient() {
  // Using standard OpenAI client configured for Azure to avoid Netlify environment variable conflicts
  // that cause "baseURL and endpoint are mutually exclusive" errors in the AzureOpenAI wrapper.
  return new OpenAI({
    baseURL: `${ENDPOINT}openai/deployments/${MODEL}`,
    apiKey: API_KEY,
    defaultQuery: { "api-version": API_VER },
    defaultHeaders: { "api-key": API_KEY },
  });
}

// ── Azure Blob helpers ───────────────────────────────────────────────────────

function getContainerClient(): ContainerClient {
  const accountUrl   = "https://filecheckerstorage.blob.core.windows.net";
  const containerName = "files-from-project";
  const sasToken     = "si=Ai&sv=2026-02-06&sr=c&sig=i5rU9xuYEtDZmaTJWBlzMujleCWEIiJr2of0UMzbvHY%3D";

  if (!accountUrl || !containerName || !sasToken) {
    throw new Error("Azure Storage credentials are not configured.");
  }

  const cleanSas = sasToken.startsWith("?") ? sasToken.slice(1) : sasToken;
  return new ContainerClient(
    `${accountUrl.replace(/\/$/, "")}/${containerName}?${cleanSas}`
  );
}

// ── In-Memory Cache for Documents ────────────────────────────────────────────
let cachedDocs: { name: string; text: string; date: string }[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Fetch all OCR text files from Blob Storage in parallel and cache them. */
async function loadAllOcrDocuments(): Promise<{ name: string; text: string; date: string }[]> {
  const invalidateTime = (globalThis as any)._ocrCacheInvalidate || 0;
  if (cachedDocs && Date.now() - lastCacheTime < CACHE_TTL && lastCacheTime > invalidateTime) {
    return cachedDocs;
  }

  const container = getContainerClient();
  const blobItems = [];

  for await (const blob of container.listBlobsFlat()) {
    if (blob.name.endsWith(".ocr.txt")) {
      blobItems.push(blob);
    }
  }

  const docs = await Promise.all(
    blobItems.map(async (blob) => {
      // Derive the human-readable original filename from the blob name
      const displayName = blob.name
        .replace(/\.ocr\.txt$/, "")
        .replace(/^\d+-/, "");

      const dateObj = blob.properties.lastModified;
      const dateStr = dateObj ? dateObj.toISOString().split("T")[0] : "Unknown Date";

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
          return { name: displayName, text, date: dateStr };
        }
      } catch (e) {
        console.warn(`[chat] Could not read blob ${blob.name}:`, e);
      }
      return null;
    })
  );

  cachedDocs = docs.filter((d): d is { name: string; text: string; date: string } => d !== null);
  lastCacheTime = Date.now();
  return cachedDocs;
}

/** Save a search log to Blob Storage asynchronously */
async function saveSearchLog(query: string, parsedResponse: any) {
  try {
    const container = getContainerClient();
    const logId = Date.now().toString() + "-" + Math.random().toString(36).substring(2, 7);
    const logName = `search-logs/log-${logId}.json`;
    const logClient = container.getBlockBlobClient(logName);
    
    const logData = {
      timestamp: new Date().toISOString(),
      query,
      answer: parsedResponse.answer,
      summary: parsedResponse.summary,
      sources: parsedResponse.sources,
    };
    
    await logClient.uploadData(Buffer.from(JSON.stringify(logData, null, 2)), {
      blobHTTPHeaders: { blobContentType: "application/json" }
    });
  } catch (err) {
    console.error("[chat] Failed to save search log to Blob Storage:", err);
  }
}

// ── In-Memory Cache for Search Logs ──────────────────────────────────────────
let cachedLogs: Record<string, any> | null = null;
let lastLogsCacheTime = 0;

async function loadAllSearchLogs() {
  if (cachedLogs && Date.now() - lastLogsCacheTime < CACHE_TTL) {
    return cachedLogs;
  }

  const container = getContainerClient();
  const logs: Record<string, any> = {};

  try {
    for await (const blob of container.listBlobsFlat({ prefix: "search-logs/" })) {
      try {
        const blobClient = container.getBlobClient(blob.name);
        const download = await blobClient.download();
        const chunks: Buffer[] = [];
        for await (const chunk of download.readableStreamBody as AsyncIterable<Buffer>) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
        if (data.query) {
          logs[data.query.trim().toLowerCase()] = {
            answer: data.answer,
            summary: data.summary,
            sources: data.sources || [],
          };
        }
      } catch (err) {
        // ignore individual parse errors
      }
    }
  } catch (err) {
    console.warn("Failed to list search logs", err);
  }

  cachedLogs = logs;
  lastLogsCacheTime = Date.now();
  return cachedLogs;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const startTime = Date.now();
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
          `=== فایل ${i + 1}: ${doc.name} (Date: ${doc.date}) ===\n${doc.text}\n=== کۆتایی فایل ${i + 1} ===`
      )
      .join("\n\n");

    // 3. System prompt — Kurdish-first, multilingual
    const systemPrompt = `You are an expert document analyst and search engine specializing in Kurdish (Sorani), Arabic, and Persian documents related to construction projects, government contracts, and urban development.

Your objective is to find the MOST ACCURATE and COMPLETE answer to the user's query from the provided documents.

### SEARCH & MATCHING STRATEGY
- **Implicit Translation**: If the user asks in Kurdish but the documents are in Arabic or English (e.g., "پڕۆژەی داونتۆن" vs "Downtown project"), translate the keywords conceptually and search for all variations.
- **Proper Names & Entities**: For names like "Downtown", search for exact English spelling ("Downtown") AND possible transliterations ("داونتۆن", "داون تاون", "داونتاون").
- **OCR Error Resilience**: The documents are generated via OCR and may contain typos (e.g., "D0wntown", "Pr0ject"). Match words that are conceptually or phonetically identical.

### EXTRACTION & ANSWERING
- Read ALL the documents carefully. DO NOT stop at the first match.
- Answer the question directly and thoroughly.
- Be specific: extract exact numbers, dates, names, amounts, locations, and project details.
- ALWAYS respond in the SAME language as the user's question. If the question is in Kurdish (Sorani), answer fully in natural, professional Kurdish (Sorani).
- If no document contains the answer, say so clearly (e.g., "ببورە، هیچ زانیارییەک نەدۆزرایەوە"). Do not guess or hallucinate.

### CITATIONS & DATES
- ALWAYS reference the explicit document Date (e.g. Date: YYYY-MM-DD) provided in the document header when extracting information. DO NOT invent dates.

### UNICODE NORMALIZATION & EQUIVALENCE
When performing keyword searches on Kurdish (Sorani) and Arabic text, the search must be Unicode-insensitive. Do not rely on exact Unicode matching. Treat all equivalent Arabic and Kurdish letters as interchangeable, regardless of which Unicode code point is used in the document or the search query.

Before searching:
1. Normalize the search query and document text.
2. Generate equivalent character variants where necessary.
3. Match using all equivalent forms and return results from any equivalent representation.

The normalization must apply to every equivalent Kurdish and Arabic character, including but not limited to:
- Arabic Yeh ↔ Kurdish Yeh
- Arabic Kaf ↔ Kurdish Kaf
- Arabic Heh ↔ Kurdish Ae
- Persian/Arabic variants of Waw, Alef, Hamza, Heh, Yeh, Kaf, and all presentation forms
- Arabic Presentation Forms (Unicode FB50–FDFF and FE70–FEFF)
- Characters that differ only because of keyboard layout or Unicode encoding
- Remove Tatweel (ـ)
- Ignore optional Arabic diacritics (Fatha, Damma, Kasra, Shadda, Sukun, Tanween, etc.) unless explicitly required

Keyword matching should prioritize linguistic equivalence rather than raw Unicode equality. For example, searching for a word must also find documents containing the same word written with Arabic, Persian, or Kurdish Unicode variants.

Return your response as a JSON object with exactly these keys:
{
  "answer": "<your detailed answer in the same language as the question. Mention the document number if present.>",
  "summary": "Must follow this EXACT structure (in the query's language, use N/A if not found):\nDate: <date>\nNumber: <document number>\nDocument Title: <document title>\n\n<1-2 sentences about the document>",
  "sources": [
    { 
      "title": "<filename of MOST relevant doc>", 
      "note": "<one sentence why this is most relevant>",
      "documentNumber": "<extract document number or 'ژمارەی نووسراو' from the document text if present, otherwise null>"
    }
  ]
}

Rules for sources:
- Order sources from MOST relevant to LEAST relevant.
- Include ALL documents that mention or relate to the question — do not omit any.
- The "note" should be in the same language as the user's question.
- Extract the document number (e.g. ژمارەی نووسراو, No.) if present in the document.
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
      sources?: ({ title: string; note?: string; documentNumber?: string | null } | string)[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { answer: raw, summary: "" };
    }

    // Normalise sources — GPT may return objects or plain strings
    const sources = (parsed.sources ?? []).map((s: any) => ({
      title: typeof s === "string" ? s : (s.title || s.name || s.document || "Unknown Document"),
      note:  typeof s === "string" ? "" : (s.note ?? ""),
      documentNumber: typeof s === "object" ? (s.documentNumber ?? null) : null,
    }));

    const processingTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Clean any accidentally saved timing strings from the base summary
    const cleanSummary = (parsed.summary || "")
      .replace(/\n\n\*?Time taken to analyze.*\s*/g, "")
      .replace(/\n\nAnalysis time:.*\s*/g, "");

    const finalResponse = {
      answer:  parsed.answer  || "ناتوانم وەڵامێکی دیاری بدەمەوە.",
      summary: cleanSummary,
      sources,
      processingTimeSec,
    };

    // Update in-memory cache instantly
    if (cachedLogs) {
      cachedLogs[query.trim().toLowerCase()] = finalResponse;
    }

    // Save search history in the background without blocking the user response
    saveSearchLog(query, finalResponse);

    return NextResponse.json(finalResponse);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[chat] Error:", message);
    return NextResponse.json(
      { error: `Failed to process query: ${message}` },
      { status: 500 }
    );
  }
}
