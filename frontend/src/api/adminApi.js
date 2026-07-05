import { api } from "@/lib/api";

export async function eraseAllDemoData() {
  const response = await api.delete("/admin/reset-data");
  return response.data;
}
