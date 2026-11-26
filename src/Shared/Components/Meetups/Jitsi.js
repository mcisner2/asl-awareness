// jitsi.js
// Pure helpers (no Parse, no React) for the meet-up video link.
//
// The app makes the room name itself: hosts never type or paste a link, so a
// meet-up can only ever point at https://meet.jit.si/<random-room>. The room
// name is 96 random bits, so it cannot be guessed. Only logged-in users ever
// see the link, and only close to the start time (see joinWindow).
// Jitsi Meet is a third-party service: its own terms and privacy policy apply.

const ROOM_PREFIX = "ASLAwareness-";
const ROOM_PATTERN = /^ASLAwareness-[0-9a-f]{24}$/;

// e.g. "ASLAwareness-3f9c1a2b7d4e5f60a1b2c3d4"
export function makeRoomName(cryptoObj = globalThis.crypto) {
  const bytes = new Uint8Array(12);
  cryptoObj.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return ROOM_PREFIX + token;
}

export function isValidRoomName(name) {
  return typeof name === "string" && ROOM_PATTERN.test(name);
}

// null when the stored room name is not one this app could have made, so a
// tampered row can never become a link to somewhere else
export function jitsiUrl(roomName) {
  return isValidRoomName(roomName) ? `https://meet.jit.si/${roomName}` : null;
}

// "upcoming" (link still hidden), "open" (link shown), or "ended".
// The link opens earlyMin minutes before the start and closes at the end.
export function joinWindow(startsAt, durationMin, now = new Date(), earlyMin = 15) {
  const start = startsAt.getTime();
  const end = start + durationMin * 60000;
  const t = now.getTime();
  if (t < start - earlyMin * 60000) return "upcoming";
  if (t > end) return "ended";
  return "open";
}