import json
from typing import List, Dict, Any


def build_employee_response_draft(
    employee_name: str,
    question: str,
    policy_answer: str,
    sources: List[Dict[str, Any]]
) -> str:
    source_lines = []

    for index, source in enumerate(sources, start=1):
        source_lines.append(f"[{index}] {source.get('filename')} - {source.get('document_type')}")

    sources_text = "\n".join(source_lines) if source_lines else "No direct policy source found."

    return f"""Hi {employee_name},

Thank you for reaching out to HR.

We reviewed your query:

"{question}"

Based on the available HR documents, here is the relevant clarification:

{policy_answer}

Sources reviewed:
{sources_text}

Please note that the final decision may depend on your employment status, approval history, manager confirmation, and the exact policy clause applicable to your case.

Regards,
HR Team"""


def serialize_sources(sources: List[Dict[str, Any]]) -> str:
    return json.dumps(sources, ensure_ascii=False)


def deserialize_sources(sources_json: str | None):
    if not sources_json:
        return []

    try:
        return json.loads(sources_json)
    except Exception:
        return []
