import { PawPrint, X } from "lucide-react";
import { timeOf } from "../format.js";

export function Avatar({ pet, size = 40 }) {
  const initial = (pet?.name || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {pet?.photo ? (
        <img
          src={pet.photo}
          alt=""
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
      ) : null}
      <span aria-hidden="true">{initial}</span>
    </span>
  );
}

export default function Sidebar({ pages, active, data, open, onClose }) {
  return (
    <>
      <div className={`scrim ${open ? "is-open" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Sections">
        <div className="sidebar__brand">
          <PawPrint size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>PupLog</span>
          <button type="button" className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {data && (
          <div className="sidebar__pet">
            <Avatar pet={data.pet} />
            <div>
              <p className="sidebar__pet-name">{data.pet.name}</p>
              <p className="sidebar__pet-meta">{data.pet.breed || "Care log"}</p>
            </div>
          </div>
        )}

        <nav className="nav">
          {pages.map(p => (
            <a
              key={p.id}
              href={`#/${p.id}`}
              className="nav__item"
              aria-current={active === p.id ? "page" : undefined}
              onClick={onClose}
            >
              <p.icon size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>{p.label}</span>
              {p.alerts > 0 && <span className="nav__alert" aria-label={`${p.alerts} need attention`}>{p.alerts}</span>}
            </a>
          ))}
        </nav>

        {data && (
          <p className="sidebar__foot">
            <span className="live-dot" aria-hidden="true" />
            Updated {timeOf(data.generatedAt)}
          </p>
        )}
      </aside>
    </>
  );
}
