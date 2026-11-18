// main.js: Back4App Cloud Code entry point.
// Upload the contents of this folder (main.js, gemini.js, validateQuiz.js,
// quiz.md) to Back4App > Cloud Functions, and set GEMINI_API_KEY there.
const fs = require("fs");
const path = require("path");
const { generate } = require("./gemini");
const { validateQuiz, MAX_QUESTIONS } = require("./validateQuiz");

// If quiz.md was not uploaded, still register the function (so it does not
// show up as "Invalid function") and log a clear warning instead of crashing.
let QUIZ_SPEC = "Build a short ASL quiz. Question types: radio, sign-to-letter, letter-to-sign. Sign IDs are sign-a through sign-z only.";
try {
  QUIZ_SPEC = fs.readFileSync(path.join(__dirname, "quiz.md"), "utf8");
} catch (err) {
  console.warn("quiz.md not found next to main.js, using a short fallback prompt:", err.message);
}
const SYSTEM_PROMPT = `You build ASL awareness quizzes. Follow this specification exactly:\n\n${QUIZ_SPEC}`;

const LIMIT = 10; // requests per user per hour
const hits = new Map();
function rateLimited(userId) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < 3600_000);
  if (recent.length >= LIMIT) return true;
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

function cleanMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) throw new Parse.Error(141, "Invalid messages");
  return raw.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    text: String(m.text ?? "").slice(0, 1000),
  }));
}

Parse.Cloud.define("generateQuiz", async (request) => {
  if (!request.user) throw new Parse.Error(209, "Log in to build quizzes");
  if (rateLimited(request.user.id)) throw new Parse.Error(141, "Too many requests, try again later");
  const messages = cleanMessages(request.params.messages);

  // Only the chat text goes to the LLM: no account data.
  const started = Date.now();
  let attempt = messages;
  for (let i = 0; i < 2; i++) {
    // no time left for a second Gemini call before the ~30s proxy limit
    if (i > 0 && Date.now() - started > 6000) break;
    const out = await generate(SYSTEM_PROMPT, attempt);
    if (!out.quiz) return { reply: out.reply, quiz: null };
    const { ok, errors } = validateQuiz(out.quiz);
    if (ok) return { reply: out.reply, quiz: { ...out.quiz, source: "ai" } };
    // one retry, telling the model what was wrong
    attempt = [...messages, { role: "user", text: `Your quiz was invalid: ${errors.join("; ")}. Fix it (max ${MAX_QUESTIONS} questions).` }];
  }
  throw new Parse.Error(141, "Could not build a valid quiz, please rephrase");
});
