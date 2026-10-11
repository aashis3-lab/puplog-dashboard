/**
 * PupLog settings — the only file you need to edit.
 * When you update PupLog later, replace Code.gs and keep this file.
 */
const CONFIG = {
  PET: {
    NAME: "Your pet",
    BREED: "",       // e.g. "Golden Retriever"
    BIRTHDAY: "",    // "YYYY-MM-DD" — used for age and the birthday countdown
    PHOTO_URL: "",   // link to a photo, or a file name next to your dashboard's index.html (e.g. "pet.jpg")
  },

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

  // Everything you can log. The short word on the left (food, water, ...) is saved in the Sheet
  // and used in tag links — don't rename it once you've written tags. Everything else is safe to change.
  //
  //   group      "daily", "health", "grooming" or "supplies" (where it shows up)
  //   name       short name for the dashboard
  //   label      sentence used in texts and the timeline; {pet} becomes your pet's name
  //   goal       daily target, shown as a progress ring (leave out for no goal)
  //   options    choices to pick from. A choice can be { name, every } — "every" is days between
  //              doses / grooming sessions, used for "next due" countdowns. Meds can also have a usual dose.
  //   trip       true = first choice is "leaving", second is "coming back"; out + back counts once
  //   amount     an extra number or text to record, e.g. { label: "Portion", unit: "cups" }
  //              add required: true to make it mandatory, type: "text" for words instead of numbers
  //   due        ask for a "next due" date (vaccines)
  //   usualTime  true = show the usual time of day on the dashboard
  //   backdate   true = Quick Log asks for an optional date, for logging things that happened earlier
  //   notify     false = don't send texts for this one (free Gmail allows ~100 alert emails a day)
  //
  // The keys meds, vaccine, vet, weight, symptom, grooming and supplies power the Health,
  // Grooming and Supplies sections of the dashboard — keep those names.
  ACTIONS: {
    // ---- Daily care ----
    food:     { group: "daily", name: "Food", label: "fed {pet}", emoji: "🍦", goal: 2, usualTime: true,
                options: ["Breakfast", "Dinner", "Other"],
                amount: { label: "Portion", unit: "cups", min: 0, max: 20 } },
    water:    { group: "daily", name: "Water", label: "refilled {pet}'s water", emoji: "💧", goal: 1 },
    backyard: { group: "daily", name: "Backyard", label: "let {pet} out back", emoji: "🌿", goal: 3, trip: true,
                options: ["Sent {pet} out", "Brought back in"] },
    walk:     { group: "daily", name: "Walks", label: "walked {pet}", emoji: "🦮", goal: 2, trip: true, usualTime: true,
                options: ["Going on a walk", "Came back from a walk"],
                amount: { label: "Walk length", unit: "min", min: 1, max: 600 } },
    potty:    { group: "daily", name: "Potty", label: "saw {pet} go potty", emoji: "🧻", goal: 3, notify: false,
                options: ["Pee", "Poop"], notePrompt: "Anything unusual?" },
    treats:   { group: "daily", name: "Treats", label: "gave {pet} a treat", emoji: "🦴", notify: false,
                amount: { label: "How many", unit: "treats", min: 1, max: 50 } },
    play:     { group: "daily", name: "Playtime", label: "played with {pet}", emoji: "🎾", notify: false,
                amount: { label: "How long", unit: "min", min: 1, max: 600 } },
    teeth:    { group: "daily", name: "Teeth", label: "brushed {pet}'s teeth", emoji: "🪥", notify: false },

    // ---- Health ----
    meds:     { group: "health", name: "Medication", label: "gave {pet} medication", emoji: "💊", backdate: true,
                options: [
                  { name: "Heartworm preventative", dose: "", every: 30 },
                  { name: "Flea & tick preventative", dose: "", every: 30 },
                  { name: "Other" },
                ],
                amount: { label: "Dose", type: "text", hint: "Leave blank for the usual dose" } },
    vaccine:  { group: "health", name: "Vaccine", label: "logged a vaccine for {pet}", emoji: "💉", due: "Next due", backdate: true,
                options: ["Rabies", "DHPP", "Bordetella", "Leptospirosis", "Lyme", "Canine influenza", "Other"] },
    vet:      { group: "health", name: "Vet visit", label: "took {pet} to the vet", emoji: "🩺", backdate: true,
                options: ["Checkup", "Sick visit", "Vaccines", "Dental", "Emergency", "Other"],
                notePrompt: "What did the vet say?" },
    weight:   { group: "health", name: "Weight", label: "weighed {pet}", emoji: "⚖️", notify: false,
                amount: { label: "Weight", unit: "lb", min: 0.5, max: 350, required: true } },
    symptom:  { group: "health", name: "Symptom", label: "noticed a symptom", emoji: "🤒",
                options: ["Vomiting", "Diarrhea", "Limping", "Low appetite", "Low energy", "Itching / scratching", "Coughing", "Other"],
                notePrompt: "What happened?" },

    // ---- Grooming ----
    grooming: { group: "grooming", name: "Grooming", label: "groomed {pet}", emoji: "🛁", notify: false, backdate: true,
                options: [
                  { name: "Bath", every: 30 },
                  { name: "Groomer visit", every: 42 },
                  { name: "Nail trim", every: 21 },
                  { name: "Ear cleaning", every: 14 },
                  { name: "Brushing", every: 7 },
                ] },

    // ---- Supplies ----
    supplies: { group: "supplies", name: "New bag", label: "opened a new bag", emoji: "🛍️",
                options: ["Opened new food bag", "Opened new treat bag"] },
  },

  // Estimates how much is left since the last "opened new bag". Set bagSize to turn one on.
  //   uses         which action eats from this bag
  //   perLog       how much one log uses when no amount is entered
  //   onlyOptions  only count these choices (e.g. just "Kibble") — leave [] to count all
  SUPPLIES: [
    { label: "Food",   openedBy: "Opened new food bag",  uses: "food",   bagSize: 0, unit: "cups",   perLog: 1, onlyOptions: [], warnDays: 5 },
    { label: "Treats", openedBy: "Opened new treat bag", uses: "treats", bagSize: 0, unit: "treats", perLog: 1, onlyOptions: [], warnDays: 5 },
  ],

  NOTIFY: {
    ON_LOG: true,         // text/email everyone when something is logged (unless the action says notify: false)
    ON_NOTE: true,        // text/email everyone when someone adds a note
    SKIP_SENDER: false,   // true = don't alert the person who did the logging
  },

  PUBLIC_DASHBOARD: true,   // false = the dashboard only works with your family link (#key=...)
  SHOW_NOTES: true,         // false = hide written notes on the dashboard
  VACCINE_WARN_DAYS: 30,    // highlight vaccines due within this many days

  // Optional: your dashboard address, shown as a link after logging. e.g. "https://puplog-yourname.vercel.app"
  DASHBOARD_URL: "",
};
