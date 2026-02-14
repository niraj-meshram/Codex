"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchRandomPrompt, fetchSentenceSet, submitAnswer, submitSentenceSet } from "@/lib/api";
import { Prompt, SentenceSet, SentenceSubmitResult, SubmitResult, TaskType } from "@/lib/types";

function countWords(text: string): number {
  return (text.match(/\b\w+\b/g) || []).length;
}

function buildEmailScenario(rawText: string): string {
  const cleaned = rawText.replace(/\s+/g, " ").trim();
  const idx = cleaned.toLowerCase().indexOf("write an email");
  if (idx > 0) {
    return cleaned.slice(0, idx).trim();
  }
  return cleaned;
}

function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
}

function PracticeSection({ taskType, heading }: { taskType: TaskType; heading: string }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const wordCount = useMemo(() => countWords(text), [text]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, secondsLeft]);

  async function startPractice() {
    setLoadingPrompt(true);
    setError("");
    setResult(null);
    try {
      const p = await fetchRandomPrompt(taskType);
      setPrompt(p);
      setText("");
      setSecondsLeft((p.constraints.time_minutes || 0) * 60);
      setRunning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prompt");
    } finally {
      setLoadingPrompt(false);
    }
  }

  async function handleSubmit() {
    if (!prompt) return;
    setSubmitting(true);
    setError("");
    try {
      const r = await submitAnswer(prompt.prompt_id, text);
      setResult(r);
      setRunning(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <section className="card p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{heading}</h2>
        <div className="text-lg font-semibold">
          Timer: {mm}:{ss}
        </div>
      </div>
      <section className="bg-slate-50 border rounded p-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void startPractice()}
            disabled={loadingPrompt}
            className="bg-accent text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {loadingPrompt ? "Loading..." : "Start Timer + Prompt"}
          </button>
          <div className="text-sm text-slate-700">
            Section: <span className="font-semibold">{taskType === "email" ? "Write an Email" : "Academic Discussion"}</span>
          </div>
        </div>
      </section>

      {error ? <div className="card p-4 text-red-700 whitespace-pre-wrap">{error}</div> : null}

      {prompt ? (
        <section className="card p-4 md:p-6 space-y-3">
          <h2 className="text-xl font-semibold">
            {prompt.title} (#{prompt.prompt_id})
          </h2>
          {prompt.task_type === "email" ? (
            <div className="space-y-2">
              <p className="text-slate-800 whitespace-pre-wrap">{buildEmailScenario(prompt.raw_text)}</p>
              <p className="font-medium">
                Write an email to {prompt.to_field || "the recipient"}. In your email, do the following:
              </p>
              <ul className="list-disc pl-5">
                {prompt.bullet_points.length ? (
                  prompt.bullet_points.map((b, i) => <li key={i}>{b}</li>)
                ) : (
                  <li>Address all required task points clearly.</li>
                )}
              </ul>
              <p>Write as much as you can and in complete sentences.</p>
              <div className="pt-2 border-t border-slate-200">
                <div className="font-semibold">Your Response:</div>
              </div>
              <div>
                <span className="font-semibold">To:</span> {prompt.to_field || "-"}
              </div>
              <div>
                <span className="font-semibold">Subject:</span> {prompt.subject || "-"}
              </div>
              <p className="text-sm text-slate-600">Space for typing answers. On test day, you will have 7 minutes to read and write.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="font-semibold">Professor Prompt</div>
                <p className="text-slate-700 whitespace-pre-wrap">{prompt.professor_prompt || "-"}</p>
              </div>
              <div>
                <div className="font-semibold">Student Posts</div>
                <ul className="list-disc pl-5">
                  {prompt.student_posts.length ? (
                    prompt.student_posts.map((p, i) => <li key={i}>{p}</li>)
                  ) : (
                    <li>Could not parse student posts; use raw prompt below.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          <details>
            <summary className="cursor-pointer text-slate-600">Show full raw prompt</summary>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{prompt.raw_text}</p>
          </details>
        </section>
      ) : null}

      {prompt ? (
        <section className="card p-4 md:p-6 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full border rounded p-3"
            placeholder={
              prompt.task_type === "email"
                ? "Write your TOEFL email response here..."
                : "Write your academic discussion response here..."
            }
          />
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div>Words: {wordCount}</div>
            {prompt.constraints.min_words > 0 ? <div>Minimum required: {prompt.constraints.min_words}</div> : null}
          </div>
          <button
            onClick={() => void handleSubmit()}
            disabled={!text.trim() || submitting}
            className="bg-accent2 text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </section>
      ) : null}

      {result ? (
        <section className="card p-4 md:p-6 space-y-3">
          <h3 className="text-lg font-semibold">Structured Feedback</h3>
          <div>
            Overall score: <span className="font-bold">{result.overall_score}/5</span>
          </div>
          <div>
            <div className="font-semibold">Rubric Scores</div>
            <ul className="list-disc pl-5">
              {Object.entries(result.rubric_scores).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}/5
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold">Score Explanations</div>
            <ul className="list-disc pl-5">
              {Object.entries(result.explanations || {}).map(([k, v]) => (
                <li key={k}>
                  <span className="font-medium">{k}:</span> {v}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold">Strengths</div>
            <ul className="list-disc pl-5">
              {result.feedback.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold">Fixes</div>
            <ul className="list-disc pl-5">
              {result.feedback.fixes.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold">Rewrite Suggestions</div>
            <ul className="list-disc pl-5">
              {result.feedback.rewrite_suggestions.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold">Improved Sample</div>
            <p className="whitespace-pre-wrap bg-slate-50 border rounded p-3">{result.improved_sample}</p>
          </div>
          <div>
            <div className="font-semibold">Vocabulary Suggestions</div>
            <p>{result.vocab_suggestions.join(", ")}</p>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SentencePracticeSection() {
  const [setData, setSetData] = useState<SentenceSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [placements, setPlacements] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<SentenceSubmitResult | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState<"easy" | "hard" | "tough">("hard");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [loadingSet, setLoadingSet] = useState(false);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [running, secondsLeft]);

  async function start() {
    setError("");
    setResult(null);
    setLoadingSet(true);
    try {
      const difficultyMap = {
        easy: "normal",
        hard: "hard",
        tough: "very_hard",
      } as const;
      const data = await fetchSentenceSet(10, difficultyMap[difficultyLevel]);
      const seed: Record<string, string> = {};
      const seedPlacements: Record<string, string[]> = {};
      data.questions.forEach((q) => {
        seed[q.question_id] = "";
        seedPlacements[q.question_id] = Array(q.tokens.length).fill("");
      });
      setAnswers(seed);
      setPlacements(seedPlacements);
      setSetData(data);
      setSecondsLeft(data.time_minutes * 60);
      setRunning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sentence set");
    } finally {
      setLoadingSet(false);
    }
  }

  function tokenItems(tokens: string[]) {
    return tokens.map((t, idx) => ({ id: `w${idx}`, text: t }));
  }

  function buildSentenceFromTemplate(template: string[], placedIds: string[], items: { id: string; text: string }[]) {
    const textById = Object.fromEntries(items.map((x) => [x.id, x.text]));
    let slotCursor = 0;
    const builtParts: string[] = [];
    for (const part of template) {
      if (part === "__") {
        const id = placedIds[slotCursor] || "";
        slotCursor += 1;
        if (id && textById[id]) builtParts.push(textById[id]);
      } else {
        builtParts.push(part);
      }
    }
    let sentence = builtParts.join(" ").replace(/\s+([.,?!])/g, "$1").trim();
    if (sentence && !/[.?!]$/.test(sentence)) sentence += ".";
    return sentence;
  }

  function handleDrop(questionId: string, slotIndex: number, tokenId: string, tokens: string[]) {
    const items = tokenItems(tokens);
    const token = items.find((x) => x.id === tokenId);
    if (!token) return;

    setPlacements((prev) => {
      const current = [...(prev[questionId] || [])];
      const prevIndex = current.findIndex((x) => x === tokenId);
      if (prevIndex >= 0 && prevIndex !== slotIndex) {
        current[prevIndex] = "";
      }
      // If target already had a word, it is removed back to options pool.
      current[slotIndex] = "";
      current[slotIndex] = tokenId;

      const textById = Object.fromEntries(items.map((x) => [x.id, x.text]));
      const q = setData?.questions.find((qq) => qq.question_id === questionId);
      const sentence = q ? buildSentenceFromTemplate(q.response_template, current, items) : "";
      setAnswers((a) => ({ ...a, [questionId]: sentence }));
      return { ...prev, [questionId]: current };
    });
  }

  function returnToOptions(questionId: string, tokenId: string, tokens: string[]) {
    const items = tokenItems(tokens);
    setPlacements((prev) => {
      const current = [...(prev[questionId] || [])];
      const idx = current.findIndex((x) => x === tokenId);
      if (idx >= 0) current[idx] = "";
      const q = setData?.questions.find((qq) => qq.question_id === questionId);
      const sentence = q ? buildSentenceFromTemplate(q.response_template, current, items) : "";
      setAnswers((a) => ({ ...a, [questionId]: sentence }));
      return { ...prev, [questionId]: current };
    });
  }

  function clearSlot(questionId: string, slotIndex: number, tokens: string[]) {
    const items = tokenItems(tokens);
    setPlacements((prev) => {
      const current = [...(prev[questionId] || [])];
      current[slotIndex] = "";
      const q = setData?.questions.find((qq) => qq.question_id === questionId);
      const sentence = q ? buildSentenceFromTemplate(q.response_template, current, items) : "";
      setAnswers((a) => ({ ...a, [questionId]: sentence }));
      return { ...prev, [questionId]: current };
    });
  }

  async function submit() {
    if (!setData) return;
    try {
      const r = await submitSentenceSet(setData.set_id, answers);
      setResult(r);
      setRunning(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <section className="p-6 md:p-8 space-y-6 bg-[#ececec] rounded">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-semibold">Build a Sentence</h2>
      </div>
      <div className="sticky top-2 z-20">
        <div className="mx-auto w-fit rounded-lg border border-slate-300 bg-white/95 px-4 py-2 text-lg font-semibold shadow-sm backdrop-blur">
          Timer: {mm}:{ss}
        </div>
      </div>
      <p className="text-3xl leading-relaxed">
        <span className="font-semibold underline">Directions:</span> Move the words in the boxes to create grammatical sentences. On test day, you will have 6 minutes to complete 10 questions.
      </p>
      <div className="space-y-2">
        <div className="text-lg font-semibold">Difficulty</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDifficultyLevel("easy")}
            className={`px-3 py-2 rounded border ${difficultyLevel === "easy" ? "bg-accent text-white border-accent" : "bg-white text-slate-700 border-slate-300"}`}
          >
            Easy
          </button>
          <button
            onClick={() => setDifficultyLevel("hard")}
            className={`px-3 py-2 rounded border ${difficultyLevel === "hard" ? "bg-accent text-white border-accent" : "bg-white text-slate-700 border-slate-300"}`}
          >
            Hard
          </button>
          <button
            onClick={() => setDifficultyLevel("tough")}
            className={`px-3 py-2 rounded border ${difficultyLevel === "tough" ? "bg-accent text-white border-accent" : "bg-white text-slate-700 border-slate-300"}`}
          >
            Tough
          </button>
        </div>
        <div className="text-sm text-slate-600">
          {difficultyLevel === "easy" ? "Easy: simpler sentence options and easier patterns." : null}
          {difficultyLevel === "hard" ? "Hard: tougher questions with more challenging English." : null}
          {difficultyLevel === "tough" ? "Tough: very hard questions with difficult English and grammar." : null}
        </div>
      </div>
      <button
        onClick={() => void start()}
        disabled={loadingSet}
        className="bg-accent text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
      >
        {loadingSet ? "Loading..." : "Start Build a Sentence"}
      </button>
      {error ? <div className="text-red-700">{error}</div> : null}

      {setData ? (
        <div className="space-y-8">
          {setData.questions.map((q, idx) => (
            <div key={q.question_id} className="space-y-4">
              <div className="font-semibold text-3xl">{idx + 1}.</div>
              <div className="flex items-start gap-3">
                <img
                  src={avatarUrl(`${setData.set_id}-${q.question_id}-speaker`)}
                  alt="speaker avatar"
                  className="h-16 w-16 rounded-full border-2 border-teal-400 bg-white shrink-0"
                />
                <p className="text-4xl">{q.prompt}</p>
              </div>
              <div className="flex items-start gap-3">
                <img
                  src={avatarUrl(`${setData.set_id}-${q.question_id}-response`)}
                  alt="response avatar"
                  className="h-16 w-16 rounded-full border-2 border-teal-400 bg-white shrink-0"
                />
                <div className="flex flex-wrap gap-2 items-end">
                  {(() => {
                    const items = tokenItems(q.tokens);
                    let slotCursor = 0;
                    return q.response_template.map((part, idx2) => {
                      if (part !== "__") {
                        return (
                          <span key={`${q.question_id}-txt-${idx2}`} className="text-3xl text-slate-800">
                            {part}
                          </span>
                        );
                      }
                      const sIdx = slotCursor;
                      slotCursor += 1;
                      const tokenId = (placements[q.question_id] || [])[sIdx];
                      const tokenText = items.find((x) => x.id === tokenId)?.text || "";
                      return (
                        <button
                          key={`${q.question_id}-slot-${sIdx}`}
                          draggable={Boolean(tokenId)}
                          onDragStart={(e) => {
                            if (tokenId) e.dataTransfer.setData("text/plain", tokenId);
                          }}
                          onClick={() => clearSlot(q.question_id, sIdx, q.tokens)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const id = e.dataTransfer.getData("text/plain");
                            handleDrop(q.question_id, sIdx, id, q.tokens);
                          }}
                          className="min-w-16 px-1 py-1 border-b-2 border-slate-400 bg-transparent text-slate-500 text-3xl text-left focus:outline-none focus:ring-0 active:outline-none"
                        >
                          {tokenText || <span className="invisible">word</span>}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              <div
                className="text-4xl text-slate-700 flex flex-wrap items-center gap-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) returnToOptions(q.question_id, id, q.tokens);
                }}
              >
                {tokenItems(q.tokens).map((item, i) => {
                  const used = (placements[q.question_id] || []).includes(item.id);
                  return (
                    <span key={`${q.question_id}-${item.id}-${i}`} className="flex items-center gap-2">
                      <span
                        draggable={!used}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                        className={`${used ? "text-slate-400" : "cursor-move"} select-none`}
                      >
                        {item.text}
                      </span>
                      {i < tokenItems(q.tokens).length - 1 ? <span>/</span> : null}
                    </span>
                  );
                })}
              </div>
              <div className="text-sm text-slate-500">Drag words into the blanks. Click a filled blank to remove a word.</div>
            </div>
          ))}
          <button onClick={() => void submit()} className="bg-accent2 text-white px-4 py-2 rounded hover:opacity-90">
            Submit Sentence Set
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="card p-4 space-y-2">
          <div className="font-semibold">
            Score: {result.correct_answers}/{result.total_questions} ({result.score_percent}%)
          </div>
          <ul className="list-disc pl-5">
            {result.explanations.map((x) => (
              <li key={x.question_id}>
                {x.question_id}: {x.is_correct ? "Correct" : `Incorrect (Expected: ${x.expected})`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="space-y-6">
      <PracticeSection taskType="email" heading="Section 1: Write an Email (7 minutes)" />
      <PracticeSection taskType="discussion" heading="Section 2: Academic Discussion (10 minutes, 100+ words)" />
      <SentencePracticeSection />
    </main>
  );
}
