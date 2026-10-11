import { Package, PackageOpen, TriangleAlert } from "lucide-react";
import { Meter } from "../components/charts.jsx";
import { Badge, Card, Empty, PageHeader } from "../components/ui.jsx";
import { joinParts, plural, shortDate } from "../format.js";

function Supply({ s }) {
  if (s.status === "no-bag-size") {
    return (
      <Card title={s.label}>
        <Empty icon={Package} title="Bag size not set">Set the {s.label.toLowerCase()} bag size in Config.gs to track what's left.</Empty>
      </Card>
    );
  }
  if (s.status === "never-opened") {
    return (
      <Card title={s.label}>
        <Empty icon={PackageOpen} title="Waiting for a new bag">Log “{s.openedBy}” in Quick Log when you open the next bag.</Empty>
      </Card>
    );
  }
  const pct = s.remaining / s.bagSize;
  return (
    <Card title={s.label} action={s.warn ? <Badge tone="warning" icon={TriangleAlert}>Restock soon</Badge> : null}>
      <p className="supply__amount">
        <span className="supply__value">{s.remaining}</span>
        <span className="supply__unit">{s.unit} left of {s.bagSize}</span>
      </p>
      <Meter value={pct} warn={s.warn} />
      <p className="supply__meta">
        {joinParts([
          `${Math.round(pct * 100)}% remaining`,
          s.daysLeft != null && `about ${plural(s.daysLeft, "day")} at this pace`,
        ])}
      </p>
      <p className="supply__meta">Opened {shortDate(s.openedAt)} by {s.openedWho} · {s.used} {s.unit} used</p>
    </Card>
  );
}

export default function Supplies({ data }) {
  return (
    <>
      <PageHeader eyebrow={data.pet.name} title="Supplies" />
      {data.supplies.length ? (
        <div className="grid-2">
          {data.supplies.map(s => <Supply key={s.label} s={s} />)}
        </div>
      ) : (
        <Card><Empty icon={Package} title="No supplies tracked">Add bags to SUPPLIES in Config.gs.</Empty></Card>
      )}
      <p className="footnote">Estimates use the portions you log since the bag was opened. Meals without a portion count as one serving.</p>
    </>
  );
}
