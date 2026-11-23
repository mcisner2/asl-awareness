import { useEffect, useMemo, useState } from "react";
import { getMyProgress } from "./progressModel.jsx";
import { summarize } from "./progressStats.js";

// Hook for the progress dashboard: loads this user's saved progress once and
// turns it into the numbers the page shows. library = signLibrary.json.
// Returns { loading, error, progress, summary }.
export function useProgressSummary(library) {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyProgress()
      .then((p) => {
        if (!cancelled) setProgress(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // recalculated only when the saved data changes
  const summary = useMemo(
    () =>
      progress
        ? summarize({
            library,
            learned: progress.signsLearned,
            stats: progress.signStats,
            studyDays: progress.studyDays,
            quizzesTaken: progress.quizzesTaken,
          })
        : null,
    [progress, library]
  );

  return { loading, error, progress, summary };
}