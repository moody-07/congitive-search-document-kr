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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const blobName = searchParams.get("blobName");

    if (!blobName) {
      return NextResponse.json({ error: "blobName parameter is required" }, { status: 400 });
    }

    const ocrBlobName = `${blobName}.ocr.txt`;
    const containerClient = getContainerClient();
    const blobClient = containerClient.getBlobClient(ocrBlobName);

    try {
      const download = await blobClient.download();
      const chunks: Buffer[] = [];
      for await (const chunk of download.readableStreamBody as AsyncIterable<Buffer>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const text = Buffer.concat(chunks).toString("utf-8");

      return NextResponse.json({ text });
    } catch (e: any) {
      if (e.statusCode === 404) {
        return NextResponse.json({ text: "" }); // Return empty if not found
      }
      throw e;
    }
  } catch (error: any) {
    console.error("Error fetching OCR:", error);
    return NextResponse.json(
      { error: `Failed to fetch OCR: ${error.message || error}` },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { blobName, text } = body;

    if (!blobName || text === undefined) {
      return NextResponse.json({ error: "blobName and text are required" }, { status: 400 });
    }

    const ocrBlobName = `${blobName}.ocr.txt`;
    const containerClient = getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(ocrBlobName);

    await blockBlobClient.uploadData(Buffer.from(text, "utf-8"), {
      blobHTTPHeaders: { blobContentType: "text/plain; charset=utf-8" },
    });

    // Invalidate the search cache
    (globalThis as any)._ocrCacheInvalidate = Date.now();

    return NextResponse.json({ success: true, message: "OCR text updated successfully." });
  } catch (error: any) {
    console.error("Error updating OCR:", error);
    return NextResponse.json(
      { error: `Failed to update OCR: ${error.message || error}` },
      { status: 500 }
    );
  }
}
