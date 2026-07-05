"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getWorkspaces } from "@/api/workspaceApi";
import { getCandidates } from "@/api/candidateApi";
import {
  createMissingDocumentCase,
  deleteMissingDocumentCase,
  getDefaultRequiredDocuments,
  getMissingDocumentCases,
  recalculateMissingDocumentCase,
  updateMissingDocumentCaseStatus,
} from "@/api/missingDocumentApi";
import {
  CheckCircle2,
  Clipboard,
  FileCheck2,
  FileWarning,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

const statuses = [
  "All",
  "Pending",
  "Partially Pending",
  "Complete",
  "Requested",
  "Escalated",
  "Closed",
];

const priorities = ["Low", "Medium", "High"];

function parseList(value) {
  if (!value) return [];

  try {
    const data = JSON.parse(value);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function statusStyle(status) {
  if (status === "Complete") return "bg-emerald-50 text-emerald-700";
  if (status === "Partially Pending") return "bg-orange-50 text-orange-700";
  if (status === "Pending") return "bg-red-50 text-red-700";
  if (status === "Requested") return "bg-blue-50 text-blue-700";
  if (status === "Escalated") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

function priorityStyle(priority) {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Medium") return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

export default function MissingDocsPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState("");

  const [defaultDocs, setDefaultDocs] = useState([]);
  const [requiredDocsText, setRequiredDocsText] = useState("");
  const [submittedDocsText, setSubmittedDocsText] = useState("");

  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  const [form, setForm] = useState({
    person_name: "",
    email: "",
    role: "",
    priority: "Medium",
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    return {
      total: cases.length,
      pending: cases.filter((item) => item.status === "Pending").length,
      partial: cases.filter((item) => item.status === "Partially Pending").length,
      complete: cases.filter((item) => item.status === "Complete").length,
    };
  }, [cases]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [workspaceData, candidateData, defaultData, caseData] = await Promise.all([
        getWorkspaces(),
        getCandidates(),
        getDefaultRequiredDocuments(),
        getMissingDocumentCases(),
      ]);

      setWorkspaces(workspaceData);
      setCandidates(candidateData);
      setDefaultDocs(defaultData.required_documents || []);
      setRequiredDocsText((defaultData.required_documents || []).join("\n"));
      setCases(caseData);

      if (caseData.length > 0) {
        setSelectedCase(caseData[0]);
      }
    } catch (err) {
      setError("Failed to load missing document tracker.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshCases(selectedWorkspace = workspaceId, selectedStatus = statusFilter) {
    try {
      setError("");

      const data = await getMissingDocumentCases({
        workspaceId: selectedWorkspace,
        status: selectedStatus === "All" ? "" : selectedStatus,
      });

      setCases(data);

      if (data.length > 0) {
        setSelectedCase(data[0]);
      } else {
        setSelectedCase(null);
      }
    } catch (err) {
      setError("Failed to refresh cases.");
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    setCandidateId("");

    try {
      const candidateData = await getCandidates(value);
      setCandidates(candidateData);
      await refreshCases(value, statusFilter);
    } catch (err) {
      setError("Failed to filter workspace data.");
    }
  }

  async function handleStatusFilterChange(event) {
    const value = event.target.value;
    setStatusFilter(value);
    await refreshCases(workspaceId, value);
  }

  function handleCandidateChange(event) {
    const value = event.target.value;
    setCandidateId(value);

    if (!value) return;

    const candidate = candidates.find((item) => String(item.id) === String(value));

    if (candidate) {
      setForm((prev) => ({
        ...prev,
        person_name: candidate.name || "",
        email: candidate.email || "",
        role: candidate.current_role || "",
      }));
    }
  }

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function linesToList(text) {
    return text
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!candidateId && !form.person_name.trim()) {
      setError("Select a candidate or enter person name.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setNotice("");

      const created = await createMissingDocumentCase({
        workspace_id: workspaceId ? Number(workspaceId) : null,
        candidate_id: candidateId ? Number(candidateId) : null,
        person_name: form.person_name,
        email: form.email,
        role: form.role,
        priority: form.priority,
        required_documents: linesToList(requiredDocsText),
        submitted_documents: linesToList(submittedDocsText),
      });

      setSelectedCase(created);
      setNotice("Missing document case created.");
      setSubmittedDocsText("");

      await refreshCases(workspaceId, statusFilter);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create missing document case.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRecalculate(caseId) {
    try {
      const updated = await recalculateMissingDocumentCase(caseId);
      setSelectedCase(updated);
      setNotice("Case recalculated.");
      await refreshCases(workspaceId, statusFilter);
    } catch (err) {
      setError("Could not recalculate case.");
    }
  }

  async function handleStatusUpdate(caseId, status) {
    try {
      const updated = await updateMissingDocumentCaseStatus(caseId, status);
      setSelectedCase(updated);
      await refreshCases(workspaceId, statusFilter);
    } catch (err) {
      setError("Could not update status.");
    }
  }

  async function handleDelete(caseId) {
    try {
      await deleteMissingDocumentCase(caseId);
      setSelectedCase(null);
      await refreshCases(workspaceId, statusFilter);
    } catch (err) {
      setError("Could not delete case.");
    }
  }

  async function copyDraft() {
    if (!selectedCase?.request_draft) return;

    await navigator.clipboard.writeText(selectedCase.request_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  const selectedRequired = parseList(selectedCase?.required_documents);
  const selectedSubmitted = parseList(selectedCase?.submitted_documents);
  const selectedMissing = parseList(selectedCase?.missing_documents);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Onboarding Control
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Missing Docs
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Track required onboarding and recruitment documents, identify pending
            items, and generate request drafts for candidates or employees.
          </p>
        </div>

        <button
          onClick={() => refreshCases(workspaceId, statusFilter)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCcw size={17} />
          Refresh
        </button>
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
          <p className="text-sm font-medium text-slate-500">Total Cases</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">{stats.pending}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Partial</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">{stats.partial}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Complete</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{stats.complete}</p>
        </div>
      </section>

      <section className="grid grid-cols-[420px_1fr] gap-5">
        <aside className="space-y-5">
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Plus size={20} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Create Checklist Case
                </h2>
                <p className="text-sm text-slate-500">
                  Select candidate or enter manually.
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
                  <option value="">All / No workspace</option>
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Candidate
                </label>
                <select
                  value={candidateId}
                  onChange={handleCandidateChange}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Manual person / no candidate</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} - {candidate.current_role || "Unknown role"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Person Name
                  </label>
                  <input
                    value={form.person_name}
                    onChange={(event) => updateForm("person_name", event.target.value)}
                    placeholder="Rahul Shah"
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(event) => updateForm("priority", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    {priorities.map((priority) => (
                      <option key={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="person@email.com"
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <input
                  value={form.role}
                  onChange={(event) => updateForm("role", event.target.value)}
                  placeholder="Frontend Developer"
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Required Documents
                </label>
                <textarea
                  value={requiredDocsText}
                  onChange={(event) => setRequiredDocsText(event.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
                <button
                  type="button"
                  onClick={() => setRequiredDocsText(defaultDocs.join("\n"))}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Reset to default checklist
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Submitted Documents
                </label>
                <textarea
                  value={submittedDocsText}
                  onChange={(event) => setSubmittedDocsText(event.target.value)}
                  rows={5}
                  placeholder={"Updated Resume\nGovernment ID Proof\nBank Details"}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileWarning size={17} />
                    Create Missing Docs Case
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </aside>

        <section className="grid grid-cols-[360px_1fr] gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                Checklist Queue
              </h2>
              <p className="text-sm text-slate-500">
                Candidate/employee document cases.
              </p>
            </div>

            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500">
                <Loader2 size={22} className="mr-2 animate-spin" />
                Loading...
              </div>
            ) : cases.length === 0 ? (
              <div className="flex h-80 flex-col items-center justify-center px-6 text-center">
                <FileCheck2 size={34} className="mb-3 text-slate-400" />
                <p className="text-sm font-semibold text-slate-800">
                  No cases yet
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Create a missing document case to begin.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cases.map((item) => {
                  const missing = parseList(item.missing_documents);

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedCase(item)}
                      className={`w-full p-4 text-left transition hover:bg-slate-50 ${
                        selectedCase?.id === item.id ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {item.person_name}
                        </p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyle(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500">
                        {item.role || "No role"}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(item.status)}`}>
                          {item.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Missing {missing.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Checklist Details
                </h2>
                <p className="text-sm text-slate-500">
                  Missing documents and request draft.
                </p>
              </div>

              {selectedCase && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRecalculate(selectedCase.id)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCcw size={15} />
                    Recalculate
                  </button>

                  <button
                    onClick={() => handleDelete(selectedCase.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {!selectedCase ? (
              <div className="flex h-[780px] flex-col items-center justify-center px-8 text-center">
                <FileCheck2 size={42} className="mb-3 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Select or create a case
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  HRFlow will calculate missing documents and generate a request
                  message.
                </p>
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <UserRound size={21} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">
                          {selectedCase.person_name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {selectedCase.role || "No role"} {selectedCase.email ? `• ${selectedCase.email}` : ""}
                        </p>
                      </div>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(selectedCase.status)}`}>
                      {selectedCase.status}
                    </span>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Update Status
                    </label>
                    <select
                      value={selectedCase.status}
                      onChange={(event) => handleStatusUpdate(selectedCase.id, event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      {statuses.filter((status) => status !== "All").map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-5">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <FileCheck2 size={18} className="text-blue-600" />
                      <h3 className="text-base font-semibold text-slate-950">
                        Required
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {selectedRequired.map((doc) => (
                        <p key={doc} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          {doc}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <h3 className="text-base font-semibold text-slate-950">
                        Submitted
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {selectedSubmitted.length > 0 ? (
                        selectedSubmitted.map((doc) => (
                          <p key={doc} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            {doc}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No submitted documents listed.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <XCircle size={18} className="text-red-600" />
                      <h3 className="text-base font-semibold text-slate-950">
                        Missing
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {selectedMissing.length > 0 ? (
                        selectedMissing.map((doc) => (
                          <p key={doc} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                            {doc}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-emerald-600">No missing documents.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileWarning size={18} className="text-blue-600" />
                      <h3 className="text-base font-semibold text-slate-950">
                        Request Draft
                      </h3>
                    </div>

                    {selectedCase.request_draft && (
                      <button
                        onClick={copyDraft}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Clipboard size={15} />
                        {copied ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>

                  <textarea
                    value={selectedCase.request_draft || ""}
                    onChange={(event) =>
                      setSelectedCase({
                        ...selectedCase,
                        request_draft: event.target.value,
                      })
                    }
                    rows={14}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
