// QuizDashboard.jsx
// /quiz: the user's quiz dashboard. Lists the starter quiz plus every quiz
// they have saved; the AI builder sits beside the list, and each quiz it
// creates is saved to the account and added to the list.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import starterQuiz from "@/Misc/Features/Quiz/starterQuiz.json";
import { deleteMyQuiz, listMyQuizzes, saveMyQuiz } from "./quizModel.jsx";
import ChatWidget from "./ChatWidget.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import Credits from "../Signs/Library/Credits.jsx";

// short summary line for a card, e.g. "7 questions · 4 with signs"
function summary(questions) {
  const withSigns = questions.filter((q) => q.type !== "radio").length;
  return withSigns
    ? `${questions.length} questions · ${withSigns} with signs`
    : `${questions.length} questions`;
}

function QuizCard({ to, title, questions, badge, date, isNew, onDelete }) {
  return (
    <li className={`quiz-card ${isNew ? "is-new" : ""}`}>
      <Link to={to} className="quiz-card-link">
        <span className="badge">{badge}</span>
        <h3>{title}</h3>
        <p className="muted">
          {summary(questions)}
          {date ? ` · ${date}` : ""}
        </p>
        <span className="quiz-card-cta">Take quiz &rarr;</span>
      </Link>
      {onDelete && (
        <button type="button" className="btn-link-danger" onClick={onDelete} aria-label={`Delete ${title}`}>
          Delete
        </button>
      )}
    </li>
  );
}

export default function QuizDashboard() {
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newId, setNewId] = useState(null);
  const [toDelete, setToDelete] = useState(null); // quiz waiting for confirmation
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listMyQuizzes()
      .then(setMine)
      .catch(() => setError("Could not load your saved quizzes."))
      .finally(() => setLoading(false));
  }, []);

  // Called by the chat panel with a validated quiz. Returns a message the
  // chat shows back to the user.
  const handleNewQuiz = async (quiz) => {
    try {
      const saved = await saveMyQuiz(quiz);
      setMine((list) => [saved, ...list]);
      setNewId(saved.id);
      return `Saved "${saved.title}" to your quizzes.`;
    } catch (err) {
      return `I built the quiz but could not save it: ${err.message}`;
    }
  };

  // runs after the user confirms in the pop-up
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyQuiz(toDelete.id);
      setMine((list) => list.filter((q) => q.id !== toDelete.id));
    } catch {
      setError("Could not delete that quiz.");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <main className="dashboard">
      <header className="page-header">
        <h1>My Quizzes</h1>
        <p className="muted">Pick a quiz to take, or ask the AI to build a new one.</p>
      </header>

      <div className="dashboard-grid">
        <section aria-labelledby="quiz-list-heading">
          <h2 id="quiz-list-heading">Your quizzes</h2>
          {error && <p role="alert">{error}</p>}
          <ul className="quiz-list">
            <QuizCard to="/quiz/starter" title={starterQuiz.title} questions={starterQuiz.questions} badge="Starter" />
            {mine.map((q) => (
              <QuizCard
                key={q.id}
                to={`/quiz/${q.id}`}
                title={q.title}
                questions={q.questions}
                badge="AI"
                date={q.createdAt?.toLocaleDateString()}
                isNew={q.id === newId}
                onDelete={() => setToDelete(q)}
              />
            ))}
          </ul>
          {loading && <p role="status">Loading your quizzes...</p>}
          {!loading && mine.length === 0 && (
            <p className="muted">Quizzes you build with the AI will show up here.</p>
          )}
        </section>

        <aside aria-label="AI quiz builder">
          <ChatWidget onQuiz={handleNewQuiz} />
        </aside>
      </div>
      <Credits />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this quiz?"
        message={toDelete ? `"${toDelete.title}" will be permanently removed from your quizzes.` : ""}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </main>
  );
}
