import os
import re
from typing import Any, Dict, List


SECTION_LABELS = {
    "contact": ["contact", "personal details"],
    "summary": ["summary", "profile summary", "objective", "career objective", "about"],
    "skills": ["skills", "technical skills", "technologies", "tools", "core competencies"],
    "experience": ["experience", "work experience", "professional experience", "employment", "internship", "internships"],
    "projects": ["projects", "academic projects", "personal projects", "project work"],
    "education": ["education", "academic", "academics", "qualification", "qualifications"],
    "certifications": ["certifications", "certification", "courses", "training"],
}

BAD_NAME_WORDS = {
    "resume", "curriculum", "vitae", "cv", "profile", "summary", "objective",
    "email", "phone", "mobile", "contact", "address", "linkedin", "github",
    "education", "skills", "experience", "projects", "certifications",
    "declaration", "portfolio", "candidate", "role", "designation", "title",
    "frontend", "backend", "developer", "engineer", "analyst", "intern"
}

SKILLS = [
    # Software / AI / data
    "python", "java", "javascript", "typescript", "react", "next.js", "node.js",
    "express", "mongodb", "mysql", "postgresql", "sql", "sqlite", "fastapi", "flask",
    "django", "html", "css", "tailwind", "bootstrap", "git", "github",
    "docker", "aws", "azure", "firebase", "pandas", "numpy", "scikit-learn",
    "machine learning", "deep learning", "nlp", "power bi", "tableau",
    "rest api", "api", "redux", "socket.io", "jwt", "c++", "c",
    "rag", "langchain", "ai agents", "prompt engineering", "openai api",
    "vector search", "document processing", "dashboard development",
    "workflow automation", "data analysis", "classification", "summarization",

    # Finance / accounting / CA / operations
    "excel", "advanced excel", "pivot tables", "vlookup", "xlookup",
    "financial accounting", "management accounting", "cost accounting",
    "accounting", "tally", "tally erp", "tally prime", "gst", "tds",
    "income tax", "income tax basics", "taxation", "audit documentation",
    "internal controls", "bank reconciliation", "journal entries",
    "ledger scrutiny", "accounts payable", "accounts receivable",
    "invoice tracking", "invoice verification", "vendor follow-ups",
    "vendor coordination", "mis reporting", "budget tracking",
    "budget vs actual", "variance analysis", "payment trackers",
    "compliance documentation", "compliance calendar", "statutory compliance",
    "finance operations", "management reporting", "business communication",
    "powerpoint", "documentation", "expense classification",
    "financial reporting", "ratio analysis", "working capital",
    "purchase register", "sales register", "input tax credit",
]

DEGREE_RE = re.compile(
    r"\\b("
    r"B\\.?\\s?E\\.?|B\\.?\\s?Tech|M\\.?\\s?E\\.?|M\\.?\\s?Tech|"
    r"BCA|MCA|BSc|MSc|MBA|B\\.?\\s?Com|M\\.?\\s?Com|BMS|BBI|BAF|"
    r"Bachelor(?:'s)?|Master(?:'s)?|Diploma|"
    r"CA\\s?Foundation|CA\\s?Intermediate|CA\\s?Inter|Chartered Accountant|"
    r"Commerce|Management Studies|Accounting|Finance|Taxation|"
    r"Computer Engineering|Computer Science|Information Technology|"
    r"Electronics|Mechanical|Civil"
    r")\\b",
    re.I,
)

ROLE_RE = re.compile(
    r"\\b("
    r"frontend developer|front end developer|backend developer|back end developer|"
    r"full stack developer|fullstack developer|software engineer|software developer|"
    r"web developer|data analyst|data scientist|machine learning engineer|"
    r"ai engineer|full stack ai engineer|hr executive|hr manager|recruiter|"
    r"frontend intern|backend intern|"
    r"finance operations associate|finance analyst|management trainee|"
    r"ca management trainee|accounts assistant|accounts intern|"
    r"accounting intern|audit intern|finance intern|operations intern|"
    r"business analyst|mis executive|tax associate"
    r")\\b",
    re.I,
)


def clean_text(text: str) -> str:
    text = text or ""
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def read_text_from_path(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()

    if ext == ".txt":
        with open(path, "r", encoding="utf-8", errors="ignore") as file:
            return file.read()

    if ext == ".docx":
        try:
            from docx import Document
            doc = Document(path)
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return ""

    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(path)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(path)
                return "\n".join(page.extract_text() or "" for page in reader.pages)
            except Exception:
                return ""

    return ""


def coerce_text(value: Any) -> str:
    if value is None:
        return ""

    if isinstance(value, str) and os.path.exists(value):
        return clean_text(read_text_from_path(value))

    return clean_text(str(value))


def normalize_heading(line: str) -> str:
    line = re.sub(r"^[•\-\–\—|:]+", "", line.strip())
    line = re.sub(r"[:\-\–\—|]+$", "", line.strip())
    return re.sub(r"\s+", " ", line).strip().lower()


def split_inline_label(line: str):
    match = re.match(r"^\s*([A-Za-z ]{3,35})\s*[:\-]\s*(.+?)\s*$", line)

    if not match:
        return None, None

    label = normalize_heading(match.group(1))
    value = match.group(2).strip()

    for section, labels in SECTION_LABELS.items():
        if label in labels:
            return section, value

    return None, None


def heading_match(line: str) -> str:
    heading = normalize_heading(line)

    if not heading or len(heading) > 70:
        return ""

    for section, labels in SECTION_LABELS.items():
        if heading in labels:
            return section

    # Compound headings:
    # "Experience and Achievements", "Projects / Work", "Technical Skills"
    for section, labels in SECTION_LABELS.items():
        for label in labels:
            label_pattern = r"\b" + re.escape(label) + r"\b"
            if re.search(label_pattern, heading, flags=re.I):
                return section

    return ""


def split_sections(text: str) -> Dict[str, Dict[str, Any]]:
    lines = [line.rstrip() for line in text.splitlines()]
    sections = {}
    current = "header"
    buffer = []

    def add_section(section_name, value):
        value = value.strip()
        if not value:
            return

        if section_name not in sections:
            sections[section_name] = {"text": value}
        else:
            sections[section_name]["text"] += "\n" + value

    def flush():
        nonlocal buffer
        section_text = "\n".join(buffer).strip()
        if section_text:
            add_section(current, section_text)
        buffer = []

    for line in lines:
        clean = line.strip()

        inline_section, inline_value = split_inline_label(clean)
        if inline_section and inline_value:
            flush()
            add_section(inline_section, inline_value)
            current = inline_section
            continue

        matched = heading_match(clean)
        if matched:
            flush()
            current = matched
            continue

        buffer.append(line)

    flush()

    # Fallback collection from all lines, but only with direct evidence.
    if "education" not in sections:
        education_lines = []
        for line in lines:
            if DEGREE_RE.search(line) or re.search(r"\bcollege|university|institute|cgpa|gpa|percentage|grade\b", line, re.I):
                education_lines.append(line.strip())
        if education_lines:
            add_section("education", "\n".join(education_lines))

    if "experience" not in sections:
        experience_lines = []
        for line in lines:
            if re.search(r"\b(internship|intern|work experience|professional experience|employment)\b", line, re.I):
                experience_lines.append(line.strip())
            elif re.search(r"\b(20\d{2}|19\d{2}|present|current)\b", line, re.I) and re.search(r"\b(developer|engineer|analyst|intern|company|studio|pvt|ltd|llp|inc)\b", line, re.I):
                experience_lines.append(line.strip())
        if experience_lines:
            add_section("experience", "\n".join(experience_lines))

    return sections


def extract_email(text: str) -> str:
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match.group(0).strip() if match else ""


def extract_phone(text: str) -> str:
    patterns = [
        r"(?:\+91[\s-]?)?[6-9]\d{9}",
        r"(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}",
        r"\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0).strip()

    return ""


def looks_like_name(line: str) -> bool:
    raw = line.strip()
    lower = raw.lower()

    if not raw:
        return False

    if ":" in raw or "|" in raw:
        return False

    if any(word in lower for word in BAD_NAME_WORDS):
        return False

    if "@" in raw or "http" in lower or "www." in lower:
        return False

    if re.search(r"\d", raw):
        return False

    if len(raw) < 4 or len(raw) > 45:
        return False

    words = raw.split()

    if not (2 <= len(words) <= 4):
        return False

    for word in words:
        cleaned = re.sub(r"[^A-Za-z]", "", word)
        if len(cleaned) < 2:
            return False

    return True


def name_from_email(email: str) -> str:
    if not email:
        return "Unknown Candidate"

    local = email.split("@")[0]
    local = re.sub(r"\d+", " ", local)
    local = re.sub(r"[._+-]+", " ", local)
    words = [word.capitalize() for word in local.split() if len(word) > 1]

    if len(words) >= 2:
        return " ".join(words[:3])

    return "Unknown Candidate"


def extract_name(text: str, sections: Dict[str, Dict[str, Any]]) -> str:
    header = sections.get("header", {}).get("text", "")
    lines = [line.strip() for line in header.splitlines() if line.strip()]

    for line in lines[:12]:
        if looks_like_name(line):
            return " ".join(word.capitalize() for word in line.split())

    labelled = re.search(
        r"(?:^|\n)\s*(?:name|candidate name)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{3,45})",
        text,
        flags=re.I,
    )

    if labelled and looks_like_name(labelled.group(1)):
        return " ".join(word.capitalize() for word in labelled.group(1).split())

    return name_from_email(extract_email(text))


def extract_skills(text: str) -> List[str]:
    lower = text.lower()
    found = []

    for skill in SKILLS:
        pattern = r"\b" + re.escape(skill.lower()).replace(r"\ ", r"\s+") + r"\b"
        if re.search(pattern, lower):
            upper_skills = {"sql", "api", "aws", "gst", "tds", "mis", "rag", "jwt", "html", "css", "ca"}
            pretty = skill.upper() if skill.lower() in upper_skills else skill.title()
            pretty = pretty.replace("Next.Js", "Next.js").replace("Node.Js", "Node.js")
            pretty = pretty.replace("Fastapi", "FastAPI").replace("Openai", "OpenAI")
            pretty = pretty.replace("Vlookup", "VLOOKUP").replace("Xlookup", "XLOOKUP")
            pretty = pretty.replace("Tally Erp", "Tally ERP")
            found.append(pretty)

    result = []
    seen = set()

    for skill in found:
        key = skill.lower()
        if key not in seen:
            result.append(skill)
            seen.add(key)

    return result


def clean_section_lines(text: str, max_lines: int = 5) -> str:
    lines = []

    for line in text.splitlines():
        clean = re.sub(r"\s+", " ", line).strip(" -|•")
        if clean:
            lines.append(clean)

    return " | ".join(lines[:max_lines]) if lines else "Not detected"


def extract_education(sections: Dict[str, Dict[str, Any]]) -> str:
    text = sections.get("education", {}).get("text", "")

    if not text:
        return "Not detected"

    lines = []

    for line in text.splitlines():
        clean = re.sub(r"\s+", " ", line).strip(" -|•")
        if not clean or len(clean) > 180:
            continue

        if DEGREE_RE.search(clean) or re.search(
            r"\b(college|university|institute|school|cgpa|gpa|percentage|marks|grade|"
            r"commerce|management|accounting|finance|ca foundation|ca intermediate|ca inter|"
            r"bachelor of commerce|bachelor of management studies)\b",
            clean,
            re.I,
        ):
            lines.append(clean)

    return " | ".join(lines[:6]) if lines else clean_section_lines(text, max_lines=5)


def extract_experience(sections: Dict[str, Dict[str, Any]]) -> str:
    text = sections.get("experience", {}).get("text", "")

    if not text:
        return "Not detected"

    lines = []

    for line in text.splitlines():
        clean = re.sub(r"\s+", " ", line).strip(" -|•")
        if not clean or len(clean) > 220:
            continue

        if re.search(
            r"\b(internship|intern|developer|engineer|analyst|manager|executive|associate|"
            r"consultant|company|studio|pvt|ltd|llp|inc|present|current|20\d{2}|19\d{2}|"
            r"accounts assistant|finance|operations|audit|accounting|tax|vendor|invoice|"
            r"bank reconciliation|mis|tally|gst|tds)\b",
            clean,
            re.I,
        ):
            lines.append(clean)

    return " | ".join(lines[:7]) if lines else clean_section_lines(text, max_lines=5)


def extract_projects(sections: Dict[str, Dict[str, Any]]) -> str:
    text = sections.get("projects", {}).get("text", "")

    if not text:
        return ""

    return clean_section_lines(text, max_lines=8)


def estimate_experience_years(experience: str) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)\s*years?", experience or "", flags=re.I)
    return float(match.group(1)) if match else 0.0


def extract_role(text: str, sections: Dict[str, Dict[str, Any]]) -> str:
    search_space = "\n".join([
        sections.get("header", {}).get("text", ""),
        sections.get("summary", {}).get("text", ""),
        sections.get("experience", {}).get("text", ""),
        sections.get("projects", {}).get("text", ""),
    ])

    match = ROLE_RE.search(search_space)

    if match:
        return match.group(1).title().replace("Front End", "Frontend").replace("Back End", "Backend")

    return ""


def parse_resume_text(text: str) -> Dict[str, Any]:
    text = coerce_text(text)
    sections = split_sections(text)

    name = extract_name(text, sections)
    email = extract_email(text)
    phone = extract_phone(text)

    skills_text = "\n".join([
        sections.get("skills", {}).get("text", ""),
        sections.get("projects", {}).get("text", ""),
        sections.get("experience", {}).get("text", ""),
    ])

    if not skills_text.strip():
        skills_text = text

    skills = extract_skills(skills_text)
    education = extract_education(sections)
    experience = extract_experience(sections)
    projects = extract_projects(sections)
    role = extract_role(text, sections)

    summary_parts = []

    if role:
        summary_parts.append(f"Role: {role}")

    if experience != "Not detected":
        summary_parts.append(f"Experience: {experience}")

    if education != "Not detected":
        summary_parts.append(f"Education: {education}")

    if projects:
        summary_parts.append(f"Projects: {projects}")

    if skills:
        summary_parts.append(f"Key skills: {', '.join(skills[:8])}")

    summary = " | ".join(summary_parts) if summary_parts else "Resume parsed. No strong summary fields detected."

    return {
        "name": name,
        "candidate_name": name,
        "email": email,
        "phone": phone,
        "skills": skills,
        "education": education,
        "experience": experience,
        "projects": projects,
        "experience_years": estimate_experience_years(experience),
        "role": role,
        "summary": summary,
        "sections": sections,
        "raw_text": text,
    }


def parse_candidate_resume(value: Any) -> Dict[str, Any]:
    return parse_resume_text(coerce_text(value))


def parse_resume(value: Any) -> Dict[str, Any]:
    return parse_candidate_resume(value)


def extract_candidate_info(value: Any) -> Dict[str, Any]:
    return parse_candidate_resume(value)


def extract_candidate_details(value: Any) -> Dict[str, Any]:
    return parse_candidate_resume(value)


def parse_candidate_from_text(value: Any) -> Dict[str, Any]:
    return parse_candidate_resume(value)

