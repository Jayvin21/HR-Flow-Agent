"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getWorkspaces } from "@/api/workspaceApi";
import {
  getCandidates,
  parseResumes,
  updateCandidateStatus,
  reparseCandidates,
  deleteCandidate,
} from "@/api/candidateApi";
import {
  BriefcaseBusiness,
  Filter,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

const statuses = ["All", "New", "Shortlisted", "Hired", "Rejected"];

function statusStyle(status) {
  if (status === "Hired") return "bg-emerald-50 text-emerald-700";
  if (status === "Shortlisted") return "bg-blue-50 text-blue-700";
  if (status === "Rejected") return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function normalizeSkills(skills) {
  if (!skills) return [];

  if (Array.isArray(skills)) {
    return skills.filter(Boolean);
  }

  return String(skills)
    .split(/,|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function displayName(candidate) {
  const name =
    candidate.name ||
    candidate.candidate_name ||
    candidate.full_name ||
    "Unknown Candidate";

  return name;
}

function initials(name) {
  const clean = String(name || "Unknown Candidate").trim();

  if (!clean || clean === "Unknown Candidate") {
    return "UC";
  }

  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function valueOrFallback(value, fallback = "Not detected.") {
  if (!value) return fallback;

  const text = String(value).trim();

  if (!text || text.toLowerCase() === "not detected") {
    return fallback;
  }

  return text;
}

export default function CandidatesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortMode, setSortMode] = useState("Newest");
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadWorkspaces() {
    try {
      const result = await getWorkspaces();

      const list = Array.isArray(result)
        ? result
        : result?.workspaces || result?.data || [];

      setWorkspaces(list);
    } catch (err) {
      console.error("Could not load workspaces", err);
      setWorkspaces([]);
    }
  }

  async function loadCandidates(selectedWorkspace = workspaceId) {
    try {
      setLoading(true);
      setError("");

      let result;

      try {
        result = await getCandidates(selectedWorkspace);
      } catch {
        result = await getCandidates({ workspaceId: selectedWorkspace });
      }

      const list = Array.isArray(result)
        ? result
        : result?.candidates || result?.data || [];

      setCandidates(list);
    } catch (err) {
      console.error(err);
      setError("Could not load candidates.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleParseResumes() {
    try {
      setParsing(true);
      setNotice("");
      setError("");

      let result;

      try {
        result = await parseResumes(workspaceId);
      } catch {
        result = await parseResumes({ workspaceId });
      }

      setNotice(
        `Resume parsing completed. Created: ${result?.created ?? 0}. Skipped: ${result?.skipped ?? 0}.`
      );

      await loadCandidates(workspaceId);
    } catch (err) {
      console.error(err);
      setError("Resume parsing failed. Check backend terminal.");
    } finally {
      setParsing(false);
    }
  }

  async function handleReparseCandidates() {
    try {
      setReparsing(true);
      setNotice("");
      setError("");

      const result = await reparseCandidates(workspaceId);

      setNotice(
        `Candidate reparse completed. Reparsed: ${result?.reparsed ?? 0}. Skipped: ${result?.skipped ?? 0}.`
      );

      await loadCandidates(workspaceId);
    } catch (err) {
      console.error(err);
      setError("Candidate reparse failed. Check backend terminal.");
    } finally {
      setReparsing(false);
    }
  }

  async function handleDeleteCandidate(candidateId, candidateName) {
    const confirmed = window.confirm(
      `Delete ${candidateName || "this candidate"}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");
      await deleteCandidate(candidateId);

      setCandidates((prev) =>
        prev.filter((candidate) => candidate.id !== candidateId)
      );

      setNotice("Candidate deleted.");
    } catch (err) {
      console.error(err);
      setError("Could not delete candidate.");
    }
  }

  async function handleStatusChange(candidateId, status) {
    try {
      setError("");

      await updateCandidateStatus(candidateId, status);

      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate.id === candidateId
            ? { ...candidate, recruitment_status: status }
            : candidate
        )
      );
    } catch (err) {
      console.error(err);
      setError("Could not update candidate status.");
    }
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    await loadCandidates(value);
  }

  const filteredCandidates = useMemo(() => {
    let list = [...candidates];

    if (statusFilter !== "All") {
      list = list.filter(
        (candidate) =>
          (candidate.recruitment_status || "New") === statusFilter
      );
    }

    if (sortMode === "Name") {
      list.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    }

    if (sortMode === "Status") {
      list.sort((a, b) =>
        String(a.recruitment_status || "New").localeCompare(
          String(b.recruitment_status || "New")
        )
      );
    }

    if (sortMode === "Newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }

    return list;
  }, [candidates, statusFilter, sortMode]);

  const stats = useMemo(() => {
    const total = candidates.length;

    const count = (status) =>
      candidates.filter(
        (candidate) => (candidate.recruitment_status || "New") === status
      ).length;

    const skillSet = new Set();

    candidates.forEach((candidate) => {
      normalizeSkills(candidate.skills).forEach((skill) =>
        skillSet.add(skill.toLowerCase())
      );
    });

    return {
      total,
      newCount: count("New"),
      shortlisted: count("Shortlisted"),
      hired: count("Hired"),
      rejected: count("Rejected"),
      uniqueSkills: skillSet.size,
    };
  }, [candidates]);

  useEffect(() => {
    loadWorkspaces();
    loadCandidates("");
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Candidate Intelligence
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Candidates
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Parse resumes into candidate profiles, filter by recruitment status,
            and keep hired/rejected candidates from polluting the active hiring queue.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => loadCandidates(workspaceId)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            onClick={handleReparseCandidates}
            disabled={reparsing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {reparsing ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Reparsing...
              </>
            ) : (
              <>
                <RotateCcw size={17} />
                Reparse Candidates
              </>
            )}
          </button>

          <button
            onClick={handleParseResumes}
            disabled={parsing}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {parsing ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Parse Resumes
              </>
            )}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="mb-5 grid grid-cols-5 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Candidates</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {stats.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">New</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {stats.newCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Shortlisted</p>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {stats.shortlisted}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Hired</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">
            {stats.hired}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Unique Skills</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {stats.uniqueSkills}
          </p>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-blue-600" />
          <h2 className="text-base font-semibold text-slate-950">Filters</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Workspace
            </label>
            <select
              value={workspaceId}
              onChange={handleWorkspaceChange}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
              Recruitment Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Sort By
            </label>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option>Newest</option>
              <option>Name</option>
              <option>Status</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Parsed Candidate Profiles
            </h2>
            <p className="text-sm text-slate-500">
              {filteredCandidates.length} candidate
              {filteredCandidates.length === 1 ? "" : "s"} shown
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center text-slate-500">
            <Loader2 size={22} className="mr-2 animate-spin" />
            Loading candidates...
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <BriefcaseBusiness size={24} />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              No candidates found
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Upload resume documents, select the workspace, then parse resumes
              to generate candidate profiles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 p-5">
            {filteredCandidates.map((candidate) => {
              const name = displayName(candidate);
              const skills = normalizeSkills(candidate.skills);
              const status = candidate.recruitment_status || "New";

              return (
                <article
                  key={candidate.id}
                  className="rounded-2xl border border-slate-200 p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-base font-bold text-blue-700">
                        {initials(name)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">
                            {name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                          {candidate.role ||
                            candidate.current_role ||
                            candidate.summary ||
                            "Role not detected"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCandidate(candidate.id, name)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete candidate"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      <Mail size={15} />
                      <span className="truncate">
                        {candidate.email || "No email"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      <Phone size={15} />
                      <span className="truncate">
                        {candidate.phone || "No phone"}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Recruitment Status
                    </label>
                    <select
                      value={status}
                      onChange={(event) =>
                        handleStatusChange(candidate.id, event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      <option>New</option>
                      <option>Shortlisted</option>
                      <option>Hired</option>
                      <option>Rejected</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-sm font-semibold text-slate-950">
                      Skills
                    </p>

                    {skills.length === 0 ? (
                      <p className="text-sm text-slate-500">No skills detected.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {skills.slice(0, 16).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm leading-6 text-slate-600">
                      {candidate.summary ||
                        `${name} candidate profile parsed from resume.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <BriefcaseBusiness size={15} className="text-blue-600" />
                        <p className="text-sm font-semibold text-slate-950">
                          Experience
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        {valueOrFallback(candidate.experience)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <GraduationCap size={15} className="text-blue-600" />
                        <p className="text-sm font-semibold text-slate-950">
                          Education
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        {valueOrFallback(candidate.education)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-400">
                      Source:{" "}
                      {candidate.source_filename ||
                        candidate.filename ||
                        candidate.document_name ||
                        "Resume document"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}



