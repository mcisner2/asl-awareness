import { useCallback, useEffect, useState } from "react";
import { checkUser } from "../Authentication/authService.jsx";
import { getMyProgress, setSignLearned } from "./progressModel.jsx";

// Learned signs are saved by the same id signLibrary.json uses ("sign-a",
// "sign-b", ...), so the signs page, the profile, and the quizzes all agree.
export const signIdForLetter = (letter) => `sign-${letter.toLowerCase()}`;

// Hook for any page that shows signs. It loads this user's learned signs and
// gives the page a toggle function. When nobody is logged in it does nothing.
// Returns { loggedIn, learned (a Set of sign ids), toggle(signId), error }.
export function useLearned() {
  const loggedIn = !!checkUser();
  const [learned, setLearned] = useState(() => new Set());
  const [error, setError] = useState("");

  // load the saved list once per login state
  useEffect(() => {
    if (!loggedIn) return undefined;
    let cancelled = false;
    getMyProgress()
      .then((p) => {
        if (!cancelled) setLearned(new Set(p.signsLearned));
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  // Flip one sign. The screen updates first so it feels instant, then the
  // change is saved; if saving fails, the screen change is undone.
  const toggle = useCallback(
    async (signId) => {
      const nowLearned = !learned.has(signId);
      const apply = (on) =>
        setLearned((prev) => {
          const next = new Set(prev);
          if (on) next.add(signId);
          else next.delete(signId);
          return next;
        });

      apply(nowLearned);
      try {
        await setSignLearned(signId, nowLearned);
        setError("");
      } catch (e) {
        apply(!nowLearned);
        setError(e.message);
      }
    },
    [learned]
  );

  return { loggedIn, learned, toggle, error };
}