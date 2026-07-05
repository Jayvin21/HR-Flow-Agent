import { api } from "@/lib/api";

export async function getDisputes({ workspaceId = "", status = "" } = {}) {
  const params = new URLSearchParams();

  if (workspaceId) params.append("workspace_id", workspaceId);
  if (status) params.append("status", status);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get(`/disputes/${query}`);
  return response.data;
}

export async function createDispute(payload) {
  const response = await api.post("/disputes/", payload);
  return response.data;
}

export async function resolveDispute(disputeId) {
  const response = await api.post(`/disputes/${disputeId}/resolve`);
  return response.data;
}

export async function updateDisputeStatus(disputeId, status) {
  const response = await api.patch(`/disputes/${disputeId}/status`, {
    status,
  });

  return response.data;
}

export async function deleteDispute(disputeId) {
  const response = await api.delete(`/disputes/${disputeId}`);
  return response.data;
}
