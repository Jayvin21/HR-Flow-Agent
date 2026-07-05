
def build_candidate_match_text(candidate):
    """
    JD matching must use the full CV evidence, not only the UI summary.
    Priority:
    1. raw_text / resume_text from parsed CV
    2. linked document extracted_text if relationship exists
    3. structured fields as fallback
    """
    parts = []

    for field in ["raw_text", "resume_text"]:
        value = getattr(candidate, field, None)
        if value:
            parts.append(str(value))

    document = getattr(candidate, "document", None)
    if document is not None:
        for field in ["extracted_text", "text", "content"]:
            value = getattr(document, field, None)
            if value:
                parts.append(str(value))

    for field in [
        "name",
        "role",
        "skills",
        "education",
        "experience",
        "summary",
    ]:
        value = getattr(candidate, field, None)
        if value:
            parts.append(str(value))

    return "\n\n".join(parts).strip()
import re
from typing import List, Dict, Any
from app.models.candidate import Candidate


SKILL_ALIASES = {
    "React": ["react", "react.js", "reactjs"],
    "Next.js": ["next", "next.js", "nextjs"],
    "Node.js": ["node", "node.js", "nodejs"],
    "Express.js": ["express", "express.js"],
    "JavaScript": ["javascript", "js"],
    "TypeScript": ["typescript", "ts"],
    "Tailwind CSS": ["tailwind", "tailwind css"],
    "HTML": ["html"],
    "CSS": ["css"],
    "REST APIs": ["rest", "rest api", "rest apis", "api integration"],
    "MongoDB": ["mongodb", "mongo"],
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql"],
    "SQLite": ["sqlite"],
    "SQL": ["sql"],
    "Python": ["python"],
    "FastAPI": ["fastapi", "fast api"],
    "Flask": ["flask"],
    "Django": ["django"],
    "Git": ["git"],
    "GitHub": ["github"],
    "Docker": ["docker"],
    "AWS": ["aws"],
    "Azure": ["azure"],
    "GCP": ["gcp", "google cloud"],
    "JWT": ["jwt", "json web token"],
    "Authentication": ["authentication", "auth", "login"],
    "Dashboard UI": ["dashboard", "admin panel", "analytics dashboard"],
    "SaaS": ["saas"],
    "Excel": ["excel"],
    "Power BI": ["power bi", "powerbi"],
    "Machine Learning": ["machine learning", "ml"],
    "RAG": ["rag", "retrieval augmented generation"],
    "LLM": ["llm", "large language model"],
    "LangChain": ["langchain"],
    "ChromaDB": ["chromadb", "chroma"],
    "FAISS": ["faiss"],
}


def normalize_text(text: str) -> str:
    return (text or "").lower()


def extract_required_skills(jd_text: str) -> List[str]:
    text = normalize_text(jd_text)
    found = []

    for canonical, aliases in SKILL_ALIASES.items():
        if any(alias in text for alias in aliases):
            found.append(canonical)

    return sorted(set(found))


# Backward-compatible function used by interview_generator.py
def extract_skills_from_text(text: str) -> List[str]:
    return extract_required_skills(text)


def parse_candidate_skills(candidate: Candidate) -> List[str]:
    raw = candidate.skills or ""

    skills = [
        item.strip()
        for item in raw.split(",")
        if item and item.strip()
    ]

    normalized_found = []

    candidate_blob = normalize_text(
        " ".join([
            candidate.skills or "",
            candidate.summary or "",
            candidate.projects or "",
            candidate.experience or "",
            candidate.current_role or "",
        ])
    )

    for canonical, aliases in SKILL_ALIASES.items():
        if any(alias in candidate_blob for alias in aliases):
            normalized_found.append(canonical)

    for skill in skills:
        if skill not in normalized_found:
            normalized_found.append(skill)

    return sorted(set(normalized_found))


def score_candidate(candidate: Candidate, required_skills: List[str], jd_text: str) -> Dict[str, Any]:
    candidate_skills = parse_candidate_skills(candidate)

    candidate_skill_set = {skill.lower() for skill in candidate_skills}
    required_skill_set = {skill.lower() for skill in required_skills}

    matched_skills = [
        skill
        for skill in required_skills
        if skill.lower() in candidate_skill_set
    ]

    missing_skills = [
        skill
        for skill in required_skills
        if skill.lower() not in candidate_skill_set
    ]

    skill_score = 0

    if required_skills:
        skill_score = int((len(matched_skills) / len(required_skills)) * 60)

    role_score = 0
    jd_lower = normalize_text(jd_text)
    role_lower = normalize_text(candidate.current_role or "")

    if role_lower and any(token in jd_lower for token in role_lower.split()):
        role_score = 10

    project_score = 0
    if candidate.projects:
        project_score = min(15, len(candidate.projects) // 80)

    experience_score = 0
    if candidate.experience:
        experience_score = min(10, len(candidate.experience) // 100)

    education_score = 5 if candidate.education else 0

    score = min(100, skill_score + role_score + project_score + experience_score + education_score)

    if score >= 85:
        verdict = "Strong Fit"
    elif score >= 70:
        verdict = "Good Fit"
    elif score >= 55:
        verdict = "Moderate Fit"
    elif score >= 40:
        verdict = "Weak Fit"
    else:
        verdict = "Not Recommended"

    strengths = []

    if matched_skills:
        strengths.append(f"Matches {len(matched_skills)} required skill(s): {', '.join(matched_skills[:8])}.")

    if candidate.projects:
        strengths.append("Has project experience relevant to implementation work.")

    if candidate.experience:
        strengths.append("Has professional or internship experience listed.")

    if not strengths:
        strengths.append("Candidate profile has limited structured strengths detected.")

    gaps = []

    if missing_skills:
        gaps.append(f"Missing or unclear skills: {', '.join(missing_skills[:8])}.")

    if not candidate.experience:
        gaps.append("Experience section is weak or missing.")

    if not candidate.projects:
        gaps.append("Project evidence is weak or missing.")

    if not gaps:
        gaps.append("No major gap detected from parsed resume text.")

    explanation = (
        f"{candidate.name} scored {score}/100. "
        f"The score is based on skill overlap, role relevance, projects, experience, and education. "
        f"Verdict: {verdict}."
    )

    return {
        "candidate_id": candidate.id,
        "candidate_name": candidate.name,
        "candidate_role": candidate.current_role,
        "candidate_email": candidate.email,
        "recruitment_status": candidate.recruitment_status or "New",
        "match_score": score,
        "verdict": verdict,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "candidate_skills": candidate_skills,
        "required_skills": required_skills,
        "strengths": strengths,
        "gaps": gaps,
        "explanation": explanation,
    }


def match_candidates_to_jd(candidates: List[Candidate], jd_text: str) -> Dict[str, Any]:
    required_skills = extract_required_skills(jd_text)

    active_candidates = [
        candidate
        for candidate in candidates
        if (candidate.recruitment_status or "New") not in {"Rejected", "Hired"}
    ]

    matches = [
        score_candidate(candidate, required_skills, jd_text)
        for candidate in active_candidates
    ]

    matches.sort(key=lambda item: item["match_score"], reverse=True)

    average_score = 0

    if matches:
        average_score = round(
            sum(item["match_score"] for item in matches) / len(matches),
            2
        )

    return {
        "jd_required_skills": required_skills,
        "total_candidates": len(matches),
        "average_score": average_score,
        "matches": matches,
    }

