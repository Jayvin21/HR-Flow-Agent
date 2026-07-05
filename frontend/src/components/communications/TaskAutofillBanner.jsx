"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Clipboard, CheckCircle2 } from "lucide-react";
import { completeCommunicationTask } from "@/api/communicationApi";

export default function TaskAutofillBanner({ surface = "generator" }) {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [completed, setCompleted] = useState(false);

  const taskId = searchParams.get("task_id");
  const template = searchParams.get("template");
  const recipientName = searchParams.get("recipient_name");
  const recipientEmail = searchParams.get("recipient_email");
  const context = searchParams.get("context");

  if (!taskId) {
    return null;
  }

  async function copyContext() {
    await navigator.clipboard.writeText(context || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function markComplete() {
    await completeCommunicationTask(taskId);
    setCompleted(true);
  }

  return (
    <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Queue Autofill
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Loaded task for this {surface}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Template: <span className="font-semibold">{template || "Not set"}</span>
            {recipientName ? ` • Recipient: ${recipientName}` : ""}
            {recipientEmail ? ` • ${recipientEmail}` : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyContext}
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            <Clipboard size={15} />
            {copied ? "Copied" : "Copy Context"}
          </button>

          <button
            onClick={markComplete}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={15} />
            {completed ? "Completed" : "Mark Complete"}
          </button>
        </div>
      </div>

      <textarea
        readOnly
        value={context || ""}
        rows={7}
        className="w-full resize-none rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none"
      />
    </div>
  );
}
