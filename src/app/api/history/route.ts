import { NextResponse } from "next/server";
import { ContainerClient } from "@azure/storage-blob";

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

export async function GET() {
  try {
    const container = getContainerClient();
    const history = [];

    // List blobs in 'search-logs/' folder
    for await (const blob of container.listBlobsFlat({ prefix: "search-logs/" })) {
      try {
        const blobClient = container.getBlobClient(blob.name);
        const download = await blobClient.download();
        const chunks: Buffer[] = [];
        for await (const chunk of download.readableStreamBody as AsyncIterable<Buffer>) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
        const cleanSummary = (data.summary || "")
          .replace(/\n\n\*?Time taken to analyze.*\s*/g, "")
          .replace(/\n\nAnalysis time:.*\s*/g, "");
          
        history.push({
          id: blob.name,
          date: blob.properties.lastModified?.toISOString() || data.timestamp || new Date().toISOString(),
          query: data.query,
          answer: data.answer,
          summary: cleanSummary,
          sources: data.sources || [],
          processingTimeSec: data.processingTimeSec,
        });
      } catch (err) {
        console.warn(`[history] Could not read or parse blob ${blob.name}:`, err);
      }
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Return the top 10 recent searches
    return NextResponse.json({ history: history.slice(0, 10) });
  } catch (error: unknown) {
    console.error("[history] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to fetch search history: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Valid log id is required" }, { status: 400 });
    }
    
    // Safety check - only allow deleting search logs
    if (!id.startsWith("search-logs/")) {
      return NextResponse.json({ error: "Invalid log id" }, { status: 400 });
    }

    const container = getContainerClient();
    const blobClient = container.getBlobClient(id);
    await blobClient.deleteIfExists();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[history] Error deleting log:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to delete search log: ${message}` },
      { status: 500 }
    );
  }
}
