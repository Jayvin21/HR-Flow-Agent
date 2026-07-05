from typing import Optional
from app.models.candidate import Candidate


def safe(value: Optional[str], fallback: str = "") -> str:
    if value and str(value).strip():
        return str(value).strip()
    return fallback


def get_recipient_name(candidate: Optional[Candidate], manual_name: str = "") -> str:
    if candidate and candidate.name:
        return candidate.name
    return safe(manual_name, "Employee")


def get_role(candidate: Optional[Candidate], manual_role: str = "") -> str:
    if manual_role and manual_role.strip():
        return manual_role.strip()
    if candidate and candidate.current_role:
        return candidate.current_role
    return "the assigned role"


def append_notes(body: str, notes: str = "") -> str:
    if notes and notes.strip():
        return body + f"\n\nAdditional Notes:\n{notes.strip()}"
    return body


def generate_offer_letter(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    company = safe(payload.company_name, "the company")
    hr = safe(payload.hr_name, "HR Team")
    joining = safe(payload.joining_date, "the mutually agreed joining date")
    salary = safe(payload.salary, "as discussed")
    location = safe(payload.location, "the assigned office location")

    title = f"Offer Letter - {role}"

    body = f"""Date: [Insert Date]

To,
{name}

Subject: Offer Letter for the Position of {role}

Dear {name},

We are pleased to offer you the position of {role} at {company}.

Your expected date of joining will be {joining}. Your work location will be {location}. Your compensation will be {salary}, subject to applicable deductions and company policies.

This offer is subject to successful verification of your documents, background checks where applicable, and acceptance of the terms and conditions shared by the company.

Please confirm your acceptance of this offer by replying to this communication or signing the formal offer document.

We look forward to having you as part of our team.

Sincerely,
{hr}
{company}"""

    return title, append_notes(body, payload.extra_notes)


def generate_appointment_letter(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    department = safe(payload.department, "the assigned department")
    company = safe(payload.company_name, "the company")
    hr = safe(payload.hr_name, "HR Team")
    joining = safe(payload.joining_date, "your joining date")
    location = safe(payload.location, "the assigned office location")

    title = f"Appointment Letter - {role}"

    body = f"""Date: [Insert Date]

To,
{name}

Subject: Appointment Letter

Dear {name},

This letter confirms your appointment as {role} in {department} at {company}, effective from {joining}.

Your work location will be {location}. Your employment will be governed by company policies, code of conduct, confidentiality obligations, attendance rules, and any other terms communicated during onboarding.

You are expected to perform your duties responsibly and comply with all applicable company processes.

We welcome you to {company} and wish you success in your role.

Sincerely,
{hr}
{company}"""

    return title, append_notes(body, payload.extra_notes)


def generate_warning_letter(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    company = safe(payload.company_name, "the company")
    hr = safe(payload.hr_name, "HR Team")
    reason = safe(payload.reason, "attendance or conduct concerns requiring HR attention")

    title = "Warning Letter"

    body = f"""Date: [Insert Date]

To,
{name}

Subject: Formal Warning

Dear {name},

This letter is being issued regarding {reason}.

The matter has been reviewed by HR, and it has been observed that the concern requires immediate correction. You are expected to follow company policies, maintain professional conduct, and ensure that such issues are not repeated.

Please treat this warning seriously. Continued non-compliance may lead to further disciplinary action as per company policy.

You may contact HR if you wish to provide clarification or supporting information.

Sincerely,
{hr}
{company}"""

    return title, append_notes(body, payload.extra_notes)


def generate_experience_letter(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    company = safe(payload.company_name, "the company")
    hr = safe(payload.hr_name, "HR Team")
    department = safe(payload.department, "the assigned department")
    last_day = safe(payload.last_working_day, "the recorded last working day")

    title = f"Experience Letter - {name}"

    body = f"""Date: [Insert Date]

To Whom It May Concern,

This is to certify that {name} was associated with {company} as {role} in {department} until {last_day}.

During the period of association, {name} performed assigned responsibilities and contributed to the organization as per the role expectations.

We wish {name} success in future professional endeavors.

Sincerely,
{hr}
{company}"""

    return title, append_notes(body, payload.extra_notes)


def generate_relieving_letter(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    company = safe(payload.company_name, "the company")
    hr = safe(payload.hr_name, "HR Team")
    last_day = safe(payload.last_working_day, "the recorded last working day")

    title = f"Relieving Letter - {name}"

    body = f"""Date: [Insert Date]

To,
{name}

Subject: Relieving Letter

Dear {name},

This is to confirm that you have been relieved from your duties as {role} at {company}, effective from the close of business on {last_day}.

Subject to completion of exit formalities, handover, asset return, and clearance from relevant departments, your separation records will be processed as per company policy.

We thank you for your contribution and wish you the best for your future.

Sincerely,
{hr}
{company}"""

    return title, append_notes(body, payload.extra_notes)


def generate_probation_extension_letter(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    company = safe(payload.company_name, "the company")
    hr = safe(payload.hr_name, "HR Team")
    reason = safe(payload.reason, "performance, attendance, or role-readiness observations")

    title = f"Probation Extension Letter - {name}"

    body = f"""Date: [Insert Date]

To,
{name}

Subject: Probation Extension

Dear {name},

This letter is to inform you that your probation period for the position of {role} at {company} is being extended.

The extension is based on {reason}. During the extended probation period, your performance, conduct, attendance, and role-readiness will continue to be reviewed.

Further confirmation will be subject to satisfactory improvement and fulfillment of role expectations.

Please contact HR if you require clarification regarding this extension.

Sincerely,
{hr}
{company}"""

    return title, append_notes(body, payload.extra_notes)


def generate_salary_revision_letter(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    company = safe(payload.company_name, "the company")
    hr = safe(payload.hr_name, "HR Team")
    salary = safe(payload.salary, "the revised compensation structure")

    title = f"Salary Revision Letter - {name}"

    body = f"""Date: [Insert Date]

To,
{name}

Subject: Salary Revision

Dear {name},

We are pleased to inform you that your compensation for the role of {role} at {company} has been revised.

Your revised compensation will be {salary}, subject to applicable deductions, company policy, and payroll processing timelines.

The revised structure will be effective from the date communicated by HR or management.

We appreciate your contribution and look forward to your continued performance.

Sincerely,
{hr}
{company}"""

    return title, append_notes(body, payload.extra_notes)


def generate_leave_response_letter(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    company = safe(payload.company_name, "the company")
    hr = safe(payload.hr_name, "HR Team")
    reason = safe(payload.reason, "your leave request")

    title = f"Leave Response Letter - {name}"

    body = f"""Date: [Insert Date]

To,
{name}

Subject: Response to Leave Request

Dear {name},

This letter is regarding {reason}.

Your leave request has been reviewed by HR and the relevant reporting authority. The final approval or rejection will be subject to leave balance, prior approvals, business requirements, and applicable company policy.

Please coordinate with your reporting manager and HR for final confirmation and handover requirements, if any.

Sincerely,
{hr}
{company}"""

    return title, append_notes(body, payload.extra_notes)


def generate_letter(payload, candidate: Optional[Candidate] = None):
    letter_type = payload.letter_type

    generators = {
        "Offer Letter": generate_offer_letter,
        "Appointment Letter": generate_appointment_letter,
        "Warning Letter": generate_warning_letter,
        "Experience Letter": generate_experience_letter,
        "Relieving Letter": generate_relieving_letter,
        "Probation Extension Letter": generate_probation_extension_letter,
        "Salary Revision Letter": generate_salary_revision_letter,
        "Leave Response Letter": generate_leave_response_letter,
    }

    generator = generators.get(letter_type, generate_offer_letter)
    title, body = generator(candidate, payload)

    return {
        "title": title,
        "body": body,
        "letter_type": letter_type,
        "recipient_name": get_recipient_name(candidate, payload.recipient_name),
    }
