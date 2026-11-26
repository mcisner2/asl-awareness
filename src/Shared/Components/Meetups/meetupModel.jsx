import Parse from "parse";
import { makeRoomName, joinWindow } from "./jitsi.js";
import { hostLabel } from "./meetupRules.js";

// Parse model for meet-ups. All Parse calls for this feature live here, so
// components never talk to Parse directly.
//
// "Meetup" columns: title (String), description (String), startsAt (Date),
//   durationMin (Number), level (String), roomName (String),
//   host (Pointer to _User), hostName (String)
// "MeetupReport" columns: meetup (Pointer to Meetup), reporter (Pointer to _User),
//   reason (String)
const Meetup = Parse.Object.extend("Meetup");
const MeetupReport = Parse.Object.extend("MeetupReport");

function requireUser() {
  const user = Parse.User.current();
  if (!user) throw new Error("You must be logged in.");
  return user;
}

// one row as a plain object; status says whether the video link may show yet
function toPlain(row, now, myId) {
  const startsAt = row.get("startsAt");
  const durationMin = row.get("durationMin");
  return {
    id: row.id,
    title: row.get("title"),
    description: row.get("description") || "",
    startsAt,
    durationMin,
    level: row.get("level"),
    roomName: row.get("roomName"),
    hostName: row.get("hostName") || "A member",
    isMine: row.get("host")?.id === myId,
    status: joinWindow(startsAt, durationMin, now),
  };
}

// CREATE: schedule a meet-up. The room name is generated here, never typed.
// Everyone logged in can read it; only the host can change or delete it.
export async function createMeetup({ title, description, startsAt, durationMin, level }) {
  const user = requireUser();
  const meetup = new Meetup();
  meetup.set("title", title.trim());
  meetup.set("description", (description || "").trim());
  meetup.set("startsAt", startsAt);
  meetup.set("durationMin", durationMin);
  meetup.set("level", level);
  meetup.set("roomName", makeRoomName());
  meetup.set("host", user);
  meetup.set("hostName", hostLabel(user.get("firstName"), user.get("lastName")));

  const acl = new Parse.ACL();
  acl.setPublicReadAccess(true); // the class permissions keep logged-out visitors out
  acl.setWriteAccess(user, true); // only the host can edit or delete
  meetup.setACL(acl);

  await meetup.save();
  return toPlain(meetup, new Date(), user.id);
}

// READ: meet-ups that have not ended yet, soonest first
export async function listUpcomingMeetups() {
  const user = requireUser();
  const now = new Date();

  const query = new Parse.Query(Meetup);
  // the longest meet-up is 90 minutes, so anything older than 3 hours is over
  query.greaterThan("startsAt", new Date(now.getTime() - 3 * 60 * 60 * 1000));
  query.ascending("startsAt");
  query.limit(50);

  const rows = await query.find();
  return rows
    .map((row) => toPlain(row, now, user.id))
    .filter((m) => m.status !== "ended");
}

// DELETE: cancel one of your own meet-ups (the ACL refuses anyone else)
export async function deleteMyMeetup(id) {
  requireUser();
  const row = await new Parse.Query(Meetup).get(id);
  return row.destroy();
}

// CREATE: report a meet-up. The report has an empty ACL, so only an admin
// (through the Back4App dashboard) can read it, never other users.
export async function reportMeetup(meetupId, reason) {
  const user = requireUser();
  const report = new MeetupReport();
  report.set("meetup", Meetup.createWithoutData(meetupId));
  report.set("reporter", user);
  report.set("reason", (reason || "").slice(0, 300));
  report.setACL(new Parse.ACL());
  return report.save();
}

// TODO: enforce hostName and roomName on the server with a Cloud Code
// beforeSave trigger, so a modified browser cannot save someone else's name.