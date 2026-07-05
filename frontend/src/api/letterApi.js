import { api } from "@/lib/api";

export async function generateLetterDraft(payload) {
  const response = await api.post("/letters/generate", payload);
  return response.data;
}
