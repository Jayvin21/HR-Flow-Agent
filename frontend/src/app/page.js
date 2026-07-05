"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { getDashboardCommandCenter } from "@/api/dashboardApi";
import { syncCommunicationQueue } from "@/api/communicationApi";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  Loader2,
  Mail,
  RefreshCcw,
  Send,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";

function priorityStyle(priority) {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Medium") return "bg-orange-50 text-orange-700";
  if (priority === "Low") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function workloadStyle(level) {
  if (level === "Heavy") return "bg-red-50 text-red-700 border-red-200";
  if (level === "Moderate") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function actionIcon(type) {
  if (type === "Email") return Mail;
  if (type === "Letter") return FileText;
  if (type === "Interview") return ClipboardList;
  if (type === "Case") return ShieldAlert;
  return Sparkles;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const summary = data?.summary || {
    workload_level: "Light",
    workload_score: 0,
    active_cases: 0,
    history_cases: 0,
    high_priority_cases: 0,
    pending_communications: 0,
    pending_emails: 0,
    pending_letters: 0,
    pending_interview_packs: 0,
    attendance_followups: 0,
    open_disputes: 0,
    missing_docs: 0,
    shortlisted_candidates: 0,
    hired_candidates: 0,
    rejected_candidates: 0,
  };

  const actionItems = data?.action_items || [];
  const sections = data?.sections || {};

  const topMessage = useMemo(() => {
    if (summary.workload_level === "Heavy") {
      return "HR queue is heavy. Prioritize high-risk cases, interviews, and pending communications.";
    }

    if (summary.workload_level === "Moderate") {
      return "HR workload is manageable. Clear pending cases and communication tasks first.";
    }

    return "HR workload is light. Good time to clean queues, review candidates, and update records.";
  }, [summary.workload_level]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      const result = await getDashboardCommandCenter();
      setData(result);
    } catch (err) {
      setError("Could not load dashboard command center.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncAndRefresh() {
    try {
      setSyncing(true);
      setNotice("");
      setError("");

      const result = await syncCommunicationQueue();
      setNotice(`${result.message} Created: ${result.created}.`);

      await loadDashboard();
    } catch (err) {
      setError("Could not sync communication queue.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Command Center
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            HR Dashboard
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Today’s HR workload, cases, communication tasks, hiring actions, and operational risks.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadDashboard}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            onClick={handleSyncAndRefresh}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {syncing ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Sync Work Queue
              </>
            )}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-[540px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
          <Loader2 size={24} className="mr-2 animate-spin" />
          Loading command center...
        </div>
      ) : (
        <>
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Gauge size={25} />
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-950">
                      Today’s HR Workload
                    </h2>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${workloadStyle(
                        summary.workload_level
                      )}`}
                    >
                      {summary.workload_level}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {topMessage}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-5 py-4 text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Workload Score
                </p>
                <p className="mt-1 text-3xl font-semibold text-slate-950">
                  {summary.workload_score}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-4 gap-5">
            <Link
              href="/cases"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <ShieldAlert size={20} />
              </div>
              <p className="text-sm font-medium text-slate-500">Active Cases</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {summary.active_cases}
              </p>
              <p className="mt-2 text-sm text-red-600">
                {summary.high_priority_cases} high priority
              </p>
            </Link>

            <Link
              href="/communications"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Send size={20} />
              </div>
              <p className="text-sm font-medium text-slate-500">Pending Comms</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {summary.pending_communications}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {summary.pending_emails} emails • {summary.pending_letters} letters
              </p>
            </Link>

            <Link
              href="/interview-assistant"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <ClipboardList size={20} />
              </div>
              <p className="text-sm font-medium text-slate-500">Interview Packs</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {summary.pending_interview_packs}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {summary.shortlisted_candidates} shortlisted candidates
              </p>
            </Link>

            <Link
              href="/attendance"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                <AlertTriangle size={20} />
              </div>
              <p className="text-sm font-medium text-slate-500">Attendance Follow-ups</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {summary.attendance_followups}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                unresolved attendance issues
              </p>
            </Link>
          </section>

          <section className="mb-5 grid grid-cols-4 gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Open Disputes</p>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {summary.open_disputes}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Missing Docs</p>
              <p className="mt-2 text-3xl font-semibold text-orange-600">
                {summary.missing_docs}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Hired</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">
                {summary.hired_candidates}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Rejected</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {summary.rejected_candidates}
              </p>
            </div>
          </section>

          <section className="grid grid-cols-[1.2fr_0.8fr] gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Priority Action List
                  </h2>
                  <p className="text-sm text-slate-500">
                    Start here. These are the highest-value HR actions.
                  </p>
                </div>

                <Link
                  href="/communications"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open Queue
                  <ArrowRight size={15} />
                </Link>
              </div>

              {actionItems.length === 0 ? (
                <div className="flex h-80 flex-col items-center justify-center px-8 text-center">
                  <CheckCircle2 size={40} className="mb-3 text-emerald-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    No priority actions
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Sync the work queue or create new HR cases to populate today’s action list.
                  </p>
                </div>
              ) : (
                <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
                  {actionItems.map((item, index) => {
                    const Icon = actionIcon(item.type);

                    return (
                      <Link
                        key={`${item.title}-${index}`}
                        href={item.href}
                        className="block p-5 transition hover:bg-slate-50"
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <Icon size={18} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {item.title}
                                </p>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyle(
                                    item.priority
                                  )}`}
                                >
                                  {item.priority}
                                </span>
                              </div>

                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <ArrowRight size={17} className="shrink-0 text-slate-400" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-semibold text-slate-950">
                    Hiring Snapshot
                  </h2>
                  <p className="text-sm text-slate-500">
                    Recruitment pipeline state.
                  </p>
                </div>

                <div className="space-y-3 p-5">
                  <Link
                    href="/candidates"
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <UsersRound size={18} className="text-blue-600" />
                      <span className="text-sm font-semibold text-slate-700">
                        Shortlisted
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-slate-950">
                      {summary.shortlisted_candidates}
                    </span>
                  </Link>

                  <Link
                    href="/candidates"
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <BriefcaseBusiness size={18} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-slate-700">
                        Hired
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-slate-950">
                      {summary.hired_candidates}
                    </span>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-semibold text-slate-950">
                    Queue Breakdown
                  </h2>
                  <p className="text-sm text-slate-500">
                    Pending execution tasks.
                  </p>
                </div>

                <div className="space-y-3 p-5">
                  <Link
                    href="/communications"
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-blue-600" />
                      <span className="text-sm font-semibold text-slate-700">
                        Emails
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-slate-950">
                      {summary.pending_emails}
                    </span>
                  </Link>

                  <Link
                    href="/communications"
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-orange-600" />
                      <span className="text-sm font-semibold text-slate-700">
                        Letters
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-slate-950">
                      {summary.pending_letters}
                    </span>
                  </Link>

                  <Link
                    href="/communications"
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList size={18} className="text-purple-600" />
                      <span className="text-sm font-semibold text-slate-700">
                        Interview Packs
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-slate-950">
                      {summary.pending_interview_packs}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
