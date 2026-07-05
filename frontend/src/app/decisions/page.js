"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getCandidates } from "@/api/candidateApi";
import { getDisputes } from "@/api/disputeApi";
import { getEmployeeQueries } from "@/api/employeeQueryApi";
import { getMissingDocumentCases } from "@/api/missingDocumentApi";
import { generateDecisionSummary } from "@/api/decisionApi";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Clipboard,
  FileText,
  Gavel,
  Loader2,
  ScrollText,
  Sparkles,
  UserRound,
} from "lucide-react";

const decisionTypes = [
  "Hiring Decision",
  "Case Closure",
  "Escalation Memo",
  "Policy Decision",
  "Onboarding Decision",
  "General HR Decision",
];

const sourceTypes = [
  "Manual",
  "Candidate",
  "Dispute",
  "Employee Query",
  "Missing Docs",
];

function riskStyle(risk) {
  if (risk === "High") return "bg-red-50 text-red-700";
  if (risk === "Medium") return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

export default function DecisionsPage() {
  const [sourceType, setSourceType] = useState("Manual");
  const [decisionType, setDecisionType] = useState("General HR Decision");

  const [candidates, setCandidates] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [queries, setQueries] = useState([]);
  const [missingDocs, setMissingDocs] = useState([]);
  const [sourceId, setSourceId] = useState("");

  const [form, setForm] = useState({
    person_name: "",
    role_or_category: "",
    situation: "",
    evidence: "",
    recommendation: "",
    reviewer_name: "HR Team",
  });

  const [memo, setMemo] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoadingData(true);
      setError("");

      const [candidateData, disputeData, queryData, missingDocData] = await Promise.all([
        getCandidates(),
        getDisputes(),
        getEmployeeQueries(),
        getMissingDocumentCases(),
      ]);

      setCandidates(candidateData);
      setDisputes(disputeData);
      setQueries(queryData);
      setMissingDocs(missingDocData);
    } catch (err) {
      setError("Failed to load source records.");
    } finally {
      setLoadingData(false);
    }
  }

  function sourceOptions() {
    if (sourceType === "Candidate") {
      return candidates.map((item) => ({
        id: item.id,
        label: `${item.name} - ${item.current_role || "Candidate"}`,
      }));
    }

    if (sourceType === "Dispute") {
      return disputes.map((item) => ({
        id: item.id,
        label: `${item.employee_name} - ${item.dispute_type}`,
      }));
    }

    if (sourceType === "Employee Query") {
      return queries.map((item) => ({
        id: item.id,
        label: `${item.employee_name} - ${item.query_type}`,
      }));
    }

    if (sourceType === "Missing Docs") {
      return missingDocs.map((item) => ({
        id: item.id,
        label: `${item.person_name} - ${item.status}`,
      }));
    }

    return [];
  }

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSourceTypeChange(value) {
    setSourceType(value);
    setSourceId("");
    setMemo(null);

    if (value === "Candidate") {
      setDecisionType("Hiring Decision");
    } else if (value === "Dispute") {
      setDecisionType("Escalation Memo");
    } else if (value === "Employee Query") {
      setDecisionType("Policy Decision");
    } else if (value === "Missing Docs") {
      setDecisionType("Onboarding Decision");
    } else {
      setDecisionType("General HR Decision");
    }
  }

  async function handleGenerate() {
    if (sourceType !== "Manual" && !sourceId) {
      setError("Select a source record first.");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setCopied(false);

      const result = await generateDecisionSummary({
        decision_type: decisionType,
        source_type: sourceType,
        source_id: sourceId ? Number(sourceId) : null,
        ...form,
      });

      setMemo(result);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not generate decision summary.");
    } finally {
      setGenerating(false);
    }
  }

  async function copyMemo() {
    if (!memo?.memo) return;

    await navigator.clipboard.writeText(memo.memo);
    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    loadData();
  }, []);

  const options = sourceOptions();

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Decision Support
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            HR Decision Summary
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Generate formal HR decision memos from candidates, disputes,
            employee queries, missing document cases, or manual context.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {generating ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={17} />
              Generate Memo
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="mb-5 grid grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Candidates</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {candidates.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Disputes</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {disputes.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Queries</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {queries.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Missing Docs</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {missingDocs.length}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-[420px_1fr] gap-5">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ScrollText size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Memo Setup
              </h2>
              <p className="text-sm text-slate-500">
                Select decision type and source context.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Decision Type
              </label>
              <select
                value={decisionType}
                onChange={(event) => setDecisionType(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                {decisionTypes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(event) => handleSourceTypeChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                {sourceTypes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            {sourceType !== "Manual" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Source Record
                </label>
                <select
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                  disabled={loadingData}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                >
                  <option value="">
                    {loadingData ? "Loading records..." : "Select source record"}
                  </option>
                  {options.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Person Name
                </label>
                <input
                  value={form.person_name}
                  onChange={(event) => updateForm("person_name", event.target.value)}
                  placeholder="Used for manual source"
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Role / Category
                </label>
                <input
                  value={form.role_or_category}
                  onChange={(event) => updateForm("role_or_category", event.target.value)}
                  placeholder="Frontend / Attendance / Leave"
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Situation
              </label>
              <textarea
                value={form.situation}
                onChange={(event) => updateForm("situation", event.target.value)}
                rows={4}
                placeholder="Manual context or override notes..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Evidence
              </label>
              <textarea
                value={form.evidence}
                onChange={(event) => updateForm("evidence", event.target.value)}
                rows={4}
                placeholder="Manual evidence, policy clause, attendance record, interview notes..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Recommendation Override
              </label>
              <textarea
                value={form.recommendation}
                onChange={(event) => updateForm("recommendation", event.target.value)}
                rows={3}
                placeholder="Optional. Leave blank to auto-generate."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Reviewer
              </label>
              <input
                value={form.reviewer_name}
                onChange={(event) => updateForm("reviewer_name", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {generating ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BadgeCheck size={17} />
                  Generate Decision Memo
                </>
              )}
            </button>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Decision Memo
              </h2>
              <p className="text-sm text-slate-500">
                Formal summary for HR review and documentation.
              </p>
            </div>

            {memo && (
              <button
                onClick={copyMemo}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Clipboard size={16} />
                {copied ? "Copied" : "Copy Memo"}
              </button>
            )}
          </div>

          {!memo ? (
            <div className="flex h-[820px] flex-col items-center justify-center px-8 text-center">
              <FileText size={42} className="mb-3 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">
                No decision memo generated yet
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Select a source or enter manual context, then generate a formal
                HR decision summary.
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
                      <BriefcaseBusiness size={24} />
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">
                        {memo.title}
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        {memo.decision_type} • {memo.person_name}
                      </p>
                    </div>
                  </div>

                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskStyle(memo.risk_level)}`}>
                    Risk: {memo.risk_level}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <BadgeCheck size={18} className="text-blue-600" />
                  <h3 className="text-base font-semibold text-slate-950">
                    Recommendation
                  </h3>
                </div>

                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {memo.recommendation}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {memo.sections.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <h3 className="mb-3 text-base font-semibold text-slate-950">
                      {section.title}
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <label className="mb-3 block text-base font-semibold text-slate-950">
                  Full Memo
                </label>

                <textarea
                  value={memo.memo}
                  onChange={(event) =>
                    setMemo({
                      ...memo,
                      memo: event.target.value,
                    })
                  }
                  rows={28}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-6 text-yellow-800">
                This is a decision-support memo. HR should verify evidence,
                policy applicability, and management approval before final use.
              </div>
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
