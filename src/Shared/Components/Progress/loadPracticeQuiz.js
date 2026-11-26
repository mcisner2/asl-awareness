import library from "../Signs/Library/signLibrary.json";
import { getMyProgress } from "./progressModel.jsx";
import { pickReviewSigns } from "./progressStats.js";
import { buildPracticeQuestions } from "./practiceQuiz.js";

// Builds a practice quiz for the logged-in user: the signs they miss most, then
// signs they have not been asked yet. QuizPlayer calls this for /quiz/practice.
// Resolves to { title, questions }, the same shape the quiz player already uses.
export async function loadPracticeQuiz(count = 8) {
  const progress = await getMyProgress();
  const ids = pickReviewSigns(
    progress.signStats,
    library.map((s) => s.id),
    count,
    new Date(),
    5 // jitter: mixes the order inside a tier so repeat practice is not identical
  );
  return {
    title: "Practice: signs to review",
    questions: buildPracticeQuestions(ids, library),
  };
}