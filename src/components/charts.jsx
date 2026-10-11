import { useEffect, useRef, useState } from "react";
import { DAY, dateOf, dayKeyDate, shortDate } from "../format.js";

/** Width of an element, kept up to date — lets SVG charts draw at real pixel size. */
function useWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Circular progress. `value` is 0..1. */
export function Ring({ value, size = 64, stroke = 5, complete = false, children, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        {value > 0 && (
          <circle
            cx={mid} cy={mid} r={r} fill="none"
            stroke={complete ? "var(--accent-strong)" : "var(--accent)"}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * Math.min(value, 1)} ${c}`}
            transform={`rotate(-90 ${mid} ${mid})`}
          />
        )}
      </svg>
      <div className="ring__center">{children}</div>
    </div>
  );
}

const BAR_SCALE = 78; // % of the plot height used by the tallest bar, leaving room for its number

/** Last 7 days for one goal: a number on every bar, met/short colouring, labelled dashed goal line. */
export function GoalBars({ counts, days, goal, label }) {
  const max = Math.max(goal, ...counts, 1);
  const last = counts.length - 1;
  const dayName = (d, long) => dayKeyDate(d).toLocaleDateString([], long ? { weekday: "long", month: "short", day: "numeric" } : { weekday: "short" });
  const summary = counts.map((n, i) => `${i === last ? "today so far" : dayName(days[i], true)}: ${n}`).join(", ");
  return (
    <div className="gbars" role="img" aria-label={`${label}, last 7 days. Goal ${goal} a day. ${summary}.`}>
      <div className="gbars__plot" aria-hidden="true">
        <div className="gbars__goal" style={{ bottom: `${(goal / max) * BAR_SCALE}%` }}>
          <span>goal<br />{goal}</span>
        </div>
        {counts.map((n, i) => {
          const state = n >= goal ? "met" : i === last ? "today" : "short";
          return (
            <div key={days[i]} className="gbars__col" title={`${i === last ? "Today so far" : dayName(days[i], true)}: ${n} (goal ${goal})`}>
              <span className={`gbars__value is-${state}`}>{n}</span>
              <div className={`gbars__bar is-${state}`} style={{ height: `${(n / max) * BAR_SCALE}%` }} />
            </div>
          );
        })}
      </div>
      <div className="gbars__labels" aria-hidden="true">
        {days.map((d, i) => <span key={d}>{i === last ? "Today" : dayName(d)}</span>)}
      </div>
    </div>
  );
}

/** Weight over time: one series, two gridlines, first/last date labels. */
export function LineChart({ points, unit }) {
  const [ref, W] = useWidth(640);
  const H = W < 480 ? 200 : 240, L = 40, R = 16, T = 28, B = 28;
  const ts = points.map(p => +new Date(p.t));
  const vs = points.map(p => p.v);
  let t0 = Math.min(...ts), t1 = Math.max(...ts);
  if (t0 === t1) { t0 -= 7 * DAY; t1 += 7 * DAY; }
  let v0 = Math.min(...vs), v1 = Math.max(...vs);
  const pad = Math.max((v1 - v0) * 0.2, 1);
  v0 = Math.floor(v0 - pad);
  v1 = Math.ceil(v1 + pad);
  const x = t => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = v => T + (1 - (v - v0) / (v1 - v0)) * (H - T - B);
  const last = points.length - 1;
  return (
    <div ref={ref}>
    <svg className="linechart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Weight over time. Latest ${vs[last]} ${unit} on ${dateOf(ts[last])}.`}>
      {[v0, (v0 + v1) / 2, v1].map(v => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="linechart__grid" />
          <text x={L - 10} y={y(v)} textAnchor="end" dominantBaseline="central" className="linechart__axis">
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}
      <text x={L} y={H - 6} className="linechart__axis">{shortDate(ts[0])}</text>
      {points.length > 1 && <text x={W - R} y={H - 6} textAnchor="end" className="linechart__axis">{shortDate(ts[last])}</text>}
      {points.length > 1 && (
        <polyline className="linechart__line" points={points.map((p, i) => `${x(ts[i])},${y(p.v)}`).join(" ")} />
      )}
      {points.map((p, i) => (
        <g key={p.t}>
          <title>{`${dateOf(p.t)}: ${p.v} ${unit}`}</title>
          <circle cx={x(ts[i])} cy={y(p.v)} r={12} fill="transparent" />
          <circle cx={x(ts[i])} cy={y(p.v)} r={i === last ? 4.5 : 3.5} className="linechart__dot" />
        </g>
      ))}
      <text x={Math.min(x(ts[last]), W - R)} y={y(vs[last]) - 14} textAnchor="end" className="linechart__value">
        {vs[last]} {unit}
      </text>
    </svg>
    </div>
  );
}

const HEAT_LEVELS = [
  { cls: "none", label: "None" },
  { cls: "some", label: "Some" },
  { cls: "most", label: "Most" },
  { cls: "all", label: "All goals met" },
];
function heatLevel(share) {
  if (share == null) return null;
  if (share >= 1) return HEAT_LEVELS[3];
  if (share >= 0.5) return HEAT_LEVELS[2];
  if (share > 0) return HEAT_LEVELS[1];
  return HEAT_LEVELS[0];
}

/** Calendar of the last ~13 weeks: columns are weeks (Sunday on top), shaded by share of goals met. */
export function GoalHeatmap({ days, met, todayKey }) {
  const lead = dayKeyDate(days[0]).getDay();
  const cols = Math.ceil((lead + days.length) / 7);
  const months = [];
  for (let c = 0; c < cols; c++) {
    const i = Math.max(0, c * 7 - lead);
    const m = dayKeyDate(days[Math.min(i, days.length - 1)]).toLocaleDateString([], { month: "short" });
    months.push(c === 0 || months.filter(Boolean).slice(-1)[0] !== m ? m : "");
  }
  return (
    <div className="gheat">
      <div className="gheat__months" style={{ gridTemplateColumns: `repeat(${cols}, var(--cell, 1fr))` }} aria-hidden="true">
        {months.map((m, c) => <span key={c}>{m}</span>)}
      </div>
      <div className="gheat__grid" style={{ gridTemplateColumns: `repeat(${cols}, var(--cell, 1fr))` }}>
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} className="gheat__cell is-blank" />)}
        {days.map((d, i) => {
          const level = heatLevel(met[i]);
          const date = dayKeyDate(d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
          const text = level ? `${Math.round(met[i] * 100)}% of goals met${d === todayKey ? " so far" : ""}` : "not tracked yet";
          return (
            <span key={d} className={`gheat__cell ${level ? `is-${level.cls}` : "is-untracked"} ${d === todayKey ? "is-today" : ""}`} title={`${date}: ${text}`} />
          );
        })}
      </div>
      <div className="gheat__legend">
        {HEAT_LEVELS.map(l => <span key={l.cls}><i className={`gheat__cell is-${l.cls}`} />{l.label}</span>)}
        <span><i className="gheat__cell is-untracked" />Not tracked</span>
      </div>
    </div>
  );
}

export function Meter({ value, warn }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`meter ${warn ? "is-warn" : ""}`} role="img" aria-label={`${Math.round(pct)}% left`}>
      <div className="meter__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
