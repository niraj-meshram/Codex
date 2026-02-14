import { HistoryItem, Prompt, SentenceSet, SentenceSubmitResult, SubmitResult, TaskType } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function fetchRandomPrompt(taskType: TaskType): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/api/prompts/random?task_type=${taskType}`, {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitAnswer(promptId: string, userText: string): Promise<SubmitResult> {
  const res = await fetch(`${API_BASE}/api/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt_id: promptId, user_text: userText }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/api/history`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchSentenceSet(
  count = 10,
  difficulty: "normal" | "hard" | "very_hard" = "hard"
): Promise<SentenceSet> {
  const res = await fetch(`${API_BASE}/api/sentence/random?count=${count}&difficulty=${difficulty}`, {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitSentenceSet(setId: string, answers: Record<string, string>): Promise<SentenceSubmitResult> {
  const res = await fetch(`${API_BASE}/api/sentence/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ set_id: setId, answers }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
