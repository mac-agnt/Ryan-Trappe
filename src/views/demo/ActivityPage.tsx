import { useState } from "react";
import { useDemo } from "../../demo/store";
import { actorName, AGENT_NAMES, job } from "../../demo/derive";
import { dLong, stampDate, stampTime, plural, dShort } from "../../demo/format";
import { go, useRoute } from "../../demo/router";
import type { ActivityEvent, DemoState, EventSource } from "../../demo/types";
import { Card, Chip, Empty, PageHead, Section, grid } from "./ui";

export default function ActivityPage() {
  const r = useRoute();
  return r.tab === "sources" ? <SourcesTab /> : <TimelineTab />;
}

const kindOf = (s: DemoState, e: ActivityEvent): "person" | "agent" | "outside" =>
  AGENT_NAMES[e.actor] ? "agent" : s.people.some(p => p.id === e.actor) ? "person" : "outside";

function TimelineTab() {
  const s = useDemo();
  const [who, setWho] = useState("all");
  const [src, setSrc] = useState("all");
  const [jb, setJb] = useState("all");
  const people = s.people.filter(p => s.events.some(e => e.actor === p.id));
  const agents = Object.keys(AGENT_NAMES).filter(a => s.events.some(e => e.actor === a));
  const sources = Array.from(new Set(s.events.map(e => e.source))).sort();
  const jobs = Array.from(new Set(s.events.map(e => e.jobId).filter(Boolean))) as string[];
  const shown = s.events.filter(e => (who === "all" || e.actor === who) && (src === "all" || e.source === src) && (jb === "all" || e.jobId === jb))
    .slice().reverse().sort((a, b) => b.at.localeCompare(a.at));
  const days: [string, ActivityEvent[]][] = [];
  shown.forEach(e => { const d = stampDate(e.at); const g = days.find(x => x[0] === d); if (g) g[1].push(e); else days.push([d, [e]]); });
  const sel = { height: 34, width: "auto", minWidth: 150 } as const;
  return (
    <div className="rt-page">
      <PageHead title="Timeline" sub="Diary approvals, invoices, payments, imports, reminders and plant work in one order. Each line opens the record it changed." />
      <Card>
        <div className="rt-card-h" style={{ flexWrap: "wrap", gap: 8 }}>
          <select className="rt-input" style={sel} value={who} onChange={e => setWho(e.target.value)} aria-label="Person or agent">
            <option value="all">Everyone</option>
            <optgroup label="People">{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
            <optgroup label="Agents">{agents.map(a => <option key={a} value={a}>{AGENT_NAMES[a]}</option>)}</optgroup>
          </select>
          <select className="rt-input" style={sel} value={src} onChange={e => setSrc(e.target.value)} aria-label="Source">
            <option value="all">Every source</option>{sources.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <select className="rt-input" style={sel} value={jb} onChange={e => setJb(e.target.value)} aria-label="Job">
            <option value="all">Every job</option>{jobs.sort().reverse().map(j => <option key={j} value={j}>{j} {job(s, j)?.name}</option>)}
          </select>
          <span className="rt-sp" />
          <span className="rt-faint" style={{ fontSize: 12 }}>{plural(shown.length, "event")}</span>
        </div>
        {days.map(([d, es]) => (
          <div key={d}>
            <div className="rt-row-head"><span className="rt-label">{dLong(d)}</span></div>
            {es.map(e => {
              const k = kindOf(s, e);
              return (
                <button key={e.id} type="button" className="rt-row" onClick={() => go(e.link)} style={grid("46px minmax(0,1fr) auto")}>
                  <span className="rt-cell rt-num rt-faint">{stampTime(e.at)}</span>
                  <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal", fontWeight: 400 }}>{e.text}</span><span className="rt-cell-s" style={{ display: "block" }}>{actorName(s, e.actor)}{e.jobId ? " · " + e.jobId : ""}</span></span>
                  <Chip tone={k === "agent" ? "slate" : k === "person" ? "sel" : undefined}>{e.source}</Chip>
                </button>
              );
            })}
          </div>
        ))}
        {!shown.length && <Empty title="Nothing matches those filters" />}
      </Card>
    </div>
  );
}

const SOURCE_INFO: { key: string; name: string; how: string; match: EventSource[] }[] = [
  { key: "excel", name: "Excel invoice workbook", how: "Simulated historical import. The workbook’s invoices, payments and diary days were brought in once on 2 Nov.", match: ["Excel import"] },
  { key: "email", name: "Email", how: "Sample supplier emails with their bills attached. Each becomes a cost with the email as proof.", match: ["Email"] },
  { key: "paper", name: "Paper receipts", how: "Captured by Ryan with his phone camera. The photo is the proof.", match: ["Paper receipt"] },
  { key: "payments", name: "Manual payment entry", how: "There is no bank feed. Payments are typed in against an invoice and get a receipt.", match: ["Payment"] },
  { key: "outbox", name: "Simulated outbox", how: "Invoices, reminders and handovers are marked as sent here. Nothing leaves the demo.", match: ["Invoice", "Reminder", "Handover"] },
  { key: "diary", name: "Diary", how: "Typed or spoken by the crew, approved by Ryan.", match: ["Diary"] },
];

function SourcesTab() {
  const s = useDemo();
  const r = useRoute();
  return (
    <div className="rt-page">
      <PageHead title="Sources" sub="Where every record came from. No accounting package or bank feed is connected." />
      <div className="rt-cols c2">
        {SOURCE_INFO.map(x => {
          const evs = s.events.filter(e => x.match.includes(e.source)).reverse().sort((a, b) => b.at.localeCompare(a.at));
          const sent = x.key === "outbox" ? s.outbox.length : 0;
          return (
            <Card key={x.key} title={x.name} sub={x.how} right={<Chip tone={r.id === x.key ? "sel" : undefined}>{plural(evs.length, "event")}</Chip>}>
              {x.key === "outbox" && <div className="rt-card-b" style={{ paddingBottom: 6 }}><span className="rt-muted" style={{ fontSize: 12.5 }}>{sent ? plural(sent, "item") + " in the outbox" : "Outbox empty"}</span></div>}
              {evs.slice(0, 4).map(e => (
                <button key={e.id} type="button" className="rt-row" onClick={() => go(e.link)} style={grid("78px minmax(0,1fr)")}>
                  <span className="rt-cell rt-faint">{dShort(stampDate(e.at)).slice(4)}</span>
                  <span className="rt-cell wrap" style={{ fontSize: 12.5 }}>{e.text}</span>
                </button>
              ))}
              {!evs.length && <Empty title="No events yet" />}
            </Card>
          );
        })}
      </div>
      <Section label="Outbox">
        <Card>
          {s.outbox.slice().reverse().map(o => (
            <div key={o.id} className="rt-row static" style={grid("120px minmax(0,1fr) auto")}>
              <span className="rt-cell rt-faint">{dShort(stampDate(o.at))} {stampTime(o.at)}</span>
              <span className="rt-cell">{o.subject} → {o.to}</span>
              <Chip>{o.kind}</Chip>
            </div>
          ))}
          {!s.outbox.length && <Empty title="Nothing sent yet">Sent invoices, reminders and handovers appear here.</Empty>}
        </Card>
      </Section>
    </div>
  );
}
