import { api } from "@/lib/api";

export async function askRagQuestion({ question, workspaceId }) {
  const payload = {
    question,
    workspace_id: workspaceId ? Number(workspaceId) : null,
  };

  const response = await api.post("/rag/chat", payload);
  return response.data;
}
