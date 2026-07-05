"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getWorkspaces } from "@/api/workspaceApi";
import {
  createDispute,
  deleteDispute,
  getDisputes,
  resolveDispute,
  updateDisputeStatus,
} from "@/api/disputeApi";
import {
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  Clipboard,
  FileText,
  Gavel,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";

const disputeTypes = [
  "Salary Deduction",
  "Attendance",
  "Leave",
  "Reimbursement",
  "Misconduct",
  "Warning",
  "Probation",
  "Policy",
  "General",
];

const priorities = ["Low", "Medium", "High"];
const statuses = [
  "All",
  "Open",
  "Under Review",
  "Needs Evidence",
  "Waiting for Employee",
  "Escalated",
  "Closed",
];

function statusStyle(status) {
  if (status === "Closed") return "bg-emerald-50 text-emerald-700";
  if (status === "Under Review") return "bg-blue-50 text-blue-700";
  if (status === "Needs Evidence") return "bg-orange-50 text-orange-700";
  if (status === "Escalated") return "bg-red-50 text-red-700";
  if (status === "Waiting for Employee") return "bg-yellow-50 text-yellow-700";
  return "bg-slate-100 text-slate-700";
}

function priorityStyle(priority) {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Medium") return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

function riskStyle(risk) {
  if (risk === "High") return "bg-red-50 text-red-700";
  if (risk === "Medium") return "bg-orange-50 text-orange-700";
  if (risk === "Low") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

export default function DisputesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [sources, setSources] = useState([]);

  const [form, setForm] = useState({
    employee_name: "",
    department: "",
    dispute_type: "Salary Deduction",
    priority: "High",
    claim: "My salary was deducted even though I informed my manager about the attendance issue.",
    hr_notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    return {
      total: disputes.length,
      open: disputes.filter((item) => item.status === "Open").length,
      review: disputes.filter((item) => item.status === "Under Review").length,
      escalated: disputes.filter((item) => item.status === "Escalated").length,
    };
  }, [disputes]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [workspaceData, disputeData] = await Promise.all([
        getWorkspaces(),
        getDisputes(),
      ]);

      setWorkspaces(workspaceData);
      setDisputes(disputeData);

      if (disputeData.length > 0) {
        setSelectedDispute(disputeData[0]);
      }
    } catch (err) {
      setError("Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshDisputes(selectedWorkspace = workspaceId, selectedStatus = statusFilter) {
    try {
      setError("");

      const data = await getDisputes({
        workspaceId: selectedWorkspace,
        status: selectedStatus === "All" ? "" : selectedStatus,
      });

      setDisputes(data);

      if (data.length > 0) {
        setSelectedDispute(data[0]);
      } else {
        setSelectedDispute(null);
      }
    } catch (err) {
      setError("Failed to refresh disputes.");
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    await refreshDisputes(value, statusFilter);
  }

  async function handleStatusFilterChange(event) {
    const value = event.target.value;
    setStatusFilter(value);
    await refreshDisputes(workspaceId, value);
  }

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!form.employee_name.trim()) {
      setError("Employee name is required.");
      return;
    }

    if (!form.claim.trim()) {
      setError("Dispute claim is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setNotice("");

      const created = await createDispute({
        workspace_id: workspaceId ? Number(workspaceId) : null,
        ...form,
      });

      setNotice("Dispute case created.");
      setSelectedDispute(created);
      setSources([]);

      setForm({
        employee_name: "",
        department: "",
        dispute_type: "Salary Deduction",
        priority: "High",
        claim: "My salary was deducted even though I informed my manager about the attendance issue.",
        hr_notes: "",
      });

      await refreshDisputes(workspaceId, statusFilter);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create dispute.");
    } finally {
      setCreating(false);
    }
  }

  async function handleResolve(disputeId) {
    try {
      setResolvingId(disputeId);
      setError("");
      setNotice("");
      setSources([]);

      const result = await resolveDispute(disputeId);

      setSelectedDispute(result.dispute);
      setSources(result.sources || []);
      setNotice("Dispute reviewed using uploaded evidence and policy documents.");

      await refreshDisputes(workspaceId, statusFilter);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not resolve dispute.");
    } finally {
      setResolvingId(null);
    }
  }

  async function handleStatusUpdate(disputeId, status) {
    try {
      const updated = await updateDisputeStatus(disputeId, status);
      setSelectedDispute(updated);
      await refreshDisputes(workspaceId, statusFilter);
    } catch (err) {
      setError("Could not update dispute status.");
    }
  }

  async function handleDelete(disputeId) {
    try {
      await deleteDispute(disputeId);
      setSelectedDispute(null);
      setSources([]);
      await refreshDisputes(workspaceId, statusFilter);
    } catch (err) {
      setError("Could not delete dispute.");
    }
  }

  async function copyDraft() {
    if (!selectedDispute?.response_draft) return;

    await navigator.clipboard.writeText(selectedDispute.response_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            HR Risk & Case Review
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Disputes
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Create employee disputes, retrieve uploaded evidence, assess HR risk,
            recommend action, and generate editable response drafts.
          </p>
        </div>

        <button
          onClick={() => refreshDisputes(workspaceId, statusFilter)}
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
          <p className="text-sm font-medium text-slate-500">Open</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">{stats.open}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Under Review</p>
          <p className="mt-2 text-3xl font-semibold text-blue-600">{stats.review}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Escalated</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">{stats.escalated}</p>
        </div>
      </section>

      <section className="grid grid-cols-[420px_1fr] gap-5">
        <aside className="space-y-5">
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Plus size={20} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Create Dispute
                </h2>
                <p className="text-sm text-slate-500">
                  Add employee claim for HR review.
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Employee Name
                  </label>
                  <input
                    value={form.employee_name}
                    onChange={(event) => updateForm("employee_name", event.target.value)}
                    placeholder="Rahul Shah"
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Department
                  </label>
                  <input
                    value={form.department}
                    onChange={(event) => updateForm("department", event.target.value)}
                    placeholder="Operations"
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Dispute Type
                  </label>
                  <select
                    value={form.dispute_type}
                    onChange={(event) => updateForm("dispute_type", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    {disputeTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
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
                  Employee Claim
                </label>
                <textarea
                  value={form.claim}
                  onChange={(event) => updateForm("claim", event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  HR Notes / Evidence Context
                </label>
                <textarea
                  value={form.hr_notes}
                  onChange={(event) => updateForm("hr_notes", event.target.value)}
                  rows={4}
                  placeholder="Manager says employee had 4 late marks. Payroll deduction applied as per attendance policy."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Gavel size={17} />
                    Create Dispute
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
                Dispute Queue
              </h2>
              <p className="text-sm text-slate-500">
                Select a case to review.
              </p>
            </div>

            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500">
                <Loader2 size={22} className="mr-2 animate-spin" />
                Loading...
              </div>
            ) : disputes.length === 0 ? (
              <div className="flex h-80 flex-col items-center justify-center px-6 text-center">
                <Gavel size={34} className="mb-3 text-slate-400" />
                <p className="text-sm font-semibold text-slate-800">
                  No disputes yet
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Create a dispute case to begin.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {disputes.map((dispute) => (
                  <button
                    key={dispute.id}
                    onClick={() => {
                      setSelectedDispute(dispute);
                      setSources([]);
                    }}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 ${
                      selectedDispute?.id === dispute.id ? "bg-red-50/40" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {dispute.employee_name}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyle(dispute.priority)}`}>
                        {dispute.priority}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm leading-5 text-slate-500">
                      {dispute.claim}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(dispute.status)}`}>
                        {dispute.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {dispute.dispute_type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Dispute Resolution
                </h2>
                <p className="text-sm text-slate-500">
                  Evidence, risk level, recommended action, and draft response.
                </p>
              </div>

              {selectedDispute && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(selectedDispute.id)}
                    disabled={resolvingId === selectedDispute.id}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                  >
                    {resolvingId === selectedDispute.id ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Reviewing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Review Case
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(selectedDispute.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {!selectedDispute ? (
              <div className="flex h-[780px] flex-col items-center justify-center px-8 text-center">
                <ShieldAlert size={42} className="mb-3 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Select or create a dispute
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Once selected, HRFlow can search uploaded policy and evidence
                  documents, assess risk, and draft a response.
                </p>
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {selectedDispute.employee_name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedDispute.department || "No department"} • {selectedDispute.dispute_type}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedDispute.risk_level && (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskStyle(selectedDispute.risk_level)}`}>
                          Risk: {selectedDispute.risk_level}
                        </span>
                      )}
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(selectedDispute.status)}`}>
                        {selectedDispute.status}
                      </span>
                    </div>
                  </div>

                  <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedDispute.claim}
                  </p>

                  {selectedDispute.hr_notes && (
                    <div className="mt-4 rounded-xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-800">
                        HR Notes
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {selectedDispute.hr_notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Update Status
                    </label>
                    <select
                      value={selectedDispute.status}
                      onChange={(event) => handleStatusUpdate(selectedDispute.id, event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      {statuses.filter((status) => status !== "All").map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <AlertTriangle size={18} className="text-orange-600" />
                      <h3 className="text-base font-semibold text-slate-950">
                        Recommended Action
                      </h3>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {selectedDispute.recommended_action || "No recommendation yet. Click Review Case."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <BriefcaseBusiness size={18} className="text-blue-600" />
                      <h3 className="text-base font-semibold text-slate-950">
                        Risk Review
                      </h3>
                    </div>

                    <p className="text-sm leading-6 text-slate-700">
                      {selectedDispute.risk_level
                        ? `This case is currently classified as ${selectedDispute.risk_level} risk.`
                        : "Risk level will appear after review."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Bot size={18} className="text-blue-600" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Evidence Summary
                    </h3>
                  </div>

                  <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedDispute.evidence_summary || "No evidence summary generated yet. Click Review Case."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gavel size={18} className="text-red-600" />
                      <h3 className="text-base font-semibold text-slate-950">
                        HR Response Draft
                      </h3>
                    </div>

                    {selectedDispute.response_draft && (
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
                    value={selectedDispute.response_draft || ""}
                    onChange={(event) =>
                      setSelectedDispute({
                        ...selectedDispute,
                        response_draft: event.target.value,
                      })
                    }
                    rows={15}
                    placeholder="Review the case to generate a response draft..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Retrieved Sources
                    </h3>
                  </div>

                  {sources.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Sources from the latest case review will appear here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sources.map((source, index) => (
                        <div
                          key={`${source.document_id}-${index}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900">
                              [{index + 1}] {source.filename}
                            </p>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                              {source.document_type}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-slate-500">
                            {source.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
