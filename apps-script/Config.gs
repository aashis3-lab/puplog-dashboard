/**
 * PupLog settings — the only file you need to edit.
 * When you update PupLog later, replace Code.gs and keep this file.
 */
const CONFIG = {
  PET: {
    NAME: "Leo",
    BREED: "Maltipoo",
    BIRTHDAY: "2020-08-03",
    PHOTO_URL: "leo.jpg",   // drop leo.jpg into the dashboard's public/ folder
  },

  // Leave "" if this script was created from the Sheet (Extensions → Apps Script).
  SHEET_ID: "",
  SHEET_NAME: "Leo's Log",

  // Each family member and where their alerts go.
  // Replace CARRIER with the same email-to-text domain your current script uses
  // (copy the exact addresses from the config that's live right now).
  // Names must match the names already in the Sheet.
  FAMILY: {
    "Mama":  "6509953244@CARRIER",
    "Aashi": "6507400357@CARRIER",
    "Papa":  "6505336649@CARRIER",
  },

  ACTIONS: {
    // ---- Daily care ----
    food:     { group: "daily", name: "Food", label: "fed {pet}", emoji: "🍦", goal: 3, usualTime: true,
                options: ["Sweet Chews", "Potato Mash", "Kibble + Cheese", "Paratha Bites", "Other"],
                amount: { label: "Portion", unit: "cups", min: 0, max: 20 } },
    water:    { group: "daily", name: "Water", label: "refilled {pet}'s water", emoji: "💧", goal: 1 },
    backyard: { group: "daily", name: "Backyard", label: "let {pet} out back", emoji: "🌿", goal: 2, trip: true, usualTime: true,
                options: ["Sent {pet} out", "Brought back in"] },
    walk:     { group: "daily", name: "Walks", label: "walked {pet}", emoji: "🦮", goal: 2, trip: true, usualTime: true,
                options: ["Going on a walk", "Came back from a walk"],
                amount: { label: "Walk length", unit: "min", min: 1, max: 600 } },
    potty:    { group: "daily", name: "Potty", label: "saw {pet} go potty", emoji: "🧻", goal: 3, notify: false,
                options: ["Pee", "Poop"], notePrompt: "Anything unusual?" },
    treats:   { group: "daily", name: "Treats", label: "gave {pet} a treat", emoji: "🦴", notify: false,
                amount: { label: "How many", unit: "treats", min: 1, max: 50 } },
    play:     { group: "daily", name: "Playtime", label: "played with {pet}", emoji: "🎾", goal: 1, notify: false,
                amount: { label: "How long", unit: "min", min: 1, max: 600 } },
    teeth:    { group: "daily", name: "Teeth", label: "brushed {pet}'s teeth", emoji: "🪥", goal: 1, notify: false },

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
    weight:   { group: "health", name: "Weight", label: "weighed {pet}", emoji: "⚖️", notify: false, backdate: true,
                amount: { label: "Weight", unit: "lb", min: 0.5, max: 350, required: true } },
    symptom:  { group: "health", name: "Symptom", label: "noticed a symptom", emoji: "🤒",
                options: ["Vomiting", "Diarrhea", "Limping", "Low appetite", "Low energy", "Itching / scratching", "Coughing", "Other"],
                notePrompt: "What happened?" },

    // ---- Grooming ----
    grooming: { group: "grooming", name: "Grooming", label: "groomed {pet}", emoji: "🛁", notify: false, backdate: true,
                options: [
                  { name: "Groomer visit", every: 182 },   // twice a year
                  { name: "Nail trim", every: 182 },       // done with the groomer
                  { name: "Bath", every: 30 },
                  { name: "Brushing", every: 1 },          // daily
                ] },

    // ---- Supplies ----
    supplies: { group: "supplies", name: "New bag", label: "opened a new bag", emoji: "🛍️",
                options: ["Opened new kibble bag", "Opened new Sweet Chews bag", "Opened new treat bag"] },
  },

  // Estimates how much is left since the last "opened new bag".
  SUPPLIES: [
    // 24 lb V-dog Kind Kibble ≈ 90 cups, 1 cup each dinner
    { label: "Kibble", openedBy: "Opened new kibble bag", uses: "food", bagSize: 90, unit: "cups",
      perLog: 1, onlyOptions: ["Kibble + Cheese"], warnDays: 7 },
    // 16 oz bag lasts about a month at 2 chews a day ≈ 60 chews
    { label: "Sweet Chews", openedBy: "Opened new Sweet Chews bag", uses: "food", bagSize: 60, unit: "chews",
      perLog: 2, onlyOptions: ["Sweet Chews"], warnDays: 5 },
    // Set bagSize to turn on treat tracking
    { label: "Treats", openedBy: "Opened new treat bag", uses: "treats", bagSize: 0, unit: "treats",
      perLog: 1, onlyOptions: [], warnDays: 5 },
  ],

  NOTIFY: {
    ON_LOG: true,
    ON_NOTE: true,
    SKIP_SENDER: false,
  },

  PUBLIC_DASHBOARD: true,
  SHOW_NOTES: true,
  VACCINE_WARN_DAYS: 30,

  DASHBOARD_URL: "https://puplog-dashboard.vercel.app",
};