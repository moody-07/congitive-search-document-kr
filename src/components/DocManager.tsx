"use client";

import { useState } from "react";
import { UploadCloud, FileText, Trash2, Loader2 } from "lucide-react";

type Document = {
  id: string;
  name: string;
  uploadDate: string;
  size: number;
  url?: string;
};

export default function DocManager({ onPreviewDoc }: { onPreviewDoc: (doc: { id: string; name: string; url?: string }) => void }) {
  const [documents, setDocuments] = useState<Document[]>([
    { id: "1", name: "Invoice_Zagros_500.pdf", uploadDate: "2026-05-20T10:00:00Z", size: 1024 * 450 },
    { id: "2", name: "Q1_Financial_Report.docx", uploadDate: "2026-05-22T14:30:00Z", size: 1024 * 1200 },
    { id: "3", name: "Vendor_Agreement_2026.pdf", uploadDate: "2026-05-18T09:15:00Z", size: 1024 * 2500 },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const newDoc: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        uploadDate: new Date().toISOString(),
        size: file.size,
        url: URL.createObjectURL(file), // Generate local URL for preview
      };

      setDocuments((prev) => [newDoc, ...prev]);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10 pt-12 px-8 pb-24">
      <div>
        <h1 className="text-2xl font-medium text-black mb-2">Documents</h1>
        <p className="text-gray-500 text-sm">Upload and manage files for the AI.</p>
      </div>

      {/* Upload Zone */}
      <div
        className={`border border-dashed rounded-2xl p-10 text-center transition-all duration-200 flex flex-col items-center justify-center ${isDragging
          ? "border-black bg-gray-50"
          : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mb-4 text-gray-400">
          {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-black" /> : <UploadCloud className="w-6 h-6" />}
        </div>
        <h3 className="text-sm font-medium text-black mb-1">
          {isUploading ? "Uploading..." : "Click or drag to upload"}
        </h3>
        <p className="text-xs text-gray-400 mb-6">
          PDF, DOCX, TXT up to 50MB
        </p>

        <label className="relative inline-flex items-center justify-center px-5 py-2 text-xs font-medium text-black transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50">
          <span>Browse Files</span>
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            onChange={handleFileSelect}
            accept=".pdf,.docx,.txt"
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Document List (Minimal) */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Uploaded Files</h3>
        <div className="flex flex-col gap-2">
          {documents.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm border border-gray-100 rounded-2xl">
              No documents yet.
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-100 transition-all group">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="p-2 bg-gray-100/80 rounded-lg text-gray-500 group-hover:bg-white transition-colors shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <button onClick={() => onPreviewDoc({ id: doc.id, name: doc.name, url: doc.url })} className="text-left group/btn min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover/btn:underline truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span className="shrink-0">{formatSize(doc.size)}</span>
                      <span className="shrink-0">•</span>
                      <span className="shrink-0">{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 shrink-0 ml-4"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
