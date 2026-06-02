"use client";

import { useState, useEffect, useCallback } from "react";
import { UploadCloud, FileText, Trash2, Loader2, CheckCircle2, AlertCircle, ScanLine } from "lucide-react";

type Document = {
  id: string;
  name: string;
  blobName: string;
  uploadDate: string;
  size: number;
  url?: string;
};

type UploadStatus = {
  id: string;
  fileName: string;
  stage: "uploading" | "ocr" | "indexing" | "done" | "error";
  error?: string;
  ocrPreview?: string;
};

const STAGE_LABELS: Record<UploadStatus["stage"], string> = {
  uploading: "Uploading…",
  ocr: "Running OCR…",
  indexing: "Indexing…",
  done: "Ready",
  error: "Failed",
};

export default function DocManager({
  onPreviewDoc,
}: {
  onPreviewDoc: (doc: { id: string; name: string; url?: string }) => void;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadStatus[]>([]);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents");
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      // Filter out .ocr.txt companion files from the displayed list
      const filtered = (data.documents || []).filter(
        (d: Document) => !d.blobName.endsWith(".ocr.txt")
      );
      setDocuments(filtered);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      await uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      await uploadFiles(Array.from(e.target.files));
      // Reset the input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const uploadFiles = async (files: File[]) => {
    // Add placeholder entries to the queue immediately
    const newItems: UploadStatus[] = files.map((f) => ({
      id: `${Date.now()}-${f.name}`,
      fileName: f.name,
      stage: "uploading",
    }));
    setUploadQueue((prev) => [...newItems, ...prev]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const queueId = newItems[i].id;

      const setStage = (stage: UploadStatus["stage"], extra?: Partial<UploadStatus>) =>
        setUploadQueue((prev) =>
          prev.map((item) => (item.id === queueId ? { ...item, stage, ...extra } : item))
        );

      try {
        setStage("ocr");

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Upload failed");
        }

        const data = await response.json();
        const fileResult = data.results?.[0];

        setStage("done", {
          ocrPreview: fileResult?.ocrText,
        });

        // Refresh document list after each file
        await fetchDocuments();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setStage("error", { error: message });
        console.error("Error uploading file:", error);
      }
    }
  };

  const handleDelete = async (blobName: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(
        `/api/documents?blobName=${encodeURIComponent(blobName)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");

      // Also try to delete the companion OCR blob
      const ocrBlobName = `${blobName}.ocr.txt`;
      await fetch(
        `/api/documents?blobName=${encodeURIComponent(ocrBlobName)}`,
        { method: "DELETE" }
      ).catch(() => {/* ignore if not found */});

      setDocuments((prev) => prev.filter((doc) => doc.blobName !== blobName));
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document.");
    }
  };

  const clearDoneUploads = () => {
    setUploadQueue((prev) => prev.filter((u) => u.stage !== "done" && u.stage !== "error"));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const activeUploads = uploadQueue.filter(
    (u) => u.stage !== "done" && u.stage !== "error"
  );
  const finishedUploads = uploadQueue.filter(
    (u) => u.stage === "done" || u.stage === "error"
  );

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10 pt-12 px-8 pb-24">
      <div>
        <h1 className="text-2xl font-medium text-black mb-2">Documents</h1>
        <p className="text-gray-500 text-sm">
          Upload files — they will be OCR&apos;d and indexed automatically.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className={`border border-dashed rounded-2xl p-10 text-center transition-all duration-200 flex flex-col items-center justify-center ${
          isDragging ? "border-black bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mb-4 text-gray-400">
          {activeUploads.length > 0 ? (
            <Loader2 className="w-6 h-6 animate-spin text-black" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>
        <h3 className="text-sm font-medium text-black mb-1">
          {activeUploads.length > 0 ? `Processing ${activeUploads.length} file(s)…` : "Click or drag to upload"}
        </h3>
        <p className="text-xs text-gray-400 mb-6">
          PDF, images, DOCX, TXT — multiple files supported
        </p>

        <label className="relative inline-flex items-center justify-center px-5 py-2 text-xs font-medium text-black transition-colors bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <span>Browse Files</span>
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileSelect}
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff"
            multiple
            disabled={activeUploads.length > 0}
          />
        </label>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Upload Progress
            </h3>
            {finishedUploads.length > 0 && (
              <button
                onClick={clearDoneUploads}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Clear finished
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50"
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {item.stage === "done" && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  {item.stage === "error" && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {(item.stage === "uploading" ||
                    item.stage === "ocr" ||
                    item.stage === "indexing") && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.fileName}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      item.stage === "error"
                        ? "text-red-500"
                        : item.stage === "done"
                        ? "text-emerald-600"
                        : "text-blue-500"
                    }`}
                  >
                    {item.stage === "error"
                      ? item.error || "Failed"
                      : STAGE_LABELS[item.stage]}
                  </p>

                  {/* OCR preview */}
                  {item.stage === "done" && item.ocrPreview && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      <ScanLine className="w-3 h-3 inline-block mr-1 opacity-60" />
                      {item.ocrPreview}
                    </p>
                  )}
                </div>

                {/* Stage pill */}
                <div className="shrink-0">
                  {item.stage === "ocr" && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                      OCR
                    </span>
                  )}
                  {item.stage === "indexing" && (
                    <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium">
                      Indexing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document List */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
          Uploaded Files
        </h3>
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-gray-400 text-sm border border-gray-100 rounded-2xl">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading files from Azure…
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm border border-gray-100 rounded-2xl">
              No documents yet.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-100 transition-all group"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="p-2 bg-gray-100/80 rounded-lg text-gray-500 group-hover:bg-white transition-colors shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => onPreviewDoc({ id: doc.id, name: doc.name, url: doc.url })}
                    className="text-left group/btn min-w-0"
                  >
                    <p className="text-sm font-medium text-gray-900 group-hover/btn:underline truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span className="shrink-0">{formatSize(doc.size)}</span>
                      <span className="shrink-0">•</span>
                      <span className="shrink-0">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </span>
                      <span className="shrink-0">•</span>
                      <span className="shrink-0 flex items-center gap-1 text-emerald-600">
                        <ScanLine className="w-3 h-3" /> OCR indexed
                      </span>
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(doc.blobName)}
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
