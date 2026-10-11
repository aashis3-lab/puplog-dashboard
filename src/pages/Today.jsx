import { Cake, CalendarClock, Inbox, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { Ring } from "../components/charts.jsx";
import { Avatar } from "../components/Sidebar.jsx";
import { Card, Empty, List, PageHeader, Row } from "../components/ui.jsx";
import { ago, amountText, birthdayInfo, dateOf, joinParts, quoted, timeOf } from "../format.js";
import { iconFor } from "../icons.js";

function Profile({ data }) {
  const { pet, today } = data;
  const bday = birthdayInfo(pet.birthday, pet.name);
  return (
    <Card className="profile">
      <div className="profile__id">
        <Avatar pet={pet} size={64} />
        <div>
          <h2 className="profile__name">{pet.name}</h2>
          <p className="profile__meta">{joinParts([pet.breed, bday && bday.age])}</p>
          {bday && (
            <p className="profile__bday">
              <Cake size={14} strokeWidth={1.75} aria-hidden="true" />
              {bday.countdown}
            </p>
          )}
        </div>
      </div>
      {today.score != null && (
        <div className="profile__score">
          <Ring value={today.score / 100} size={88} stroke={6} complete={today.score >= 100} label={`Day score ${today.score}%`}>
            <span className="ring__value ring__value--lg">{today.score}<small>%</small></span>
          </Ring>
          <div>
            <p className="profile__score-label">Day score</p>
            <p className="profile__score-sub">
              {today.goals.filter(g => g.count >= g.goal).length} of {today.goals.length} goals met
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function Goals({ data, A }) {
  if (!data.today.goals.length) return null;
  return (
    <div className="goals">
      {data.today.goals.map(g => {
        const a = A[g.key];
        const Icon = iconFor(g.key);
        const met = g.count >= g.goal;
        const last = data.today.last[g.key];
        return (
          <div className="goal" key={g.key}>
            <div className="goal__head">
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{a.name}</span>
            </div>
            <Ring value={g.count / g.goal} size={72} stroke={5} complete={met} label={`${a.name}: ${g.count} of ${g.goal}`}>
              <span className="ring__value">{g.count}<small>/{g.goal}</small></span>
            </Ring>
            <p className={`goal__foot ${met ? "is-met" : ""}`}>
              {met ? "Goal met" : last ? `Last ${ago(last.t).toLowerCase()}` : "Not yet today"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function greeting(now) {
  const h = now.getHours();
  if (h < 5) return { text: "Good night", icon: Moon };
  if (h < 12) return { text: "Good morning", icon: Sunrise };
  if (h < 17) return { text: "Good afternoon", icon: Sun };
  if (h < 21) return { text: "Good evening", icon: Sunset };
  return { text: "Good night", icon: Moon };
}

export default function Today({ data }) {
  const A = Object.fromEntries(data.actions.map(a => [a.key, a]));
  const daily = data.actions.filter(a => a.group === "daily");
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow={dateOf(now, { weekday: "long", month: "long", day: "numeric" })}
        title={greeting(now).text}
        icon={greeting(now).icon}
        subtitle={`Here's how ${data.pet.name}'s day is going.`}
      />
      <Profile data={data} />
      <Goals data={data} A={A} />

      <div className="split">
        <Card title="Timeline" flush>
          {data.today.timeline.length ? (
            <List>
              {data.today.timeline.map((item, i) => (
                <Row
                  key={`${item.t}-${i}`}
                  icon={iconFor(item.action)}
                  title={`${item.who} ${item.label}`}
                  detail={joinParts([
                    item.option,
                    amountText(item.amount, item.unit),
                    item.due && `next due ${dateOf(item.due)}`,
                    quoted(item.note),
                  ])}
                  meta={<time dateTime={item.t}>{timeOf(item.t)}</time>}
                />
              ))}
            </List>
          ) : (
            <Empty icon={Inbox} title="Nothing logged yet today">Tap a tag or use Quick Log — entries appear here as they happen.</Empty>
          )}
        </Card>

        <Card title="Time since last" icon={CalendarClock} flush>
          <List>
            {daily.map(a => {
              const last = data.today.last[a.key];
              return (
                <Row
                  key={a.key}
                  icon={iconFor(a.key)}
                  title={a.name}
                  detail={last ? joinParts([last.who, last.option]) : "No logs yet"}
                  meta={last ? ago(last.t) : "—"}
                />
              );
            })}
          </List>
        </Card>
      </div>
    </>
  );
}
