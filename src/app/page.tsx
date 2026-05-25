"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import SearchTab from "@/components/SearchTab";
import { DocManager } from "@/components/DocManager";
import LogsTab from "@/components/LogsTab";
import DocumentPreview, { PreviewDoc } from "@/components/DocumentPreview";

import { SearchLog } from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"search" | "documents" | "logs">("search");
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc>(null);

  const addSearchLog = (query: string, response: string) => {
    const newLog: SearchLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      query,
      response,
    };
    setSearchLogs((prev) => [newLog, ...prev]);
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-y-auto relative">
        {activeTab === "search" && <SearchTab onSearchComplete={addSearchLog} onPreviewDoc={setPreviewDoc} />}
        {activeTab === "documents" && <DocManager onPreviewDoc={setPreviewDoc} />}
        {activeTab === "logs" && <LogsTab logs={searchLogs} />}
      </main>

      <DocumentPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
