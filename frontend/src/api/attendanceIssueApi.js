import { api } from "@/lib/api";

export async function markAttendanceIssueDone({
  issueKey,
  employeeName = "",
  issueType = "",
  issueDate = "",
}) {
  const response = await api.patch("/attendance-issues/done", {
    issue_key: issueKey,
    employee_name: employeeName,
    issue_type: issueType,
    issue_date: issueDate,
  });

  return response.data;
}

export async function reopenAttendanceIssue({
  issueKey,
  employeeName = "",
  issueType = "",
  issueDate = "",
}) {
  const response = await api.patch("/attendance-issues/reopen", {
    issue_key: issueKey,
    employee_name: employeeName,
    issue_type: issueType,
    issue_date: issueDate,
  });

  return response.data;
}

export async function getCompletedAttendanceIssueKeys() {
  const response = await api.get("/attendance-issues/completed-keys");
  return response.data.completed_keys || [];
}
