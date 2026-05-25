import { NextResponse } from "next/server";
import { OpenAI } from "openai";

// ============================================================================
// AZURE OPENAI INTEGRATION
// ============================================================================
// Ensure these environment variables are set in your .env.local:
// AZURE_OPENAI_API_KEY=your_api_key_here
// AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
// AZURE_OPENAI_DEPLOYMENT_NAME=your_model_deployment_name (e.g., gpt-4)
// ============================================================================

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // ------------------------------------------------------------------------
    // RAG WORKFLOW IMPLEMENTATION INSTRUCTIONS
    // ------------------------------------------------------------------------
    // 
    // Step 1: Embed the Query
    // - Use an embedding model (like text-embedding-ada-002) to convert the user's `query` into a vector.
    // - e.g., const embedding = await openai.embeddings.create({ input: query, model: "your-embedding-deployment" })
    //
    // Step 2: Vector Search
    // - Search your vector database (e.g., Azure AI Search, Pinecone, or PostgreSQL with pgvector)
    //   using the embedding vector from Step 1.
    // - Retrieve the top K most relevant text chunks from your documents.
    // 
    // Step 3: Extract Context from Azure Blob Storage (if needed)
    // - If your vector DB only stores metadata/pointers, use the retrieved pointers to 
    //   download the actual text content from Azure Blob Storage.
    //
    // Step 4: Construct the Prompt
    // - Combine the retrieved text chunks to form a single context string.
    // - Construct a system prompt that tells the AI to answer the query *only* using the provided context.
    // ------------------------------------------------------------------------

    // MOCK RAG Context (Replace with actual retrieval logic)
    const mockRetrievedContext = "Zagros Solutions was paid $500 on May 20, 2026 for IT consulting services. This is documented in Invoice_Zagros_500.pdf.";
    
    // MOCK Source Documents (Replace with actual retrieved metadata)
    const sources = [
      { title: "Invoice_Zagros_500.pdf", score: 0.92 }
    ];

    // Check if Azure OpenAI credentials are provided
    if (!endpoint || !apiKey || !deployment) {
      console.warn("Azure OpenAI credentials are missing. Returning mock response.");
      // Return a mock response if no API keys are present so the UI still works
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      
      return NextResponse.json({
        answer: "Based on the documents, you paid $500 to Zagros Solutions for IT consulting services on May 20, 2026.",
        summary: "The retrieved documents contain financial records, specifically an invoice from Zagros Solutions detailing a payment of $500.",
        sources: sources
      });
    }

    // Initialize OpenAI client for Azure
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: `${endpoint}/openai/deployments/${deployment}`,
      defaultQuery: { "api-version": "2024-02-15-preview" },
      defaultHeaders: { "api-key": apiKey },
    });

    // Construct the actual prompt using the retrieved context
    const messages = [
      { 
        role: "system", 
        content: `You are an intelligent document analysis assistant. Answer the user's question based strictly on the following context. 
                  Provide a direct answer, followed by a brief summary of the context. 
                  Format your response as a JSON object with two keys: "answer" and "summary".
                  
                  Context: ${mockRetrievedContext}` 
      },
      { 
        role: "user", 
        content: query 
      }
    ];

    const response = await client.chat.completions.create({
      messages: messages as any,
      model: deployment, // Ignored by Azure, but required by OpenAI SDK
      response_format: { type: "json_object" }
    });

    const aiResponse = response.choices[0].message.content;
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse || "{}");
    } catch (e) {
      parsedResponse = { answer: aiResponse, summary: "Summary unavailable." };
    }

    return NextResponse.json({
      answer: parsedResponse.answer || "I couldn't find a specific answer.",
      summary: parsedResponse.summary || "No summary available.",
      sources: sources
    });

  } catch (error: any) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process the query. Ensure Azure credentials are correct." },
      { status: 500 }
    );
  }
}
