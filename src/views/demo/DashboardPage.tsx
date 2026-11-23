import type { ReactNode } from "react";
import { useDemo } from "../../demo/store";
import { coverage, customer, money, serviceDiary, supplier, sum, unbilledCents, costsByCat, jobDays, nextWork, invoiceFor } from "../../demo/derive";
import { TODAY, addDays, dShort, euro, euroSigned, num, plural } from "../../demo/format";
import { go, select, useRoute } from "../../demo/router";
import type { DemoState, LinkRef } from "../../demo/types";
import { Card, Chip, Empty, grid } from "./ui";

export interface Kpi { key: string; label: string; value: string; hint: string; attn?: boolean; }

export function dashKpis(s: DemoState, tab: string): Kpi[] {
  if (tab === "plant") {
    const live = s.jobs.filter(j => j.status === "finished" && (unbilledCents(s, j.id) > 0 || coverage(s, j).missing.length));
    const cov = live.map(j => coverage(s, j));
    const svc = serviceDiary(s)[0];
    const nw = nextWork(s)[0];
    return [
      { key: "coverage", label: "Day coverage", value: cov.length ? sum(cov.map(c => c.approved)) + " / " + sum(cov.map(c => c.planned)) : "All logged", hint: cov.length ? "days logged on open jobs" : "no open jobs", attn: cov.some(c => c.missing.length > 0) },
      { key: "unbilled", label: "Not invoiced", value: euro(unbilledCents(s)), hint: "approved diary work" },
      { key: "service", label: "Next service", value: svc.remaining + " h", hint: svc.m.id + " " + svc.m.short + (svc.booked ? ", booked" : ""), attn: !svc.booked && svc.remaining <= 25 },
      { key: "next", label: "Next on the plan", value: nw ? dShort(nw.date) : "Nothing", hint: nw ? nw.title.split(",")[0] : "" },
    ];
  }
  const m = money(s);
  return [
    { key: "cash", label: "Cash received", value: euro(m.inC), hint: plural(m.ins.length, "payment") + " in November" },
    { key: "costs", label: "Costs paid", value: euro(m.outC), hint: plural(m.outs.length, "cost") + " in November" },
    { key: "net", label: "Net movement", value: euroSigned(m.net), hint: "in minus out, recorded" },
    { key: "owed", label: "Owed on invoices", value: euro(m.openC), hint: m.overdueC === m.openC && m.openC ? "all overdue" : euro(m.overdueC) + " overdue", attn: m.overdueC > 0 },
    { key: "expected", label: "Expected in 7 days", value: euro(m.promisedC), hint: m.promisedC ? "promised by customers" : "no dates agreed yet" },
    { key: "unbilled", label: "Not invoiced", value: euro(m.unbilledC), hint: "approved diary work" },
  ];
}

export default function DashboardPage() {
  const s = useDemo();
  const r = useRoute();
  const kpis = dashKpis(s, r.tab);
  const key = kpis.find(k => k.key === r.id)?.key || kpis[0].key;
  const k = kpis.find(x => x.key === key)!;
  return (
    <div className="rt-page" style={{ paddingTop: 18 }}>
      <Breakdown s={s} k={k} />
    </div>
  );
}

type Row = { t: string; s: string; v: string; tone?: "attn" | "sel" | "ok"; link?: LinkRef; run?: () => void };
type Bar = { label: string; cents: number; tone?: "sel" | "attn" };

function Breakdown({ s, k }: { s: DemoState; k: Kpi }) {
  const m = money(s);
  let bars: Bar[] = [], rows: Row[] = [], note: ReactNode = null, barUnit = "€";
  const payRow = (p: typeof m.ins[number]): Row => { const inv = s.invoices.find(i => i.id === p.invoiceId)!; return { t: customer(s, inv.customerId)!.name, s: dShort(p.date) + " · " + p.invoiceId + " · " + p.reference, v: euro(p.amountCents), link: { page: "invoices", tab: "payments", id: p.id } }; };

  if (k.key === "cash") {
    bars = m.ins.map(p => ({ label: dShort(p.date).slice(4), cents: p.amountCents, tone: "sel" }));
    rows = m.ins.map(payRow);
    note = "Payments entered by hand against invoices. Promised money isn’t counted here until it arrives.";
  } else if (k.key === "costs") {
    bars = costsByCat(s).map(c => ({ label: c.cat, cents: c.cents, tone: c.cat === "Fuel" ? "sel" : undefined }));
    rows = m.outs.map(c => ({ t: supplier(s, c.supplierId)!.name, s: dShort(c.paidDate) + " · " + c.category + " · " + c.reference, v: euro(c.amountCents), link: { page: "costs", tab: "receipts", id: c.id } }));
  } else if (k.key === "net") {
    bars = [{ label: "Received", cents: m.inC, tone: "sel" }, { label: "Paid out", cents: m.outC }];
    rows = [...m.ins.map(payRow), ...m.outs.map(c => ({ t: supplier(s, c.supplierId)!.name, s: dShort(c.paidDate) + " · " + c.category, v: "−" + euro(c.amountCents), link: { page: "costs", tab: "receipts", id: c.id } }))];
    note = "Only money recorded in Pulse for November. Sending an invoice doesn’t change this.";
  } else if (k.key === "owed") {
    bars = m.open.map(v => ({ label: v.inv.id, cents: v.balance, tone: v.overdueDays ? "attn" : "sel" }));
    rows = m.open.map(v => ({ t: v.customer.name, s: v.inv.id + " · " + (v.overdueDays ? v.overdueDays + " days overdue" : "due " + dShort(v.inv.due)) + (v.lastPayment ? " · paid " + euro(v.paid) + " so far" : ""), v: euro(v.balance), tone: v.overdueDays ? "attn" : "sel", link: { page: "invoices", tab: "chase", id: v.inv.id } }));
    note = euro(m.overdueC) + " overdue, " + euro(m.openC - m.overdueC) + " not due yet.";
  } else if (k.key === "expected") {
    const weekEnd = addDays(TODAY, 7);
    rows = [
      ...m.promised.map(v => ({ t: "Promised · " + v.customer.name, s: dShort(v.promise!.date) + " · basis: " + v.customer.contact + "’s promise recorded " + dShort(v.promise!.recordedAt.slice(0, 10)), v: euro(Math.min(v.promise!.amountCents, v.balance)), tone: "sel" as const, link: { page: "invoices", tab: "chase", id: v.inv.id } })),
      ...m.unconfirmed.map(v => ({ t: "Overdue, no date · " + v.customer.name, s: "was due " + dShort(v.inv.due) + " · basis: unpaid invoice, nothing agreed", v: euro(v.balance), tone: "attn" as const, link: { page: "invoices", tab: "chase", id: v.inv.id } })),
      ...m.notDue.map(v => ({ t: "Not due yet · " + v.customer.name, s: "due " + dShort(v.inv.due) + (v.inv.due! <= weekEnd ? "" : ", after the next 7 days") + " · basis: invoice due date", v: euro(v.balance), link: { page: "invoices", tab: "chase", id: v.inv.id } })),
    ];
    bars = [{ label: "Promised", cents: m.promisedC, tone: "sel" }, { label: "Overdue, no date", cents: m.unconfirmedC, tone: "attn" }, { label: "Not due yet", cents: m.notDueC }];
    note = "Three separate things: money promised in the next 7 days, overdue money with no date, and invoices not due yet. Only the first counts as expected.";
  } else if (k.key === "unbilled") {
    const js = s.jobs.filter(j => unbilledCents(s, j.id) > 0);
    bars = js.map(j => ({ label: j.id, cents: unbilledCents(s, j.id), tone: "sel" }));
    rows = js.map(j => { const c = coverage(s, j); return { t: j.id + " " + j.name, s: customer(s, j.customerId)!.name + " · " + c.approved + " of " + c.planned + " days logged" + (c.missing.length ? ", " + dShort(c.missing[0]) + " missing" : ", ready to invoice"), v: euro(unbilledCents(s, j.id)), tone: c.missing.length ? "attn" as const : "sel" as const, link: { page: "jobs", tab: c.missing.length ? "jobs" : "ready", id: j.id } }; });
    const sent = s.invoices.filter(i => i.source === "pulse" && i.status === "sent");
    if (!js.length) note = sent.length ? "Everything approved is invoiced. " + sent.map(i => i.id + " went out " + dShort(i.issued)).join(", ") + "." : "Nothing approved is waiting.";
  } else if (k.key === "coverage") {
    const js = s.jobs.filter(j => j.status === "finished").sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4);
    rows = js.map(j => { const c = coverage(s, j); const inv = invoiceFor(s, j.id); return { t: j.id + " " + j.name, s: c.approved + " of " + c.planned + " days" + (c.missing.length ? " · missing " + c.missing.map(d => dShort(d)).join(", ") : "") + (inv ? " · " + inv.id : ""), v: c.missing.length ? "Gap" : "Full", tone: c.missing.length ? "attn" as const : "ok" as const, link: { page: "jobs", tab: "jobs", id: j.id } }; });
    bars = js.map(j => ({ label: j.id, cents: jobDays(s, j.id).filter(d => d.status === "approved").length * 100, tone: coverage(s, j).missing.length ? "attn" : "sel" }));
    barUnit = "days";
  } else if (k.key === "service") {
    const list = serviceDiary(s);
    bars = list.map(v => ({ label: v.m.id, cents: v.remaining * 100, tone: v.remaining <= 25 && !v.booked ? "attn" : v.booked ? "sel" : undefined }));
    rows = list.map(v => ({ t: v.m.id + " " + v.m.short, s: num(v.meter.hours) + " h, due at " + num(v.m.nextServiceAt) + " h" + (v.booked ? " · booked " + dShort(v.booked.date) : ""), v: v.remaining + " h", tone: v.remaining <= 25 && !v.booked ? "attn" as const : v.booked ? "sel" as const : undefined, link: { page: "plant", tab: "service", id: v.m.id } }));
    barUnit = "h";
  } else if (k.key === "next") {
    rows = nextWork(s).map(n => ({ t: n.title, s: dShort(n.date), v: n.date === TODAY ? "Today" : dShort(n.date).slice(0, 3), link: n.link }));
  }

  const max = Math.max(1, ...bars.map(b => b.cents));
  const fmt = (c: number) => barUnit === "€" ? euro(c) : barUnit === "h" ? c / 100 + " h" : c / 100 + " " + barUnit;
  return (
    <div className="rt-split">
      <Card title={k.label} sub={k.value + " · " + k.hint}>
        <div className="rt-card-b">
          {bars.length ? (
            <div className="rt-bars">
              {bars.map((b, i) => (
                <div key={i} className="rt-bar" style={{ cursor: "default" }}>
                  <span className="lbl">{b.label}</span>
                  <span><span className={"fill" + (b.tone ? " " + b.tone : "")} style={{ display: "block", width: Math.max(3, Math.round(b.cents / max * 100)) + "%", animationDelay: i * 60 + "ms" }} /></span>
                  <span className="amt">{fmt(b.cents)}</span>
                </div>
              ))}
            </div>
          ) : <Empty title="Nothing to chart" />}
          {note && <div className="rt-note" style={{ marginTop: 16 }}>{note}</div>}
        </div>
      </Card>
      <Card title={plural(rows.length, "row")} sub="Each one opens the record">
        {rows.map((x, i) => (
          <button key={i} type="button" className="rt-row" onClick={() => x.run ? x.run() : x.link && go(x.link)} style={grid("minmax(0,1fr) auto")}>
            <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{x.t}</span><span className="rt-cell-s" style={{ display: "block", whiteSpace: "normal" }}>{x.s}</span></span>
            {x.tone ? <Chip tone={x.tone}>{x.v}</Chip> : <span className="rt-strong rt-num">{x.v}</span>}
          </button>
        ))}
        {!rows.length && <Empty title="No rows" />}
      </Card>
    </div>
  );
}

/* The band at the top of the Dashboard. Each card opens its rows below. */
export function KpiCards({ s, tab, sel }: { s: DemoState; tab: string; sel?: string }) {
  const kpis = dashKpis(s, tab);
  const active = kpis.find(k => k.key === sel)?.key || kpis[0].key;
  return (
    <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
      {kpis.map((k, i) => (
        <button key={k.key} type="button" onClick={() => select(k.key)} aria-pressed={active === k.key} className="rt-kpi"
          style={{ position: "relative", flex: "1 1 160px", minWidth: 0, padding: "18px 18px 16px", textAlign: "left", font: "inherit", color: "var(--ink)", cursor: "pointer",
            background: active === k.key ? "linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.04) 60%)" : "linear-gradient(160deg,rgba(255,255,255,.075),rgba(255,255,255,.015) 55%)",
            border: "1px solid " + (active === k.key ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.1)"), borderRadius: 22,
            backdropFilter: "blur(22px) saturate(1.5)", WebkitBackdropFilter: "blur(22px) saturate(1.5)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),inset 0 -1px 0 rgba(0,0,0,.2),0 10px 30px rgba(0,0,0,.22)", transition: "transform .3s var(--ease),border-color .25s var(--ease),background .25s var(--ease)" }}>
          <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.7px", marginTop: 8, lineHeight: 1, fontVariantNumeric: "tabular-nums", animation: "kpiRoll .62s var(--ease) " + i * 70 + "ms both" }}>{k.value}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11.5, minWidth: 0 }}>
            {k.attn && <span className="rt-dot attn" />}
            <span style={{ opacity: .8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.hint}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function DashTitle({ tab }: { tab: string }) {
  return <>{tab === "plant" ? "Jobs & plant" : "Money · November"}</>;
}

