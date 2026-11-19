// QuizPlayer.jsx
// /quiz/:quizId: take one quiz. "starter" is the built-in one; any other id
// is a quiz saved to the logged-in user. Supports text and animated-sign
// questions and shows the score on submit.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import starterQuiz from "@/Misc/Features/Quiz/starterQuiz.json";
import { AnimatedSign } from "../Signs/Library/AnimatedSign.jsx";
import { scoreQuiz, shuffled, signsById } from "./quizEngine.js";
import { getMyQuiz } from "./quizModel.jsx";
import Credits from "../Signs/Library/Credits.jsx";

export default function QuizPlayer({ signs = [] }) {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(quizId === "starter" ? starterQuiz : null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0); // bumps on Retake to reshuffle

  useEffect(() => {
    if (quizId === "starter") return;
    getMyQuiz(quizId)
      .then(setQuiz)
      .catch(() => setError("Could not find that quiz."));
  }, [quizId]);

  const questions = useMemo(
    () => (quiz ? quiz.questions.map((q) => ({ ...q, options: shuffled(q.options) })) : []),
    // attempt is intentionally a dependency: Retake reshuffles the options
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quiz, attempt]
  );

  if (error) {
    return (
      <main>
        <p role="alert">{error}</p>
        <Link to="/quiz">Back to my quizzes</Link>
      </main>
    );
  }
  if (!quiz) return <p role="status">Loading quiz...</p>;

  // pixels for the sprite-based letters, looked up by Parse label (0 = A)
  const pixelsFor = (sign) => signs.find((s) => s.label === sign.spriteLabel)?.pixels;
  const signFor = (id, size = 150) => {
    const s = signsById[id];
    return s && <AnimatedSign sign={s} pixels={pixelsFor(s)} size={size} showCaption={false} />;
  };
  const choose = (q, value) => setAnswers({ ...answers, [q.id]: value });
  const answered = Object.keys(answers).length;

  return (
    <main className="quiz-player">
      <Link to="/quiz" className="back-link">&larr; All quizzes</Link>
      <h1>{quiz.title}</h1>
      <p className="muted">{quiz.questions.length} questions</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setResult(scoreQuiz(quiz.questions, answers));
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        {result && (
          <p className="score-banner" role="status">
            You scored {result.score} / {result.total}
          </p>
        )}

        {questions.map((q, n) => {
          const r = result?.results.find((x) => x.id === q.id);
          return (
            <fieldset key={q.id} className="quiz-options">
              <legend>Question {n + 1}</legend>
              <p className="question-text">{q.question}</p>
              {q.type === "sign-to-letter" && <div className="sign-prompt">{signFor(q.signId, 260)}</div>}

              {q.type === "letter-to-sign" ? (
                <div className="sign-choices">
                  {q.options.map((o) => (
                    <label
                      key={o.value}
                      className={`sign-choice ${answers[q.id] === o.value ? "selected" : ""} ${
                        result ? (o.value === q.correct_answer ? "correct" : answers[q.id] === o.value ? "wrong" : "") : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q${q.id}`}
                        value={o.value}
                        checked={answers[q.id] === o.value}
                        disabled={!!result}
                        onChange={() => choose(q, o.value)}
                      />
                      {signFor(o.signId)}
                    </label>
                  ))}
                </div>
              ) : (
                q.options.map((o) => (
                  <label
                    key={o.value}
                    className={`quiz-option ${answers[q.id] === o.value ? "selected" : ""} ${
                      result ? (o.value === q.correct_answer ? "correct" : answers[q.id] === o.value ? "wrong" : "") : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${q.id}`}
                      value={o.value}
                      checked={answers[q.id] === o.value}
                      disabled={!!result}
                      onChange={() => choose(q, o.value)}
                    />
                    <span>{o.text}</span>
                  </label>
                ))
              )}
              {result && (
                <p className={r?.correct ? "feedback ok" : "feedback bad"} role="status">
                  {r?.correct ? "Correct" : "Not quite"}
                </p>
              )}
            </fieldset>
          );
        })}

        <div className="quiz-actions">
          {!result ? (
            <button type="submit">Submit ({answered}/{quiz.questions.length} answered)</button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setResult(null);
                  setAttempt((a) => a + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Retake
              </button>
              <Link to="/quiz" className="btn btn-secondary">Back to my quizzes</Link>
            </>
          )}
        </div>
      </form>
      <Credits />
    </main>
  );
}
