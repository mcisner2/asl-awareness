import test from "node:test";
import assert from "node:assert/strict";
import { validateMeetup, hostLabel, LEVELS } from "./meetupRules.js";

const NOW = new Date(2026, 10, 20, 12, 0);
const inMinutes = (m) => new Date(NOW.getTime() + m * 60000);
const good = () => ({
  title: "Fingerspelling practice",
  description: "We will practice the alphabet together.",
  startsAt: inMinutes(120),
  durationMin: 60,
  level: LEVELS[0],
});

test("a normal meet-up has no problems", () => {
  assert.deepEqual(validateMeetup(good(), NOW), []);
});

test("title length is checked", () => {
  assert.equal(validateMeetup({ ...good(), title: "ab" }, NOW).length, 1);
  assert.equal(validateMeetup({ ...good(), title: "x".repeat(81) }, NOW).length, 1);
  assert.equal(validateMeetup({ ...good(), title: "   " }, NOW).length, 1);
});

test("description length is checked", () => {
  assert.equal(validateMeetup({ ...good(), description: "x".repeat(301) }, NOW).length, 1);
});

test("links in the title or description are rejected", () => {
  assert.equal(validateMeetup({ ...good(), description: "join at https://evil.example" }, NOW).length, 1);
  assert.equal(validateMeetup({ ...good(), title: "go to www.evil.example" }, NOW).length, 1);
  assert.equal(validateMeetup({ ...good(), description: "HTTP://UPPER.EXAMPLE" }, NOW).length, 1);
});

test("start time must be valid, at least 5 minutes ahead, and within 60 days", () => {
  assert.equal(validateMeetup({ ...good(), startsAt: new Date("") }, NOW).length, 1);
  assert.equal(validateMeetup({ ...good(), startsAt: "tomorrow" }, NOW).length, 1);
  assert.equal(validateMeetup({ ...good(), startsAt: inMinutes(2) }, NOW).length, 1);
  assert.equal(validateMeetup({ ...good(), startsAt: inMinutes(5) }, NOW).length, 0);
  assert.equal(validateMeetup({ ...good(), startsAt: inMinutes(61 * 24 * 60) }, NOW).length, 1);
});

test("duration and level must be from the lists", () => {
  assert.equal(validateMeetup({ ...good(), durationMin: 7 }, NOW).length, 1);
  assert.equal(validateMeetup({ ...good(), level: "Expert" }, NOW).length, 1);
});

test("several problems are all reported", () => {
  assert.equal(validateMeetup({ title: "", description: "", startsAt: null, durationMin: 1, level: "" }, NOW).length, 4);
});

test("hostLabel shows a first name and last initial, never the username", () => {
  assert.equal(hostLabel("Ana", "Rivera"), "Ana R.");
  assert.equal(hostLabel("  ana ", " rivera"), "ana R.");
  assert.equal(hostLabel("Ana", ""), "Ana");
  assert.equal(hostLabel("", "Rivera"), "A member");
  assert.equal(hostLabel(undefined, undefined), "A member");
});