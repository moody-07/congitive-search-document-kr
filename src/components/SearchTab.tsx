"use client";

import { useState } from "react";
import { Search, Loader2, ArrowRight, FileText } from "lucide-react";

type SearchResult = {
  answer: string;
  summary: string;
  sources: { title: string; score: number }[];
};

export default function SearchTab({ 
  onSearchComplete, 
  onPreviewDoc 
}: { 
  onSearchComplete: (q: string, r: string) => void;
  onPreviewDoc: (doc: { id: string; name: string; url?: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  const recentDocuments = [
    { id: "1", name: "Invoice_Zagros_500.pdf", date: "2 hrs ago" },
    { id: "2", name: "Q1_Financial_Report.docx", date: "Yesterday" },
    { id: "3", name: "Vendor_Agreement_2026.pdf", date: "May 18" },
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      setResult(data);
      onSearchComplete(query, data.answer);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center pt-24 px-8">
      <div className={`w-full max-w-3xl transition-all duration-500 ease-out ${result ? "mt-0" : "mt-24"}`}>
        
        {/* Minimal Header */}
        {!result && (
          <div className="text-center mb-10">
            <h1 className="text-3xl font-medium text-black tracking-tight mb-3">
              What are you looking for?
            </h1>
            <p className="text-gray-500 text-sm">
              Search across your documents instantly.
            </p>
          </div>
        )}

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative w-full group">
          <div className="relative flex items-center">
            <Search className={`absolute left-5 w-4 h-4 transition-colors ${isLoading ? "text-gray-300" : "text-gray-400 group-focus-within:text-black"}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="w-full pl-12 pr-16 py-4 text-sm bg-white border border-gray-200 rounded-full focus:outline-none focus:border-gray-400 focus:ring-0 transition-all placeholder:text-gray-400 shadow-sm shadow-gray-100/50"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 text-sm text-red-500 text-center">
            {error}
          </div>
        )}

        {/* Recent Documents */}
        {!result && !isLoading && !error && (
          <div className="mt-16 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Recent Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onPreviewDoc({ id: doc.id, name: doc.name })}
                  className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all text-left group min-w-0"
                >
                  <div className="mt-0.5 p-2 bg-gray-100/80 rounded-lg group-hover:bg-white transition-colors shrink-0">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{doc.date}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Minimal Results View */}
        {result && (
          <div className="mt-12 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] flex flex-col gap-10 pb-24">
            
            <div className="pl-6 border-l-2 border-black">
              <p className="text-gray-900 text-lg leading-relaxed font-medium">
                {result.answer}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Summary</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {result.summary}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Sources</h3>
                <div className="space-y-2">
                  {result.sources.length === 0 ? (
                    <p className="text-sm text-gray-500">No sources available.</p>
                  ) : (
                    result.sources.map((src, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => onPreviewDoc({ id: src.title, name: src.title })}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer group min-w-0"
                      >
                        <FileText className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors shrink-0" />
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{src.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{(src.score * 100).toFixed(0)}% Match</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
