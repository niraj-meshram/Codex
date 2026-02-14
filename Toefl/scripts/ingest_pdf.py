#!/usr/bin/env python3
import argparse
import json
import re
from pathlib import Path

import chromadb

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None
try:
    import pdfplumber
except ImportError:
    pdfplumber = None


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def extract_pdf_text(pdf_path: Path) -> str:
    if PdfReader is not None:
        reader = PdfReader(str(pdf_path))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    if pdfplumber is not None:
        with pdfplumber.open(str(pdf_path)) as pdf:
            return "\n".join((p.extract_text() or "") for p in pdf.pages)
    raise RuntimeError("Missing dependency: install either `pypdf` or `pdfplumber`.")


class LocalHashEmbedding:
    def name(self) -> str:
        return "local_hash_embedding"

    def __call__(self, input: list[str]) -> list[list[float]]:
        vectors = []
        for text in input:
            vec = [0.0] * 128
            for tok in re.findall(r"\b\w+\b", (text or "").lower()):
                vec[hash(tok) % 128] += 1.0
            norm = sum(v * v for v in vec) ** 0.5 or 1.0
            vectors.append([v / norm for v in vec])
        return vectors


def split_prompt_sections(text: str) -> list[str]:
    parts = re.split(r"(?=\n?#\d{1,3}\b)", text)
    return [p.strip() for p in parts if re.search(r"#\d{1,3}\b", p)]


def classify_task(chunk: str) -> str:
    c = chunk.lower()
    if "to:" in c and "subject:" in c:
        return "email"
    if "academic discussion" in c or "professor" in c:
        return "discussion"
    return "email"


def parse_email_chunk(chunk: str, prompt_num: str) -> dict:
    to_field = None
    subject = None

    to_match = re.search(r"(?im)^\s*To\s*:\s*(.+)$", chunk)
    if to_match:
        to_field = normalize(to_match.group(1))
    subject_match = re.search(r"(?im)^\s*Subject\s*:\s*(.+)$", chunk)
    if subject_match:
        subject = normalize(subject_match.group(1))

    bullets = re.findall(r"(?m)^\s*[-\u2022?]\s+(.+)$", chunk)
    if not bullets:
        bullets = re.findall(r"(?m)^\s*\d+[\).]\s+(.+)$", chunk)
    if not bullets:
        section = re.search(r"(?is)do the following:\s*(.+?)(?:write as much as you can|complete sentences|$)", chunk)
        if section:
            lines = [x.strip() for x in section.group(1).splitlines()]
            for line in lines:
                if not line:
                    continue
                low = line.lower()
                if "space for typing answers" in low or "on test day" in low:
                    continue
                cleaned = re.sub(r"^[^\w]+", "", line).strip()
                if cleaned:
                    bullets.append(cleaned)

    bullets = [normalize(b) for b in bullets if normalize(b)]
    merged: list[str] = []
    for item in bullets:
        if merged and item and item[0].islower():
            merged[-1] = normalize(f"{merged[-1]} {item}")
        else:
            merged.append(item)
    bullets = merged

    return {
        "task_type": "email",
        "prompt_id": prompt_num,
        "title": f"Write an Email {prompt_num}",
        "constraints": {"time_minutes": 7, "min_words": 0},
        "raw_text": chunk,
        "to_field": to_field,
        "subject": subject,
        "bullet_points": bullets,
        "professor_prompt": None,
        "student_posts": [],
    }


def parse_discussion_chunk(chunk: str, prompt_num: str) -> dict:
    professor_prompt = ""
    student_posts: list[str] = []
    professor_marker = re.search(r"(?is)(Dr\.\s+[A-Z][a-z]+)\s*(.+?)(?:Space for typing answers|On test day|Free Writing Practice|$)", chunk)
    if professor_marker:
        professor_prompt = normalize(professor_marker.group(2))

    discussion_region = ""
    if professor_marker:
        discussion_region = chunk.split(professor_marker.group(1), 1)[0]
    if discussion_region:
        cleaned_lines = []
        for line in discussion_region.splitlines():
            s = line.strip()
            low = s.lower()
            if not s:
                continue
            if low.startswith("#"):
                continue
            if "your professor is teaching" in low:
                continue
            if "write a post responding" in low:
                continue
            if "in your response" in low:
                continue
            if "following." in low:
                continue
            if "express and support your opinion" in low:
                continue
            if "make a contribution" in low:
                continue
            if "an effective response" in low:
                continue
            cleaned_lines.append(s)
        discussion_region = normalize(" ".join(cleaned_lines))

    if discussion_region and len(discussion_region.split()) > 20:
        sentences = re.split(r"(?<=[.!?])\s+", discussion_region)
        mid = max(1, len(sentences) // 2)
        p1 = normalize(" ".join(sentences[:mid]))
        p2 = normalize(" ".join(sentences[mid:]))
        if p1:
            student_posts.append(p1)
        if p2:
            student_posts.append(p2)

    return {
        "task_type": "discussion",
        "prompt_id": prompt_num,
        "title": f"Academic Discussion {prompt_num}",
        "constraints": {"time_minutes": 10, "min_words": 100},
        "raw_text": chunk,
        "to_field": None,
        "subject": None,
        "bullet_points": [],
        "professor_prompt": professor_prompt,
        "student_posts": student_posts,
    }


def parse_prompts(full_text: str) -> list[dict]:
    prompts: list[dict] = []
    for chunk in split_prompt_sections(full_text):
        match = re.search(r"#(\d{1,3})", chunk)
        if not match:
            continue
        prompt_num = match.group(1)
        task_type = classify_task(chunk)
        parsed = parse_discussion_chunk(chunk, prompt_num) if task_type == "discussion" else parse_email_chunk(chunk, prompt_num)
        prompts.append(parsed)
    return prompts


def build_chroma(prompts: list[dict], chroma_dir: Path):
    chroma_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_dir))
    embed_fn = LocalHashEmbedding()
    try:
        client.delete_collection("toefl_prompts")
    except Exception:
        pass

    collection = client.get_or_create_collection("toefl_prompts", embedding_function=embed_fn)
    if not prompts:
        return

    collection.add(
        ids=[p["prompt_id"] for p in prompts],
        documents=[p["raw_text"] for p in prompts],
        metadatas=[
            {
                "task_type": p["task_type"],
                "prompt_id": p["prompt_id"],
                "title": p["title"],
                "constraints": json.dumps(p["constraints"]),
                "raw_text": p["raw_text"][:1500],
            }
            for p in prompts
        ],
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--chroma-dir", required=True)
    args = parser.parse_args()

    text = extract_pdf_text(Path(args.pdf))
    prompts = parse_prompts(text)

    output_json = Path(args.output_json)
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(prompts, indent=2, ensure_ascii=False), encoding="utf-8")
    build_chroma(prompts, Path(args.chroma_dir))

    print(f"Extracted {len(prompts)} prompts to {output_json}")


if __name__ == "__main__":
    main()
