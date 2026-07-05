"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import AttendanceFollowupPanel from "@/components/attendance/AttendanceFollowupPanel";
import {
  getCompletedAttendanceIssueKeys,
  markAttendanceIssueDone,
} from "@/api/attendanceIssueApi";
import { buildAttendanceIssueKey, buildAttendanceIssueKeyAliases } from "@/lib/attendanceIssueKey";
import { getWorkspaces } from "@/api/workspaceApi";
import {
  clearAttendanceRecords,
  getAttendanceDocuments,
  getAttendanceRecords,
  getAttendanceSummary,
  importAttendance,
} from "@/api/attendanceApi";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";

function getSeverityStyle(severity) {
  if (severity === "High") return "bg-red-50 text-red-700";
  if (severity === "Medium") return "bg-orange-50 text-orange-700";
  if (severity === "Low") return "bg-yellow-50 text-yellow-700";
  return "bg-emerald-50 text-emerald-700";
}

export default function AttendancePage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [documents, setDocuments] = useState([]);
  const [documentId, setDocumentId] = useState("");

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    total_records: 0,
    employees_tracked: 0,
    absent_records: 0,
    late_records: 0,
    missing_punch_records: 0,
    issues: [],
  });

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [completedIssueKeys, setCompletedIssueKeys] = useState([]);
  const [copiedEmployee, setCopiedEmployee] = useState("");
  const [expandedIssues, setExpandedIssues] = useState({});

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [workspaceData, docData, recordData, summaryData] =
        await Promise.all([
          getWorkspaces(),
          getAttendanceDocuments(),
          getAttendanceRecords(),
          getAttendanceSummary(),
        ]);

      setWorkspaces(workspaceData);
      setDocuments(docData);
      setRecords(recordData);
      setSummary(summaryData);

      if (docData.length > 0) {
        setDocumentId(String(docData[0].id));
      }
    } catch (err) {
      setError("Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshData(
    selectedWorkspace = workspaceId,
    selectedDocument = documentId
  ) {
    try {
      setError("");

      const [recordData, summaryData] = await Promise.all([
        getAttendanceRecords({
          workspaceId: selectedWorkspace,
          documentId: selectedDocument,
        }),
        getAttendanceSummary({
          workspaceId: selectedWorkspace,
          documentId: selectedDocument,
        }),
      ]);

      setRecords(recordData);
      setSummary(summaryData);
    } catch (err) {
      setError("Failed to refresh attendance records.");
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    setDocumentId("");

    try {
      const docData = await getAttendanceDocuments(value);
      setDocuments(docData);
      await refreshData(value, "");
    } catch (err) {
      setError("Failed to filter attendance documents.");
    }
  }

  async function handleDocumentChange(event) {
    const value = event.target.value;
    setDocumentId(value);
    await refreshData(workspaceId, value);
  }

  async function handleImport() {
    if (!documentId) {
      setError("Select an uploaded Attendance document first.");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setNotice("");

      const result = await importAttendance(documentId);
      setNotice(
        `${result.message} Imported: ${result.imported}. Skipped: ${result.skipped}.`
      );

      await refreshData(workspaceId, documentId);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Could not import attendance file. Upload CSV/XLSX with correct columns."
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleClear() {
    try {
      setError("");
      setNotice("");

      const result = await clearAttendanceRecords({
        workspaceId,
        documentId,
      });

      setNotice(`${result.message} Deleted: ${result.deleted}.`);
      await refreshData(workspaceId, documentId);
    } catch (err) {
      setError("Could not clear attendance records.");
    }
  }

  async function copyFollowUp(issue) {
    await navigator.clipboard.writeText(issue.follow_up_draft || "");
    setCopiedEmployee(issue.employee_name);

    setTimeout(() => {
      setCopiedEmployee("");
    }, 1500);
  }

  async function loadCompletedIssueKeys() {
    try {
      const keys = await getCompletedAttendanceIssueKeys();
      setCompletedIssueKeys(keys || []);
    } catch (err) {
      console.error("Could not load completed attendance issue keys", err);
    }
  }

  async function handleAttendanceIssueDone(issue) {
    try {
      setError("");
      setNotice("");

      const issueKeys = buildAttendanceIssueKeyAliases(issue);
      const primaryIssueKey = buildAttendanceIssueKey(issue);

      for (const issueKey of issueKeys) {
        await markAttendanceIssueDone({
          issueKey,
          employeeName: issue.employee_name || issue.employeeName || issue.name || "",
          issueType:
            issue.issue_type ||
            issue.type ||
            issue.status ||
            issue.severity ||
            "Attendance Issue",
          issueDate: issue.date || issue.issue_date || issue.attendance_date || "",
        });
      }

      setCompletedIssueKeys((prev) => [...new Set([...prev, ...issueKeys])]);
      setSummary((prev) => ({
        ...prev,
        issues: (prev.issues || []).filter(
          (item) => buildAttendanceIssueKey(item) !== primaryIssueKey
        ),
      }));
      setNotice(`Attendance issue cleared for ${issue.employee_name}.`);
    } catch (err) {
      setError("Could not mark attendance issue as done.");
    }
  }

  function toggleIssue(issueKey) {
    setExpandedIssues((prev) => ({
      ...prev,
      [issueKey]: !prev[issueKey],
    }));
  }

  const visibleIssues = useMemo(() => {
    return (summary.issues || []).filter((issue) => {
      const issueKey = buildAttendanceIssueKey(issue);
      return !completedIssueKeys.includes(issueKey);
    });
  }, [summary.issues, completedIssueKeys]);

  const dedupedRecords = useMemo(() => {
    const seen = new Set();

    return (records || []).filter((record) => {
      const key = [
        record.employee_id || "",
        record.employee_name || "",
        record.department || "",
        record.date || "",
        record.check_in || "",
        record.check_out || "",
        record.status || "",
        record.late_minutes || 0,
        record.issue_type || "",
      ]
        .join("__")
        .toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [records]);

  useEffect(() => {
    loadCompletedIssueKeys();
    loadInitialData();
  }, []);

  return (
    <AppShell>
      <AttendanceFollowupPanel workspaceId={workspaceId} />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Attendance Operations
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Attendance
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Import uploaded attendance CSV/XLSX files, detect late marks,
            absences, missing punches, and generate HR follow-up drafts.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => refreshData(workspaceId, documentId)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {importing ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <UploadCloud size={17} />
                Import Attendance
              </>
            )}
          </button>
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

      <section className="mb-5 grid grid-cols-5 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Records</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {summary.total_records}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Employees</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {summary.employees_tracked}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Absences</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {summary.absent_records}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Late Records</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">
            {summary.late_records}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Missing Punches</p>
          <p className="mt-2 text-3xl font-semibold text-yellow-600">
            {summary.missing_punch_records}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-[380px_1fr] gap-5">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileSpreadsheet size={20} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Import Setup
                </h2>
                <p className="text-sm text-slate-500">
                  Use uploaded Attendance documents.
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
                  Attendance Document
                </label>
                <select
                  value={documentId}
                  onChange={handleDocumentChange}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Select attendance file</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({doc.file_type})
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Upload CSV/XLSX files from Documents page with document type set
                  as Attendance.
                </p>
              </div>

              <button
                onClick={handleImport}
                disabled={importing}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {importing ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadCloud size={17} />
                    Import Selected File
                  </>
                )}
              </button>

              <button
                onClick={handleClear}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                <Trash2 size={17} />
                Clear Current Records
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-600" />
              <h2 className="text-base font-semibold text-slate-950">
                Issue Rules
              </h2>
            </div>

            <div className="space-y-3 text-sm leading-6 text-slate-600">
              <p className="rounded-xl bg-slate-50 p-3">
                More than 3 late marks: formal HR follow-up.
              </p>
              <p className="rounded-xl bg-slate-50 p-3">
                2+ absences: high-priority clarification.
              </p>
              <p className="rounded-xl bg-slate-50 p-3">
                Missing punch records: regularization request.
              </p>
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Employee Attendance Issues
                </h2>
                <p className="text-sm text-slate-500">
                  Expand an employee only when you need details. Cleared issues disappear from this list.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <CalendarCheck size={16} />
                {visibleIssues.length} active issue{visibleIssues.length === 1 ? "" : "s"}
              </div>
            </div>

            {loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500">
                <Loader2 size={22} className="mr-2 animate-spin" />
                Loading attendance...
              </div>
            ) : visibleIssues.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center px-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <CheckCircle2 size={24} />
                </div>

                <h3 className="text-base font-semibold text-slate-900">
                  No active employee issues
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Import an Attendance file or use the follow-up queue above. Cleared items are hidden here.
                </p>
              </div>
            ) : (
              <div className="max-h-[680px] overflow-y-auto p-5">
                <div className="space-y-3">
                  {visibleIssues.map((issue) => {
                    const issueKey = buildAttendanceIssueKey(issue);
                    const isExpanded = !!expandedIssues[issueKey];

                    return (
                      <article
                        key={`${issue.employee_id || issue.employee_name}-${issueKey}`}
                        className="rounded-2xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-4 p-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                              <UserRound size={20} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold text-slate-950">
                                  {issue.employee_name}
                                </h3>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityStyle(
                                    issue.severity
                                  )}`}
                                >
                                  {issue.severity}
                                </span>
                              </div>

                              <p className="mt-1 truncate text-sm text-slate-500">
                                {issue.department || "No department"}
                                {issue.employee_id ? ` • ${issue.employee_id}` : ""}
                                {` • `}
                                {issue.late_marks || 0} late
                                {` • `}
                                {issue.absent_days || 0} absent
                                {` • `}
                                {issue.missing_punches || 0} missing punch
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => handleAttendanceIssueDone(issue)}
                              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 size={15} />
                              Done
                            </button>

                            <button
                              onClick={() => toggleIssue(issueKey)}
                              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={15} />
                                  Collapse
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={15} />
                                  Expand
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-100 p-4">
                            <div className="mb-4 flex justify-end">
                              <button
                                onClick={() => copyFollowUp(issue)}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Clipboard size={15} />
                                {copiedEmployee === issue.employee_name
                                  ? "Copied"
                                  : "Copy Follow-up"}
                              </button>
                            </div>

                            <div className="mb-4 grid grid-cols-5 gap-3">
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Records</p>
                                <p className="mt-1 text-xl font-semibold text-slate-950">
                                  {issue.total_records}
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Present</p>
                                <p className="mt-1 text-xl font-semibold text-emerald-600">
                                  {issue.present_days}
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Absent</p>
                                <p className="mt-1 text-xl font-semibold text-red-600">
                                  {issue.absent_days}
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Late Marks</p>
                                <p className="mt-1 text-xl font-semibold text-orange-600">
                                  {issue.late_marks}
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs text-slate-500">Missing Punch</p>
                                <p className="mt-1 text-xl font-semibold text-yellow-600">
                                  {issue.missing_punches}
                                </p>
                              </div>
                            </div>

                            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm font-semibold text-slate-800">
                                Recommended Action
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {issue.recommended_action}
                              </p>
                            </div>

                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                              <p className="mb-2 text-sm font-semibold text-blue-800">
                                Follow-up Draft
                              </p>
                              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {issue.follow_up_draft}
                              </p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Raw Attendance Records
                </h2>
                <p className="text-sm text-slate-500">
                  Full imported attendance rows with internal scrolling.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                {dedupedRecords.length} row{records.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="max-h-[440px] overflow-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Check In</th>
                    <th className="px-5 py-3">Check Out</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Late</th>
                    <th className="px-5 py-3">Issue</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {dedupedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {record.employee_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {record.department || "No department"}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {record.date}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {record.check_in || "-"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {record.check_out || "-"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {record.status}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {record.late_minutes}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityStyle(
                            record.severity
                          )}`}
                        >
                          {record.issue_type || "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {dedupedRecords.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        No imported attendance records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}



