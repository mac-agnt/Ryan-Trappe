import { useDemo, can, prepareInvoice, approveSubmittedDay } from "../../demo/store";
import {
  coverage, customer, dayAmount, dayFor, invoiceFor, invoiceView, jobDays, machine, person, sum, unbilledCents, unbilledLines, lineAmount, STATE_LABEL,
} from "../../demo/derive";
import { TODAY, addDays, dShort, dRange, dLong, euro, hours, isWeekday, dow, plural } from "../../demo/format";
import { go, select, useRoute } from "../../demo/router";
import { openCapture, openInvoice, openPrint, toast } from "../../demo/ui";
import type { DemoState, Job } from "../../demo/types";
import { Btn, Card, Chip, Detail, Empty, IC, Kv, PageHead, Section, Seg, grid } from "./ui";
import { useEffect, useState } from "react";

export function billing(s: DemoState, j: Job): { label: string; tone: "ok" | "attn" | "sel" | "slate" | undefined } {
  if (j.status === "scheduled") return { label: "Scheduled " + dShort(j.workdays[0]), tone: "slate" };
  const cov = coverage(s, j);
  const inv = invoiceFor(s, j.id);
  if (inv && inv.status === "sent") {
    const v = invoiceView(s, inv);
    if (v.balance <= 0) return { label: "Paid", tone: "ok" };
    return { label: v.overdueDays ? "Owes " + euro(v.balance) + ", overdue" : "Invoiced, " + euro(v.balance) + " open", tone: v.overdueDays ? "attn" : "sel" };
  }
  if (inv) return { label: "Draft " + inv.id, tone: "slate" };
  if (cov.missing.length || cov.submitted.length) return { label: "Paperwork " + cov.approved + " of " + cov.planned, tone: "attn" };
  if (unbilledLines(s, j.id).length) return { label: "Ready to invoice", tone: "sel" };
  return { label: "Open", tone: undefined };
}

export default function JobsPage() {
  const r = useRoute();
  if (r.tab === "diary") return <DiaryTab />;
  if (r.tab === "ready") return <ReadyTab />;
  return <JobsTab />;
}

function JobsTab() {
  const s = useDemo();
  const r = useRoute();
  const [f, setF] = useState<"all" | "open" | "done" | "scheduled">("all");
  const jobs = s.jobs.slice().sort((a, b) => b.id.localeCompare(a.id));
  const isOpen = (j: Job) => j.status !== "scheduled" && billing(s, j).tone !== "ok";
  const shown = jobs.filter(j => f === "all" ? true : f === "open" ? isOpen(j) : f === "done" ? billing(s, j).tone === "ok" : j.status === "scheduled");
  const sel = s.jobs.find(j => j.id === r.id);
  return (
    <div className="rt-page">
      <PageHead title="Jobs" sub="Each job with its dated diary, the machines and operators on it, and where the paperwork stands."
        actions={<Btn kind="p" icon={IC.plus} onClick={() => openCapture({})}>Log a day</Btn>} />
      <div className="rt-split">
        <Card title={plural(shown.length, "job")} right={<Seg value={f} onChange={setF} label="Filter jobs" options={[["all", "All", jobs.length], ["open", "Open", jobs.filter(isOpen).length], ["scheduled", "Scheduled", jobs.filter(j => j.status === "scheduled").length], ["done", "Paid", jobs.filter(j => billing(s, j).tone === "ok").length]]} />}>
          <div className="rt-row-head rt-hide-mobile" style={grid("minmax(0,1.5fr) minmax(0,1fr) 150px")}>
            <span className="rt-label">Job</span><span className="rt-label">Work dates</span><span className="rt-label">Billing</span>
          </div>
          {shown.map(j => {
            const c = customer(s, j.customerId)!;
            const b = billing(s, j);
            return (
              <button key={j.id} type="button" className="rt-row" aria-selected={sel?.id === j.id} onClick={() => select(j.id)} style={grid("minmax(0,1.5fr) minmax(0,1fr) 150px", "minmax(0,1fr) auto")}>
                <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{j.id} {j.name}</span><span className="rt-cell-s" style={{ display: "block" }}>{c.name} · {j.location}</span></span>
                <span className="rt-cell rt-hide-mobile">{dRange(j.workdays)}<span className="rt-faint"> · {plural(j.workdays.length, "day")}</span></span>
                <span><Chip tone={b.tone}>{b.label}</Chip></span>
              </button>
            );
          })}
          {!shown.length && <Empty title="No jobs here">Try another filter.</Empty>}
        </Card>
        <Detail open={!!sel} backLabel="All jobs">
          {sel ? <JobDetail s={s} j={sel} /> : <Card pad title="Pick a job"><div className="rt-muted" style={{ fontSize: 13 }}>Its dated entries, plant, rates and paperwork show here.</div></Card>}
        </Detail>
      </div>
    </div>
  );
}

export function JobDetail({ s, j }: { s: DemoState; j: Job }) {
  const c = customer(s, j.customerId)!;
  const cov = coverage(s, j);
  const days = jobDays(s, j.id);
  const inv = invoiceFor(s, j.id);
  const v = inv ? invoiceView(s, inv) : undefined;
  const lines = days.flatMap(d => d.lines);
  const plant = Array.from(new Set(lines.map(l => l.machineId)));
  const ops = Array.from(new Set(lines.map(l => l.operatorId)));
  const unbilled = unbilledCents(s, j.id);
  const owner = can(s, "approveDiary");
  const workState = j.status === "scheduled" ? "Starts " + dShort(j.workdays[0]) : "Work finished " + dShort(j.finishedOn);
  const paperState = j.status === "scheduled" ? "No diary yet" : cov.missing.length || cov.submitted.length ? "Paperwork " + cov.approved + " of " + cov.planned + " days" : inv && inv.status === "sent" ? "Paperwork complete, invoiced" : "Paperwork ready";
  return (
    <Card>
      <div className="rt-card-h" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rt-label">{j.id}</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5 }}>{j.name}</div>
          <div className="rt-muted" style={{ fontSize: 13, marginTop: 3 }}><button type="button" className="rt-link" onClick={() => go({ page: "records", tab: "directory", id: c.id })}>{c.name}</button> · {j.location}</div>
          <div className="rt-inline" style={{ marginTop: 10 }}>
            <Chip tone={j.status === "scheduled" ? "slate" : "ok"}>{workState}</Chip>
            <Chip tone={cov.missing.length || cov.submitted.length ? "attn" : j.status === "scheduled" ? undefined : "sel"}>{paperState}</Chip>
          </div>
        </div>
      </div>
      <div className="rt-card-b">
        {j.status !== "scheduled" && (
          <div className="rt-cover" style={{ marginBottom: 14 }} aria-label="Diary coverage">
            {j.workdays.map(w => { const x = dayFor(s, j.id, w); return <span key={w} title={dShort(w) + (x ? "" : " missing")} className={!x ? (w > TODAY ? "planned" : "missing") : x.status === "submitted" ? "submitted" : ""} />; })}
          </div>
        )}
        <Kv items={[
          ["Customer", c.name], ["Work dates", dRange(j.workdays)],
          ["Plant", plant.length ? plant.join(", ") : j.id === "J-015" ? "PL-01 planned" : "None yet"],
          ["Operators", ops.length ? ops.map(o => person(s, o)!.first).join(", ") : j.id === "J-015" ? "Ryan planned" : "None yet"],
          ["Approved, not invoiced", euro(unbilled)],
          ["Invoice", inv ? inv.id + " · " + (inv.status === "draft" ? "draft" : STATE_LABEL[v!.state].toLowerCase()) : "None yet"],
        ]} />
        <div className="rt-inline" style={{ marginTop: 14 }}>
          {cov.missing.length > 0 && <Btn kind="p" icon={IC.plus} onClick={() => openCapture({ jobId: j.id, date: cov.missing[0], mode: "sample" })}>Log {dShort(cov.missing[0])}</Btn>}
          {!inv && cov.complete && unbilled > 0 && <Btn kind="p" onClick={() => { const id = prepareInvoice(j.id); if (id) { go({ page: "jobs", tab: "ready", id: j.id }); openInvoice(id); } }}>Prepare invoice</Btn>}
          {inv && <Btn kind={inv.status === "draft" ? "p" : undefined} onClick={() => openInvoice(inv.id)}>Open {inv.id}</Btn>}
          {v?.state === "paid" && <Btn icon={IC.doc} onClick={() => openPrint("grant", inv!.id)}>Grant paperwork</Btn>}
        </div>
        {j.status !== "scheduled" && (
          <Section label={"Dated entries · " + days.length + " of " + j.workdays.length}>
            <div className="rt-card" style={{ background: "var(--surface-2)" }}>
              {j.workdays.map(w => {
                const d = dayFor(s, j.id, w);
                if (!d) return (
                  <div key={w} className="rt-row static" style={grid("92px minmax(0,1fr) auto")}>
                    <span className="rt-cell rt-strong" style={{ fontSize: 12.5 }}>{dShort(w)}</span>
                    <span className="rt-cell" style={{ color: "var(--attn-ink)", fontWeight: 500 }}>No diary entry</span>
                    <Btn sm kind="a" onClick={() => openCapture({ jobId: j.id, date: w, mode: "sample" })}>Log it</Btn>
                  </div>
                );
                return (
                  <div key={w} className="rt-row static" style={{ ...grid("92px minmax(0,1fr) auto"), alignItems: "start" }}>
                    <span className="rt-cell rt-strong" style={{ fontSize: 12.5 }}>{dShort(w)}</span>
                    <span style={{ minWidth: 0 }}>
                      {d.lines.map(l => (
                        <span key={l.id} style={{ display: "block", marginBottom: 4 }}>
                          <span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal", fontSize: 13 }}>{l.description}</span>
                          <span className="rt-cell-s" style={{ display: "block" }}>{machine(s, l.machineId)!.short} · {person(s, l.operatorId)!.first} · {hours(l.hours)} × {euro(l.rateCents)}</span>
                        </span>
                      ))}
                      <span className="rt-faint" style={{ fontSize: 11.5, display: "block" }}>“{d.note}”</span>
                      {d.status === "submitted" && <span style={{ display: "inline-flex", gap: 8, marginTop: 6 }}><Chip tone="slate">Waiting for Ryan</Chip>{owner && <Btn sm kind="p" onClick={() => approveSubmittedDay(d.id)}>Approve</Btn>}</span>}
                    </span>
                    <span className="rt-cell rt-num rt-right">{euro(dayAmount(d))}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
        {j.status === "scheduled" && <Section label="Plan"><div className="rt-note">Starts {dLong(j.workdays[0])}, {plural(j.workdays.length, "day")} planned with the 13-tonne digger. {s.services.some(x => x.machineId === "PL-01" && x.status === "scheduled") ? "PL-01 is booked in for its service first." : "PL-01 is eight hours from a service, so book it before this starts."}</div></Section>}
        {v && (
          <Section label="Paperwork">
            <div className="rt-inline">
              <Btn sm icon={IC.doc} onClick={() => openInvoice(v.inv.id)}>{v.inv.id}</Btn>
              {v.receipts.map(rc => <Btn sm key={rc.id} icon={IC.receipt} onClick={() => openPrint("receipt", rc.id)}>{rc.id}</Btn>)}
            </div>
          </Section>
        )}
      </div>
    </Card>
  );
}

/* ---------------- day diary ---------------- */
function DiaryTab() {
  const s = useDemo();
  const r = useRoute();
  const weeks = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"].map(mon => [0, 1, 2, 3, 4].map(i => addDays(mon, i)));
  const allMissing = s.jobs.flatMap(j => coverage(s, j).missing.map(d => ({ j, d })));
  const selDate = r.id ? r.id.split("@").pop()! : (allMissing[0]?.d || TODAY);
  const jobsOn = (d: string) => s.jobs.filter(j => j.workdays.includes(d));
  const marker = (d: string) => {
    const js = jobsOn(d);
    if (!js.length) return "";
    if (js.some(j => !dayFor(s, j.id, d) && d <= TODAY)) return "missing";
    if (js.some(j => dayFor(s, j.id, d)?.status === "submitted")) return "submitted";
    if (js.every(j => dayFor(s, j.id, d))) return "logged";
    return "planned";
  };
  const js = jobsOn(selDate);
  const extra = s.days.filter(d => d.date === selDate && !js.some(j => j.id === d.jobId));
  // Keep the chosen day in view on narrow screens.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.rt-day[aria-pressed="true"]');
    const strip = el?.closest<HTMLElement>(".rt-strip");
    if (el && strip) strip.scrollLeft += el.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - el.offsetWidth) / 2;
  }, [selDate]);
  return (
    <div className="rt-page">
      <PageHead title="Day diary" sub={allMissing.length ? plural(allMissing.length, "day") + " with work but no entry: " + allMissing.map(x => dShort(x.d) + " at " + x.j.name).join(", ") + "." : "Every day with work has an entry."}
        actions={<span className="rt-hide-mobile"><Btn kind="p" icon={IC.plus} onClick={() => openCapture({ jobId: allMissing[0]?.j.id, date: allMissing[0]?.d, mode: "sample" })}>Log a day</Btn></span>} />
      <div className="rt-only-mobile" style={{ marginBottom: 14 }}>
        <Btn kind="p" lg block icon={IC.mic} onClick={() => openCapture({ jobId: allMissing[0]?.j.id, date: allMissing[0]?.d, mode: "sample" })}>Log a day</Btn>
      </div>
      <Card pad title="November" right={<div className="rt-inline rt-hide-mobile" style={{ fontSize: 12 }}><span className="rt-inline"><span className="rt-dot sel" />Logged</span><span className="rt-inline"><span className="rt-dot attn" />Missing</span><span className="rt-inline"><span className="rt-dot" style={{ background: "none", border: "1.5px solid var(--faint)" }} />Planned</span></div>}>
        <div className="rt-strip">
          {weeks.map((w, i) => (
            <div className="rt-week" key={i}>
              {w.map(d => (
                <button key={d} type="button" className={"rt-day" + (d === TODAY ? " today" : "")} aria-pressed={d === selDate}
                  onClick={() => { const jj = jobsOn(d)[0]; select(jj ? jj.id + "@" + d : d); }} aria-label={dShort(d)}>
                  <span className="w">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow(d)]}</span>
                  <span className="d">{Number(d.slice(8))}</span>
                  {marker(d) && <span className={"m " + marker(d)} />}
                </button>
              ))}
            </div>
          ))}
        </div>
      </Card>
      <div style={{ marginTop: 14 }}>
        <Card title={dLong(selDate)} sub={js.length ? js.map(j => j.name).join(", ") : isWeekday(selDate) ? "No job planned" : "Weekend"}>
          {js.length === 0 && extra.length === 0 && <Empty title="Nothing planned">{selDate <= TODAY ? "Log a day here if the crew worked." : "Nothing booked yet."}</Empty>}
          {js.concat(extra.map(d => s.jobs.find(j => j.id === d.jobId)!)).map(j => {
            const d = dayFor(s, j.id, selDate);
            return (
              <div key={j.id} className="rt-row static" style={{ ...grid("minmax(0,1fr) auto"), alignItems: "start" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="rt-cell-t">{j.id} {j.name}</div>
                  {!d && selDate <= TODAY && <div className="rt-cell-s" style={{ color: "var(--attn-ink)", fontWeight: 500 }}>Work happened, no diary entry yet</div>}
                  {!d && selDate > TODAY && <div className="rt-cell-s">Planned</div>}
                  {d && d.lines.map(l => (
                    <div key={l.id} style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 13, color: "var(--ink)" }}>{l.description}</div>
                      <div className="rt-cell-s">{machine(s, l.machineId)!.name} · {person(s, l.operatorId)!.name} · {hours(l.hours)} · {euro(l.hours * l.rateCents)}</div>
                    </div>
                  ))}
                  {d && <div className="rt-faint" style={{ fontSize: 12, marginTop: 8 }}>“{d.note}” · {d.status === "submitted" ? "waiting for Ryan" : "approved"}{d.invoiceId ? " · on " + d.invoiceId : ""}</div>}
                </div>
                {!d && selDate <= TODAY && <Btn kind="a" icon={IC.plus} onClick={() => openCapture({ jobId: j.id, date: selDate, mode: "sample" })}>Log this day</Btn>}
                {d && <span className="rt-strong rt-num">{euro(dayAmount(d))}</span>}
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

/* ---------------- ready to invoice ---------------- */
function ReadyTab() {
  const s = useDemo();
  const finished = s.jobs.filter(j => j.status === "finished");
  const ready = finished.filter(j => coverage(s, j).complete && unbilledLines(s, j.id).length && !invoiceFor(s, j.id));
  const drafts = s.invoices.filter(i => i.status === "draft");
  const waiting = finished.filter(j => !coverage(s, j).complete && unbilledLines(s, j.id).length);
  const recent = s.invoices.filter(i => i.status === "sent").sort((a, b) => (b.issued || "").localeCompare(a.issued || "")).slice(0, 3);
  const total = sum(ready.map(j => unbilledCents(s, j.id))) + sum(waiting.map(j => unbilledCents(s, j.id)));
  return (
    <div className="rt-page">
      <PageHead title="Ready to invoice" sub={total ? euro(total) + " of approved work is not invoiced yet." : "All approved work is invoiced."} />
      <div className="rt-stack">
        {drafts.map(inv => {
          const v = invoiceView(s, inv);
          return (
            <Card key={inv.id} title={"Draft " + inv.id + " · " + v.job.name} sub={v.customer.name + " · " + euro(v.total)}
              right={<Btn kind="p" onClick={() => openInvoice(inv.id)}>{inv.approved ? "Send it" : "Review and approve"}</Btn>} />
          );
        })}
        {ready.map(j => <ReadyCard key={j.id} s={s} j={j} />)}
        {waiting.map(j => <ReadyCard key={j.id} s={s} j={j} />)}
        {!ready.length && !waiting.length && !drafts.length && <Card pad><Empty title="Nothing waiting to be invoiced">New jobs land here once every planned day has an approved diary entry.</Empty></Card>}
        <Card title="Recently invoiced" sub="Kept here so you can see what went out.">
          {recent.map(inv => {
            const v = invoiceView(s, inv);
            return (
              <button key={inv.id} type="button" className="rt-row" onClick={() => openInvoice(inv.id)} style={grid("minmax(0,1.4fr) minmax(0,1fr) auto")}>
                <span className="rt-cell-t">{inv.id} · {v.job.name}</span>
                <span className="rt-cell">{v.customer.name} · {dShort(inv.issued)}</span>
                <Chip tone={v.state === "paid" ? "ok" : v.state === "overdue" ? "attn" : "sel"}>{euro(v.total)} · {STATE_LABEL[v.state]}</Chip>
              </button>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

function ReadyCard({ s, j }: { s: DemoState; j: Job }) {
  const cov = coverage(s, j);
  const lines = unbilledLines(s, j.id);
  const c = customer(s, j.customerId)!;
  const byM = s.machines.map(m => ({ m, h: sum(lines.filter(l => l.machineId === m.id).map(l => l.hours)) })).filter(x => x.h);
  const ok = cov.complete;
  return (
    <Card title={j.id + " · " + j.name} sub={c.name + " · work finished " + dShort(j.finishedOn)}
      right={<Chip tone={ok ? "sel" : "attn"}>{cov.approved}/{cov.planned} days</Chip>}
      footer={<>
        <span className="rt-strong rt-num" style={{ fontSize: 18 }}>{euro(sum(lines.map(lineAmount)))}</span>
        <span className="rt-muted" style={{ fontSize: 12.5 }}>{ok ? "approved and not invoiced" : "logged so far"}</span>
        <span className="rt-sp" />
        {ok ? <Btn kind="p" icon={IC.doc} onClick={() => { const id = prepareInvoice(j.id); if (id) openInvoice(id); else toast("Couldn’t prepare that invoice."); }}>Generate invoice</Btn>
          : <Btn kind="a" icon={IC.plus} onClick={() => openCapture({ jobId: j.id, date: cov.missing[0], mode: "sample" })}>Log {dShort(cov.missing[0])}</Btn>}
      </>}>
      <div className="rt-card-b">
        <div className="rt-cover" style={{ marginBottom: 12 }}>
          {j.workdays.map(w => { const x = dayFor(s, j.id, w); return <span key={w} title={dShort(w)} className={!x ? "missing" : x.status === "submitted" ? "submitted" : ""} />; })}
        </div>
        {byM.map(x => (
          <div key={x.m.id} className="rt-inline" style={{ fontSize: 13, padding: "4px 0" }}>
            <span style={{ flex: 1 }}>{x.m.name} with operator</span>
            <span className="rt-muted rt-num">{x.h} h × {euro(x.m.rateCents)}</span>
            <span className="rt-strong rt-num" style={{ minWidth: 70, textAlign: "right" }}>{euro(x.h * x.m.rateCents)}</span>
          </div>
        ))}
        {!ok && (
          <div className="rt-note attn" style={{ marginTop: 12 }}>
            <b>Exception:</b> {cov.missing.map(d => dShort(d)).join(", ")} {cov.missing.length === 1 ? "has" : "have"} no diary entry{cov.submitted.length ? ", " + cov.submitted.length + " waiting for approval" : ""}. The job finished, but the paperwork isn’t ready.
          </div>
        )}
      </div>
    </Card>
  );
}

