import type { DemoState, LinkRef } from "./types";
import { customer, invoiceView, supplier, costLabel } from "./derive";
import { dDayMon, dMed, dRange, euro, monthOf } from "./format";

/* One record index for the command palette, the Records directory and the
   chat fallback. Matches customer, job, month or plain words. */

export type Kind = "customer" | "supplier" | "person" | "job" | "machine" | "invoice" | "payment" | "receipt" | "cost" | "document";
export interface Hit { kind: Kind; id: string; title: string; sub: string; link: LinkRef; hay: string; months: string[]; }

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const STOP = new Set(["the", "a", "an", "for", "of", "to", "and", "on", "in", "my", "me", "find", "show", "get", "with", "what", "which", "where", "is", "was", "did", "from", "job", "jobs", "please", "that", "this", "all", "any"]);

export function index(s: DemoState): Hit[] {
  const out: Hit[] = [];
  const m = (d?: string) => (d ? [monthOf(d)] : []);
  s.customers.forEach(c => out.push({ kind: "customer", id: c.id, title: c.name, sub: c.kind === "enquiry" ? "Enquiry, " + c.contact : "Customer, " + c.contact, link: { page: "records", tab: "directory", id: c.id }, hay: [c.name, c.contact, c.email, c.kind].join(" "), months: [] }));
  s.suppliers.forEach(x => out.push({ kind: "supplier", id: x.id, title: x.name, sub: "Supplier, " + x.category.toLowerCase(), link: { page: "records", tab: "directory", id: x.id }, hay: [x.name, x.category, x.email].join(" "), months: [] }));
  s.people.forEach(p => out.push({ kind: "person", id: p.id, title: p.name, sub: p.role, link: { page: "records", tab: "directory", id: p.id }, hay: [p.name, p.role, p.email, p.crew].join(" "), months: [] }));
  s.jobs.forEach(j => {
    const c = customer(s, j.customerId)!;
    const river = c.id === "C-GLEN" ? " river rivers bank weir" : "";
    out.push({ kind: "job", id: j.id, title: j.id + " " + j.name, sub: c.name + ", " + dRange(j.workdays), link: { page: "jobs", tab: "jobs", id: j.id }, hay: [j.id, j.name, j.location, c.name, river].join(" "), months: Array.from(new Set(j.workdays.map(monthOf))) });
  });
  s.machines.forEach(x => out.push({ kind: "machine", id: x.id, title: x.id + " " + x.name, sub: euro(x.rateCents) + "/h with operator", link: { page: "plant", tab: "machines", id: x.id }, hay: [x.id, x.name, x.short, ...x.aliases, "plant machine digger"].join(" "), months: [] }));
  s.invoices.forEach(i => {
    const v = invoiceView(s, i);
    const river = i.customerId === "C-GLEN" ? " river rivers" : "";
    out.push({ kind: "invoice", id: i.id, title: i.id + " " + v.customer.name, sub: (i.issued ? "Issued " + dMed(i.issued) + ", " : "Draft, ") + euro(v.total) + (v.balance > 0 && i.status === "sent" ? ", " + euro(v.balance) + " owed" : i.status === "sent" ? ", paid" : ""), link: { page: "invoices", tab: "book", id: i.id }, hay: [i.id, v.customer.name, v.job.name, v.job.id, v.job.location, river, "invoice", v.state === "paid" ? "paid" : "unpaid owed open"].join(" "), months: m(i.issued).concat(v.job.workdays.map(monthOf)) });
  });
  s.payments.forEach(p => {
    const v = invoiceView(s, s.invoices.find(i => i.id === p.invoiceId)!);
    out.push({ kind: "payment", id: p.id, title: euro(p.amountCents) + " from " + v.customer.name, sub: dMed(p.date) + ", " + p.reference + ", against " + p.invoiceId, link: { page: "invoices", tab: "payments", id: p.id }, hay: [p.reference, p.invoiceId, v.customer.name, v.job.name, "payment paid"].join(" "), months: m(p.date) });
  });
  s.receipts.forEach(r => {
    const p = s.payments.find(x => x.id === r.paymentId)!;
    const v = invoiceView(s, s.invoices.find(i => i.id === r.invoiceId)!);
    const river = v.customer.id === "C-GLEN" ? " river rivers grant" : "";
    out.push({ kind: "receipt", id: r.id, title: r.id + (r.kind === "paid" ? " paid receipt" : " payment acknowledgement"), sub: v.customer.name + ", " + euro(p.amountCents) + " on " + dDayMon(p.date) + ", " + r.invoiceId, link: { page: "invoices", tab: "payments", id: r.id }, hay: [r.id, r.invoiceId, v.customer.name, v.job.name, v.job.location, river, p.reference, "receipt", r.kind === "paid" ? "paid" : "acknowledgement part"].join(" "), months: m(p.date).concat(m(v.inv.issued)).concat(v.job.workdays.map(monthOf)) });
  });
  s.costs.forEach(c => out.push({ kind: "cost", id: c.id, title: costLabel(s, c), sub: c.category + ", " + euro(c.amountCents) + ", paid " + dDayMon(c.paidDate), link: { page: "costs", tab: "receipts", id: c.id }, hay: [c.reference, supplier(s, c.supplierId)!.name, c.category, c.source, "cost spend receipt bill", c.machineId || ""].join(" "), months: m(c.paidDate) }));
  s.docs.forEach(d => out.push({ kind: "document", id: d.id, title: d.title, sub: d.source + ", " + dMed(d.date), link: { page: "records", tab: "files", id: d.id }, hay: [d.title, d.kind, d.source, ...d.linkIds, "document file"].join(" "), months: m(d.date) }));
  return out;
}

export function search(s: DemoState, q: string, kinds?: Kind[]): Hit[] {
  const all = index(s).filter(h => !kinds || kinds.includes(h.kind));
  const raw = q.toLowerCase().replace(/[’']s\b/g, "").replace(/[^a-z0-9€.\- ]/g, " ");
  const terms = raw.split(/\s+/).filter(t => t && !STOP.has(t));
  if (!terms.length) return all;
  const monthTerms = terms.filter(t => MONTHS.some(mn => mn.startsWith(t) && t.length >= 3)).map(t => "2026-" + String(MONTHS.findIndex(mn => mn.startsWith(t)) + 1).padStart(2, "0"));
  const words = terms.filter(t => !MONTHS.some(mn => mn.startsWith(t) && t.length >= 3));
  return all.map(h => {
    const hay = (h.title + " " + h.sub + " " + h.hay).toLowerCase();
    let score = 0, missed = 0;
    words.forEach(w => {
      const stem = w.length > 4 ? w.replace(/(s|es|ing)$/, "") : w;
      if (hay.includes(w) || hay.includes(stem)) score += 2; else missed++;
    });
    if (monthTerms.length) {
      if (monthTerms.some(mt => h.months.includes(mt))) score += 2; else missed += 2;
    }
    return { h, score, missed };
  }).filter(x => x.score > 0 && x.missed === 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.h);
}

export const KIND_LABEL: Record<Kind, string> = {
  customer: "Customer", supplier: "Supplier", person: "Person", job: "Job", machine: "Machine",
  invoice: "Invoice", payment: "Payment", receipt: "Receipt", cost: "Cost", document: "Document",
};

