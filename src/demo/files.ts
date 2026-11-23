import type { DemoState, LinkRef } from "./types";
import { invoiceView, supplier, machine } from "./derive";
import { dMed, euro } from "./format";

/* Records → Files, built from the store so new invoices and receipts appear
   as soon as they exist. Same shape the Pulse file viewer already renders. */

export interface FileRow {
  type: "folder" | "file"; id: string; name: string; depth: number; parent?: string; indexed?: boolean;
  path?: string; title?: string; facts?: [string, string][]; body?: string[]; links?: [string, string, LinkRef][];
}

export function buildFileTree(s: DemoState): FileRow[] {
  const out: FileRow[] = [];
  const folder = (id: string, name: string) => out.push({ type: "folder", id, name, depth: 0 });

  folder("f-inv", "Invoices");
  s.invoices.filter(i => i.status === "sent").sort((a, b) => b.id.localeCompare(a.id)).forEach(i => {
    const v = invoiceView(s, i);
    out.push({
      type: "file", id: i.id, name: i.id + " · " + v.customer.name + ".pdf", depth: 1, parent: "f-inv", indexed: true,
      path: "Invoices / " + v.customer.name, title: i.id + ", " + v.job.name,
      facts: [["ISSUED", dMed(i.issued)], ["TOTAL", euro(v.total)], ["BALANCE", euro(v.balance)], ["SOURCE", i.source === "excel" ? "Excel workbook" : "Pulse"]],
      body: [
        v.job.name + " for " + v.customer.name + ", " + i.lines.map(l => l.hours + " h " + machine(s, l.machineId)!.short.toLowerCase()).join(" and ") + ".",
        v.balance > 0 ? euro(v.balance) + " is still owed." + (v.payments.length ? " Paid so far: " + euro(v.paid) + "." : "") : "Paid in full on " + dMed(v.lastPayment?.date) + ", reference " + (v.lastPayment?.reference || "") + ".",
      ],
      links: [[v.customer.name, "customer", { page: "records", tab: "directory", id: v.customer.id }], [v.job.id, "job", { page: "jobs", tab: "jobs", id: v.job.id }], ...v.receipts.map(r => [r.id, "receipt", { page: "invoices", tab: "payments", id: r.id }] as [string, string, LinkRef])],
    });
  });

  folder("f-rc", "Receipts");
  s.receipts.slice().sort((a, b) => b.issued.localeCompare(a.issued)).forEach(r => {
    const p = s.payments.find(x => x.id === r.paymentId)!;
    const v = invoiceView(s, s.invoices.find(i => i.id === r.invoiceId)!);
    out.push({
      type: "file", id: r.id, name: r.id + " · " + (r.kind === "paid" ? "paid receipt" : "payment acknowledgement") + ".pdf", depth: 1, parent: "f-rc", indexed: true,
      path: "Receipts / " + v.customer.name, title: r.id + (r.kind === "paid" ? ", paid receipt" : ", payment acknowledgement"),
      facts: [["RECEIVED", euro(p.amountCents)], ["PAID ON", dMed(p.date)], ["REFERENCE", p.reference], ["INVOICE", r.invoiceId]],
      body: [euro(p.amountCents) + " from " + v.customer.name + " against " + r.invoiceId + " (" + v.job.name + ").", r.kind === "paid" ? "Confirms payment in full." : "Part payment. The rest of the invoice was still due at the time."],
      links: [[v.customer.name, "customer", { page: "records", tab: "directory", id: v.customer.id }], [r.invoiceId, "invoice", { page: "invoices", tab: "book", id: r.invoiceId }]],
    });
  });

  folder("f-bills", "Supplier bills");
  s.costs.forEach(c => {
    const d = s.docs.find(x => x.id === c.docId)!;
    const sup = supplier(s, c.supplierId)!;
    out.push({
      type: "file", id: d.id, name: sup.name + " " + c.reference + (c.source === "Paper receipt" ? ".jpg" : ".pdf"), depth: 1, parent: "f-bills", indexed: true,
      path: "Supplier bills / " + c.category, title: d.title,
      facts: [["AMOUNT", euro(c.amountCents)], ["PAID", dMed(c.paidDate)], ["SOURCE", c.source], ["JUSTIN", c.justin === "ready" ? "Not yet" : "Has it"]],
      body: [c.category + " from " + sup.name + (c.machineId ? " for " + c.machineId + " " + machine(s, c.machineId)!.short : "") + ".", c.source === "Paper receipt" ? "A photo of the counter receipt, taken on Ryan’s phone." : "Arrived by email from the supplier."],
      links: [[sup.name, "supplier", { page: "records", tab: "directory", id: sup.id }], [c.id, "cost", { page: "costs", tab: "receipts", id: c.id }]],
    });
  });

  folder("f-imp", "Imports");
  const wb = s.docs.find(x => x.id === "DOC-WORKBOOK")!;
  out.push({
    type: "file", id: wb.id, name: "Invoice workbook.xlsx", depth: 1, parent: "f-imp", indexed: false,
    path: "Imports", title: wb.title, facts: [["IMPORTED", dMed(wb.date)], ["INVOICES", "6"], ["DIARY DAYS", "19"], ["INDEXED", "Rows only"]],
    body: ["The workbook Ryan kept before Pulse. Its rows were imported once; the numbers you see come from those rows, not from re-reading the file."],
    links: [["Sources", "activity", { page: "activity", tab: "sources", id: "excel" }]],
  });
  return out;
}
