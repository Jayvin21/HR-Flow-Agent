"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
} from "@/api/workspaceApi";
import {
  BriefcaseBusiness,
  FolderKanban,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Hiring",
  });

  async function loadWorkspaces() {
    try {
      setLoading(true);
      setError("");
      const data = await getWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      setError("Failed to load workspaces. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWorkspace(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Workspace name is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createWorkspace({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
      });

      setForm({
        name: "",
        description: "",
        category: "Hiring",
      });

      await loadWorkspaces();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Could not create workspace. Try a different name."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteWorkspace(workspaceId) {
    try {
      setError("");
      await deleteWorkspace(workspaceId);
      await loadWorkspaces();
    } catch (err) {
      setError("Could not delete workspace.");
    }
  }

  useEffect(() => {
    loadWorkspaces();
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Workspace Control
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Workspaces
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Create separate HR workspaces for hiring drives, policy knowledge
            bases, attendance reviews, employee queries, and disputes.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-[420px_1fr] gap-5">
        <form
          onSubmit={handleCreateWorkspace}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Create Workspace
              </h2>
              <p className="text-sm text-slate-500">
                Start a new HR workflow space.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Workspace Name
              </label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Frontend Developer Hiring"
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option>Hiring</option>
                <option>Policy</option>
                <option>Attendance</option>
                <option>Employee Queries</option>
                <option>Disputes</option>
                <option>Onboarding</option>
                <option>General</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Workspace for screening frontend developer candidates..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Create Workspace
                </>
              )}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Existing Workspaces
              </h2>
              <p className="text-sm text-slate-500">
                {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"} found
              </p>
            </div>

            <button
              onClick={loadWorkspaces}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-slate-500">
              <Loader2 size={22} className="mr-2 animate-spin" />
              Loading workspaces...
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center px-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FolderKanban size={24} />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                No workspaces yet
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create your first workspace. Later, documents, candidates,
                chats, attendance files, cases, and disputes will be grouped by
                workspace.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <BriefcaseBusiness size={21} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">
                          {workspace.name}
                        </h3>

                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {workspace.status}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {workspace.category}
                        </span>
                      </div>

                      <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        {workspace.description || "No description added."}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Created:{" "}
                        {new Date(workspace.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteWorkspace(workspace.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Delete workspace"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
