def infer_attendance_issue(status=None, check_in=None, check_out=None, late_minutes=None):
    status_text = str(status or "").strip().lower()
    check_in_text = str(check_in or "").strip()
    check_out_text = str(check_out or "").strip()

    try:
        late_value = int(float(late_minutes or 0))
    except Exception:
        late_value = 0

    if "absent" in status_text or status_text == "a":
        return "Absent"

    if not check_in_text or not check_out_text:
        if "present" not in status_text:
            return "Missing Punch"

    if late_value > 0:
        return "Late Arrival"

    if any(word in status_text for word in ["late", "half", "missing", "irregular"]):
        return "Attendance Issue"

    return ""
