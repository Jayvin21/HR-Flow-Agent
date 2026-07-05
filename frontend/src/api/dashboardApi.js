import { api } from "@/lib/api";

export async function getDashboardCommandCenter() {
  const response = await api.get("/dashboard/command-center");
  return response.data;
}
