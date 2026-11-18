// gemini.js
// Small adapter around the Gemini REST API. Swap this file to change LLM
// provider; main.js only calls generate(). The key comes from the
// GEMINI_API_KEY environment variable (Back4App: Server Settings > Environment
// Variables), never from the repo or the browser.
const BASE = "https://generativelanguage.googleapis.com/v1beta";
// Set GEMINI_MODEL in the environment to force a model. Otherwise we try this
// default and, if Google says it does not exist (404), ask Google which models
// this key can use and pick a current Flash model.
const DEFAULT_MODEL = "gemini-2.5-flash";
let chosenModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;

async function pickFlashModel(key) {
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!res.ok) throw new Error(`Gemini model list failed (${res.status})`);
  const { models = [] } = await res.json();
  const ok = models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /flash/.test(n) && !/lite|image|tts|live|audio|thinking|exp|latest/.test(n));
  // newest version number first, prefer stable over preview
  ok.sort((a, b) => {
    const v = (n) => parseFloat((n.match(/(\d+(\.\d+)?)/) || [0])[0]);
    return v(b) - v(a) || (/preview/.test(a) ? 1 : 0) - (/preview/.test(b) ? 1 : 0);
  });
  if (!ok.length) throw new Error("No usable Gemini Flash model is available for this key");
  return ok[0];
}

// Back4App sits behind a proxy that drops requests after ~30s, so give each
// Gemini call a hard limit and fail with a readable message instead.
const TIMEOUT_MS = 25000;

async function callModel(key, model, body) {
  let res;
  try {
    res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new Error(`Gemini (${model}) took too long to answer. Please try again in a moment.`, { cause: err });
    }
    throw err;
  }
  if (res.ok) return { res };
  let detail = "";
  try { detail = (await res.json()).error?.message || ""; } catch { /* ignore */ }
  return { status: res.status, detail };
}

const OPTION = {
  type: "OBJECT",
  properties: { value: { type: "STRING" }, text: { type: "STRING" }, signId: { type: "STRING" } },
  required: ["value"],
};
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    quiz: {
      type: "OBJECT",
      nullable: true,
      properties: {
        title: { type: "STRING" },
        questions: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "INTEGER" },
              type: { type: "STRING", enum: ["radio", "sign-to-letter", "letter-to-sign"] },
              category: { type: "STRING" },
              question: { type: "STRING" },
              signId: { type: "STRING" },
              options: { type: "ARRAY", items: OPTION },
              correct_answer: { type: "STRING" },
            },
            required: ["id", "type", "question", "options", "correct_answer"],
          },
        },
      },
      required: ["title", "questions"],
    },
  },
  required: ["reply"],
};

// messages: [{ role: "user" | "assistant", text }]
async function generate(systemPrompt, messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  // Newer Gemini models "think" before answering, which is slow and not needed
  // for quizzes. Turn thinking down: Gemini 3 uses thinkingLevel, 2.5 uses a
  // token budget. If a model rejects the setting we retry without it.
  const thinkingFor = (model) =>
    /gemini-3/.test(model) ? { thinkingLevel: "low" } : /gemini-2\.5/.test(model) ? { thinkingBudget: 0 } : null;
  const buildBody = (model, withThinking) => {
    const generationConfig = { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.7 };
    const thinking = withThinking && thinkingFor(model);
    if (thinking) generationConfig.thinkingConfig = thinking;
    return JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      generationConfig,
    });
  };

  const started = Date.now();
  let out = await callModel(key, chosenModel, buildBody(chosenModel, true));
  if (out.status === 404 && !process.env.GEMINI_MODEL) {
    chosenModel = await pickFlashModel(key);
    console.log("Gemini model not found, switched to", chosenModel);
    out = await callModel(key, chosenModel, buildBody(chosenModel, true));
  }
  if (out.status === 400 && /think/i.test(out.detail || "")) {
    console.log("Model rejected thinking settings, retrying without:", out.detail);
    out = await callModel(key, chosenModel, buildBody(chosenModel, false));
  }
  console.log(`Gemini ${chosenModel}: ${out.res ? "ok" : out.status} in ${Date.now() - started}ms`);
  if (!out.res) throw new Error(`Gemini request failed (${out.status}) using ${chosenModel}: ${out.detail}`.slice(0, 300));
  const res = out.res;
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text);
}

module.exports = { generate };
