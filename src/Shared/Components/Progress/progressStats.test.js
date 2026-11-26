// progressStats.test.js
// Run from the project root:  node --test src/Shared/Components/Progress/
import test from "node:test";
import assert from "node:assert/strict";
import {
  recordAnswer, recordAnswers, masteryOf, isWeak, accuracy,
  studyStreak, activityLastDays, summarize, pickReviewSigns, dayKey,
} from "./progressStats.js";

const NOW = new Date(2026, 10, 20, 12); // Nov 20 2026, local noon
const daysAgo = (n) => dayKey(new Date(2026, 10, 20 - n, 12));

test("recordAnswer counts answers, resets the streak on a miss, and does not mutate", () => {
  const start = {};
  let s = recordAnswer(start, "sign-a", true, NOW);
  s = recordAnswer(s, "sign-a", true, NOW);
  assert.deepEqual({ ...s["sign-a"], lastSeen: null }, { seen: 2, correct: 2, streak: 2, lastSeen: null });
  s = recordAnswer(s, "sign-a", false, NOW);
  assert.equal(s["sign-a"].streak, 0);
  assert.equal(s["sign-a"].seen, 3);
  assert.deepEqual(start, {}); // original untouched
});

test("recordAnswers applies a whole quiz", () => {
  const s = recordAnswers({}, [
    { signId: "sign-a", correct: true },
    { signId: "sign-b", correct: false },
    { signId: "sign-a", correct: true },
  ], NOW);
  assert.equal(s["sign-a"].seen, 2);
  assert.equal(s["sign-b"].correct, 0);
});

test("masteryOf levels", () => {
  assert.equal(masteryOf(undefined), "new");
  assert.equal(masteryOf({ seen: 0, correct: 0, streak: 0 }), "new");
  assert.equal(masteryOf({ seen: 1, correct: 1, streak: 1 }), "learning"); // not enough evidence yet
  assert.equal(masteryOf({ seen: 2, correct: 2, streak: 2 }), "familiar");
  assert.equal(masteryOf({ seen: 4, correct: 4, streak: 4 }), "mastered");
  assert.equal(masteryOf({ seen: 4, correct: 3, streak: 0 }), "familiar"); // 75% but last one missed
  assert.equal(masteryOf({ seen: 5, correct: 2, streak: 1 }), "learning");
});

test("isWeak and accuracy", () => {
  assert.equal(isWeak(undefined), false);
  assert.equal(isWeak({ seen: 1, correct: 0, streak: 0 }), true);
  assert.equal(isWeak({ seen: 3, correct: 3, streak: 3 }), false);
  assert.equal(accuracy({ seen: 4, correct: 3 }), 0.75);
  assert.equal(accuracy({ seen: 0, correct: 0 }), null);
});

test("studyStreak counts consecutive days and tolerates 'not yet today'", () => {
  assert.equal(studyStreak([], NOW), 0);
  assert.equal(studyStreak([daysAgo(0), daysAgo(1), daysAgo(2)], NOW), 3);
  assert.equal(studyStreak([daysAgo(1), daysAgo(2)], NOW), 2); // studied yesterday, not yet today
  assert.equal(studyStreak([daysAgo(0), daysAgo(2)], NOW), 1); // gap breaks it
  assert.equal(studyStreak([daysAgo(3)], NOW), 0); // too old
});

test("activityLastDays returns n days, oldest first, with active flags", () => {
  const a = activityLastDays([daysAgo(0), daysAgo(2)], 7, NOW);
  assert.equal(a.length, 7);
  assert.equal(a[6].day, daysAgo(0));
  assert.equal(a[6].active, true);
  assert.equal(a[5].active, false);
  assert.equal(a[4].active, true);
});

test("summarize counts levels, accuracy, and flags learned-but-weak signs", () => {
  const library = [
    { id: "sign-a", label: "A" }, { id: "sign-b", label: "B" },
    { id: "sign-c", label: "C" }, { id: "sign-d", label: "D" },
  ];
  const stats = {
    "sign-a": { seen: 5, correct: 5, streak: 5, lastSeen: NOW.toISOString() }, // mastered
    "sign-b": { seen: 4, correct: 1, streak: 0, lastSeen: NOW.toISOString() }, // weak
    "sign-c": { seen: 2, correct: 2, streak: 2, lastSeen: NOW.toISOString() }, // familiar
  };
  const s = summarize({ library, learned: ["sign-b", "sign-d"], stats, studyDays: [daysAgo(0)], quizzesTaken: 3, today: NOW });
  assert.deepEqual(s.levels, { new: 1, learning: 1, familiar: 1, mastered: 1 });
  assert.equal(s.totalSigns, 4);
  assert.equal(s.learnedCount, 2);
  assert.equal(s.attempts, 11);
  assert.equal(Math.round(s.overallAccuracy * 100), Math.round((8 / 11) * 100));
  assert.deepEqual(s.weakest.map((w) => w.id), ["sign-b"]);
  assert.deepEqual(s.claimedButWeak.map((w) => w.id), ["sign-b"]); // marked learned, quizzes disagree
  assert.equal(s.streak, 1);
  assert.equal(s.quizzesTaken, 3);
});

test("summarize works with no data at all", () => {
  const s = summarize({ library: [{ id: "sign-a", label: "A" }], today: NOW });
  assert.equal(s.overallAccuracy, null);
  assert.equal(s.levels.new, 1);
  assert.equal(s.streak, 0);
});

test("pickReviewSigns puts weak first, then never seen, then in-progress, then mastered", () => {
  const stats = {
    a: { seen: 3, correct: 1, streak: 0, lastSeen: NOW.toISOString() }, // weak
    c: { seen: 3, correct: 3, streak: 3, lastSeen: NOW.toISOString() }, // familiar
    d: { seen: 5, correct: 5, streak: 5, lastSeen: NOW.toISOString() }, // mastered
  };
  // b was never asked
  assert.deepEqual(pickReviewSigns(stats, ["d", "c", "b", "a"], 4, NOW), ["a", "b", "c", "d"]);
  assert.deepEqual(pickReviewSigns(stats, ["d", "c", "b", "a"], 2, NOW), ["a", "b"]);
});

test("pickReviewSigns ranks a stale in-progress sign above a fresh one", () => {
  const old = new Date(2026, 10, 1, 12).toISOString();
  const stats = {
    x: { seen: 3, correct: 3, streak: 3, lastSeen: NOW.toISOString() },
    y: { seen: 3, correct: 3, streak: 3, lastSeen: old },
  };
  assert.deepEqual(pickReviewSigns(stats, ["x", "y"], 2, NOW), ["y", "x"]);
});

// ---------- signResultsFromQuiz ----------
import { signResultsFromQuiz } from "./progressStats.js";

test("signResultsFromQuiz maps sign questions, skips text and unanswered ones", () => {
  const questions = [
    { id: 1, type: "radio", question: "Text only", options: [], correct_answer: "correct" },
    { id: 2, type: "sign-to-letter", signId: "sign-a", options: [], correct_answer: "correct" },
    {
      id: 3, type: "letter-to-sign", correct_answer: "correct",
      options: [{ value: "wrong1", signId: "sign-x" }, { value: "correct", signId: "sign-b" }],
    },
    { id: 4, type: "sign-to-letter", signId: "sign-c", options: [], correct_answer: "correct" },
  ];
  const scored = {
    results: [
      { id: 1, chosen: "correct", correct: true },
      { id: 2, chosen: "wrong1", correct: false },
      { id: 3, chosen: "correct", correct: true },
      { id: 4, chosen: null, correct: false }, // left blank
    ],
  };
  assert.deepEqual(signResultsFromQuiz(questions, scored), [
    { signId: "sign-a", correct: false },
    { signId: "sign-b", correct: true },
  ]);
});

test("pickReviewSigns with jitter still returns n ids and keeps weak signs first", () => {
  const stats = { a: { seen: 3, correct: 0, streak: 0, lastSeen: NOW.toISOString() } };
  for (let i = 0; i < 20; i += 1) {
    const picked = pickReviewSigns(stats, ["a", "b", "c", "d", "e"], 3, NOW, 5);
    assert.equal(picked.length, 3);
    assert.equal(picked[0], "a"); // weak always outranks never-seen, jitter or not
  }
});