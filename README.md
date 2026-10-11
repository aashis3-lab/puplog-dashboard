# 🐾 PupLog

A personal pet activity tracker that turns daily care logs into a simple, real-time dashboard for monitoring Leo’s food, water, walks, and backyard activity.

Built with vanilla JavaScript and a Google Apps Script backend, PupLog retrieves activity data as JSON, processes timestamps and daily events, and dynamically updates the dashboard with recent logs and activity totals.

Tap a sticker by the food bowl, door, or leash hook with your phone → pick your name → done.
Everyone in the family gets a text, and the dashboard shows how your dog's day is going.

- **No app to install.** Tags open a web page in your phone's browser.
- **Free.** It runs on your own Google account (Sheets + Apps Script) and a free dashboard host.
- **Your data stays yours.** Every log is a row in your own Google Sheet. PupLog only ever adds rows — it never edits or deletes them.

Setup takes about 30 minutes. You'll need a Google account, a phone with NFC (most phones from the last few years), and some NFC stickers.

---

## What PupLog tracks

| | What you can log | How |
|---|---|---|
| **Daily care** | Meals (with portion), water, walks (with length), backyard trips, potty (pee / poop), treats, playtime, teeth brushing | NFC tags for the everyday ones, or Quick Log |
| **Health** | Medications & preventatives (name, dose, who gave it), vet visits, vaccinations (with next due date), weight, symptoms | Quick Log |
| **Grooming** | Baths, groomer visits, nail trims, ear cleaning, brushing | Quick Log |
| **Supplies** | "Opened new food bag", "Opened new treat bag" | Quick Log |

## What the dashboard shows

Everything comes from your real logs — nothing is estimated or made up, except where it says "about".

- **Profile card** — photo, breed, age, birthday countdown, and a **day score** (% of today's goals met).
- **Today** — progress rings for each daily goal, "time since last" for every daily-care item, and a live timeline of today's logs with names and times.
- **Health** — medication history with "next dose due" countdowns, vaccinations (anything due within 30 days is highlighted), a weight chart, vet visit history, and recent symptoms.
- **Grooming** — when each item was last done and when it's next due.
- **Supplies** — about how much food and treats are left in the current bag, with a restock warning.
- **Trends** — 7-day bar charts, this week vs last week, a 13-week activity calendar, your streak of days hitting every goal, usual meal and walk times, all-time totals, and "tracking since".

Walks and backyard trips count once per trip: "going out" + "coming back" = 1.

---

## What you need

| Thing | Notes |
|---|---|
| Google account | Free Gmail is fine. |
| NFC stickers | Buy **NTAG215** (or NTAG216). They're cheap — about $10 for 20. NTAG213 is often too small for PupLog's links. |
| An NFC writer app | **NFC Tools** (free, iPhone and Android). |
| A GitHub account | Free — only needed for the dashboard (Step 8). |

---

## Step 1 — Make your Google Sheet

1. Go to [sheets.new](https://sheets.new) to create a blank Sheet.
2. Name the file something like **PupLog**.
3. Rename the tab at the bottom (double-click "Sheet1") — for example **PupLog**. Remember it exactly.
4. *(Optional)* In row 1 type headers: `Date`, `Who`, `Action`, `Option`, `Note`, `Amount`, `Due`.

## Step 2 — Add the PupLog script

PupLog is two files: **Config.gs** (your settings) and **Code.gs** (the program).

1. In your Sheet, click **Extensions → Apps Script**. A code editor opens with a file called `Code.gs`.
2. Delete everything in it. Open [`apps-script/Code.gs`](apps-script/Code.gs) from this project, copy **all** of it, and paste it in.
3. Click **＋** next to "Files" → **Script**, and name it `Config`.
4. Delete everything in the new file. Copy all of [`apps-script/Config.gs`](apps-script/Config.gs) into it.
5. Click 💾 **Save**.

## Step 3 — Fill in your household (Config.gs)

Open **Config.gs**. Change only the parts in quotes and the numbers.

**Your dog:**

```js
PET: {
  NAME: "Your dog's name",
  BREED: "Your dog's breed",
  BIRTHDAY: "YYYY-MM-DD",     // year-month-day
  PHOTO_URL: "photo.jpg",     // see "Adding a photo" in Step 8
},
SHEET_ID: "",                 // leave empty — your script lives inside your Sheet
SHEET_NAME: "PupLog",         // must match your tab name from Step 1
```

**Your family and where their alerts go:**

```js
FAMILY: {
  "Name 1": "5551234567@vtext.com", // alerts by text message
  "Name 2": "name2@gmail.com",      // alerts by email
  "Name 3": "",                     // "" = no alerts for this person
},
```

To get alerts as text messages, use your carrier's email-to-text address: your 10-digit number followed by:

| Carrier | Add this |
|---|---|
| T-Mobile | `@tmomail.net` |
| Verizon | `@vtext.com` |
| AT&T | `@txt.att.net` |
| Others | Search "*your carrier* email to text address" |

**Things to log (`ACTIONS`).** Everything in "What PupLog tracks" is already set up. You can change the wording, emoji, and choices. `{pet}` is replaced with your dog's name. Useful settings:

| Setting | What it does | Example |
|---|---|---|
| `goal` | Daily target, shown as a progress ring. Remove it for no goal. | `goal: 2` (two meals a day) |
| `every` on a choice | Days between doses or grooming sessions — powers "next due". | `{ name: "Nail trim", every: 21 }` |
| `dose` on a medication | The usual dose, filled in when you leave Dose blank. | `{ name: "Heartworm preventative", dose: "1 chew", every: 30 }` |
| `amount` | Asks for a number (or text). | `{ label: "Portion", unit: "cups" }` |
| `backdate: true` | Quick Log shows an optional **Date** field, so you can add things that happened earlier. On for meds, vaccines, vet visits, and grooming. | `backdate: true` |
| `notify: false` | No texts for this one. | Potty, treats, play, teeth, weight, and grooming start with texts off. Free Google accounts can send about 100 alert emails a day, and each log sends one per family member. |

Don't rename the short words on the left (`food:`, `water:`, …) after you've written tags. The Health, Grooming, and Supplies sections look for the words `meds`, `vaccine`, `vet`, `weight`, `symptom`, `grooming`, and `supplies`, so keep those too.

**Medications.** Replace the example preventatives with what your dog actually takes, how often (`every`, in days), and the usual `dose`.

**Food and treat bags (`SUPPLIES`).** Set `bagSize` to how much is in a new bag, in the same unit you log portions in (e.g. a 30 lb bag of kibble is about 120 cups). If only some meals come from the bag, list them in `onlyOptions`, e.g. `onlyOptions: ["Kibble"]`. Each meal with no portion entered counts as `perLog`.

**Alerts (`NOTIFY`):** `ON_LOG: false` turns off texts for logs, `ON_NOTE: false` for notes, and `SKIP_SENDER: true` means you don't get texted about your own logs.

**Who can see the dashboard:** `PUBLIC_DASHBOARD: true` lets anyone with the dashboard link see everything on it, including names, times, and notes. Set it to `false` to make it family-only (see Step 8). `SHOW_NOTES: false` hides written notes.

Click 💾 **Save**.

## Step 4 — Create your secret keys

PupLog uses two secret keys:
- a **tag key**, built into your NFC stickers and your Quick Log link, so strangers can't post fake logs or trigger texts;
- a **view key**, only needed if you make the dashboard family-only.

1. In the editor's toolbar, pick **`setup`** from the function dropdown (next to "Debug").
2. Click **▶ Run**.
3. Google will ask for permission. Click **Review permissions**, choose your account, then **Advanced → Go to (your project) (unsafe) → Allow**. ("Unsafe" just means Google hasn't reviewed your personal script. It only accesses your own Sheet and sends your alerts.)

Your keys are now saved in **⚙️ Project Settings → Script Properties**. To start over with new keys, delete them there and run `setup` again. You'll have to rewrite your tags afterwards.

## Step 5 — Publish the script

1. Click **Deploy → New deployment**.
2. Click the ⚙️ next to "Select type" → **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`). Keep it — you need it for the dashboard.

"Anyone" is required so phones can open the page without signing in to Google. Your secret keys are what keep strangers from logging.

> ⚠️ **Only ever do "New deployment" once.** Every time you change Config.gs or Code.gs later, publish with **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. That keeps the same URL. A new deployment creates a *different* URL, and your tags, Quick Log link, and dashboard stop working.

## Step 6 — Get your links

1. Choose **`printLinks`** in the function dropdown and click **▶ Run**.
2. The **Execution log** at the bottom shows:
   - your **Quick Log** link,
   - one **tag link** per daily-care item, like:
     ```
     food tag:
     https://script.google.com/macros/s/AKfy.../exec?action=food&k=3f9a1c...
     ```
3. Check that the URL at the top matches the Web app URL from Step 5.
4. Test one: paste a link into your phone's browser. You should see "Who's logging?".

## Step 7 — Write your NFC tags

For each sticker:

1. Open **NFC Tools** → **Write** → **Add a record** → **URL / URI**.
2. Paste that item's tag link and tap **OK**.
3. Tap **Write** and hold the top of your phone against the sticker until it says done.
4. Stick it where it makes sense: food by the bowl, water by the water bowl, backyard by the back door, walk by the leash. You can make tags for potty, treats, play, and teeth too — `printLinks` prints those links.

To test it, tap the sticker with your phone unlocked. iPhones show a notification to tap. On Android, make sure NFC is turned on in Settings.

*"Not enough space" error?* The sticker is too small (probably NTAG213). Use NTAG215 stickers.

## Step 8 — Put your dashboard online

The dashboard is a small website in this project (the `src/` folder). Vercel builds and hosts it for free.

1. On GitHub, click **Fork** on this project to make your own copy.
2. In your copy, open `src/config.js` → ✏️ edit. Replace the `SCRIPT_URL` link with your Web app URL from Step 5. **Commit changes**.
3. Go to [vercel.com](https://vercel.com), sign in with GitHub, click **Add New → Project**, pick your fork, and click **Deploy**. Vercel reads the settings from `vercel.json`, so there's nothing to change.
4. You'll get a link like `https://puplog-yourname.vercel.app`. That's your dashboard. Every time you commit a change on GitHub, Vercel rebuilds it within a minute.

The dashboard has a side panel with five pages — **Today**, **Health**, **Grooming**, **Supplies**, and **Trends** — and works on phones, tablets, and computers. On a phone, tap ☰ at the top left to switch pages. A number next to a page means something there needs attention, like a vaccine due soon.

**Adding a photo.** In your GitHub copy, open the `public` folder, click **Add file → Upload files**, and upload a photo (e.g. `photo.jpg`). Set `PHOTO_URL: "photo.jpg"` in Config.gs and publish a new version (Step 5's ⚠️ note). A full link to a photo elsewhere works too. Without a photo, the dashboard shows your dog's initial.

**Family-only dashboard.** If you set `PUBLIC_DASHBOARD: false`, your family's link is the dashboard address plus your view key: `https://puplog-yourname.vercel.app/#key=YOUR_VIEW_KEY` (find `VIEW_KEY` in Script Properties). Each phone opens it once and remembers it.

*(Optional)* Put your dashboard address in `DASHBOARD_URL` in Config.gs and publish a new version. A "See your dog's dashboard →" link then appears after each log.

*(For developers)* `npm install` then `npm run dev` runs the dashboard locally. It's React + Vite with Lucide icons; charts are plain SVG.

---

## Everyday use

**From a tag:** tap the tag → tap your name → pick a choice (if there is one). For meals and walks you can type a portion or walk length before tapping the choice — or skip it.

**Add a note** ("ate slowly today"): after logging from a tag, type in the note box and tap **Send to family**.

### Quick Log — for everything without a tag

Quick Log is a page for logging anything: meds, vet visits, vaccines, weight, grooming, symptoms, opening a new bag — plus all the daily-care items.

1. Run `printLinks` once and copy the **Quick Log** link (it has your tag key in it, so only share it with family).
2. Open it on your phone and add it to your home screen:
   - **iPhone (Safari):** Share button → **Add to Home Screen**.
   - **Android (Chrome):** ⋮ menu → **Add to Home screen**.
3. To log: tap the Quick Log icon → pick what happened → pick who you are (your phone remembers next time) → fill in the details → **Log it**.

A few tips:
- **Adding past records:** for meds, vaccines, vet visits, and grooming, pick a **Date** to log something that already happened, like last spring's rabies shot from the vet's paperwork. Past entries go into the history and countdowns but don't text the family. Leave the date blank for today.
- **Vaccines:** enter the next due date from the vet's paperwork. The dashboard warns you 30 days before.
- **Medications:** leave Dose blank to use the usual dose from Config.gs.
- **New bag:** log "Opened new food bag" the day you open it. The Supplies estimate starts counting from there.
- **Weight:** log it whenever you weigh your dog. The chart fills in over time.

## What's on the dashboard, and who can see it

With `PUBLIC_DASHBOARD: true` (the default), **anyone with the dashboard link** can see everything on it: names, exact times, notes, and health history. Logging always needs your tag key.

| | Dashboard link | Quick Log / tag links | The Google Sheet |
|---|---|---|---|
| See logs, names, times, notes | ✅ | — | ✅ |
| Log new activity | ❌ | ✅ | ✅ (by hand) |

Set `PUBLIC_DASHBOARD: false` to make the dashboard family-only, or `SHOW_NOTES: false` to hide written notes.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Link not recognized" | The link's key doesn't match. Run `printLinks` and use the new links. |
| Tags stopped working after I changed the code | You probably made a *new* deployment (new URL). Go to **Manage deployments**, edit the **original** deployment, and choose New version. |
| My Config.gs change doesn't show up | Saving isn't enough — publish a **New version** (Step 5's ⚠️ note). The dashboard can also take up to 5 minutes to refresh. |
| No text messages | Check the address in `FAMILY`, that `NOTIFY.ON_LOG` is `true`, that the action doesn't have `notify: false`, and your carrier's email-to-text domain. Free accounts can send about 100 alert emails a day. |
| Dashboard says "Can't reach PupLog" | Check `SCRIPT_URL` in `src/config.js` matches your Web app URL exactly and ends in `/exec`. |
| A section says "add one in Quick Log" | That's normal until you've logged one. |
| Supplies says to set a bag size | Set `bagSize` in `SUPPLIES` in Config.gs, then publish a new version. |
| "Unknown tag" | The `action=` in the link doesn't match an action in Config.gs. |

---

## Updating PupLog

1. Replace everything in **Code.gs** with the new [`apps-script/Code.gs`](apps-script/Code.gs). Leave **Config.gs** alone — your settings live there.
2. If the update adds new settings, copy them from the new [`apps-script/Config.gs`](apps-script/Config.gs) into yours.
3. Publish with **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** — *not* New deployment.
4. If the dashboard changed, update your GitHub copy (keep your `SCRIPT_URL` in `src/config.js`). Vercel redeploys on its own.

**Coming from a single-file PupLog** (everything was in Code.gs, with `PET_NAME` at the top)? Create Config.gs as in Step 2, copy your old family addresses, Sheet ID, tab name, and choices into it, then replace Code.gs. Your existing rows keep working — new columns are only added to new rows.

**Coming from a version without tag keys?** Run `setup`, set `ALLOW_LEGACY_TAGS` to `true` in Script Properties so old tags keep working, publish a new version, rewrite your tags with the `printLinks` links, then set `ALLOW_LEGACY_TAGS` back to `false`.
