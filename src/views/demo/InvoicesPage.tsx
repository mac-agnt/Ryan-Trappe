import { useState } from "react";
import { useDemo, can, recordPayment, recordPromise, sendReminder, draftReminder } from "../../demo/store";
import { chaseList, invoice, invoiceLines, invoiceView, reminderText, STATE_LABEL, sum } from "../../demo/derive";
import { TODAY, dLong, dMed, dShort, euro, hours, parseEuro, plural } from "../../demo/format";
import { search } from "../../demo/search";
import { go, select, useRoute } from "../../demo/router";
import { openInvoice, openPrint, toast } from "../../demo/ui";
import type { DemoState, Invoice } from "../../demo/types";
import { Btn, Card, Chain, Chip, Detail, Empty, Field, IC, Icon, Kv, PageHead, Section, Seg, grid } from "./ui";

export default function InvoicesPage() {
  const r = useRoute();
  if (r.tab === "chase") return <ChaseTab />;
  if (r.tab === "payments") return <PaymentsTab />;
  return <BookTab />;
}

const tone = (st: string) => st === "paid" ? "ok" as const : st === "overdue" ? "attn" as const : st === "draft" ? "slate" as const : "sel" as const;

function BookTab() {
  const s = useDemo();
  const r = useRoute();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "open" | "paid" | "draft">("all");
  const all = s.invoices.slice().sort((a, b) => b.id.localeCompare(a.id)).map(i => invoiceView(s, i));
  const hitIds = q.trim() ? new Set(search(s, q, ["invoice", "receipt", "payment", "job", "customer"]).flatMap(h => h.kind === "invoice" ? [h.id] : h.kind === "job" ? s.invoices.filter(i => i.jobId === h.id).map(i => i.id) : h.kind === "customer" ? s.invoices.filter(i => i.customerId === h.id).map(i => i.id) : h.kind === "receipt" ? [s.receipts.find(x => x.id === h.id)!.invoiceId] : [s.payments.find(x => x.id === h.id)!.invoiceId])) : null;
  const shown = all.filter(v => (!hitIds || hitIds.has(v.inv.id)) && (f === "all" || (f === "open" ? v.balance > 0 && v.inv.status === "sent" : f === "paid" ? v.state === "paid" : v.state === "draft")));
  const sel = r.id ? all.find(v => v.inv.id === r.id) : undefined;
  return (
    <div className="rt-page">
      <PageHead title="Invoice book" sub="Search by customer, job, month or in plain English. Open an invoice line to see the diary behind it." />
      <div className="rt-split">
        <Card>
          <div className="rt-card-h" style={{ flexWrap: "wrap" }}>
            <div className="rt-inline" style={{ flex: "1 1 240px", flexWrap: "nowrap", height: 38, padding: "0 12px", border: "1px solid var(--border)", borderRadius: "var(--r-md,12px)", background: "var(--surface-2)" }}>
              <Icon d={IC.search} size={15} style={{ color: "var(--faint)" }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Glenwater, October, unpaid, river…" aria-label="Search invoices" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "none", fontSize: 13.5, color: "var(--ink)" }} />
              {q && <button type="button" className="rt-btn rt-btn-g rt-btn-sm" onClick={() => setQ("")}>Clear</button>}
            </div>
            <Seg value={f} onChange={setF} label="Filter invoices" options={[["all", "All"], ["open", "Open"], ["paid", "Paid"], ["draft", "Draft"]]} />
          </div>
          {q && <div className="rt-faint" style={{ fontSize: 12, padding: "0 18px 10px" }}>{plural(shown.length, "invoice")} match “{q}”</div>}
          {shown.map(v => (
            <button key={v.inv.id} type="button" className="rt-row" aria-selected={sel?.inv.id === v.inv.id} onClick={() => select(v.inv.id)} style={grid("minmax(0,1.5fr) 90px 92px 130px", "minmax(0,1fr) auto auto")}>
              <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{v.inv.id} · {v.customer.name}</span><span className="rt-cell-s" style={{ display: "block" }}>{v.job.id} {v.job.name}</span></span>
              <span className="rt-cell rt-hide-mobile">{v.inv.issued ? dShort(v.inv.issued) : "Not sent"}</span>
              <span className="rt-cell rt-num rt-strong">{euro(v.total)}</span>
              <span><Chip tone={tone(v.state)}>{v.state === "part-paid" || (v.state === "overdue" && v.paid > 0) ? euro(v.balance) + " owed" : STATE_LABEL[v.state]}</Chip></span>
            </button>
          ))}
          {!shown.length && <Empty title="No invoice matches">Try a customer, a job, a month like “October”, or “unpaid”.</Empty>}
        </Card>
        <Detail open={!!sel} backLabel="Invoice book">
          {sel ? <InvoiceSummary s={s} inv={sel.inv} /> : <Card pad title="Pick an invoice"><div className="rt-muted" style={{ fontSize: 13 }}>Lines, payments and receipts show here.</div></Card>}
        </Detail>
      </div>
    </div>
  );
}

function InvoiceSummary({ s, inv }: { s: DemoState; inv: Invoice }) {
  const v = invoiceView(s, inv);
  const lines = invoiceLines(s, inv);
  return (
    <Card>
      <div className="rt-card-h" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rt-label">{inv.source === "excel" ? "Imported from the Excel workbook" : "Made in Pulse"}</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5 }}>{inv.id} · {euro(v.total)}</div>
          <div className="rt-muted" style={{ fontSize: 13, marginTop: 3 }}>{v.customer.name} · {v.job.name}</div>
        </div>
        <Chip tone={tone(v.state)}>{STATE_LABEL[v.state]}</Chip>
      </div>
      <div className="rt-card-b">
        <Kv items={[["Issued", inv.issued ? dMed(inv.issued) : "Not sent"], ["Due", inv.due ? dMed(inv.due) : "On send"], ["Received", euro(v.paid)], ["Balance", euro(inv.status === "sent" ? v.balance : v.total)]]} />
        <Section label="Lines">
          <div className="rt-card" style={{ background: "var(--surface-2)" }}>
            {lines.map(l => (
              <button key={l.id} type="button" className="rt-row" onClick={() => openInvoice(inv.id, l.id)} style={grid("minmax(0,1fr) auto")}>
                <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal" }}>{l.description}</span><span className="rt-cell-s" style={{ display: "block" }}>{hours(l.hours)} × {euro(l.rateCents)} · {l.machineLineIds.length} dated entries</span></span>
                <span className="rt-strong rt-num">{euro(l.amountCents)}</span>
              </button>
            ))}
          </div>
        </Section>
        {v.payments.length > 0 && (
          <Section label="Payments">
            {v.payments.map(p => (
              <div key={p.id} className="rt-inline" style={{ fontSize: 13, padding: "6px 0", flexWrap: "nowrap" }}>
                <span style={{ flex: 1, minWidth: 0 }}>{dShort(p.date)} · {p.reference}</span>
                <span className="rt-num rt-strong">{euro(p.amountCents)}</span>
                <Btn sm icon={IC.receipt} onClick={() => openPrint("receipt", p.receiptId)}>{p.receiptId}</Btn>
              </div>
            ))}
          </Section>
        )}
        <div className="rt-inline" style={{ marginTop: 16 }}>
          <Btn kind="p" onClick={() => openInvoice(inv.id)}>Open invoice</Btn>
          <Btn icon={IC.print} onClick={() => openPrint("invoice", inv.id)}>Print</Btn>
          {v.state === "paid" && <Btn icon={IC.doc} onClick={() => openPrint("grant", inv.id)}>Grant paperwork</Btn>}
          {v.balance > 0 && inv.status === "sent" && <Btn onClick={() => go({ page: "invoices", tab: "chase", id: inv.id })}>To chase</Btn>}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- to chase ---------------- */
function ChaseTab() {
  const s = useDemo();
  const r = useRoute();
  const list = chaseList(s);
  const selInv = r.id ? invoice(s, r.id) : list[0]?.inv;
  const settled = s.invoices.filter(i => i.status === "sent" && invoiceView(s, i).balance <= 0 && s.reminders.some(x => x.invoiceId === i.id))
    .map(i => invoiceView(s, i));
  return (
    <div className="rt-page">
      <PageHead title="To chase" sub={list.length ? euro(sum(list.map(v => v.balance))) + " owed on " + plural(list.length, "invoice") + ", oldest first. Reminders are drafted for you and only go when you say so." : "Nobody owes you anything right now."} />
      <div className="rt-split wide-r">
        <div className="rt-stack">
          <Card title="Open balances">
            {list.map(v => (
              <button key={v.inv.id} type="button" className="rt-row" aria-selected={selInv?.id === v.inv.id} onClick={() => select(v.inv.id)} style={grid("minmax(0,1fr) auto")}>
                <span style={{ minWidth: 0 }}>
                  <span className="rt-cell-t" style={{ display: "block" }}>{v.customer.name}</span>
                  <span className="rt-cell-s" style={{ display: "block" }}>{v.inv.id} · {v.lastPayment ? "last paid " + euro(v.lastPayment.amountCents) + " on " + dShort(v.lastPayment.date) : "no payment yet"}</span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span className="rt-strong rt-num" style={{ display: "block", fontSize: 15 }}>{euro(v.balance)}</span>
                  <Chip tone={v.held ? "sel" : v.overdueDays ? "attn" : undefined}>{v.held ? "Promised " + dShort(v.promise!.date) : v.overdueDays ? v.overdueDays + " days overdue" : "Due " + dShort(v.inv.due)}</Chip>
                </span>
              </button>
            ))}
            {!list.length && <Empty title="All paid up">Settled invoices stay below.</Empty>}
          </Card>
          {settled.length > 0 && (
            <Card title="Recently settled">
              {settled.map(v => (
                <button key={v.inv.id} type="button" className="rt-row" onClick={() => select(v.inv.id)} aria-selected={selInv?.id === v.inv.id} style={grid("minmax(0,1fr) auto")}>
                  <span className="rt-cell-t">{v.customer.name} · {v.inv.id}</span>
                  <Chip tone="ok">Paid in full</Chip>
                </button>
              ))}
            </Card>
          )}
        </div>
        <Detail open={!!r.id} backLabel="To chase">
          {selInv ? <ChaseDetail s={s} inv={selInv} key={selInv.id} /> : <Card pad><Empty title="Nothing to chase" /></Card>}
        </Detail>
      </div>
    </div>
  );
}

function ChaseDetail({ s, inv }: { s: DemoState; inv: Invoice }) {
  const v = invoiceView(s, inv);
  const [promiseDate, setPromiseDate] = useState(v.promise?.date || "2026-11-27");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [lastReceipt, setLastReceipt] = useState("");
  const allowed = can(s, "sendReminder");
  const pending = v.pendingReminder;
  const sentReminders = v.reminders.filter(x => x.status === "sent");
  const paid = v.balance <= 0;

  return (
    <Card>
      <div className="rt-card-h" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rt-label">{inv.id} · {v.job.name}</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px", marginTop: 5 }}>{paid ? "Paid in full" : euro(v.balance) + " owed"}</div>
          <div className="rt-muted" style={{ fontSize: 13, marginTop: 3 }}>{v.customer.name} · {v.customer.contact} · on a {euro(v.total)} invoice</div>
        </div>
        <Chip tone={paid ? "ok" : v.held ? "sel" : v.overdueDays ? "attn" : undefined}>{paid ? "Paid in full" : v.held ? "Promised" : v.overdueDays ? v.overdueDays + " days overdue" : "Not due yet"}</Chip>
      </div>
      <div className="rt-card-b">
        <Kv items={[
          ["Issued", dMed(inv.issued)], ["Due", dMed(inv.due)], ["Received so far", euro(v.paid)],
          ["Latest payment", v.lastPayment ? euro(v.lastPayment.amountCents) + ", " + dShort(v.lastPayment.date) : "None"],
          ["Expected", paid ? "Settled" : v.held ? dShort(v.promise!.date) + ", " + v.customer.contact + "’s promise" : v.overdueDays ? "Unknown, no date agreed" : dShort(inv.due) + ", due date"],
        ]} />

        {!paid && (
          <Section label={pending ? (pending.status === "held" ? "Reminder on hold until " + dShort(pending.heldUntil) : "Reminder ready · drafted by Invoice Assistant") : "Reminder"}>
            {pending ? (
              <>
                <div className="rt-quote">{reminderText(s, inv.id)}</div>
                <div className="rt-help">To {v.customer.email}. Sending is simulated: nothing leaves this demo.</div>
                <div className="rt-inline" style={{ marginTop: 10 }}>
                  <Btn kind="p" icon={IC.send} disabled={!allowed || v.held} onClick={() => { sendReminder(inv.id); toast("Reminder sent to " + v.customer.name + " (simulated)."); }}>{v.held ? "Held until " + dShort(v.promise!.date) : "Send reminder"}</Btn>
                  {!allowed && <span className="rt-faint" style={{ fontSize: 12 }}>Only Ryan sends reminders.</span>}
                </div>
              </>
            ) : (
              <div className="rt-inline"><span className="rt-muted" style={{ fontSize: 13, flex: 1 }}>No reminder drafted.</span><Btn sm onClick={() => draftReminder(inv.id)}>Draft one</Btn></div>
            )}
          </Section>
        )}

        {!paid && (
          <Section label="They said they’ll pay">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "end" }}>
              <Field label={"Promised date for " + euro(v.balance)}>
                <input className="rt-input" type="date" min={TODAY} value={promiseDate} onChange={e => setPromiseDate(e.target.value)} />
              </Field>
              <Btn disabled={!allowed || !promiseDate} onClick={() => { recordPromise(inv.id, promiseDate); toast("Promise recorded. Reminders held until " + dShort(promiseDate) + "."); }}>{v.promise ? "Update promise" : "Record promise"}</Btn>
            </div>
            {v.held && <div className="rt-note sel" style={{ marginTop: 10 }}>{v.customer.contact} promised {euro(Math.min(v.promise!.amountCents, v.balance))} by {dLong(v.promise!.date)}. It shows under Promised on the dashboard, separate from cash received. No reminder goes before then.</div>}
          </Section>
        )}

        {!paid && (
          <Section label="Record a payment">
            <div className="rt-cols c3" style={{ alignItems: "end" }}>
              <Field label="Amount" error={err}>
                <input className="rt-input" inputMode="decimal" placeholder={"Up to " + euro(v.balance)} value={amount} onChange={e => { setAmount(e.target.value); setErr(""); }} />
              </Field>
              <Field label="How">
                <select className="rt-input" value={method} onChange={e => setMethod(e.target.value)}>
                  <option>Bank transfer</option><option>Cheque</option><option>Cash</option>
                </select>
              </Field>
              <Field label="Reference">
                <input className="rt-input" placeholder="Optional" value={ref} onChange={e => setRef(e.target.value)} />
              </Field>
            </div>
            <div className="rt-inline" style={{ marginTop: 10 }}>
              <Btn kind="p" disabled={!can(s, "recordPayment") || !amount} onClick={() => {
                const res = recordPayment(inv.id, parseEuro(amount), method, ref);
                if (!res.ok) { setErr(res.message || "Couldn’t record that."); return; }
                setLastReceipt(res.receiptId || ""); setAmount(""); setRef("");
                toast("Payment recorded against " + inv.id + ".");
              }}>Record payment</Btn>
              <span className="rt-faint" style={{ fontSize: 12 }}>Dated {dShort(TODAY)}. Entered by hand, there’s no bank feed.</span>
            </div>
          </Section>
        )}

        {lastReceipt && (
          <div className="rt-note sel" style={{ marginTop: 14 }}>
            <div className="rt-inline" style={{ flexWrap: "nowrap" }}>
              <span style={{ flex: 1 }}>{lastReceipt.startsWith("RC") ? "Paid in full. Receipt " + lastReceipt + " is ready and reminders have stopped." : "Payment acknowledged. " + lastReceipt + " shows " + euro(v.balance) + " still due."}</span>
              <Btn sm kind="p" icon={IC.receipt} onClick={() => openPrint("receipt", lastReceipt)}>Open {lastReceipt}</Btn>
            </div>
          </div>
        )}

        <Section label="History">
          <div className="rt-tl">
            <div className="rt-tl-i"><div style={{ fontSize: 13 }}>Invoice {inv.id} sent for {euro(v.total)}</div><div className="rt-faint" style={{ fontSize: 12 }}>{dShort(inv.issued)}, due {dShort(inv.due)}</div></div>
            {[...sentReminders.map(x => ({ d: x.sentOn!, t: "Reminder sent", sub: "", k: "r" as const, id: x.id })),
              ...v.payments.map(p => ({ d: p.date, t: euro(p.amountCents) + " received", sub: p.reference + " · " + p.receiptId, k: "p" as const, id: p.receiptId })),
              ...s.promises.filter(p => p.invoiceId === inv.id).map(p => ({ d: p.recordedAt.slice(0, 10), t: "Promise: " + euro(p.amountCents) + " by " + dShort(p.date), sub: p.status === "open" ? "Open" : p.status === "kept" ? "Kept" : "Replaced", k: "m" as const, id: p.id }))]
              .sort((a, b) => a.d.localeCompare(b.d))
              .map(x => (
                <div key={x.id} className={"rt-tl-i" + (x.k === "p" ? " sel" : x.k === "r" ? " attn" : "")}>
                  <div style={{ fontSize: 13 }}>{x.t}{x.k === "p" && <> · <button type="button" className="rt-link" onClick={() => openPrint("receipt", x.id)}>{x.id}</button></>}</div>
                  <div className="rt-faint" style={{ fontSize: 12 }}>{dShort(x.d)}{x.sub && x.k !== "p" ? " · " + x.sub : x.k === "p" ? " · " + x.sub.split(" · ")[0] : ""}</div>
                </div>
              ))}
          </div>
        </Section>
      </div>
    </Card>
  );
}

/* ---------------- payments & receipts ---------------- */
function PaymentsTab() {
  const s = useDemo();
  const r = useRoute();
  const [f, setF] = useState<"all" | "nov">("all");
  const pays = s.payments.slice().sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt)).filter(p => f === "all" || p.date.startsWith("2026-11"));
  const sel = r.id ? (s.payments.find(p => p.id === r.id) || s.payments.find(p => p.receiptId === r.id) || s.payments.filter(p => p.invoiceId === r.id).pop()) : undefined;
  const novC = sum(s.payments.filter(p => p.date.startsWith("2026-11")).map(p => p.amountCents));
  return (
    <div className="rt-page">
      <PageHead title="Payments & receipts" sub={"Every payment is entered by hand and gets its own receipt. November so far: " + euro(novC) + " received."} />
      <div className="rt-split">
        <Card title={plural(pays.length, "payment")} right={<Seg value={f} onChange={setF} label="Period" options={[["all", "All"], ["nov", "November"]]} />}>
          {pays.map(p => {
            const v = invoiceView(s, invoice(s, p.invoiceId)!);
            const rc = s.receipts.find(x => x.id === p.receiptId)!;
            return (
              <button key={p.id} type="button" className="rt-row" aria-selected={sel?.id === p.id} onClick={() => select(p.id)} style={grid("82px minmax(0,1fr) auto")}>
                <span className="rt-cell">{dShort(p.date)}</span>
                <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{v.customer.name}</span><span className="rt-cell-s" style={{ display: "block" }}>{p.invoiceId} · {p.reference} · {rc.kind === "paid" ? "paid receipt" : "acknowledgement"} {rc.id}</span></span>
                <span className="rt-strong rt-num">{euro(p.amountCents)}</span>
              </button>
            );
          })}
        </Card>
        <Detail open={!!sel} backLabel="Payments">
          {sel ? (() => {
            const v = invoiceView(s, invoice(s, sel.invoiceId)!);
            const rc = s.receipts.find(x => x.id === sel.receiptId)!;
            const paidTo = sum(v.payments.slice(0, v.payments.findIndex(x => x.id === sel.id) + 1).map(x => x.amountCents));
            return (
              <Card>
                <div className="rt-card-h" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div className="rt-label">{rc.kind === "paid" ? "Paid receipt" : "Payment acknowledgement"} · {rc.id}</div>
                    <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5 }}>{euro(sel.amountCents)} from {v.customer.name}</div>
                  </div>
                  <Chip tone={v.total - paidTo === 0 ? "ok" : "attn"}>{v.total - paidTo === 0 ? "Paid in full" : euro(v.total - paidTo) + " still due"}</Chip>
                </div>
                <div className="rt-card-b">
                  <Kv items={[["Paid on", dMed(sel.date)], ["Reference", sel.reference], ["Method", sel.method], ["Invoice", sel.invoiceId + " · " + euro(v.total)], ["Balance after", euro(v.total - paidTo)], ["Receipt issued", dMed(rc.issued)]]} />
                  <Section label="Links"><Chain items={[
                    { label: v.customer.name, run: () => go({ page: "records", tab: "directory", id: v.customer.id }) },
                    { label: v.job.id + " " + v.job.name, run: () => go({ page: "jobs", tab: "jobs", id: v.job.id }) },
                    { label: v.inv.id, run: () => openInvoice(v.inv.id) },
                    { label: sel.reference, run: () => select(sel.id) },
                    { label: rc.id, run: () => openPrint("receipt", rc.id) },
                  ]} /></Section>
                  <div className="rt-inline" style={{ marginTop: 16 }}>
                    <Btn kind="p" icon={IC.print} onClick={() => openPrint("receipt", rc.id)}>Print {rc.id}</Btn>
                    {v.state === "paid" && <Btn icon={IC.doc} onClick={() => openPrint("grant", v.inv.id)}>Grant paperwork</Btn>}
                  </div>
                </div>
              </Card>
            );
          })() : <Card pad title="Pick a payment"><div className="rt-muted" style={{ fontSize: 13 }}>The receipt, the invoice and the reference show here.</div></Card>}
        </Detail>
      </div>
    </div>
  );
}

