import { api } from "@/lib/api";

export async function getUnifiedCases({
  workspaceId = "",
  sourceType = "",
  status = "",
  priority = "",
} = {}) {
  const params = new URLSearchParams();

  if (workspaceId) params.append("workspace_id", workspaceId);
  if (sourceType && sourceType !== "All") params.append("source_type", sourceType);
  if (status && status !== "All") params.append("status", status);
  if (priority && priority !== "All") params.append("priority", priority);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await api.get(`/cases/${query}`);
  return response.data;
}
