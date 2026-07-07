"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SearchTab from "@/components/SearchTab";
import DocManager from "@/components/DocManager";
import LogsTab from "@/components/LogsTab";
import BalanceTab from "@/components/BalanceTab";
import DocumentPreview, { PreviewDoc } from "@/components/DocumentPreview";

import { SearchLog } from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"search" | "documents" | "logs" | "balance">("search");
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div className={`fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 h-full bg-white`}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); }} />
      </div>

      <main className="flex-1 overflow-hidden relative flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-gray-100 bg-white z-10 shrink-0">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-500 hover:text-black">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-black ml-2">DocuMind</span>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {activeTab === "search" && <SearchTab onSearchComplete={addSearchLog} onPreviewDoc={setPreviewDoc} />}
          {activeTab === "documents" && <DocManager onPreviewDoc={setPreviewDoc} />}
          {activeTab === "logs" && <LogsTab onPreviewDoc={setPreviewDoc} />}
          {activeTab === "balance" && <BalanceTab />}
        </div>
      </main>

      <DocumentPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
