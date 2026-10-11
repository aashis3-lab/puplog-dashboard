// Plain-English words for each kind of log, used to write sentences on the Trends page.
// Anything not listed falls back to the action's name from Config.gs.
const WORDS = {
  food: { many: "meals", one: "meal", usually: "Usually fed at" },
  water: { many: "water refills", one: "water refill", usually: "Water usually refilled at" },
  backyard: { many: "backyard trips", one: "backyard trip", usually: "Usually let out back at" },
  walk: { many: "walks", one: "walk", usually: "Usually walked at" },
  potty: { many: "potty breaks", one: "potty break", usually: "Usually goes potty at" },
  treats: { many: "treats", one: "treat" },
  play: { many: "play sessions", one: "play session", usually: "Usually plays at" },
  teeth: { many: "teeth brushings", one: "teeth brushing", usually: "Teeth usually brushed at" },
};

export function countWord(key, n, name) {
  const w = WORDS[key];
  if (!w) return `${name.toLowerCase()}`;
  return n === 1 ? w.one : w.many;
}

export function usuallyPhrase(key, name) {
  return WORDS[key]?.usually || `${name} usually at`;
}

/** 2 → "2", 2.25 → "2.3" */
export const fmtNum = n => (n == null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1));

/** ["a", "b", "c"] → "a, b and c" */
export function listJoin(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
