import random
import uuid
import os
import json
import urllib.request
import re
from typing import Any

QUESTION_BANK = [
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "What did the tour guide mention at the start of the trip?",
        "answer": "he explained where we'd be stopping for lunch.",
        "response_template": ["__", "explained", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_blanks",
        "prompt": "What did the professor remind students about?",
        "answer": "the assignment was due by Friday afternoon.",
        "response_template": ["__", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Were you able to ask the IT team about the issue?",
        "answer": "i emailed them to see if they knew what caused the crash.",
        "response_template": ["__", "emailed", "__", "__", "__", "__", "__", "__", "the", "crash", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Did you like the restaurant we went to last night?",
        "answer": "i didn't enjoy the atmosphere because the music was too loud.",
        "response_template": ["i", "__", "__", "__", "__", "__", "__", "__", "too", "loud", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Was your flight delayed yesterday?",
        "answer": "yes it was delayed because of heavy rain.",
        "response_template": ["__", "__", "was", "delayed,", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "How was the seminar yesterday afternoon?",
        "answer": "it was very helpful and clearly organized.",
        "response_template": ["__", "was", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Did Maya finish the report before the deadline?",
        "answer": "she finished it early and sent it to the team.",
        "response_template": ["__", "finished", "__", "__", "__", "__", "__", "__", "the", "team", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "How did the students react to the new policy?",
        "answer": "they accepted it because it solved several scheduling problems.",
        "response_template": ["__", "__", "__", "because", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Did you call the customer service center?",
        "answer": "i called them, but no one answered the phone.",
        "response_template": ["__", "called", "__", "but", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "What happened after the meeting ended?",
        "answer": "we reviewed the notes and planned the next steps.",
        "response_template": ["__", "__", "__", "__", "and", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Did your manager approve the vacation request?",
        "answer": "yes she approved it after reviewing the schedule.",
        "response_template": ["__", "__", "approved", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Did Alex explain the assignment instructions?",
        "answer": "he explained everything clearly, so we started right away.",
        "response_template": ["__", "explained", "__", "__", "so", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "statement_to_question_qmark",
        "prompt": "I heard Ethan started a new job last month.",
        "answer": "did he tell you what he's working for at the new company?",
        "response_template": ["did", "he", "__", "__", "__", "__", "__", "__", "__", "?"],
    },
    {
        "pattern": "statement_to_exclamation_bang",
        "prompt": "You finally finished all your exams this week.",
        "answer": "what a relief this semester was intense!",
        "response_template": ["what", "a", "__", "__", "__", "__", "!"],
    },
    {
        "pattern": "statement_to_question_qmark_mixed",
        "prompt": "Mia said the software update caused new errors.",
        "answer": "do you know what part of the update failed first?",
        "response_template": ["do", "you", "__", "__", "__", "__", "__", "__", "__", "?"],
    },
    {
        "pattern": "question_to_exclamation_bang",
        "prompt": "How was the concert last night?",
        "answer": "it was absolutely amazing and the crowd was electric!",
        "response_template": ["it", "was", "__", "__", "__", "__", "__", "__", "!"],
    },
]

_runtime_sets: dict[str, dict[str, Any]] = {}
DECOY_WORDS = ["already", "usually", "probably", "around", "earlier", "today", "quickly", "carefully", "really", "maybe", "still", "just"]


def _tokenize(sentence: str) -> list[str]:
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|[.,?!]", sentence)


def _is_word(token: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z]+(?:'[A-Za-z]+)?", token))


def _build_template(answer: str) -> tuple[list[str], list[str]]:
    parts = _tokenize(answer)
    word_indices = [i for i, p in enumerate(parts) if _is_word(p)]
    if len(word_indices) <= 2:
        return (parts, [])

    keep_count = max(1, min(3, len(word_indices) // 3))
    keep_indices = set(random.sample(word_indices, k=keep_count))
    template: list[str] = []
    hidden_words: list[str] = []
    for i, token in enumerate(parts):
        if _is_word(token) and i not in keep_indices:
            template.append("__")
            hidden_words.append(token)
        else:
            template.append(token)
    random.shuffle(hidden_words)
    return template, hidden_words


def _words_from_template(answer: str, template: list[str]) -> list[str]:
    answer_parts = _tokenize(answer)
    hidden: list[str] = []
    ai = 0
    for t in template:
        if t == "__":
            while ai < len(answer_parts) and not _is_word(answer_parts[ai]):
                ai += 1
            if ai < len(answer_parts):
                hidden.append(answer_parts[ai])
                ai += 1
        else:
            # Advance until template token match (case-insensitive) for robust punctuation handling.
            while ai < len(answer_parts) and answer_parts[ai].lower() != t.lower():
                ai += 1
            if ai < len(answer_parts):
                ai += 1
    return hidden


def _extract_json(text: str) -> list[dict[str, Any]]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].strip()
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        return []
    try:
        data = json.loads(text[start : end + 1])
    except Exception:
        return []
    clean: list[dict[str, Any]] = []
    for item in data:
        p = (item.get("prompt") or "").strip()
        a = (item.get("answer") or "").strip()
        rt = item.get("response_template")
        if isinstance(rt, str):
            rt = rt.split()
        if isinstance(rt, list):
            rt = [str(x).strip() for x in rt if str(x).strip()]
        if p and a:
            out: dict[str, Any] = {"prompt": p, "answer": a}
            if rt:
                out["response_template"] = rt
            clean.append(out)
    return clean


def _generate_with_llm(count: int) -> list[dict[str, str]]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return []
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    instruction = (
        f"Generate {count} TOEFL Build-a-Sentence items in this exact format. "
        "Return ONLY a JSON array. Each object must have keys: prompt, response_template, answer. "
        "prompt: conversational lead sentence/question like 'Were you able to ask the IT team about the issue?' or a context statement like 'I heard Ethan started a new job last month.'. "
        "response_template: token list where some tokens are fixed words and missing words are '__'. "
        "answer: full grammatical response sentence that matches the template. "
        "Pattern must look like dialogue continuation items, not abstract grammar tasks. Include some items where prompt is a statement and response_template is a follow-up question ending with '?'."
    )
    payload = {
        "model": model,
        "temperature": 0.5,
        "messages": [
            {"role": "system", "content": "You create TOEFL sentence-building items."},
            {"role": "user", "content": instruction},
        ],
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"]
    except Exception:
        return []
    rows = _extract_json(content)
    valid: list[dict[str, Any]] = []
    for r in rows:
        prompt = (r.get("prompt") or "").strip()
        answer = (r.get("answer") or "").strip()
        template = r.get("response_template")
        if not prompt or not answer:
            continue
        if isinstance(template, list) and template.count("__") >= 3:
            valid.append({"prompt": prompt, "answer": answer, "response_template": template})
        else:
            valid.append({"prompt": prompt, "answer": answer})
    return valid


def _apply_difficulty_options(options: list[str], blank_count: int, difficulty: str) -> list[str]:
    out = list(options[:blank_count])
    if difficulty == "normal":
        random.shuffle(out)
        return out
    if difficulty == "hard":
        if random.random() < 0.45:
            extra_count = random.choice([1, 2])
        else:
            extra_count = 0
    else:
        extra_count = random.choice([2, 3])
    if extra_count > 0:
        existing = set(w.lower() for w in out)
        candidates = [w for w in DECOY_WORDS if w.lower() not in existing]
        random.shuffle(candidates)
        out.extend(candidates[:extra_count])
    random.shuffle(out)
    return out


def generate_sentence_set(count: int = 10, difficulty: str = "hard") -> dict[str, Any]:
    generated = _generate_with_llm(count)
    if len(generated) >= count:
        picks = generated[:count]
    else:
        required_patterns = [
            "question_to_statement_dot_mixed",
            "question_to_statement_dot_blanks",
            "statement_to_question_qmark",
            "statement_to_exclamation_bang",
            "question_to_exclamation_bang",
        ]
        picks = []
        for pat in required_patterns:
            cand = [q for q in QUESTION_BANK if q.get("pattern") == pat]
            if cand:
                picks.append(random.choice(cand))
        remaining_pool = [q for q in QUESTION_BANK if q not in picks]
        random.shuffle(remaining_pool)
        need = max(0, min(count, len(QUESTION_BANK)) - len(picks))
        picks.extend(remaining_pool[:need])
    set_id = f"sentence-{uuid.uuid4().hex[:8]}"
    questions = []
    for i, item in enumerate(picks, start=1):
        s = item["answer"]
        if item.get("response_template"):
            template = item["response_template"]
            options = _words_from_template(s, template)
            random.shuffle(options)
            if not options:
                template, options = _build_template(s)
        else:
            template, options = _build_template(s)

        blank_count = template.count("__")
        if blank_count <= 0 or len(options) < blank_count:
            template, options = _build_template(s)
            blank_count = template.count("__")
            if len(options) < blank_count:
                words = [w for w in _tokenize(s) if _is_word(w)]
                while len(options) < blank_count and words:
                    options.append(words[len(options) % len(words)])

        options = _apply_difficulty_options(options, blank_count, difficulty)

        questions.append(
            {
                "question_id": f"q{i}",
                "prompt": item["prompt"],
                "response_template": template,
                "tokens": options,
                "answer": s,
            }
        )

    def inject_exemplar(slot_index: int, punct: str):
        exemplar = next((x for x in QUESTION_BANK if x.get("response_template", []) and x["response_template"][-1] == punct), None)
        if not exemplar:
            return
        s = exemplar["answer"]
        template = exemplar["response_template"]
        options = _words_from_template(s, template)
        random.shuffle(options)
        blank_count = template.count("__")
        if len(options) < blank_count:
            words = [w for w in _tokenize(s) if _is_word(w)]
            while len(options) < blank_count and words:
                options.append(words[len(options) % len(words)])
        extra = random.choice([0, 1, 2])
        qid = f"q{slot_index + 1}"
        questions[slot_index] = {
            "question_id": qid,
            "prompt": exemplar["prompt"],
            "response_template": template,
            "tokens": _apply_difficulty_options(options, blank_count, difficulty)[: blank_count + extra],
            "answer": s,
        }

    # Guarantee punctuation patterns in each set.
    if questions and not any(q["response_template"] and q["response_template"][-1] == "?" for q in questions):
        inject_exemplar(0, "?")
    if len(questions) > 1 and not any(q["response_template"] and q["response_template"][-1] == "!" for q in questions):
        inject_exemplar(1, "!")
    time_minutes = 6 if difficulty in ("normal", "hard") else 5
    payload = {
        "set_id": set_id,
        "title": "Build a Sentence",
        "directions": "Move the words in the boxes to create grammatical sentences.",
        "time_minutes": time_minutes,
        "difficulty": difficulty,
        "questions": questions,
    }
    _runtime_sets[set_id] = payload
    return payload


def grade_sentence_set(set_id: str, answers: dict[str, str]) -> dict[str, Any] | None:
    test_set = _runtime_sets.get(set_id)
    if not test_set:
        return None
    explanations: list[dict[str, Any]] = []
    correct = 0
    for q in test_set["questions"]:
        qid = q["question_id"]
        expected = q["answer"].strip().lower()
        got = (answers.get(qid) or "").strip().lower()
        ok = got == expected
        if ok:
            correct += 1
        explanations.append(
            {
                "question_id": qid,
                "is_correct": ok,
                "expected": q["answer"],
                "received": answers.get(qid, ""),
            }
        )
    total = len(test_set["questions"])
    return {
        "total_questions": total,
        "correct_answers": correct,
        "score_percent": round((correct / total) * 100, 1) if total else 0.0,
        "explanations": explanations,
    }
