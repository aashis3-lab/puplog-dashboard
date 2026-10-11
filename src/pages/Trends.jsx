import { ArrowDown, ArrowUp, CalendarCheck, Clock, Flame, Footprints, Minus, Sparkles, Target, Timer } from "lucide-react";
import { GoalBars, GoalHeatmap } from "../components/charts.jsx";
import { Card, Empty, List, PageHeader, Row, Stat } from "../components/ui.jsx";
import { DAY, ago, minutesToTime, monthYear, plural } from "../format.js";
import { iconFor } from "../icons.js";
import { countWord, fmtNum, listJoin, usuallyPhrase } from "../words.js";

/** Two or three plain-English sentences that sum up the last week. */
function summarySentences(data, ins, A) {
  const pet = data.pet.name;
  if (!ins.fullDays || !ins.goals.length) {
    return [`There isn't a full day of history for ${pet} yet. Check back tomorrow.`];
  }
  const span = ins.fullDays === 1 ? "yesterday" : `the last ${ins.fullDays} days`;
  const out = [];

  if (ins.daysAllMet === ins.fullDays) {
    out.push(`${pet} hit every daily goal ${ins.fullDays === 1 ? "yesterday" : `on all of ${span}`}.`);
  } else if (ins.daysAllMet === 0) {
    out.push(`${pet} didn't hit every daily goal on any of ${span}.`);
  } else {
    out.push(`${pet} hit every daily goal on ${ins.daysAllMet} of ${span}.`);
  }

  const preferred = ["walk", "food"].map(k => ins.goals.find(g => g.key === k)).filter(Boolean);
  const picks = (preferred.length ? preferred : ins.goals.slice(0, 2)).filter(g => g.avgPerDay != null);
  if (picks.length) {
    const parts = picks.map(g => `${fmtNum(g.avgPerDay)} ${countWord(g.key, g.avgPerDay, A[g.key].name)}`);
    out.push(`${pet} is averaging ${listJoin(parts)} a day.`);
  }

  const names = keys => listJoin(keys.map(k => A[k].name.toLowerCase()));
  if (ins.mostMissed) {
    const consistent = ins.mostConsistent && ins.mostConsistent.length <= 2 ? `Most consistent: ${names(ins.mostConsistent)}. ` : "";
    out.push(`${consistent}Most often missed: ${names(ins.mostMissed)}.`);
  }
  return out;
}

function Trend({ now, before }) {
  if (now == null || before == null) return <span className="trend trend--flat"><Minus size={14} aria-hidden="true" />no data before</span>;
  const diff = Math.round((now - before) * 10) / 10;
  if (diff === 0) return <span className="trend trend--flat"><Minus size={14} aria-hidden="true" />same</span>;
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`trend ${diff > 0 ? "trend--up" : "trend--down"}`}>
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" />
      {diff > 0 ? "up" : "down"} {fmtNum(Math.abs(diff))}/day
    </span>
  );
}

export default function Trends({ data }) {
  const ins = data.trends.insights;
  const A = Object.fromEntries(data.actions.map(a => [a.key, a]));

  if (!ins) {
    return (
      <>
        <PageHeader eyebrow={data.pet.name} title="Trends" />
        <Card><Empty icon={Sparkles} title="Update needed">Publish the latest Code.gs in Apps Script to see trends.</Empty></Card>
      </>
    );
  }

  const streak = data.trends.streak;
  const walk = ins.goals.find(g => g.key === "walk");
  const wl = ins.walkLength;
  const sinceDays = data.trackingSince ? Math.max(1, Math.round((Date.now() - new Date(data.trackingSince)) / DAY)) : 0;
  const span = ins.fullDays === 7 ? "last 7 days" : `last ${plural(ins.fullDays, "day")}`;

  return (
    <>
      <PageHeader eyebrow={data.pet.name} title="Trends" subtitle={`How ${data.pet.name}'s routine has been going lately.`} />

      <Card className="summary">
        <span className="summary__icon"><Sparkles size={20} strokeWidth={1.75} aria-hidden="true" /></span>
        <div className="summary__text">
          {summarySentences(data, ins, A).map(s => <p key={s}>{s}</p>)}
        </div>
      </Card>

      <div className="stats stats--auto">
        <Stat icon={Flame} label="Streak" value={plural(streak.current, "day")}
          sub={`in a row with every goal met${streak.todayMet ? ", including today" : ""}`} />
        <Stat icon={Target} label={`Goals met, ${span}`} value={ins.goalsMetPct == null ? "—" : `${ins.goalsMetPct}%`}
          sub="of all daily goals hit" />
        {walk && (
          <Stat icon={Footprints} label="Walks per day" value={fmtNum(walk.avgPerDay)}
            sub={`average over the ${span} · goal ${walk.goal}`} />
        )}
        {wl && (
          <Stat icon={Timer} label="Average walk" value={wl.avgMin == null ? "—" : `${wl.avgMin} min`}
            sub={wl.samples ? `from ${plural(wl.samples, "walk")} in the last 30 days` : "log walk times to see this"} />
        )}
        <Stat icon={CalendarCheck} label="Tracking since" value={data.trackingSince ? monthYear(data.trackingSince) : "—"}
          sub={data.trackingSince ? `${plural(sinceDays, "day")} of history` : "no logs yet"} />
      </div>

      {ins.goals.length > 0 && (
        <Card title="Daily goals, last 7 days" help="Each bar is one day, with the number logged on top. The dashed line is the daily goal. Today is still in progress.">
          <div className="legend">
            <span><i className="swatch swatch--met" />Met the goal</span>
            <span><i className="swatch swatch--short" />Short of the goal</span>
            <span><i className="swatch swatch--today" />Today, so far</span>
          </div>
          <div className="goal-charts">
            {ins.goals.map(g => {
              const Icon = iconFor(g.key);
              return (
                <div key={g.key} className="goal-chart">
                  <div className="goal-chart__head">
                    <span className="goal-chart__name"><Icon size={16} strokeWidth={1.75} aria-hidden="true" />{A[g.key].name}</span>
                    <span className="goal-chart__score">{g.metDays} of {ins.fullDays} days</span>
                  </div>
                  <p className="goal-chart__sub">Goal: {g.goal} a day · averaging {fmtNum(g.avgPerDay)}</p>
                  <GoalBars counts={g.chart} days={ins.chartDays} goal={g.goal} label={A[g.key].name} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="split split--even">
        <Card title="This week vs last week" flush
          help={ins.prevDays ? "Daily averages, so a short week compares fairly. Walks and backyard trips count once per outing." : "Comparisons start once there are two weeks of logs."}>
          <List>
            {ins.compare.map(c => (
              <Row
                key={c.key}
                icon={iconFor(c.key)}
                title={A[c.key].name}
                detail={`${c.thisTotal} this week · ${c.lastTotal} the week before`}
                meta={
                  <span className="meta-stack meta-stack--right">
                    <span className="meta-strong">{fmtNum(c.thisAvg)} a day</span>
                    <Trend now={c.thisAvg} before={ins.prevDays ? c.lastAvg : null} />
                  </span>
                }
              />
            ))}
          </List>
        </Card>

        <Card title="Usual times" icon={Clock} flush help="Typical times of day, from the last 14 days of logs.">
          {data.trends.usualTimes.length ? (
            <List>
              {data.trends.usualTimes.map(u => (
                <Row
                  key={u.key}
                  icon={iconFor(u.key)}
                  title={u.times.length
                    ? `${usuallyPhrase(u.key, A[u.key].name)} ${listJoin(u.times.map(minutesToTime))}`
                    : A[u.key].name}
                  detail={u.times.length ? `from ${plural(u.samples, "log")}` : `Needs a few more days of logs (${plural(u.samples, "log")} so far)`}
                />
              ))}
            </List>
          ) : (
            <Empty title="No usual times set up">Add usualTime: true to an action in Config.gs.</Empty>
          )}
        </Card>
      </div>

      <Card title="Last 3 months" help="Each square is a day, shaded by how many of the daily goals were met. On a computer, hover over a square for details.">
        <GoalHeatmap days={ins.heatmap.days} met={ins.heatmap.met} todayKey={data.todayKey} />
      </Card>

      {ins.other.length > 0 && (
        <Card title="Other activity" flush help="Things you log that don't have a daily goal.">
          <List>
            {ins.other.map(o => (
              <Row
                key={o.key}
                icon={iconFor(o.key)}
                title={A[o.key].name}
                detail={`${o.last7} in the last 7 days · ${o.last30} in the last 30`}
                meta={ago(o.lastAt)}
              />
            ))}
          </List>
        </Card>
      )}
    </>
  );
}
