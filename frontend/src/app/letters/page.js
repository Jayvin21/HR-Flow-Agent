"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import TaskAutofillBanner from "@/components/communications/TaskAutofillBanner";
import { completeCommunicationTask } from "@/api/communicationApi";
import { generateLetterDraft } from "@/api/letterApi";
import {
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Clipboard,
  FileText,
  IndianRupee,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";

const letterTypes = [
  "Offer Letter",
  "Appointment Letter",
  "Experience Letter",
  "Relieving Letter",
  "Warning Letter",
  "Salary Revision Letter",
  "Probation Confirmation Letter",
  "Leave Response Letter",
  "General HR Letter",
];

function getTodayDate() {
  const date = new Date();
  return date.toISOString().slice(0, 10);
}

function LettersPageContent() {
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    letter_type: "General HR Letter",
    employee_name: "",
    employee_email: "",
    role_title: "",
    department: "",
    joining_date: "",
    issue_date: getTodayDate(),
    salary: "",
    company_name: "HRFlow Demo Company",
    hr_name: "HR Team",
    context: "",
    tone: "Formal",
  });

  const [letter, setLetter] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const taskId = searchParams.get("task_id");

  const isOfferLike = useMemo(() => {
    const type = String(form.letter_type || "").toLowerCase();
    return type.includes("offer") || type.includes("appointment");
  }, [form.letter_type]);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function applyTaskAutofill() {
    const template =
      searchParams.get("template") ||
      searchParams.get("task_type") ||
      "General HR Letter";

    const recipientName = searchParams.get("recipient_name") || "";
    const recipientEmail = searchParams.get("recipient_email") || "";
    const context = searchParams.get("context") || "";

    let letterType = template;

    if (!letterTypes.includes(letterType)) {
      if (template.toLowerCase().includes("offer")) {
        letterType = "Offer Letter";
      } else if (template.toLowerCase().includes("appointment")) {
        letterType = "Appointment Letter";
      } else if (template.toLowerCase().includes("warning")) {
        letterType = "Warning Letter";
      } else if (template.toLowerCase().includes("relieving")) {
        letterType = "Relieving Letter";
      } else if (template.toLowerCase().includes("experience")) {
        letterType = "Experience Letter";
      } else if (template.toLowerCase().includes("salary")) {
        letterType = "Salary Revision Letter";
      } else {
        letterType = "General HR Letter";
      }
    }

    setForm((prev) => ({
      ...prev,
      letter_type: letterType,
      employee_name: recipientName,
      employee_email: recipientEmail,
      issue_date: prev.issue_date || getTodayDate(),
      context,
    }));
  }

  async function handleGenerate() {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const result = await generateLetterDraft({
        letter_type: form.letter_type,
        employee_name: form.employee_name,
        employee_email: form.employee_email,
        role_title: form.role_title,
        department: form.department,
        joining_date: form.joining_date,
        issue_date: form.issue_date,
        salary: form.salary,
        company_name: form.company_name,
        hr_name: form.hr_name,
        context: form.context,
        tone: form.tone,
      });

      setTitle(result.title || `${form.letter_type} - ${form.employee_name}`);
      setLetter(result.body || result.letter || result.draft || "");
      setNotice("Letter generated.");
    } catch (err) {
      const fallbackTitle = `${form.letter_type} - ${form.employee_name || "Employee"}`;
      const fallbackBody = buildFallbackLetter(form);

      setTitle(fallbackTitle);
      setLetter(fallbackBody);
      setNotice("Generated local fallback letter because backend letter generator did not respond.");
    } finally {
      setLoading(false);
    }
  }

  function buildFallbackLetter(form) {
    const today = form.issue_date || getTodayDate();

    if (form.letter_type === "Offer Letter") {
      return [
        `${form.company_name}`,
        `Date: ${today}`,
        "",
        `To,`,
        `${form.employee_name || "Candidate"}`,
        "",
        `Subject: Offer Letter${form.role_title ? ` for ${form.role_title}` : ""}`,
        "",
        `Dear ${form.employee_name || "Candidate"},`,
        "",
        `We are pleased to offer you the position of ${form.role_title || "the offered role"}${form.department ? ` in the ${form.department} department` : ""}.`,
        form.salary ? `Your compensation will be ${form.salary}.` : "",
        form.joining_date ? `Your expected joining date is ${form.joining_date}.` : "",
        "",
        form.context || "Further employment terms will be communicated separately.",
        "",
        "Regards,",
        form.hr_name || "HR Team",
      ].filter(Boolean).join("\n");
    }

    if (form.letter_type === "Warning Letter") {
      return [
        `${form.company_name}`,
        `Date: ${today}`,
        "",
        `To,`,
        `${form.employee_name || "Employee"}`,
        "",
        "Subject: Warning Letter",
        "",
        `Dear ${form.employee_name || "Employee"},`,
        "",
        form.context || "This letter is issued regarding a matter requiring immediate correction and compliance with company policy.",
        "",
        "You are expected to take corrective action immediately.",
        "",
        "Regards,",
        form.hr_name || "HR Team",
      ].join("\n");
    }

    return [
      `${form.company_name}`,
      `Date: ${today}`,
      "",
      `To,`,
      `${form.employee_name || "Employee"}`,
      "",
      `Subject: ${form.letter_type}`,
      "",
      `Dear ${form.employee_name || "Employee"},`,
      "",
      form.context || "This letter is issued for official HR records.",
      "",
      "Regards,",
      form.hr_name || "HR Team",
    ].join("\n");
  }

  async function copyLetter() {
    await navigator.clipboard.writeText(`${title}\n\n${letter}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function markTaskComplete() {
    if (!taskId) return;

    await completeCommunicationTask(taskId);
    setCompleted(true);
    setNotice("Queue task marked completed.");
  }

  useEffect(() => {
    if (taskId) {
      applyTaskAutofill();
    }
  }, [taskId]);

  return (
    <AppShell>
      <TaskAutofillBanner surface="letter generator" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            HR Document Generator
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Letters
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Generate queue-aware HR letters for offers, appointments, warnings, relieving, experience, salary revision, and more.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={17} />
              Generate Letter
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

      <section className="grid grid-cols-[430px_1fr] gap-5">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Letter Inputs
              </h2>
              <p className="text-sm text-slate-500">
                Queue tasks autofill these fields.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Letter Type
              </label>
              <select
                value={form.letter_type}
                onChange={(event) => updateField("letter_type", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                {letterTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Employee / Candidate Name
              </label>
              <div className="relative">
                <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.employee_name}
                  onChange={(event) => updateField("employee_name", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  placeholder="Name"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                value={form.employee_email}
                onChange={(event) => updateField("employee_email", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Role / Designation
              </label>
              <div className="relative">
                <BriefcaseBusiness size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.role_title}
                  onChange={(event) => updateField("role_title", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  placeholder="Software Engineer, HR Executive..."
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Department
              </label>
              <input
                value={form.department}
                onChange={(event) => updateField("department", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="Engineering, HR, Sales..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {isOfferLike && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Joining Date
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.joining_date}
                      onChange={(event) => updateField("joining_date", event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Issue Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(event) => updateField("issue_date", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>
            </div>

            {isOfferLike && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Salary / CTC
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.salary}
                    onChange={(event) => updateField("salary", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    placeholder="₹8,00,000 CTC"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Context / Notes
              </label>
              <textarea
                value={form.context}
                onChange={(event) => updateField("context", event.target.value)}
                rows={8}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="Task context, employment details, HR notes..."
              />
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Generated Letter
              </h2>
              <p className="text-sm text-slate-500">
                Review, copy, then mark queue task complete.
              </p>
            </div>

            <div className="flex gap-2">
              {letter && (
                <button
                  onClick={copyLetter}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Clipboard size={15} />
                  {copied ? "Copied" : "Copy"}
                </button>
              )}

              {taskId && (
                <button
                  onClick={markTaskComplete}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={15} />
                  {completed ? "Completed" : "Mark Complete"}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="Generated letter title appears here"
              />
            </div>

            <textarea
              value={letter}
              onChange={(event) => setLetter(event.target.value)}
              rows={25}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Generated letter appears here..."
            />
          </div>
        </section>
      </section>
    </AppShell>
  );
}

export default function LettersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading letter generator...</div>}>
      <LettersPageContent />
    </Suspense>
  );
}
