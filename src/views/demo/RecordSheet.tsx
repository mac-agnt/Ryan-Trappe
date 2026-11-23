import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDemo } from "../../demo/store";
import { customer, invoiceView, job, machine, person, supplier, sum } from "../../demo/derive";
import { dMed, dRange, dShort, euro, stampRelative } from "../../demo/format";
import { closeRecord, openCapture, openInvoice, openPrint, openRecord, setSearch, useUi } from "../../demo/ui";
import { go } from "../../demo/router";
import { search, KIND_LABEL, type Hit } from "../../demo/search";
import { Btn, Chain, Chip, IC, Icon, Kv, Section, Sheet } from "./ui";
import type { DemoState } from "../../demo/types";

/* A record sheet for people, customers, suppliers, payments, costs and
   documents, with the links to every record they touch. */

export function RecordSheet() {
  const s = useDemo();
  const { record } = useUi();
  if (!record) return null;
  const { kind, id } = record;
  let title: ReactNode = id, eyebrow = kind, body: ReactNode = null, chips: ReactNode = null;

  if (kind === "customer") {
    const c = customer(s, id)!;
    const jobs = s.jobs.filter(j => j.customerId === id).sort((a, b) => b.id.localeCompare(a.id));
    const invs = s.invoices.filter(i => i.customerId === id).map(i => invoiceView(s, i));
    const cb = s.callbacks.filter(x => x.customerId === id);
    title = c.name; eyebrow = c.kind === "enquiry" ? "Enquiry" : "Customer";
    chips = <><Chip>{c.kind}</Chip>{c.kind !== "enquiry" && <Chip>{c.termsDays}-day terms</Chip>}</>;
    body = (<>
      <Kv items={[["Contact", c.contact], ["Email", c.email], ["Owes", euro(sum(invs.filter(v => v.inv.status === "sent").map(v => v.balance)))], ["Jobs", String(jobs.length)]]} />
      {jobs.length > 0 && <Section label="Jobs"><List rows={jobs.map(j => ({ t: j.id + " " + j.name, s: dRange(j.workdays) + " · " + j.location, r: j.status === "scheduled" ? "Scheduled" : "", go: () => { closeRecord(); go({ page: "jobs", tab: "jobs", id: j.id }); } }))} /></Section>}
      {invs.length > 0 && <Section label="Invoices"><List rows={invs.map(v => ({ t: v.inv.id, s: (v.inv.issued ? dMed(v.inv.issued) : "Draft") + " · " + euro(v.total), r: v.balance > 0 && v.inv.status === "sent" ? euro(v.balance) + " owed" : v.inv.status === "sent" ? "Paid" : "Draft", go: () => { closeRecord(); openInvoice(v.inv.id); } }))} /></Section>}
      {cb.length > 0 && <Section label="Calls"><List rows={cb.map(x => ({ t: x.name + ", " + stampRelative(x.received), s: x.enquiry, r: x.status === "done" ? "Done" : x.callAt ? "Ring at " + x.callAt : "Waiting", go: () => { closeRecord(); go({ page: "work", tab: "callbacks", id: x.id }); } }))} /></Section>}
    </>);
  } else if (kind === "supplier") {
    const x = supplier(s, id)!;
    const costs = s.costs.filter(c => c.supplierId === id);
    title = x.name; eyebrow = "Supplier"; chips = <Chip>{x.category}</Chip>;
    body = (<>
      <Kv items={[["Category", x.category], ["Email", x.email], ["Paid in November", euro(sum(costs.map(c => c.amountCents)))]]} />
      <Section label="Costs"><List rows={costs.map(c => ({ t: c.reference, s: dShort(c.date) + " · " + c.source, r: euro(c.amountCents), go: () => { closeRecord(); go({ page: "costs", tab: "receipts", id: c.id }); } }))} /></Section>
    </>);
  } else if (kind === "person") {
    const p = person(s, id)!;
    const lines = s.days.flatMap(d => d.lines.filter(l => l.operatorId === id).map(l => ({ d, l })));
    const jobs = Array.from(new Set(lines.map(x => x.d.jobId)));
    title = p.name; eyebrow = p.crew === "external" ? "External" : "Crew";
    chips = <><Chip tone="slate">{p.role}</Chip><Chip>{p.crew === "regular" ? "Regular" : p.crew === "relief" ? "Relief" : "Handover access"}</Chip></>;
    body = (<>
      <Kv items={[["Email", p.email], ["Machine hours logged", String(sum(lines.map(x => x.l.hours)))], ["Jobs", String(jobs.length)]]} />
      {jobs.length > 0 && <Section label="Worked on"><List rows={jobs.map(jid => { const j = job(s, jid)!; return { t: j.id + " " + j.name, s: lines.filter(x => x.d.jobId === jid).length + " machine lines", r: "", go: () => { closeRecord(); go({ page: "jobs", tab: "jobs", id: jid }); } }; })} /></Section>}
      {p.access === "accountant" && <Section label="Access"><div className="rt-note">Justin can open the accountant handover and the documents in it. He can’t see the diary, approve invoices or record payments.</div></Section>}
    </>);
  } else if (kind === "payment") {
    const p = s.payments.find(x => x.id === id)!;
    const v = invoiceView(s, s.invoices.find(i => i.id === p.invoiceId)!);
    title = euro(p.amountCents) + " from " + v.customer.name; eyebrow = "Payment " + p.id;
    body = (<>
      <Kv items={[["Date", dMed(p.date)], ["Reference", p.reference], ["Method", p.method], ["Invoice", p.invoiceId]]} />
      <Section label="Linked records"><Chain items={[
        { label: v.customer.name, run: () => openRecord("customer", v.customer.id) },
        { label: v.job.id + " " + v.job.name, run: () => { closeRecord(); go({ page: "jobs", tab: "jobs", id: v.job.id }); } },
        { label: v.inv.id, run: () => { closeRecord(); openInvoice(v.inv.id); } },
        { label: p.reference, run: () => {} },
        { label: p.receiptId, run: () => openPrint("receipt", p.receiptId) },
      ]} /></Section>
    </>);
  } else if (kind === "cost") {
    const c = s.costs.find(x => x.id === id)!;
    const sup = supplier(s, c.supplierId)!;
    title = sup.name + " " + c.reference; eyebrow = "Cost " + c.id;
    body = <CostBody s={s} id={id} />;
    chips = <><Chip>{c.category}</Chip><Chip tone={c.justin === "ready" ? "attn" : "ok"}>{c.justin === "ready" ? "Justin needs this" : c.justin === "sent" ? "Sent to Justin" : "Justin has it"}</Chip></>;
  } else if (kind === "document") {
    const d = s.docs.find(x => x.id === id)!;
    title = d.title; eyebrow = "Document";
    body = (<>
      <Kv items={[["Type", d.kind], ["Source", d.source], ["Date", dMed(d.date)]]} />
      <Section label="Linked to"><div className="rt-inline">{d.linkIds.map(l => <Chip key={l}>{l}</Chip>)}</div></Section>
    </>);
  }

  return (
    <Sheet title={title} eyebrow={eyebrow} chips={chips} onClose={closeRecord}
      footer={kind === "document" ? <><span className="rt-sp" /><Btn kind="p" icon={IC.print} onClick={() => openPrint("doc", id)}>Open document</Btn></> : undefined}>
      {body}
    </Sheet>
  );
}

function CostBody({ s, id }: { s: DemoState; id: string }) {
  const c = s.costs.find(x => x.id === id)!;
  return (<>
    <Kv items={[["Date", dMed(c.date)], ["Paid", dMed(c.paidDate)], ["Amount", euro(c.amountCents)], ["Proof", c.source === "Paper receipt" ? "Photo of the paper receipt" : "Supplier email"]]} />
    {(c.machineId || c.policyId) && <Section label="Linked to"><div className="rt-inline">
      {c.machineId && <Btn sm onClick={() => { closeRecord(); go({ page: "plant", tab: "machines", id: c.machineId }); }}>{c.machineId} {machine(s, c.machineId)!.short}</Btn>}
      {c.serviceId && <Chip>Repair on {dShort(s.services.find(x => x.id === c.serviceId)!.date)}</Chip>}
      {c.policyId && <Btn sm onClick={() => { closeRecord(); go({ page: "plant", tab: "insurance" }); }}>Plant policy, November instalment</Btn>}
    </div></Section>}
    {c.duplicateDocIds.length > 0 && <Section label="Also received"><div className="rt-note">The supplier sent {c.reference} again on 21 Nov. It was matched to this cost by supplier, reference and amount, so there is still one expense.</div></Section>}
    <div style={{ marginTop: 16 }}><Btn icon={IC.doc} onClick={() => openPrint("doc", c.docId)}>Open the document</Btn></div>
  </>);
}

function List({ rows }: { rows: { t: string; s: string; r: string; go: () => void }[] }) {
  return (
    <div className="rt-card" style={{ background: "var(--surface-2)" }}>
      {rows.map((x, i) => (
        <button key={i} type="button" className="rt-row" onClick={x.go} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
          <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{x.t}</span><span className="rt-cell-s" style={{ display: "block", whiteSpace: "normal" }}>{x.s}</span></span>
          <span className="rt-cell rt-muted">{x.r}</span>
        </button>
      ))}
    </div>
  );
}

/* ---- ⌘K search ---- */
export function SearchPalette({ ask }: { ask: (q: string) => void }) {
  const s = useDemo();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const hits: Hit[] = q.trim() ? search(s, q).slice(0, 12) : [];
  const quick: { t: string; s: string; run: () => void }[] = [
    { t: "Log a day", s: "Sample voice note or typed entry", run: () => openCapture({}) },
    { t: "Who owes me?", s: "Ask in the Home chat", run: () => ask("Who owes me?") },
    { t: "Find the paid receipt for the October river job", s: "Ask in the Home chat", run: () => ask("Find the paid receipt for the October river job") },
    { t: "Ready to invoice", s: "Jobs & diary", run: () => go({ page: "jobs", tab: "ready" }) },
  ];
  const items = q.trim()
    ? [...hits.map(h => ({ t: h.title, s: KIND_LABEL[h.kind] + " · " + h.sub, run: () => openHit(h) })), { t: "Ask Pulse: “" + q.trim() + "”", s: "Answer in the Home chat", run: () => ask(q.trim()) }]
    : quick;
  const run = (i: number) => { const it = items[i]; if (!it) return; setSearch(false); it.run(); };
  return (
    <>
      <div className="rt-scrim" style={{ zIndex: 80 }} onClick={() => setSearch(false)} />
      <div style={{ position: "fixed", inset: 0, zIndex: 81, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "10vh", pointerEvents: "none" }}>
      <div role="dialog" aria-modal="true" aria-label="Search" style={{ pointerEvents: "auto", width: "min(640px, calc(100% - 24px))", background: "var(--overlay)", border: "1px solid var(--border-strong)", borderRadius: "var(--card-r,18px)", boxShadow: "0 34px 90px rgba(0,0,0,.5)", backdropFilter: "blur(30px)", overflow: "hidden", animation: "paletteIn .32s var(--ease) both" }}>
        <div className="rt-inline" style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", flexWrap: "nowrap" }}>
          <Icon d={IC.search} size={17} style={{ color: "var(--faint)" }} />
          <input ref={input} value={q} onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel(x => Math.min(items.length - 1, x + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel(x => Math.max(0, x - 1)); }
              if (e.key === "Enter") { e.preventDefault(); run(sel); }
              if (e.key === "Escape") setSearch(false);
            }}
            placeholder="Search customers, jobs, invoices, months, machines…" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "none", fontSize: 16, color: "var(--ink)" }} />
          <span className="rt-chip">Esc</span>
        </div>
        <div style={{ maxHeight: "min(60vh, 460px)", overflowY: "auto", padding: 6 }}>
          {!q.trim() && <div className="rt-label" style={{ padding: "8px 10px 4px" }}>Quick</div>}
          {items.map((it, i) => (
            <button key={i} type="button" onMouseEnter={() => setSel(i)} onClick={() => run(i)} className="rt-row" aria-selected={sel === i}
              style={{ gridTemplateColumns: "minmax(0,1fr)", borderTop: 0, borderRadius: 12, padding: "10px 12px" }}>
              <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{it.t}</span><span className="rt-cell-s" style={{ display: "block" }}>{it.s}</span></span>
            </button>
          ))}
          {q.trim() && hits.length === 0 && <div className="rt-empty" style={{ padding: "16px 10px 6px" }}>No record matches. Press Enter to ask Pulse instead.</div>}
        </div>
      </div>
      </div>
    </>
  );
}

export function openHit(h: Hit) {
  if (h.kind === "invoice") { go({ page: "invoices", tab: "book", id: h.id }); return; }
  if (h.kind === "receipt") { openPrint("receipt", h.id); return; }
  if (["customer", "supplier", "person", "payment", "cost", "document"].includes(h.kind) && h.link.page === "records") { openRecord(h.kind, h.id); return; }
  go(h.link);
}

export function Toast() {
  const { toast: t } = useUi();
  if (!t) return null;
  return <div className="rt-toast" role="status" key={t.n}><Icon d={IC.check} size={15} sw={2.2} style={{ color: "var(--accent)" }} />{t.text}</div>;
}

