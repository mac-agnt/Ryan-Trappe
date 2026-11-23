import { useState } from "react";
import { useDemo, completeCallback, scheduleCallback, completeTask } from "../../demo/store";
import { approvals, customer, doneTasks, openTasks, person } from "../../demo/derive";
import { TODAY, addDays, dShort, euro, plural, stampLabel, stampRelative } from "../../demo/format";
import { go, select, useRoute } from "../../demo/router";
import { openInvoice, openRecord, toast } from "../../demo/ui";
import type { DemoState, Task } from "../../demo/types";
import { Avatar, Btn, Card, Chip, Detail, Empty, Field, IC, Icon, Kv, PageHead, Section, Seg, grid } from "./ui";

export default function WorkPage() {
  const r = useRoute();
  if (r.tab === "approvals") return <ApprovalsTab />;
  if (r.tab === "callbacks") return <CallbacksTab />;
  return <TodayTab />;
}

const dueLabel = (d: string) => d === TODAY ? "Today" : d === addDays(TODAY, 1) ? "Tomorrow" : d < TODAY ? "Late, " + dShort(d) : dShort(d);
const labelTone = (l: Task["label"]) => l === "Billing" ? "sel" as const : l === "Plant" ? "slate" as const : undefined;

/** Opening a task takes you to the action itself. */
export function openTask(s: DemoState, t: Task) {
  if (t.key.startsWith("invoice:")) {
    const inv = s.invoices.find(i => i.jobId === t.key.slice(8));
    if (inv) { go({ page: "jobs", tab: "ready", id: inv.jobId }); openInvoice(inv.id); return; }
  }
  go(t.link);
}

function TaskRow({ s, t }: { s: DemoState; t: Task }) {
  const p = person(s, t.ownerId)!;
  const simple = !/^(diary|chase|invoice|handover|service|callback):/.test(t.key);
  return (
    <div className="rt-row" role="button" tabIndex={0} onClick={() => openTask(s, t)} onKeyDown={e => { if (e.key === "Enter") openTask(s, t); }} style={grid("30px minmax(0,1fr) auto")}>
      <Avatar initials={p.initials} sel={p.id === "P-RYAN"} />
      <span style={{ minWidth: 0 }}>
        <span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal" }}>{t.title}</span>
        <span className="rt-inline" style={{ marginTop: 5, gap: 6 }}>
          <Chip tone={labelTone(t.label)}>{t.label}</Chip>
          {t.priority === "high" && <Chip tone="attn">High</Chip>}
          {t.status === "scheduled" && <Chip tone="slate">Scheduled</Chip>}
          <span className="rt-faint" style={{ fontSize: 12 }}>{p.first} · {dueLabel(t.due)}</span>
        </span>
      </span>
      {simple ? <span onClick={e => e.stopPropagation()}><Btn sm onClick={() => { completeTask(t.id); toast("Done: " + t.title); }}>Done</Btn></span> : <Icon d={IC.arrow} size={15} style={{ color: "var(--faint)" }} />}
    </div>
  );
}

function TodayTab() {
  const s = useDemo();
  const [who, setWho] = useState<"all" | "P-RYAN" | "P-EOIN">("all");
  const open = openTasks(s).filter(t => who === "all" || t.ownerId === who);
  const done = doneTasks(s).slice(0, 8);
  const groups: [string, Task[]][] = [];
  open.forEach(t => { const k = dueLabel(t.due); const g = groups.find(x => x[0] === k); if (g) g[1].push(t); else groups.push([k, [t]]); });
  return (
    <div className="rt-page">
      <PageHead title="Today" sub={open.length ? plural(open.length, "thing") + " to do, by who and when. Opening one takes you to the job itself." : "Nothing open. Done items stay below."} />
      <div className="rt-split wide-l">
        <Card title="To do" right={<Seg value={who} onChange={setWho} label="Owner" options={[["all", "Everyone"], ["P-RYAN", "Ryan"], ["P-EOIN", "Eoin"]]} />}>
          {groups.map(([k, ts]) => (
            <div key={k}>
              <div className="rt-row-head"><span className="rt-label">{k}</span></div>
              {ts.map(t => <TaskRow key={t.id} s={s} t={t} />)}
            </div>
          ))}
          {!open.length && <Empty title="All clear">New work shows up here as it comes in.</Empty>}
        </Card>
        <Card title="Done" sub="Most recent first">
          {done.map(t => (
            <button key={t.id} type="button" className="rt-row" onClick={() => go(t.link)} style={grid("20px minmax(0,1fr)")}>
              <Icon d={IC.check} size={15} sw={2.2} style={{ color: "var(--accent)" }} />
              <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal", fontWeight: 400 }}>{t.title}</span><span className="rt-cell-s" style={{ display: "block" }}>{person(s, t.ownerId)!.first} · {t.doneAt ? stampRelative(t.doneAt) : ""}</span></span>
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ApprovalsTab() {
  const s = useDemo();
  const list = approvals(s);
  const decided = s.events.filter(e => /^(Approved|Sent|Forwarded)/.test(e.text) && e.at.startsWith("2026-11-2")).slice(-6).reverse();
  return (
    <div className="rt-page">
      <PageHead title="Approvals" sub="Diary days, invoices, reminders and handovers wait here for Ryan. Agents draft; nothing goes out without a yes." />
      <div className="rt-split wide-l">
        <Card title={plural(list.length, "item") + " waiting"}>
          {list.map(a => (
            <button key={a.id} type="button" className="rt-row" onClick={() => {
              if (a.kind === "invoice") { go(a.link); openInvoice(a.id); } else go(a.link);
            }} style={grid("minmax(0,1fr) auto")}>
              <span style={{ minWidth: 0 }}>
                <span className="rt-inline" style={{ gap: 6, marginBottom: 4 }}><Chip tone={a.kind === "invoice" || a.kind === "diary" ? "sel" : a.kind === "reminder" ? "attn" : "slate"}>{a.kind === "diary" ? "Diary" : a.kind === "invoice" ? "Invoice" : a.kind === "reminder" ? "Reminder" : "Handover"}</Chip></span>
                <span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal" }}>{a.title}</span>
                <span className="rt-cell-s" style={{ display: "block" }}>{a.sub}</span>
              </span>
              <span style={{ textAlign: "right" }}>{a.amount !== undefined && <span className="rt-strong rt-num" style={{ display: "block" }}>{euro(a.amount)}</span>}<span className="rt-link" style={{ fontSize: 12.5 }}>Open</span></span>
            </button>
          ))}
          {!list.length && <Empty title="Nothing waiting for you">Decisions you made are on the right.</Empty>}
        </Card>
        <Card title="Decided recently">
          {decided.map(e => (
            <button key={e.id} type="button" className="rt-row" onClick={() => go(e.link)} style={grid("minmax(0,1fr)")}>
              <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal", fontWeight: 400 }}>{e.text}</span><span className="rt-cell-s" style={{ display: "block" }}>{stampLabel(e.at)}</span></span>
            </button>
          ))}
          {!decided.length && <Empty title="Nothing yet" />}
        </Card>
      </div>
    </div>
  );
}

function CallbacksTab() {
  const s = useDemo();
  const r = useRoute();
  const waiting = s.callbacks.filter(c => c.status !== "done");
  const done = s.callbacks.filter(c => c.status === "done").sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
  const sel = s.callbacks.find(c => c.id === (r.id || waiting[0]?.id || done[0]?.id));
  return (
    <div className="rt-page">
      <PageHead title="Callbacks" sub="Calls you missed on the machine. Pick a time to ring back and it sits in your work list until it’s done." />
      <div className="rt-split">
        <div className="rt-stack">
          <Card title="Waiting">
            {waiting.map(c => {
              const cust = customer(s, c.customerId)!;
              return (
                <button key={c.id} type="button" className="rt-row" aria-selected={sel?.id === c.id} onClick={() => select(c.id)} style={grid("30px minmax(0,1fr) auto")}>
                  <span className="rt-av"><Icon d={IC.phone} size={14} /></span>
                  <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{c.name}, {cust.name}</span><span className="rt-cell-s" style={{ display: "block" }}>Rang {stampRelative(c.received)}</span></span>
                  <Chip tone={c.callAt ? "sel" : "attn"}>{c.callAt ? "Ring at " + c.callAt : "No time set"}</Chip>
                </button>
              );
            })}
            {!waiting.length && <Empty title="No one waiting">Finished calls are below.</Empty>}
          </Card>
          <Card title="Done">
            {done.map(c => (
              <button key={c.id} type="button" className="rt-row" aria-selected={sel?.id === c.id} onClick={() => select(c.id)} style={grid("20px minmax(0,1fr)")}>
                <Icon d={IC.check} size={15} sw={2.2} style={{ color: "var(--accent)" }} />
                <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{c.name}, {customer(s, c.customerId)!.name}</span><span className="rt-cell-s" style={{ display: "block", whiteSpace: "normal" }}>{c.outcome} · {c.doneAt ? stampRelative(c.doneAt) : ""}</span></span>
              </button>
            ))}
          </Card>
        </div>
        <Detail open={!!r.id} backLabel="Callbacks">
          {sel ? <CallbackDetail s={s} id={sel.id} key={sel.id} /> : <Card pad><Empty title="No callbacks" /></Card>}
        </Detail>
      </div>
    </div>
  );
}

function CallbackDetail({ s, id }: { s: DemoState; id: string }) {
  const c = s.callbacks.find(x => x.id === id)!;
  const cust = customer(s, c.customerId)!;
  const [time, setTime] = useState(c.callAt || "17:30");
  const [outcome, setOutcome] = useState("Rang back, going out to price it on Thursday.");
  return (
    <Card>
      <div className="rt-card-h" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="rt-label">Missed call · {stampLabel(c.received)}</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5 }}>{c.name}, {cust.name}</div>
        </div>
        <Chip tone={c.status === "done" ? "ok" : c.callAt ? "sel" : "attn"}>{c.status === "done" ? "Done" : c.callAt ? "Ring at " + c.callAt : "Waiting"}</Chip>
      </div>
      <div className="rt-card-b">
        <div className="rt-quote">{c.enquiry}</div>
        <div className="rt-inline" style={{ marginTop: 12 }}>
          <Btn sm icon={IC.user} onClick={() => openRecord("customer", cust.id)}>Customer details</Btn>
          <span className="rt-faint" style={{ fontSize: 12 }}>{cust.email}</span>
        </div>
        {c.status !== "done" ? (
          <>
            <Section label="Ring back">
              <div style={{ display: "grid", gridTemplateColumns: "140px auto", gap: 10, alignItems: "end", justifyContent: "start" }}>
                <Field label={"Today, " + dShort(TODAY)}><input className="rt-input" type="time" value={time} onChange={e => setTime(e.target.value)} /></Field>
                <Btn kind={c.callAt ? undefined : "p"} icon={IC.clock} onClick={() => { scheduleCallback(c.id, time); toast("Callback set for " + time + ". It’s in your work list."); }}>{c.callAt ? "Change time" : "Set callback"}</Btn>
              </div>
              <div className="rt-help">Calling is simulated in this demo.</div>
            </Section>
            <Section label="After the call">
              <Field label="What happened"><input className="rt-input" value={outcome} onChange={e => setOutcome(e.target.value)} /></Field>
              <div className="rt-inline" style={{ marginTop: 10 }}>
                <Btn kind={c.callAt ? "p" : undefined} icon={IC.check} onClick={() => { completeCallback(c.id, outcome); toast("Callback marked done."); }}>Mark done</Btn>
              </div>
            </Section>
          </>
        ) : (
          <Section label="Outcome"><Kv items={[["Rang back", c.doneAt ? stampLabel(c.doneAt) : ""], ["Result", c.outcome || ""]]} /></Section>
        )}
      </div>
    </Card>
  );
}
