import Parse from "parse";
import { dayKey, recordAnswers } from "./progressStats.js";

// Parse model for the "Progress" class: ONE row per user holding what they
// have learned and how their quizzes have gone (see PLAN.md, data model).
// All Parse calls for progress live here, so components never talk to Parse.
//
// Columns: user (Pointer to _User), signsLearned (Array), historyRead (Array),
// quizzesTaken (Number), signStats (Object), studyDays (Array)
const Progress = Parse.Object.extend("Progress");

// Finds this user's row, or creates it with an owner-only ACL.
async function getOrCreateRow() {
  const user = Parse.User.current();
  if (!user) throw new Error("You must be logged in to track progress.");

  const query = new Parse.Query(Progress);
  query.equalTo("user", user);
  let row = await query.first();

  if (!row) {
    row = new Progress();
    row.set("user", user);
    row.set("signsLearned", []);
    row.set("historyRead", []);
    row.set("quizzesTaken", 0);
    row.set("signStats", {});
    row.set("studyDays", []);

    // only this user can read or write their progress
    const acl = new Parse.ACL(user);
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    row.setACL(acl);

    await row.save();
  }
  return row;
}

// READ: this user's progress as a plain object. Older rows made before the
// analytics columns existed simply come back with empty values.
export async function getMyProgress() {
  const row = await getOrCreateRow();
  return {
    id: row.id,
    signsLearned: row.get("signsLearned") || [],
    historyRead: row.get("historyRead") || [],
    quizzesTaken: row.get("quizzesTaken") || 0,
    signStats: row.get("signStats") || {},
    studyDays: row.get("studyDays") || [],
  };
}

// UPDATE: mark one sign learned or not learned. signId is the id signLibrary.json
// uses ("sign-a"). addUnique never adds a duplicate. Marking a sign also counts
// as a study day.
export async function setSignLearned(signId, learned) {
  const row = await getOrCreateRow();
  if (learned) {
    row.addUnique("signsLearned", signId);
  } else {
    row.remove("signsLearned", signId);
  }
  row.addUnique("studyDays", dayKey());
  await row.save();
  return row.get("signsLearned");
}

// UPDATE: save the results of ONE finished quiz.
// results = [{ signId, correct }]. Call it once per quiz, when it ends.
export async function recordQuizResults(results) {
  const row = await getOrCreateRow();
  const stats = recordAnswers(row.get("signStats") || {}, results);
  row.set("signStats", stats);
  row.set("quizzesTaken", (row.get("quizzesTaken") || 0) + 1);
  row.addUnique("studyDays", dayKey());
  await row.save();
  return stats;
}

// TODO: add markHistoryRead(id) so reading the timeline counts toward progress.