import json
from typing import List, Dict, Any


def serialize_sources(sources: List[Dict[str, Any]]) -> str:
    return json.dumps(sources, ensure_ascii=False)


def assess_risk(dispute_type: str, claim: str, sources: List[Dict[str, Any]]) -> tuple[str, str]:
    text = f"{dispute_type} {claim}".lower()

    high_risk_terms = [
        "salary deduction",
        "unpaid salary",
        "harassment",
        "termination",
        "misconduct",
        "legal",
        "discrimination",
        "fraud",
        "final settlement",
        "pf",
        "gratuity",
    ]

    medium_risk_terms = [
        "attendance",
        "leave",
        "reimbursement",
        "manager approval",
        "warning",
        "probation",
        "late mark",
    ]

    if any(term in text for term in high_risk_terms):
        return (
            "High",
            "Escalate to HR manager/management. Review employee records, policy clauses, and supporting evidence before responding."
        )

    if any(term in text for term in medium_risk_terms):
        return (
            "Medium",
            "Review policy evidence, employee explanation, manager approval history, and payroll/attendance records before closing."
        )

    if not sources:
        return (
            "Medium",
            "Insufficient evidence found. Ask employee for supporting documents and route to HR review."
        )

    return (
        "Low",
        "Handle through standard HR clarification process and document the response."
    )


def build_evidence_summary(sources: List[Dict[str, Any]]) -> str:
    if not sources:
        return "No directly relevant uploaded evidence was found. HR should request supporting records or upload relevant policy/attendance/dispute documents."

    lines = ["Relevant evidence found in uploaded documents:"]

    for index, source in enumerate(sources, start=1):
        filename = source.get("filename", "Unknown file")
        document_type = source.get("document_type", "Document")
        snippet = source.get("snippet", "")
        lines.append(f"\n[{index}] {filename} ({document_type})")
        lines.append(f"Evidence snippet: {snippet[:500]}")

    return "\n".join(lines)


def build_response_draft(
    employee_name: str,
    dispute_type: str,
    claim: str,
    evidence_summary: str,
    risk_level: str,
    recommended_action: str
) -> str:
    return f"""Hi {employee_name},

Thank you for raising your concern with HR.

We have recorded your dispute under the category: {dispute_type}.

Your claim:
"{claim}"

Initial HR Review:
{evidence_summary}

Risk Level:
{risk_level}

Next Step:
{recommended_action}

Please note that this is an initial review. The final decision will depend on company policy, attendance/payroll records, manager approvals, submitted evidence, and any additional clarification required from your side.

Regards,
HR Team"""


def resolve_dispute_payload(dispute, sources: List[Dict[str, Any]]) -> Dict[str, str]:
    risk_level, recommended_action = assess_risk(
        dispute.dispute_type,
        dispute.claim,
        sources,
    )

    evidence_summary = build_evidence_summary(sources)

    response_draft = build_response_draft(
        employee_name=dispute.employee_name,
        dispute_type=dispute.dispute_type,
        claim=dispute.claim,
        evidence_summary=evidence_summary,
        risk_level=risk_level,
        recommended_action=recommended_action,
    )

    return {
        "risk_level": risk_level,
        "recommended_action": recommended_action,
        "evidence_summary": evidence_summary,
        "response_draft": response_draft,
    }
