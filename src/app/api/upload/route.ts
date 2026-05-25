import { NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";

// ============================================================================
// AZURE BLOB STORAGE INTEGRATION
// ============================================================================
// Ensure these environment variables are set in your .env.local:
// AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
// AZURE_STORAGE_CONTAINER_NAME=documents
// ============================================================================

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

    // If credentials are not provided, mock the upload success for frontend testing
    if (!connectionString || !containerName) {
      console.warn("Azure Storage credentials missing. Simulating successful upload.");
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      return NextResponse.json({ 
        message: "File upload simulated successfully",
        fileName: file.name,
        size: file.size
      });
    }

    // ------------------------------------------------------------------------
    // ACTUAL AZURE BLOB UPLOAD LOGIC
    // ------------------------------------------------------------------------
    
    // 1. Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    // 2. Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure the container exists
    await containerClient.createIfNotExists();

    // 3. Create a unique name for the blob
    const blobName = `${Date.now()}-${file.name}`;

    // 4. Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // 5. Convert File to Buffer/ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Upload data to the blob
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: file.type }
    });

    // ------------------------------------------------------------------------
    // NEXT STEPS AFTER UPLOAD:
    // - Trigger an Azure Function or background job to extract text from this document.
    // - Chunk the extracted text.
    // - Generate embeddings for each chunk.
    // - Store chunks + embeddings in your Vector Database for the AI Search to use.
    // ------------------------------------------------------------------------

    return NextResponse.json({ 
      message: "File uploaded successfully to Azure Blob Storage",
      fileName: file.name,
      blobUrl: blockBlobClient.url
    });

  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file to storage" },
      { status: 500 }
    );
  }
}
