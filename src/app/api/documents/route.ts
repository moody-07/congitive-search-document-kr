import { NextResponse } from "next/server";
import { ContainerClient } from "@azure/storage-blob";

function getContainerClient() {
  const accountUrl = "https://filecheckerstorage.blob.core.windows.net";
  const containerName = "files-from-project";
  const sasToken = "si=Ai&sv=2026-02-06&sr=c&sig=i5rU9xuYEtDZmaTJWBlzMujleCWEIiJr2of0UMzbvHY%3D";

  if (!accountUrl || !containerName || !sasToken) {
    throw new Error("Azure Storage credentials are not configured in environment variables.");
  }

  const cleanSasToken = sasToken.startsWith("?") ? sasToken.substring(1) : sasToken;
  const containerSasUrl = `${accountUrl.replace(/\/$/, "")}/${containerName}?${cleanSasToken}`;

  return {
    containerClient: new ContainerClient(containerSasUrl),
    sasToken: cleanSasToken,
    accountUrl,
    containerName,
  };
}

export async function GET() {
  try {
    const { containerClient, accountUrl, containerName, sasToken } = getContainerClient();

    const documents = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      // Skip OCR companion text files — they are internal artefacts
      if (blob.name.endsWith(".ocr.txt")) continue;
      // Skip search logs
      if (blob.name.startsWith("search-logs/")) continue;

      // Build a preview/download URL using the container SAS token
      const blobUrl = `${accountUrl.replace(/\/$/, "")}/${containerName}/${encodeURIComponent(blob.name)}?${sasToken}`;
      
      documents.push({
        id: blob.name, // Use blob name as ID
        name: blob.name.replace(/^\d+-/, ""), // Strip the timestamp prefix for display
        blobName: blob.name, // Original full name
        uploadDate: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
        size: blob.properties.contentLength || 0,
        url: blobUrl,
      });
    }

    // Sort by upload date descending
    documents.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      { error: `Failed to list documents: ${error.message || error}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const blobName = searchParams.get("blobName");

    if (!blobName) {
      return NextResponse.json({ error: "blobName parameter is required" }, { status: 400 });
    }

    const { containerClient } = getContainerClient();
    const blobClient = containerClient.getBlobClient(blobName);

    await blobClient.delete();

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: `Failed to delete document: ${error.message || error}` },
      { status: 500 }
    );
  }
}
