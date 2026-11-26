// practiceQuiz.test.js
// Run from the project root:  node --test src/Shared/Components/Progress/
import test from "node:test";
import assert from "node:assert/strict";
import { buildPracticeQuestions } from "./practiceQuiz.js";

const SIGNS = ["a", "b", "c", "d", "e", "f"].map((l) => ({
  id: `sign-${l}`, label: l.toUpperCase(), category: "alphabet",
}));
const seeded = () => { let x = 7; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };

test("builds one question per sign, alternating types, with ids 1..n", () => {
  const qs = buildPracticeQuestions(["sign-a", "sign-b", "sign-c"], SIGNS, seeded());
  assert.deepEqual(qs.map((q) => q.id), [1, 2, 3]);
  assert.deepEqual(qs.map((q) => q.type), ["sign-to-letter", "letter-to-sign", "sign-to-letter"]);
  assert.deepEqual(qs.map((q) => q.signId), ["sign-a", "sign-b", "sign-c"]);
});

test("every question has 4 options, exactly one correct, and the correct_answer matches it", () => {
  const qs = buildPracticeQuestions(SIGNS.map((s) => s.id), SIGNS, seeded());
  for (const q of qs) {
    assert.equal(q.options.length, 4);
    assert.equal(q.options.filter((o) => o.value === q.correct_answer).length, 1);
    assert.equal(q.correct_answer, "correct");
  }
});

test("sign-to-letter options are letters; letter-to-sign options carry sign ids", () => {
  const [stl, lts] = buildPracticeQuestions(["sign-a", "sign-b"], SIGNS, seeded());
  assert.equal(stl.options.find((o) => o.value === "correct").text, "A");
  assert.ok(stl.options.every((o) => typeof o.text === "string"));
  assert.equal(lts.options.find((o) => o.value === "correct").signId, "sign-b");
  assert.ok(lts.options.every((o) => typeof o.signId === "string"));
});

test("wrong options never repeat the answer or each other", () => {
  const qs = buildPracticeQuestions(SIGNS.map((s) => s.id), SIGNS, seeded());
  for (const q of qs) {
    const keys = q.options.map((o) => o.text ?? o.signId);
    assert.equal(new Set(keys).size, 4);
  }
});

test("unknown sign ids are skipped and ids stay sequential", () => {
  const qs = buildPracticeQuestions(["sign-a", "sign-zzz", "sign-b"], SIGNS, seeded());
  assert.equal(qs.length, 2);
  assert.deepEqual(qs.map((q) => q.id), [1, 2]);
});

test("falls back to any other signs when a category is too small", () => {
  const mixed = [
    { id: "w1", label: "hello", category: "words" },
    ...SIGNS,
  ];
  const [q] = buildPracticeQuestions(["w1"], mixed, seeded());
  assert.equal(q.options.length, 4);
});