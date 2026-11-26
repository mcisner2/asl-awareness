// meetupRules.js
// Pure rules for creating a meet-up. They run in the browser before saving, so
// the person gets a clear message, and they are easy to test.

export const LEVELS = [
  "Beginner practice",
  "Practice (any level)",
  "Conversation",
  "Culture discussion",
];
export const DURATIONS = [30, 45, 60, 90];

const MINUTE = 60000;
const DAY = 24 * 60 * MINUTE;
const LINK_PATTERN = /https?:\/\/|www\./i;

// Only a first name and last initial are shown ("Ana R."). The username is the
// email address, so it is never used here.
export function hostLabel(firstName, lastName) {
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  if (!first) return "A member";
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

// Returns a list of problems (an empty list means the meet-up is fine).
export function validateMeetup(
  { title, description, startsAt, durationMin, level },
  now = new Date()
) {
  const problems = [];
  const t = (title || "").trim();
  const d = description || "";

  if (t.length < 3 || t.length > 80) problems.push("Give the meet-up a title of 3 to 80 characters.");
  if (d.length > 300) problems.push("Keep the description under 300 characters.");
  // the video link is made for you, so links in the text are not needed
  if (LINK_PATTERN.test(t) || LINK_PATTERN.test(d)) {
    problems.push("Please leave links out. The video link is created for you.");
  }

  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) {
    problems.push("Choose a start date and time.");
  } else if (startsAt.getTime() < now.getTime() + 5 * MINUTE) {
    problems.push("Start at least 5 minutes from now.");
  } else if (startsAt.getTime() > now.getTime() + 60 * DAY) {
    problems.push("Meet-ups can be scheduled up to 60 days ahead.");
  }

  if (!DURATIONS.includes(durationMin)) problems.push("Choose a duration.");
  if (!LEVELS.includes(level)) problems.push("Choose a level.");
  return problems;
}