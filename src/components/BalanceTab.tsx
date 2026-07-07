"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Coins, HelpCircle } from "lucide-react";

export default function BalanceTab() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchBalance = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem("ocr_balance");
      const cachedTime = localStorage.getItem("ocr_balance_time");
      if (cached && cachedTime) {
        const ageInMs = Date.now() - parseInt(cachedTime, 10);
        const fiveMinutes = 5 * 60 * 1000;
        if (ageInMs < fiveMinutes) {
          setBalance(parseInt(cached, 10));
          setLastUpdated(new Date(parseInt(cachedTime, 10)).toLocaleTimeString());
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
        const now = Date.now();
        localStorage.setItem("ocr_balance", String(data.balance));
        localStorage.setItem("ocr_balance_time", String(now));
        setLastUpdated(new Date(now).toLocaleTimeString());
      } else {
        console.error("Failed to load OCR balance:", res.status);
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

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pt-12 px-8 pb-24 h-full">
      <div>
        <h1 className="text-2xl font-medium text-black mb-2">Page Balance</h1>
        <p className="text-gray-500 text-sm">Monitor your OCR API page usage and token details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
        {/* Balance Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-black text-white rounded-2xl">
              <Coins className="w-6 h-6" />
            </div>
            <button
              onClick={() => fetchBalance(true)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 hover:bg-gray-50 text-xs font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Available Pages</span>
            <div className="flex items-baseline gap-2">
              {balance !== null ? (
                <>
                  <span className="text-5xl font-bold text-black tracking-tight">{balance}</span>
                  <span className="text-gray-500 font-medium">pages</span>
                </>
              ) : (
                <span className="text-xl text-gray-400 font-medium">{isLoading ? "Loading..." : "Unavailable"}</span>
              )}
            </div>
            {lastUpdated && (
              <p className="text-[10px] text-gray-400 mt-2">Last updated at {lastUpdated}</p>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-8 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-black mb-1">About OCR Balance</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Each page from the documents you upload consumes 1 page balance from your STT/OCR account. 
                If your balance reaches 0, you will need to renew your token package to process new files.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
            Current token is configured securely in the environment.
          </div>
        </div>
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
