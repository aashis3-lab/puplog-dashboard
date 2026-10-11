# 🐾 PupLog

Tap a sticker by the food bowl, door, or leash hook with your phone → pick your name → done.
Everyone in the family gets a text, and a dashboard shows what's happened today.

- **No app to install.** Tags open a web page in your phone's browser.
- **Free.** It runs on your own Google account (Sheets + Apps Script) and a free dashboard host.
- **Private.** Your log lives in your Google Sheet. The public dashboard only shows today's totals — never names, notes, or times.

Setup takes about 30 minutes. You'll need a Google account, a phone with NFC (most phones from the last few years), and some NFC stickers.

---

## What you need

| Thing | Notes |
|---|---|
| Google account | Free Gmail is fine. |
| NFC stickers | Buy **NTAG215** (or NTAG216). They're cheap — about $10 for 20. NTAG213 is often too small for PupLog's links. |
| An NFC writer app | **NFC Tools** (free, iPhone and Android). |
| A GitHub account | Free — only needed for the dashboard (step 6). |

---

## Step 1 — Make your Google Sheet

1. Go to [sheets.new](https://sheets.new) to create a blank Sheet.
2. Name the file something like **PupLog**.
3. Rename the tab at the bottom (double-click "Sheet1") to your pet's log name, e.g. **PupLog**. Remember it exactly.
4. *(Optional)* In row 1 type headers: `Date`, `Who`, `Action`, `Option`, `Note`.

## Step 2 — Add the PupLog script

1. In your Sheet, click **Extensions → Apps Script**. A code editor opens.
2. Delete everything in the editor.
3. Open [`apps-script/Code.gs`](apps-script/Code.gs) from this project, copy **all** of it, and paste it in.
4. Click the 💾 **Save** icon.

## Step 3 — Fill in your household

At the very top of the code is a section called `CONFIG`. Change only the parts in quotes:

```js
PET_NAME: "Your pet's name",
SHEET_ID: "",                       // leave empty — your script lives inside your Sheet
SHEET_NAME: "Your tab name",        // must match your tab name from Step 1

FAMILY: {
  "Name 1": "5551234567@vtext.com", // alerts by text message
  "Name 2": "name2@gmail.com",      // alerts by email
  "Name 3": "",                     // "" = no alerts for this person
},
```

**Getting alerts as text messages.** Use your carrier's email-to-text address: your 10-digit number followed by:

| Carrier | Add this |
|---|---|
| T-Mobile | `@tmomail.net` |
| Verizon | `@vtext.com` |
| AT&T | `@txt.att.net` |
| Others | Search "*your carrier* email to text address" |

Or just use a normal email address.

**Actions** (food, water, backyard, walk) are already set up. You can change the wording, emoji, and choices. `{pet}` is filled in with your pet's name automatically. To remove an action you don't need, delete its line. `trip: true` means the first choice is "leaving" and the second is "coming back", so going out and coming back counts as one trip. Don't rename the short words on the left (`food:`, `water:` …) after you've written your tags.

**Alerts** — under `NOTIFY`:
- `ON_LOG: false` turns off texts for every log.
- `ON_NOTE: false` turns off texts for notes.
- `SKIP_SENDER: true` means you don't get a text about something you just logged yourself.

**Public dashboard** — `PUBLIC_SUMMARY: false` makes your dashboard family-only (no public view at all).

Click 💾 **Save**.

## Step 4 — Create your secret keys

PupLog uses two secret keys:
- a **tag key**, built into your NFC stickers, so strangers can't post fake logs or trigger texts;
- a **view key**, in your family's dashboard link, so only your family can see names and times.

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

"Anyone" is required so phones can open the page without signing in to Google. Your secret keys are what keep strangers out.

> ⚠️ **Do this only once.** Later, when you change the code, use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. That keeps the same URL. Clicking "New deployment" again creates a *different* URL, and your tags stop working.

## Step 6 — Get your tag links

1. Choose **`printLinks`** in the function dropdown and click **▶ Run**.
2. The **Execution log** at the bottom shows one link per action, like:
   ```
   food tag:
   https://script.google.com/macros/s/AKfy.../exec?action=food&k=3f9a1c...
   ```
3. Check that the URL at the top matches the Web app URL from Step 5. If not, use the one from Step 5 and keep the `?action=…&k=…` ending.
4. Test one: paste a link into your phone's browser. You should see "Who's logging?".

## Step 7 — Write your NFC tags

For each sticker:

1. Open **NFC Tools** → **Write** → **Add a record** → **URL / URI**.
2. Paste that action's link and tap **OK**.
3. Tap **Write** and hold the top of your phone against the sticker until it says done.
4. Stick it where it makes sense: food tag by the bowl, backyard tag by the back door, walk tag by the leash.

To test it, tap the sticker with your phone unlocked. iPhones show a notification to tap. On Android, make sure NFC is turned on in Settings.

*"Not enough space" error?* The sticker is too small (probably NTAG213). Use NTAG215 stickers.

*(Optional)* In NFC Tools you can also **lock** a tag so nobody can overwrite it. Locking is permanent.

## Step 8 — Put your dashboard online

The dashboard is one file, `index.html`.

1. On GitHub, click **Fork** on this project to make your own copy.
2. In your copy, open `index.html` → ✏️ edit. Near the bottom, replace the `SCRIPT_URL` link with your Web app URL from Step 5. **Commit changes**.
3. Go to [vercel.com](https://vercel.com), sign in with GitHub, click **Add New → Project**, pick your fork, and click **Deploy**. No settings to change.
4. You'll get a link like `https://puplog-yourname.vercel.app`. That's your **public** dashboard (totals only, no names).

**Your family's private link** is the same address plus your view key:

```
https://puplog-yourname.vercel.app/#key=YOUR_VIEW_KEY
```

Find `VIEW_KEY` in **Project Settings → Script Properties**. Send this link to family members only. Each phone needs to open it **once**. After that the phone remembers it, and the plain dashboard link shows the full family view. To undo that on a shared phone, tap **Forget this device** at the bottom of the dashboard.

*(Optional)* Put your dashboard address in `DASHBOARD_URL` in the script's CONFIG and publish a new version (Step 5's ⚠️ note). A "See today's log →" link then appears after each log.

---

## Everyday use

- **Log something:** tap a tag → tap your name → pick an option (if there is one). Everyone gets a text.
- **Add a note** ("ate slowly today"): after logging, type in the note box and tap **Send to family**. Notes are saved in the Sheet too.
- **See what's happened:** open the dashboard. It refreshes itself every minute.
- **Your data** is in your Google Sheet. You can sort it, chart it, or download it any time. PupLog only ever adds new rows. It never edits or deletes old ones.

## What's public and what's private

| | Public dashboard link | Family link (`#key=…`) | The Google Sheet |
|---|---|---|---|
| Today's counts | ✅ | ✅ | ✅ |
| Who did it, exact times | ❌ | ✅ | ✅ |
| Notes and choices (e.g. "Kibble + Cheese") | ❌ | ✅ | ✅ |
| Logging new activity | ❌ | ❌ | needs a tag link |

If you'd rather not show even the counts, set `PUBLIC_SUMMARY: false`.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Link not recognized" after tapping a tag | The tag's key doesn't match. Run `printLinks` and rewrite the tag. |
| Tags stopped working after I changed the code | You probably made a *new* deployment (new URL). Go to **Manage deployments**, edit the **original** deployment, and choose New version. Or rewrite the tags with the new URL. |
| No text messages | Check the address in `FAMILY`, check `NOTIFY.ON_LOG` is `true`, and check your carrier's email-to-text domain. Google allows about 100 alert emails a day on free accounts. |
| Dashboard says "Couldn't reach PupLog" | Check `SCRIPT_URL` in `index.html` matches your Web app URL exactly and ends in `/exec`. |
| Dashboard shows only totals on my phone | Open the family link (`#key=…`) once on that phone. |
| "Unknown tag" | The `action=` in the link doesn't match an action in your CONFIG. |

---

## Updating an existing PupLog (already have tags on your doors?)

Older PupLog versions didn't use a tag key. To upgrade without your tags going dead:

1. Copy your current values (Sheet ID, tab name, family, actions) somewhere safe.
2. Paste in the new `Code.gs` and put your values back into `CONFIG`. Keep `SHEET_ID` filled in if your script isn't inside the Sheet. Existing rows keep working as-is.
3. Run `setup` (Step 4).
4. In **Project Settings → Script Properties**, change `ALLOW_LEGACY_TAGS` to `true`. Your old tags keep working while you switch over.
5. Publish with **Manage deployments → Edit → New version** (*not* New deployment), so the URL stays the same.
6. Run `printLinks` and rewrite each tag (Step 7). Test each one.
7. Set `ALLOW_LEGACY_TAGS` back to `false`. Old, keyless links now get "Link not recognized".
8. Update and deploy your dashboard (Step 8).

Until step 7 is done, anyone who knows your script URL can still post logs, so do steps 6–7 soon after step 5.
