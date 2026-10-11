// Fixed sky behind the whole app: gradient, drifting illustrated clouds, and stars at night (dark mode).

// A puffy cloud built from overlapping circles on a rounded base, shaded lighter on top.
function Cloud({ variant = 0 }) {
  const shapes = [
    { circles: [[52, 64, 28], [86, 46, 36], [126, 52, 30], [158, 66, 22]], base: [30, 62, 148, 26] },
    { circles: [[46, 60, 22], [74, 44, 28], [108, 36, 34], [144, 50, 26], [170, 64, 16]], base: [28, 58, 154, 24] },
    { circles: [[60, 58, 24], [96, 42, 32], [134, 58, 22]], base: [40, 56, 112, 24] },
  ];
  const s = shapes[variant % shapes.length];
  return (
    <svg viewBox="0 0 200 100" aria-hidden="true" focusable="false">
      <g fill="url(#cloud-fill)">
        {s.circles.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
        <rect x={s.base[0]} y={s.base[1]} width={s.base[2]} height={s.base[3]} rx={s.base[3] / 2} />
      </g>
      <g fill="url(#cloud-shade)">
        <rect x={s.base[0]} y={s.base[1] + s.base[3] * 0.35} width={s.base[2]} height={s.base[3] * 0.65} rx={s.base[3] / 2} />
      </g>
    </svg>
  );
}

// top/left in %, width in px, speed in seconds for one drift cycle.
const CLOUDS = [
  { top: 6, left: -4, width: 260, variant: 0, speed: 140, delay: -20, opacity: 0.95, high: true },
  { top: 14, left: 62, width: 200, variant: 1, speed: 170, delay: -60, opacity: 0.9, high: true },
  { top: 30, left: 30, width: 150, variant: 2, speed: 120, delay: -10, opacity: 0.7, small: true },
  { top: 44, left: 82, width: 280, variant: 0, speed: 190, delay: -90, opacity: 0.85 },
  { top: 58, left: 8, width: 220, variant: 1, speed: 160, delay: -40, opacity: 0.85 },
  { top: 72, left: 52, width: 180, variant: 2, speed: 130, delay: -75, opacity: 0.75, small: true },
  { top: 84, left: 74, width: 320, variant: 1, speed: 210, delay: -30, opacity: 0.95 },
  { top: 88, left: -6, width: 300, variant: 0, speed: 200, delay: -110, opacity: 0.95 },
];

export default function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="cloud-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--cloud-top)" }} />
            <stop offset="1" style={{ stopColor: "var(--cloud-bottom)" }} />
          </linearGradient>
          <linearGradient id="cloud-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--cloud-bottom)", stopOpacity: 0 }} />
            <stop offset="1" style={{ stopColor: "var(--cloud-shadow)", stopOpacity: 0.9 }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="sky__stars" />
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className={`sky__cloud ${c.small ? "sky__cloud--small" : ""} ${c.high ? "sky__cloud--high" : ""}`}
          style={{
            top: `${c.top}%`,
            left: `${c.left}%`,
            width: c.width,
            opacity: c.opacity * 0.85,
            animationDuration: `${c.speed}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <Cloud variant={c.variant} />
        </div>
      ))}
    </div>
  );
}
