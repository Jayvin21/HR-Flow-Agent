import { api } from "@/lib/api";

export async function generateInterviewPack({ candidateId, jdText }) {
  const payload = {
    candidate_id: Number(candidateId),
    jd_text: jdText || "",
  };

  const response = await api.post("/interview/generate", payload);
  return response.data;
}
