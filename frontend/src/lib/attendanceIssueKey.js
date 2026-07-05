function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildAttendanceIssueKey(issue) {
  const sourceType = normalizeKey(issue.source_type);
  const category = normalizeKey(issue.category);
  const title = normalizeKey(issue.title);
  const issueType = normalizeKey(issue.issue_type || issue.type);

  const looksLikeAttendance =
    sourceType.includes("attendance") ||
    category.includes("attendance") ||
    title.includes("attendance") ||
    issueType.includes("attendance") ||
    issue.late_marks !== undefined ||
    issue.missing_punches !== undefined ||
    issue.absent_days !== undefined;

  const employee =
    issue.employee_name ||
    issue.employeeName ||
    issue.person_name ||
    issue.name ||
    "unknown_employee";

  const employeeKey = normalizeKey(employee);

  if (looksLikeAttendance) {
    return `attendance_employee_${employeeKey}`;
  }

  const explicitKey =
    issue.issue_key ||
    issue.source_key ||
    issue.attendance_issue_key;

  if (explicitKey) {
    return normalizeKey(explicitKey);
  }

  const date =
    issue.date ||
    issue.issue_date ||
    issue.attendance_date ||
    issue.created_at ||
    "unknown_date";

  const type =
    issue.issue_type ||
    issue.type ||
    issue.category ||
    issue.status ||
    issue.title ||
    "attendance_issue";

  return normalizeKey(`${employee}__${date}__${type}`);
}

export function buildAttendanceIssueKeyAliases(issue) {
  const aliases = new Set();

  const primary = buildAttendanceIssueKey(issue);
  aliases.add(primary);

  const employee =
    issue.employee_name ||
    issue.employeeName ||
    issue.person_name ||
    issue.name;

  if (employee) {
    aliases.add(`attendance_employee_${normalizeKey(employee)}`);
  }

  if (issue.id) {
    aliases.add(`attendance_case_${normalizeKey(issue.id)}`);
  }

  if (issue.source_id) {
    aliases.add(`attendance_source_${normalizeKey(issue.source_id)}`);
  }

  if (issue.issue_key) {
    aliases.add(normalizeKey(issue.issue_key));
  }

  if (issue.source_key) {
    aliases.add(normalizeKey(issue.source_key));
  }

  if (issue.attendance_issue_key) {
    aliases.add(normalizeKey(issue.attendance_issue_key));
  }

  return Array.from(aliases).filter(Boolean);
}
