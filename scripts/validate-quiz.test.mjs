// Run: node scripts/validate-quiz.test.mjs
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { validateQuiz } = createRequire(import.meta.url)("../cloud/validateQuiz.js");
import starter from "../src/Misc/Features/Quiz/starterQuiz.json" with { type: "json" };
import staticQuiz from "../src/Misc/Features/Quiz/quiz.json" with { type: "json" };

const good = { title: "t", questions: [{ id: 1, type: "sign-to-letter", question: "?", signId: "sign-b",
  options: [{ value: "correct", text: "B" }, { value: "wrong1", text: "D" }], correct_answer: "correct" }] };
assert.equal(validateQuiz(good).ok, true);
assert.equal(validateQuiz({ title: "static", questions: staticQuiz.slice(0, 15) }).ok, true);

assert.equal(starter.questions.length, 10);
assert.equal(validateQuiz(starter).ok, true, validateQuiz(starter).errors.join());

const bad = structuredClone(good);
bad.questions[0].signId = "sign-hello";
assert.match(validateQuiz(bad).errors[0], /unknown signId/);
const noAnswer = structuredClone(good);
noAnswer.questions[0].correct_answer = "nope";
assert.match(validateQuiz(noAnswer).errors[0], /correct_answer/);
assert.equal(validateQuiz({ title: "x", questions: [] }).ok, false);
console.log("validateQuiz: all tests passed");
