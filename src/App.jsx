import { useEffect, useMemo, useState } from "react";
import { ChartColumn, CloudOff, HeartPulse, LayoutDashboard, Lock, Menu, Package, Scissors } from "lucide-react";
import Sidebar from "./components/Sidebar.jsx";
import { Empty } from "./components/ui.jsx";
import { useDashboard, useRoute } from "./data.js";
import { daysUntil } from "./format.js";
import Today from "./pages/Today.jsx";
import Health from "./pages/Health.jsx";
import Grooming from "./pages/Grooming.jsx";
import Supplies from "./pages/Supplies.jsx";
import Trends from "./pages/Trends.jsx";

const dueSoon = (iso, days) => iso && daysUntil(iso) <= days;

/** How many things on each page need attention (shown as a count in the side panel). */
function alertCounts(d) {
  if (!d) return {};
  const h = d.health;
  return {
    health:
      h.meds.schedule.filter(m => dueSoon(m.nextDue, 3)).length +
      h.vaccines.filter(v => dueSoon(v.due, h.vaccineWarnDays)).length,
    grooming: d.grooming.filter(g => dueSoon(g.nextDue, 0)).length,
    supplies: d.supplies.filter(s => s.warn).length,
  };
}

export default function App() {
  const { data, error, loading } = useDashboard();
  const [page, tab] = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  const alerts = useMemo(() => alertCounts(data), [data]);
  const pages = [
    { id: "today", label: "Today", icon: LayoutDashboard, Component: Today },
    { id: "health", label: "Health", icon: HeartPulse, Component: Health },
    { id: "grooming", label: "Grooming", icon: Scissors, Component: Grooming },
    { id: "supplies", label: "Supplies", icon: Package, Component: Supplies },
    { id: "trends", label: "Trends", icon: ChartColumn, Component: Trends },
  ].map(p => ({ ...p, alerts: alerts[p.id] || 0 }));
  const current = pages.find(p => p.id === page) || pages[0];

  useEffect(() => {
    document.title = data ? `${current.label} · ${data.pet.name} · PupLog` : "PupLog";
  }, [current.label, data]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = e => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [menuOpen]);

  useEffect(() => { window.scrollTo(0, 0); }, [current.id]);

  let content;
  if (data) {
    content = <current.Component data={data} tab={tab} />;
  } else if (error === "private") {
    content = <Empty icon={Lock} title="This dashboard is private">Open your family link to see it.</Empty>;
  } else if (error === "offline") {
    content = <Empty icon={CloudOff} title="Can't reach PupLog">Check your connection — the page will try again shortly.</Empty>;
  } else if (loading) {
    content = <div className="loading" aria-live="polite"><span className="loading__bar" />Loading</div>;
  }

  return (
    <div className="app">
      <Sidebar pages={pages} active={current.id} data={data} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <span className="topbar__title">{current.label}</span>
          <span className="topbar__spacer" />
        </header>
        <main className="content">{content}</main>
      </div>
    </div>
  );
}
