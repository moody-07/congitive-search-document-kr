import { useState, useEffect } from "react";
import { Search, FileText, History, Bot, RefreshCw, Coins } from "lucide-react";

type SidebarProps = {
  activeTab: "search" | "documents" | "logs" | "balance";
  setActiveTab: (tab: "search" | "documents" | "logs" | "balance") => void;
};

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = async (force = false) => {
    // Check localStorage cache first unless forced refresh
    if (!force) {
      const cached = localStorage.getItem("ocr_balance");
      const cachedTime = localStorage.getItem("ocr_balance_time");
      if (cached && cachedTime) {
        const ageInMs = Date.now() - parseInt(cachedTime, 10);
        const fiveMinutes = 5 * 60 * 1000;
        if (ageInMs < fiveMinutes) {
          setBalance(parseInt(cached, 10));
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/documents/ocr/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        localStorage.setItem("ocr_balance", String(data.balance));
        localStorage.setItem("ocr_balance_time", String(Date.now()));
      } else {
        console.error("Failed to load OCR balance status:", res.status);
      }
    } catch (err) {
      console.error("Failed to fetch OCR balance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance(false);
  }, []);

  const tabs = [
    { id: "search", label: "AI Search", icon: Search },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "logs", label: "Search Logs", icon: History },
    { id: "balance", label: "Page Balance", icon: Coins },
  ] as const;

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full">
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-lg">
          <Bot className="w-5 h-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-black">DocuMind</span>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                isActive 
                  ? "bg-gray-100/80 text-black" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-black"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* OCR Balance Widget */}
      <div className="p-6 border-t border-gray-100 flex flex-col gap-2 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">OCR Balance</span>
          <button 
            onClick={() => fetchBalance(true)} 
            disabled={isLoading} 
            className="text-gray-400 hover:text-black transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          {balance !== null ? (
            <>
              <span className="text-2xl font-bold text-black">{balance}</span>
              <span className="text-xs text-gray-400 font-medium">pages</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 font-medium">{isLoading ? "Loading..." : "Unavailable"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
