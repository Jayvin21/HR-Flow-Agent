import { api } from "@/lib/api";

export async function getDocuments(workspaceId = "", documentType = "") {
  const params = new URLSearchParams();

  if (workspaceId) params.append("workspace_id", workspaceId);
  if (documentType && documentType !== "All") {
    params.append("document_type", documentType);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get(`/documents/${query}`);
  return response.data;
}

export async function uploadDocument({ file, documentType, workspaceId }) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("document_type", documentType);

  if (workspaceId) {
    formData.append("workspace_id", workspaceId);
  }

  const response = await api.post("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function reprocessDocument(documentId) {
  const response = await api.post(`/documents/${documentId}/reprocess`);
  return response.data;
}

export async function reprocessAllDocuments() {
  const response = await api.post("/documents/reprocess-all");
  return response.data;
}

export async function deleteDocument(documentId) {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
}
