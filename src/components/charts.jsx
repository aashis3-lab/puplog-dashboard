import { useEffect, useRef, useState } from "react";
import { DAY, dateOf, dayKeyDate, plural, shortDate } from "../format.js";

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

/** Seven small columns with an optional dashed goal line. */
export function WeekBars({ counts, days, goal }) {
  const max = Math.max(goal || 0, ...counts, 1);
  return (
    <div className="weekbars">
      <div className="weekbars__plot">
        {counts.map((n, i) => (
          <div
            key={days[i]}
            className="weekbars__col"
            title={`${dayKeyDate(days[i]).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}: ${n}`}
          >
            <div className={`weekbars__bar ${i === counts.length - 1 ? "is-today" : ""}`} style={{ height: `${(n / max) * 100}%` }} />
          </div>
        ))}
        {goal > 0 && <div className="weekbars__goal" style={{ bottom: `${(goal / max) * 100}%` }} title={`Goal: ${goal} a day`} />}
      </div>
      <div className="weekbars__labels" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d}>{i === days.length - 1 ? "Today" : dayKeyDate(d).toLocaleDateString([], { weekday: "narrow" })}</span>
        ))}
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

/** Calendar heatmap: columns are weeks, rows are weekdays (Sunday first). */
export function Heatmap({ days, counts, todayKey }) {
  const max = Math.max(...counts, 1);
  const lead = dayKeyDate(days[0]).getDay();
  const cols = Math.ceil((lead + days.length) / 7);
  return (
    <div>
      <div className="heatmap" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} className="heatmap__cell is-blank" />)}
        {days.map((d, i) => {
          const n = counts[i];
          const level = n === 0 ? 0 : Math.max(1, Math.ceil((n / max) * 4));
          return (
            <span
              key={d}
              className={`heatmap__cell l${level} ${d === todayKey ? "is-today" : ""}`}
              title={`${dayKeyDate(d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}: ${plural(n, "log")}`}
            />
          );
        })}
      </div>
      <div className="heatmap__legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(l => <span key={l} className={`heatmap__cell l${l}`} />)}
        <span>More</span>
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
