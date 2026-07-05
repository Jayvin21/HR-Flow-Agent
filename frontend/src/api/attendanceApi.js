import { api } from "@/lib/api";

export async function getAttendanceDocuments(workspaceId = "") {
  const query = workspaceId ? `?workspace_id=${workspaceId}` : "";
  const response = await api.get(`/attendance/documents${query}`);
  return response.data;
}

export async function importAttendance(documentId) {
  const response = await api.post("/attendance/import", {
    document_id: Number(documentId),
  });

  return response.data;
}

export async function getAttendanceRecords({ workspaceId = "", documentId = "" } = {}) {
  const params = new URLSearchParams();

  if (workspaceId) params.append("workspace_id", workspaceId);
  if (documentId) params.append("document_id", documentId);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get(`/attendance/records${query}`);
  return response.data;
}

export async function getAttendanceSummary({ workspaceId = "", documentId = "" } = {}) {
  const params = new URLSearchParams();

  if (workspaceId) params.append("workspace_id", workspaceId);
  if (documentId) params.append("document_id", documentId);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get(`/attendance/summary${query}`);
  return response.data;
}

export async function clearAttendanceRecords({ workspaceId = "", documentId = "" } = {}) {
  const params = new URLSearchParams();

  if (workspaceId) params.append("workspace_id", workspaceId);
  if (documentId) params.append("document_id", documentId);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.delete(`/attendance/clear${query}`);
  return response.data;
}
