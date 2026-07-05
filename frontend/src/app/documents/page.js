"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getWorkspaces } from "@/api/workspaceApi";
import {
  deleteDocument,
  getDocuments,
  uploadDocument,
  reprocessDocument,
  reprocessAllDocuments,
} from "@/api/documentApi";
import {
  AlertTriangle,
  FileText,
  Filter,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";

const documentTypes = [
  "All",
  "Resume",
  "Job Description",
  "HR Policy",
  "Attendance",
  "Employee Query",
  "Dispute",
  "Onboarding",
  "General",
];

function isTableDocument(document) {
  const fileType = String(document.file_type || "").toLowerCase();
  return ["csv", "xlsx", "xls"].includes(fileType);
}

function isBadDocument(document) {
  const preview = String(document.text_preview || "");
  const charCount = Number(document.char_count || 0);

  if (isTableDocument(document)) {
    return (
      preview.includes("Table extraction failed") ||
      preview.includes("No readable text extracted") ||
      preview.trim().length === 0
    );
  }

  return (
    charCount === 0 ||
    !preview ||
    preview.includes("No readable text extracted")
  );
}


function fileKey(name, documentType, workspaceId) {
  return [
    String(name || "").trim().toLowerCase(),
    String(documentType || "").trim().toLowerCase(),
    String(workspaceId || "").trim(),
  ].join("::");
}

function getDocumentKey(document) {
  return fileKey(
    document.original_filename,
    document.document_type,
    document.workspace_id || ""
  );
}

function getSelectedFileKey(file, documentType, workspaceId) {
  return fileKey(file?.name, documentType, workspaceId || "");
}

function badgeStyle(documentType) {
  if (documentType === "Resume") return "bg-blue-50 text-blue-700";
  if (documentType === "Job Description") return "bg-purple-50 text-purple-700";
  if (documentType === "HR Policy") return "bg-emerald-50 text-emerald-700";
  if (documentType === "Attendance") return "bg-orange-50 text-orange-700";
  if (documentType === "Dispute") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

export default function DocumentsPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [documentType, setDocumentType] = useState("Resume");
  const [typeFilter, setTypeFilter] = useState("All");
  const [qualityFilter, setQualityFilter] = useState("All");
  const [sortMode, setSortMode] = useState("Newest");

  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filteredDocuments = useMemo(() => {
    let list = [...documents];

    if (typeFilter !== "All") {
      list = list.filter((doc) => doc.document_type === typeFilter);
    }

    if (qualityFilter === "Bad") {
      list = list.filter((doc) => isBadDocument(doc));
    }

    if (qualityFilter === "Readable") {
      list = list.filter((doc) => !isBadDocument(doc));
    }

    if (sortMode === "Oldest") {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortMode === "Type") {
      list.sort((a, b) => a.document_type.localeCompare(b.document_type));
    } else if (sortMode === "Chars") {
      list.sort((a, b) => Number(b.char_count || 0) - Number(a.char_count || 0));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [documents, typeFilter, qualityFilter, sortMode]);

  const stats = useMemo(() => {
    return {
      total: documents.length,
      readable: documents.filter((doc) => !isBadDocument(doc)).length,
      bad: documents.filter((doc) => isBadDocument(doc)).length,
      chars: documents.reduce((sum, doc) => sum + Number(doc.char_count || 0), 0),
    };
  }, [documents]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [workspaceData, documentData] = await Promise.all([
        getWorkspaces(),
        getDocuments(),
      ]);

      setWorkspaces(workspaceData);
      setDocuments(documentData);
    } catch (err) {
      setError("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments(selectedWorkspace = workspaceId) {
    try {
      const data = await getDocuments(selectedWorkspace);
      setDocuments(data);
    } catch (err) {
      setError("Failed to refresh documents.");
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    await loadDocuments(value);
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!files.length) {
      setError("Select at least one file first.");
      return;
    }

    const existingKeys = new Set(documents.map(getDocumentKey));
    const selectedKeys = new Set();

    const uploadableFiles = [];
    const skippedNames = [];

    for (const selectedFile of files) {
      const key = getSelectedFileKey(selectedFile, documentType, workspaceId);

      if (selectedKeys.has(key) || existingKeys.has(key)) {
        skippedNames.push(selectedFile.name);
        continue;
      }

      selectedKeys.add(key);
      uploadableFiles.push(selectedFile);
    }

    if (!uploadableFiles.length) {
      setError("All selected files are duplicates for this workspace and document type.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setNotice("");

      let uploaded = 0;
      let failed = 0;

      for (const selectedFile of uploadableFiles) {
        try {
          await uploadDocument({
            file: selectedFile,
            documentType,
            workspaceId,
          });

          uploaded += 1;
        } catch (uploadError) {
          failed += 1;
        }
      }

      setFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const skippedText = skippedNames.length
        ? ` Skipped duplicates: ${skippedNames.length}.`
        : "";

      const failedText = failed ? ` Failed: ${failed}.` : "";

      setNotice(`Uploaded: ${uploaded}.${skippedText}${failedText}`);
      await loadDocuments(workspaceId);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Upload failed. Check file type and backend connection."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId) {
    try {
      setError("");
      await deleteDocument(documentId);
      await loadDocuments(workspaceId);
    } catch (err) {
      setError("Could not delete document.");
    }
  }

  async function deleteAllBadDocuments() {
    const badDocs = documents.filter((doc) => isBadDocument(doc));

    for (const doc of badDocs) {
      await deleteDocument(doc.id);
    }

    await loadDocuments(workspaceId);
    setNotice(`Deleted ${badDocs.length} bad document(s).`);
  }

  async function handleReprocess(documentId) {
    try {
      setError("");
      setNotice("");

      await reprocessDocument(documentId);
      setNotice("Document reprocessed.");
      await loadDocuments(workspaceId);
    } catch (err) {
      setError("Could not reprocess document.");
    }
  }

  async function handleReprocessAll() {
    try {
      setError("");
      setNotice("");

      const result = await reprocessAllDocuments();
      setNotice(`${result.message} Updated: ${result.updated}. Failed: ${result.failed}.`);
      await loadDocuments(workspaceId);
    } catch (err) {
      setError("Could not reprocess documents.");
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Document Intelligence
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Documents
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Upload and classify HR documents. Filter by category and quickly
            delete useless files with no extracted text.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReprocessAll}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FileText size={17} />
            Reprocess All
          </button>

          {stats.bad > 0 && (
            <button
              onClick={deleteAllBadDocuments}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <Trash2 size={17} />
              Delete {stats.bad} Bad Docs
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          {notice}
        </div>
      )}

      <section className="mb-5 grid grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Documents</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Readable</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{stats.readable}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Bad / Empty</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">{stats.bad}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Readable Chars</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.chars}</p>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-[420px_1fr] gap-5">
        <form
          onSubmit={handleUpload}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UploadCloud size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Upload Document
              </h2>
              <p className="text-sm text-slate-500">
                Tag correctly. This controls where the file is used.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Workspace
              </label>
              <select
                value={workspaceId}
                onChange={handleWorkspaceChange}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">No workspace / Global</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                {documentTypes
                  .filter((type) => type !== "All")
                  .map((type) => (
                    <option key={type}>{type}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.target.files || []);
                  const seen = new Set();
                  const unique = [];

                  selected.forEach((selectedFile) => {
                    const key = getSelectedFileKey(selectedFile, documentType, workspaceId);

                    if (!seen.has(key)) {
                      seen.add(key);
                      unique.push(selectedFile);
                    }
                  });

                  setFiles(unique);
                }}
                className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700"
              />

              {files.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-700">
                    Selected files: {files.length}
                  </p>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                    {files.map((selectedFile) => (
                      <li key={`${selectedFile.name}-${selectedFile.size}`}>
                        {selectedFile.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {uploading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud size={17} />
                  Upload
                </>
              )}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-950">
              Filters
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                {documentTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Quality
              </label>
              <select
                value={qualityFilter}
                onChange={(event) => setQualityFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option>All</option>
                <option>Readable</option>
                <option>Bad</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Sort
              </label>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option>Newest</option>
                <option>Oldest</option>
                <option>Type</option>
                <option>Chars</option>
              </select>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
            CSV/XLSX attendance files may show 0 extracted chars but can still be
            imported through Attendance. Delete only the files you do not need.
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Document Library
            </h2>
            <p className="text-sm text-slate-500">
              {filteredDocuments.length} document{filteredDocuments.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <button
            onClick={() => loadDocuments(workspaceId)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex h-80 items-center justify-center text-slate-500">
            <Loader2 size={22} className="mr-2 animate-spin" />
            Loading documents...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center text-center">
            <FileText size={36} className="mb-3 text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900">
              No documents found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Upload files or adjust filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocuments.map((document) => {
              const bad = isBadDocument(document);

              return (
                <article key={document.id} className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-950">
                          {document.original_filename}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle(
                            document.document_type
                          )}`}
                        >
                          {document.document_type}
                        </span>

                        {bad && (
                          <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                            <AlertTriangle size={13} />
                            Empty / Bad
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-500">
                        {document.file_type} • {document.char_count || 0} chars • Status: {document.status}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReprocess(document.id)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FileText size={16} />
                        Reprocess
                      </button>

                      <button
                        onClick={() => handleDelete(document.id)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          bad
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        <Trash2 size={16} />
                        {bad ? "Delete Bad Doc" : "Delete"}
                      </button>
                    </div>
                  </div>

                  <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {document.text_preview || "No preview available."}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}







