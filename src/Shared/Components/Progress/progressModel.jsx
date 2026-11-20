import Parse from "parse";

// Parse model for the "Progress" class: ONE row per user, holding what
// they have learned (see PLAN.md, data model).
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
    row.setACL(new Parse.ACL(user)); // only this user can read or write it
    await row.save();
  }
  return row;
}

// READ: this user's progress as a plain object
export async function getMyProgress() {
  const row = await getOrCreateRow();
  return {
    id: row.id,
    signsLearned: row.get("signsLearned") || [],
    historyRead: row.get("historyRead") || [],
    quizzesTaken: row.get("quizzesTaken") || 0,
  };
}

// UPDATE: mark one sign learned or not learned. signId is whatever id
// signLibrary.json uses for that sign.
export async function setSignLearned(signId, learned) {
  const row = await getOrCreateRow();
  if (learned) row.addUnique("signsLearned", signId);
  else row.remove("signsLearned", signId);
  await row.save();
  return row.get("signsLearned");
}