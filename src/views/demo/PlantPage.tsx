import { useState } from "react";
import { useDemo, can, bookService, completeService } from "../../demo/store";
import { job, machineUse, person, serviceDiary, serviceView, servicesOf, sum, customer } from "../../demo/derive";
import { TODAY, dLong, dMed, dShort, euro, num, plural } from "../../demo/format";
import { go, select, useRoute } from "../../demo/router";
import { openPrint, toast } from "../../demo/ui";
import type { DemoState, Machine } from "../../demo/types";
import { Btn, Card, Chip, Detail, Field, IC, Kv, PageHead, Section, grid } from "./ui";

export default function PlantPage() {
  const r = useRoute();
  if (r.tab === "service") return <ServiceTab />;
  if (r.tab === "insurance") return <InsuranceTab />;
  return <MachinesTab />;
}

const dueChip = (rem: number, booked: boolean) => booked ? <Chip tone="sel">Service booked</Chip> : rem <= 25 ? <Chip tone="attn">{rem} h to service</Chip> : <Chip>{rem} h to service</Chip>;

function MachinesTab() {
  const s = useDemo();
  const r = useRoute();
  const sel = s.machines.find(m => m.id === r.id);
  return (
    <div className="rt-page">
      <PageHead title="Machines" sub="Six machines, each with its meter, jobs, service history and papers." />
      <div className="rt-split">
        <Card title="Plant">
          {s.machines.map(m => {
            const v = serviceView(s, m);
            const u = machineUse(s, m.id);
            return (
              <button key={m.id} type="button" className="rt-row" aria-selected={sel?.id === m.id} onClick={() => select(m.id)} style={grid("minmax(0,1.4fr) 110px auto", "minmax(0,1fr) auto")}>
                <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{m.id} {m.name}</span><span className="rt-cell-s" style={{ display: "block" }}>{euro(m.rateCents)}/h with operator · {u.novH ? u.novH + " h in November" : "idle in November"}</span></span>
                <span className="rt-cell rt-num rt-hide-mobile">{num(v.meter.hours)} h</span>
                <span>{dueChip(v.remaining, !!v.booked)}</span>
              </button>
            );
          })}
        </Card>
        <Detail open={!!sel} backLabel="Machines">
          {sel ? <MachineDetail s={s} m={sel} /> : <Card pad title="Pick a machine"><div className="rt-muted" style={{ fontSize: 13 }}>Its meter, service history, jobs and documents show here.</div></Card>}
        </Detail>
      </div>
    </div>
  );
}

function MachineDetail({ s, m }: { s: DemoState; m: Machine }) {
  const v = serviceView(s, m);
  const u = machineUse(s, m.id);
  const hist = servicesOf(s, m.id);
  const costs = s.costs.filter(c => c.machineId === m.id);
  const readings = s.meters.filter(x => x.machineId === m.id).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Card>
      <div className="rt-card-h" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="rt-label">{m.id}</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5 }}>{m.name}</div>
          <div className="rt-muted" style={{ fontSize: 13, marginTop: 3 }}>{euro(m.rateCents)} an hour with operator</div>
        </div>
        {dueChip(v.remaining, !!v.booked)}
      </div>
      <div className="rt-card-b">
        <Kv items={[
          ["Meter", num(v.meter.hours) + " h"], ["Read", dShort(v.meter.date) + ", " + person(s, v.meter.byId)!.first],
          ["Next service", num(m.nextServiceAt) + " h"], ["Booked", v.booked ? dShort(v.booked.date) : "Not yet"],
          ["Logged on jobs", u.totalH + " h"], ["Last on a job", u.lastDay ? dShort(u.lastDay) : "None"],
        ]} />
        <div className="rt-help">The meter is read on the machine. Late diary entries don’t move it.</div>
        <Section label="Meter readings">
          {readings.map(x => <div key={x.id} className="rt-inline" style={{ fontSize: 13, padding: "4px 0", flexWrap: "nowrap" }}><span style={{ width: 96 }} className="rt-muted">{dShort(x.date)}</span><span className="rt-num rt-strong" style={{ width: 80 }}>{num(x.hours)} h</span><span className="rt-faint" style={{ flex: 1, minWidth: 0 }}>{x.note}</span></div>)}
        </Section>
        <Section label="Service history">
          <div className="rt-tl">
            {v.booked && <div className="rt-tl-i attn"><div style={{ fontSize: 13 }}>Service booked for {dShort(v.booked.date)} with {person(s, v.booked.byId)!.first}</div><div className="rt-faint" style={{ fontSize: 12 }}>Due at {num(m.nextServiceAt)} h</div></div>}
            {hist.filter(x => x.status === "done").map(x => (
              <div key={x.id} className="rt-tl-i sel">
                <div style={{ fontSize: 13 }}>{x.kind === "repair" ? "Repair" : "Service"}: {x.notes}</div>
                <div className="rt-faint" style={{ fontSize: 12 }}>{dShort(x.date)} · {num(x.meterAt || 0)} h · {person(s, x.byId)!.first}{x.costId ? " · parts " + euro(s.costs.find(c => c.id === x.costId)!.amountCents) : ""}</div>
                {x.costId && <button type="button" className="rt-link" style={{ fontSize: 12 }} onClick={() => go({ page: "costs", tab: "receipts", id: x.costId })}>Parts receipt {s.costs.find(c => c.id === x.costId)!.reference}</button>}
              </div>
            ))}
          </div>
        </Section>
        {u.jobsUsed.length > 0 && (
          <Section label="Jobs">
            <div className="rt-inline">{u.jobsUsed.slice().sort().reverse().map(jid => <Btn key={jid} sm onClick={() => go({ page: "jobs", tab: "jobs", id: jid })}>{jid} {job(s, jid)!.name}</Btn>)}</div>
          </Section>
        )}
        <Section label="Documents">
          <div className="rt-inline">
            <Btn sm icon={IC.shield} onClick={() => openPrint("policy", m.policyId)}>Plant policy schedule</Btn>
            {costs.map(c => <Btn key={c.id} sm icon={IC.receipt} onClick={() => openPrint("doc", c.docId)}>{c.reference} · {euro(c.amountCents)}</Btn>)}
          </div>
        </Section>
        <div className="rt-inline" style={{ marginTop: 16 }}>
          <Btn kind="p" onClick={() => go({ page: "plant", tab: "service", id: m.id })}>Service diary</Btn>
        </div>
      </div>
    </Card>
  );
}

function ServiceTab() {
  const s = useDemo();
  const r = useRoute();
  const list = serviceDiary(s);
  const sel = list.find(v => v.m.id === (r.id || list[0].m.id))!;
  return (
    <div className="rt-page">
      <PageHead title="Service diary" sub="Sorted by meter hours left before the next service. The closest one is at the top." />
      <div className="rt-split">
        <Card title="Hours to next service">
          {list.map(v => (
            <button key={v.m.id} type="button" className="rt-row" aria-selected={sel.m.id === v.m.id} onClick={() => select(v.m.id)} style={grid("minmax(0,1fr) 120px")}>
              <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{v.m.id} {v.m.short}</span><span className="rt-cell-s" style={{ display: "block" }}>{num(v.meter.hours)} h now · due at {num(v.m.nextServiceAt)} h{v.booked ? " · booked " + dShort(v.booked.date) : ""}</span></span>
              <span style={{ textAlign: "right" }}>{dueChip(v.remaining, !!v.booked)}</span>
            </button>
          ))}
        </Card>
        <Detail open={!!r.id} backLabel="Service diary">
          <ServiceDetail s={s} m={sel.m} key={sel.m.id} />
        </Detail>
      </div>
    </div>
  );
}

function ServiceDetail({ s, m }: { s: DemoState; m: Machine }) {
  const v = serviceView(s, m);
  const next = s.jobs.filter(j => j.status === "scheduled" && j.workdays[0] >= TODAY).sort((a, b) => a.workdays[0].localeCompare(b.workdays[0]))[0];
  const [date, setDate] = useState("2026-11-24");
  const [who, setWho] = useState("P-RYAN");
  const allowed = can(s, "bookService");
  return (
    <Card>
      <div className="rt-card-h" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="rt-label">{m.id} · {m.name}</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px", marginTop: 5 }}>{v.remaining} meter hours to service</div>
          <div className="rt-muted" style={{ fontSize: 13, marginTop: 3 }}>{num(v.meter.hours)} h read on {dShort(v.meter.date)}, due at {num(m.nextServiceAt)} h</div>
        </div>
        {dueChip(v.remaining, !!v.booked)}
      </div>
      <div className="rt-card-b">
        <Kv items={[
          ["Previous service", v.last ? dShort(v.last.date) + ", " + num(v.last.meterAt || 0) + " h" : "None"],
          ["Since then", v.lastAny && v.lastAny.id !== v.last?.id ? "Repair " + dShort(v.lastAny.date) : "No repairs"],
          ["Interval", m.intervalH + " h"],
          ["Next booking", v.booked ? dShort(v.booked.date) + ", " + person(s, v.booked.byId)!.first : "Not booked"],
        ]} />
        {m.id === "PL-01" && next && (
          <div className={"rt-note" + (v.booked ? " sel" : " attn")} style={{ marginTop: 14 }}>
            {next.id} {next.name} for {customer(s, next.customerId)!.name} starts {dLong(next.workdays[0])} and needs this machine{v.booked ? ". The service on " + dShort(v.booked.date) + " comes first." : ". At about eight hours a day it would pass the service point on the first morning."}
          </div>
        )}
        {!v.booked ? (
          <Section label="Book the service">
            <div className="rt-cols c2" style={{ alignItems: "end" }}>
              <Field label="Day" help={m.id === "PL-01" ? "Tue 24 Nov is free before Oakfield." : undefined}>
                <input className="rt-input" type="date" min={TODAY} value={date} onChange={e => setDate(e.target.value)} />
              </Field>
              <Field label="Who does it">
                <select className="rt-input" value={who} onChange={e => setWho(e.target.value)}>
                  {s.people.filter(p => p.crew !== "external").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="rt-inline" style={{ marginTop: 12 }}>
              <Btn kind="p" icon={IC.cal} disabled={!allowed || !date} onClick={() => { bookService(m.id, date, who); toast(m.id + " service booked for " + dShort(date) + ". Added to Work."); }}>Book service</Btn>
              {!allowed && <span className="rt-faint" style={{ fontSize: 12 }}>Only Ryan books services.</span>}
            </div>
          </Section>
        ) : (
          <Section label="Booked">
            <div className="rt-note sel">Scheduled for {dLong(v.booked.date)} with {person(s, v.booked.byId)!.name}. The {v.remaining} hours stay on the clock until the service is recorded.</div>
            <div className="rt-inline" style={{ marginTop: 12 }}>
              <Btn kind="p" icon={IC.check} disabled={!allowed} onClick={() => { completeService(m.id); toast(m.id + " service recorded."); }}>Record service done</Btn>
              <Btn onClick={() => go({ page: "work", tab: "today" })}>See it in Work</Btn>
            </div>
          </Section>
        )}
        <Section label="History">
          {servicesOf(s, m.id).filter(x => x.status === "done").map(x => (
            <div key={x.id} className="rt-inline" style={{ fontSize: 13, padding: "5px 0", flexWrap: "nowrap", alignItems: "flex-start" }}>
              <span className="rt-muted" style={{ width: 92, flex: "none" }}>{dShort(x.date)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{x.kind === "repair" ? "Repair: " : ""}{x.notes} <span className="rt-faint">· {num(x.meterAt || 0)} h</span></span>
              {x.costId && <Btn sm icon={IC.receipt} onClick={() => openPrint("doc", s.costs.find(c => c.id === x.costId)!.docId)}>Receipt</Btn>}
            </div>
          ))}
        </Section>
      </div>
    </Card>
  );
}

function InsuranceTab() {
  const s = useDemo();
  const p = s.policies[0];
  const ins = s.instalments.filter(i => i.policyId === p.id);
  const paid = ins.filter(i => i.status === "paid");
  return (
    <div className="rt-page">
      <PageHead title="Insurance" sub={"One policy covers all six machines. It renews on " + dLong(p.renews) + " and is paid monthly."}
        actions={<Btn icon={IC.print} onClick={() => openPrint("policy", p.id)}>Open the schedule</Btn>} />
      <div className="rt-split">
        <div className="rt-stack">
          <Card>
            <div className="rt-card-h"><div style={{ flex: 1 }}><div className="rt-label">{p.insurer} · {p.reference}</div><div style={{ fontSize: 20, fontWeight: 600, marginTop: 5, letterSpacing: "-.4px" }}>{p.name}</div></div><Chip tone="sel">In force</Chip></div>
            <div className="rt-card-b">
              <Kv items={[["Started", dMed(p.starts)], ["Renews", dMed(p.renews)], ["Monthly", euro(p.monthlyCents)], ["Paid so far", euro(sum(paid.map(i => i.amountCents)))], ["Machines", String(p.machineIds.length)]]} />
            </div>
          </Card>
          <Card title="Machines covered">
            {p.machineIds.map(mid => (
              <button key={mid} type="button" className="rt-row" onClick={() => go({ page: "plant", tab: "machines", id: mid })} style={grid("70px minmax(0,1fr)")}>
                <span className="rt-cell rt-strong">{mid}</span><span className="rt-cell">{s.machines.find(m => m.id === mid)!.name}</span>
              </button>
            ))}
          </Card>
        </div>
        <Card title="Monthly payments" sub={plural(paid.length, "paid") + ", " + plural(ins.length - paid.length, "to come") + " before renewal"}>
          {ins.map(i => (
            <div key={i.id} className="rt-row static" style={grid("100px minmax(0,1fr) auto")}>
              <span className="rt-cell">{dShort(i.date)}</span>
              <span className="rt-cell">{i.costId ? <button type="button" className="rt-link" onClick={() => go({ page: "costs", tab: "receipts", id: i.costId })}>Linked to cost {i.costId}</button> : i.status === "paid" ? <span className="rt-faint">Paid before Pulse</span> : <span className="rt-faint">Due</span>}</span>
              <span>{i.status === "paid" ? <Chip tone="ok">{euro(i.amountCents)} paid</Chip> : <Chip>{euro(i.amountCents)}</Chip>}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

