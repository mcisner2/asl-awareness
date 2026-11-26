// Run from the project root:  node --test src/Shared/Components/Meetups/
import test from "node:test";
import assert from "node:assert/strict";
import { makeRoomName, isValidRoomName, jitsiUrl, joinWindow } from "./jitsi.js";

test("makeRoomName makes a valid, random-looking room name", () => {
  const a = makeRoomName();
  const b = makeRoomName();
  assert.equal(isValidRoomName(a), true);
  assert.match(a, /^ASLAwareness-[0-9a-f]{24}$/);
  assert.notEqual(a, b);
});

test("jitsiUrl only links to meet.jit.si and rejects anything else", () => {
  const room = makeRoomName();
  assert.equal(jitsiUrl(room), `https://meet.jit.si/${room}`);
  assert.equal(jitsiUrl("ASLAwareness-../evil"), null);
  assert.equal(jitsiUrl("https://evil.example/x"), null);
  assert.equal(jitsiUrl("ASLAwareness-" + "g".repeat(24)), null); // not hex
  assert.equal(jitsiUrl(undefined), null);
  assert.equal(jitsiUrl(""), null);
});

test("joinWindow: hidden until 15 minutes before, open until the end, then ended", () => {
  const start = new Date(2026, 10, 20, 18, 0); // 6:00 pm local
  const at = (h, m) => new Date(2026, 10, 20, h, m);
  assert.equal(joinWindow(start, 60, at(17, 30)), "upcoming");
  assert.equal(joinWindow(start, 60, at(17, 44)), "upcoming");
  assert.equal(joinWindow(start, 60, at(17, 45)), "open"); // exactly 15 min early
  assert.equal(joinWindow(start, 60, at(18, 30)), "open");
  assert.equal(joinWindow(start, 60, at(19, 0)), "open"); // exactly the end
  assert.equal(joinWindow(start, 60, at(19, 1)), "ended");
});