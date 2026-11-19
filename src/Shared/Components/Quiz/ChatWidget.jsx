// ChatWidget.jsx
// AI quiz builder panel on the dashboard. Sends the conversation to the Cloud
// Code function `generateQuiz`; the validated quiz it returns goes to
// onQuiz(), which saves it and returns a message to show in the chat.
import { useState } from "react";
import Parse from "parse";

const IDEAS = [
  "5 questions on letters A-F with signs",
  "A quiz on ASL history",
  "Mix of signs and Deaf culture, 8 questions",
];

export default function ChatWidget({ onQuiz }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Tell me what kind of quiz you want and how many questions." },
  ]);

  const send = async (text) => {
    text = text.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply, quiz } = await Parse.Cloud.run("generateQuiz", {
        // the first message is just the greeting, not part of the conversation
        messages: next.slice(1).map((m) => ({ role: m.role, text: m.text })),
      });
      const note = quiz ? await onQuiz(quiz) : "";
      setMessages([...next, { role: "assistant", text: [reply, note].filter(Boolean).join(" ") }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", text: `Sorry: ${err.message}`, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="chat-panel" aria-label="Build a quiz with AI">
      <h2>Build a quiz with AI</h2>
      <div className="chat-log" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role} ${m.error ? "error" : ""}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="chat-msg assistant">Building your quiz...</div>}
      </div>

      {messages.length === 1 && (
        <div className="chat-ideas">
          {IDEAS.map((idea) => (
            <button key={idea} type="button" className="chip" onClick={() => send(idea)}>
              {idea}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="visually-hidden">Message</label>
        <input
          id="chat-input"
          type="text"
          value={input}
          placeholder="Describe your quiz..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </section>
  );
}
