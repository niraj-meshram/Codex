import random
import uuid
import os
import json
import urllib.request
import re
from collections import deque
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
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Which bus should we take to the airport?",
        "answer": "we need the bus stopping near the tall building across from the park.",
        "response_template": ["__", "__", "the bus", "__", "near", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "statement_to_statement_dot_mixed",
        "prompt": "The photocopier keeps jamming after every few pages.",
        "answer": "i think it's the old paper tray that causes the problem.",
        "response_template": ["i", "__", "__", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "statement_to_question_qmark_mixed",
        "prompt": "The train schedule changed again without much notice.",
        "answer": "should we book seats earlier to avoid confusion?",
        "response_template": ["__", "__", "__", "earlier", "__", "__", "__", "?"],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Did you book the hotel for our trip?",
        "answer": "unfortunately, i haven't found any affordable rooms because prices increased again.",
        "response_template": ["unfortunately,", "__", "__", "found", "__", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Have you found any flexible part-time work yet?",
        "answer": "i secured a position at a coffee shop ideal for my studies.",
        "response_template": ["__", "__", "__", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "statement_to_question_qmark_mixed",
        "prompt": "I think the presentation could start earlier tomorrow morning.",
        "answer": "would adjusting the agenda affect anyone who has to commute?",
        "response_template": ["__", "__", "__", "__", "__", "__", "__", "__", "?"],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Have you noticed fresher produce at the new market?",
        "answer": "it seemed that the quality had improved despite the higher price.",
        "response_template": ["__", "__", "__", "__", "__", "despite", "__", "__", "."],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "When will you finish the report?",
        "answer": "i probably won't finish the report by Thursday.",
        "response_template": ["__", "probably", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "statement_to_statement_dot_mixed",
        "prompt": "People asked how the city tour went.",
        "answer": "the tour guides who showed us around the old city were fantastic.",
        "response_template": ["the", "__", "__", "__", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "statement_to_question_qmark_mixed",
        "prompt": "You selected a different topic for your presentation.",
        "answer": "why did you choose that topic?",
        "response_template": ["why", "__", "__", "__", "__", "?"],
    },
    {
        "pattern": "statement_to_question_qmark_mixed",
        "prompt": "I still have not seen your submission.",
        "answer": "did you finish the assignment?",
        "response_template": ["did", "__", "__", "__", "?"],
    },
    {
        "pattern": "question_to_statement_dot_mixed",
        "prompt": "Can we compare these two proposals quickly?",
        "answer": "the first option is more practical than the second one.",
        "response_template": ["the", "__", "__", "__", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "statement_to_statement_dot_mixed",
        "prompt": "We need a backup plan in case attendance drops.",
        "answer": "if attendance drops, we will move the session online.",
        "response_template": ["if", "__", "__", "__", "__", "__", "__", "__", "."],
    },
    {
        "pattern": "statement_to_statement_dot_mixed",
        "prompt": "Students are waiting for the final materials.",
        "answer": "the package was delivered this morning and is required for class.",
        "response_template": ["the", "__", "__", "__", "__", "__", "__", "__", "__", "__", "."],
    },
]

_runtime_sets: dict[str, dict[str, Any]] = {}
_used_question_keys: set[str] = set()
_used_question_order: deque[str] = deque()
_MAX_USED_QUESTION_MEMORY = 300
_last_llm_error: str | None = None
DECOY_WORDS = ["already", "usually", "probably", "around", "earlier", "today", "quickly", "carefully", "really", "maybe", "still", "just"]
TOPIC_CANDIDATES = [
    "travel and transportation",
    "workplace communication",
    "university and classes",
    "technology and devices",
    "health and daily habits",
    "food, shopping, and prices",
    "housing and accommodation",
    "events and scheduling",
    "finance and budgeting",
    "community and public services",
]
TOPIC_DOMAINS = [
    "transportation",
    "education",
    "healthcare",
    "technology",
    "retail",
    "hospitality",
    "finance",
    "housing",
    "government services",
    "sports",
    "media",
    "environment",
    "legal services",
    "manufacturing",
    "logistics",
    "energy",
    "telecommunications",
    "agriculture",
    "food services",
    "public safety",
]
TOPIC_CONTEXTS = [
    "beginner scenario",
    "urgent scenario",
    "long-term planning",
    "customer support case",
    "team collaboration",
    "budget limitation",
    "policy change",
    "conflict resolution",
    "time pressure",
    "quality issue",
    "service delay",
    "new opportunity",
    "unexpected problem",
    "follow-up discussion",
    "decision making",
    "scheduling tradeoff",
]
TOPIC_ACTIONS = [
    "requesting help",
    "negotiating options",
    "giving an update",
    "asking a follow-up question",
    "proposing a solution",
    "explaining a cause",
    "comparing alternatives",
    "expressing uncertainty",
    "agreeing politely",
    "disagreeing respectfully",
    "summarizing outcomes",
    "making a recommendation",
    "checking feasibility",
    "clarifying constraints",
    "prioritizing next steps",
]
TOPIC_KEYWORDS: dict[str, list[str]] = {
    "travel": ["airport", "bus", "train", "flight", "trip", "commute", "hotel", "seats"],
    "work": ["manager", "report", "meeting", "assignment", "deadline", "office", "team"],
    "education": ["professor", "students", "class", "seminar", "policy", "exam", "presentation"],
    "technology": ["software", "update", "errors", "it", "photocopier", "device", "system"],
    "shopping_food": ["market", "produce", "price", "restaurant", "lunch", "coffee", "shop"],
    "daily_life": ["schedule", "tomorrow", "week", "afternoon", "morning", "today"],
}


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
            # Support phrase tokens (e.g., "across from") by matching tokenized chunks.
            target_parts = _tokenize(t)
            if not target_parts:
                continue
            matched = False
            while ai + len(target_parts) <= len(answer_parts):
                window = answer_parts[ai : ai + len(target_parts)]
                if [x.lower() for x in window] == [x.lower() for x in target_parts]:
                    ai += len(target_parts)
                    matched = True
                    break
                ai += 1
            if not matched:
                return []
    return hidden


def _rebuild_from_template(template: list[str], hidden_words: list[str]) -> str:
    parts: list[str] = []
    hi = 0
    for t in template:
        if t == "__":
            if hi >= len(hidden_words):
                return ""
            parts.append(hidden_words[hi])
            hi += 1
        else:
            parts.append(t)
    if hi != len(hidden_words):
        return ""
    return " ".join(parts).replace(" ,", ",").replace(" .", ".").replace(" ?", "?").replace(" !", "!")


def _normalize_sentence(text: str) -> str:
    return " ".join(_tokenize(text.lower()))


def _normalize_for_compare(text: str) -> str:
    lowered = _normalize_sentence(text)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def _topic_seed_text(count: int) -> str:
    # Build topic combinations dynamically: domains x contexts x actions -> thousands of possibilities.
    target = min(max(8, count * 2), 20)
    seeds: list[str] = []
    seen: set[str] = set()
    while len(seeds) < target:
        domain = random.choice(TOPIC_DOMAINS)
        context = random.choice(TOPIC_CONTEXTS)
        action = random.choice(TOPIC_ACTIONS)
        topic = f"{domain} | {context} | {action}"
        if topic in seen:
            continue
        seen.add(topic)
        seeds.append(topic)
        if len(seen) > 2000:
            break
    base_take = min(len(TOPIC_CANDIDATES), max(3, count // 2))
    base = random.sample(TOPIC_CANDIDATES, k=base_take)
    return "; ".join(base + seeds)


def _infer_topic(prompt: str, answer: str) -> str:
    text = f"{prompt} {answer}".lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(k in text for k in keywords):
            return topic
    return "other"


def _infer_pattern_label(prompt: str, answer: str) -> str:
    p = (prompt or "").strip()
    a = (answer or "").strip()
    prompt_is_question = p.endswith("?")
    if a.endswith("?"):
        return "statement_to_question_qmark" if not prompt_is_question else "question_to_question_qmark"
    if a.endswith("!"):
        return "statement_to_exclamation_bang" if not prompt_is_question else "question_to_exclamation_bang"
    return "question_to_statement_dot_mixed" if prompt_is_question else "statement_to_statement_dot_mixed"


def _infer_context_label(prompt: str, answer: str) -> str:
    text = f"{prompt} {answer}".lower()
    campus_terms = ["class", "assignment", "office hours", "advisor", "course", "lab", "professor", "campus"]
    return "campus" if any(t in text for t in campus_terms) else "social"


def _infer_grammar_tags(prompt: str, answer: str) -> set[str]:
    text = f"{prompt} {answer}".lower()
    tags: set[str] = set()
    if any(t in text for t in ["yesterday", "last week", "since", "already", "yet"]):
        tags.add("tense_time")
    if any(t in text for t in [" do ", " does ", " did ", " has ", " have ", " will ", " can "]):
        tags.add("auxiliaries")
    if any(t in text for t in [" often ", " already ", " never "]):
        tags.add("subject_verb_order")
    if any(t in text for t in ["a ", "an ", " the ", "this ", "that ", "some ", "any "]):
        tags.add("articles_determiners")
    if any(t in text for t in [" in ", " on ", " at ", " to ", " for ", " from ", " with "]):
        tags.add("prepositions")
    if any(t in text for t in ["can ", "could ", "should ", "might ", "must "]):
        tags.add("modals")
    if any(t in text for t in ["better than", "most "]):
        tags.add("comparatives_superlatives")
    if any(t in text for t in ["was completed", "is required", "was submitted", "were updated"]):
        tags.add("passive_voice")
    if any(t in text for t in [" because ", " although ", " if ", " who ", " that ", " which "]):
        tags.add("clauses")
    if " if " in text:
        tags.add("conditionals")
    if text.strip().endswith("?"):
        tags.add("question_word_order")
    return tags


def _format_group(pattern: str) -> str:
    p = (pattern or "").lower()
    if "to_question" in p or p.endswith("_qmark"):
        return "question"
    if "exclamation" in p or p.endswith("_bang"):
        return "exclamation"
    return "statement"


def _pattern_family(prompt: str, answer: str) -> str:
    prompt_is_question = (prompt or "").strip().endswith("?")
    answer_is_question = (answer or "").strip().endswith("?")
    if answer_is_question:
        return "interrogative"
    if prompt_is_question:
        return "reply_to_question"
    return "statement_response"


def _select_topic_diverse(items: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    if len(items) <= count:
        return items[:count]
    buckets: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        key = _infer_topic(item.get("prompt", ""), item.get("answer", ""))
        buckets.setdefault(key, []).append(item)
    for vals in buckets.values():
        random.shuffle(vals)
    ordered_topics = sorted(buckets.keys(), key=lambda t: len(buckets[t]), reverse=True)
    out: list[dict[str, Any]] = []
    while len(out) < count:
        progressed = False
        for topic in ordered_topics:
            if buckets[topic]:
                out.append(buckets[topic].pop())
                progressed = True
                if len(out) >= count:
                    break
        if not progressed:
            break
    if len(out) < count:
        leftovers: list[dict[str, Any]] = []
        for topic in ordered_topics:
            leftovers.extend(buckets[topic])
        random.shuffle(leftovers)
        out.extend(leftovers[: count - len(out)])
    return out[:count]


def _select_balanced(items: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    if len(items) <= count:
        return items[:count]

    pool = list(items)
    random.shuffle(pool)
    out: list[dict[str, Any]] = []
    used_ids: set[int] = set()

    # 1) Seed required families first so every set includes all key types when available.
    required_families = ["statement_response", "interrogative", "reply_to_question"]
    for family in required_families:
        for i, item in enumerate(pool):
            if i in used_ids:
                continue
            if _pattern_family(item.get("prompt", ""), item.get("answer", "")) == family:
                out.append(item)
                used_ids.add(i)
                break

    # If room permits, add one more interrogative and one more reply-to-question for better coverage.
    if count >= 8:
        for family in ["interrogative", "reply_to_question"]:
            for i, item in enumerate(pool):
                if len(out) >= count:
                    break
                if i in used_ids:
                    continue
                if _pattern_family(item.get("prompt", ""), item.get("answer", "")) == family:
                    out.append(item)
                    used_ids.add(i)
                    break

    # 2) Enforce format quotas to avoid question-heavy sets.
    # Target profile: mostly statements, some questions, and optional exclamation.
    target_statement = max(3, int(round(count * 0.5)))
    target_question = max(2, int(round(count * 0.25)))
    target_exclamation = 1 if count >= 8 else 0

    format_buckets: dict[str, list[tuple[int, dict[str, Any]]]] = {}
    for i, item in enumerate(pool):
        fg = _format_group(str(item.get("pattern", "")))
        format_buckets.setdefault(fg, []).append((i, item))

    def take_from_bucket(fmt: str, n: int) -> None:
        nonlocal out, used_ids
        bucket = format_buckets.get(fmt) or []
        random.shuffle(bucket)
        taken = 0
        for idx, pick in bucket:
            if len(out) >= count or taken >= n:
                break
            if idx in used_ids:
                continue
            out.append(pick)
            used_ids.add(idx)
            taken += 1

    current_question = sum(1 for x in out if _format_group(str(x.get("pattern", ""))) == "question")
    current_statement = sum(1 for x in out if _format_group(str(x.get("pattern", ""))) == "statement")
    current_exclamation = sum(1 for x in out if _format_group(str(x.get("pattern", ""))) == "exclamation")

    take_from_bucket("statement", max(0, target_statement - current_statement))
    take_from_bucket("question", max(0, target_question - current_question))
    take_from_bucket("exclamation", max(0, target_exclamation - current_exclamation))

    # If we still have room, top up with non-question first.
    for fmt in ["statement", "exclamation", "question"]:
        if len(out) >= count:
            break
        take_from_bucket(fmt, count - len(out))

    # 3) Re-check families after quota fill and backfill if still missing.
    required_family_set = {"statement_response", "interrogative", "reply_to_question"}
    present = set(_pattern_family(x.get("prompt", ""), x.get("answer", "")) for x in out)
    missing_families = required_family_set - present
    if missing_families and len(out) < count:
        for i, item in enumerate(pool):
            if len(out) >= count:
                break
            if i in used_ids:
                continue
            fam = _pattern_family(item.get("prompt", ""), item.get("answer", ""))
            if fam in missing_families:
                out.append(item)
                used_ids.add(i)
                missing_families.discard(fam)
            if not missing_families:
                break

    # 4) Add topic variety next.
    topic_buckets: dict[str, list[tuple[int, dict[str, Any]]]] = {}
    for i, item in enumerate(pool):
        if i in used_ids:
            continue
        tk = _infer_topic(item.get("prompt", ""), item.get("answer", ""))
        topic_buckets.setdefault(tk, []).append((i, item))
    topic_order = sorted(topic_buckets.keys(), key=lambda t: len(topic_buckets[t]), reverse=True)
    topic_target = min(max(4, count // 2), count - len(out))
    while len(out) < count and topic_target > 0:
        progressed = False
        for t in topic_order:
            if topic_target <= 0 or len(out) >= count:
                break
            bucket = topic_buckets.get(t) or []
            if not bucket:
                continue
            idx, pick = bucket.pop()
            if idx in used_ids:
                continue
            out.append(pick)
            used_ids.add(idx)
            topic_target -= 1
            progressed = True
        if not progressed:
            break

    # 5) Ensure both reply contexts (social/campus) appear when possible.
    needed_contexts = {"social", "campus"}
    for existing in out:
        needed_contexts.discard(str(existing.get("context", "")))
    if needed_contexts and len(out) < count:
        for i, item in enumerate(pool):
            if len(out) >= count:
                break
            if i in used_ids:
                continue
            if str(item.get("context", "")) in needed_contexts:
                out.append(item)
                used_ids.add(i)
                needed_contexts.discard(str(item.get("context", "")))
            if not needed_contexts:
                break

    # 6) Ensure core grammar focus areas are represented when possible.
    target_grammar = {
        "subject_verb_order",
        "tense_time",
        "auxiliaries",
        "question_word_order",
        "articles_determiners",
        "prepositions",
        "modals",
        "clauses",
        "comparatives_superlatives",
        "conditionals",
        "passive_voice",
    }
    existing_tags: set[str] = set()
    for existing in out:
        existing_tags.update(set(existing.get("grammar_tags", set())))
    missing = target_grammar - existing_tags
    if missing and len(out) < count:
        for i, item in enumerate(pool):
            if len(out) >= count:
                break
            if i in used_ids:
                continue
            tags = set(item.get("grammar_tags", set()))
            if tags.intersection(missing):
                out.append(item)
                used_ids.add(i)
                missing -= tags
            if not missing:
                break

    # 7) Fill remaining slots from the rest.
    for i, item in enumerate(pool):
        if len(out) >= count:
            break
        if i in used_ids:
            continue
        out.append(item)
        used_ids.add(i)
    return out[:count]


def _question_key(prompt: str, answer: str) -> str:
    return _normalize_sentence(prompt)


def _coerce_valid_template(answer: str, template: list[str] | None) -> tuple[list[str], list[str]]:
    if template and isinstance(template, list):
        cleaned = [str(x).strip() for x in template if str(x).strip()]
        blank_count = cleaned.count("__")
        if blank_count >= 3:
            hidden = _words_from_template(answer, cleaned)
            rebuilt = _rebuild_from_template(cleaned, hidden)
            if len(hidden) == blank_count and rebuilt and _normalize_for_compare(rebuilt) == _normalize_for_compare(answer):
                return cleaned, hidden
    return _build_template(answer)


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
            # Reject single-sentence template arrays; template must be tokenized.
            if len(rt) == 1 and " " in rt[0]:
                rt = None
        if p and a:
            out: dict[str, Any] = {"prompt": p, "answer": a}
            if rt:
                out["response_template"] = rt
            clean.append(out)
    return clean


def _generate_with_llm(count: int, avoid_prompts: list[str] | None = None) -> list[dict[str, str]]:
    global _last_llm_error
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        _last_llm_error = "OPENAI_API_KEY is not set."
        return []
    primary_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    model_candidates = [primary_model, "gpt-4o-mini", "gpt-5"]
    avoid_text = ""
    if avoid_prompts:
        sample = "; ".join(avoid_prompts[:30])
        avoid_text = f" Do not reuse or paraphrase these prompt stems: {sample}."

    instruction = (
        f"Generate {count} TOEFL Build-a-Sentence items in this exact format. "
        "Return ONLY a JSON array. Each object must have keys: prompt, response_template, answer. "
        "prompt: conversational lead sentence/question like 'Were you able to ask the IT team about the issue?' or a context statement like 'I heard Ethan started a new job last month.'. "
        "response_template: token list where some tokens are fixed words and missing words are '__'. "
        "answer: full grammatical response sentence that matches the template. "
        "Cover sentence types: statement responses, WH-questions, yes/no questions, and natural reply-to-a-question mini dialogue. "
        "Important balance rule: in each batch, at least 50% answers must be statement responses (ending with '.'), around 30% may be questions (ending with '?'), and include at least one exclamation-style response when suitable. "
        "Use both daily social contexts and campus/academic contexts (class, assignments, office hours, schedules). "
        "Target grammar focus areas across the set: subject-verb order with adverbs, tense+auxiliaries, prepositional phrases, relative clauses, comparatives/superlatives, conditionals, passive voice, and correct punctuation in questions/longer sentences. "
        "Pattern must look like dialogue continuation items, not abstract grammar tasks. "
        "Include variety: question->statement, statement->question, concession with 'despite', purpose with 'to avoid', uncertainty with 'probably', and contrast starters like 'unfortunately,'. "
        "For extra-tough items, prefer advanced vocabulary, denser grammar, longer clauses, and academically styled phrasing. "
        f"Distribute items across multiple topics such as: {_topic_seed_text(count)}. "
        "Avoid concentrating many items on one topic in a single set. "
        "Include some items where prompt is a statement and response_template is a follow-up question ending with '?'."
        + avoid_text
    )
    content = ""
    last_exc: Exception | None = None
    for model in model_candidates:
        payload = {
            "model": model,
            "temperature": 0.9,
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
            with urllib.request.urlopen(req, timeout=40) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            content = body["choices"][0]["message"]["content"]
            _last_llm_error = None
            break
        except Exception as exc:
            last_exc = exc
            continue

    if not content:
        _last_llm_error = str(last_exc) if last_exc else "Unknown OpenAI request failure."
        return []
    rows = _extract_json(content)
    valid: list[dict[str, Any]] = []
    seen: set[str] = set()
    for r in rows:
        prompt = (r.get("prompt") or "").strip()
        answer = (r.get("answer") or "").strip()
        template = r.get("response_template")
        if not prompt or not answer:
            continue
        key = _normalize_sentence(prompt)
        if key in seen:
            continue
        seen.add(key)
        if isinstance(template, list) and template.count("__") >= 3:
            valid.append(
                {
                    "prompt": prompt,
                    "answer": answer,
                    "response_template": template,
                    "pattern": _infer_pattern_label(prompt, answer),
                    "context": _infer_context_label(prompt, answer),
                    "grammar_tags": _infer_grammar_tags(prompt, answer),
                }
            )
        else:
            valid.append(
                {
                    "prompt": prompt,
                    "answer": answer,
                    "pattern": _infer_pattern_label(prompt, answer),
                    "context": _infer_context_label(prompt, answer),
                    "grammar_tags": _infer_grammar_tags(prompt, answer),
                }
            )
    random.shuffle(valid)
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
    elif difficulty == "very_hard":
        extra_count = random.choice([2, 3])
    else:
        extra_count = random.choice([3, 4, 5])
    if extra_count > 0:
        existing = set(w.lower() for w in out)
        candidates = [w for w in DECOY_WORDS if w.lower() not in existing]
        random.shuffle(candidates)
        out.extend(candidates[:extra_count])
    random.shuffle(out)
    return out


def generate_sentence_set(count: int = 10, difficulty: str = "hard") -> dict[str, Any]:
    global _used_question_keys
    fresh: list[dict[str, Any]] = []
    seen_batch: set[str] = set()
    for _ in range(8):
        avoid = list(_used_question_keys.union(seen_batch))
        generated = _generate_with_llm(max(count * 8, 80), avoid_prompts=avoid)
        for g in generated:
            key = _question_key(g["prompt"], g["answer"])
            if key in _used_question_keys or key in seen_batch:
                continue
            seen_batch.add(key)
            fresh.append(g)
            if len(fresh) >= count:
                break
        if len(fresh) >= count:
            break
    if len(fresh) < count:
        for q in QUESTION_BANK:
            key = _question_key(q["prompt"], q["answer"])
            if key in _used_question_keys or key in seen_batch:
                continue
            seen_batch.add(key)
            fresh.append(
                {
                    "prompt": q["prompt"],
                    "answer": q["answer"],
                    "response_template": q["response_template"],
                    "pattern": q.get("pattern", _infer_pattern_label(q["prompt"], q["answer"])),
                    "context": _infer_context_label(q["prompt"], q["answer"]),
                    "grammar_tags": _infer_grammar_tags(q["prompt"], q["answer"]),
                }
            )
            if len(fresh) >= count:
                break
    if len(fresh) < count:
        detail = _last_llm_error or "LLM returned insufficient unique items."
        raise RuntimeError(f"Unable to generate enough non-repeating sentence questions. {detail}")
    picks = _select_balanced(fresh, count)
    set_id = f"sentence-{uuid.uuid4().hex[:8]}"
    questions = []
    for i, item in enumerate(picks, start=1):
        s = item["answer"]
        template, options = _coerce_valid_template(s, item.get("response_template"))
        random.shuffle(options)

        blank_count = template.count("__")
        if blank_count <= 0 or len(options) < blank_count:
            template, options = _build_template(s)
            blank_count = template.count("__")
            if len(options) < blank_count:
                words = [w for w in _tokenize(s) if _is_word(w)]
                while len(options) < blank_count and words:
                    options.append(words[len(options) % len(words)])

        options = _apply_difficulty_options(options, blank_count, difficulty)
        options = [opt.lower() for opt in options]

        questions.append(
            {
                "question_id": f"q{i}",
                "prompt": item["prompt"],
                "response_template": template,
                "tokens": options,
                "answer": s,
            }
        )

    time_minutes = 5
    runtime_payload = {
        "set_id": set_id,
        "title": "Build a Sentence",
        "directions": "Move the words in the boxes to create grammatical sentences.",
        "time_minutes": time_minutes,
        "difficulty": difficulty,
        "questions": questions,
    }
    _runtime_sets[set_id] = runtime_payload
    for q in questions:
        _remember_question_key(_question_key(q["prompt"], q["answer"]))
    public_questions = [
        {
            "question_id": q["question_id"],
            "prompt": q["prompt"],
            "response_template": q["response_template"],
            "tokens": q["tokens"],
        }
        for q in questions
    ]
    return {
        "set_id": set_id,
        "title": "Build a Sentence",
        "directions": "Move the words in the boxes to create grammatical sentences.",
        "time_minutes": time_minutes,
        "difficulty": difficulty,
        "questions": public_questions,
    }


def get_runtime_set(set_id: str) -> dict[str, Any] | None:
    return _runtime_sets.get(set_id)


def register_runtime_set(set_id: str, payload: dict[str, Any]) -> None:
    _runtime_sets[set_id] = payload


def _remember_question_key(key: str) -> None:
    if key in _used_question_keys:
        return
    _used_question_keys.add(key)
    _used_question_order.append(key)
    if len(_used_question_order) > _MAX_USED_QUESTION_MEMORY:
        evicted = _used_question_order.popleft()
        _used_question_keys.discard(evicted)


def grade_sentence_set(set_id: str, answers: dict[str, str]) -> dict[str, Any] | None:
    test_set = _runtime_sets.get(set_id)
    if not test_set:
        return None
    explanations: list[dict[str, Any]] = []
    correct = 0
    for q in test_set["questions"]:
        qid = q["question_id"]
        expected = _normalize_for_compare(q["answer"])
        got = _normalize_for_compare(answers.get(qid) or "")
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
