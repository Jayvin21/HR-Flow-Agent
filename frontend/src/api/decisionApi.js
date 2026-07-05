import { api } from "@/lib/api";

export async function generateDecisionSummary(payload) {
  const response = await api.post("/decisions/generate", payload);
  return response.data;
}
