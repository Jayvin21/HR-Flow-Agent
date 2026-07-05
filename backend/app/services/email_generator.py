from typing import Optional
from app.models.candidate import Candidate


def safe(value: Optional[str], fallback: str = "") -> str:
    if value and str(value).strip():
        return str(value).strip()
    return fallback


def get_recipient_name(candidate: Optional[Candidate], manual_name: str = "") -> str:
    if candidate and candidate.name:
        return candidate.name
    return safe(manual_name, "Candidate")


def get_role(candidate: Optional[Candidate], manual_role: str = "") -> str:
    if manual_role and manual_role.strip():
        return manual_role.strip()
    if candidate and candidate.current_role:
        return candidate.current_role
    return "the role"


def append_notes(body: str, notes: str = "") -> str:
    if notes and notes.strip():
        return body + f"\n\nAdditional note:\n{notes.strip()}"
    return body


def generate_interview_invite(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    company = safe(payload.company_name, "our company")
    hr_name = safe(payload.hr_name, "HR Team")
    date = safe(payload.interview_date, "the scheduled date")
    time = safe(payload.interview_time, "the scheduled time")

    subject = f"Interview Invitation for {role}"

    body = f"""Hi {name},

Thank you for your interest in the {role} position at {company}.

We are pleased to invite you for an interview.

Interview Details:
Date: {date}
Time: {time}
Mode: Online / As discussed

Please confirm your availability for the above schedule. If the timing does not work for you, let us know your available slots.

Best regards,
{hr_name}"""

    return subject, append_notes(body, payload.extra_notes)


def generate_rejection_email(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    company = safe(payload.company_name, "our company")
    hr_name = safe(payload.hr_name, "HR Team")

    subject = f"Update on Your Application for {role}"

    body = f"""Hi {name},

Thank you for applying for the {role} position at {company}.

After reviewing your application, we have decided not to move forward with your profile for this role at this stage.

We appreciate the time and effort you invested in the process and encourage you to apply for future opportunities that match your experience and skills.

Best regards,
{hr_name}"""

    return subject, append_notes(body, payload.extra_notes)


def generate_shortlist_email(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    role = get_role(candidate, payload.role)
    company = safe(payload.company_name, "our company")
    hr_name = safe(payload.hr_name, "HR Team")

    subject = f"You Have Been Shortlisted for {role}"

    body = f"""Hi {name},

We are pleased to inform you that your profile has been shortlisted for the {role} position at {company}.

Our team will contact you with the next steps shortly. Please keep your phone and email available for further communication.

Best regards,
{hr_name}"""

    return subject, append_notes(body, payload.extra_notes)


def generate_document_request(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    company = safe(payload.company_name, "our company")
    hr_name = safe(payload.hr_name, "HR Team")

    subject = "Request for Pending Documents"

    body = f"""Hi {name},

As part of the HR process at {company}, please share the pending documents required for verification.

Requested documents may include:
- Updated resume
- Government ID proof
- Address proof
- Education certificates
- Bank details
- Previous experience letter, if applicable
- Signed offer letter, if applicable

Please submit the documents at the earliest so we can proceed further.

Best regards,
{hr_name}"""

    return subject, append_notes(body, payload.extra_notes)


def generate_attendance_followup(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    company = safe(payload.company_name, "our company")
    hr_name = safe(payload.hr_name, "HR Team")

    subject = "Attendance Clarification Required"

    body = f"""Hi {name},

We noticed an attendance irregularity that requires clarification.

This may relate to late marks, missing punch records, or uninformed absence. Please review your attendance record and share your explanation along with any supporting details.

Kindly respond at the earliest so HR can review and update the record if required.

Best regards,
{hr_name}"""

    return subject, append_notes(body, payload.extra_notes)


def generate_policy_response(candidate, payload):
    name = get_recipient_name(candidate, payload.recipient_name)
    company = safe(payload.company_name, "our company")
    hr_name = safe(payload.hr_name, "HR Team")

    subject = "Response to Your HR Policy Query"

    body = f"""Hi {name},

Thank you for reaching out to HR.

We have reviewed your query. Based on the applicable company policy, HR will provide the relevant clarification and next steps.

Please note that the final decision may depend on your employment status, approval history, attendance record, and the specific policy clause applicable to your case.

Best regards,
{hr_name}"""

    return subject, append_notes(body, payload.extra_notes)


def generate_email(payload, candidate: Optional[Candidate] = None):
    email_type = payload.email_type

    generators = {
        "Interview Invite": generate_interview_invite,
        "Rejection Email": generate_rejection_email,
        "Shortlist Email": generate_shortlist_email,
        "Document Request": generate_document_request,
        "Attendance Follow-up": generate_attendance_followup,
        "Policy Response": generate_policy_response,
    }

    generator = generators.get(email_type, generate_interview_invite)
    subject, body = generator(candidate, payload)

    return {
        "subject": subject,
        "body": body,
        "email_type": email_type,
        "recipient_name": get_recipient_name(candidate, payload.recipient_name),
    }
