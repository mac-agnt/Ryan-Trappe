import { useState } from "react";
import { useDemo, approveInvoice, sendInvoice, can, getState } from "../../demo/store";
import { invoice, invoiceLines, invoiceView, jobDays, machine, person, STATE_LABEL } from "../../demo/derive";
import { dLong, dMed, dShort, euro, hours } from "../../demo/format";
import { closeInvoice, openInvoice, openPrint, toast, useUi } from "../../demo/ui";
import { go } from "../../demo/router";
import { Btn, Chip, IC, Kv, Section, Sheet } from "./ui";
import type { DemoState, InvoiceLine } from "../../demo/types";

/* Invoice preview and the evidence behind each line: open a line to see the
   dated diary entries, operators and original notes it was built from. */

export default function InvoiceSheet() {
  const s = useDemo();
  const { invoice: o } = useUi();
  const [showDiary, setShowDiary] = useState(false);
  if (!o) return null;
  const inv = invoice(s, o.invoiceId);
  if (!inv) return null;
  const v = invoiceView(s, inv);
  const lines = invoiceLines(s, inv);
  const sel = lines.find(l => l.id === o.lineId);
  const owner = can(s, "approveInvoice");
  const isDraft = inv.status === "draft";

  const chips = (
    <>
      <Chip tone={isDraft ? (inv.approved ? "sel" : "slate") : v.state === "paid" ? "ok" : v.state === "overdue" ? "attn" : "sel"}>
        {isDraft ? (inv.approved ? "Approved, not sent" : "Draft") : STATE_LABEL[v.state]}
      </Chip>
      <Chip>{v.customer.name}</Chip>
      <Chip>{v.job.id} {v.job.name}</Chip>
    </>
  );

  const footer = isDraft ? (
    <>
      <Btn kind="g" icon={IC.print} onClick={() => openPrint("invoice", inv.id)}>Preview print</Btn>
      <span className="rt-sp" />
      {!owner && <span className="rt-faint" style={{ fontSize: 12 }}>Only Ryan approves and sends invoices.</span>}
      {!inv.approved
        ? <Btn kind="p" icon={IC.check} disabled={!owner} onClick={() => approveInvoice(inv.id)}>Approve invoice</Btn>
        : <Btn kind="p" icon={IC.send} disabled={!owner} onClick={() => { sendInvoice(inv.id); toast(inv.id + " sent to " + v.customer.name + " (simulated). Due " + dShort(getState().invoices.find(i => i.id === inv.id)?.due || "")); }}>Send invoice</Btn>}
    </>
  ) : (
    <>
      <Btn kind="g" icon={IC.print} onClick={() => openPrint("invoice", inv.id)}>Print</Btn>
      {v.state === "paid" && <Btn kind="g" icon={IC.doc} onClick={() => openPrint("grant", inv.id)}>Grant paperwork</Btn>}
      <span className="rt-sp" />
      <Btn onClick={() => { closeInvoice(); go({ page: "jobs", tab: "jobs", id: v.job.id }); }}>Open job</Btn>
      {v.balance > 0 && <Btn kind="p" onClick={() => { closeInvoice(); go({ page: "invoices", tab: "chase", id: inv.id }); }}>Open in To chase</Btn>}
    </>
  );

  return (
    <Sheet wide title={inv.id + (isDraft ? " · draft" : "")} eyebrow="Invoice" chips={chips} onClose={closeInvoice} footer={footer}>
      {inv.status === "sent" && s.outbox.some(x => x.linkId === inv.id && x.kind === "invoice") && (
        <div className="rt-note sel" style={{ marginBottom: 14 }}>Sent to {v.customer.email} on {dShort(inv.issued)} (simulated, nothing left this computer). Due {dLong(inv.due)}.</div>
      )}
      <Kv items={[
        ["Issued", inv.issued ? dMed(inv.issued) : "On send"],
        ["Due", inv.due ? dMed(inv.due) : v.customer.termsDays + " days after sending"],
        ["Total", <span className="rt-num">{euro(v.total)}</span>],
        ["Balance", <span className="rt-num">{euro(isDraft ? v.total : v.balance)}</span>],
      ]} />

      <Section label="Lines · open one to see the diary behind it">
        <div className="rt-card" style={{ background: "var(--surface-2)" }}>
          {lines.map((l, i) => (
            <button key={l.id} type="button" className="rt-row" aria-selected={sel?.id === l.id} onClick={() => openInvoice(inv.id, sel?.id === l.id ? undefined : l.id)} style={{ gridTemplateColumns: "24px minmax(0,1fr) auto" }}>
              <span className="rt-faint rt-num" style={{ fontSize: 12 }}>{i + 1}</span>
              <span style={{ minWidth: 0 }}>
                <span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal" }}>{l.description}</span>
                <span className="rt-cell-s" style={{ display: "block" }}>{hours(l.hours)} × {euro(l.rateCents)} · {l.machineLineIds.length} dated entries</span>
              </span>
              <span className="rt-strong rt-num" style={{ fontSize: 14 }}>{euro(l.amountCents)}</span>
            </button>
          ))}
          <div className="rt-row static" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
            <span className="rt-cell rt-strong">Total</span>
            <span className="rt-strong rt-num" style={{ fontSize: 17 }}>{euro(v.total)}</span>
          </div>
        </div>
        <div className="rt-help">Machine with operator, billed by the hour. No separate labour charge. Tax is set up outside this demo.</div>
      </Section>

      {sel && <Evidence s={s} line={sel} />}

      <Section label={"Dated diary appendix · " + jobDays(s, v.job.id).filter(d => d.invoiceId === inv.id || (isDraft && d.status === "approved" && !d.invoiceId)).length + " days"} right={<Btn sm kind="g" onClick={() => setShowDiary(x => !x)}>{showDiary ? "Hide" : "Show"}</Btn>}>
        {showDiary && <DiaryTable s={s} invoiceId={inv.id} draft={isDraft} jobId={v.job.id} />}
      </Section>
    </Sheet>
  );
}

function Evidence({ s, line }: { s: DemoState; line: InvoiceLine }) {
  const rows = line.machineLineIds.map(id => {
    const day = s.days.find(d => d.lines.some(l => l.id === id))!;
    return { day, l: day.lines.find(x => x.id === id)! };
  }).sort((a, b) => a.day.date.localeCompare(b.day.date));
  const m = machine(s, line.machineId)!;
  return (
    <Section label={"Behind this line · " + m.name + " · " + rows.length + " dates"}>
      <div className="rt-card" style={{ background: "var(--surface-2)", animation: "expandIn .25s var(--ease) both" }}>
        {rows.map(({ day, l }) => (
          <div key={l.id} className="rt-row static" style={{ gridTemplateColumns: "92px minmax(0,1fr) 54px", alignItems: "start" }}>
            <span className="rt-cell rt-strong" style={{ fontSize: 12.5 }}>{dShort(day.date)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="rt-cell-t" style={{ display: "block", whiteSpace: "normal" }}>{l.description}</span>
              <span className="rt-cell-s" style={{ display: "block", whiteSpace: "normal" }}>{person(s, l.operatorId)!.name} · original note: “{day.note}” · {day.source === "excel" ? "from the Excel workbook" : day.source === "voice" ? "voice note" : "typed"}</span>
            </span>
            <span className="rt-cell rt-num rt-right">{hours(l.hours)}</span>
          </div>
        ))}
        <div className="rt-row static" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
          <span className="rt-cell">{hours(line.hours)} × {euro(line.rateCents)}</span>
          <span className="rt-strong rt-num">{euro(line.amountCents)}</span>
        </div>
      </div>
    </Section>
  );
}

export function DiaryTable({ s, invoiceId, draft, jobId }: { s: DemoState; invoiceId: string; draft: boolean; jobId: string }) {
  const days = jobDays(s, jobId).filter(d => d.invoiceId === invoiceId || (draft && d.status === "approved" && !d.invoiceId));
  return (
    <div className="rt-card" style={{ background: "var(--surface-2)" }}>
      {days.flatMap(d => d.lines.map((l, i) => (
        <div key={l.id} className="rt-row static" style={{ gridTemplateColumns: "92px 120px minmax(0,1fr) 46px", alignItems: "start" }}>
          <span className="rt-cell" style={{ fontSize: 12.5, color: i ? "var(--faint)" : "var(--ink)" }}>{i ? "" : dShort(d.date)}</span>
          <span className="rt-cell" style={{ fontSize: 12.5 }}>{machine(s, l.machineId)!.short}<br /><span className="rt-faint">{person(s, l.operatorId)!.first}</span></span>
          <span className="rt-cell wrap" style={{ fontSize: 12.5 }}>{l.description}</span>
          <span className="rt-cell rt-num rt-right" style={{ fontSize: 12.5 }}>{hours(l.hours)}</span>
        </div>
      )))}
    </div>
  );
}
