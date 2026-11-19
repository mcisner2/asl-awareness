// quizEngine.js
// Pure helpers for the quiz player (no React), so they are easy to test.
import library from "../Signs/Library/signLibrary.json";

export const signsById = Object.fromEntries(library.map((s) => [s.id, s]));

// question types: "radio" (text), "sign-to-letter" (animated sign shown,
// text options), "letter-to-sign" (letter shown, animated sign options)
export function scoreQuiz(questions, answers) {
  const results = questions.map((q) => ({
    id: q.id,
    chosen: answers[q.id] ?? null,
    correct: answers[q.id] === q.correct_answer,
  }));
  return { score: results.filter((r) => r.correct).length, total: questions.length, results };
}

// Shuffle a copy of the questions' options so correct answers aren't always
// in the same spot.
export function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
