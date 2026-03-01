import { HistoryItem, Prompt, SentenceSet, SentenceSubmitResult, SubmitResult, TaskType } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  return text || `${res.status} ${res.statusText}`;
}

async function fetchOrThrow(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE}${path}`;
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(`Cannot connect to backend at ${url}. Start the FastAPI server and retry.`);
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchOrThrow(path, init);
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(`Backend request failed (${res.status}) for ${path}: ${detail}`);
  }
  return res.json();
}

export async function fetchRandomPrompt(taskType: TaskType): Promise<Prompt> {
  return fetchJson<Prompt>(`/api/prompts/random?task_type=${taskType}`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function fetchRandomPromptForStudent(taskType: TaskType, studentId: string): Promise<Prompt> {
  const sid = encodeURIComponent(studentId);
  return fetchJson<Prompt>(`/api/prompts/random?task_type=${taskType}&student_id=${sid}`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function submitAnswer(promptId: string, userText: string): Promise<SubmitResult> {
  return fetchJson<SubmitResult>(`/api/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt_id: promptId, user_text: userText }),
  });
}

export async function submitAnswerForStudent(promptId: string, userText: string, studentId: string): Promise<SubmitResult> {
  return fetchJson<SubmitResult>(`/api/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt_id: promptId, user_text: userText, student_id: studentId }),
  });
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  return fetchJson<HistoryItem[]>(`/api/history`, { cache: "no-store" });
}

export async function fetchHistoryForStudent(studentId: string): Promise<HistoryItem[]> {
  const sid = encodeURIComponent(studentId);
  return fetchJson<HistoryItem[]>(`/api/history?student_id=${sid}`, { cache: "no-store" });
}

export async function fetchSentenceSet(
  count = 10,
  difficulty: "normal" | "hard" | "very_hard" | "extra_tough" = "hard"
): Promise<SentenceSet> {
  return fetchJson<SentenceSet>(`/api/sentence/random?count=${count}&difficulty=${difficulty}`, {
    method: "POST",
    cache: "no-store",
  });
}

export async function submitSentenceSet(setId: string, answers: Record<string, string>): Promise<SentenceSubmitResult> {
  return fetchJson<SentenceSubmitResult>(`/api/sentence/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ set_id: setId, answers }),
  });
}
