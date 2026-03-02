import json
import hashlib
import os
import random
import re
import urllib.request
import uuid
from collections import deque
from pathlib import Path

PROMPTS_JSON_PATH = Path(__file__).resolve().parents[3] / "data" / "prompts" / "prompts.json"
RECIPIENT_POOL = [
    "Professor Alvarez",
    "Professor Singh",
    "Professor Carter",
    "Professor Nakamura",
    "Professor Ibrahim",
    "Dr. Patel",
    "Dr. Rivera",
    "Dr. Chen",
    "Dr. Ahmed",
    "Dr. Thompson",
    "Program Coordinator Lee",
    "Student Services Officer Grant",
    "Club Advisor Morales",
    "Research Supervisor Bennett",
    "Course Assistant Park",
    "Internship Mentor Silva",
]
SUBJECT_POOL = [
    "Request for Guidance",
    "Follow-up on Assignment Plan",
    "Question About Upcoming Schedule",
    "Request for Clarification",
    "Update and Next Steps",
    "Support Request for Project Work",
    "Question Regarding Course Policy",
]
SUBJECT_DOMAINS = [
    "Course",
    "Assignment",
    "Project",
    "Research",
    "Seminar",
    "Workshop",
    "Lab",
    "Exam",
    "Schedule",
    "Internship",
    "Scholarship",
    "Housing",
    "Campus Event",
    "Student Services",
    "Travel",
    "Finance",
    "Policy",
    "Technology Access",
    "Team Coordination",
    "Feedback",
]
SUBJECT_INTENTS = [
    "Request for",
    "Question About",
    "Clarification on",
    "Follow-up on",
    "Update on",
    "Help with",
    "Plan for",
    "Status of",
    "Confirmation of",
    "Advice on",
]
SUBJECT_QUALIFIERS = [
    "this week",
    "for next week",
    "before the deadline",
    "for the upcoming term",
    "for today",
    "regarding requirements",
    "for final submission",
    "for meeting preparation",
    "for review",
    "for approval",
]
TOPIC_AREAS = [
    "travel", "aviation", "rail transport", "public transit", "tourism", "hospitality", "media", "journalism",
    "digital content", "film", "music", "broadcasting", "disaster response", "earthquake preparedness",
    "flood safety", "wildfire planning", "history", "world history", "cultural heritage", "archaeology",
    "museum studies", "science", "biology", "chemistry", "physics", "earth science", "climate science",
    "environmental science", "mathematics", "statistics", "applied math", "econometrics", "animals",
    "wildlife conservation", "marine biology", "veterinary care", "animal behavior", "space", "astronomy",
    "astrophysics", "space policy", "satellite systems", "technology", "software engineering", "cybersecurity",
    "ai ethics", "cloud systems", "education", "curriculum design", "assessment", "student support",
    "business", "entrepreneurship", "operations", "marketing", "finance", "accounting", "law", "public policy",
    "governance", "urban planning", "healthcare", "nursing", "mental health", "nutrition", "sports science",
    "agriculture", "food systems", "supply chain", "manufacturing", "energy", "renewables",
]
TOPIC_CONTEXTS = [
    "for first-year students", "for graduate students", "for international students", "for working professionals",
    "for remote learners", "for team projects", "for independent study", "for campus events", "for urgent situations",
    "for long-term planning", "with budget limitations", "with policy constraints", "for weekend operations",
    "for public communication", "for research collaboration", "for community outreach", "for internship preparation",
    "for exam season", "for deadline recovery", "for service improvement",
]
TOPIC_INTENTS = [
    "request", "clarification", "update", "follow-up", "proposal", "recommendation", "feedback",
    "status check", "problem report", "solution planning",
]
EMAIL_TOPICS = [f"{area} {context} ({intent})" for area in TOPIC_AREAS for context in TOPIC_CONTEXTS for intent in TOPIC_INTENTS]
if len(EMAIL_TOPICS) < 1000:
    raise RuntimeError("EMAIL_TOPICS must include at least 1000 items.")
EMOTION_TONES = [
    ("appreciative", "Express sincere gratitude while remaining concise and professional."),
    ("concerned", "Show reasonable concern and ask for practical guidance."),
    ("apologetic", "Acknowledge a mistake politely and propose corrective action."),
    ("excited", "Convey positive enthusiasm while staying clear and task-focused."),
    ("confused", "Politely request clarification on unclear requirements."),
    ("stressed", "Explain time pressure respectfully and ask for a realistic solution."),
    ("hopeful", "Describe goals optimistically and request support."),
    ("disappointed", "State dissatisfaction respectfully and suggest improvements."),
]
EMAIL_OPENING_FRAMES = [
    "You are writing to {recipient} about a {topic} matter.",
    "Write an email to {recipient} regarding a {topic} issue that needs action.",
    "Send a concise email to {recipient} connected to {topic}.",
    "Draft a professional message to {recipient} about a {topic} situation.",
]
EMAIL_TASK_FRAMES = [
    "In your email, make sure to address all required points clearly.",
    "Your response should be polite, specific, and actionable.",
    "Organize your response so each requirement is easy to follow.",
]
EMAIL_BULLET_PREFIXES = [
    "Explain",
    "Clarify",
    "Describe",
    "Request",
    "Propose",
    "Confirm",
    "Summarize",
]
FALLBACK_NAME_POOL = [
    "oliver", "kim", "hill", "ethan", "maya", "alex", "mia", "liam", "noah", "emma",
    "ava", "sophia", "isabella", "amelia", "charlotte", "james", "benjamin", "lucas", "henry", "jack",
    "harper", "evelyn", "abigail", "ella", "scarlett", "daniel", "michael", "sebastian", "mateo", "levi",
    "sofia", "camila", "aria", "luna", "grace", "david", "joseph", "wyatt", "john", "owen",
    "victoria", "penelope", "riley", "zoey", "nora", "julian", "isaac", "ezra", "leo", "samuel",
    "aarav", "vivaan", "aditya", "arjun", "ananya", "isha", "priya", "aisha", "fatima", "zainab",
    "omar", "youssef", "layla", "noor", "amira", "hassan", "ibrahim", "karim", "sami", "mariam",
    "chen", "wei", "li", "wang", "zhang", "xiao", "mei", "lin", "yuna", "haruto",
    "yuki", "sakura", "takumi", "ren", "mina", "jihoon", "minji", "seojun", "hyun", "sora",
    "nguyen", "anh", "linh", "thao", "minh", "bao", "putri", "agus", "siti", "dewi",
    "joko", "made", "wayan", "nurul", "budi", "ahmad", "reza", "farah", "amir", "nabila",
    "thabo", "amina", "chioma", "chinedu", "kwame", "kofi", "abena", "zola", "nandi", "lerato",
    "temitope", "ayodele", "ifeoma", "oluwaseun", "simphiwe", "tendai", "tafadzwa", "rutendo", "mbali", "anele",
    "mateus", "luiza", "beatriz", "gabriel", "isadora", "joao", "miguel", "valentina", "camilo", "santiago",
    "martin", "diego", "fernanda", "ximena", "soledad", "andres", "emilia", "juan", "catalina", "pablo",
    "elena", "nikos", "giannis", "stefanos", "anastasia", "olga", "dimitri", "luca", "giulia", "alessio",
    "matteo", "sofia", "ines", "joao", "marta", "aoife", "siobhan", "ciaran", "fiona", "sean",
    "zofia", "jakub", "mikolaj", "agnieszka", "katarzyna", "tomasz", "lukasz", "petra", "jana", "tomas",
    "ibrahima", "khadija", "amina", "salma", "yara", "sara", "nour", "samira", "bilal", "tariq",
    "sven", "ingrid", "lars", "freja", "astrid", "mikkel", "hugo", "clara", "noemie", "mael",
]
TOEFL_EMAIL_PURPOSES = [
    "make a recommendation",
    "extend an invitation",
    "propose a solution to a problem",
    "request clarification",
    "ask for support",
    "apologize and propose a fix",
    "provide a status update",
]
TOEFL_EMAIL_CONTEXTS = [
    "social",
    "campus",
    "academic",
]
TOEFL_EMAIL_ACTIONS = [
    "state the situation clearly",
    "provide one concrete detail",
    "ask for a specific next step",
    "offer one practical option",
    "confirm timing or availability",
    "close with a polite sign-off",
]


class PromptStore:
    def __init__(self):
        self._prompts = []
        self._runtime_prompts: dict[str, dict] = {}
        self._email_pool: list[dict] = []
        self._seen_email_signatures: set[str] = set()
        self._seen_email_order: deque[str] = deque()
        self._max_seen_email_memory = 2000
        self._recent_recipients: deque[str] = deque()
        self._recent_recipient_set: set[str] = set()
        self._max_recent_recipients = 80
        self._recent_topics: deque[str] = deque()
        self._recent_topic_set: set[str] = set()
        self._max_recent_topics = 200
        self._monitored_person_names = self._build_monitored_name_set()
        self.reload()

    def _generate_global_name_pool_llm(self, count: int = 400) -> list[str]:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return []
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        instruction = (
            f"Generate {count} first names from around the world as a JSON array of lowercase strings. "
            "No duplicates. No explanations. ASCII letters only."
        )
        body = {
            "model": model,
            "temperature": 0.7,
            "messages": [
                {"role": "system", "content": "Return strict JSON only."},
                {"role": "user", "content": instruction},
            ],
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            content = (payload["choices"][0]["message"]["content"] or "").strip()
            if content.startswith("```"):
                content = content.strip("`")
                if content.startswith("json"):
                    content = content[4:].strip()
            arr = json.loads(content)
            if not isinstance(arr, list):
                return []
            out: list[str] = []
            seen: set[str] = set()
            for item in arr:
                name = re.sub(r"[^a-zA-Z]", "", str(item or "")).lower()
                if len(name) < 3:
                    continue
                if name in seen:
                    continue
                seen.add(name)
                out.append(name)
            return out
        except Exception:
            return []

    def _build_monitored_name_set(self) -> set[str]:
        # Dynamic per-process sampling for broader mismatch detection without static repetition.
        pool = self._generate_global_name_pool_llm(count=450)
        if len(pool) < 80:
            pool = list(FALLBACK_NAME_POOL)
        size = min(max(40, len(pool) // 2), len(pool))
        sampled = set(random.sample(pool, k=size))
        for recipient in RECIPIENT_POOL:
            sampled.update(t.lower() for t in re.findall(r"[a-zA-Z]{3,}", recipient))
        return sampled

    def reload(self):
        if PROMPTS_JSON_PATH.exists():
            self._prompts = json.loads(PROMPTS_JSON_PATH.read_text(encoding="utf-8"))
        else:
            self._prompts = []

    def get_prompt_by_id(self, prompt_id: str):
        if prompt_id in self._runtime_prompts:
            return self._runtime_prompts[prompt_id]
        for prompt in self._prompts:
            if prompt.get("prompt_id") == prompt_id:
                return prompt
        # Fallback for generated runtime ids after process restart:
        # gen-{task_type}-{base_prompt_id}-{8hex}
        m = re.match(r"^gen-(email|discussion)-(.+)-[0-9a-f]{8}$", prompt_id or "")
        if m:
            base_prompt_id = m.group(2)
            for prompt in self._prompts:
                if str(prompt.get("prompt_id")) == base_prompt_id:
                    return prompt
        return None

    def _make_email_variant(self, base: dict) -> dict:
        variant = dict(base)
        topic = self._pick_topic()
        tone, tone_instruction = random.choice(EMOTION_TONES)
        purpose = random.choice(TOEFL_EMAIL_PURPOSES)
        context = random.choice(TOEFL_EMAIL_CONTEXTS)
        bullets = list(base.get("bullet_points") or [])
        random.shuffle(bullets)
        transformed_bullets: list[str] = []
        seed_actions = random.sample(TOEFL_EMAIL_ACTIONS, k=min(2, len(TOEFL_EMAIL_ACTIONS)))
        for action in seed_actions:
            transformed_bullets.append(action.capitalize() + ".")
        for b in bullets[:1]:
            prefix = random.choice(EMAIL_BULLET_PREFIXES)
            cleaned = str(b).strip()
            transformed_bullets.append(f"{prefix}: {cleaned}")
        if len(transformed_bullets) < 3:
            transformed_bullets.append(
                random.choice(
                    [
                        "Use a clear action request in your final paragraph.",
                        "Keep tone polite and solution-oriented.",
                        f"Relate at least one point to {topic}.",
                        tone_instruction,
                    ]
                )
            )
        recipient = self._pick_recipient(exclude={str(base.get("to_field") or "").strip()})
        variant["bullet_points"] = transformed_bullets
        variant["title"] = f"{topic.title()} {purpose.title()} Email Task"
        variant["to_field"] = recipient
        variant["subject"] = self._pick_subject()
        variant["raw_text"] = (
            f"{random.choice(EMAIL_OPENING_FRAMES).format(recipient=recipient, topic=topic)} "
            f"Context: {context}. Purpose: {purpose}. "
            f"{random.choice(EMAIL_TASK_FRAMES)}"
        )
        self._remember_topic(topic)
        return variant

    def _pick_recipient(self, exclude: set[str] | None = None) -> str:
        exclude = exclude or set()
        options = [x for x in RECIPIENT_POOL if x not in exclude and x not in self._recent_recipient_set]
        if not options:
            options = [x for x in RECIPIENT_POOL if x not in exclude] or list(RECIPIENT_POOL)
        return random.choice(options)

    def _pick_subject(self) -> str:
        # Combinatorial subject builder: thousands of possible realistic subjects.
        if random.random() < 0.2:
            return random.choice(SUBJECT_POOL)
        intent = random.choice(SUBJECT_INTENTS)
        domain = random.choice(SUBJECT_DOMAINS)
        qualifier = random.choice(SUBJECT_QUALIFIERS)
        return f"{intent} {domain} {qualifier}"

    def _pick_topic(self) -> str:
        available = [t for t in EMAIL_TOPICS if t not in self._recent_topic_set]
        if not available:
            available = list(EMAIL_TOPICS)
        return random.choice(available)

    def _remember_topic(self, topic: str) -> None:
        t = (topic or "").strip().lower()
        if not t:
            return
        if t in self._recent_topic_set:
            return
        self._recent_topic_set.add(t)
        self._recent_topics.append(t)
        if len(self._recent_topics) > self._max_recent_topics:
            old = self._recent_topics.popleft()
            self._recent_topic_set.discard(old)

    def _topic_seed_text(self, count: int) -> str:
        k = min(max(10, count), 24)
        picks = random.sample(EMAIL_TOPICS, k=min(k, len(EMAIL_TOPICS)))
        return ", ".join(picks)

    def _remember_recipient(self, recipient: str) -> None:
        key = (recipient or "").strip()
        if not key:
            return
        if key in self._recent_recipient_set:
            return
        self._recent_recipient_set.add(key)
        self._recent_recipients.append(key)
        if len(self._recent_recipients) > self._max_recent_recipients:
            old = self._recent_recipients.popleft()
            self._recent_recipient_set.discard(old)

    def _email_signature(self, variant: dict) -> str:
        core = {
            "title": str(variant.get("title") or "").strip().lower(),
            "to_field": str(variant.get("to_field") or "").strip().lower(),
            "subject": str(variant.get("subject") or "").strip().lower(),
            "bullet_points": [str(x).strip().lower() for x in (variant.get("bullet_points") or [])],
            "raw_text": str(variant.get("raw_text") or "").strip().lower(),
        }
        payload = json.dumps(core, ensure_ascii=True, sort_keys=True)
        return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:20]

    def _remember_email_signature(self, signature: str) -> None:
        if signature in self._seen_email_signatures:
            return
        self._seen_email_signatures.add(signature)
        self._seen_email_order.append(signature)
        if len(self._seen_email_order) > self._max_seen_email_memory:
            old = self._seen_email_order.popleft()
            self._seen_email_signatures.discard(old)

    def _recipient_tokens(self, recipient: str) -> set[str]:
        return {t.lower() for t in re.findall(r"[a-zA-Z]{3,}", recipient or "")}

    def _contains_foreign_person_name(self, text: str, recipient: str) -> bool:
        lowered = (text or "").lower()
        if not lowered:
            return False
        allowed = self._recipient_tokens(recipient)
        for name in self._monitored_person_names:
            if name in allowed:
                continue
            if re.search(rf"\b{re.escape(name)}\b", lowered):
                return True
        return False

    def _build_canonical_email_frame(self, recipient: str, topic: str, purpose: str, context: str) -> tuple[str, str]:
        title = f"{topic.title()} {purpose.title()} Email Task"
        raw_text = (
            f"{random.choice(EMAIL_OPENING_FRAMES).format(recipient=recipient, topic=topic)} "
            f"Context: {context}. Purpose: {purpose}. "
            f"{random.choice(EMAIL_TASK_FRAMES)}"
        )
        return title, raw_text

    def _clean_student_facing_email_title(self, title: str) -> str:
        out = (title or "").strip()
        out = re.sub(r"\s*\(#?gen-email-[^)]+\)\s*", " ", out, flags=re.IGNORECASE)
        out = re.sub(r"\s*\([^)]+\|\s*[^)]+\)\s*", " ", out, flags=re.IGNORECASE)
        out = re.sub(r"\s+", " ", out).strip()
        return out

    def _sanitize_email_prompt_for_display(self, prompt: dict) -> dict:
        p = dict(prompt)
        p["title"] = self._clean_student_facing_email_title(str(p.get("title") or ""))
        raw = str(p.get("raw_text") or "")
        raw = re.sub(r"\s*\(#?gen-email-[^)]+\)\s*", " ", raw, flags=re.IGNORECASE).strip()
        raw = re.sub(r"(?im)^\s*to\s*:\s*.+$", "", raw).strip()
        raw = re.sub(r"(?im)^\s*subject\s*:\s*.+$", "", raw).strip()
        raw = re.sub(r"\n{3,}", "\n\n", raw).strip()
        p["raw_text"] = raw
        return p

    def _validate_email_variant(self, base: dict, candidate: dict) -> dict | None:
        # Always normalize recipient from controlled rotating pool to avoid repetitive names.
        to_field = self._pick_recipient(exclude={str(base.get("to_field") or "").strip()})
        subject = (candidate.get("subject") or "").strip() or self._pick_subject()
        bullets = candidate.get("bullet_points")
        if not isinstance(bullets, list):
            return None
        bullets = [str(b).strip() for b in bullets if str(b).strip()]
        if len(bullets) < 3:
            return None
        raw_text = (candidate.get("raw_text") or "").strip()
        if len(raw_text) < 40:
            raw_text = str(base.get("raw_text") or "").strip()
        raw_text = re.sub(r"\s*\(#?gen-email-[^)]+\)\s*", " ", raw_text, flags=re.IGNORECASE).strip()
        raw_text = re.sub(r"(?im)^\s*to\s*:\s*.+$", "", raw_text).strip()
        raw_text = re.sub(r"(?im)^\s*subject\s*:\s*.+$", "", raw_text).strip()
        raw_text = re.sub(r"\n{3,}", "\n\n", raw_text).strip()
        raw_text = re.sub(r"^\s*\#\d+\s*", "", raw_text).strip()
        merged_text = f"{raw_text}\n" + "\n".join(bullets)
        if self._contains_foreign_person_name(merged_text, to_field):
            return None
        topic = self._pick_topic()
        purpose = random.choice(TOEFL_EMAIL_PURPOSES)
        context = random.choice(TOEFL_EMAIL_CONTEXTS)
        title, canonical_raw = self._build_canonical_email_frame(
            recipient=to_field,
            topic=topic,
            purpose=purpose,
            context=context,
        )
        self._remember_topic(topic)
        return {
            **dict(base),
            "task_type": "email",
            "title": title,
            "to_field": to_field or base.get("to_field"),
            "subject": subject or self._pick_subject(),
            "bullet_points": bullets,
            "raw_text": canonical_raw,
        }

    def _make_email_variant_llm(self, base: dict) -> dict | None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        base_title = str(base.get("title") or "Write an Email")
        to_field = str(base.get("to_field") or "recipient")
        subject = str(base.get("subject") or "Response")
        bullets = [str(x).strip() for x in (base.get("bullet_points") or []) if str(x).strip()]
        raw_text = str(base.get("raw_text") or "")
        prompt = (
            "Rewrite this TOEFL email task into a NEW but equivalent practice variant.\n"
            "Return ONLY valid JSON object with keys: title, to_field, subject, bullet_points, raw_text.\n"
            "Constraints:\n"
            "- Keep task type as email.\n"
            "- Keep tone practical and test-like.\n"
            "- bullet_points must be 3 to 5 concise action points.\n"
            "- No markdown, no extra text.\n\n"
            f"Base title: {base_title}\n"
            f"Base recipient: {to_field}\n"
            f"Base subject: {subject}\n"
            f"Base bullet_points: {json.dumps(bullets)}\n"
            f"Base raw_text: {raw_text}\n"
        )
        body = {
            "model": model,
            "temperature": 0.8,
            "messages": [
                {"role": "system", "content": "You generate high-quality TOEFL email task variants as strict JSON."},
                {"role": "user", "content": prompt},
            ],
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            content = payload["choices"][0]["message"]["content"].strip()
            # allow fenced json
            if content.startswith("```"):
                content = content.strip("`")
                if content.startswith("json"):
                    content = content[4:].strip()
            candidate = json.loads(content)
            if not isinstance(candidate, dict):
                return None
            return self._validate_email_variant(base, candidate)
        except Exception:
            return None

    def _extract_email_json_array(self, text: str) -> list[dict]:
        text = (text or "").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:].strip()
        start = text.find("[")
        end = text.rfind("]")
        if start == -1 or end == -1:
            return []
        try:
            arr = json.loads(text[start : end + 1])
        except Exception:
            return []
        return [x for x in arr if isinstance(x, dict)]

    def _generate_email_pool_with_llm(self, bases: list[dict], avoid_signatures: set[str] | None = None, count: int = 24) -> list[dict]:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return []
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        sample_bases = random.sample(bases, k=min(len(bases), 6))
        base_blob = [
            {
                "title": b.get("title"),
                "to_field": b.get("to_field"),
                "subject": b.get("subject"),
                "bullet_points": b.get("bullet_points"),
                "raw_text": b.get("raw_text"),
                "prompt_id": b.get("prompt_id"),
            }
            for b in sample_bases
        ]
        avoid_text = ""
        if avoid_signatures:
            avoid_text = f" Avoid creating prompts that are semantically similar to these signature hashes: {', '.join(list(avoid_signatures)[:50])}."
        recent_names = ", ".join(list(self._recent_recipients)[-20:])
        name_text = f" Avoid reusing these recent recipients: {recent_names}." if recent_names else ""
        recent_topics = ", ".join(list(self._recent_topics)[-30:])
        topic_avoid_text = f" Avoid overusing these recent topics: {recent_topics}." if recent_topics else ""
        instruction = (
            f"Generate {count} unique TOEFL email practice prompts as JSON array. "
            "Each object keys: title, to_field, subject, bullet_points, raw_text. "
            "Rules: realistic test-style email context, 3-5 clear bullet_points, polite action-oriented tasks, and diverse topics. "
            "Each prompt must explicitly indicate one purpose pattern: recommendation, invitation, proposal/solution, clarification, apology/fix, support request, or status update. "
            "Mix social and campus/academic contexts across the set. "
            "Bullet points must be concrete actions students can address directly in an email response. "
            "Use diverse recipient names/titles and avoid repeating the same person."
            " Use highly diverse subject lines spanning many intents/domains (requests, clarifications, follow-ups, status updates, logistics, policy, deadlines, support)."
            " Include occasional human emotional context (e.g., appreciative, concerned, apologetic, excited, confused) while keeping tone professional and exam-appropriate."
            f" Cover broad domains such as: {self._topic_seed_text(count)}."
            + avoid_text
            + name_text
            + topic_avoid_text
            + f" Seed examples: {json.dumps(base_blob)}"
        )
        body = {
            "model": model,
            "temperature": 0.9,
            "messages": [
                {"role": "system", "content": "You generate TOEFL email writing prompts as strict JSON array only."},
                {"role": "user", "content": instruction},
            ],
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            content = payload["choices"][0]["message"]["content"]
            rows = self._extract_email_json_array(content)
            valid: list[dict] = []
            seen_local: set[str] = set()
            default_base = random.choice(bases)
            for row in rows:
                variant = self._validate_email_variant(default_base, row)
                if not variant:
                    continue
                sig = self._email_signature(variant)
                if sig in seen_local:
                    continue
                if avoid_signatures and sig in avoid_signatures:
                    continue
                if sig in self._seen_email_signatures:
                    continue
                seen_local.add(sig)
                variant["source_prompt_id"] = f"llm-{sig}"
                vtext = f"{variant.get('title', '')} {variant.get('subject', '')} {variant.get('raw_text', '')}".lower()
                for t in EMAIL_TOPICS:
                    if t in vtext:
                        self._remember_topic(t)
                        break
                valid.append(variant)
            random.shuffle(valid)
            return valid
        except Exception:
            return []

    def _make_discussion_variant(self, base: dict) -> dict:
        variant = dict(base)
        posts = list(base.get("student_posts") or [])
        random.shuffle(posts)
        professor_prompt = (base.get("professor_prompt") or "").strip()
        add_on = random.choice(
            [
                "Explain one practical implication of your view.",
                "Add one counterargument before your conclusion.",
                "Connect your argument to a real-world example.",
            ]
        )
        if professor_prompt:
            professor_prompt = f"{professor_prompt} {add_on}"
        variant["professor_prompt"] = professor_prompt
        variant["student_posts"] = posts
        variant["title"] = f"{base.get('title', 'Academic Discussion')} - New Variant"
        return variant

    def source_ids_by_type(self, task_type: str) -> list[str]:
        base_ids = [str(p.get("prompt_id")) for p in self._prompts if p.get("task_type") == task_type and p.get("prompt_id")]
        if task_type == "email":
            llm_ids = [f"llm-{s}" for s in self._seen_email_signatures]
            return base_ids + llm_ids
        return base_ids

    def random_by_type(self, task_type: str, generate_new: bool = True, exclude_source_ids: set[str] | None = None):
        candidates = [p for p in self._prompts if p.get("task_type") == task_type]
        if exclude_source_ids and task_type != "email":
            filtered = [p for p in candidates if str(p.get("prompt_id")) not in exclude_source_ids]
            if filtered:
                candidates = filtered
        if not candidates:
            return None
        base = random.choice(candidates)
        if not generate_new:
            return self._sanitize_email_prompt_for_display(base) if task_type == "email" else base

        if task_type == "email":
            avoid = set(exclude_source_ids or set())
            # keep only unused items in pool
            self._email_pool = [v for v in self._email_pool if str(v.get("source_prompt_id")) not in avoid]
            if not self._email_pool:
                generated = self._generate_email_pool_with_llm(candidates, avoid_signatures=avoid, count=24)
                if generated:
                    self._email_pool.extend(generated)
            variant = None
            for _ in range(8):
                candidate_variant = (
                    self._email_pool.pop()
                    if self._email_pool
                    else (self._make_email_variant_llm(base) or self._make_email_variant(base))
                )
                sig_try = self._email_signature(candidate_variant)
                source_try = str(candidate_variant.get("source_prompt_id") or f"llm-{sig_try}")
                if source_try in avoid or sig_try in self._seen_email_signatures:
                    continue
                candidate_variant["source_prompt_id"] = source_try
                variant = candidate_variant
                break
            if variant is None:
                variant = self._make_email_variant(base)
            sig = self._email_signature(variant)
            source_id = str(variant.get("source_prompt_id") or f"llm-{sig}")
            variant["source_prompt_id"] = source_id
            self._remember_recipient(str(variant.get("to_field") or ""))
            vtext = f"{variant.get('title', '')} {variant.get('subject', '')} {variant.get('raw_text', '')}".lower()
            for t in EMAIL_TOPICS:
                if t in vtext:
                    self._remember_topic(t)
                    break
            self._remember_email_signature(sig)
        else:
            variant = self._make_discussion_variant(base)
        source_id = str(variant.get("source_prompt_id") or base.get("prompt_id", "x"))
        runtime_base_id = str(base.get("prompt_id", "x"))
        variant_id = f"gen-{task_type}-{runtime_base_id}-{uuid.uuid4().hex[:8]}"
        variant["source_prompt_id"] = source_id
        variant["prompt_id"] = variant_id
        variant = self._sanitize_email_prompt_for_display(variant) if task_type == "email" else variant
        self._runtime_prompts[variant_id] = variant
        return variant


prompt_store = PromptStore()
