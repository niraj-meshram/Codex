export type TaskType = "email" | "discussion";

export type Prompt = {
  task_type: TaskType;
  prompt_id: string;
  title: string;
  constraints: {
    time_minutes: number;
    min_words: number;
  };
  raw_text: string;
  to_field?: string | null;
  subject?: string | null;
  bullet_points: string[];
  professor_prompt?: string | null;
  student_posts: string[];
};

export type SubmitResult = {
  rule_checks: Record<string, unknown>;
  rubric_scores: Record<string, number>;
  explanations: Record<string, string>;
  overall_score: number;
  feedback: {
    strengths: string[];
    fixes: string[];
    rewrite_suggestions: string[];
  };
  improved_sample: string;
  vocab_suggestions: string[];
};

export type HistoryItem = {
  id: number;
  prompt_id: string;
  task_type: string;
  user_text: string;
  scores_json: SubmitResult | SentenceSubmitResult | Record<string, unknown>;
  created_at: string;
};

export type SentenceQuestion = {
  question_id: string;
  prompt: string;
  response_template: string[];
  tokens: string[];
};

export type SentenceSet = {
  set_id: string;
  title: string;
  directions: string;
  time_minutes: number;
  difficulty: "normal" | "hard" | "very_hard" | "extra_tough";
  questions: SentenceQuestion[];
};

export type SentenceSubmitResult = {
  total_questions: number;
  correct_answers: number;
  score_percent: number;
  explanations: Array<{
    question_id: string;
    is_correct: boolean;
    expected: string;
    received: string;
  }>;
};
