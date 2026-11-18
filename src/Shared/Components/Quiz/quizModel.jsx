import Parse from "parse";

// Parse model for the "Quiz" class. The "static" row holds the original
// quiz.json questions, in the same shape (id, type, question, options,
// correct_answer), so the quiz page doesn't care where they came from.
const Quiz = Parse.Object.extend("Quiz");

// READ: the built-in quiz, or null if it hasn't been seeded
export async function getStaticQuiz() {
  const query = new Parse.Query(Quiz);
  query.equalTo("source", "static");
  const row = await query.first();
  if (!row) return null;
  return {
    id: row.id,
    title: row.get("title"),
    questions: row.get("questions"),
  };
}

// ---- per-user quizzes (the dashboard list) ----
// Rows are private: only the owner can read, edit or delete them.

const shape = (row) => ({
  id: row.id,
  title: row.get("title"),
  questions: row.get("questions") || [],
  source: row.get("source") || "ai",
  createdAt: row.createdAt,
});

// READ: the logged-in user's saved quizzes, newest first
export async function listMyQuizzes() {
  const user = Parse.User.current();
  if (!user) return [];
  const query = new Parse.Query(Quiz);
  query.equalTo("owner", user);
  query.descending("createdAt");
  query.limit(100);
  return (await query.find()).map(shape);
}

// READ: one saved quiz by id (the ACL means only its owner can load it)
export async function getMyQuiz(id) {
  return shape(await new Parse.Query(Quiz).get(id));
}

// CREATE: save a generated quiz to the current user, private to them
export async function saveMyQuiz({ title, questions, source = "ai" }) {
  const user = Parse.User.current();
  if (!user) throw new Error("Log in to save quizzes");
  const row = new Quiz();
  row.set("owner", user);
  row.set("title", title);
  row.set("questions", questions);
  row.set("source", source);
  const acl = new Parse.ACL(user); // read + write for this user only
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  row.setACL(acl);
  return shape(await row.save());
}

// DELETE: remove one of the user's quizzes
export async function deleteMyQuiz(id) {
  const row = await new Parse.Query(Quiz).get(id);
  return row.destroy();
}
