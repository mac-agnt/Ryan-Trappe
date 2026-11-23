import { useDemo } from "../../demo/store";
import { actorName, chaseList, coverage, dayAmount, jobDays, machine, nextWork, serviceView, sum } from "../../demo/derive";
import { dShort, euro, stampRelative, words } from "../../demo/format";
import { go } from "../../demo/router";
import { openCapture } from "../../demo/ui";
import { Btn, Chip, IC, Icon } from "./ui";

/* Widgets around the Home chat. Everything is read from the shared store. */
export default function HomeWidgets() {
  const s = useDemo();
  const mill = s.jobs.find(j => j.id === "J-014")!;
  const cov = coverage(s, mill);
  const logged = jobDays(s, mill.id).filter(d => d.status === "approved");
  const owed = chaseList(s);
  const next = owed.slice().sort((a, b) => (a.held ? 0 : 1) - (b.held ? 0 : 1) || b.overdueDays - a.overdueDays)[0];
  const pl1 = serviceView(s, machine(s, "PL-01")!);
  const cb = s.callbacks.find(c => c.status !== "done");
  const latest = s.events.filter(e => s.people.some(p => p.id === e.actor) || ["invoice", "costs", "diary"].includes(e.actor)).slice().reverse().sort((a, b) => b.at.localeCompare(a.at))[0];
  const upcoming = nextWork(s).slice(0, 3);

  return (
    <>
      <section className="rt-card" style={{ overflow: "hidden" }}>
        <div className="rt-w">
          <div className="rt-w-t"><span style={{ flex: 1 }}>Needs you</span></div>
          {cov.missing.length > 0 ? (
            <button type="button" className="rt-w-item" onClick={() => openCapture({ jobId: mill.id, date: cov.missing[0], mode: "sample" })}>
              <span className="rt-dot attn" style={{ marginTop: 6 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="rt-cell-t" style={{ display: "block" }}>{dShort(cov.missing[0])} missing at Millrace</span>
                <span className="rt-cell-s" style={{ display: "block", whiteSpace: "normal" }}>{cap(words(logged.length))} of {cov.planned} days logged, {euro(sum(logged.map(dayAmount)))}. Log it before invoicing.</span>
              </span>
              <Chip tone="attn">Log</Chip>
            </button>
          ) : (
            <button type="button" className="rt-w-item" onClick={() => go({ page: "jobs", tab: "ready", id: mill.id })}>
              <span className="rt-dot ok" style={{ marginTop: 6 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="rt-cell-t" style={{ display: "block" }}>Millrace diary complete</span>
                <span className="rt-cell-s" style={{ display: "block" }}>{cov.approved} of {cov.planned} days{s.invoices.some(i => i.jobId === mill.id && i.status === "sent") ? ", invoiced" : ", ready to invoice"}</span>
              </span>
            </button>
          )}
          {cb && (
            <button type="button" className="rt-w-item" onClick={() => go({ page: "work", tab: "callbacks", id: cb.id })}>
              <span className="rt-dot sel" style={{ marginTop: 6 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="rt-cell-t" style={{ display: "block" }}>Ring back {cb.name}</span>
                <span className="rt-cell-s" style={{ display: "block" }}>Meadow Lane Stables, yard drainage{cb.callAt ? ", at " + cb.callAt : ""}</span>
              </span>
            </button>
          )}
        </div>
        <div className="rt-w">
          <div className="rt-w-t"><Icon d={IC.euro} size={15} style={{ color: "var(--accent)" }} /><span style={{ flex: 1 }}>Next collection</span></div>
          {next ? (
            <button type="button" className="rt-w-item" onClick={() => go({ page: "invoices", tab: "chase", id: next.inv.id })}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="rt-cell-t" style={{ display: "block" }}>{next.customer.name} · {euro(next.balance)}</span>
                <span className="rt-cell-s" style={{ display: "block", whiteSpace: "normal" }}>{next.held ? "Promised by " + dShort(next.promise!.date) : next.overdueDays ? next.overdueDays + " days overdue, no date agreed" : "Due " + dShort(next.inv.due)}{next.lastPayment ? " · paid " + euro(next.lastPayment.amountCents) + " on " + dShort(next.lastPayment.date) : ""}</span>
              </span>
              <Chip tone={next.held ? "sel" : next.overdueDays ? "attn" : undefined}>{next.held ? "Promised" : next.overdueDays ? "Overdue" : "Open"}</Chip>
            </button>
          ) : <div className="rt-muted" style={{ fontSize: 12.5, paddingTop: 8 }}>Nothing owed on sent invoices.</div>}
          {owed.length > 1 && <div className="rt-faint" style={{ fontSize: 12, marginTop: 8 }}>{euro(sum(owed.map(v => v.balance)))} owed across {owed.length} invoices</div>}
        </div>
        <div className="rt-w">
          <div className="rt-w-t"><Icon d={IC.wrench} size={15} style={{ color: "var(--accent)" }} /><span style={{ flex: 1 }}>Service due</span></div>
          <button type="button" className="rt-w-item" onClick={() => go({ page: "plant", tab: "service", id: "PL-01" })}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="rt-cell-t" style={{ display: "block" }}>PL-01 13-tonne digger</span>
              <span className="rt-cell-s" style={{ display: "block" }}>{pl1.booked ? "Booked " + dShort(pl1.booked.date) + ", " : ""}{pl1.remaining} h left · {pl1.meter.hours.toLocaleString("en-IE")} h on {dShort(pl1.meter.date)}</span>
            </span>
            <Chip tone={pl1.booked ? "sel" : pl1.remaining <= 25 ? "attn" : undefined}>{pl1.booked ? "Booked" : pl1.remaining + " h"}</Chip>
          </button>
        </div>
      </section>

      <section className="rt-card" style={{ overflow: "hidden" }}>
        {latest && (
          <div className="rt-w">
            <div className="rt-w-t"><Icon d={IC.check} size={15} sw={2.2} style={{ color: "var(--accent)" }} /><span style={{ flex: 1 }}>Latest done</span><span className="rt-faint" style={{ fontSize: 11.5, fontWeight: 400 }}>{stampRelative(latest.at)}</span></div>
            <button type="button" className="rt-w-item" onClick={() => go(latest.link)}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal", fontWeight: 400 }}>{latest.text}</span>
                <span className="rt-cell-s" style={{ display: "block" }}>{actorName(s, latest.actor)}</span>
              </span>
            </button>
          </div>
        )}
        <div className="rt-w">
          <div className="rt-w-t"><Icon d={IC.cal} size={15} style={{ color: "var(--accent)" }} /><span style={{ flex: 1 }}>Next on the plan</span></div>
          {upcoming.map((n, i) => (
            <button key={i} type="button" className="rt-w-item" onClick={() => go(n.link)}>
              <span className="rt-faint" style={{ width: 70, flex: "none", fontSize: 12.5, paddingTop: 1 }}>{dShort(n.date)}</span>
              <span className="rt-cell-t" style={{ flex: 1, minWidth: 0, whiteSpace: "normal", fontWeight: 400 }}>{n.title}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="rt-only-mobile"><Btn block icon={IC.search} onClick={() => go({ page: "records", tab: "directory" })}>Find any record</Btn></div>
    </>
  );
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
