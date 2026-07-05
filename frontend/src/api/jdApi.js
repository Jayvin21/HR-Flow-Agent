import { api } from "@/lib/api";

export async function getJdDocuments(workspaceId = "") {
  const query = workspaceId ? `?workspace_id=${workspaceId}` : "";
  const response = await api.get(`/jd/documents${query}`);
  return response.data;
}

export async function getJobDescriptionDocuments(workspaceId = "") {
  return getJdDocuments(workspaceId);
}

export async function matchJd({ workspaceId = "", jdText }) {
  const response = await api.post("/jd/match", {
    workspace_id: workspaceId ? Number(workspaceId) : null,
    jd_text: jdText,
  });

  return response.data;
}

export async function matchJobDescription({ workspaceId = "", jdText }) {
  return matchJd({ workspaceId, jdText });
}
