"use client";

import { useEffect, useState } from "react";

import { fetchHistory } from "@/lib/api";
import { HistoryItem } from "@/lib/types";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHistory().then(setItems).catch((e) => setError(e instanceof Error ? e.message : "Failed to load history"));
  }, []);

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Practice History</h2>
      {error ? <div className="card p-4 text-red-700 whitespace-pre-wrap">{error}</div> : null}
      {items.map((item) => (
        <article key={item.id} className="card p-4 space-y-2">
          <div className="font-medium">
            #{item.id} | Prompt {item.prompt_id} ({item.task_type})
          </div>
          <div className="text-sm text-slate-500">{new Date(item.created_at).toLocaleString()}</div>
          <div className="text-sm">
            {(() => {
              const scores = item.scores_json as Record<string, unknown>;
              if (typeof scores.overall_score === "number") {
                return `Overall: ${scores.overall_score}/5`;
              }
              if (typeof scores.score_percent === "number") {
                const correct = typeof scores.correct_answers === "number" ? scores.correct_answers : "?";
                const total = typeof scores.total_questions === "number" ? scores.total_questions : "?";
                return `Sentence score: ${correct}/${total} (${scores.score_percent}%)`;
              }
              return "Score unavailable";
            })()}
          </div>
          <details>
            <summary className="cursor-pointer">Show user response</summary>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.user_text}</p>
          </details>
        </article>
      ))}
      {!items.length ? <div className="text-slate-600">No submissions yet.</div> : null}
    </main>
  );
}
