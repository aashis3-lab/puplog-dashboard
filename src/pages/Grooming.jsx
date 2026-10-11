import { Scissors } from "lucide-react";
import { Card, DueBadge, Empty, List, PageHeader, Row, Stat } from "../components/ui.jsx";
import { daysUntil, joinParts, plural, shortDate } from "../format.js";

export default function Grooming({ data }) {
  const items = data.grooming;
  if (!items.length) {
    return (
      <>
        <PageHeader eyebrow={data.pet.name} title="Grooming" />
        <Card><Empty icon={Scissors} title="No grooming set up">Add grooming choices in Config.gs.</Empty></Card>
      </>
    );
  }

  const scheduled = items.filter(g => g.nextDue).sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const next = scheduled[0];
  const overdue = scheduled.filter(g => daysUntil(g.nextDue) < 0).length;
  const lastDone = items.filter(g => g.last).sort((a, b) => b.last.t.localeCompare(a.last.t))[0];

  return (
    <>
      <PageHeader eyebrow={data.pet.name} title="Grooming" />
      <div className="stats">
        <Stat label="Next up" value={next ? next.name : "—"}
          sub={next ? (daysUntil(next.nextDue) < 0 ? "Overdue" : `Due ${shortDate(next.nextDue)}`) : "Log a grooming session to start"} />
        <Stat label="Overdue" value={overdue} sub={overdue ? "Needs attention" : "All on schedule"} />
        <Stat label="Last session" value={lastDone ? lastDone.name : "—"}
          sub={lastDone ? joinParts([shortDate(lastDone.last.t), lastDone.last.who]) : "Nothing logged yet"} />
      </div>
      <Card flush>
        <List>
          {items.map(g => {
            const since = g.last ? -daysUntil(g.last.t) : null;
            return (
              <Row
                key={g.name}
                icon={Scissors}
                title={g.name}
                detail={g.last
                  ? joinParts([since === 0 ? "Done today" : `Done ${plural(since, "day")} ago`, g.last.who, g.every && `every ${plural(g.every, "day")}`])
                  : joinParts(["Not logged yet", g.every && `every ${plural(g.every, "day")}`])}
                meta={g.nextDue ? <DueBadge iso={g.nextDue} warnDays={3} /> : null}
              />
            );
          })}
        </List>
      </Card>
    </>
  );
}
