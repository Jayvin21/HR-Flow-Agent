"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getWorkspaces } from "@/api/workspaceApi";
import {
  createEmployeeQuery,
  deleteEmployeeQuery,
  getEmployeeQueries,
  resolveEmployeeQuery,
  updateEmployeeQueryStatus,
} from "@/api/employeeQueryApi";
import {
  Bot,
  CircleHelp,
  Clipboard,
  FileText,
  Loader2,
  MessageSquareReply,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

const queryTypes = [
  "Leave",
  "Attendance",
  "Probation",
  "Reimbursement",
  "Notice Period",
  "Salary",
  "Onboarding",
  "General",
];

const priorities = ["Low", "Medium", "High"];
const statuses = ["All", "Open", "Resolved", "Needs HR Review", "Waiting for Employee", "Escalated"];

function statusStyle(status) {
  if (status === "Resolved") return "bg-emerald-50 text-emerald-700";
  if (status === "Needs HR Review") return "bg-orange-50 text-orange-700";
  if (status === "Escalated") return "bg-red-50 text-red-700";
  if (status === "Waiting for Employee") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

function priorityStyle(priority) {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Medium") return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

export default function EmployeeQueriesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [sources, setSources] = useState([]);

  const [form, setForm] = useState({
    employee_name: "",
    department: "",
    query_type: "Leave",
    priority: "Medium",
    question: "Can I take paid leave during probation?",
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    return {
      total: queries.length,
      open: queries.filter((query) => query.status === "Open").length,
      resolved: queries.filter((query) => query.status === "Resolved").length,
      review: queries.filter((query) => query.status === "Needs HR Review").length,
    };
  }, [queries]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [workspaceData, queryData] = await Promise.all([
        getWorkspaces(),
        getEmployeeQueries(),
      ]);

      setWorkspaces(workspaceData);
      setQueries(queryData);

      if (queryData.length > 0) {
        setSelectedQuery(queryData[0]);
      }
    } catch (err) {
      setError("Failed to load employee queries.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshQueries(selectedWorkspace = workspaceId, selectedStatus = statusFilter) {
    try {
      setError("");

      const queryData = await getEmployeeQueries({
        workspaceId: selectedWorkspace,
        status: selectedStatus === "All" ? "" : selectedStatus,
      });

      setQueries(queryData);

      if (queryData.length > 0) {
        setSelectedQuery(queryData[0]);
      } else {
        setSelectedQuery(null);
      }
    } catch (err) {
      setError("Failed to refresh employee queries.");
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    await refreshQueries(value, statusFilter);
  }

  async function handleStatusFilterChange(event) {
    const value = event.target.value;
    setStatusFilter(value);
    await refreshQueries(workspaceId, value);
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

    if (!form.question.trim()) {
      setError("Question is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setNotice("");

      const created = await createEmployeeQuery({
        workspace_id: workspaceId ? Number(workspaceId) : null,
        ...form,
      });

      setNotice("Employee query created.");
      setSelectedQuery(created);

      setForm({
        employee_name: "",
        department: "",
        query_type: "Leave",
        priority: "Medium",
        question: "Can I take paid leave during probation?",
      });

      await refreshQueries(workspaceId, statusFilter);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create employee query.");
    } finally {
      setCreating(false);
    }
  }

  async function handleResolve(queryId) {
    try {
      setResolvingId(queryId);
      setError("");
      setNotice("");
      setSources([]);

      const result = await resolveEmployeeQuery(queryId);

      setSelectedQuery(result.query);
      setSources(result.sources || []);
      setNotice("Query resolved using uploaded HR documents.");

      await refreshQueries(workspaceId, statusFilter);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not resolve query.");
    } finally {
      setResolvingId(null);
    }
  }

  async function handleStatusUpdate(queryId, status) {
    try {
      const updated = await updateEmployeeQueryStatus(queryId, status);
      setSelectedQuery(updated);
      await refreshQueries(workspaceId, statusFilter);
    } catch (err) {
      setError("Could not update query status.");
    }
  }

  async function handleDelete(queryId) {
    try {
      setError("");
      await deleteEmployeeQuery(queryId);
      setSelectedQuery(null);
      await refreshQueries(workspaceId, statusFilter);
    } catch (err) {
      setError("Could not delete employee query.");
    }
  }

  async function copyResponseDraft() {
    if (!selectedQuery?.response_draft) return;

    await navigator.clipboard.writeText(selectedQuery.response_draft);
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
            Employee Helpdesk
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Employee Queries
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Create employee HR queries, resolve them using uploaded policy
            documents, and generate editable HR response drafts with source
            references.
          </p>
        </div>

        <button
          onClick={() => refreshQueries(workspaceId, statusFilter)}
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
          <p className="text-sm font-medium text-slate-500">Total Queries</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Open</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">{stats.open}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Resolved</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{stats.resolved}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Needs Review</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">{stats.review}</p>
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
                  Create Query
                </h2>
                <p className="text-sm text-slate-500">
                  Add employee question for HR review.
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
                    placeholder="Sales"
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Query Type
                  </label>
                  <select
                    value={form.query_type}
                    onChange={(event) => updateForm("query_type", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    {queryTypes.map((type) => (
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
                  Employee Question
                </label>
                <textarea
                  value={form.question}
                  onChange={(event) => updateForm("question", event.target.value)}
                  rows={5}
                  placeholder="Can I take paid leave during probation?"
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
                    <CircleHelp size={17} />
                    Create Query
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
                Query Queue
              </h2>
              <p className="text-sm text-slate-500">
                Select a query to resolve or review.
              </p>
            </div>

            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500">
                <Loader2 size={22} className="mr-2 animate-spin" />
                Loading...
              </div>
            ) : queries.length === 0 ? (
              <div className="flex h-80 flex-col items-center justify-center px-6 text-center">
                <CircleHelp size={34} className="mb-3 text-slate-400" />
                <p className="text-sm font-semibold text-slate-800">
                  No queries yet
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Create an employee query to begin.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {queries.map((query) => (
                  <button
                    key={query.id}
                    onClick={() => {
                      setSelectedQuery(query);
                      setSources([]);
                    }}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 ${
                      selectedQuery?.id === query.id ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {query.employee_name}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyle(query.priority)}`}>
                        {query.priority}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm leading-5 text-slate-500">
                      {query.question}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(query.status)}`}>
                        {query.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {query.query_type}
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
                  Query Resolution
                </h2>
                <p className="text-sm text-slate-500">
                  RAG answer, source snippets, and HR response draft.
                </p>
              </div>

              {selectedQuery && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(selectedQuery.id)}
                    disabled={resolvingId === selectedQuery.id}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                  >
                    {resolvingId === selectedQuery.id ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Resolve
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(selectedQuery.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {!selectedQuery ? (
              <div className="flex h-[720px] flex-col items-center justify-center px-8 text-center">
                <MessageSquareReply size={40} className="mb-3 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Select or create a query
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Once selected, HRFlow can search uploaded policy documents and
                  draft a response.
                </p>
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {selectedQuery.employee_name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedQuery.department || "No department"} • {selectedQuery.query_type}
                      </p>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(selectedQuery.status)}`}>
                      {selectedQuery.status}
                    </span>
                  </div>

                  <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedQuery.question}
                  </p>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Update Status
                    </label>
                    <select
                      value={selectedQuery.status}
                      onChange={(event) => handleStatusUpdate(selectedQuery.id, event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      {statuses.filter((status) => status !== "All").map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Bot size={18} className="text-blue-600" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Policy-Grounded Answer
                    </h3>
                  </div>

                  <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedQuery.policy_answer || "No answer generated yet. Click Resolve to search uploaded policy documents."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquareReply size={18} className="text-blue-600" />
                      <h3 className="text-base font-semibold text-slate-950">
                        HR Response Draft
                      </h3>
                    </div>

                    {selectedQuery.response_draft && (
                      <button
                        onClick={copyResponseDraft}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Clipboard size={15} />
                        {copied ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>

                  <textarea
                    value={selectedQuery.response_draft || ""}
                    onChange={(event) =>
                      setSelectedQuery({
                        ...selectedQuery,
                        response_draft: event.target.value,
                      })
                    }
                    rows={13}
                    placeholder="Resolve the query to generate a response draft..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Sources
                    </h3>
                  </div>

                  {sources.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Sources from the latest resolve action will appear here.
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
