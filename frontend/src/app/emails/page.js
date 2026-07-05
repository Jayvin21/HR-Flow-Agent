"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import TaskAutofillBanner from "@/components/communications/TaskAutofillBanner";
import { completeCommunicationTask } from "@/api/communicationApi";
import { generateEmailDraft } from "@/api/emailApi";
import {
  Calendar,
  CheckCircle2,
  Clipboard,
  Clock,
  Loader2,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";

const emailTypes = [
  "Interview Invite",
  "Shortlist Email",
  "Rejection Email",
  "Offer Email",
  "Missing Document Request",
  "Attendance Follow-up",
  "Policy Response",
  "Dispute Follow-up",
  "General HR Email",
];

function getTodayDate() {
  const date = new Date();
  return date.toISOString().slice(0, 10);
}

function EmailsPageContent() {
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    email_type: "General HR Email",
    recipient_name: "",
    recipient_email: "",
    role_title: "",
    interview_date: "",
    interview_time: "",
    interview_mode: "Google Meet",
    company_name: "HRFlow Demo Company",
    sender_name: "HR Team",
    context: "",
    tone: "Professional",
  });

  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const taskId = searchParams.get("task_id");

  const isInterviewType = useMemo(() => {
    return String(form.email_type || "").toLowerCase().includes("interview");
  }, [form.email_type]);

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
      "General HR Email";

    const recipientName = searchParams.get("recipient_name") || "";
    const recipientEmail = searchParams.get("recipient_email") || "";
    const context = searchParams.get("context") || "";
    const sourceType = searchParams.get("source_type") || "";

    let emailType = template;

    if (!emailTypes.includes(emailType)) {
      if (template.toLowerCase().includes("interview")) {
        emailType = "Interview Invite";
      } else if (template.toLowerCase().includes("reject")) {
        emailType = "Rejection Email";
      } else if (template.toLowerCase().includes("offer")) {
        emailType = "Offer Email";
      } else if (template.toLowerCase().includes("document")) {
        emailType = "Missing Document Request";
      } else if (template.toLowerCase().includes("attendance")) {
        emailType = "Attendance Follow-up";
      } else if (template.toLowerCase().includes("dispute")) {
        emailType = "Dispute Follow-up";
      } else if (sourceType === "Employee Query") {
        emailType = "Policy Response";
      } else {
        emailType = "General HR Email";
      }
    }

    setForm((prev) => ({
      ...prev,
      email_type: emailType,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      interview_date: prev.interview_date || getTodayDate(),
      interview_time: prev.interview_time || "11:00",
      context,
    }));
  }

  async function handleGenerate() {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const result = await generateEmailDraft({
        email_type: form.email_type,
        recipient_name: form.recipient_name,
        recipient_email: form.recipient_email,
        role_title: form.role_title,
        interview_date: form.interview_date,
        interview_time: form.interview_time,
        interview_mode: form.interview_mode,
        company_name: form.company_name,
        sender_name: form.sender_name,
        context: form.context,
        tone: form.tone,
      });

      setSubject(result.subject || `${form.email_type} - ${form.recipient_name}`);
      setDraft(result.body || result.draft || result.email || "");
      setNotice("Email draft generated.");
    } catch (err) {
      const fallbackSubject = `${form.email_type} - ${form.recipient_name || "Recipient"}`;

      const fallbackBody = [
        `Dear ${form.recipient_name || "Recipient"},`,
        "",
        buildFallbackEmailBody(form),
        "",
        "Regards,",
        form.sender_name || "HR Team",
      ].join("\n");

      setSubject(fallbackSubject);
      setDraft(fallbackBody);
      setNotice("Generated local fallback draft because backend email generator did not respond.");
    } finally {
      setLoading(false);
    }
  }

  function buildFallbackEmailBody(form) {
    const type = form.email_type;

    if (type === "Interview Invite") {
      return [
        "Thank you for your interest in the role.",
        "",
        `We would like to invite you for an interview${form.role_title ? ` for the ${form.role_title} position` : ""}.`,
        `Date: ${form.interview_date || "To be confirmed"}`,
        `Time: ${form.interview_time || "To be confirmed"}`,
        `Mode/Location: ${form.interview_mode || "To be confirmed"}`,
        "",
        "Please confirm your availability for the scheduled interview.",
        "",
        form.context ? `Context:\n${form.context}` : "",
      ].join("\n");
    }

    if (type === "Rejection Email") {
      return [
        "Thank you for taking the time to apply and participate in our hiring process.",
        "",
        "After careful review, we will not be moving forward with your application at this stage.",
        "We appreciate your interest and wish you the best in your career journey.",
      ].join("\n");
    }

    if (type === "Missing Document Request") {
      return [
        "This is a reminder to submit the pending documents required by HR.",
        "",
        form.context || "Please share the missing documents at the earliest so that your records can be completed.",
      ].join("\n");
    }

    if (type === "Attendance Follow-up") {
      return [
        "We noticed attendance irregularities that require clarification.",
        "",
        form.context || "Please review the attendance concern and provide your response.",
      ].join("\n");
    }

    return form.context || "Please review the HR update below and take the required action.";
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${draft}`);
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
      <TaskAutofillBanner surface="email generator" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Communication Generator
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Emails
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Generate queue-aware HR emails for interviews, rejections, offers, attendance, documents, and disputes.
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
              Generate Email
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
              <Mail size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Email Inputs
              </h2>
              <p className="text-sm text-slate-500">
                Queue tasks autofill these fields.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email Type
              </label>
              <select
                value={form.email_type}
                onChange={(event) => updateField("email_type", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                {emailTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Recipient Name
                </label>
                <div className="relative">
                  <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.recipient_name}
                    onChange={(event) => updateField("recipient_name", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    placeholder="Candidate / employee name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Recipient Email
                </label>
                <input
                  value={form.recipient_email}
                  onChange={(event) => updateField("recipient_email", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Role / Subject Context
              </label>
              <input
                value={form.role_title}
                onChange={(event) => updateField("role_title", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="Frontend Developer, HR Executive, etc."
              />
            </div>

            {isInterviewType && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Interview Date
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.interview_date}
                      onChange={(event) => updateField("interview_date", event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Interview Time
                  </label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      value={form.interview_time}
                      onChange={(event) => updateField("interview_time", event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {isInterviewType && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Interview Mode / Location
                </label>
                <input
                  value={form.interview_mode}
                  onChange={(event) => updateField("interview_mode", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  placeholder="Google Meet / Office / Phone"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Context / Notes
              </label>
              <textarea
                value={form.context}
                onChange={(event) => updateField("context", event.target.value)}
                rows={9}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="Task context, reason, policy notes..."
              />
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Generated Email
              </h2>
              <p className="text-sm text-slate-500">
                Review, copy, then mark queue task complete.
              </p>
            </div>

            <div className="flex gap-2">
              {draft && (
                <button
                  onClick={copyDraft}
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
                Subject
              </label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="Generated subject appears here"
              />
            </div>

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={25}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Generated email body appears here..."
            />
          </div>
        </section>
      </section>
    </AppShell>
  );
}

export default function EmailsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading email generator...</div>}>
      <EmailsPageContent />
    </Suspense>
  );
}
