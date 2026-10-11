export const DAY = 864e5;

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const timeOf = d => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const dateOf = (d, opts) =>
  new Date(d).toLocaleDateString([], opts || { month: "short", day: "numeric", year: "numeric" });
export const shortDate = d => dateOf(d, { month: "short", day: "numeric" });
export const monthYear = d => dateOf(d, { month: "long", year: "numeric" });

/** "yyyy-mm-dd" day keys from the backend → local Date at midnight. */
export function dayKeyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const minutesToTime = m => timeOf(new Date(2000, 0, 1, Math.floor(m / 60), m % 60));

export function ago(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min ago` : `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

/** Whole calendar days from today to the given date (negative = past). */
export function daysUntil(iso) {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(iso);
  b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / DAY);
}

export function amountText(amount, unit) {
  if (amount === "" || amount == null) return "";
  return unit ? `${amount} ${unit}` : String(amount);
}

export const joinParts = parts => parts.filter(Boolean).join(" · ");
export const quoted = note => (note ? `“${note}”` : "");

/** Age text and birthday countdown from a "yyyy-mm-dd" birthday. */
export function birthdayInfo(birthday, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday || "")) return null;
  const born = dayKeyDate(birthday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let months = (today.getFullYear() - born.getFullYear()) * 12 + today.getMonth() - born.getMonth();
  if (today.getDate() < born.getDate()) months--;
  months = Math.max(months, 0);
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  const age = yrs ? `${plural(yrs, "year")}${mos ? `, ${plural(mos, "month")}` : ""}` : plural(mos, "month");
  let next = new Date(today.getFullYear(), born.getMonth(), born.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, born.getMonth(), born.getDate());
  const days = Math.round((next - today) / DAY);
  const turning = next.getFullYear() - born.getFullYear();
  const countdown = days === 0 ? `Happy birthday, ${name} — ${turning} today` : `Turns ${turning} in ${plural(days, "day")}`;
  return { age, countdown, isToday: days === 0 };
}
