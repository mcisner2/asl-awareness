// practiceQuiz.js
// Pure function (no Parse, no React) that builds a practice quiz in the same
// format the quiz player already understands:
//   "sign-to-letter": an animated sign is shown, text options
//   "letter-to-sign": a letter is shown, animated sign options
// Every question's correct option has value "correct" and the question's
// correct_answer is "correct", which is what quizEngine.scoreQuiz compares.

function shuffle(list, random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// signIds: which signs to ask about, in order. signs: signLibrary.json entries.
export function buildPracticeQuestions(signIds, signs, random = Math.random) {
  const byId = new Map(signs.map((s) => [s.id, s]));
  const questions = [];

  signIds.forEach((id, index) => {
    const target = byId.get(id);
    if (!target) return;

    // wrong answers: other signs, preferring the same category (letters with letters)
    const others = signs.filter((s) => s.id !== id);
    const sameCategory = others.filter((s) => s.category === target.category);
    const pool = sameCategory.length >= 3 ? sameCategory : others;
    const wrong = shuffle(pool, random).slice(0, 3);

    // alternate the two question types so a practice quiz has both
    const signToLetter = index % 2 === 0;
    const isLetter = target.category === "alphabet";
    const options = signToLetter
      ? [
          { value: "correct", text: target.label },
          ...wrong.map((w, i) => ({ value: `wrong${i + 1}`, text: w.label })),
        ]
      : [
          { value: "correct", signId: target.id },
          ...wrong.map((w, i) => ({ value: `wrong${i + 1}`, signId: w.id })),
        ];

    questions.push({
      id: questions.length + 1,
      type: signToLetter ? "sign-to-letter" : "letter-to-sign",
      signId: target.id,
      question: signToLetter
        ? isLetter ? "Which letter is this sign?" : "What does this sign mean?"
        : `Which sign is "${target.label}"?`,
      options,
      correct_answer: "correct",
    });
  });

  return questions;
}