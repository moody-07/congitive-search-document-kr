"use client";

import { SearchLog } from "@/types";
import { History } from "lucide-react";

export default function LogsTab({ logs }: { logs: SearchLog[] }) {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10 pt-12 px-8 pb-24 h-full">
      <div>
        <h1 className="text-2xl font-medium text-black mb-2">Search Logs</h1>
        <p className="text-gray-500 text-sm">History of your AI queries.</p>
      </div>

      <div className="flex-1">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-200 rounded-2xl text-gray-400 gap-3">
            <History className="w-5 h-5" />
            <p className="text-sm">No search history yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-100 before:to-transparent">
            {logs.map((log) => (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-50 text-gray-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <div className="w-2 h-2 rounded-full bg-black"></div>
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/50 hover:border-gray-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-black">Query</span>
                    <time className="text-[10px] font-medium text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <p className="text-sm text-gray-900 font-medium mb-4">{log.query}</p>
                  
                  <div className="pt-3 border-t border-gray-50">
                    <span className="text-xs font-medium text-gray-400 block mb-1">AI Response</span>
                    <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                      {log.response}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
