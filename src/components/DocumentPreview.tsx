"use client";

import { X, FileText, Download, AlertCircle } from "lucide-react";

export type PreviewDoc = {
  id: string;
  name: string;
  url?: string; // Can be a local blob URL or a remote URL
} | null;

export default function DocumentPreview({ 
  doc, 
  onClose 
}: { 
  doc: PreviewDoc; 
  onClose: () => void 
}) {
  if (!doc) return null;

  // Determine if we can show a real preview
  // For PDFs, we can use an iframe. For images, an img tag.
  const isPdf = doc.name.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name);
  
  // If it's a mock document without a real URL, provide a dummy PDF for demonstration
  const previewUrl = doc.url || (isPdf ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" : "");

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/10 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-[slideIn_0.3s_ease-out]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-900 truncate pr-4">{doc.name}</h2>
              <p className="text-xs text-gray-500">Live Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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

        {/* Real Document Preview Area */}
        <div className="flex-1 bg-gray-100 relative">
          {previewUrl && isPdf ? (
            <iframe 
              src={previewUrl} 
              className="w-full h-full border-none"
              title={doc.name}
            />
          ) : previewUrl && isImage ? (
            <div className="w-full h-full flex items-center justify-center p-8">
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
