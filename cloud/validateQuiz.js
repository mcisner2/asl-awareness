// validateQuiz.js
// Checks a quiz (usually produced by the LLM) against the quiz.md contract.
// Returns { ok, errors }. The model can never invent a sign: every signId must
// be in SIGN_IDS (the library: sign-a ... sign-z).
const SIGN_IDS = new Set("abcdefghijklmnopqrstuvwxyz".split("").map((c) => `sign-${c}`));
const TYPES = ["radio", "sign-to-letter", "letter-to-sign"];
const MAX_QUESTIONS = 15;

function validateQuiz(quiz) {
  const errors = [];
  if (!quiz || typeof quiz !== "object") return { ok: false, errors: ["quiz must be an object"] };
  if (typeof quiz.title !== "string" || !quiz.title.trim()) errors.push("title is required");
  const qs = quiz.questions;
  if (!Array.isArray(qs) || qs.length < 1 || qs.length > MAX_QUESTIONS) {
    errors.push(`questions must be an array of 1-${MAX_QUESTIONS}`);
    return { ok: false, errors };
  }
  const ids = new Set();
  qs.forEach((q, n) => {
    const at = `question ${n + 1}`;
    if (ids.has(q.id)) errors.push(`${at}: duplicate id`);
    ids.add(q.id);
    if (!TYPES.includes(q.type)) errors.push(`${at}: bad type "${q.type}"`);
    if (typeof q.question !== "string" || !q.question.trim()) errors.push(`${at}: question text required`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      errors.push(`${at}: needs 2-6 options`);
      return;
    }
    const values = q.options.map((o) => o.value);
    if (new Set(values).size !== values.length) errors.push(`${at}: duplicate option values`);
    if (!values.includes(q.correct_answer)) errors.push(`${at}: correct_answer matches no option`);
    if (q.type === "sign-to-letter" && !SIGN_IDS.has(q.signId)) errors.push(`${at}: unknown signId "${q.signId}"`);
    q.options.forEach((o) => {
      if (q.type === "letter-to-sign") {
        if (!SIGN_IDS.has(o.signId)) errors.push(`${at}: unknown option signId "${o.signId}"`);
      } else if (typeof o.text !== "string" || !o.text.trim()) {
        errors.push(`${at}: option text required`);
      }
    });
  });
  return { ok: errors.length === 0, errors };
}

module.exports = { validateQuiz, SIGN_IDS, MAX_QUESTIONS };
