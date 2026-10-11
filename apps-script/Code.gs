/**
 * PupLog — Google Apps Script backend
 *
 * Edit the CONFIG block below for your household. Everything else can stay as-is.
 * Secret keys are NOT stored here — run setup() once (see README) and they are
 * saved in Project Settings → Script Properties.
 */
const CONFIG = {
  PET_NAME: "Your pet",

  // Leave "" if this script was created from the Sheet (Extensions → Apps Script).
  // Otherwise paste the long ID from the Sheet's URL: docs.google.com/spreadsheets/d/<THIS PART>/edit
  SHEET_ID: "",
  SHEET_NAME: "PupLog",

  // Each family member and where their alerts go.
  // Text messages: use your carrier's email-to-text address, e.g. 5551234567@tmomail.net
  // Email: any normal address. Leave "" for someone who shouldn't get alerts.
  FAMILY: {
    "Name 1": "",
    "Name 2": "",
    "Name 3": "",
  },

  // The keys (food, water, ...) are saved in the Sheet and used in tag URLs —
  // don't rename them once you've written your tags. Labels and options are safe to change.
  // "{pet}" is replaced with PET_NAME.
  // trip: true = the first option means "leaving" and the second "coming back"; out + back counts as 1.
  ACTIONS: {
    food:     { label: "fed {pet}", emoji: "🍦", options: ["Breakfast", "Dinner", "Treat", "Other"] },
    water:    { label: "refilled {pet}'s water", emoji: "💧" },
    backyard: { label: "let {pet} out back", emoji: "🌿", options: ["Sent {pet} out", "Brought back in"], trip: true },
    walk:     { label: "walked {pet}", emoji: "🦮", options: ["Going on a walk", "Came back from a walk"], trip: true },
  },

  NOTIFY: {
    ON_LOG: true,         // text/email everyone when something is logged
    ON_NOTE: true,        // text/email everyone when someone adds a note
    SKIP_SENDER: false,   // true = don't alert the person who did the logging
  },

  // The public dashboard shows real counts for today with no names, notes, or exact times.
  // Set to false to make the dashboard private-only.
  PUBLIC_SUMMARY: true,

  // Optional: your dashboard address, shown as a link after logging. e.g. "https://puplog-yourname.vercel.app"
  DASHBOARD_URL: "",
};

const NOTE_ACTION = "note";
const MAX_LOG_DAYS = 14;
const MAX_ROWS_READ = 2000;

const BASE_STYLES = `
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, sans-serif;
      background: #f9f8f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 32px 24px;
      width: 100%;
      max-width: 320px;
      text-align: center;
    }
    .tag { font-size: 11px; letter-spacing: 0.08em; color: #bbb; margin-bottom: 16px; }
    .emoji { font-size: 52px; margin-bottom: 10px; }
    .title { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #aaa; margin-bottom: 28px; }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      color: #111;
    }
    .btn:last-child { margin-bottom: 0; }
    .btn-purple { background: #EEEDFE; color: #3C3489; }
    .btn-pink   { background: #FBEAF0; color: #72243E; }
    .btn-teal   { background: #E1F5EE; color: #085041; }
    .btn-stone  { background: #F1EFE8; color: #444441; }
    .link { display: block; margin-top: 18px; font-size: 13px; color: #888; }
  </style>
`;

// ---------- Routing ----------

function doGet(e) {
  try {
    const p = e.parameter;
    if (p.route === "summary") return json(buildSummary());
    if (p.route === "logs") {
      if (!keyMatches(p.key, "VIEW_KEY")) return json({ error: "unauthorized" });
      return json(buildLogs());
    }

    const auth = checkTagKey(p.k);
    if (!auth.ok) return page(buildMessagePage("🔒", "Link not recognized", "Ask your family for the current PupLog tag link."));

    const action = p.action;
    const actionInfo = getAction(action);
    if (!actionInfo) return page(buildMessagePage("🐾", "Unknown tag", "This tag isn't set up for PupLog."));

    const who = p.who;
    if (who !== undefined && !CONFIG.FAMILY.hasOwnProperty(who)) {
      return page(buildMessagePage("🐾", "Who's that?", "That name isn't in this household."));
    }
    const option = p.option;
    if (option !== undefined && option !== "" && actionInfo.options.indexOf(option) === -1) {
      return page(buildMessagePage("🐾", "Unknown choice", "Please tap the tag again."));
    }
    const ctx = { action, who, option, key: auth.key, baseUrl: ScriptApp.getService().getUrl() };

    if (p.note !== undefined) {
      const note = String(p.note).trim().slice(0, 500);
      if (who && note) {
        logToSheet(who, NOTE_ACTION, "", note);
        if (CONFIG.NOTIFY.ON_NOTE) notifyFamily(who, `💌 ${who} shared a note: ${note}`);
      }
      return page(buildSentPage());
    }

    if (who && option !== undefined) {
      recordAction(ctx);
      return page(buildConfirmPage(ctx));
    }
    if (who) {
      if (!actionInfo.options.length) {
        ctx.option = "";
        recordAction(ctx);
        return page(buildConfirmPage(ctx));
      }
      return page(buildOptionsPage(ctx));
    }
    return page(buildWhoPage(ctx));
  } catch (err) {
    return page(buildMessagePage("⚠️", "Something went wrong", err.message));
  }
}

function page(html) {
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- Keys ----------

function prop(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || "";
}

function keyMatches(given, propName) {
  const expected = prop(propName);
  if (!expected || !given || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// A correct key always works. No key works only while ALLOW_LEGACY_TAGS is "true"
// (lets old tags keep working while you rewrite them). A wrong key never works.
function checkTagKey(given) {
  if (given) return { ok: keyMatches(given, "TAG_KEY"), key: given };
  return { ok: prop("ALLOW_LEGACY_TAGS").toLowerCase() === "true", key: "" };
}

// ---------- Config helpers ----------

function fill(text) {
  return String(text).split("{pet}").join(CONFIG.PET_NAME);
}

function getAction(action) {
  if (!action || !CONFIG.ACTIONS.hasOwnProperty(action)) return null;
  const a = CONFIG.ACTIONS[action];
  return { label: fill(a.label), emoji: a.emoji, options: (a.options || []).map(fill), trip: !!a.trip };
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildUrl(ctx, extra) {
  const params = Object.assign({ action: ctx.action }, extra);
  if (ctx.key) params.k = ctx.key;
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
  return `${ctx.baseUrl}?${qs}`;
}

// ---------- Pages ----------

function buildWhoPage(ctx) {
  const actionInfo = getAction(ctx.action);
  const colors = ["btn-purple", "btn-pink", "btn-teal", "btn-stone"];
  const buttons = Object.keys(CONFIG.FAMILY).map((name, i) => {
    const url = buildUrl(ctx, { who: name });
    return `<a href="${esc(url)}" class="btn ${colors[i % colors.length]}" target="_top">${esc(name)}</a>`;
  }).join("");

  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
    <div class="card">
      <div class="tag">PUPLOG</div>
      <div class="emoji">${actionInfo.emoji}</div>
      <div class="title">${esc(actionInfo.label)}</div>
      <div class="subtitle">Who's logging?</div>
      ${buttons}
    </div>
  </body></html>`;
}

function buildOptionsPage(ctx) {
  const actionInfo = getAction(ctx.action);
  const buttons = actionInfo.options.map(opt => {
    const url = buildUrl(ctx, { who: ctx.who, option: opt });
    return `<a href="${esc(url)}" class="btn btn-stone" target="_top">${esc(opt)}</a>`;
  }).join("");

  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
    <div class="card">
      <div class="tag">PUPLOG · ${esc(ctx.who.toUpperCase())}</div>
      <div class="emoji">${actionInfo.emoji}</div>
      <div class="title">What specifically?</div>
      <div class="subtitle">Pick one</div>
      ${buttons}
    </div>
  </body></html>`;
}

function buildConfirmPage(ctx) {
  const actionInfo = getAction(ctx.action);
  const time = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "h:mm a");
  const noteUrlBase = buildUrl(ctx, { who: ctx.who, option: ctx.option, note: "" });
  const dashLink = CONFIG.DASHBOARD_URL
    ? `<a class="link" href="${esc(CONFIG.DASHBOARD_URL)}" target="_top">See today's log →</a>` : "";

  return `<!DOCTYPE html><html><head>${BASE_STYLES}
    <style>
      .check { width: 60px; height: 60px; border-radius: 50%; background: #E1F5EE;
               display: flex; align-items: center; justify-content: center;
               font-size: 26px; margin: 0 auto 16px; }
      .time { font-size: 12px; color: #bbb; margin-top: 6px; margin-bottom: 28px; }
      .divider { border: none; border-top: 1px solid #f0f0f0; margin: 4px 0 20px; }
      .note-label { font-size: 11px; letter-spacing: 0.06em; color: #bbb; margin-bottom: 10px; }
      .note-input {
        width: 100%; padding: 14px 16px; font-size: 15px;
        border: 1.5px solid #eee; border-radius: 14px;
        outline: none; font-family: -apple-system, sans-serif;
        color: #111; background: #fafafa; margin-bottom: 10px;
      }
      .note-input:focus { border-color: #ccc; background: white; }
      .btn-send { background: #111; color: white; }
    </style>
  </head><body>
    <div class="card">
      <div class="check">✓</div>
      <div class="title">Logged for ${esc(CONFIG.PET_NAME)}!</div>
      <div class="subtitle">${esc(ctx.who)} · ${esc(ctx.option || actionInfo.label)}</div>
      <div class="time">${time}</div>
      <hr class="divider">
      <div class="note-label">ADD A NOTE FOR THE FAMILY</div>
      <input class="note-input" type="text" id="note" maxlength="500" placeholder="e.g. ${esc(CONFIG.PET_NAME)} is scratching...">
      <a class="btn btn-send" onclick="sendNote()" style="cursor:pointer;">Send to family</a>
      ${dashLink}
    </div>
    <script>
    function sendNote() {
      const note = document.getElementById("note").value;
      if (!note.trim()) return;
      window.top.location.href = ${JSON.stringify(noteUrlBase)} + encodeURIComponent(note);
    }
    </script>
  </body></html>`;
}

function buildSentPage() {
  return buildMessagePage("💬", "Note sent!", "The family has been notified.");
}

function buildMessagePage(emoji, title, subtitle) {
  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
    <div class="card">
      <div style="font-size:40px; margin-bottom:16px;">${emoji}</div>
      <div class="title">${esc(title)}</div>
      <div class="subtitle" style="margin-bottom:0">${esc(subtitle)}</div>
    </div>
  </body></html>`;
}

// ---------- Sheet ----------

function getSheet() {
  const ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
}

// Columns: Date | Who | Action | Option | Note  (rows are only ever appended, never edited)
function logToSheet(who, action, option, note) {
  getSheet().appendRow([new Date(), who, action, option, note || ""]);
}

function recordAction(ctx) {
  const actionInfo = getAction(ctx.action);
  logToSheet(ctx.who, ctx.action, ctx.option, "");
  if (CONFIG.NOTIFY.ON_LOG) {
    const detail = ctx.option ? ` (${ctx.option})` : "";
    notifyFamily(ctx.who, `${ctx.who} ${actionInfo.label}${detail}`);
  }
}

// Reads recent rows. Skips a header row or anything without a real date in column A.
function readRecentRows(days) {
  const sheet = getSheet();
  const last = sheet.getLastRow();
  if (last < 1) return [];
  const first = Math.max(1, last - MAX_ROWS_READ + 1);
  const values = sheet.getRange(first, 1, last - first + 1, 5).getValues();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = [];
  for (let i = values.length - 1; i >= 0; i--) {
    const [date, who, action, option, note] = values[i];
    if (!(date instanceof Date)) continue;
    if (date.getTime() < cutoff) break;
    rows.push({ date, who: String(who), action: String(action), option: String(option || ""), note: String(note || "") });
  }
  return rows; // newest first
}

function actionList() {
  return Object.keys(CONFIG.ACTIONS).map(key => {
    const a = getAction(key);
    return { key, label: a.label, emoji: a.emoji };
  });
}

function todaysRows() {
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  return readRecentRows(1).filter(r => Utilities.formatDate(r.date, tz, "yyyy-MM-dd") === today);
}

// How many times an action happened. For trip actions, "out" followed by "back" is one trip;
// a lone "out" (still out) or a lone "back" (forgot to log leaving) also counts as one.
function countAction(key, rows) {
  const a = getAction(key);
  const mine = rows.filter(r => r.action === key).reverse(); // oldest first
  if (!a.trip || a.options.length < 2) return mine.length;
  let count = 0, open = false;
  mine.forEach(r => {
    if (r.option === a.options[0]) { count++; open = true; }
    else if (r.option === a.options[1]) { if (!open) count++; open = false; }
    else count++;
  });
  return count;
}

function actionsWithCounts() {
  const rows = todaysRows();
  return actionList().map(a => Object.assign(a, { today: countAction(a.key, rows) }));
}

// Private: full detail for the family dashboard.
function buildLogs() {
  const logs = readRecentRows(MAX_LOG_DAYS).map(r => {
    const a = getAction(r.action);
    return {
      date: r.date.toISOString(),
      who: r.who,
      action: r.action,
      option: r.option,
      note: r.note,
      label: a ? a.label : (r.action === NOTE_ACTION ? "left a note" : r.action),
      emoji: a ? a.emoji : (r.action === NOTE_ACTION ? "💌" : "🐾"),
    };
  });
  return { mode: "private", pet: CONFIG.PET_NAME, actions: actionsWithCounts(), logs };
}

// Public: today's counts only — no names, notes, options, or times.
function buildSummary() {
  if (!CONFIG.PUBLIC_SUMMARY) return { mode: "public", enabled: false };
  return { mode: "public", enabled: true, pet: CONFIG.PET_NAME, actions: actionsWithCounts() };
}

// ---------- Notifications ----------

function notifyFamily(sender, message) {
  Object.keys(CONFIG.FAMILY).forEach(name => {
    const to = CONFIG.FAMILY[name];
    if (!to) return;
    if (CONFIG.NOTIFY.SKIP_SENDER && name === sender) return;
    MailApp.sendEmail({ to, subject: "", body: message });
  });
}

// ---------- One-time setup (run from the Apps Script editor) ----------

/** Creates your secret keys. Safe to run again — it never replaces keys that already exist. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  ["TAG_KEY", "VIEW_KEY"].forEach(name => {
    if (!props.getProperty(name)) props.setProperty(name, Utilities.getUuid().replace(/-/g, "").slice(0, 16));
  });
  if (!props.getProperty("ALLOW_LEGACY_TAGS")) props.setProperty("ALLOW_LEGACY_TAGS", "false");
  getSheet();
  printLinks();
}

/** Logs the URL to write on each NFC tag, plus your private dashboard link. */
function printLinks() {
  const url = ScriptApp.getService().getUrl();
  const tagKey = prop("TAG_KEY");
  if (!tagKey) { Logger.log("Run setup() first."); return; }
  Logger.log("Web app URL: " + url + "\n(Check this ends in /exec and matches Deploy → Manage deployments.)\n");
  Object.keys(CONFIG.ACTIONS).forEach(key => {
    Logger.log(`${key} tag:\n${url}?action=${key}&k=${tagKey}\n`);
  });
  if (CONFIG.DASHBOARD_URL) {
    Logger.log(`Private dashboard (family only):\n${CONFIG.DASHBOARD_URL}/#key=${prop("VIEW_KEY")}`);
  } else {
    Logger.log(`Private dashboard key (add to your dashboard link as #key=...): ${prop("VIEW_KEY")}`);
  }
}
