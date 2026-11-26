import { useEffect, useState } from "react";
import {
  createMeetup,
  deleteMyMeetup,
  listUpcomingMeetups,
  reportMeetup,
} from "./meetupModel.jsx";
import { jitsiUrl } from "./jitsi.js";
import { DURATIONS, LEVELS, validateMeetup } from "./meetupRules.js";

// MeetupsPage.jsx
// /meetups: schedule a video meet-up and see the upcoming ones. For logged-in
// users only (the route is wrapped in RequireUser). The video link is made by
// the app and only shows from 15 minutes before the start.

const EMPTY = { title: "", description: "", startsAt: "", durationMin: 60, level: LEVELS[0] };
const when = (d) => d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function MeetupsPage() {
  const [meetups, setMeetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [values, setValues] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // load the list, and again whenever reloadKey changes
  useEffect(() => {
    let cancelled = false;
    listUpcomingMeetups()
      .then((rows) => {
        if (!cancelled) setMeetups(rows);
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
  }, [reloadKey]);

  // refresh every minute, so a "Join" link appears when its time comes
  useEffect(() => {
    const timer = setInterval(() => setReloadKey((k) => k + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const refresh = () => setReloadKey((k) => k + 1);
  const change = (field) => (e) => setValues({ ...values, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const draft = {
      ...values,
      startsAt: new Date(values.startsAt),
      durationMin: Number(values.durationMin),
    };
    const problems = validateMeetup(draft, new Date());
    if (problems.length) {
      setFormErrors(problems);
      return;
    }
    setSaving(true);
    setFormErrors([]);
    try {
      await createMeetup(draft);
      setValues(EMPTY);
      setNotice("Your meet-up is scheduled.");
      refresh();
    } catch (err) {
      setFormErrors([err.message]);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this meet-up?")) return;
    try {
      await deleteMyMeetup(id);
      setNotice("Meet-up cancelled.");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReport = async (id) => {
    const reason = window.prompt("What is wrong with this meet-up? (optional)");
    if (reason === null) return; // pressed Cancel
    try {
      await reportMeetup(id, reason);
      setNotice("Thanks. Your report was sent.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h2>Meet-ups</h2>
      <p>
        Practice ASL or talk about Deaf culture over a video call with other
        people on this site.
      </p>

      <details>
        <summary>Meet-up guidelines</summary>
        <ul>
          <li>Be respectful. Everyone is here to learn and practice.</li>
          <li>Do not share personal contact details or ask for them.</li>
          <li>
            The call runs on Jitsi Meet, a third-party service, and anyone with
            the link can join. Use the call's own controls if you need to remove
            someone, and leave if you feel uncomfortable.
          </li>
          <li>Use the Report button on a meet-up if something is wrong.</li>
          <li>
            Only a first name and last initial are shown. We cannot check who
            anyone is, so treat everyone as a stranger.
          </li>
        </ul>
      </details>

      <h3>Schedule a meet-up</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Title{" "}
            <input value={values.title} onChange={change("title")} maxLength={80} required />
          </label>
        </div>
        <div>
          <label>
            Description (optional){" "}
            <textarea value={values.description} onChange={change("description")} maxLength={300} rows={3} />
          </label>
        </div>
        <div>
          <label>
            Start{" "}
            <input type="datetime-local" value={values.startsAt} onChange={change("startsAt")} required />
          </label>
        </div>
        <div>
          <label>
            Length{" "}
            <select value={values.durationMin} onChange={change("durationMin")}>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label>
            Level{" "}
            <select value={values.level} onChange={change("level")}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>The video link is created for you, so you do not need to add one.</p>
        {formErrors.length > 0 && (
          <ul role="alert">
            {formErrors.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <button type="submit" disabled={saving}>
          {saving ? "Scheduling..." : "Schedule meet-up"}
        </button>
      </form>

      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}

      <h3>Upcoming</h3>
      {loading ? (
        <p role="status">Loading meet-ups...</p>
      ) : meetups.length === 0 ? (
        <p>No meet-ups scheduled yet. Be the first to schedule one.</p>
      ) : (
        meetups.map((m) => {
          const url = jitsiUrl(m.roomName); // null for anything the app did not make
          return (
            <article key={m.id} style={{ marginBottom: "16px" }}>
              <h4>{m.title}</h4>
              <p>
                {when(m.startsAt)} &middot; {m.durationMin} minutes &middot; {m.level}
                <br />
                Hosted by {m.hostName}
              </p>
              {m.description && <p>{m.description}</p>}

              {m.status === "open" && url ? (
                <p>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    Join the video call
                  </a>{" "}
                  (opens in a new tab)
                </p>
              ) : (
                <p>The video link appears 15 minutes before the start.</p>
              )}

              {m.isMine ? (
                <button type="button" onClick={() => handleCancel(m.id)}>
                  Cancel meet-up
                </button>
              ) : (
                <button type="button" onClick={() => handleReport(m.id)}>
                  Report
                </button>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}