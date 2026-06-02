"use client";

import { useState, useEffect } from "react";
import { History, Loader2, Search, FileText } from "lucide-react";

type HistoryItem = {
  id: string;
  date: string;
  query: string;
  answer: string;
  summary: string;
  sources: { title: string; note: string }[];
};

type Document = {
  id: string;
  name: string;
  blobName: string;
  url?: string;
  uploadDate: string;
};

export default function LogsTab({
  onPreviewDoc,
}: {
  onPreviewDoc: (doc: { id: string; name: string; url?: string }) => void;
}) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch("/api/documents");
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error("Failed to load documents for logs:", err);
      }
    };
    loadDocuments();

    const loadHistory = async () => {
      try {
        const response = await fetch("/api/history");
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to load search history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  // Find a clickable preview URL for a source returned by GPT
  const getDocPreviewData = (title: string) => {
    const lower = title.toLowerCase();
    const matched = documents.find(
      (d) =>
        d.name.toLowerCase() === lower ||
        d.blobName.toLowerCase() === lower ||
        d.name.toLowerCase().includes(lower) ||
        lower.includes(d.name.toLowerCase())
    );
    return matched
      ? { id: matched.id, name: matched.name, url: matched.url }
      : { id: title, name: title };
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10 pt-12 px-8 pb-24 h-full">
      <div>
        <h1 className="text-2xl font-medium text-black mb-2">Search Logs</h1>
        <p className="text-gray-500 text-sm">History of your AI queries.</p>
      </div>

      {/* Recent Documents */}
      {!isLoading && documents.length > 0 && (
        <div className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
            Recent Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {documents.slice(0, 3).map((doc) => {
              const diffMs = Date.now() - new Date(doc.uploadDate || Date.now()).getTime();
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const dateStr = diffDays === 0 ? "Today" : `${diffDays}d ago`;
              
              return (
                <button
                  key={doc.id}
                  onClick={() =>
                    onPreviewDoc({ id: doc.id, name: doc.name, url: doc.url })
                  }
                  className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all text-left group min-w-0"
                >
                  <div className="mt-0.5 p-2 bg-gray-100/80 rounded-lg group-hover:bg-white transition-colors shrink-0">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{dateStr}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 mt-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
          Search History
        </h3>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-200 rounded-2xl text-gray-400 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-sm">Loading search history…</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-200 rounded-2xl text-gray-400 gap-3">
            <History className="w-5 h-5" />
            <p className="text-sm">No search history yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-100 before:to-transparent">
            {history.map((log) => {
              const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(log.query);
              const answerIsRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(log.answer);
              const isExpanded = expandedId === log.id;
              
              return (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors ${isExpanded ? "bg-black text-white" : "bg-gray-50 text-gray-400"}`}>
                    <div className={`w-2 h-2 rounded-full ${isExpanded ? "bg-emerald-400" : "bg-black"}`}></div>
                  </div>
                  
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border transition-all cursor-pointer ${
                      isExpanded 
                        ? "bg-white border-black shadow-md ring-1 ring-black/5" 
                        : "bg-white border-gray-100 shadow-sm shadow-gray-100/50 hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Query</span>
                      <time className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                        {new Date(log.date).toLocaleString()}
                      </time>
                    </div>
                    <div 
                      className="flex items-start gap-2 text-sm text-gray-900 font-medium mb-4"
                      dir={isRtl ? "rtl" : "ltr"}
                    >
                      <Search className={`shrink-0 w-4 h-4 mt-0.5 transition-colors ${isExpanded ? "text-black" : "text-gray-400"}`} />
                      <span>{log.query}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-50">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">AI Response</span>
                      <p 
                        className={`text-sm text-gray-500 leading-relaxed ${isExpanded ? "" : "line-clamp-4"}`}
                        dir={answerIsRtl ? "rtl" : "ltr"}
                      >
                        {log.answer}
                      </p>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-100 space-y-6 animate-[fadeIn_0.3s_ease-out_forwards] opacity-0">
                        {log.summary && (
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Summary</span>
                            <p 
                              className="text-sm text-gray-600 leading-relaxed" 
                              dir={/[\u0600-\u06FF]/.test(log.summary) ? "rtl" : "ltr"}
                            >
                              {log.summary}
                            </p>
                          </div>
                        )}
                        
                        {log.sources && log.sources.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">Sources</span>
                            <div className="space-y-2">
                              {log.sources.map((src, idx) => {
                                const docTitle = src.title || "Unknown Document";
                                const isBest = idx === 0;
                                const previewData = getDocPreviewData(docTitle);
                                return (
                                  <button 
                                    key={idx} 
                                    onClick={(e) => {
                                      e.stopPropagation(); // prevent collapsing the card
                                      onPreviewDoc(previewData);
                                    }}
                                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm ${isBest ? "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50" : "bg-gray-50 border-transparent hover:bg-white hover:border-gray-200"}`}
                                  >
                                    <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isBest ? "text-emerald-500" : "text-gray-400"}`} />
                                    <div className="flex-1 min-w-0">
                                      <p 
                                        className="text-sm font-medium text-gray-900 truncate" 
                                        dir={/[\u0600-\u06FF]/.test(docTitle) ? "rtl" : "ltr"}
                                      >
                                        {docTitle}
                                      </p>
                                      {src.note && (
                                        <p 
                                          className="text-xs text-gray-500 mt-1 leading-relaxed" 
                                          dir={/[\u0600-\u06FF]/.test(src.note) ? "rtl" : "ltr"}
                                        >
                                          {src.note}
                                        </p>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
