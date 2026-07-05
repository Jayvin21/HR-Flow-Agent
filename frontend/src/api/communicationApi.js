import { api } from "@/lib/api";

const emptyQueue = {
  summary: {
    total: 0,
    pending: 0,
    completed: 0,
    emails: 0,
    letters: 0,
    interviews: 0,
  },
  tasks: [],
};

function normalizeQueue(data) {
  if (Array.isArray(data)) {
    return {
      ...emptyQueue,
      summary: {
        ...emptyQueue.summary,
        total: data.length,
        pending: data.filter((task) => task.status === "Pending").length,
        completed: data.filter((task) => task.status === "Completed").length,
        emails: data.filter((task) => task.channel === "Email").length,
        letters: data.filter((task) => task.channel === "Letter").length,
        interviews: data.filter((task) => task.channel === "Interview").length,
      },
      tasks: data,
    };
  }

  const tasks = Array.isArray(data?.tasks)
    ? data.tasks
    : Array.isArray(data?.queue)
      ? data.queue
      : Array.isArray(data?.items)
        ? data.items
        : [];

  return {
    summary: {
      ...emptyQueue.summary,
      ...(data?.summary || {}),
      total: data?.summary?.total ?? tasks.length,
      pending:
        data?.summary?.pending ??
        tasks.filter((task) => task.status === "Pending").length,
      completed:
        data?.summary?.completed ??
        tasks.filter((task) => task.status === "Completed").length,
      emails:
        data?.summary?.emails ??
        tasks.filter((task) => task.channel === "Email").length,
      letters:
        data?.summary?.letters ??
        tasks.filter((task) => task.channel === "Letter").length,
      interviews:
        data?.summary?.interviews ??
        tasks.filter((task) => task.channel === "Interview").length,
    },
    tasks,
  };
}

export async function syncCommunicationQueue() {
  const response = await api.post("/communications/sync");
  return response.data;
}

export async function getCommunicationQueue(filters = {}) {
  const params = new URLSearchParams();

  if (filters.workspaceId && filters.workspaceId !== "all") {
    params.set("workspace_id", filters.workspaceId);
  }

  if (filters.channel && filters.channel !== "all" && filters.channel !== "All") {
    params.set("channel", filters.channel);
  }

  if (filters.status && filters.status !== "all" && filters.status !== "All") {
    params.set("status", filters.status);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get(`/communications/queue${query}`);

  return normalizeQueue(response.data);
}

export async function getCommunicationTask(taskId) {
  const response = await api.get(`/communications/${taskId}`);
  return response.data;
}

export async function completeCommunicationTask(taskId) {
  const response = await api.patch(`/communications/${taskId}/complete`);
  return response.data;
}

export async function reopenCommunicationTask(taskId) {
  const response = await api.patch(`/communications/${taskId}/reopen`);
  return response.data;
}

export async function deleteCommunicationTask(taskId) {
  const response = await api.delete(`/communications/${taskId}`);
  return response.data;
}
