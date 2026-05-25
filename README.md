# DocuMind AI - Intelligent Document Search System

A Next.js (App Router) Single Page Application that acts as an intelligent document search and management system. It integrates with Azure AI Foundry for intelligent queries and Azure Blob Storage for document management.

## Prerequisites

- Node.js (v18+ recommended)
- An Azure subscription
- An Azure Storage Account
- An Azure OpenAI Service resource

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env.local` file in the root of your project:
   ```bash
   touch .env.local
   ```
   Add the following variables to it:

   ```env
   # ==========================================
   # AZURE OPENAI CREDENTIALS
   # ==========================================
   # Found in Azure AI Foundry -> Project Settings -> Endpoints & keys
   AZURE_OPENAI_ENDPOINT="https://your-resource-name.openai.azure.com/"
   AZURE_OPENAI_API_KEY="your_azure_openai_api_key_here"
   
   # The name you gave your deployed model in Azure AI Studio (e.g., 'gpt-4o' or 'text-embedding-ada-002')
   AZURE_OPENAI_DEPLOYMENT_NAME="your_model_deployment_name"

   # ==========================================
   # AZURE BLOB STORAGE CREDENTIALS
   # ==========================================
   # Found in Azure Portal -> Storage Account -> Security + networking -> Access keys
   AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=your_account;AccountKey=your_key;EndpointSuffix=core.windows.net"
   
   # The name of the blob container where documents should be uploaded
   AZURE_STORAGE_CONTAINER_NAME="documents"
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

- `src/app/page.tsx`: The main dashboard wrapping the navigation and tabs.
- `src/components/Sidebar.tsx`: The sidebar navigation.
- `src/components/SearchTab.tsx`: The AI search interface querying the chat API.
- `src/components/DocManager.tsx`: The document upload UI interfacing with the upload API.
- `src/components/LogsTab.tsx`: The search history logs.
- `src/app/api/chat/route.ts`: API route connecting to Azure OpenAI and handling RAG search logic.
- `src/app/api/upload/route.ts`: API route connecting to Azure Blob Storage for file uploads.

## RAG Workflow Integration Notes

The `api/chat/route.ts` file includes comments and placeholders for implementing your complete Retrieval-Augmented Generation (RAG) workflow. You will need to integrate your Vector Database (e.g., Azure AI Search) to fetch the relevant context based on the user's query embeddings before passing it to the chat completion model.
