import re
from typing import Any


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def extract_requirements(prompt: dict[str, Any]) -> dict[str, Any]:
    constraints = prompt.get("constraints", {})
    return {
        "task_type": prompt.get("task_type"),
        "time_minutes": constraints.get("time_minutes", 0),
        "min_words": constraints.get("min_words", 0),
        "to_field": prompt.get("to_field"),
        "subject": prompt.get("subject"),
        "bullet_points": prompt.get("bullet_points", []),
        "professor_prompt": prompt.get("professor_prompt"),
        "student_posts": prompt.get("student_posts", []),
    }


def validate_rules(prompt: dict[str, Any], user_text: str) -> dict[str, Any]:
    req = extract_requirements(prompt)
    wc = _word_count(user_text)
    checks: dict[str, Any] = {
        "word_count": wc,
        "min_words_required": req["min_words"],
        "meets_min_words": wc >= req["min_words"],
    }

    text_lower = user_text.lower()
    if req["task_type"] == "email":
        bullet_hits = []
        for bullet in req["bullet_points"]:
            tokens = [t for t in re.findall(r"[a-zA-Z]{4,}", bullet.lower())][:4]
            covered = any(t in text_lower for t in tokens) if tokens else False
            bullet_hits.append({"bullet": bullet, "covered": covered})

        checks.update(
            {
                "email_format": {
                    "has_subject_line": bool(re.search(r"(?im)^subject\s*:", user_text)),
                    "has_greeting": bool(re.search(r"(?im)^(dear|hello|hi)\b", user_text.strip())),
                    "has_signoff": bool(re.search(r"(?im)\b(sincerely|best|regards|thank you)\b", user_text)),
                },
                "task_coverage": bullet_hits,
                "all_bullets_covered": all(x["covered"] for x in bullet_hits) if bullet_hits else True,
            }
        )
    else:
        professor_terms = [t.lower() for t in re.findall(r"[a-zA-Z]{5,}", req.get("professor_prompt") or "")][:8]
        responds_to_professor = any(t in text_lower for t in professor_terms) if professor_terms else True
        refs_peer = False
        for post in req.get("student_posts", []):
            key_terms = [t.lower() for t in re.findall(r"[a-zA-Z]{5,}", post)][:5]
            if any(t in text_lower for t in key_terms):
                refs_peer = True
                break
        checks.update(
            {
                "responds_to_professor": responds_to_professor,
                "references_or_builds_on_peers": refs_peer,
            }
        )

    return checks


def score_rubric(prompt: dict[str, Any], user_text: str, checks: dict[str, Any]) -> dict[str, float]:
    wc = checks["word_count"]
    sentences = re.split(r"(?<=[.!?])\s+", user_text.strip()) if user_text.strip() else []

    def clamp(v: float) -> float:
        return round(max(0.0, min(5.0, v)), 1)

    task = 2.5
    if prompt.get("task_type") == "email":
        cov = checks.get("task_coverage", [])
        if cov:
            task += (sum(1 for c in cov if c["covered"]) / len(cov)) * 2
        if checks.get("email_format", {}).get("has_subject_line"):
            task += 0.3
        if checks.get("email_format", {}).get("has_greeting"):
            task += 0.1
        if checks.get("email_format", {}).get("has_signoff"):
            task += 0.1
    else:
        if checks.get("responds_to_professor"):
            task += 1.3
        if checks.get("references_or_builds_on_peers"):
            task += 1.2
        if checks.get("meets_min_words"):
            task += 0.8

    org = 2.0 + (0.8 if len(sentences) >= 4 else 0) + (0.8 if "\n\n" in user_text else 0) + (
        0.8 if re.search(r"\b(first|however|therefore|for example|in conclusion)\b", user_text.lower()) else 0
    )
    avg_len = (wc / max(1, len(sentences))) if sentences else 0
    grammar = 2.0 + (1.0 if len(sentences) >= 3 else 0) + (0.8 if 8 <= avg_len <= 30 else 0)
    vocab = 2.2 + (0.8 if len(set(re.findall(r"\b\w+\b", user_text.lower()))) > 40 else 0)

    if prompt.get("task_type") == "email":
        vocab += 0.6 if re.search(r"\b(please|would|could|appreciate)\b", user_text.lower()) else 0
    else:
        vocab += 0.6 if re.search(r"\b(i agree|i disagree|in my view|from my perspective)\b", user_text.lower()) else 0

    return {
        "Task Fulfillment": clamp(task),
        "Organization & Coherence": clamp(org),
        "Grammar & Sentence Structure": clamp(grammar),
        "Vocabulary & Tone": clamp(vocab),
    }


def explain_scores(prompt: dict[str, Any], checks: dict[str, Any], rubric: dict[str, float]) -> dict[str, str]:
    coverage = checks.get("task_coverage", [])
    covered_count = sum(1 for c in coverage if c.get("covered"))
    total_count = len(coverage)
    email_fmt = checks.get("email_format", {})
    task_type = prompt.get("task_type")

    if task_type == "email":
        task_expl = (
            f"Task Fulfillment is {rubric['Task Fulfillment']}/5 because you covered {covered_count}/{total_count} required bullets, "
            f"subject line={'yes' if email_fmt.get('has_subject_line') else 'no'}, greeting={'yes' if email_fmt.get('has_greeting') else 'no'}, "
            f"sign-off={'yes' if email_fmt.get('has_signoff') else 'no'}."
        )
    else:
        task_expl = (
            f"Task Fulfillment is {rubric['Task Fulfillment']}/5 based on professor response="
            f"{'yes' if checks.get('responds_to_professor') else 'no'}, peer integration="
            f"{'yes' if checks.get('references_or_builds_on_peers') else 'no'}, min words="
            f"{'met' if checks.get('meets_min_words') else 'not met'}."
        )

    return {
        "Task Fulfillment": task_expl,
        "Organization & Coherence": (
            f"Organization & Coherence is {rubric['Organization & Coherence']}/5 based on paragraphing, transitions, and clear progression of ideas."
        ),
        "Grammar & Sentence Structure": (
            f"Grammar & Sentence Structure is {rubric['Grammar & Sentence Structure']}/5 based on sentence clarity, control, and variety."
        ),
        "Vocabulary & Tone": (
            f"Vocabulary & Tone is {rubric['Vocabulary & Tone']}/5 based on lexical range and appropriateness for a TOEFL {task_type} response."
        ),
    }


def generate_feedback(prompt: dict[str, Any], checks: dict[str, Any], rubric: dict[str, float]) -> dict[str, list[str]]:
    strengths: list[str] = []
    fixes: list[str] = []
    rewrite: list[str] = []

    if checks.get("meets_min_words"):
        strengths.append("Meets the minimum word requirement.")
    else:
        fixes.append(f"Increase length to at least {checks.get('min_words_required', 0)} words.")

    if prompt.get("task_type") == "email":
        fmt = checks.get("email_format", {})
        if fmt.get("has_subject_line"):
            strengths.append("Includes a clear subject line.")
        else:
            fixes.append("Add a Subject line to match TOEFL email format.")
        if not checks.get("all_bullets_covered", True):
            fixes.append("Address each bullet point explicitly in your email body.")
        else:
            strengths.append("Covers required bullet points.")
        if not fmt.get("has_greeting"):
            fixes.append("Begin with a greeting such as 'Dear [Name],'.")
        if not fmt.get("has_signoff"):
            fixes.append("End with a formal sign-off.")
        rewrite.extend(
            [
                "Use one paragraph for each bullet point.",
                "Include specific details (time, reason, and request).",
                "Keep tone polite and concise.",
            ]
        )
    else:
        if checks.get("responds_to_professor"):
            strengths.append("Directly addresses the professor question.")
        else:
            fixes.append("Answer the professor question in your first 1-2 sentences.")
        if checks.get("references_or_builds_on_peers"):
            strengths.append("Builds on peer comments.")
        else:
            fixes.append("Reference and extend one peer idea in your own words.")
        rewrite.extend(
            [
                "State your opinion clearly in the opening.",
                "Reference one peer and explain agreement/disagreement.",
                "Add one concrete supporting example.",
            ]
        )

    strongest = sorted(rubric.items(), key=lambda x: x[1], reverse=True)
    if strongest:
        strengths.append(f"Strongest area: {strongest[0][0]} ({strongest[0][1]}/5).")

    while len(strengths) < 3:
        strengths.append("Response is generally understandable.")
    while len(fixes) < 5:
        fixes.append("Improve precision and sentence variety.")

    return {
        "strengths": strengths[:3],
        "fixes": fixes[:5],
        "rewrite_suggestions": rewrite[:5],
    }


def build_improved_sample(prompt: dict[str, Any]) -> str:
    if prompt.get("task_type") == "email":
        bullets = prompt.get("bullet_points", [])
        bullet_lines = [f"{i+1}. {b}: I am addressing this point clearly with relevant details." for i, b in enumerate(bullets)]
        return (
            f"To: {prompt.get('to_field') or 'Program Coordinator'}\n"
            f"Subject: {prompt.get('subject') or 'Response to Your Request'}\n\n"
            f"Dear {prompt.get('to_field') or 'Program Coordinator'},\n\n"
            "Thank you for your email. I would like to share my response to each point below.\n\n"
            + "\n".join(bullet_lines)
            + "\n\nPlease let me know if you need any additional information.\n\nBest regards,\n[Your Name]"
        )

    prof = prompt.get("professor_prompt") or "the issue discussed in class"
    peer = (prompt.get("student_posts") or ["one peer opinion"])[0]
    return (
        "In my view, the best approach is to choose a practical solution supported by evidence. "
        f"Regarding the professor's question about {prof[:80]}, I believe we should prioritize outcomes that can be measured clearly. "
        f"One student suggested that {peer[:90]}..., and I partly agree because real results matter. "
        "However, I would also evaluate long-term effects before finalizing a decision. "
        "For example, a school policy pilot can show what works quickly and allow data-based improvements."
    )


def vocab_suggestions(user_text: str) -> list[str]:
    words = {"beneficial", "feasible", "compelling", "consequently", "moreover", "substantial", "I recommend", "in contrast"}
    used = set(re.findall(r"\b[\w']+\b", user_text.lower()))
    return [w for w in words if w.lower() not in used][:8]


def evaluate_submission(prompt: dict[str, Any], user_text: str) -> dict[str, Any]:
    checks = validate_rules(prompt, user_text)
    rubric = score_rubric(prompt, user_text, checks)
    explanations = explain_scores(prompt, checks, rubric)
    overall = round(sum(rubric.values()) / len(rubric), 2)
    return {
        "rule_checks": checks,
        "rubric_scores": rubric,
        "explanations": explanations,
        "overall_score": overall,
        "feedback": generate_feedback(prompt, checks, rubric),
        "improved_sample": build_improved_sample(prompt),
        "vocab_suggestions": vocab_suggestions(user_text),
    }
