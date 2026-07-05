import { api } from "@/lib/api";

export async function getEmployeeQueries({ workspaceId = "", status = "" } = {}) {
  const params = new URLSearchParams();

  if (workspaceId) params.append("workspace_id", workspaceId);
  if (status) params.append("status", status);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get(`/employee-queries/${query}`);
  return response.data;
}

export async function createEmployeeQuery(payload) {
  const response = await api.post("/employee-queries/", payload);
  return response.data;
}

export async function resolveEmployeeQuery(queryId) {
  const response = await api.post(`/employee-queries/${queryId}/resolve`);
  return response.data;
}

export async function updateEmployeeQueryStatus(queryId, status) {
  const response = await api.patch(`/employee-queries/${queryId}/status`, {
    status,
  });

  return response.data;
}

export async function deleteEmployeeQuery(queryId) {
  const response = await api.delete(`/employee-queries/${queryId}`);
  return response.data;
}
