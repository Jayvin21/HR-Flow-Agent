import { api } from "@/lib/api";

export async function getWorkspaces() {
  const response = await api.get("/workspaces");
  return response.data;
}

export async function createWorkspace(payload) {
  const response = await api.post("/workspaces", payload);
  return response.data;
}

export async function deleteWorkspace(workspaceId) {
  const response = await api.delete(`/workspaces/${workspaceId}`);
  return response.data;
}
