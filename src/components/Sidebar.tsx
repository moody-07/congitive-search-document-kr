"use client";

import { Search, FileText, History, Bot } from "lucide-react";

type SidebarProps = {
  activeTab: "search" | "documents" | "logs";
  setActiveTab: (tab: "search" | "documents" | "logs") => void;
};

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: "search", label: "AI Search", icon: Search },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "logs", label: "Search Logs", icon: History },
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
    </div>
  );
}
