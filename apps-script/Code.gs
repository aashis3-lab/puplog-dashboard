/**
 * PupLog — Google Apps Script backend.
 *
 * You shouldn't need to edit this file: settings live in Config.gs.
 * Secret keys live in Project Settings → Script Properties (run setup() once — see README).
 * To update PupLog, replace this file and publish with Deploy → Manage deployments → Edit → New version.
 */

const NOTE_ACTION = "note";
const CACHE_KEY = "puplog-dashboard-v2";
const CACHE_SECONDS = 300;
const TREND_DAYS = 120;
const HEATMAP_DAYS = 91;
const USUAL_TIME_DAYS = 14;
const HISTORY_LIMIT = 15;
const LOG_ROUTE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const GROUPS = { daily: "Daily care", health: "Health", grooming: "Grooming", supplies: "Supplies" };

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
      padding: 24px 16px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 32px 24px;
      width: 100%;
      max-width: 320px;
      text-align: center;
    }
    .card.wide { max-width: 420px; }
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
      font-family: inherit;
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
    .btn-send   { background: #111; color: white; }
    .link { display: block; margin-top: 18px; font-size: 13px; color: #888; }
    .field { margin-bottom: 18px; text-align: left; }
    .field-label { display: block; font-size: 11px; letter-spacing: 0.06em; color: #999; margin-bottom: 8px; text-transform: uppercase; }
    .hint { font-size: 12px; color: #aaa; margin-top: 6px; }
    .input {
      width: 100%; padding: 14px 16px; font-size: 16px; font-family: inherit;
      border: 1.5px solid #eee; border-radius: 14px; background: #fafafa; color: #111;
    }
    .input:focus { outline: none; border-color: #bbb; background: white; }
    textarea.input { min-height: 84px; resize: vertical; }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { position: relative; }
    .pill input { position: absolute; opacity: 0; width: 1px; height: 1px; }
    .pill span {
      display: inline-block; padding: 10px 14px; border-radius: 999px; font-size: 15px;
      background: #F1EFE8; color: #444441; cursor: pointer; border: 1.5px solid transparent;
    }
    .pill input:checked + span { background: #111; color: white; }
    .pill input:focus-visible + span { border-color: #3C3489; }
    .group-label { font-size: 11px; letter-spacing: 0.08em; color: #bbb; margin: 6px 0 10px; text-align: left; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
    .grid .btn { margin: 0; padding: 14px 8px; font-size: 14px; }
  </style>
`;

// ---------- Routing ----------

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.route === "dashboard") {
      if (!publicDashboard() && !keyMatches(p.key, "VIEW_KEY")) return json({ error: "unauthorized" });
      return json(getDashboard());
    }
    if (p.route === "logs") {
      if (!keyMatches(p.key, "VIEW_KEY")) return json({ error: "unauthorized" });
      return json(buildLogs());
    }

    const auth = checkTagKey(p.k);
    const quick = p.page === "quick";
    if (!auth.ok || (quick && !auth.key)) {
      return page(buildMessagePage("🔒", "Link not recognized", "Ask your family for the current PupLog link."));
    }
    const ctx = { action: p.action, who: p.who, key: auth.key, quick, baseUrl: ScriptApp.getService().getUrl() };
    if (quick && !p.action) return page(buildQuickHome(ctx));

    const actionInfo = getAction(p.action);
    if (!actionInfo) return page(buildMessagePage("🐾", "Unknown tag", "This tag isn't set up for PupLog."));
    if (p.who !== undefined && !CONFIG.FAMILY.hasOwnProperty(p.who)) {
      return page(buildMessagePage("🐾", "Who's that?", "That name isn't in this household."));
    }

    // Note added after logging from a tag (saved as its own row)
    if (p.note !== undefined && p.log === undefined) {
      const note = String(p.note).trim().slice(0, 500);
      if (p.who && note) {
        logToSheet([new Date(), p.who, NOTE_ACTION, "", note, "", ""]);
        if (CONFIG.NOTIFY.ON_NOTE) notifyFamily(p.who, `💌 ${p.who} shared a note: ${note}`);
      }
      return page(buildMessagePage("💬", "Note sent!", "The family has been notified."));
    }

    if (p.log === "1" || (p.who && p.option !== undefined)) {
      if (!p.who) return page(buildMessagePage("🐾", "Who's logging?", "Go back and pick your name."));
      const v = validateEntry(actionInfo, p);
      if (!v.ok) return page(buildMessagePage("🐾", "Almost", v.error));
      recordEntry(ctx, v.entry);
      return page(buildConfirmPage(ctx, v.entry));
    }

    if (quick) return page(buildQuickForm(ctx));
    if (p.who) {
      if (!actionInfo.options.length && !actionInfo.amount && !actionInfo.due) {
        const entry = { option: "", amount: "", due: null, note: "", at: null };
        recordEntry(ctx, entry);
        return page(buildConfirmPage(ctx, entry));
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

function petName() {
  return (CONFIG.PET && CONFIG.PET.NAME) || CONFIG.PET_NAME || "your pet";
}

function publicDashboard() {
  if (CONFIG.PUBLIC_DASHBOARD !== undefined) return !!CONFIG.PUBLIC_DASHBOARD;
  return CONFIG.PUBLIC_SUMMARY !== false;
}

function fill(text) {
  return String(text).split("{pet}").join(petName());
}

let ACTION_MEMO = null;

function getAction(key) {
  if (!ACTION_MEMO) {
    ACTION_MEMO = {};
    Object.keys(CONFIG.ACTIONS).forEach(k => {
      const a = CONFIG.ACTIONS[k];
      const opts = (a.options || []).map(o => typeof o === "string"
        ? { name: fill(o) }
        : Object.assign({}, o, { name: fill(o.name) }));
      ACTION_MEMO[k] = {
        key: k,
        name: a.name || k.charAt(0).toUpperCase() + k.slice(1),
        label: fill(a.label || k),
        emoji: a.emoji || "🐾",
        group: GROUPS[a.group] ? a.group : "daily",
        goal: Number(a.goal) || 0,
        trip: !!a.trip,
        usualTime: !!a.usualTime,
        backdate: !!a.backdate,
        notify: a.notify !== false,
        amount: a.amount || null,
        due: a.due || "",
        notePrompt: a.notePrompt ? fill(a.notePrompt) : "",
        options: opts.map(o => o.name),
        optionInfo: opts,
      };
    });
  }
  return key && ACTION_MEMO.hasOwnProperty(key) ? ACTION_MEMO[key] : null;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildUrl(ctx, params) {
  const all = Object.assign({}, params);
  if (ctx.key) all.k = ctx.key;
  const qs = Object.keys(all).map(k => `${k}=${encodeURIComponent(all[k])}`).join("&");
  return `${ctx.baseUrl}?${qs}`;
}

function hiddenInputs(ctx, fields) {
  const all = Object.assign({}, fields);
  if (ctx.key) all.k = ctx.key;
  return Object.keys(all).map(k => `<input type="hidden" name="${esc(k)}" value="${esc(all[k])}">`).join("");
}

function iso(t) {
  return new Date(t).toISOString();
}

function amountText(a, amount) {
  if (amount === "" || amount == null) return "";
  const unit = a && a.amount && a.amount.unit ? ` ${a.amount.unit}` : "";
  return `${amount}${unit}`;
}

function describe(a, entry) {
  const tz = Session.getScriptTimeZone();
  const due = entry.due ? `next due ${Utilities.formatDate(entry.due, tz, "MMM d, yyyy")}` : "";
  const on = entry.at ? `on ${Utilities.formatDate(entry.at, tz, "MMM d, yyyy")}` : "";
  return [entry.option, amountText(a, entry.amount), due, on].filter(Boolean).join(" · ");
}

// "yyyy-mm-dd" → Date at noon (script time zone), or null if it isn't a real calendar date.
function parseDay(raw) {
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return isNaN(d) || d.getMonth() !== Number(m[2]) - 1 ? null : d;
}

function todayString() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

// ---------- Validation ----------

// Checks every submitted field against CONFIG. Returns { ok, entry } or { ok: false, error }.
function validateEntry(a, p) {
  const option = String(p.option || "");
  if (a.options.length) {
    if (a.options.indexOf(option) === -1) return { ok: false, error: "Please pick one of the choices." };
  } else if (option) {
    return { ok: false, error: "That choice isn't available here." };
  }

  let amount = String(p.amount || "").trim();
  if (!a.amount) {
    if (amount) return { ok: false, error: "That detail isn't available here." };
  } else if (!amount) {
    if (a.amount.required) return { ok: false, error: `Please enter ${a.amount.label.toLowerCase()}.` };
    const info = a.optionInfo.filter(o => o.name === option)[0];
    amount = info && info.dose ? String(info.dose) : "";
  } else if (a.amount.type === "text") {
    amount = amount.slice(0, 40);
  } else {
    const n = Number(amount);
    const min = a.amount.min != null ? a.amount.min : 0;
    const max = a.amount.max != null ? a.amount.max : 100000;
    if (!isFinite(n) || n < min || n > max) {
      return { ok: false, error: `${a.amount.label} should be a number from ${min} to ${max}.` };
    }
    amount = Math.round(n * 100) / 100;
  }

  let due = null;
  const dueRaw = String(p.due || "").trim();
  if (dueRaw) {
    if (!a.due) return { ok: false, error: "That date isn't available here." };
    due = parseDay(dueRaw);
    if (!due || Math.abs(due - Date.now()) > 10 * 365 * DAY_MS) return { ok: false, error: "Please pick a valid due date." };
  }

  // Optional "when it happened" date for backfilling (blank or today = now)
  let at = null;
  const whenRaw = String(p.when || "").trim();
  if (whenRaw && whenRaw !== todayString()) {
    if (!a.backdate) return { ok: false, error: "That date isn't available here." };
    at = parseDay(whenRaw);
    if (!at) return { ok: false, error: "Please pick a valid date." };
    if (whenRaw > todayString()) return { ok: false, error: "That date is in the future." };
    if (Date.now() - at > 30 * 365 * DAY_MS) return { ok: false, error: "That date is too far back." };
  }

  const note = String(p.note || "").trim().slice(0, 500);
  return { ok: true, entry: { option, amount, due, note, at } };
}

// ---------- Pages ----------

function shell(inner, wide) {
  return `<!DOCTYPE html><html><head>${BASE_STYLES}</head><body>
    <div class="card${wide ? " wide" : ""}">${inner}</div>
  </body></html>`;
}

function dashLink() {
  return CONFIG.DASHBOARD_URL
    ? `<a class="link" href="${esc(CONFIG.DASHBOARD_URL)}" target="_top">See ${esc(petName())}'s dashboard →</a>` : "";
}

function buildWhoPage(ctx) {
  const a = getAction(ctx.action);
  const colors = ["btn-purple", "btn-pink", "btn-teal", "btn-stone"];
  const buttons = Object.keys(CONFIG.FAMILY).map((name, i) => {
    const url = buildUrl(ctx, { action: ctx.action, who: name });
    return `<a href="${esc(url)}" class="btn ${colors[i % colors.length]}" target="_top">${esc(name)}</a>`;
  }).join("");

  return shell(`
      <div class="tag">PUPLOG</div>
      <div class="emoji">${a.emoji}</div>
      <div class="title">${esc(a.label)}</div>
      <div class="subtitle">Who's logging?</div>
      ${buttons}`);
}

function amountField(a) {
  if (!a.amount) return "";
  const f = a.amount;
  const label = `${f.label}${f.unit ? ` (${f.unit})` : ""}${f.required ? "" : " — optional"}`;
  const attrs = f.type === "text"
    ? `type="text" maxlength="40"`
    : `type="number" inputmode="decimal" step="any"${f.min != null ? ` min="${f.min}"` : ""}${f.max != null ? ` max="${f.max}"` : ""}`;
  return `<div class="field">
      <label class="field-label" for="amount">${esc(label)}</label>
      <input class="input" id="amount" name="amount" ${attrs}${f.required ? " required" : ""}>
      ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}
    </div>`;
}

function dueField(a) {
  return `<div class="field">
      <label class="field-label" for="due">${esc(a.due)} — optional</label>
      <input class="input" type="date" id="due" name="due">
    </div>`;
}

// After picking a name on a tag: choose an option (and optionally an amount) in one tap.
function buildOptionsPage(ctx) {
  const a = getAction(ctx.action);
  const buttons = a.options.length
    ? a.options.map(o => `<button type="submit" name="option" value="${esc(o)}" class="btn btn-stone">${esc(o)}</button>`).join("")
    : `<button type="submit" name="option" value="" class="btn btn-send">Log it</button>`;

  return shell(`
      <div class="tag">PUPLOG · ${esc(ctx.who.toUpperCase())}</div>
      <div class="emoji">${a.emoji}</div>
      <div class="title">${a.options.length ? "What specifically?" : esc(a.label)}</div>
      <div class="subtitle">${a.options.length ? "Pick one" : "Add details, or just log it"}</div>
      <form method="get" action="${esc(ctx.baseUrl)}" target="_top">
        ${hiddenInputs(ctx, { action: ctx.action, who: ctx.who })}
        ${amountField(a)}
        ${a.due ? dueField(a) : ""}
        ${buttons}
      </form>`);
}

function whenField() {
  return `<div class="field">
      <label class="field-label" for="when">Date — optional</label>
      <input class="input" type="date" id="when" name="when" max="${todayString()}">
      <div class="hint">Leave blank for today. Pick an earlier date to add something from the past.</div>
    </div>`;
}

function pill(name, value, checked) {
  return `<label class="pill"><input type="radio" name="${name}" value="${esc(value)}" required${checked ? " checked" : ""}><span>${esc(value)}</span></label>`;
}

function buildQuickHome(ctx) {
  const sections = Object.keys(GROUPS).map(g => {
    const keys = Object.keys(CONFIG.ACTIONS).filter(k => getAction(k).group === g);
    if (!keys.length) return "";
    const buttons = keys.map(k => {
      const a = getAction(k);
      return `<a class="btn btn-stone" target="_top" href="${esc(buildUrl(ctx, { page: "quick", action: k }))}">${a.emoji} ${esc(a.name)}</a>`;
    }).join("");
    return `<div class="group-label">${GROUPS[g]}</div><div class="grid">${buttons}</div>`;
  }).join("");

  return shell(`
      <div class="tag">PUPLOG · QUICK LOG</div>
      <div class="title">What happened?</div>
      <div class="subtitle">Tap to log something for ${esc(petName())}</div>
      ${sections}
      ${dashLink()}`, true);
}

function buildQuickForm(ctx) {
  const a = getAction(ctx.action);
  const who = Object.keys(CONFIG.FAMILY).map(n => pill("who", n, ctx.who === n)).join("");
  const options = a.options.length
    ? `<div class="field"><span class="field-label">Which one</span><div class="pills">${a.options.map(o => pill("option", o)).join("")}</div></div>`
    : "";

  return shell(`
      <div class="tag">PUPLOG · QUICK LOG</div>
      <div class="emoji">${a.emoji}</div>
      <div class="title">${esc(a.name)}</div>
      <div class="subtitle">${esc(a.label)}</div>
      <form method="get" action="${esc(ctx.baseUrl)}" target="_top" id="quick">
        ${hiddenInputs(ctx, { page: "quick", action: ctx.action, log: "1" })}
        <div class="field"><span class="field-label">Who</span><div class="pills">${who}</div></div>
        ${options}
        ${a.backdate ? whenField() : ""}
        ${amountField(a)}
        ${a.due ? dueField(a) : ""}
        <div class="field">
          <label class="field-label" for="note">Note — optional</label>
          <textarea class="input" id="note" name="note" maxlength="500" placeholder="${esc(a.notePrompt || "Anything to add?")}"></textarea>
        </div>
        <button class="btn btn-send" type="submit">Log it</button>
      </form>
      <a class="link" target="_top" href="${esc(buildUrl(ctx, { page: "quick" }))}">← Everything else</a>
      <script>
        try {
          const saved = localStorage.getItem("puplog-who");
          document.querySelectorAll('input[name="who"]').forEach(r => { if (r.value === saved && !document.querySelector('input[name="who"]:checked')) r.checked = true; });
          document.getElementById("quick").addEventListener("submit", () => {
            const r = document.querySelector('input[name="who"]:checked');
            if (r) localStorage.setItem("puplog-who", r.value);
          });
        } catch (e) {}
      </script>`, true);
}

function buildConfirmPage(ctx, entry) {
  const a = getAction(ctx.action);
  const time = entry.at ? "Added to the history — no texts sent" : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "h:mm a");
  const detail = describe(a, entry) || a.label;
  const noteUrlBase = buildUrl(ctx, { action: ctx.action, who: ctx.who, option: entry.option, note: "" });
  const after = ctx.quick
    ? `<a class="btn btn-send" target="_top" href="${esc(buildUrl(ctx, { page: "quick" }))}">Log something else</a>`
    : `<hr class="divider">
      <div class="note-label">ADD A NOTE FOR THE FAMILY</div>
      <input class="note-input" type="text" id="note" maxlength="500" placeholder="e.g. ${esc(petName())} is scratching...">
      <a class="btn btn-send" onclick="sendNote()" style="cursor:pointer;">Send to family</a>
      <script>
      function sendNote() {
        const note = document.getElementById("note").value;
        if (!note.trim()) return;
        window.top.location.href = ${JSON.stringify(noteUrlBase)} + encodeURIComponent(note);
      }
      </script>`;

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
    </style>
  </head><body>
    <div class="card">
      <div class="check">✓</div>
      <div class="title">Logged for ${esc(petName())}!</div>
      <div class="subtitle" style="margin-bottom:0">${esc(ctx.who)} · ${esc(detail)}</div>
      <div class="time">${time}</div>
      ${after}
      ${dashLink()}
    </div>
  </body></html>`;
}

function buildMessagePage(emoji, title, subtitle) {
  return shell(`
      <div style="font-size:40px; margin-bottom:16px;">${emoji}</div>
      <div class="title">${esc(title)}</div>
      <div class="subtitle" style="margin-bottom:0">${esc(subtitle)}</div>`);
}

// ---------- Sheet ----------

function getSheet() {
  const ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
}

// Columns: Date | Who | Action | Option | Note | Amount | Due
// Rows are only ever appended — existing rows are never edited.
function logToSheet(row) {
  getSheet().appendRow(row);
  try { CacheService.getScriptCache().remove(CACHE_KEY); } catch (e) {}
}

function recordEntry(ctx, entry) {
  const a = getAction(ctx.action);
  logToSheet([entry.at || new Date(), ctx.who, ctx.action, entry.option, entry.note, entry.amount, entry.due || ""]);
  if (CONFIG.NOTIFY.ON_LOG && a.notify && !entry.at) { // backfilled entries don't text the family
    const detail = describe(a, entry);
    notifyFamily(ctx.who, `${ctx.who} ${a.label}${detail ? ` (${detail})` : ""}${entry.note ? `: ${entry.note}` : ""}`);
  }
}

// Every row with a real date in column A, oldest first. Header rows and blank rows are skipped.
function readAllRows() {
  const sheet = getSheet();
  const last = sheet.getLastRow();
  if (last < 1) return [];
  const width = Math.min(7, sheet.getMaxColumns());
  const values = sheet.getRange(1, 1, last, width).getValues();
  const rows = [];
  values.forEach(v => {
    const date = v[0];
    if (!(date instanceof Date) || isNaN(date.getTime())) return;
    rows.push({
      t: date.getTime(),
      who: String(v[1] || ""),
      action: String(v[2] || ""),
      option: String(v[3] || ""),
      note: String(v[4] || ""),
      amount: v[5] === undefined || v[5] === null ? "" : v[5],
      due: v[6] instanceof Date ? v[6].getTime() : null,
    });
  });
  rows.sort((a, b) => a.t - b.t);
  return rows;
}

// ---------- Dashboard data ----------

function getDashboard() {
  const cache = CacheService.getScriptCache();
  try {
    const hit = cache.get(CACHE_KEY);
    if (hit) return JSON.parse(hit);
  } catch (e) {}
  const data = buildDashboard(readAllRows(), new Date());
  try {
    const text = JSON.stringify(data);
    if (text.length < 95000) cache.put(CACHE_KEY, text, CACHE_SECONDS);
  } catch (e) {}
  return data;
}

// Returns a function: timestamp → { day: "yyyy-MM-dd", minute: minutes after midnight } in the script's time zone.
function makeLocalizer(tz) {
  const memo = {};
  return t => {
    const hour = Math.floor(t / 3600000);
    if (!memo.hasOwnProperty(hour)) {
      const z = Utilities.formatDate(new Date(t), tz, "Z");
      const sign = z.charAt(0) === "-" ? -1 : 1;
      memo[hour] = sign * (Number(z.slice(1, 3)) * 60 + Number(z.slice(3, 5)));
    }
    const local = new Date(t + memo[hour] * 60000);
    return { day: local.toISOString().slice(0, 10), minute: local.getUTCHours() * 60 + local.getUTCMinutes() };
  };
}

function shiftDay(day, n) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayRange(endDay, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftDay(endDay, -i));
  return out;
}

// Rows → events. For trip actions, "out" followed by "back" is one event (timed at "out");
// a lone "out" (still out) or a lone "back" (forgot to log leaving) also counts once.
function collapseTrips(rows) {
  const open = {};
  const events = [];
  rows.forEach(r => {
    const a = getAction(r.action);
    if (a && a.trip && a.options.length >= 2) {
      if (r.option === a.options[1] && open[r.action]) { open[r.action] = false; return; }
      open[r.action] = r.option === a.options[0];
    }
    events.push(r);
  });
  return events;
}

function toItem(r) {
  const a = getAction(r.action);
  const isNote = r.action === NOTE_ACTION;
  return {
    t: iso(r.t),
    who: r.who,
    action: r.action,
    label: a ? a.label : isNote ? "left a note" : r.action,
    emoji: a ? a.emoji : isNote ? "💌" : "🐾",
    option: r.option,
    amount: r.amount,
    unit: a && a.amount && a.amount.unit ? a.amount.unit : "",
    due: r.due ? iso(r.due) : null,
    note: CONFIG.SHOW_NOTES === false ? "" : r.note,
  };
}

// Groups 1-D times of day into k usual times (simple k-means). Returns minutes after midnight.
function usualTimes(minutes, k) {
  if (minutes.length < 3) return [];
  const sorted = minutes.slice().sort((a, b) => a - b);
  k = Math.max(1, Math.min(k, Math.floor(sorted.length / 2)));
  let centers = [];
  for (let i = 0; i < k; i++) centers.push(sorted[Math.floor((i + 0.5) * sorted.length / k)]);
  let groups = [];
  for (let iter = 0; iter < 20; iter++) {
    groups = centers.map(() => []);
    sorted.forEach(m => {
      let best = 0;
      centers.forEach((c, i) => { if (Math.abs(m - c) < Math.abs(m - centers[best])) best = i; });
      groups[best].push(m);
    });
    centers = groups.map((g, i) => g.length ? g.reduce((s, m) => s + m, 0) / g.length : centers[i]);
  }
  return centers.filter((c, i) => groups[i].length >= 2).map(Math.round).sort((a, b) => a - b);
}

function supplyStatus(s, rows, nowT) {
  const base = { label: s.label, unit: s.unit || "", bagSize: Number(s.bagSize) || 0 };
  if (!base.bagSize) return Object.assign(base, { status: "no-bag-size" });
  let opened = null;
  rows.forEach(r => { if (r.action === "supplies" && r.option === s.openedBy) opened = r; });
  if (!opened) return Object.assign(base, { status: "never-opened", openedBy: s.openedBy });

  const only = s.onlyOptions || [];
  let used = 0;
  rows.forEach(r => {
    if (r.t <= opened.t || r.action !== s.uses) return;
    if (only.length && only.indexOf(r.option) === -1) return;
    const n = Number(r.amount);
    used += r.amount !== "" && isFinite(n) ? n : (Number(s.perLog) || 1);
  });
  const remaining = Math.max(0, base.bagSize - used);
  const perDay = used / Math.max(1, (nowT - opened.t) / DAY_MS);
  const daysLeft = perDay > 0 ? remaining / perDay : null;
  const warn = remaining <= 0 || remaining / base.bagSize <= 0.15 || (daysLeft !== null && daysLeft <= (s.warnDays || 5));
  return Object.assign(base, {
    status: "ok",
    openedAt: iso(opened.t),
    openedWho: opened.who,
    used: Math.round(used * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    daysLeft: daysLeft === null ? null : Math.round(daysLeft),
    warn,
  });
}

function buildDashboard(rows, now) {
  const local = makeLocalizer(Session.getScriptTimeZone());
  const nowT = now.getTime();
  const today = local(nowT).day;
  const actions = Object.keys(CONFIG.ACTIONS).map(getAction);
  const known = rows.filter(r => getAction(r.action));
  const events = collapseTrips(known);

  // Events per day per action, for the trend window
  const days = dayRange(today, TREND_DAYS);
  const perDay = {};
  const windowStart = nowT - (TREND_DAYS + 2) * DAY_MS;
  const totals = {};
  const lastEvent = {};
  events.forEach(ev => {
    totals[ev.action] = (totals[ev.action] || 0) + 1;
    lastEvent[ev.action] = ev;
    if (ev.t < windowStart) return;
    const d = local(ev.t).day;
    const day = perDay[d] || (perDay[d] = {});
    day[ev.action] = (day[ev.action] || 0) + 1;
  });
  const count = (d, k) => (perDay[d] && perDay[d][k]) || 0;
  const goals = actions.filter(a => a.goal > 0);
  const dayMet = d => goals.length > 0 && goals.every(a => count(d, a.key) >= a.goal);

  // Today
  const todayGoals = goals.map(a => ({ key: a.key, count: count(today, a.key), goal: a.goal }));
  const score = goals.length
    ? Math.round(100 * todayGoals.reduce((s, g) => s + Math.min(g.count / g.goal, 1), 0) / goals.length)
    : null;
  const last = {};
  Object.keys(lastEvent).forEach(k => {
    const ev = lastEvent[k];
    last[k] = { t: iso(ev.t), who: ev.who, option: ev.option };
  });
  const timeline = [];
  for (let i = rows.length - 1; i >= 0 && rows[i].t > nowT - 2 * DAY_MS; i--) {
    const r = rows[i];
    if (local(r.t).day !== today) continue;
    if (r.action === NOTE_ACTION && CONFIG.SHOW_NOTES === false) continue;
    timeline.push(toItem(r));
  }

  // Streak of days hitting every goal (today counts once it's met; otherwise it doesn't break the streak)
  let streak = 0;
  for (let i = days.length - (dayMet(today) ? 1 : 2); i >= 0 && dayMet(days[i]); i--) streak++;

  // Trends
  const daily = actions.filter(a => a.group === "daily");
  const last7 = days.slice(-7);
  const prev7 = days.slice(-14, -7);
  const sum = (list, k) => list.reduce((s, d) => s + count(d, k), 0);
  const heatDays = days.slice(-HEATMAP_DAYS);
  const usualFrom = nowT - USUAL_TIME_DAYS * DAY_MS;

  // Health, grooming
  const rowsFor = k => known.filter(r => r.action === k);
  const recent = (list, n) => list.slice(-n).reverse().map(toItem);
  const lastWith = (list, option) => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].option === option) return list[i];
    return null;
  };
  const schedule = (key, onlyRecurring) => {
    const a = getAction(key);
    if (!a) return [];
    const list = rowsFor(key);
    return a.optionInfo.filter(o => !onlyRecurring || o.every).map(o => {
      const r = lastWith(list, o.name);
      return {
        name: o.name,
        every: o.every || null,
        dose: o.dose || "",
        last: r ? { t: iso(r.t), who: r.who, amount: r.amount } : null,
        nextDue: r && o.every ? iso(r.t + o.every * DAY_MS) : null,
      };
    }).filter(item => item.every || item.last);
  };
  const vaccineRows = rowsFor("vaccine");
  const vaccineAction = getAction("vaccine");
  const vaccines = (vaccineAction ? vaccineAction.options : []).map(name => {
    const r = lastWith(vaccineRows, name);
    return r ? { name, given: iso(r.t), who: r.who, due: r.due ? iso(r.due) : null, note: toItem(r).note } : null;
  }).filter(Boolean).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const weightAction = getAction("weight");

  return {
    mode: "dashboard",
    generatedAt: iso(nowT),
    todayKey: today,
    pet: {
      name: petName(),
      breed: (CONFIG.PET && CONFIG.PET.BREED) || "",
      birthday: (CONFIG.PET && CONFIG.PET.BIRTHDAY) || "",
      photo: (CONFIG.PET && CONFIG.PET.PHOTO_URL) || "",
    },
    trackingSince: rows.length ? iso(rows[0].t) : null,
    actions: actions.map(a => ({
      key: a.key, name: a.name, label: a.label, emoji: a.emoji, group: a.group, goal: a.goal,
      unit: a.amount && a.amount.unit ? a.amount.unit : "",
    })),
    today: { score, goals: todayGoals, last, timeline },
    health: {
      meds: { schedule: schedule("meds", true), history: recent(rowsFor("meds"), HISTORY_LIMIT) },
      vaccines,
      vaccineWarnDays: CONFIG.VACCINE_WARN_DAYS || 30,
      weight: {
        unit: weightAction && weightAction.amount ? weightAction.amount.unit || "" : "",
        points: rowsFor("weight")
          .filter(r => r.amount !== "" && isFinite(Number(r.amount)))
          .map(r => ({ t: iso(r.t), v: Number(r.amount) })),
      },
      vet: recent(rowsFor("vet"), HISTORY_LIMIT),
      symptoms: recent(rowsFor("symptom"), 10),
    },
    grooming: schedule("grooming", false),
    supplies: (CONFIG.SUPPLIES || []).map(s => supplyStatus(s, known, nowT)),
    trends: {
      days7: last7,
      bars: daily.map(a => ({ key: a.key, counts: last7.map(d => count(d, a.key)) })),
      weekVsWeek: daily.map(a => ({ key: a.key, thisWeek: sum(last7, a.key), lastWeek: sum(prev7, a.key) })),
      heatmap: { days: heatDays, counts: heatDays.map(d => actions.reduce((s, a) => s + count(d, a.key), 0)) },
      streak: { current: streak, todayMet: dayMet(today), capped: streak >= TREND_DAYS - 1 },
      usualTimes: actions.filter(a => a.usualTime).map(a => {
        const mins = events.filter(ev => ev.action === a.key && ev.t >= usualFrom).map(ev => local(ev.t).minute);
        return { key: a.key, times: usualTimes(mins, Math.max(1, Math.min(a.goal || 1, 3))), samples: mins.length };
      }),
      totals: actions.map(a => ({ key: a.key, count: totals[a.key] || 0 })),
    },
  };
}

// Raw recent rows (family key required).
function buildLogs() {
  const cutoff = Date.now() - LOG_ROUTE_DAYS * DAY_MS;
  const logs = readAllRows().filter(r => r.t >= cutoff).reverse().map(toItem);
  return { mode: "logs", pet: petName(), logs };
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

/** Logs the URL to write on each NFC tag, the Quick Log link, and your dashboard links. */
function printLinks() {
  const url = ScriptApp.getService().getUrl();
  const tagKey = prop("TAG_KEY");
  if (!tagKey) { Logger.log("Run setup() first."); return; }
  Logger.log("Web app URL: " + url + "\n(Check this ends in /exec and matches Deploy → Manage deployments.)\n");
  Logger.log(`Quick Log (bookmark it / add it to your home screen — family only):\n${url}?page=quick&k=${tagKey}\n`);
  Object.keys(CONFIG.ACTIONS).filter(k => getAction(k).group === "daily").forEach(key => {
    Logger.log(`${key} tag:\n${url}?action=${key}&k=${tagKey}\n`);
  });
  if (CONFIG.DASHBOARD_URL) {
    Logger.log(`Dashboard:\n${CONFIG.DASHBOARD_URL}`);
    if (!publicDashboard()) Logger.log(`Private dashboard link (family only):\n${CONFIG.DASHBOARD_URL}/#key=${prop("VIEW_KEY")}`);
  }
}
