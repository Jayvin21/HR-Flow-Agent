"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getWorkspaces } from "@/api/workspaceApi";
import { getJdDocuments, matchJd } from "@/api/jdApi";
import { updateCandidateStatus } from "@/api/candidateApi";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  GitCompare,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

function scoreStyle(score) {
  if (score >= 85) return "bg-emerald-50 text-emerald-700";
  if (score >= 70) return "bg-blue-50 text-blue-700";
  if (score >= 55) return "bg-orange-50 text-orange-700";
  return "bg-red-50 text-red-700";
}

function statusStyle(status) {
  if (status === "Hired") return "bg-emerald-50 text-emerald-700";
  if (status === "Shortlisted") return "bg-blue-50 text-blue-700";
  if (status === "Rejected") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

export default function JdMatcherPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [jdDocuments, setJdDocuments] = useState([]);
  const [selectedJdId, setSelectedJdId] = useState("");
  const [jdText, setJdText] = useState("");

  const [matchResult, setMatchResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [minScore, setMinScore] = useState("0");

  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filteredMatches = useMemo(() => {
    const matches = matchResult?.matches || [];
    const min = Number(minScore || 0);

    return matches.filter((match) => {
      const scoreOk = match.match_score >= min;
      const statusOk =
        statusFilter === "All" ||
        match.recruitment_status === statusFilter;

      return scoreOk && statusOk;
    });
  }, [matchResult, statusFilter, minScore]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [workspaceData, jdData] = await Promise.all([
        getWorkspaces(),
        getJdDocuments(),
      ]);

      setWorkspaces(workspaceData);
      setJdDocuments(jdData);
    } catch (err) {
      setError("Failed to load JD matcher data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    setSelectedJdId("");
    setJdText("");
    setMatchResult(null);

    try {
      const data = await getJdDocuments(value);
      setJdDocuments(data);
    } catch (err) {
      setError("Failed to load JD documents.");
    }
  }

  function handleJdSelect(event) {
    const id = event.target.value;
    setSelectedJdId(id);

    const doc = jdDocuments.find((item) => String(item.id) === String(id));

    if (doc) {
      setJdText(doc.extracted_text || doc.text_preview || "");
    }
  }

  async function handleMatch() {
    if (!jdText.trim()) {
      setError("Paste JD text or select an uploaded JD document.");
      return;
    }

    try {
      setMatching(true);
      setError("");
      setNotice("");

      const result = await matchJd({
        workspaceId,
        jdText,
      });

      setMatchResult(result);
      setNotice(`Matched ${result.total_candidates} active candidate(s).`);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not match JD.");
    } finally {
      setMatching(false);
    }
  }

  async function handleCandidateStatus(candidateId, status) {
    try {
      setError("");
      await updateCandidateStatus(candidateId, status);

      setMatchResult((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          matches: prev.matches.map((match) =>
            match.candidate_id === candidateId
              ? { ...match, recruitment_status: status }
              : match
          ),
        };
      });

      setNotice(`Candidate marked as ${status}.`);
    } catch (err) {
      setError("Could not update candidate status.");
    }
  }

  function clearResults() {
    setMatchResult(null);
    setNotice("Match queue cleared.");
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Recruitment Decisioning
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            JD Matcher
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Match active candidates to a job description, then shortlist, reject,
            or hire directly from the match queue.
          </p>
        </div>

        <div className="flex gap-3">
          {matchResult && (
            <button
              onClick={clearResults}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
            >
              <Trash2 size={17} />
              Clear Queue
            </button>
          )}

          <button
            onClick={handleMatch}
            disabled={matching}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {matching ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Matching...
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Run Match
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

      <section className="mb-5 grid grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Candidates Matched</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {matchResult?.total_candidates || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Average Score</p>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {matchResult?.average_score || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Required Skills</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {matchResult?.jd_required_skills?.length || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Shown</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {filteredMatches.length}
          </p>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-[420px_1fr] gap-5">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <GitCompare size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                JD Input
              </h2>
              <p className="text-sm text-slate-500">
                Select uploaded JD or paste manually.
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
                Uploaded JD
              </label>
              <select
                value={selectedJdId}
                onChange={handleJdSelect}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Manual JD / select uploaded JD</option>
                {jdDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.filename}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                JD Text
              </label>
              <textarea
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
                rows={14}
                placeholder="Paste job description here..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <button
              onClick={handleMatch}
              disabled={matching}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {matching ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  <BadgeCheck size={17} />
                  Match Candidates
                </>
              )}
            </button>
          </div>
        </aside>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <RefreshCcw size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Match Filters
              </h2>
              <p className="text-sm text-slate-500">
                Filter current match queue.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Candidate Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option>All</option>
                <option>New</option>
                <option>Shortlisted</option>
                <option>Rejected</option>
                <option>Hired</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Minimum Score
              </label>
              <select
                value={minScore}
                onChange={(event) => setMinScore(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="0">All scores</option>
                <option value="40">40+</option>
                <option value="55">55+</option>
                <option value="70">70+</option>
                <option value="85">85+</option>
              </select>
            </div>
          </div>

          {matchResult?.jd_required_skills?.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-slate-800">
                Required Skills Detected
              </p>
              <div className="flex flex-wrap gap-2">
                {matchResult.jd_required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
            Rejected and hired candidates are excluded from new matching results
            by default. They still remain visible in the Candidates tab.
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Match Queue
            </h2>
            <p className="text-sm text-slate-500">
              {filteredMatches.length} candidate{filteredMatches.length === 1 ? "" : "s"} shown
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-80 items-center justify-center text-slate-500">
            <Loader2 size={22} className="mr-2 animate-spin" />
            Loading matcher...
          </div>
        ) : !matchResult ? (
          <div className="flex h-80 flex-col items-center justify-center px-8 text-center">
            <FileText size={40} className="mb-3 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">
              No match run yet
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Select or paste a JD, then run matching to create an actionable
              recruitment queue.
            </p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center px-8 text-center">
            <UserRound size={40} className="mb-3 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">
              No candidates match filters
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Clear filters or parse more resumes.
            </p>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {filteredMatches.map((match, index) => (
              <article
                key={match.candidate_id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
                      #{index + 1}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {match.candidate_name}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreStyle(
                            match.match_score
                          )}`}
                        >
                          {match.match_score}/100
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            match.recruitment_status
                          )}`}
                        >
                          {match.recruitment_status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {match.candidate_role || "Role not detected"}
                        {match.candidate_email ? ` • ${match.candidate_email}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {match.verdict}
                  </span>
                </div>

                <p className="mb-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {match.explanation}
                </p>

                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="mb-2 text-sm font-semibold text-emerald-800">
                      Matched Skills
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {match.matched_skills.length > 0 ? (
                        match.matched_skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-emerald-700">
                          No direct skill match detected.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="mb-2 text-sm font-semibold text-red-800">
                      Missing Skills
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {match.missing_skills.length > 0 ? (
                        match.missing_skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-red-700">
                          No missing required skills detected.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-2 text-sm font-semibold text-slate-900">
                      Strengths
                    </p>
                    <ul className="space-y-2 text-sm leading-6 text-slate-600">
                      {match.strengths.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-2 text-sm font-semibold text-slate-900">
                      Gaps
                    </p>
                    <ul className="space-y-2 text-sm leading-6 text-slate-600">
                      {match.gaps.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                  <button
                    onClick={() =>
                      handleCandidateStatus(match.candidate_id, "Shortlisted")
                    }
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <CheckCircle2 size={16} />
                    Shortlist
                  </button>

                  <button
                    onClick={() => handleCandidateStatus(match.candidate_id, "Hired")}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <BriefcaseBusiness size={16} />
                    Mark Hired
                  </button>

                  <button
                    onClick={() =>
                      handleCandidateStatus(match.candidate_id, "Rejected")
                    }
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
