import { NextResponse } from "next/server";
import { ContainerClient } from "@azure/storage-blob";

// ── helpers ─────────────────────────────────────────────────────────────────

function getContainerClient(): ContainerClient {
  const accountUrl    = "https://filecheckerstorage.blob.core.windows.net";
  const containerName = "files-from-project";
  const sasToken      = "si=Ai&sv=2026-02-06&sr=c&sig=i5rU9xuYEtDZmaTJWBlzMujleCWEIiJr2of0UMzbvHY%3D";

  if (!accountUrl || !containerName || !sasToken) {
    throw new Error("Azure Storage credentials are not configured.");
  }

  const cleanSas = sasToken.startsWith("?") ? sasToken.slice(1) : sasToken;
  return new ContainerClient(
    `${accountUrl.replace(/\/$/, "")}/${containerName}?${cleanSas}`
  );
}

/** Upload a buffer to Azure Blob Storage and return the public URL. */
async function uploadToBlob(
  containerClient: ContainerClient,
  blobName: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blockBlobClient.url;
}

/** Call the external OCR API and return extracted text. */
async function runOcr(file: File): Promise<string> {
  const OCR_URL    = "https://stt.roshnaisunat.com/upload/";
  const OCR_TOKEN  = "85pou";
  const OCR_PROMPT = "تكایە دەقە لەوێنەكە بهێنەدەرەوە";

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("mime_type", file.type || "application/octet-stream");
  form.append("user_message", OCR_PROMPT);

  const res = await fetch(OCR_URL, {
    method: "POST",
    headers: {
      accept: "text/plain",
      "X-API-Token": OCR_TOKEN,
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OCR API error (${res.status}): ${errText}`);
  }

  return await res.text();
}

// ── route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Support single file OR multiple files under field name "file"
    const rawFiles = formData.getAll("file");
    const files = rawFiles.filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No file(s) provided." }, { status: 400 });
    }

    const containerClient = getContainerClient();
    const results: {
      fileName: string;
      blobName: string;
      blobUrl: string;
      ocrBlobName: string;
      ocrBlobUrl: string;
      ocrText: string;
    }[] = [];

    for (const file of files) {
      // 1. Upload original file
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, "_");
      const blobName = `${Date.now()}-${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const blobUrl = await uploadToBlob(
        containerClient,
        blobName,
        buffer,
        file.type || "application/octet-stream"
      );

      // 2. Run OCR
      let ocrText = "";
      let ocrError: string | null = null;
      try {
        ocrText = await runOcr(file);
      } catch (e: unknown) {
        ocrError = e instanceof Error ? e.message : String(e);
        console.error("[upload] OCR failed for", file.name, ocrError);
      }

      // 3. Save OCR result as a companion .ocr.txt blob (used by the chat route)
      const ocrBlobName = `${blobName}.ocr.txt`;
      const ocrContent  = ocrText || `[OCR failed: ${ocrError}]`;
      const ocrBlobUrl  = await uploadToBlob(
        containerClient,
        ocrBlobName,
        Buffer.from(ocrContent, "utf-8"),
        "text/plain; charset=utf-8"
      );

      results.push({
        fileName:    file.name,
        blobName,
        blobUrl,
        ocrBlobName,
        ocrBlobUrl,
        ocrText:     ocrText.slice(0, 500), // Preview only
      });
    }

    return NextResponse.json({
      message: `${results.length} file(s) uploaded and OCR'd successfully.`,
      results,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[upload] Fatal error:", message);
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
