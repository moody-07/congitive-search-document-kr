import { NextResponse } from "next/server";
import { ContainerClient } from "@azure/storage-blob";

function getContainerClient() {
  const accountUrl = "https://filecheckerstorage.blob.core.windows.net";
  const containerName = "files-from-project";
  const sasToken = "si=Ai&sv=2026-02-06&sr=c&sig=i5rU9xuYEtDZmaTJWBlzMujleCWEIiJr2of0UMzbvHY%3D";

  if (!accountUrl || !containerName || !sasToken) {
    throw new Error("Azure Storage credentials are not configured.");
  }

  const cleanSasToken = sasToken.startsWith("?") ? sasToken.substring(1) : sasToken;
  const containerSasUrl = `${accountUrl.replace(/\/$/, "")}/${containerName}?${cleanSasToken}`;
  return new ContainerClient(containerSasUrl);
}

export async function POST(req: Request) {
  try {
    const { blobName } = await req.json();
    if (!blobName) {
      return NextResponse.json({ error: "blobName is required" }, { status: 400 });
    }

    const containerClient = getContainerClient();
    const blobClient = containerClient.getBlobClient(blobName);
    
    const download = await blobClient.download();
    const chunks: Buffer[] = [];
    for await (const chunk of download.readableStreamBody as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const contentType = download.contentType || "application/octet-stream";

    // Call OCR
    const OCR_URL    = "https://stt.roshnaisunat.com/upload/";
    const OCR_TOKEN  = "be1b0beb-9a04-4942-adbc-c57a16ea489b";
    const OCR_PROMPT = "تكایە دەقە لەوێنەكە بهێنەدەرەوە";

    const form = new FormData();
    const originalFilename = blobName.replace(/^\d+-/, "");
    // Use File object exactly like the original upload route
    const fileObj = new File([buffer], originalFilename, { type: contentType });
    
    form.append("file", fileObj);
    form.append("mime_type", contentType);
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

    const newOcrText = await res.text();

    // Save OCR back to blob storage
    const ocrBlobName = `${blobName}.ocr.txt`;
    const ocrBlobClient = containerClient.getBlockBlobClient(ocrBlobName);
    await ocrBlobClient.uploadData(Buffer.from(newOcrText, "utf-8"), {
      blobHTTPHeaders: { blobContentType: "text/plain; charset=utf-8" },
    });

    // Invalidate the search cache
    (globalThis as any)._ocrCacheInvalidate = Date.now();

    return NextResponse.json({ success: true, text: newOcrText });
  } catch (error: any) {
    console.error("Error redoing OCR:", error);
    return NextResponse.json(
      { error: `Failed to redo OCR: ${error.message || error}` },
      { status: 500 }
    );
  }
}
