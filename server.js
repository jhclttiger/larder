"use strict";
/**
 * Larder — a family recipe box, meal planner, and grocery list.
 * Self-hosted: one Node process, one JSON file for storage, no accounts.
 *
 * Data persistence: everything lives in DATA_DIR/data.json. Writes are
 * atomic (write to a temp file, then rename) so a crash mid-write can't
 * corrupt the store. Make sure DATA_DIR points at a volume that survives
 * restarts/redeploys on whatever host you use (see README.md).
 *
 * Realtime sync: a simple Server-Sent-Events hub. Any client that changes
 * data causes the server to broadcast "changed" to every connected client,
 * which then re-fetches /api/state. No websockets, no extra dependency.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");

/* ---------------------------- configuration ---------------------------- */
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "data.json");
const SECRET_FILE = path.join(DATA_DIR, ".session-secret");
const HOUSEHOLD_PASSCODE = process.env.HOUSEHOLD_PASSCODE || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadOrCreateSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try {
    return fs.readFileSync(SECRET_FILE, "utf8").trim();
  } catch (e) {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  }
}
const SESSION_SECRET = loadOrCreateSecret();

/* ------------------------------ data store ------------------------------ */
const EMPTY_STATE = { recipes: {}, users: {}, mealplans: {}, grocery: {} };

function loadState() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Object.assign({}, EMPTY_STATE, parsed);
  } catch (e) {
    return JSON.parse(JSON.stringify(EMPTY_STATE));
  }
}
let state = loadState();
(function logStartupDataCheck() {
  const recipeCount = Object.keys(state.recipes || {}).length;
  const fileExisted = fs.existsSync(DATA_FILE);
  console.log(
    "Startup data check — DATA_DIR=" + DATA_DIR + ", data file " +
    (fileExisted ? "found" : "NOT found (starting empty)") +
    ", " + recipeCount + " recipe" + (recipeCount === 1 ? "" : "s") + " loaded." +
    (recipeCount === 0
      ? " If you expected existing recipes here, DATA_DIR is probably not pointing at your persistent volume — check that the volume's Mount Path matches DATA_DIR exactly."
      : "")
  );
})();
let saveQueued = false;
let saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(function () {
    saveTimer = null;
    const tmp = DATA_FILE + ".tmp" + process.pid;
    try {
      fs.writeFileSync(tmp, JSON.stringify(state), "utf8");
      fs.renameSync(tmp, DATA_FILE);
    } catch (e) {
      console.error("Failed to persist data.json:", e.message);
    }
  }, 150); // small debounce so a burst of edits writes once
}

function uid() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString("hex");
}

/* --------------------------------- SSE ---------------------------------- */
const sseClients = new Set();
function broadcastChanged() {
  for (const res of sseClients) {
    try { res.write("event: changed\ndata: {}\n\n"); } catch (e) { /* ignore */ }
  }
}

/* --------------------------------- app ----------------------------------- */
const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());

function expectedToken() {
  return crypto.createHmac("sha256", SESSION_SECRET).update(HOUSEHOLD_PASSCODE).digest("hex");
}
function requireAuth(req, res, next) {
  if (!HOUSEHOLD_PASSCODE) return next(); // no passcode configured -> open access
  const token = req.cookies && req.cookies.larder_session;
  if (token && token === expectedToken()) return next();
  return res.status(401).json({ error: "unauthorized" });
}
function cookieOpts(req) {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  return { httpOnly: true, sameSite: "lax", secure: isHttps, maxAge: 1000 * 60 * 60 * 24 * 180 };
}

app.post("/api/login", function (req, res) {
  if (!HOUSEHOLD_PASSCODE) return res.json({ ok: true, required: false });
  const given = String((req.body && req.body.passcode) || "");
  if (given !== HOUSEHOLD_PASSCODE) return res.status(401).json({ error: "wrong passcode" });
  res.cookie("larder_session", expectedToken(), cookieOpts(req));
  res.json({ ok: true });
});
app.post("/api/logout", function (req, res) {
  res.clearCookie("larder_session");
  res.json({ ok: true });
});
app.get("/api/config", function (req, res) {
  const authed = !HOUSEHOLD_PASSCODE || (req.cookies && req.cookies.larder_session === expectedToken());
  res.json({ passcodeRequired: !!HOUSEHOLD_PASSCODE, authed: authed, aiEnabled: !!ANTHROPIC_API_KEY });
});

app.use("/api", function (req, res, next) {
  if (req.path === "/login" || req.path === "/logout" || req.path === "/config") return next();
  return requireAuth(req, res, next);
});

/* ---- live updates ---- */
app.get("/api/events", requireAuth, function (req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("retry: 3000\n\n");
  sseClients.add(res);
  const ping = setInterval(function () { try { res.write(": ping\n\n"); } catch (e) {} }, 25000);
  req.on("close", function () { clearInterval(ping); sseClients.delete(res); });
});

/* ---- full state ---- */
app.get("/api/state", function (req, res) {
  res.json(state);
});

/* ---- recipes ---- */
app.post("/api/recipes", function (req, res) {
  const id = uid();
  const now = Date.now();
  const recipe = Object.assign({}, req.body, { id: id, createdAt: now, updatedAt: now, ratings: (req.body && req.body.ratings) || {} });
  state.recipes[id] = recipe;
  persist(); broadcastChanged();
  res.json(recipe);
});
app.put("/api/recipes/:id", function (req, res) {
  const existing = state.recipes[req.params.id];
  if (!existing) return res.status(404).json({ error: "not found" });
  const updated = Object.assign({}, existing, req.body, { id: existing.id, updatedAt: Date.now() });
  state.recipes[req.params.id] = updated;
  persist(); broadcastChanged();
  res.json(updated);
});
app.delete("/api/recipes/:id", function (req, res) {
  delete state.recipes[req.params.id];
  persist(); broadcastChanged();
  res.json({ ok: true });
});

/* ---- users / taste profiles ---- */
app.post("/api/users", function (req, res) {
  const id = uid();
  const user = Object.assign({}, req.body, { id: id, createdAt: Date.now() });
  state.users[id] = user;
  persist(); broadcastChanged();
  res.json(user);
});
app.put("/api/users/:id", function (req, res) {
  const existing = state.users[req.params.id];
  if (!existing) return res.status(404).json({ error: "not found" });
  const updated = Object.assign({}, existing, req.body, { id: existing.id });
  state.users[req.params.id] = updated;
  persist(); broadcastChanged();
  res.json(updated);
});
app.delete("/api/users/:id", function (req, res) {
  delete state.users[req.params.id];
  persist(); broadcastChanged();
  res.json({ ok: true });
});

/* ---- meal plan ---- */
function ensureWeek(collection, week, seed) {
  if (!collection[week]) collection[week] = seed;
  return collection[week];
}
app.put("/api/mealplan/:week/:slotKey", function (req, res) {
  const wk = ensureWeek(state.mealplans, req.params.week, { slots: {} });
  wk.slots[req.params.slotKey] = req.body && req.body.value != null ? req.body.value : null;
  persist(); broadcastChanged();
  res.json({ ok: true });
});

/* ---- grocery ---- */
app.put("/api/grocery/:week/checked/:itemKey", function (req, res) {
  const wk = ensureWeek(state.grocery, req.params.week, { checked: {}, extraItems: [] });
  wk.checked[req.params.itemKey] = !wk.checked[req.params.itemKey];
  persist(); broadcastChanged();
  res.json({ ok: true, checked: wk.checked[req.params.itemKey] });
});
app.put("/api/grocery/:week/extras", function (req, res) {
  const wk = ensureWeek(state.grocery, req.params.week, { checked: {}, extraItems: [] });
  wk.extraItems = Array.isArray(req.body) ? req.body : [];
  persist(); broadcastChanged();
  res.json({ ok: true });
});
app.post("/api/grocery/:week/clear-checked", function (req, res) {
  const wk = ensureWeek(state.grocery, req.params.week, { checked: {}, extraItems: [] });
  wk.checked = {};
  persist(); broadcastChanged();
  res.json({ ok: true });
});

/* ---------------------------- AI proxy (optional) ------------------------ */
/* Only active when ANTHROPIC_API_KEY is set on the server. Every family
   member's import/photo requests are billed to THIS key — no Claude account
   needed on their end. Get a key at https://console.anthropic.com */
const RECIPE_SHAPE_NOTE =
  'Reply with ONLY a JSON object, no other text, in exactly this shape: {"title": string, "cuisine": string, ' +
  '"tags": string[] (up to 6, lowercase), "prepTime": number (minutes), "cookTime": number (minutes), "servings": number, ' +
  '"ingredients": [{"qty": number|null, "unit": string, "name": string, "department": one of ' +
  '["Produce","Meat & Seafood","Dairy & Eggs","Bakery","Pantry & Dry Goods","Canned & Jarred","Frozen","Spices & Condiments","Beverages","Other"]}], ' +
  '"steps": string[], "notes": string}';

async function callAnthropic(messages) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 2000, messages: messages }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(function () { return ""; });
    throw new Error("Anthropic API error " + resp.status + ": " + text.slice(0, 300));
  }
  const data = await resp.json();
  const text = (data.content || []).map(function (b) { return b.text || ""; }).join("");
  return text;
}
function extractJson(text) {
  try { return JSON.parse(text); } catch (e) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { try { return JSON.parse(fence[1]); } catch (e) {} }
  const first = text.search(/[\{\[]/);
  const lastCurly = text.lastIndexOf("}");
  const lastSquare = text.lastIndexOf("]");
  const last = Math.max(lastCurly, lastSquare);
  if (first !== -1 && last !== -1 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch (e) {}
  }
  throw new Error("Claude's reply wasn't valid JSON");
}

app.post("/api/ai/import", async function (req, res) {
  if (!ANTHROPIC_API_KEY) return res.status(501).json({ error: "AI import isn't configured on this server." });
  const text = String((req.body && req.body.text) || "").slice(0, 12000);
  const url = String((req.body && req.body.url) || "");
  if (!text.trim()) return res.status(400).json({ error: "Paste some recipe text first." });
  const prompt =
    "You are extracting a home-cooking recipe from raw text a user pasted (a blog post, a website's text, or a social caption/transcript). " +
    "Reconstruct a clean, standard-format recipe from it.\n\n" + RECIPE_SHAPE_NOTE + "\n\n" +
    "If the text is casual or vague, use your knowledge of the dish to fill in reasonable amounts/technique and say what you inferred in \"notes\". " +
    "If it isn't a recipe at all, still produce your best-guess recipe for the dish described, and say so in \"notes\".\n\n" +
    "Reference URL (context only, may be blank): " + (url || "(none)") + "\n\nPasted content:\n\"\"\"\n" + text + "\n\"\"\"";
  try {
    const reply = await callAnthropic([{ role: "user", content: prompt }]);
    res.json(extractJson(reply));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/ai/snap", async function (req, res) {
  if (!ANTHROPIC_API_KEY) return res.status(501).json({ error: "AI photo recognition isn't configured on this server." });
  const imageBase64 = req.body && req.body.imageBase64;
  const mediaType = (req.body && req.body.mediaType) || "image/jpeg";
  const hint = String((req.body && req.body.hint) || "");
  if (!imageBase64) return res.status(400).json({ error: "No photo received." });
  const prompt =
    "You are looking at a photo of a restaurant dish. Reverse-engineer a homemade recipe that would let a home cook recreate it: identify the " +
    "likely dish and cuisine, then propose realistic ingredients (sensible home portions) and clear steps.\n" +
    (hint ? 'The cook says: "' + hint + '"\n' : "") + "\n" + RECIPE_SHAPE_NOTE +
    '\n\nAlways fill "notes" with a short line noting this recipe was recreated from a photo and is an educated guess to adjust to taste.';
  try {
    const reply = await callAnthropic([
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ]);
    res.json(extractJson(reply));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

/* ------------------------------ static files ----------------------------- */
app.use(express.static(path.join(__dirname, "public")));
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, function () {
  console.log("Larder listening on port " + PORT);
  console.log("Data file: " + DATA_FILE);
  console.log("Household passcode: " + (HOUSEHOLD_PASSCODE ? "enabled" : "disabled (open access)"));
  console.log("AI import/snap: " + (ANTHROPIC_API_KEY ? "enabled" : "disabled (no ANTHROPIC_API_KEY set)"));
});
