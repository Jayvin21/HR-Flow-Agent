import { api } from "@/lib/api";

export async function getDefaultRequiredDocuments() {
  const response = await api.get("/missing-docs/defaults");
  return response.data;
}

export async function getMissingDocumentCases({ workspaceId = "", status = "" } = {}) {
  const params = new URLSearchParams();

  if (workspaceId) params.append("workspace_id", workspaceId);
  if (status) params.append("status", status);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get(`/missing-docs/${query}`);
  return response.data;
}

export async function createMissingDocumentCase(payload) {
  const response = await api.post("/missing-docs/", payload);
  return response.data;
}

export async function recalculateMissingDocumentCase(caseId) {
  const response = await api.post(`/missing-docs/${caseId}/recalculate`);
  return response.data;
}

export async function updateMissingDocumentCaseStatus(caseId, status) {
  const response = await api.patch(`/missing-docs/${caseId}/status`, {
    status,
  });

  return response.data;
}

export async function deleteMissingDocumentCase(caseId) {
  const response = await api.delete(`/missing-docs/${caseId}`);
  return response.data;
}
