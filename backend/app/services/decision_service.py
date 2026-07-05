from typing import Dict, Any, Optional
from app.models.candidate import Candidate
from app.models.dispute import Dispute
from app.models.employee_query import EmployeeQuery
from app.models.missing_document import MissingDocumentCase


def safe(value, fallback=""):
    if value and str(value).strip():
        return str(value).strip()
    return fallback


def infer_risk_level(decision_type: str, situation: str, evidence: str, recommendation: str) -> str:
    text = f"{decision_type} {situation} {evidence} {recommendation}".lower()

    high_terms = [
        "salary deduction",
        "termination",
        "harassment",
        "legal",
        "misconduct",
        "escalate",
        "unpaid",
        "final settlement",
        "fraud",
        "warning",
    ]

    medium_terms = [
        "attendance",
        "leave",
        "probation",
        "missing documents",
        "reimbursement",
        "late marks",
        "needs review",
        "under review",
    ]

    if any(term in text for term in high_terms):
        return "High"

    if any(term in text for term in medium_terms):
        return "Medium"

    return "Low"


def infer_recommendation(decision_type: str, source_context: Dict[str, Any], manual_recommendation: str = "") -> str:
    if manual_recommendation:
        return manual_recommendation

    if decision_type == "Hiring Decision":
        return "Proceed to next recruitment step if interview performance confirms the resume and JD match."

    if decision_type == "Case Closure":
        return "Close the case after documenting final HR action and notifying the employee."

    if decision_type == "Escalation Memo":
        return "Escalate to HR manager or management for review before final communication."

    if decision_type == "Policy Decision":
        return "Apply the relevant HR policy consistently and record the decision rationale."

    if decision_type == "Onboarding Decision":
        return "Proceed only after required documents are submitted or exception approval is recorded."

    return "Review the available evidence and proceed with documented HR action."


def build_sections(
    decision_type: str,
    person_name: str,
    role_or_category: str,
    situation: str,
    evidence: str,
    recommendation: str,
    risk_level: str,
    reviewer_name: str,
):
    sections = [
        {
            "title": "Context",
            "content": (
                f"This {decision_type.lower()} concerns {person_name}. "
                f"Category/Role: {role_or_category or 'Not specified'}.\n\n"
                f"{situation or 'No additional situation details provided.'}"
            ),
        },
        {
            "title": "Evidence Reviewed",
            "content": evidence or "No evidence was provided. HR should review uploaded documents, records, approvals, and case history before final action.",
        },
        {
            "title": "Risk Assessment",
            "content": (
                f"Risk Level: {risk_level}.\n\n"
                "This risk level is inferred from the case type, available evidence, and recommended action. "
                "It should be reviewed by HR before final use."
            ),
        },
        {
            "title": "Decision Recommendation",
            "content": recommendation,
        },
        {
            "title": "Next Action",
            "content": build_next_action(decision_type, risk_level),
        },
        {
            "title": "Reviewer Note",
            "content": (
                f"Prepared for review by {reviewer_name}. "
                "This memo is a decision-support draft and should not replace HR/legal/management judgment."
            ),
        },
    ]

    return sections


def build_next_action(decision_type: str, risk_level: str) -> str:
    if risk_level == "High":
        return "Escalate to HR manager/management. Verify policy clauses, supporting records, and communication history before final decision."

    if decision_type == "Hiring Decision":
        return "Schedule next interview, send shortlist/rejection communication, or move candidate to offer discussion based on final evaluation."

    if decision_type == "Onboarding Decision":
        return "Send missing document request, update checklist status, and pause onboarding completion until pending items are resolved."

    if decision_type == "Case Closure":
        return "Document final action, update case status to Closed, and send final response to the employee."

    return "Record the decision, notify the relevant person, and update the source module status."


def build_memo(title: str, sections):
    lines = [title, ""]

    for section in sections:
        lines.append(section["title"])
        lines.append("-" * len(section["title"]))
        lines.append(section["content"])
        lines.append("")

    return "\n".join(lines).strip()


def candidate_context(candidate: Candidate) -> Dict[str, Any]:
    evidence_parts = []

    if candidate.skills:
        evidence_parts.append(f"Skills: {candidate.skills}")

    if candidate.experience:
        evidence_parts.append(f"Experience: {candidate.experience}")

    if candidate.projects:
        evidence_parts.append(f"Projects: {candidate.projects}")

    if candidate.education:
        evidence_parts.append(f"Education: {candidate.education}")

    return {
        "person_name": candidate.name,
        "role_or_category": candidate.current_role or "Candidate",
        "situation": candidate.summary or "Candidate profile parsed from uploaded resume.",
        "evidence": "\n\n".join(evidence_parts) or "Parsed resume profile is available but limited structured evidence was detected.",
        "recommendation": "Use JD match, interview results, and resume verification before final hiring decision.",
    }


def dispute_context(dispute: Dispute) -> Dict[str, Any]:
    return {
        "person_name": dispute.employee_name,
        "role_or_category": dispute.dispute_type,
        "situation": dispute.claim,
        "evidence": dispute.evidence_summary or dispute.hr_notes or "No resolved evidence summary available yet.",
        "recommendation": dispute.recommended_action or "Review dispute evidence and decide next HR action.",
    }


def employee_query_context(query: EmployeeQuery) -> Dict[str, Any]:
    return {
        "person_name": query.employee_name,
        "role_or_category": query.query_type,
        "situation": query.question,
        "evidence": query.policy_answer or "No policy-grounded answer generated yet.",
        "recommendation": "Send reviewed HR response and update query status.",
    }


def missing_doc_context(case: MissingDocumentCase) -> Dict[str, Any]:
    return {
        "person_name": case.person_name,
        "role_or_category": case.role or "Onboarding",
        "situation": f"Required documents: {case.required_documents}\nSubmitted documents: {case.submitted_documents}",
        "evidence": f"Missing documents: {case.missing_documents}",
        "recommendation": "Request pending documents and proceed only after checklist completion or exception approval.",
    }


def manual_context(payload) -> Dict[str, Any]:
    return {
        "person_name": safe(payload.person_name, "Person"),
        "role_or_category": safe(payload.role_or_category, "General"),
        "situation": safe(payload.situation, "No situation provided."),
        "evidence": safe(payload.evidence, "No evidence provided."),
        "recommendation": safe(payload.recommendation, ""),
    }


def generate_decision_memo(payload, source_context: Dict[str, Any]) -> Dict[str, Any]:
    person_name = safe(source_context.get("person_name"), safe(payload.person_name, "Person"))
    role_or_category = safe(source_context.get("role_or_category"), safe(payload.role_or_category, "General"))
    situation = safe(source_context.get("situation"), safe(payload.situation, ""))
    evidence = safe(source_context.get("evidence"), safe(payload.evidence, ""))
    recommendation = infer_recommendation(
        payload.decision_type,
        source_context,
        safe(payload.recommendation, source_context.get("recommendation", "")),
    )
    reviewer_name = safe(payload.reviewer_name, "HR Team")

    risk_level = infer_risk_level(payload.decision_type, situation, evidence, recommendation)

    title = f"{payload.decision_type} Memo - {person_name}"

    sections = build_sections(
        decision_type=payload.decision_type,
        person_name=person_name,
        role_or_category=role_or_category,
        situation=situation,
        evidence=evidence,
        recommendation=recommendation,
        risk_level=risk_level,
        reviewer_name=reviewer_name,
    )

    memo = build_memo(title, sections)

    return {
        "title": title,
        "person_name": person_name,
        "decision_type": payload.decision_type,
        "recommendation": recommendation,
        "risk_level": risk_level,
        "memo": memo,
        "sections": sections,
    }
