import json
from typing import List, Optional
from app.models.candidate import Candidate


DEFAULT_REQUIRED_DOCUMENTS = [
    "Updated Resume",
    "Government ID Proof",
    "Address Proof",
    "Education Certificates",
    "Bank Details",
    "Passport Size Photo",
    "Signed Offer Letter",
    "Experience Letter",
]


def normalize_doc_name(value: str) -> str:
    return value.strip().lower().replace("-", " ").replace("_", " ")


def to_json_list(items: List[str]) -> str:
    cleaned = [item.strip() for item in items if item and item.strip()]
    return json.dumps(cleaned, ensure_ascii=False)


def from_json_list(value: Optional[str]) -> List[str]:
    if not value:
        return []

    try:
        data = json.loads(value)
        if isinstance(data, list):
            return data
    except Exception:
        pass

    return []


def calculate_missing_documents(required_documents: List[str], submitted_documents: List[str]) -> List[str]:
    submitted_normalized = {normalize_doc_name(item) for item in submitted_documents}

    missing = []

    for doc in required_documents:
        if normalize_doc_name(doc) not in submitted_normalized:
            missing.append(doc)

    return missing


def infer_status(missing_documents: List[str]) -> str:
    if not missing_documents:
        return "Complete"

    if len(missing_documents) <= 2:
        return "Partially Pending"

    return "Pending"


def build_request_draft(
    person_name: str,
    missing_documents: List[str],
    role: str = "",
    email: str = ""
) -> str:
    if not missing_documents:
        return f"""Hi {person_name},

Thank you for submitting the required documents.

Your document checklist appears complete at this stage. HR will review the submitted files and contact you if anything else is required.

Regards,
HR Team"""

    missing_lines = "\n".join([f"- {doc}" for doc in missing_documents])
    role_line = f" for the {role} role" if role else ""

    return f"""Hi {person_name},

As part of your HR/onboarding process{role_line}, the following document(s) are still pending:

{missing_lines}

Please submit the pending document(s) at the earliest so HR can continue the verification and onboarding process.

If you have already submitted any of these, please reply with the submission details or attachment reference.

Regards,
HR Team"""


def build_case_payload(
    person_name: str,
    email: str,
    role: str,
    required_documents: List[str],
    submitted_documents: List[str]
):
    missing_documents = calculate_missing_documents(required_documents, submitted_documents)
    status = infer_status(missing_documents)
    request_draft = build_request_draft(person_name, missing_documents, role, email)

    return {
        "required_documents": to_json_list(required_documents),
        "submitted_documents": to_json_list(submitted_documents),
        "missing_documents": to_json_list(missing_documents),
        "status": status,
        "request_draft": request_draft,
    }


def build_from_candidate(candidate: Candidate, required_documents: List[str], submitted_documents: List[str]):
    person_name = candidate.name
    email = candidate.email or ""
    role = candidate.current_role or ""

    return build_case_payload(
        person_name=person_name,
        email=email,
        role=role,
        required_documents=required_documents,
        submitted_documents=submitted_documents,
    )
