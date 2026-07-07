"use client";

import { useState, useEffect } from "react";
import { X, FileText, Download, AlertCircle, Save, Loader2, RefreshCw } from "lucide-react";

import { useConfirm } from "@/context/ConfirmContext";

export type PreviewDoc = {
  id: string; // The blobName is used as ID in DocManager
  name: string;
  url?: string;
} | null;

export default function DocumentPreview({ 
  doc, 
  onClose 
}: { 
  doc: PreviewDoc; 
  onClose: () => void 
}) {
  const { askConfirmation } = useConfirm();
  const [activeTab, setActiveTab] = useState<"preview" | "ocr">("preview");
  const [ocrText, setOcrText] = useState("");
  const [isLoadingOcr, setIsLoadingOcr] = useState(false);
  const [isSavingOcr, setIsSavingOcr] = useState(false);
  const [isRedoingOcr, setIsRedoingOcr] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (doc && activeTab === "ocr") {
      loadOcrText();
    }
  }, [doc, activeTab]);

  const loadOcrText = async () => {
    if (!doc) return;
    setIsLoadingOcr(true);
    setSaveMessage({ text: "", type: "" });
    try {
      const res = await fetch(`/api/documents/ocr?blobName=${encodeURIComponent(doc.id)}`);
      if (res.ok) {
        const data = await res.json();
        setOcrText(data.text || "");
      } else {
        setOcrText("");
        setSaveMessage({ text: "Failed to load OCR text.", type: "error" });
      }
    } catch (err) {
      setOcrText("");
      setSaveMessage({ text: "Error loading OCR text.", type: "error" });
    } finally {
      setIsLoadingOcr(false);
    }
  };

  const saveOcrText = async () => {
    if (!doc) return;
    setIsSavingOcr(true);
    setSaveMessage({ text: "", type: "" });
    try {
      const res = await fetch(`/api/documents/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobName: doc.id, text: ocrText }),
      });
      if (res.ok) {
        setSaveMessage({ text: "Saved successfully!", type: "success" });
        setTimeout(() => setSaveMessage({ text: "", type: "" }), 3000);
      } else {
        setSaveMessage({ text: "Failed to save.", type: "error" });
      }
    } catch (err) {
      setSaveMessage({ text: "Error saving.", type: "error" });
    } finally {
      setIsSavingOcr(false);
    }
  };

  const redoOcr = async () => {
    if (!doc) return;
    askConfirmation({
      title: "Re-run OCR",
      message: "Are you sure you want to re-run OCR? This will overwrite the current text.",
      confirmText: "Re-run OCR",
      onConfirm: async () => {
        setIsRedoingOcr(true);
        setSaveMessage({ text: "", type: "" });
        try {
          const res = await fetch(`/api/documents/ocr/redo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blobName: doc.id }),
          });
          if (res.ok) {
            const data = await res.json();
            setOcrText(data.text);
            setSaveMessage({ text: "OCR redone successfully!", type: "success" });
            setTimeout(() => setSaveMessage({ text: "", type: "" }), 3000);
          } else {
            const err = await res.json();
            setSaveMessage({ text: err.error || "Failed to redo OCR.", type: "error" });
          }
        } catch (err) {
          setSaveMessage({ text: "Error redoing OCR.", type: "error" });
        } finally {
          setIsRedoingOcr(false);
        }
      }
    });
  };

  if (!doc) return null;

  const isPdf = doc.name.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name);
  const previewUrl = doc.url || (isPdf ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" : "");

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/10 z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-[slideIn_0.3s_ease-out]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-900 truncate pr-4">{doc.name}</h2>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`text-xs font-medium pb-1 border-b-2 transition-colors ${
                    activeTab === "preview" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Document
                </button>
                <button
                  onClick={() => setActiveTab("ocr")}
                  className={`text-xs font-medium pb-1 border-b-2 transition-colors ${
                    activeTab === "ocr" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  OCR Text
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {previewUrl && (
                <a 
                  href={previewUrl} 
                  download={doc.name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors rounded-lg"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col">
          {activeTab === "preview" ? (
            previewUrl && isPdf ? (
              <iframe 
                src={previewUrl} 
                className="w-full h-full border-none"
                title={doc.name}
              />
            ) : previewUrl && isImage ? (
              <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                <img 
                  src={previewUrl} 
                  alt={doc.name} 
                  className="max-w-full max-h-full object-contain shadow-md rounded"
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No preview available</h3>
                <p className="text-sm">
                  This file type cannot be previewed directly in the browser, or the file URL is missing.
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col h-full bg-white">
              {isLoadingOcr ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p className="text-sm">Loading OCR text...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 shrink-0">
                    <p className="text-xs text-gray-500">Edit the text below to correct any OCR mistakes. This updates what the AI reads.</p>
                    <div className="flex items-center gap-3">
                      {saveMessage.text && (
                        <span className={`text-xs ${saveMessage.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                          {saveMessage.text}
                        </span>
                      )}
                      <button
                        onClick={redoOcr}
                        disabled={isSavingOcr || isRedoingOcr}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                      >
                        {isRedoingOcr ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Redo OCR
                      </button>
                      <button
                        onClick={saveOcrText}
                        disabled={isSavingOcr || isRedoingOcr}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                      >
                        {isSavingOcr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    dir="auto"
                    className="flex-1 w-full p-6 text-sm text-gray-800 focus:outline-none resize-none"
                    placeholder="OCR text is empty..."
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
