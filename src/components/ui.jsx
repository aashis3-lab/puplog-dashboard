import { CircleAlert, Clock } from "lucide-react";
import { daysUntil, plural } from "../format.js";

export function Card({ title, icon: Icon, action, children, className = "", flush = false }) {
  return (
    <section className={`card ${flush ? "card--flush" : ""} ${className}`}>
      {(title || action) && (
        <header className="card__head">
          <h3 className="card__title">
            {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
            {title}
          </h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, icon: Icon, subtitle, children }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">
          {Icon && <Icon size={28} strokeWidth={1.75} aria-hidden="true" />}
          {title}
        </h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-head__aside">{children}</div>}
    </header>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty__icon">
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div>
        {title && <p className="empty__title">{title}</p>}
        <p className="empty__text">{children}</p>
      </div>
    </div>
  );
}

export function Badge({ tone = "neutral", icon: Icon, children }) {
  return (
    <span className={`badge badge--${tone}`}>
      {Icon && <Icon size={13} strokeWidth={2} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** "Due in 5 days" / "Overdue 2 days", highlighted when within warnDays. */
export function DueBadge({ iso, warnDays }) {
  const n = daysUntil(iso);
  if (n < 0) return <Badge tone="critical" icon={CircleAlert}>Overdue {plural(-n, "day")}</Badge>;
  if (n === 0) return <Badge tone="warning" icon={Clock}>Due today</Badge>;
  if (n <= warnDays) return <Badge tone="warning" icon={Clock}>Due in {plural(n, "day")}</Badge>;
  return <Badge>Due in {plural(n, "day")}</Badge>;
}

export function Tabs({ tabs, active, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className="tabs__tab"
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && <span className="tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon }) {
  return (
    <div className="stat">
      <p className="stat__label">
        {Icon && <Icon size={14} strokeWidth={1.75} aria-hidden="true" />}
        {label}
      </p>
      <p className="stat__value">{value}</p>
      {sub && <p className="stat__sub">{sub}</p>}
    </div>
  );
}

/** A row in a list: optional leading icon, title + detail, trailing meta. */
export function Row({ icon: Icon, title, detail, meta }) {
  return (
    <li className="row">
      {Icon && (
        <span className="row__icon">
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div className="row__body">
        <p className="row__title">{title}</p>
        {detail && <p className="row__detail">{detail}</p>}
      </div>
      {meta != null && <div className="row__meta">{meta}</div>}
    </li>
  );
}

export const List = ({ children }) => <ul className="list">{children}</ul>;
