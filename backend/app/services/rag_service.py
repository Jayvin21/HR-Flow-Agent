import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.document import Document


STOPWORDS = {
    "the", "is", "are", "am", "a", "an", "and", "or", "to", "of", "in", "on",
    "for", "with", "by", "from", "as", "at", "be", "this", "that", "it", "can",
    "i", "we", "you", "they", "he", "she", "what", "which", "who", "when",
    "where", "why", "how", "does", "do", "did", "have", "has", "had", "about",
    "please", "tell", "me", "show", "find"
}


def tokenize(text: str) -> List[str]:
    tokens = re.findall(r"[a-zA-Z0-9+#.\-]+", (text or "").lower())
    return [token for token in tokens if token not in STOPWORDS and len(token) > 1]


def split_into_chunks(text: str, chunk_size: int = 900, overlap: int = 160) -> List[str]:
    if not text:
        return []

    text = re.sub(r"\s+", " ", text).strip()

    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start = end - overlap

        if start < 0:
            start = end

    return chunks


def score_chunk(question_terms: List[str], chunk: str) -> int:
    chunk_lower = chunk.lower()
    score = 0

    for term in question_terms:
        occurrences = chunk_lower.count(term)
        if occurrences:
            score += occurrences * 3

    if len(question_terms) >= 2:
        for i in range(len(question_terms) - 1):
            phrase = f"{question_terms[i]} {question_terms[i + 1]}"
            if phrase in chunk_lower:
                score += 8

    return score


def retrieve_relevant_sources(
    db: Session,
    question: str,
    workspace_id: int | None = None,
    limit: int = 5,
    allowed_document_types: Optional[List[str]] = None,
    blocked_document_types: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    question_terms = tokenize(question)

    query = db.query(Document).filter(Document.extracted_text.isnot(None))

    if workspace_id:
        query = query.filter(Document.workspace_id == workspace_id)

    if allowed_document_types:
        query = query.filter(Document.document_type.in_(allowed_document_types))

    if blocked_document_types:
        query = query.filter(~Document.document_type.in_(blocked_document_types))

    documents = query.all()

    scored_sources = []

    for document in documents:
        chunks = split_into_chunks(document.extracted_text or "")

        for chunk in chunks:
            score = score_chunk(question_terms, chunk)

            # Bonus: HR evidence docs are more important than generic docs.
            if document.document_type in ["HR Policy", "Attendance", "Dispute", "Employee Query"]:
                score += 8

            if score > 0:
                scored_sources.append({
                    "document_id": document.id,
                    "filename": document.original_filename,
                    "document_type": document.document_type,
                    "snippet": chunk[:700],
                    "score": score,
                })

    scored_sources.sort(key=lambda item: item["score"], reverse=True)

    unique_sources = []
    seen = set()

    for source in scored_sources:
        key = (source["document_id"], source["snippet"][:120])

        if key in seen:
            continue

        seen.add(key)
        unique_sources.append(source)

        if len(unique_sources) >= limit:
            break

    return unique_sources


def build_grounded_answer(question: str, sources: List[Dict[str, Any]]) -> tuple[str, str]:
    if not sources:
        return (
            "I could not find enough relevant information in the uploaded documents to answer this. Upload the relevant HR policy, attendance, employee query, dispute, or general HR document, then ask again.",
            "low"
        )

    combined_text = "\n\n".join(
        f"[Source {index + 1}: {source['filename']}]\n{source['snippet']}"
        for index, source in enumerate(sources)
    )

    question_terms = tokenize(question)

    relevant_sentences = []

    sentences = re.split(r"(?<=[.!?])\s+", combined_text)

    for sentence in sentences:
        sentence_lower = sentence.lower()
        hit_count = sum(1 for term in question_terms if term in sentence_lower)

        if hit_count > 0:
            relevant_sentences.append((hit_count, sentence.strip()))

    relevant_sentences.sort(key=lambda item: item[0], reverse=True)

    selected = []
    seen = set()

    for _, sentence in relevant_sentences:
        clean = sentence.strip()

        if not clean or clean in seen:
            continue

        seen.add(clean)
        selected.append(clean)

        if len(selected) >= 5:
            break

    if not selected:
        selected = [sources[0]["snippet"][:500]]

    answer_lines = [
        "Based on the uploaded documents, here is what I found:"
    ]

    for idx, sentence in enumerate(selected, start=1):
        answer_lines.append(f"{idx}. {sentence}")

    answer_lines.append("")
    answer_lines.append("This answer is grounded only in the retrieved uploaded document snippets.")

    confidence = "high" if len(sources) >= 2 else "medium"

    return "\n".join(answer_lines), confidence
