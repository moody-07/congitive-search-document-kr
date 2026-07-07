"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, ArrowRight, FileText, BookOpen, X } from "lucide-react";

type Document = {
  id: string;
  name: string;
  blobName: string;
  uploadDate: string;
  size: number;
  url?: string;
};

type SearchResult = {
  answer: string;
  summary: string;
  sources: { title: string; note: string; documentNumber?: string | null }[];
  processingTimeSec?: string;
  cached?: boolean;
};

type HistoryItem = {
  id: string;
  date: string;
  query: string;
  answer: string;
  summary: string;
  sources: { title: string; note: string; documentNumber?: string | null }[];
};

/** Detect if a string contains Kurdish/Arabic/RTL characters */
function isRtl(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Render a string that may contain **bold** markers and newlines.
 * Splits on \n first, then on **bold** within each line.
 */
function renderMarkdown(text: string) {
  return text.split("\n").map((line, lineIdx, lines) => {
    // Split each line on **...** markers
    const parts = line.split(/(\*\*[^*]+\*\*)/);
    const rendered = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return (
      <span key={lineIdx}>
        {rendered}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function SearchTab({
  onSearchComplete,
  onPreviewDoc,
}: {
  onSearchComplete: (q: string, r: string) => void;
  onPreviewDoc: (doc: { id: string; name: string; url?: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState("");

  // Derived: is the current query RTL?
  const queryIsRtl = isRtl(query);

  // Real documents list fetched from API to map preview URLs
  const [documents, setDocuments] = useState<Document[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<
    { id: string; name: string; url?: string; date: string }[]
  >([]);

  // Search history state
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch("/api/documents");
        if (response.ok) {
          const data = await response.json();
          const list: Document[] = data.documents || [];
          setDocuments(list);

          // Build recent documents (top 3)
          const recent = list.slice(0, 3).map((doc) => {
            const diffMs   = Date.now() - new Date(doc.uploadDate).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);

            let dateStr = new Date(doc.uploadDate).toLocaleDateString();
            if (diffMins < 60) {
              dateStr = `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
            } else if (diffHours < 24) {
              dateStr = `${diffHours} hr${diffHours !== 1 ? "s" : ""} ago`;
            }

            return { id: doc.id, name: doc.name, url: doc.url, date: dateStr };
          });
          setRecentDocuments(recent);
        }
      } catch (err) {
        console.error("Failed to load documents for search dashboard:", err);
      }
    };
    loadDocuments();

    const loadHistory = async () => {
      try {
        const response = await fetch("/api/history");
        if (response.ok) {
          const data = await response.json();
          setSearchHistory(data.history || []);
        }
      } catch (err) {
        console.error("Failed to load search history:", err);
      }
    };
    loadHistory();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError("");
    setResult(null);
    setLoadingStep("Reading documents…");

    // Animate loading steps so the user knows what's happening
    const stepTimer = setTimeout(() => setLoadingStep("Analysing…"), 3000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      clearTimeout(stepTimer);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get a response.");
      }

      const data = await response.json();
      setResult(data);
      onSearchComplete(query, data.answer);
    } catch (err: unknown) {
      clearTimeout(stepTimer);
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

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

  const answerIsRtl = result ? isRtl(result.answer) : false;

  return (
    <div className="h-full flex flex-col items-center pt-24 px-8">
      <div
        className={`w-full max-w-3xl transition-all duration-500 ease-out ${
          result ? "mt-0" : "mt-8 md:mt-24"
        }`}
      >
        {/* Header — only shown when no result */}
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
            {/* Search icon — left for LTR, right for RTL */}
            <Search
              className={`absolute w-4 h-4 transition-colors ${
                queryIsRtl ? "right-5" : "left-5"
              } ${
                isLoading
                  ? "text-gray-300"
                  : "text-gray-400 group-focus-within:text-black"
              }`}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything…"
              dir={queryIsRtl ? "rtl" : "ltr"}
              className={`w-full py-4 text-sm bg-white border border-gray-200 rounded-full focus:outline-none focus:border-gray-400 focus:ring-0 transition-all placeholder:text-gray-400 shadow-sm shadow-gray-100/50 ${
                queryIsRtl ? "pr-12 pl-24" : "pl-12 pr-24"
              }`}
              disabled={isLoading}
            />
            {/* Clear button */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResult(null);
                  setError("");
                }}
                className={`absolute ${
                  queryIsRtl ? "left-14" : "right-14"
                } w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {/* Submit button — right for LTR, left for RTL */}
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className={`absolute ${
                queryIsRtl ? "left-2" : "right-2"
              } bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className={`w-4 h-4 ${ queryIsRtl ? "rotate-180" : "" }`} />
              )}
            </button>
          </div>
        </form>

        {/* Loading state */}
        {isLoading && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center animate-pulse">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BookOpen className="w-4 h-4" />
              <span>{loadingStep}</span>
            </div>
            <p className="text-xs text-gray-400">
              Reading all your documents to find the answer…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 text-sm text-red-500 text-center">{error}</div>
        )}

        {/* Recent Documents */}
        {!result && !isLoading && !error && recentDocuments.length > 0 && (
          <div className="mt-16 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
              Recent Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentDocuments.map((doc) => (
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
                    <p className="text-xs text-gray-400 mt-1">{doc.date}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search History */}
        {!result && !isLoading && !error && searchHistory.length > 0 && (
          <div className="mt-10 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
              Recent Searches
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {searchHistory.map((item) => {
                const diffMs   = Date.now() - new Date(item.date).getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                let dateStr = new Date(item.date).toLocaleDateString();
                if (diffMins < 60) {
                  dateStr = `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
                } else if (diffHours < 24) {
                  dateStr = `${diffHours} hr${diffHours !== 1 ? "s" : ""} ago`;
                } else if (diffDays < 7) {
                  dateStr = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setQuery(item.query);
                      setResult({
                        answer: item.answer,
                        summary: item.summary,
                        sources: item.sources,
                      });
                    }}
                    className="flex flex-col gap-2 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all text-left group min-w-0"
                  >
                    <div className="flex items-start justify-between w-full min-w-0">
                      <div 
                        className="flex items-center gap-2 text-sm font-medium text-gray-900 min-w-0 flex-1"
                        dir={isRtl(item.query) ? "rtl" : "ltr"}
                      >
                        <Search className="shrink-0 w-3 h-3 text-gray-400" />
                        <span className="truncate">{item.query}</span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4 shrink-0 mt-0.5">{dateStr}</span>
                    </div>
                    <p 
                      className={`text-xs text-gray-500 truncate w-full ${isRtl(item.answer) ? "pr-5" : "pl-5"}`}
                      dir={isRtl(item.answer) ? "rtl" : "ltr"}
                    >
                      {item.answer}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] flex flex-col gap-8 pb-24">
            {/* Answer */}
            <div className="pl-6 border-l-2 border-black">
              <p
                className="text-gray-900 text-lg leading-relaxed font-medium"
                dir={answerIsRtl ? "rtl" : "ltr"}
                style={{ textAlign: answerIsRtl ? "right" : "left" }}
              >
                {renderMarkdown(result.answer)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
              {/* Summary */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Summary
                </h3>
                <p
                  className="text-sm text-gray-600 leading-relaxed"
                  dir={isRtl(result.summary) ? "rtl" : "ltr"}
                >
                  {renderMarkdown(result.summary)}
                </p>
                {result.processingTimeSec && (
                  <p className="text-xs text-gray-400 mt-4 font-medium">
                    Analysis time: {result.processingTimeSec}s
                  </p>
                )}
              </div>

              {/* Sources */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Source Documents
                  {result.sources.length > 0 && (
                    <span className="ml-2 normal-case font-normal text-gray-400">
                      ({result.sources.length} found)
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {result.sources.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No specific source identified.
                    </p>
                  ) : (
                    result.sources.map((src, idx) => {
                      const docTitle = src.title || "Unknown Document";
                      const previewData = getDocPreviewData(docTitle);
                      const isBest = idx === 0;
                      return (
                        <button
                          key={idx}
                          onClick={() => onPreviewDoc(previewData)}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group min-w-0 text-left ${
                            isBest
                              ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-50 border-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          <FileText
                            className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${
                              isBest
                                ? "text-emerald-500"
                                : "text-gray-400 group-hover:text-black"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className="text-sm font-medium text-gray-900 truncate"
                                dir={isRtl(docTitle) ? "rtl" : "ltr"}
                              >
                                {docTitle}
                              </p>
                              {isBest && (
                                <span className="shrink-0 text-xs px-2 py-0.5 bg-emerald-500 text-white rounded-full font-semibold">
                                  Most Relevant
                                </span>
                              )}
                            </div>
                            {src.documentNumber && (
                              <p className="text-xs font-mono text-blue-600 mt-1 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
                                Doc No: {src.documentNumber}
                              </p>
                            )}
                            {src.note && (
                              <p
                                className="text-xs text-gray-500 mt-1 leading-relaxed"
                                dir={isRtl(src.note) ? "rtl" : "ltr"}
                              >
                                {src.note}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
