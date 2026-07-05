import re
from typing import List, Dict, Any
from app.models.candidate import Candidate
from app.services.jd_matcher import extract_skills_from_text


def split_skills(skills: str | None) -> List[str]:
    if not skills:
        return []

    return [
        skill.strip()
        for skill in skills.split(",")
        if skill.strip()
    ]


def clean_lines(text: str | None, limit: int = 5) -> List[str]:
    if not text:
        return []

    lines = [
        re.sub(r"\s+", " ", line).strip()
        for line in text.splitlines()
        if line.strip()
    ]

    return lines[:limit]


def generate_technical_questions(candidate_skills: List[str], jd_skills: List[str]) -> List[str]:
    priority_skills = []

    for skill in jd_skills:
        if skill in candidate_skills:
            priority_skills.append(skill)

    for skill in candidate_skills:
        if skill not in priority_skills:
            priority_skills.append(skill)

    questions = []

    for skill in priority_skills[:6]:
        questions.append(
            f"Explain your practical experience with {skill}. Which project did you use it in, and what problem did it solve?"
        )

    if not questions:
        questions = [
            "Walk me through the strongest technical project on your resume.",
            "Which technologies are you most comfortable using, and why?",
            "Explain a technical problem you solved recently.",
        ]

    return questions


def generate_resume_verification_questions(candidate: Candidate) -> List[str]:
    questions = [
        "Give a quick walkthrough of your resume from education to your most recent project or experience.",
        "Which claim on your resume best represents your actual hands-on ability?",
    ]

    if candidate.experience:
        questions.append(
            "Your resume mentions experience. What exactly was your responsibility, and what part did you personally build or handle?"
        )
    else:
        questions.append(
            "Your resume does not clearly show professional experience. Which project best proves job readiness?"
        )

    if candidate.education:
        questions.append(
            "How has your education prepared you for this role beyond basic coursework?"
        )

    return questions


def generate_project_questions(candidate: Candidate, candidate_skills: List[str]) -> List[str]:
    project_lines = clean_lines(candidate.projects, limit=4)
    questions = []

    if project_lines:
        for project in project_lines[:3]:
            questions.append(
                f"Your resume mentions: '{project}'. Explain the architecture, your contribution, and the hardest technical decision."
            )
    else:
        questions.append(
            "Pick one project from your resume and explain its architecture, data flow, and your exact contribution."
        )

    if candidate_skills:
        questions.append(
            f"Choose one project where you used {candidate_skills[0]}. What would break first if the project scaled to 10x users?"
        )

    questions.append(
        "What would you improve if you rebuilt your best project from scratch today?"
    )

    return questions


def generate_gap_questions(candidate_skills: List[str], jd_skills: List[str]) -> List[str]:
    candidate_set = {skill.lower() for skill in candidate_skills}
    missing = [
        skill
        for skill in jd_skills
        if skill.lower() not in candidate_set
    ]

    questions = []

    for skill in missing[:5]:
        questions.append(
            f"The JD expects {skill}, but it is not clearly visible in your resume. What is your current level with it?"
        )

    if not questions:
        questions = [
            "The resume aligns well with the JD. Which required skill do you think is still your weakest?",
            "What part of this role would require the fastest learning curve for you?",
        ]

    return questions


def generate_hr_questions(candidate: Candidate) -> List[str]:
    return [
        "Why are you interested in this role and this type of work?",
        "Describe a time you received critical feedback. What changed after that?",
        "How do you handle deadlines when requirements are unclear?",
        "What kind of team or manager helps you perform best?",
        "What are your expectations from this role in the next 6 months?",
    ]


def generate_scorecard(candidate_skills: List[str], jd_skills: List[str]) -> List[Dict[str, Any]]:
    return [
        {
            "criterion": "Core Technical Skill",
            "what_to_check": "Can the candidate explain the main required technologies with practical depth?",
            "max_score": 25,
        },
        {
            "criterion": "Project Ownership",
            "what_to_check": "Can the candidate clearly separate personal contribution from team/project claims?",
            "max_score": 20,
        },
        {
            "criterion": "Problem Solving",
            "what_to_check": "Can the candidate reason through debugging, tradeoffs, and implementation decisions?",
            "max_score": 20,
        },
        {
            "criterion": "JD Fit",
            "what_to_check": "Does the candidate match the role requirements and show ability to close missing gaps?",
            "max_score": 20,
        },
        {
            "criterion": "Communication",
            "what_to_check": "Can the candidate explain work clearly without vague or inflated claims?",
            "max_score": 15,
        },
    ]


def generate_interview_pack(candidate: Candidate, jd_text: str | None = "") -> Dict[str, Any]:
    candidate_skills = split_skills(candidate.skills)
    jd_skills = extract_skills_from_text(jd_text or "")

    sections = [
        {
            "title": "Technical Questions",
            "questions": generate_technical_questions(candidate_skills, jd_skills),
        },
        {
            "title": "Resume Verification",
            "questions": generate_resume_verification_questions(candidate),
        },
        {
            "title": "Project Deep-Dive",
            "questions": generate_project_questions(candidate, candidate_skills),
        },
        {
            "title": "Skill Gap Validation",
            "questions": generate_gap_questions(candidate_skills, jd_skills),
        },
        {
            "title": "HR / Behavioral Questions",
            "questions": generate_hr_questions(candidate),
        },
    ]

    summary_parts = []

    if candidate.current_role:
        summary_parts.append(f"Candidate appears aligned with {candidate.current_role}.")

    if candidate_skills:
        summary_parts.append(f"Detected skills: {', '.join(candidate_skills[:10])}.")

    if jd_skills:
        matched = [
            skill
            for skill in jd_skills
            if skill.lower() in {candidate_skill.lower() for candidate_skill in candidate_skills}
        ]
        summary_parts.append(f"JD skill overlap: {len(matched)} of {len(jd_skills)} detected skill signals.")

    summary = " ".join(summary_parts) if summary_parts else "Candidate interview pack generated from parsed resume data."

    return {
        "candidate_id": candidate.id,
        "candidate_name": candidate.name,
        "role": candidate.current_role,
        "summary": summary,
        "sections": sections,
        "scorecard": generate_scorecard(candidate_skills, jd_skills),
    }
