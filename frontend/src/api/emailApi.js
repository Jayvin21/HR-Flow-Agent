import { api } from "@/lib/api";

export async function generateEmailDraft(payload) {
  const response = await api.post("/emails/generate", payload);
  return response.data;
}
