import { Link } from "react-router-dom";
import library from "../Signs/Library/signLibrary.json";
import { useProgressSummary } from "./useProgressSummary.jsx";

// ProgressDashboard.jsx
// "Your progress" page: how many signs are learned, how the quizzes are going,
// a study streak, and which signs need practice. The numbers come from
// progressStats.js; this file only displays them. Only the logged-in user can
// read their own data (owner-only ACL), so wrap the route in RequireUser.

// colors are paired with text counts below, so meaning never depends on color alone
const LEVELS = [
  { key: "mastered", label: "Mastered", color: "#1b7f4c" },
  { key: "familiar", label: "Familiar", color: "#2e6fb7" },
  { key: "learning", label: "Learning", color: "#b86e00" },
  { key: "new", label: "Not quizzed yet", color: "#7a8497" },
];

const percent = (x) => (x === null ? "no data yet" : `${Math.round(x * 100)}%`);

export default function ProgressDashboard() {
  const { loading, error, summary: s } = useProgressSummary(library);

  if (loading) return <p role="status">Loading your progress...</p>;
  if (error) return <p role="alert">Could not load your progress: {error}</p>;
  if (!s) return null;

  const barLabel = LEVELS.map((l) => `${l.label} ${s.levels[l.key]}`).join(", ");
  const activeDays = s.last7.filter((d) => d.active).length;

  return (
    <section>
      <h2>Your progress</h2>

      {/* headline numbers */}
      <ul>
        <li>
          <strong>{s.learnedCount}</strong> of {s.totalSigns} signs marked learned
        </li>
        <li>
          <strong>{s.levels.mastered}</strong> mastered through quizzes
        </li>
        <li>
          Quiz accuracy: <strong>{percent(s.overallAccuracy)}</strong> across{" "}
          {s.attempts} answers in {s.quizzesTaken} quizzes
        </li>
        <li>
          Study streak: <strong>{s.streak}</strong> {s.streak === 1 ? "day" : "days"}
        </li>
      </ul>

      {/* how every sign breaks down by quiz evidence */}
      <h3>Where your signs stand</h3>
      <div
        role="img"
        aria-label={barLabel}
        style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden" }}
      >
        {LEVELS.map(
          (l) =>
            s.levels[l.key] > 0 && (
              <div key={l.key} style={{ flex: s.levels[l.key], background: l.color }} />
            )
        )}
      </div>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", listStyle: "none", padding: 0 }}>
        {LEVELS.map((l) => (
          <li key={l.key}>
            <span
              aria-hidden="true"
              style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: l.color, marginRight: 6 }}
            />
            {l.label}: {s.levels[l.key]}
          </li>
        ))}
      </ul>

      {/* the last 7 days */}
      <h3>Last 7 days</h3>
      <div
        role="img"
        aria-label={`Studied on ${activeDays} of the last 7 days`}
        style={{ display: "flex", gap: 6 }}
      >
        {s.last7.map((d) => (
          <span
            key={d.day}
            title={d.day}
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: "1px solid #7a8497",
              background: d.active ? "#1b7f4c" : "transparent",
              color: d.active ? "#fff" : "inherit",
            }}
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* practice suggestions */}
      <h3>Needs practice</h3>
      {s.weakest.length === 0 ? (
        <p>Nothing flagged yet. Take a quiz and the signs you miss will show up here.</p>
      ) : (
        <ul>
          {s.weakest.map((w) => (
            <li key={w.id}>
              {w.label}: {percent(w.accuracy)} correct over {w.seen}{" "}
              {w.seen === 1 ? "try" : "tries"}
            </li>
          ))}
        </ul>
      )}

      {s.claimedButWeak.length > 0 && (
        <>
          <h3>Marked learned, but quizzes say otherwise</h3>
          <p>
            You marked these as learned, yet you are still missing them. They are
            worth another look:{" "}
            {s.claimedButWeak.map((w) => w.label).join(", ")}.
          </p>
        </>
      )}

      {/* /quiz/practice is handled by QuizPlayer: it builds a quiz from the
          signs you miss most, then signs you have not been asked yet */}
      <p>
        <Link to="/quiz/practice">Practice these signs</Link>
        {" | "}
        <Link to="/quiz">Take a quiz</Link>
      </p>

      <details>
        <summary>How these levels work</summary>
        <p>
          Levels come from quiz answers only. Familiar means asked at least twice
          with 70% or more right. Mastered means asked at least four times, 85% or
          more right, and the last two right. Marking a sign "learned" is your own
          note and is tracked separately.
        </p>
      </details>
    </section>
  );
}