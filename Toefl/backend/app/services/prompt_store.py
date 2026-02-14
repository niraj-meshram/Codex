import json
import random
import uuid
from pathlib import Path

PROMPTS_JSON_PATH = Path(__file__).resolve().parents[3] / "data" / "prompts" / "prompts.json"


class PromptStore:
    def __init__(self):
        self._prompts = []
        self._runtime_prompts: dict[str, dict] = {}
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

    def random_by_type(self, task_type: str, generate_new: bool = True):
        candidates = [p for p in self._prompts if p.get("task_type") == task_type]
        if not candidates:
            return None
        base = random.choice(candidates)
        if not generate_new:
            return base

        variant = self._make_email_variant(base) if task_type == "email" else self._make_discussion_variant(base)
        base_id = str(base.get("prompt_id", "x"))
        variant_id = f"gen-{task_type}-{base_id}-{uuid.uuid4().hex[:8]}"
        variant["source_prompt_id"] = base_id
        variant["prompt_id"] = variant_id
        self._runtime_prompts[variant_id] = variant
        return variant


prompt_store = PromptStore()
