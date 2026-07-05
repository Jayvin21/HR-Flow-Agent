"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, RefreshCcw, Search, UserRound } from "lucide-react";
import { getUnifiedCases } from "@/api/caseApi";
import {
  getCompletedAttendanceIssueKeys,
  markAttendanceIssueDone,
} from "@/api/attendanceIssueApi";
import { buildAttendanceIssueKey } from "@/lib/attendanceIssueKey";

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

function priorityStyle(priority) {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Medium") return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

function compactText(value, fallback = "Not available") {
  if (!value) return fallback;
  return String(value);
}

export default function AttendanceFollowupPanel({ workspaceId = "" }) {
  const [cases, setCases] = useState([]);
  const [completedKeys, setCompletedKeys] = useState([]);
  const [query, setQuery] = useState("");
  const [denseOnly, setDenseOnly] = useState(true);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const visibleCases = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cases
      .filter((item) => item.source_type === "Attendance")
      .filter((item) => activeStatuses.has(item.status || "Open"))
      .filter((item) => !completedKeys.includes(buildAttendanceIssueKey(item)))
      .filter((item) => {
        if (!q) return true;

        const haystack = [
          item.title,
          item.person_name,
          item.department,
          item.category,
          item.summary,
          item.priority,
          item.status,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
  }, [cases, completedKeys, query]);

  const highPriorityCount = visibleCases.filter(
    (item) => item.priority === "High"
  ).length;

  async function loadPanel() {
    try {
      setLoading(true);
      setError("");

      const [caseData, keys] = await Promise.all([
        getUnifiedCases({
          workspaceId,
          sourceType: "Attendance",
          status: "All",
          priority: "All",
        }),
        getCompletedAttendanceIssueKeys(),
      ]);

      setCases(caseData.cases || []);
      setCompletedKeys(keys || []);
    } catch (err) {
      setError("Could not load attendance follow-ups.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDone(issue) {
    try {
      setError("");
      setNotice("");

      const issueKey = buildAttendanceIssueKey(issue);

      await markAttendanceIssueDone({
        issueKey,
        employeeName: issue.person_name || issue.employee_name || "",
        issueType: issue.category || issue.title || "Attendance Issue",
        issueDate: issue.issue_date || issue.date || "",
      });

      setCompletedKeys((prev) => [...new Set([...prev, issueKey])]);
      setCases((prev) =>
        prev.filter((item) => buildAttendanceIssueKey(item) !== issueKey)
      );
      setNotice("Attendance follow-up marked done.");
    } catch (err) {
      setError("Could not mark attendance follow-up as done.");
    }
  }

  useEffect(() => {
    loadPanel();
  }, [workspaceId]);

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Attendance Follow-up Queue
          </h2>
          <p className="text-sm text-slate-500">
            {visibleCases.length} active follow-up{visibleCases.length === 1 ? "" : "s"}
            {highPriorityCount > 0 ? ` • ${highPriorityCount} high priority` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDenseOnly(!denseOnly)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {denseOnly ? "Compact" : "Expanded"}
          </button>

          <button
            onClick={loadPanel}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
        </div>
      </div>

      <div className="border-b border-slate-100 px-5 py-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employee, department, issue, priority..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>
      </div>

      {notice && (
        <div className="mx-5 mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-44 items-center justify-center text-slate-500">
          <Loader2 size={20} className="mr-2 animate-spin" />
          Loading attendance follow-ups...
        </div>
      ) : visibleCases.length === 0 ? (
        <div className="flex h-44 flex-col items-center justify-center px-6 text-center">
          <CheckCircle2 size={34} className="mb-3 text-emerald-500" />
          <h3 className="text-base font-semibold text-slate-900">
            No active attendance follow-ups
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Done items are hidden from Attendance and Cases queues.
          </p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {visibleCases.map((issue) => (
              <article
                key={issue.id}
                className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                      <Clock3 size={18} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-950">
                        {compactText(issue.title, "Attendance issue")}
                      </h3>

                      <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
                        <UserRound size={14} />
                        {compactText(issue.person_name, "Employee")}
                        {issue.department ? ` • ${issue.department}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyle(issue.priority)}`}>
                    {issue.priority || "Medium"}
                  </span>
                </div>

                {!denseOnly && (
                  <p className="mb-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {issue.summary || "No summary available."}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {issue.category || "Attendance"}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      {issue.status || "Open"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDone(issue)}
                    className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

