"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import TaskAutofillBanner from "@/components/communications/TaskAutofillBanner";
import { getWorkspaces } from "@/api/workspaceApi";
import { getInterviewEligibleCandidates } from "@/api/candidateApi";
import { getJobDescriptionDocuments } from "@/api/jdApi";
import { generateInterviewPack } from "@/api/interviewApi";
import { completeCommunicationTask } from "@/api/communicationApi";
import {
  BadgeCheck,
  Bot,
  CheckCircle2,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  Loader2,
  MessageSquareText,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

const defaultJd = `Frontend Developer Job Description

Required Skills:
React, Next.js, JavaScript, Tailwind CSS, REST API integration, Git.

Preferred Skills:
TypeScript, dashboard UI, charting libraries, authentication, SaaS product experience.`;

function InterviewAssistantPageContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task_id");
  const taskCandidateId = searchParams.get("candidate_id");

  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState("");

  const [jdDocuments, setJdDocuments] = useState([]);
  const [jdDocumentId, setJdDocumentId] = useState("");
  const [jdText, setJdText] = useState(defaultJd);

  const [interviewPack, setInterviewPack] = useState(null);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedCandidate = useMemo(() => {
    return candidates.find((candidate) => String(candidate.id) === String(candidateId));
  }, [candidates, candidateId]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [workspaceData, candidateData, jdData] = await Promise.all([
        getWorkspaces(),
        getInterviewEligibleCandidates(),
        getJobDescriptionDocuments(),
      ]);

      setWorkspaces(workspaceData);
      setCandidates(candidateData);
      setJdDocuments(jdData);

      if (taskCandidateId && candidateData.some((candidate) => String(candidate.id) === String(taskCandidateId))) {
        setCandidateId(String(taskCandidateId));
      } else if (candidateData.length > 0) {
        setCandidateId(String(candidateData[0].id));
      }
    } catch (err) {
      setError("Failed to load interview assistant data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    setCandidateId("");
    setInterviewPack(null);

    try {
      const [candidateData, jdData] = await Promise.all([
        getInterviewEligibleCandidates(value),
        getJobDescriptionDocuments(value),
      ]);

      setCandidates(candidateData);
      setJdDocuments(jdData);

      if (taskCandidateId && candidateData.some((candidate) => String(candidate.id) === String(taskCandidateId))) {
        setCandidateId(String(taskCandidateId));
      } else if (candidateData.length > 0) {
        setCandidateId(String(candidateData[0].id));
      }
    } catch (err) {
      setError("Failed to filter workspace data.");
    }
  }

  function handleJdDocumentChange(event) {
    const value = event.target.value;
    setJdDocumentId(value);

    const selected = jdDocuments.find((doc) => String(doc.id) === String(value));

    if (selected?.text) {
      setJdText(selected.text);
    }
  }

  async function handleGenerate() {
    if (!candidateId) {
      setError("Select a parsed candidate first.");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setNotice("");

      const result = await generateInterviewPack({
        candidateId,
        jdText,
      });

      setInterviewPack(result);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Could not generate interview pack."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function markTaskComplete() {
    if (!taskId) return;

    try {
      await completeCommunicationTask(taskId);
      setCompleted(true);
      setNotice("Interview pack task marked completed.");
    } catch (err) {
      setError("Could not mark interview task completed.");
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <AppShell>
      <TaskAutofillBanner surface="interview assistant" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Candidate Evaluation
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Interview Assistant
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Generate candidate-specific interview questions, resume verification
            prompts, project deep-dives, gap checks, HR questions, and a scoring
            rubric.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !candidateId}
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
              Generate Interview Pack
            </>
          )}
        </button>
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

      <section className="mb-5 grid grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Candidates</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {candidates.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">JD Documents</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {jdDocuments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Question Sections</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {interviewPack?.sections?.length || 5}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Mode</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">
            Rule
          </p>
        </div>
      </section>

      <section className="grid grid-cols-[420px_1fr] gap-5">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <UserRoundCheck size={20} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Interview Setup
                </h2>
                <p className="text-sm text-slate-500">
                  Select candidate and role context.
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
                  Candidate
                </label>
                <select
                  value={candidateId}
                  onChange={(event) => {
                    setCandidateId(event.target.value);
                    setInterviewPack(null);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Select parsed candidate</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} - {candidate.current_role || "Unknown role"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCandidate && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    {selectedCandidate.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedCandidate.current_role || "Role not detected"}
                  </p>
                  <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-500">
                    {selectedCandidate.summary || "No summary available."}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Load Uploaded JD
                </label>
                <select
                  value={jdDocumentId}
                  onChange={handleJdDocumentChange}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Use manual JD text</option>
                  {jdDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  JD / Role Context
                </label>
                <textarea
                  value={jdText}
                  onChange={(event) => setJdText(event.target.value)}
                  rows={12}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !candidateId}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {generating ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    Generate Interview Pack
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Generated Interview Pack
              </h2>
              <p className="text-sm text-slate-500">
                Questions and scorecard for structured evaluation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {taskId && interviewPack && (
                <button
                  onClick={markTaskComplete}
                  disabled={completed}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <CheckCircle2 size={16} />
                  {completed ? "Task Completed" : "Mark Task Complete"}
                </button>
              )}

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                <Bot size={16} />
                Interview Agent
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-[640px] items-center justify-center text-slate-500">
              <Loader2 size={22} className="mr-2 animate-spin" />
              Loading data...
            </div>
          ) : !interviewPack ? (
            <div className="flex h-[640px] flex-col items-center justify-center px-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <MessageSquareText size={28} />
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                No interview pack generated yet
              </h3>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Parse candidates first, select one, add JD context, then
                generate interview questions and a scorecard.
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <UserRoundCheck size={22} />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {interviewPack.candidate_name}
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      {interviewPack.role || "Role not detected"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {interviewPack.summary}
                    </p>
                  </div>
                </div>
              </div>

              {interviewPack.sections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <MessageSquareText size={18} className="text-blue-600" />
                    <h3 className="text-base font-semibold text-slate-950">
                      {section.title}
                    </h3>
                  </div>

                  <ol className="space-y-3">
                    {section.questions.map((question, index) => (
                      <li
                        key={question}
                        className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                      >
                        <span className="mr-2 font-semibold text-blue-600">
                          Q{index + 1}.
                        </span>
                        {question}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-600" />
                  <h3 className="text-base font-semibold text-slate-950">
                    Interview Scorecard
                  </h3>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Criterion</th>
                        <th className="px-4 py-3">What to Check</th>
                        <th className="px-4 py-3 text-right">Max Score</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {interviewPack.scorecard.map((item) => (
                        <tr key={item.criterion}>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <BadgeCheck size={15} className="text-blue-600" />
                              {item.criterion}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm leading-6 text-slate-600">
                            {item.what_to_check}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {item.max_score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <BriefcaseBusiness size={17} className="text-blue-600" />
                  Total score: 100. Use this as interviewer guidance, not an
                  automatic hiring decision.
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}





export default function InterviewAssistantPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading interview assistant...</div>}>
      <InterviewAssistantPageContent />
    </Suspense>
  );
}
