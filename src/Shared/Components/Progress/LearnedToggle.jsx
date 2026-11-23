// LearnedToggle.jsx
// A small button for one sign: "Mark as learned" / "Learned". It only shows
// the state it is given; useLearned() does the loading and saving.
export function LearnedToggle({ signId, learned, onToggle }) {
  return (
    <button type="button" aria-pressed={learned} onClick={() => onToggle(signId)}>
      {learned ? "Learned" : "Mark as learned"}
    </button>
  );
}