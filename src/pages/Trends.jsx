import { CalendarDays, Clock, Flame, ListChecks } from "lucide-react";
import { Heatmap, WeekBars } from "../components/charts.jsx";
import { Card, Empty, List, PageHeader, Row, Stat, Tabs } from "../components/ui.jsx";
import { navigate } from "../data.js";
import { dayKeyDate, minutesToTime, monthYear, plural, shortDate } from "../format.js";
import { iconFor } from "../icons.js";

function Week({ t, A }) {
  return (
    <>
      <div className="multiples">
        {t.bars.map(b => {
          const a = A[b.key];
          const Icon = iconFor(b.key);
          return (
            <Card key={b.key} className="mini">
              <div className="mini__head">
                <span className="mini__name"><Icon size={15} strokeWidth={1.75} aria-hidden="true" />{a.name}</span>
                <span className="mini__total">{b.counts.reduce((s, n) => s + n, 0)}</span>
              </div>
              <WeekBars counts={b.counts} days={t.days7} goal={a.goal} />
            </Card>
          );
        })}
      </div>
      <Card title="This week vs last week" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Activity</th><th scope="col" className="num">Last 7 days</th><th scope="col" className="num">Week before</th><th scope="col" className="num">Change</th></tr>
            </thead>
            <tbody>
              {t.weekVsWeek.map(w => {
                const delta = w.thisWeek - w.lastWeek;
                return (
                  <tr key={w.key}>
                    <td>{A[w.key].name}</td>
                    <td className="num">{w.thisWeek}</td>
                    <td className="num">{w.lastWeek}</td>
                    <td className={`num ${delta === 0 ? "muted" : ""}`}>{delta === 0 ? "—" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Activity({ t, A, todayKey }) {
  const total = t.heatmap.counts.reduce((s, n) => s + n, 0);
  return (
    <>
      <Card title="Last 13 weeks" action={<span className="card__note">{shortDate(dayKeyDate(t.heatmap.days[0]))} – today · {plural(total, "log")}</span>}>
        <Heatmap days={t.heatmap.days} counts={t.heatmap.counts} todayKey={todayKey} />
      </Card>
      {t.usualTimes.length > 0 && (
        <Card title="Usual times" icon={Clock} action={<span className="card__note">Last 14 days</span>} flush>
          <List>
            {t.usualTimes.map(u => (
              <Row key={u.key} icon={iconFor(u.key)} title={A[u.key].name}
                detail={u.times.length ? null : `Needs a few more days of logs (${plural(u.samples, "log")} so far)`}
                meta={u.times.length ? <span className="times">{u.times.map(m => <span key={m}>{minutesToTime(m)}</span>)}</span> : null} />
            ))}
          </List>
        </Card>
      )}
    </>
  );
}

function AllTime({ t, A }) {
  const logged = t.totals.filter(x => x.count > 0).sort((a, b) => b.count - a.count);
  if (!logged.length) return <Card><Empty icon={ListChecks} title="Nothing logged yet">Totals appear after the first log.</Empty></Card>;
  const max = logged[0].count;
  return (
    <Card flush>
      <List>
        {logged.map(x => {
          const Icon = iconFor(x.key);
          return (
          <li key={x.key} className="row total">
            <span className="row__icon"><Icon size={16} strokeWidth={1.75} aria-hidden="true" /></span>
            <div className="row__body">
              <p className="row__title">{A[x.key].name}</p>
              <div className="total__bar"><span style={{ width: `${(x.count / max) * 100}%` }} /></div>
            </div>
            <div className="row__meta num">{x.count.toLocaleString()}</div>
          </li>
          );
        })}
      </List>
    </Card>
  );
}

export default function Trends({ data, tab }) {
  const t = data.trends;
  const A = Object.fromEntries(data.actions.map(a => [a.key, a]));
  const tabs = [
    { id: "week", label: "This week" },
    { id: "activity", label: "Activity" },
    { id: "all-time", label: "All time" },
  ];
  const active = tabs.some(x => x.id === tab) ? tab : "week";
  const last7 = t.heatmap.counts.slice(-7).reduce((s, n) => s + n, 0);
  const allTime = t.totals.reduce((s, x) => s + x.count, 0);

  return (
    <>
      <PageHeader eyebrow={data.pet.name} title="Trends" />
      <div className="stats stats--4">
        <Stat icon={Flame} label="Streak" value={`${t.streak.current}${t.streak.capped ? "+" : ""}`}
          sub={`${t.streak.current === 1 ? "day" : "days"} hitting every goal${t.streak.todayMet ? ", incl. today" : ""}`} />
        <Stat icon={CalendarDays} label="Last 7 days" value={last7} sub="logs" />
        <Stat icon={ListChecks} label="All time" value={allTime.toLocaleString()} sub="logs" />
        <Stat label="Tracking since" value={data.trackingSince ? monthYear(data.trackingSince) : "—"} sub={data.trackingSince ? "first log" : "No logs yet"} />
      </div>

      <Tabs label="Trend views" tabs={tabs} active={active} onChange={id => navigate(`trends/${id}`)} />
      <div className="tab-panel" role="tabpanel">
        {active === "week" && <Week t={t} A={A} />}
        {active === "activity" && <Activity t={t} A={A} todayKey={data.todayKey} />}
        {active === "all-time" && <AllTime t={t} A={A} />}
      </div>
    </>
  );
}
