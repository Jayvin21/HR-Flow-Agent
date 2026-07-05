"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { buildAttendanceIssueKey, buildAttendanceIssueKeyAliases } from "@/lib/attendanceIssueKey";
import {
  getCompletedAttendanceIssueKeys,
  markAttendanceIssueDone,
} from "@/api/attendanceIssueApi";
import { getWorkspaces } from "@/api/workspaceApi";
import { getUnifiedCases } from "@/api/caseApi";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Clipboard,
  FileCheck2,
  Filter,
  Gavel,
  Loader2,
  MessageSquareText,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";

const sourceTypes = ["All", "Employee Query", "Dispute", "Missing Docs", "Attendance"];
const statuses = [
  "All",
  "Open",
  "Resolved",
  "Needs HR Review",
  "Under Review",
  "Needs Evidence",
  "Waiting for Employee",
  "Escalated",
  "Pending",
  "Partially Pending",
  "Requested",
  "Complete",
  "Closed",
];
const priorities = ["All", "High", "Medium", "Low"];

const historyStatuses = new Set(["Resolved", "Complete", "Closed"]);
const activeStatuses = new Set([
  "Open",
  "Needs HR Review",
  "Under Review",
  "Needs Evidence",
  "Waiting for Employee",
  "Escalated",
  "Pending",
  "Partially Pending",
  "Requested",
]);

function sourceIcon(sourceType) {
  if (sourceType === "Dispute") return Gavel;
  if (sourceType === "Missing Docs") return FileCheck2;
  if (sourceType === "Attendance") return AlertTriangle;
  return MessageSquareText;
}

function sourceStyle(sourceType) {
  if (sourceType === "Dispute") return "bg-red-50 text-red-700";
  if (sourceType === "Missing Docs") return "bg-blue-50 text-blue-700";
  if (sourceType === "Attendance") return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

function statusStyle(status) {
  if (["Resolved", "Complete", "Closed"].includes(status)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["Escalated", "Needs Evidence", "Needs HR Review"].includes(status)) {
    return "bg-red-50 text-red-700";
  }

  if (["Under Review", "Waiting for Employee", "Requested"].includes(status)) {
    return "bg-blue-50 text-blue-700";
  }

  if (["Pending", "Partially Pending"].includes(status)) {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-slate-100 text-slate-700";
}

function priorityStyle(priority) {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Medium") return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

function isCompletedAttendanceCase(caseItem, completedKeys) {
  if (!caseItem || caseItem.source_type !== "Attendance") return false;

  const aliases = buildAttendanceIssueKeyAliases(caseItem);
  return aliases.some((key) => completedKeys.includes(key));
}

function destinationPath(caseItem) {
  if (!caseItem) return "/cases";

  if (caseItem.source_type === "Employee Query") return "/employee-queries";
  if (caseItem.source_type === "Dispute") return "/disputes";
  if (caseItem.source_type === "Missing Docs") return "/missing-docs";
  if (caseItem.source_type === "Attendance") return "/attendance";

  return "/cases";
}

export default function CasesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [sourceType, setSourceType] = useState("All");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [caseView, setCaseView] = useState("Active");

  const [summary, setSummary] = useState({
    total_cases: 0,
    open_cases: 0,
    high_priority_cases: 0,
    escalated_cases: 0,
    needs_review_cases: 0,
  });

  const [cases, setCases] = useState([]);
  const [completedAttendanceIssueKeys, setCompletedAttendanceIssueKeys] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const visibleCases = useMemo(() => {
    const withoutCompletedAttendance = cases.filter((item) => {
      if (item.source_type !== "Attendance") return true;
      return !isCompletedAttendanceCase(item, completedAttendanceIssueKeys);
    });

    if (caseView === "History") {
      return cases.filter((item) => {
        if (item.source_type === "Attendance") {
          return isCompletedAttendanceCase(item, completedAttendanceIssueKeys);
        }

        return historyStatuses.has(item.status);
      });
    }

    if (caseView === "Active") {
      return withoutCompletedAttendance.filter((item) =>
        activeStatuses.has(item.status)
      );
    }

    return withoutCompletedAttendance;
  }, [cases, caseView, completedAttendanceIssueKeys]);

  const viewStats = useMemo(() => {
    const active = cases.filter((item) => {
      if (item.source_type === "Attendance") {
        return (
          activeStatuses.has(item.status) &&
          !isCompletedAttendanceCase(item, completedAttendanceIssueKeys)
        );
      }

      return activeStatuses.has(item.status);
    });

    const history = cases.filter((item) => {
      if (item.source_type === "Attendance") {
        return isCompletedAttendanceCase(item, completedAttendanceIssueKeys);
      }

      return historyStatuses.has(item.status);
    });

    return {
      active: active.length,
      history: history.length,
      all: active.length + history.length,
      highPriority: active.filter((item) => item.priority === "High").length,
      escalated: active.filter((item) => item.status === "Escalated").length,
    };
  }, [cases, completedAttendanceIssueKeys]);

  async function loadWorkspaces() {
    const data = await getWorkspaces();
    setWorkspaces(data);
  }

  async function loadCompletedAttendanceIssueKeys() {
    try {
      const keys = await getCompletedAttendanceIssueKeys();
      setCompletedAttendanceIssueKeys(keys || []);
    } catch (err) {
      console.error("Could not load completed attendance issue keys", err);
    }
  }

  async function loadCases({
    selectedWorkspace = workspaceId,
    selectedSourceType = sourceType,
    selectedStatus = status,
    selectedPriority = priority,
  } = {}) {
    try {
      setLoading(true);
      setError("");

      const data = await getUnifiedCases({
        workspaceId: selectedWorkspace,
        sourceType: selectedSourceType,
        status: selectedStatus,
        priority: selectedPriority,
      });

      setSummary(data.summary);
      setCases(data.cases);
    } catch (err) {
      setError("Failed to load unified cases.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    await loadCases({ selectedWorkspace: value });
  }

  async function handleSourceTypeChange(event) {
    const value = event.target.value;
    setSourceType(value);
    await loadCases({ selectedSourceType: value });
  }

  async function handleStatusChange(event) {
    const value = event.target.value;
    setStatus(value);
    await loadCases({ selectedStatus: value });
  }

  async function handlePriorityChange(event) {
    const value = event.target.value;
    setPriority(value);
    await loadCases({ selectedPriority: value });
  }

  function handleCaseViewChange(view) {
    setCaseView(view);

    const nextList =
      view === "History"
        ? cases.filter((item) => historyStatuses.has(item.status))
        : view === "Active"
          ? cases.filter((item) => activeStatuses.has(item.status))
          : cases;

    setSelectedCase(nextList[0] || null);
  }

  async function copyDraft() {
    if (!selectedCase?.draft) return;

    await navigator.clipboard.writeText(selectedCase.draft);
    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSelectedAttendanceDone() {
    if (!selectedCase || selectedCase.source_type !== "Attendance") {
      return;
    }

    try {
      const issueKeys = buildAttendanceIssueKeyAliases(selectedCase);

      for (const issueKey of issueKeys) {
        await markAttendanceIssueDone({
          issueKey,
          employeeName: selectedCase.person_name || "",
          issueType: selectedCase.category || selectedCase.title || "Attendance Issue",
          issueDate: selectedCase.issue_date || selectedCase.date || "",
        });
      }

      setCompletedAttendanceIssueKeys((prev) => [
        ...new Set([...prev, ...issueKeys]),
      ]);

      setCases((prev) =>
        prev.filter((item) => !isCompletedAttendanceCase(item, issueKeys))
      );

      setSelectedCase(null);
      loadCompletedAttendanceIssueKeys();
      await loadCompletedAttendanceIssueKeys();
    } catch (err) {
      setError("Could not mark attendance case as done.");
    }
  }

  useEffect(() => {
    loadWorkspaces();
    loadCompletedAttendanceIssueKeys();
    loadCases();
  }, []);

  // sync selected case with visible filtered queue
  useEffect(() => {
    if (visibleCases.length === 0) {
      setSelectedCase(null);      return;
    }

    if (!selectedCase) {
      setSelectedCase(visibleCases[0]);
      return;
    }

    const stillVisible = visibleCases.some(
      (item) => item.id === selectedCase.id && item.source_type === selectedCase.source_type
    );

    if (!stillVisible) {
      setSelectedCase(visibleCases[0]);
    }
  }, [visibleCases, selectedCase]);

  const SelectedIcon = sourceIcon(selectedCase?.source_type);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Unified HR Operations
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Cases
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Active queue and historical archive for employee queries, disputes,
            missing documents, and attendance issues.
          </p>
        </div>

        <button
          onClick={async () => { await loadCompletedAttendanceIssueKeys(); await loadCases(); }}
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

      <section className="mb-5 grid grid-cols-5 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Cases</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {viewStats.all}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">
            {viewStats.active}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">History</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">
            {viewStats.history}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">High Priority</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {viewStats.highPriority}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Escalated</p>
          <p className="mt-2 text-3xl font-semibold text-red-700">
            {viewStats.escalated}
          </p>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-600" />
          <h2 className="text-base font-semibold text-slate-950">
            Filters
          </h2>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              View
            </label>
            <select
              value={caseView}
              onChange={(event) => handleCaseViewChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option>Active</option>
              <option>History</option>
              <option>All</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Workspace
            </label>
            <select
              value={workspaceId}
              onChange={handleWorkspaceChange}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All workspaces</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Source Type
            </label>
            <select
              value={sourceType}
              onChange={handleSourceTypeChange}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              {sourceTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={handleStatusChange}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={handlePriorityChange}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              {priorities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[430px_1fr] gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">
              {caseView} Queue
            </h2>
            <p className="text-sm text-slate-500">
              {visibleCases.length} case{visibleCases.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {loading ? (
            <div className="flex h-96 items-center justify-center text-slate-500">
              <Loader2 size={22} className="mr-2 animate-spin" />
              Loading cases...
            </div>
          ) : visibleCases.length === 0 ? (
            <div className="flex h-96 flex-col items-center justify-center px-8 text-center">
              <BriefcaseBusiness size={38} className="mb-3 text-slate-400" />
              <h3 className="text-base font-semibold text-slate-900">
                No cases found
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Change filters or create source cases.
              </p>
            </div>
          ) : (
            <div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">
              {visibleCases.map((caseItem) => {
                const Icon = sourceIcon(caseItem.source_type);

                return (
                  <button
                    key={caseItem.id}
                    onClick={() => setSelectedCase(caseItem)}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 ${
                      selectedCase?.id === caseItem.id ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${sourceStyle(caseItem.source_type)}`}>
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {caseItem.title}
                          </p>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyle(caseItem.priority)}`}>
                            {caseItem.priority}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {caseItem.person_name}
                        </p>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-sm leading-5 text-slate-500">
                      {caseItem.summary}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sourceStyle(caseItem.source_type)}`}>
                        {caseItem.source_type}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(caseItem.status)}`}>
                        {caseItem.status}
                      </span>
                      {caseItem.risk_level && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                          Risk: {caseItem.risk_level}
                        </span>
                      )}
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
                Case Details
              </h2>
              <p className="text-sm text-slate-500">
                Summary, action, draft, and module link.
              </p>
            </div>

            {selectedCase && (
              <div className="flex gap-2">
                {selectedCase.source_type === "Attendance" && (
                  <button
                    onClick={handleSelectedAttendanceDone}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Done
                  </button>
                )}

                <a
                  href={destinationPath(selectedCase)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Open Module
                </a>
              </div>
            )}
          </div>

          {!selectedCase ? (
            <div className="flex h-[760px] flex-col items-center justify-center px-8 text-center">
              <ShieldAlert size={42} className="mb-3 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">
                Select a case
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Case details and recommended action will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${sourceStyle(selectedCase.source_type)}`}>
                      <SelectedIcon size={24} />
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">
                        {selectedCase.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedCase.person_name}
                        {selectedCase.department ? ` • ${selectedCase.department}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(selectedCase.priority)}`}>
                      {selectedCase.priority} Priority
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(selectedCase.status)}`}>
                      {selectedCase.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Source</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedCase.source_type}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Category</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedCase.category}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Risk</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedCase.risk_level || "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <MessageSquareText size={18} className="text-blue-600" />
                  <h3 className="text-base font-semibold text-slate-950">
                    Case Summary
                  </h3>
                </div>

                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {selectedCase.summary || "No summary available."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-orange-600" />
                  <h3 className="text-base font-semibold text-slate-950">
                    Recommended Action
                  </h3>
                </div>

                <p className="whitespace-pre-wrap rounded-xl bg-orange-50 p-4 text-sm leading-6 text-slate-700">
                  {selectedCase.recommended_action || "Open the source module and process this case."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clipboard size={18} className="text-blue-600" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Draft / Message
                    </h3>
                  </div>

                  {selectedCase.draft && (
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
                  value={selectedCase.draft || ""}
                  onChange={(event) =>
                    setSelectedCase({
                      ...selectedCase,
                      draft: event.target.value,
                    })
                  }
                  rows={16}
                  placeholder="Draft appears after resolving the source case."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}























