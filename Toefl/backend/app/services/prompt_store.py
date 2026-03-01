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


class PromptStore:
    def __init__(self):
        self._prompts = []
        self._runtime_prompts: dict[str, dict] = {}
        self._email_pool: list[dict] = []
        self._seen_email_signatures: set[str] = set()
        self._seen_email_order: deque[str] = deque()
        self._max_seen_email_memory = 2000
        self.reload()

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
        bullets = list(base.get("bullet_points") or [])
        random.shuffle(bullets)
        add_on = random.choice(
            [
                "Include one specific example from your recent experience.",
                "Use a clear action request in your final paragraph.",
                "Keep tone polite and solution-oriented.",
            ]
        )
        if bullets:
            bullets.append(add_on)
        variant["bullet_points"] = bullets
        variant["title"] = f"{base.get('title', 'Write an Email')} - New Variant"
        return variant

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

    def _validate_email_variant(self, base: dict, candidate: dict) -> dict | None:
        to_field = (candidate.get("to_field") or base.get("to_field") or "").strip()
        subject = (candidate.get("subject") or base.get("subject") or "").strip()
        bullets = candidate.get("bullet_points")
        if not isinstance(bullets, list):
            return None
        bullets = [str(b).strip() for b in bullets if str(b).strip()]
        if len(bullets) < 3:
            return None
        raw_text = (candidate.get("raw_text") or "").strip()
        if len(raw_text) < 40:
            raw_text = str(base.get("raw_text") or "").strip()
        title = (candidate.get("title") or "").strip() or f"{base.get('title', 'Write an Email')} - New Variant"
        return {
            **dict(base),
            "task_type": "email",
            "title": title,
            "to_field": to_field or base.get("to_field"),
            "subject": subject or base.get("subject"),
            "bullet_points": bullets,
            "raw_text": raw_text,
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
        instruction = (
            f"Generate {count} unique TOEFL email practice prompts as JSON array. "
            "Each object keys: title, to_field, subject, bullet_points, raw_text. "
            "Rules: realistic test-style email context, 3-5 clear bullet_points, polite action-oriented tasks, and diverse topics."
            + avoid_text
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
            return base

        if task_type == "email":
            avoid = set(exclude_source_ids or set())
            # keep only unused items in pool
            self._email_pool = [v for v in self._email_pool if str(v.get("source_prompt_id")) not in avoid]
            if not self._email_pool:
                generated = self._generate_email_pool_with_llm(candidates, avoid_signatures=avoid, count=24)
                if generated:
                    self._email_pool.extend(generated)
            variant = self._email_pool.pop() if self._email_pool else (self._make_email_variant_llm(base) or self._make_email_variant(base))
            sig = self._email_signature(variant)
            source_id = str(variant.get("source_prompt_id") or f"llm-{sig}")
            variant["source_prompt_id"] = source_id
            self._remember_email_signature(sig)
        else:
            variant = self._make_discussion_variant(base)
        source_id = str(variant.get("source_prompt_id") or base.get("prompt_id", "x"))
        runtime_base_id = str(base.get("prompt_id", "x"))
        variant_id = f"gen-{task_type}-{runtime_base_id}-{uuid.uuid4().hex[:8]}"
        variant["source_prompt_id"] = source_id
        variant["prompt_id"] = variant_id
        self._runtime_prompts[variant_id] = variant
        return variant


prompt_store = PromptStore()
