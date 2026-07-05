"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { getWorkspaces } from "@/api/workspaceApi";
import {
  completeCommunicationTask,
  deleteCommunicationTask,
  getCommunicationQueue,
  reopenCommunicationTask,
  syncCommunicationQueue,
} from "@/api/communicationApi";
import {
  CheckCircle2,
  Clipboard,
  FileText,
  Loader2,
  Mail,
  RefreshCcw,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";

const channels = ["All", "Email", "Letter", "Interview"];
const statuses = ["All", "Pending", "Completed"];

function priorityStyle(priority) {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Low") return "bg-emerald-50 text-emerald-700";
  return "bg-orange-50 text-orange-700";
}

function statusStyle(status) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
}

function channelIcon(channel) {
  if (channel === "Letter") return FileText;
  if (channel === "Interview") return Clipboard;
  return Mail;
}

function destinationPath(task) {
  if (!task) return "/communications";

  const params = new URLSearchParams();

  params.set("task_id", task.id);
  params.set("source_type", task.source_type || "");
  params.set("source_id", task.source_id || "");
  params.set("recipient_name", task.recipient_name || "");
  params.set("recipient_email", task.recipient_email || "");
  params.set("template", task.suggested_template || task.task_type || "");
  params.set("context", task.context || "");

  if (task.channel === "Letter") {
    return `/letters?${params.toString()}`;
  }

  if (task.channel === "Interview") {
    params.set("candidate_id", task.source_id || "");
    return `/interview-assistant?${params.toString()}`;
  }

  return `/emails?${params.toString()}`;
}

export default function CommunicationsPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [channel, setChannel] = useState("All");
  const [status, setStatus] = useState("Pending");

  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    emails: 0,
    letters: 0,
  });

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const pendingTasks = useMemo(
    () => (Array.isArray(tasks) ? tasks : []).filter((task) => task.status === "Pending"),
    [tasks]
  );

  async function loadWorkspaces() {
    const data = await getWorkspaces();
    setWorkspaces(data);
  }

  async function loadQueue({
    selectedChannel = channel,
    selectedStatus = status,
    selectedWorkspace = workspaceId,
  } = {}) {
    try {
      setLoading(true);
      setError("");

      const data = await getCommunicationQueue({
        channel: selectedChannel,
        status: selectedStatus,
        workspaceId: selectedWorkspace,
      });

      setSummary(data.summary);
      setTasks(data.tasks);
      setSelectedTask(data.tasks[0] || null);
    } catch (err) {
      setError("Failed to load communication queue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      setNotice("");
      setError("");

      const result = await syncCommunicationQueue();
      setNotice(`${result.message} Created: ${result.created}.`);
      await loadQueue();
    } catch (err) {
      setError("Failed to sync communication queue.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleComplete(taskId) {
    try {
      await completeCommunicationTask(taskId);
      setNotice("Task marked completed.");
      await loadQueue();
    } catch (err) {
      setError("Could not complete task.");
    }
  }

  async function handleReopen(taskId) {
    try {
      await reopenCommunicationTask(taskId);
      setNotice("Task reopened.");
      await loadQueue();
    } catch (err) {
      setError("Could not reopen task.");
    }
  }

  async function handleDelete(taskId) {
    try {
      await deleteCommunicationTask(taskId);
      setNotice("Task deleted.");
      await loadQueue();
    } catch (err) {
      setError("Could not delete task.");
    }
  }

  async function copyContext() {
    if (!selectedTask?.context) return;

    await navigator.clipboard.writeText(selectedTask.context);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleWorkspaceChange(event) {
    const value = event.target.value;
    setWorkspaceId(value);
    await loadQueue({ selectedWorkspace: value });
  }

  async function handleChannelChange(event) {
    const value = event.target.value;
    setChannel(value);
    await loadQueue({ selectedChannel: value });
  }

  async function handleStatusChange(event) {
    const value = event.target.value;
    setStatus(value);
    await loadQueue({ selectedStatus: value });
  }

  useEffect(() => {
    loadWorkspaces();
    loadQueue();
  }, []);

  const SelectedIcon = channelIcon(selectedTask?.channel);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            HR Execution Queue
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Communications
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Pending emails and letters generated from recruitment, cases,
            disputes, and document workflows.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {syncing ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCcw size={17} />
              Sync Queue
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

      <section className="mb-5 grid grid-cols-5 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending</p>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {summary.pending}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">
            {summary.completed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Emails</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {summary.emails}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Letters</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {summary.letters}
          </p>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-4">
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
              Channel
            </label>
            <select
              value={channel}
              onChange={handleChannelChange}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              {channels.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={handleStatusChange}
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[430px_1fr] gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">
              Queue
            </h2>
            <p className="text-sm text-slate-500">
              {tasks.length} task{tasks.length === 1 ? "" : "s"} shown
            </p>
          </div>

          {loading ? (
            <div className="flex h-96 items-center justify-center text-slate-500">
              <Loader2 size={22} className="mr-2 animate-spin" />
              Loading queue...
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex h-96 flex-col items-center justify-center px-8 text-center">
              <Send size={40} className="mb-3 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">
                No communication tasks
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Click Sync Queue after shortlisting, rejecting, hiring, or
                creating HR cases.
              </p>
            </div>
          ) : (
            <div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">
              {tasks.map((task) => {
                const Icon = channelIcon(task.channel);

                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`w-full p-4 text-left transition hover:bg-slate-50 ${
                      selectedTask?.id === task.id ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-950">
                            {task.title}
                          </p>

                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityStyle(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {task.recipient_name || "No recipient"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {task.channel}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {task.task_type}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Task Details
              </h2>
              <p className="text-sm text-slate-500">
                Use this task to generate an email or letter.
              </p>
            </div>

            {selectedTask && (
              <a
                href={destinationPath(selectedTask)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open {selectedTask.channel} Generator
              </a>
            )}
          </div>

          {!selectedTask ? (
            <div className="flex h-[760px] flex-col items-center justify-center px-8 text-center">
              <Clipboard size={42} className="mb-3 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900">
                Select a task
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Task context and actions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <SelectedIcon size={24} />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-950">
                      {selectedTask.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedTask.recipient_name || "No recipient"}
                      {selectedTask.recipient_email
                        ? ` • ${selectedTask.recipient_email}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Channel</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedTask.channel}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Task Type</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedTask.task_type}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Source</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedTask.source_type}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedTask.status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-950">
                    Context for Generator
                  </h3>

                  <button
                    onClick={copyContext}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Clipboard size={15} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <textarea
                  value={selectedTask.context || ""}
                  onChange={(event) =>
                    setSelectedTask({
                      ...selectedTask,
                      context: event.target.value,
                    })
                  }
                  rows={16}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedTask.status === "Pending" ? (
                  <button
                    onClick={() => handleComplete(selectedTask.id)}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={17} />
                    Mark Completed
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopen(selectedTask.id)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <RotateCcw size={17} />
                    Reopen
                  </button>
                )}

                <button
                  onClick={() => handleDelete(selectedTask.id)}
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={17} />
                  Delete Task
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}






