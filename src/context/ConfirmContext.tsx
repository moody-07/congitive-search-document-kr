"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

interface ConfirmContextType {
  askConfirmation: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const askConfirmation = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (options?.onConfirm) {
      options.onConfirm();
    }
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ askConfirmation }}>
      {children}

      {/* Confirmation Modal */}
      {isOpen && options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleCancel}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-[modalUp_0.2s_ease-out_forwards] z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-black leading-6">
                  {options.title || "Confirm Action"}
                </h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                  {options.message}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
              >
                {options.cancelText || "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-black hover:bg-gray-800 rounded-xl shadow-sm transition-all"
              >
                {options.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes modalUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
