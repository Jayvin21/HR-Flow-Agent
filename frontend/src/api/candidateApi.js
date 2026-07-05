import { api } from "@/lib/api";

function cleanWorkspaceId(workspaceId) {
  if (!workspaceId) return "";
  if (workspaceId === "all") return "";
  if (workspaceId === "All workspaces") return "";

  const value = String(workspaceId).trim();

  if (!value) return "";
  if (value.toLowerCase() === "all") return "";

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return "";

  return String(numberValue);
}

function buildCandidateQuery(workspaceId = "", extra = {}) {
  const params = new URLSearchParams();

  const cleanedWorkspaceId = cleanWorkspaceId(workspaceId);

  if (cleanedWorkspaceId) {
    params.set("workspace_id", cleanedWorkspaceId);
  }

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `?${query}` : "";
}

export async function getCandidates(workspaceId = "", status = "") {
  const query = buildCandidateQuery(workspaceId, {
    status, recruitment_status: status,
  });

  const response = await api.get(`/candidates${query}`);
  return response.data;
}

export async function parseResumes(workspaceId = "") {
  const query = buildCandidateQuery(workspaceId);

  const response = await api.post(`/candidates/parse-resumes${query}`);
  return response.data;
}

export async function reparseCandidates(workspaceId = "") {
  const query = buildCandidateQuery(workspaceId);

  const response = await api.post(`/candidates/reparse${query}`);
  return response.data;
}

export async function updateCandidateStatus(candidateId, status) {
  const response = await api.patch(`/candidates/${candidateId}/status`, {
    status, recruitment_status: status,
  });

  return response.data;
}

export async function deleteCandidate(candidateId) {
  try {
    const response = await api.delete(`/candidates/${candidateId}`);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return {
        message: "Candidate already deleted or not found.",
        deleted: 0,
        candidate_id: candidateId,
      };
    }

    throw error;
  }
}

export async function getInterviewEligibleCandidates(workspaceId = "") {
  // Interview assistant should only use candidates that are not rejected.
  // Backend may or may not have a special endpoint, so keep this frontend-safe.
  const candidates = await getCandidates(workspaceId);

  return candidates.filter((candidate) => {
    const status = String(candidate.status || "").toLowerCase();

    return status !== "rejected";
  });
}

export async function getShortlistedCandidates(workspaceId = "") {
  const candidates = await getCandidates(workspaceId);

  return candidates.filter((candidate) => {
    const status = String(candidate.status || "").toLowerCase();

    return status === "shortlisted";
  });
}


