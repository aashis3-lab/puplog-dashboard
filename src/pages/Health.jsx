import { Pill, Stethoscope, Syringe, Thermometer, Weight } from "lucide-react";
import { LineChart } from "../components/charts.jsx";
import { Badge, Card, DueBadge, Empty, List, PageHeader, Row, Stat, Tabs } from "../components/ui.jsx";
import { navigate } from "../data.js";
import { daysUntil, dateOf, joinParts, monthYear, plural, quoted, shortDate, timeOf } from "../format.js";

const QUICK_LOG_HINT = "Add one with Quick Log.";

function Medications({ meds }) {
  if (!meds.schedule.length && !meds.history.length) {
    return <Card><Empty icon={Pill} title="No medications logged">{QUICK_LOG_HINT}</Empty></Card>;
  }
  return (
    <>
      {meds.schedule.length > 0 && (
        <Card title="Schedule" flush>
          <List>
            {meds.schedule.map(m => (
              <Row
                key={m.name}
                icon={Pill}
                title={m.name}
                detail={m.last
                  ? joinParts([`Last given ${shortDate(m.last.t)} by ${m.last.who}`, m.last.amount, `every ${plural(m.every, "day")}`])
                  : `Not logged yet · every ${plural(m.every, "day")}`}
                meta={m.nextDue ? <DueBadge iso={m.nextDue} warnDays={7} /> : null}
              />
            ))}
          </List>
        </Card>
      )}
      <Card title="History" flush>
        {meds.history.length ? (
          <List>
            {meds.history.map((r, i) => (
              <Row key={`${r.t}-${i}`} title={r.option || "Medication"}
                detail={joinParts([r.who, r.amount, quoted(r.note)])} meta={dateOf(r.t)} />
            ))}
          </List>
        ) : <Empty title="No doses logged yet">{QUICK_LOG_HINT}</Empty>}
      </Card>
    </>
  );
}

function Vaccinations({ vaccines, warnDays }) {
  if (!vaccines.length) return <Card><Empty icon={Syringe} title="No vaccinations logged">{QUICK_LOG_HINT} Past vaccines can be added with their original date.</Empty></Card>;
  return (
    <Card flush>
      <List>
        {vaccines.map(v => (
          <Row
            key={v.name}
            icon={Syringe}
            title={v.name}
            detail={joinParts([`Given ${dateOf(v.given)}`, v.who, quoted(v.note)])}
            meta={v.due ? <DueBadge iso={v.due} warnDays={warnDays} /> : <Badge>No due date</Badge>}
          />
        ))}
      </List>
    </Card>
  );
}

function WeightView({ weight }) {
  const { points, unit } = weight;
  if (!points.length) return <Card><Empty icon={Weight} title="No weight logged">{QUICK_LOG_HINT}</Empty></Card>;
  const last = points[points.length - 1];
  const first = points[0];
  const change = Math.round((last.v - first.v) * 10) / 10;
  return (
    <>
      <div className="stats">
        <Stat label="Range" value={`${Math.min(...points.map(p => p.v))}–${Math.max(...points.map(p => p.v))} ${unit}`} sub="lightest to heaviest" />
        <Stat label="Change" value={points.length > 1 ? `${change > 0 ? "+" : ""}${change} ${unit}` : "—"}
          sub={points.length > 1 ? `since ${monthYear(first.t)}` : "Needs two weigh-ins"} />
        <Stat label="Weigh-ins" value={points.length} sub={`since ${monthYear(first.t)}`} />
      </div>
      <Card title="Over time">
        <LineChart points={points} unit={unit} />
      </Card>
    </>
  );
}

function History({ rows, icon, empty }) {
  if (!rows.length) return <Card><Empty icon={icon} title={empty}>{QUICK_LOG_HINT}</Empty></Card>;
  return (
    <Card flush>
      <List>
        {rows.map((r, i) => (
          <Row key={`${r.t}-${i}`} icon={icon} title={r.option || "Entry"}
            detail={joinParts([r.who, quoted(r.note)])}
            meta={<span className="meta-stack"><span>{dateOf(r.t)}</span><span>{timeOf(r.t)}</span></span>} />
        ))}
      </List>
    </Card>
  );
}

export default function Health({ data, tab }) {
  const h = data.health;
  const tabs = [
    { id: "medications", label: "Medications", count: h.meds.schedule.length || null },
    { id: "vaccinations", label: "Vaccinations", count: h.vaccines.length || null },
    { id: "weight", label: "Weight" },
    { id: "vet", label: "Vet visits", count: h.vet.length || null },
    { id: "symptoms", label: "Symptoms", count: h.symptoms.length || null },
  ];
  const active = tabs.some(t => t.id === tab) ? tab : "medications";

  const nextMed = h.meds.schedule.filter(m => m.nextDue).sort((a, b) => a.nextDue.localeCompare(b.nextDue))[0];
  const vaxDue = h.vaccines.filter(v => v.due && daysUntil(v.due) <= h.vaccineWarnDays).length;
  const lastWeight = h.weight.points[h.weight.points.length - 1];
  const nextMedDays = nextMed ? daysUntil(nextMed.nextDue) : null;

  return (
    <>
      <PageHeader eyebrow={data.pet.name} title="Health" />
      <div className="stats">
        <Stat icon={Pill} label="Next dose"
          value={nextMed ? (nextMedDays < 0 ? "Overdue" : nextMedDays === 0 ? "Today" : `${plural(nextMedDays, "day")}`) : "—"}
          sub={nextMed ? nextMed.name : "No recurring meds logged"} />
        <Stat icon={Syringe} label="Vaccines due soon" value={vaxDue}
          sub={`within ${h.vaccineWarnDays} days`} />
        <Stat icon={Weight} label="Latest weight"
          value={lastWeight ? `${lastWeight.v} ${h.weight.unit}` : "—"}
          sub={lastWeight ? dateOf(lastWeight.t) : "Not logged yet"} />
      </div>

      <Tabs label="Health records" tabs={tabs} active={active} onChange={id => navigate(`health/${id}`)} />

      <div className="tab-panel" role="tabpanel">
        {active === "medications" && <Medications meds={h.meds} />}
        {active === "vaccinations" && <Vaccinations vaccines={h.vaccines} warnDays={h.vaccineWarnDays} />}
        {active === "weight" && <WeightView weight={h.weight} />}
        {active === "vet" && <History rows={h.vet} icon={Stethoscope} empty="No vet visits logged" />}
        {active === "symptoms" && <History rows={h.symptoms} icon={Thermometer} empty="No symptoms logged" />}
      </div>
    </>
  );
}
