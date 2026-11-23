import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDemo } from "../../demo/store";
import { invoice, invoiceLines, invoiceView, jobDays, machine, person, supplier, paymentsFor, sum } from "../../demo/derive";
import { dLong, dMed, dShort, euro, hours } from "../../demo/format";
import { closePrint, useUi } from "../../demo/ui";
import type { DemoState } from "../../demo/types";
import { Btn, IC } from "./ui";

/* Clean paper views for anything Ryan hands to a customer, a grant office or
   Justin. Rendered into a portal beside #root so the browser prints only the
   paper (Print, or Save as PDF). */

export default function PrintView() {
  const s = useDemo();
  const { print } = useUi();
  useEffect(() => {
    if (!print) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") closePrint(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [print]);
  if (!print) return null;
  const host = document.getElementById("rt-print-portal");
  if (!host) return null;

  let title = "";
  let pages: ReactNode = null;
  if (print.kind === "invoice") { title = print.id; pages = <InvoicePaper s={s} id={print.id} withDiary />; }
  if (print.kind === "receipt") { title = print.id; pages = <ReceiptPaper s={s} id={print.id} />; }
  if (print.kind === "grant") {
    const v = invoiceView(s, invoice(s, print.id)!);
    const rc = v.receipts.find(r => r.kind === "paid") || v.receipts[v.receipts.length - 1];
    title = "Grant paperwork · " + v.job.name;
    pages = (<>
      <InvoicePaper s={s} id={print.id} withDiary={false} />
      {rc && <ReceiptPaper s={s} id={rc.id} />}
      <DiaryPaper s={s} invoiceId={print.id} />
    </>);
  }
  if (print.kind === "handover") { title = "Handover to Justin"; pages = <HandoverPaper s={s} id={print.id} />; }
  if (print.kind === "policy") { title = "Plant policy schedule"; pages = <PolicyPaper s={s} />; }
  if (print.kind === "doc") { title = "Document"; pages = <DocPaper s={s} id={print.id} />; }

  // The portal sits outside the themed app root, so carry the theme across.
  const theme = document.querySelector("#root [data-theme]")?.getAttribute("data-theme") || "harbour";
  return createPortal(
    <div className="rt-print-wrap" data-theme={theme} role="dialog" aria-modal="true" aria-label={title}>
      <div className="rt-print-bar rt-noprint">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rt-label">Print view</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        </div>
        <Btn kind="p" icon={IC.print} onClick={() => window.print()}>Print or save as PDF</Btn>
        <button type="button" className="rt-x" onClick={closePrint} aria-label="Close print view"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d={IC.x} /></svg></button>
      </div>
      <div className="rt-print-scroll">{pages}</div>
    </div>,
    host,
  );
}

function Letterhead({ s, doc, right }: { s: DemoState; doc: string; right?: ReactNode }) {
  const st = s.settings;
  return (
    <div className="lh">
      <div className="mk">{st.monogram}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#14191f" }}>{st.displayName}</div>
        <div style={{ color: "#5b6570" }}>{st.descriptor} · {st.country}</div>
        <div style={{ color: "#5b6570" }}>{st.email}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <h1>{doc}</h1>
        {right}
      </div>
    </div>
  );
}

function InvoicePaper({ s, id, withDiary }: { s: DemoState; id: string; withDiary: boolean }) {
  const inv = invoice(s, id)!;
  const v = invoiceView(s, inv);
  const lines = invoiceLines(s, inv);
  return (
    <>
      <div className="rt-paper">
        <Letterhead s={s} doc={inv.status === "draft" ? "Draft invoice" : "Invoice"} right={<div style={{ fontWeight: 600, marginTop: 4 }}>{inv.id}</div>} />
        <div className="meta">
          <div><div className="k">Bill to</div><div className="v">{v.customer.name}<br />{v.customer.contact}<br />{v.customer.email}</div></div>
          <div><div className="k">Job</div><div className="v">{v.job.id} {v.job.name}<br />{v.job.location}</div></div>
          <div><div className="k">Issued</div><div className="v">{inv.issued ? dMed(inv.issued) : "Not sent yet"}</div></div>
          <div><div className="k">Due</div><div className="v">{inv.due ? dMed(inv.due) : v.customer.termsDays + " days from issue"}</div></div>
        </div>
        <table>
          <thead><tr><th>Description</th><th className="r">Hours</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {lines.map(l => <tr key={l.id}><td>{l.description}</td><td className="r">{hours(l.hours)}</td><td className="r">{euro(l.rateCents)}/h</td><td className="r">{euro(l.amountCents)}</td></tr>)}
            <tr className="tot"><td colSpan={3}>Total</td><td className="r">{euro(v.total)}</td></tr>
            {inv.status === "sent" && v.paid > 0 && <tr><td colSpan={3}>Received</td><td className="r">{euro(v.paid)}</td></tr>}
            {inv.status === "sent" && v.paid > 0 && <tr className="tot"><td colSpan={3}>Balance</td><td className="r">{euro(v.balance)}</td></tr>}
          </tbody>
        </table>
        <div className="foot">Machine hire with operator, billed by the hour. The dated diary of work {withDiary ? "follows on the next page" : "is attached"}.</div>
      </div>
      {withDiary && <DiaryPaper s={s} invoiceId={id} />}
    </>
  );
}

function DiaryPaper({ s, invoiceId }: { s: DemoState; invoiceId: string }) {
  const inv = invoice(s, invoiceId)!;
  const v = invoiceView(s, inv);
  const days = jobDays(s, v.job.id).filter(d => d.invoiceId === invoiceId || (inv.status === "draft" && d.status === "approved" && !d.invoiceId));
  return (
    <div className="rt-paper">
      <Letterhead s={s} doc="Diary of work" right={<div style={{ marginTop: 4 }}>{inv.id} · {v.job.name}</div>} />
      <table>
        <thead><tr><th>Date</th><th>Machine</th><th>Operator</th><th>Work done</th><th className="r">Hours</th></tr></thead>
        <tbody>
          {days.flatMap(d => d.lines.map((l, i) => (
            <tr key={l.id}><td style={{ whiteSpace: "nowrap" }}>{i ? "" : dShort(d.date)}</td><td>{machine(s, l.machineId)!.name}</td><td>{person(s, l.operatorId)!.name}</td><td>{l.description}</td><td className="r">{hours(l.hours)}</td></tr>
          )))}
          <tr className="tot"><td colSpan={4}>{days.length} days</td><td className="r">{hours(sum(days.flatMap(d => d.lines.map(l => l.hours))))}</td></tr>
        </tbody>
      </table>
      <div className="foot">Each row is an approved diary entry. Hours are machine hours with an operator.</div>
    </div>
  );
}

function ReceiptPaper({ s, id }: { s: DemoState; id: string }) {
  const r = s.receipts.find(x => x.id === id);
  if (!r) return null;
  const p = s.payments.find(x => x.id === r.paymentId)!;
  const inv = invoice(s, r.invoiceId)!;
  const v = invoiceView(s, inv);
  const pays = paymentsFor(s, inv.id);
  const upTo = pays.slice(0, pays.findIndex(x => x.id === p.id) + 1);
  const paidToDate = sum(upTo.map(x => x.amountCents));
  const before = paidToDate - p.amountCents;
  const balance = v.total - paidToDate;
  const paid = r.kind === "paid" && balance === 0;
  return (
    <div className="rt-paper">
      <Letterhead s={s} doc={paid ? "Paid receipt" : "Payment received"} right={<div style={{ fontWeight: 600, marginTop: 4 }}>{r.id}</div>} />
      <div className="meta">
        <div><div className="k">Received from</div><div className="v">{v.customer.name}</div></div>
        <div><div className="k">Job</div><div className="v">{v.job.id} {v.job.name}</div></div>
        <div><div className="k">Invoice</div><div className="v">{inv.id}, issued {dMed(inv.issued)}</div></div>
        <div><div className="k">Paid on</div><div className="v">{dLong(p.date)}</div></div>
        <div><div className="k">Payment reference</div><div className="v">{p.reference} · {p.method}</div></div>
        <div><div className="k">Receipt date</div><div className="v">{dMed(r.issued)}</div></div>
      </div>
      <table>
        <tbody>
          <tr><td>Original invoice amount</td><td className="r">{euro(v.total)}</td></tr>
          {before > 0 && <tr><td>Paid before this payment</td><td className="r">{euro(before)}</td></tr>}
          <tr><td>Amount received</td><td className="r">{euro(p.amountCents)}</td></tr>
          <tr className="tot"><td>Balance</td><td className="r">{euro(balance)}</td></tr>
        </tbody>
      </table>
      <div className={"stamp" + (paid ? "" : " part")}>{paid ? "PAID IN FULL" : "PART PAYMENT · " + euro(balance) + " STILL DUE"}</div>
      <div className="foot">{paid ? "This receipt confirms full payment of " + inv.id + "." : "Thank you for this payment. This is not a receipt for the full invoice."}</div>
    </div>
  );
}

function HandoverPaper({ s, id }: { s: DemoState; id: string }) {
  const h = s.handovers.find(x => x.id === id);
  const costs = h ? h.costIds.map(c => s.costs.find(x => x.id === c)!) : s.costs.filter(c => c.justin === "ready");
  return (
    <>
      <div className="rt-paper">
        <Letterhead s={s} doc="For Justin" right={<div style={{ marginTop: 4 }}>{h ? h.id + " · " + dShort(h.date.slice(0, 10)) : "Not sent yet"}</div>} />
        <p style={{ marginTop: 20 }}>Justin, here {costs.length === 1 ? "is the receipt" : "are the receipts"} you don’t have yet for November. Everything else this month came to you straight from the suppliers.</p>
        <table>
          <thead><tr><th>Date</th><th>Supplier</th><th>Reference</th><th>Category</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {costs.map(c => <tr key={c.id}><td>{dShort(c.date)}</td><td>{supplier(s, c.supplierId)!.name}</td><td>{c.reference}</td><td>{c.category}{c.machineId ? ", " + c.machineId : ""}</td><td className="r">{euro(c.amountCents)}</td></tr>)}
            <tr className="tot"><td colSpan={4}>Total</td><td className="r">{euro(sum(costs.map(c => c.amountCents)))}</td></tr>
          </tbody>
        </table>
      </div>
      {costs.map(c => <DocPaper key={c.id} s={s} id={c.docId} />)}
    </>
  );
}

function DocPaper({ s, id }: { s: DemoState; id: string }) {
  const d = s.docs.find(x => x.id === id);
  if (!d) return null;
  const cost = s.costs.find(c => c.docId === id);
  const sup = cost ? supplier(s, cost.supplierId) : undefined;
  return (
    <div className="rt-paper">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, borderBottom: "2px solid #334155", paddingBottom: 14 }}>
        <h1 style={{ flex: 1 }}>{sup ? sup.name : d.title}</h1>
        <span style={{ color: "#5b6570" }}>{d.kind === "paper receipt" ? "Counter receipt (photo)" : d.kind}</span>
      </div>
      {cost && (
        <table>
          <tbody>
            <tr><td>Reference</td><td className="r">{cost.reference}</td></tr>
            <tr><td>Date</td><td className="r">{dMed(cost.date)}</td></tr>
            <tr><td>{cost.category}{cost.machineId ? " for " + cost.machineId + " " + machine(s, cost.machineId)!.short : ""}</td><td className="r">{euro(cost.amountCents)}</td></tr>
            <tr className="tot"><td>Paid {dMed(cost.paidDate)}</td><td className="r">{euro(cost.amountCents)}</td></tr>
          </tbody>
        </table>
      )}
      <div className="foot">Source: {d.source}. {d.kind === "paper receipt" ? "Photographed on Ryan’s phone." : ""} Illustrative document for this demo.</div>
    </div>
  );
}

function PolicyPaper({ s }: { s: DemoState }) {
  const p = s.policies[0];
  const ins = s.instalments.filter(i => i.policyId === p.id);
  return (
    <div className="rt-paper">
      <Letterhead s={s} doc="Policy schedule" right={<div style={{ marginTop: 4 }}>{p.insurer} · {p.reference}</div>} />
      <div className="meta">
        <div><div className="k">Cover</div><div className="v">{p.name}, {p.machineIds.length} machines</div></div>
        <div><div className="k">Renews</div><div className="v">{dLong(p.renews)}</div></div>
        <div><div className="k">Instalment</div><div className="v">{euro(p.monthlyCents)} a month</div></div>
        <div><div className="k">Insured</div><div className="v">{s.settings.displayName}</div></div>
      </div>
      <h2>Machines covered</h2>
      <table>
        <tbody>{p.machineIds.map(m => <tr key={m}><td>{m}</td><td>{machine(s, m)!.name}</td></tr>)}</tbody>
      </table>
      <h2>Instalments</h2>
      <table>
        <tbody>{ins.map(i => <tr key={i.id}><td>{dMed(i.date)}</td><td>{i.status === "paid" ? "Paid" : "Due"}</td><td className="r">{euro(i.amountCents)}</td></tr>)}</tbody>
      </table>
      <div className="foot">Illustrative schedule for this demo.</div>
    </div>
  );
}
