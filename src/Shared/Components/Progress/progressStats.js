// progressStats.js
// Pure functions (no Parse, no React) that turn saved quiz answers into
// analytics and decide which signs to practice next. They live apart from the
// model and the components so they are easy to test.
//
// One sign's stat looks like: { seen, correct, streak, lastSeen }
//   seen      how many times it was asked in a quiz
//   correct   how many of those were right
//   streak    right answers in a row (a wrong answer resets it to 0)
//   lastSeen  ISO date string of the last time it was asked

const DAY_MS = 86400000;

// ---------- dates ----------

// "2026-11-20" in the visitor's local time, used to count study days
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// moves a "YYYY-MM-DD" key by whole days (noon avoids daylight-saving edges)
function shiftDay(key, delta) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + delta, 12));
}

// ---------- recording answers ----------

// Returns a NEW stats object with one answer recorded (the old one is untouched).
export function recordAnswer(stats, signId, correct, now = new Date()) {
  const prev = stats[signId] || { seen: 0, correct: 0, streak: 0, lastSeen: null };
  return {
    ...stats,
    [signId]: {
      seen: prev.seen + 1,
      correct: prev.correct + (correct ? 1 : 0),
      streak: correct ? prev.streak + 1 : 0,
      lastSeen: now.toISOString(),
    },
  };
}

// results = [{ signId, correct }, ...] from one finished quiz
export function recordAnswers(stats, results, now = new Date()) {
  return results.reduce((acc, r) => recordAnswer(acc, r.signId, r.correct, now), stats);
}

// ---------- per-sign measures ----------

export function accuracy(stat) {
  return stat && stat.seen > 0 ? stat.correct / stat.seen : null;
}

// Mastery from quiz evidence only (a self-marked "learned" is tracked separately):
//   new       never asked
//   learning  asked, but not enough right answers yet
//   familiar  asked 2+ times and at least 70% right
//   mastered  asked 4+ times, at least 85% right, and the last 2 were right
export function masteryOf(stat) {
  if (!stat || stat.seen === 0) return "new";
  const acc = stat.correct / stat.seen;
  if (stat.seen >= 4 && acc >= 0.85 && stat.streak >= 2) return "mastered";
  if (stat.seen >= 2 && acc >= 0.7) return "familiar";
  return "learning";
}

// A sign is "weak" once it has been asked and under 70% of answers were right
export function isWeak(stat) {
  return !!stat && stat.seen >= 1 && stat.correct / stat.seen < 0.7;
}

// ---------- streaks and activity ----------

// Consecutive study days ending today, or yesterday (so the streak does not
// read 0 first thing in the morning before you have studied).
export function studyStreak(studyDays, today = new Date()) {
  const days = new Set(studyDays);
  let day = dayKey(today);
  if (!days.has(day)) day = shiftDay(day, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = shiftDay(day, -1);
  }
  return streak;
}

// The last n days, oldest first: [{ day, label, active }]
export function activityLastDays(studyDays, n = 7, today = new Date()) {
  const days = new Set(studyDays);
  const out = [];
  let key = dayKey(today);
  for (let i = 0; i < n; i += 1) {
    const [y, m, d] = key.split("-").map(Number);
    out.unshift({
      day: key,
      label: new Date(y, m - 1, d, 12).toLocaleDateString(undefined, { weekday: "narrow" }),
      active: days.has(key),
    });
    key = shiftDay(key, -1);
  }
  return out;
}

// ---------- analytics summary ----------

// library = [{ id, label }, ...] (signLibrary.json); learned = ids the user marked
export function summarize({
  library,
  learned = [],
  stats = {},
  studyDays = [],
  quizzesTaken = 0,
  today = new Date(),
}) {
  const learnedSet = new Set(learned);
  const levels = { new: 0, learning: 0, familiar: 0, mastered: 0 };
  let attempts = 0;
  let correct = 0;
  const weak = [];
  const claimedButWeak = []; // marked "learned" but the quizzes say otherwise

  for (const sign of library) {
    const stat = stats[sign.id];
    levels[masteryOf(stat)] += 1;
    if (stat) {
      attempts += stat.seen;
      correct += stat.correct;
    }
    if (isWeak(stat)) {
      const row = { id: sign.id, label: sign.label, accuracy: accuracy(stat), seen: stat.seen };
      weak.push(row);
      if (learnedSet.has(sign.id)) claimedButWeak.push(row);
    }
  }
  weak.sort((a, b) => a.accuracy - b.accuracy || b.seen - a.seen || a.label.localeCompare(b.label));
  claimedButWeak.sort((a, b) => a.accuracy - b.accuracy || a.label.localeCompare(b.label));

  return {
    totalSigns: library.length,
    learnedCount: library.filter((s) => learnedSet.has(s.id)).length,
    levels,
    attempts,
    overallAccuracy: attempts ? correct / attempts : null,
    weakest: weak.slice(0, 5),
    claimedButWeak: claimedButWeak.slice(0, 5),
    streak: studyStreak(studyDays, today),
    last7: activityLastDays(studyDays, 7, today),
    quizzesTaken,
  };
}

// ---------- adaptive practice ----------

// Picks which signs a practice quiz should ask about. Priority, highest first:
//   1. weak signs (the lower the accuracy, the higher)
//   2. signs never asked
//   3. signs asked but not mastered (the longer since last seen, the higher)
//   4. mastered signs, only to fill the quiz
// A simple spaced-review idea: what you miss or have not seen comes back first.
export function pickReviewSigns(stats, ids, n = 8, now = new Date()) {
  const scored = ids.map((id) => {
    const stat = stats[id];
    let score;
    if (!stat || stat.seen === 0) {
      score = 60;
    } else {
      const days = stat.lastSeen
        ? Math.max(0, (now - new Date(stat.lastSeen)) / DAY_MS)
        : 0;
      if (isWeak(stat)) score = 100 + (1 - accuracy(stat)) * 50;
      else if (masteryOf(stat) === "mastered") score = Math.min(days, 20);
      else score = 30 + Math.min(days, 30);
    }
    return { id, score };
  });
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored.slice(0, n).map((s) => s.id);
}