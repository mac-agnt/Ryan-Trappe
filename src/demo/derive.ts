import type { Cents, Cost, CostCategory, DemoState, DiaryDay, Invoice, InvoiceLine, ISODate, Job, Machine, MachineLine, Payment, Task } from "./types";
import { TODAY, addDays, dShort, diffDays, euro, monthOf, words, cap } from "./format";
import { linesToInvoice } from "./seed";

/* Pure read-side helpers. Every number on screen comes from one of these, so
   chat answers, lists, badges, dashboards and print views always agree. */

export const byId = <T extends { id: string }>(list: T[], id?: string) => list.find(x => x.id === id);
export const person = (s: DemoState, id?: string) => byId(s.people, id);
export const customer = (s: DemoState, id?: string) => byId(s.customers, id);
export const supplier = (s: DemoState, id?: string) => byId(s.suppliers, id);
export const machine = (s: DemoState, id?: string) => byId(s.machines, id);
export const job = (s: DemoState, id?: string) => byId(s.jobs, id);
export const invoice = (s: DemoState, id?: string) => byId(s.invoices, id);

export const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);
export const lineAmount = (l: MachineLine) => l.hours * l.rateCents;
export const dayAmount = (d: DiaryDay) => sum(d.lines.map(lineAmount));
export const dayHours = (d: DiaryDay) => sum(d.lines.map(l => l.hours));

export function jobDays(s: DemoState, jobId: string) {
  return s.days.filter(d => d.jobId === jobId).sort((a, b) => a.date.localeCompare(b.date));
}
export function dayFor(s: DemoState, jobId: string, date: ISODate) {
  return s.days.find(d => d.jobId === jobId && d.date === date);
}

export function coverage(s: DemoState, j: Job) {
  const days = jobDays(s, j.id);
  const approved = days.filter(d => d.status === "approved");
  const pastPlanned = j.workdays.filter(d => d <= TODAY);
  const missing = pastPlanned.filter(d => !days.some(x => x.date === d));
  const submitted = days.filter(d => d.status === "submitted");
  return {
    planned: j.workdays.length,
    due: pastPlanned.length,
    approved: approved.length,
    missing,
    submitted,
    complete: pastPlanned.length > 0 && missing.length === 0 && submitted.length === 0 && pastPlanned.length === j.workdays.length,
  };
}

export function unbilledLines(s: DemoState, jobId: string) {
  return jobDays(s, jobId).filter(d => d.status === "approved" && !d.invoiceId).flatMap(d => d.lines);
}
export function unbilledCents(s: DemoState, jobId?: string) {
  const jobs = jobId ? [jobId] : s.jobs.map(j => j.id);
  return sum(jobs.flatMap(id => unbilledLines(s, id)).map(lineAmount));
}

export function invoiceFor(s: DemoState, jobId: string) {
  return s.invoices.find(i => i.jobId === jobId);
}

/** Live lines for a draft (computed from approved rows), or the issued snapshot. */
export function invoiceLines(s: DemoState, inv: Invoice): InvoiceLine[] {
  if (inv.status === "sent") return inv.lines;
  const j = job(s, inv.jobId)!;
  const ds = jobDays(s, j.id).filter(d => d.status === "approved" && (!d.invoiceId || d.invoiceId === inv.id));
  return linesToInvoice(inv.id, j.name, ds.map(d => d.date), ds.flatMap(d => d.lines));
}
export function invoiceTotal(s: DemoState, inv: Invoice): Cents {
  return inv.status === "sent" ? inv.totalCents : sum(invoiceLines(s, inv).map(l => l.amountCents));
}

export function paymentsFor(s: DemoState, invId: string) {
  return s.payments.filter(p => p.invoiceId === invId).sort((a, b) => a.date.localeCompare(b.date) || a.recordedAt.localeCompare(b.recordedAt));
}
export function paidCents(s: DemoState, invId: string) {
  return sum(paymentsFor(s, invId).map(p => p.amountCents));
}

export type InvState = "draft" | "paid" | "part-paid" | "overdue" | "open";
export function invoiceView(s: DemoState, inv: Invoice) {
  const total = invoiceTotal(s, inv);
  const paid = paidCents(s, inv.id);
  const balance = total - paid;
  const overdueDays = inv.status === "sent" && inv.due && balance > 0 ? Math.max(0, diffDays(TODAY, inv.due)) : 0;
  const promise = s.promises.filter(p => p.invoiceId === inv.id && p.status === "open").sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  const pays = paymentsFor(s, inv.id);
  const state: InvState = inv.status === "draft" ? "draft"
    : balance <= 0 ? "paid"
    : overdueDays > 0 ? "overdue"
    : paid > 0 ? "part-paid" : "open";
  const reminders = s.reminders.filter(r => r.invoiceId === inv.id);
  const pendingReminder = reminders.find(r => r.status === "draft" || r.status === "held");
  return {
    inv, total, paid, balance, overdueDays, promise, payments: pays, lastPayment: pays[pays.length - 1], state,
    reminders, pendingReminder,
    held: !!promise && promise.date >= TODAY,
    customer: customer(s, inv.customerId)!, job: job(s, inv.jobId)!,
    receipts: s.receipts.filter(r => r.invoiceId === inv.id),
  };
}
export const STATE_LABEL: Record<InvState, string> = { draft: "Draft", paid: "Paid in full", "part-paid": "Part-paid", overdue: "Overdue", open: "Open" };

export function chaseList(s: DemoState) {
  return s.invoices.filter(i => i.status === "sent").map(i => invoiceView(s, i))
    .filter(v => v.balance > 0)
    .sort((a, b) => b.overdueDays - a.overdueDays || (a.inv.due || "").localeCompare(b.inv.due || ""));
}

export function reminderText(s: DemoState, invId: string) {
  const v = invoiceView(s, invoice(s, invId)!);
  const first = v.customer.contact.split(" ")[0];
  const pay = v.lastPayment;
  const jobName = v.job.name.replace(/^Birch Lane yard drainage$/, "Birch Lane drainage");
  return "Hi " + first + ", " + (pay ? "thanks for the " + euro(pay.amountCents) + " payment. " : "")
    + "There’s " + euro(v.balance) + " left on the " + jobName + " invoice. "
    + "Could you let me know when suits to clear the balance? Thanks, Ryan.";
}

/* ---- money ---- */
export const NOV = "2026-11";
export function cashIn(s: DemoState, month = NOV) {
  return s.payments.filter(p => monthOf(p.date) === month).sort((a, b) => a.date.localeCompare(b.date));
}
export function costsPaid(s: DemoState, month = NOV) {
  return s.costs.filter(c => monthOf(c.paidDate) === month).sort((a, b) => a.date.localeCompare(b.date));
}
export function money(s: DemoState) {
  const ins = cashIn(s), outs = costsPaid(s);
  const inC = sum(ins.map(p => p.amountCents)), outC = sum(outs.map(c => c.amountCents));
  const open = chaseList(s);
  const openC = sum(open.map(v => v.balance));
  const overdue = open.filter(v => v.overdueDays > 0);
  const overdueC = sum(overdue.map(v => v.balance));
  const weekEnd = addDays(TODAY, 7);
  const promised = open.filter(v => v.promise && v.promise.date >= TODAY && v.promise.date <= weekEnd);
  const unconfirmed = overdue.filter(v => !v.promise || v.promise.date < TODAY);
  const notDue = open.filter(v => v.overdueDays === 0 && (!v.promise));
  return {
    ins, outs, inC, outC, net: inC - outC, open, openC, overdue, overdueC,
    unbilledC: unbilledCents(s),
    promised, promisedC: sum(promised.map(v => Math.min(v.balance, v.promise!.amountCents))),
    unconfirmed, unconfirmedC: sum(unconfirmed.map(v => v.balance)),
    notDue, notDueC: sum(notDue.map(v => v.balance)),
  };
}

/* ---- costs ---- */
export const CATS: CostCategory[] = ["Fuel", "Tyres", "Parts", "Insurance"];
export function costsByCat(s: DemoState) {
  const outs = costsPaid(s);
  return CATS.map(c => ({ cat: c, items: outs.filter(x => x.category === c), cents: sum(outs.filter(x => x.category === c).map(x => x.amountCents)) }))
    .filter(g => g.items.length).sort((a, b) => b.cents - a.cents);
}
export function costLabel(s: DemoState, c: Cost) {
  return supplier(s, c.supplierId)!.name + " " + c.reference;
}

/* ---- plant ---- */
export function meterOf(s: DemoState, mid: string) {
  return s.meters.filter(m => m.machineId === mid).sort((a, b) => a.date.localeCompare(b.date) || a.hours - b.hours).pop()!;
}
export function servicesOf(s: DemoState, mid: string) {
  return s.services.filter(x => x.machineId === mid).sort((a, b) => b.date.localeCompare(a.date));
}
export function serviceView(s: DemoState, m: Machine) {
  const meter = meterOf(s, m.id);
  const remaining = m.nextServiceAt - meter.hours;
  const booked = s.services.find(x => x.machineId === m.id && x.status === "scheduled");
  const last = servicesOf(s, m.id).find(x => x.status === "done" && x.kind === "service");
  const lastAny = servicesOf(s, m.id).find(x => x.status === "done");
  return { m, meter, remaining, booked, last, lastAny };
}
export function serviceDiary(s: DemoState) {
  return s.machines.map(m => serviceView(s, m)).sort((a, b) => a.remaining - b.remaining);
}
export function machineUse(s: DemoState, mid: string) {
  const lines = s.days.filter(d => d.status === "approved").flatMap(d => d.lines.filter(l => l.machineId === mid).map(l => ({ l, d })));
  const jobsUsed = Array.from(new Set(lines.map(x => x.d.jobId)));
  const novH = sum(lines.filter(x => monthOf(x.d.date) === NOV).map(x => x.l.hours));
  const lastDay = lines.map(x => x.d.date).sort().pop();
  return { lines, jobsUsed, novH, lastDay, totalH: sum(lines.map(x => x.l.hours)) };
}

/* ---- work ---- */
export const openTasks = (s: DemoState) => s.tasks.filter(t => t.status !== "done")
  .sort((a, b) => a.due.localeCompare(b.due) || (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));
export const doneTasks = (s: DemoState) => s.tasks.filter(t => t.status === "done").sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));

export interface Approval { id: string; kind: "diary" | "invoice" | "reminder" | "handover"; title: string; sub: string; amount?: Cents; link: Task["link"]; by: string; }
export function approvals(s: DemoState): Approval[] {
  const out: Approval[] = [];
  s.days.filter(d => d.status === "submitted").forEach(d => {
    const j = job(s, d.jobId)!;
    out.push({ id: d.id, kind: "diary", title: "Diary for " + dShort(d.date) + " at " + j.name, sub: "Submitted by " + person(s, d.enteredById)!.name, amount: dayAmount(d), link: { page: "jobs", tab: "diary", id: j.id + "@" + d.date }, by: d.enteredById });
  });
  s.invoices.filter(i => i.status === "draft").forEach(i => {
    const j = job(s, i.jobId)!;
    out.push({ id: i.id, kind: "invoice", title: i.id + " for " + j.name, sub: i.approved ? "Approved, not sent yet" : "Prepared from " + jobDays(s, j.id).filter(d => d.status === "approved").length + " approved days", amount: invoiceTotal(s, i), link: { page: "jobs", tab: "ready", id: j.id }, by: "invoice" });
  });
  s.reminders.filter(r => r.status === "draft").forEach(r => {
    const v = invoiceView(s, invoice(s, r.invoiceId)!);
    if (v.balance <= 0 || v.held) return;
    out.push({ id: r.id, kind: "reminder", title: "Reminder to " + v.customer.name, sub: "Second reminder on " + v.inv.id + ", drafted by Invoice Assistant", amount: v.balance, link: { page: "invoices", tab: "chase", id: v.inv.id }, by: "invoice" });
  });
  const ready = s.costs.filter(c => c.justin === "ready");
  if (ready.length) out.push({ id: "handover", kind: "handover", title: "Handover to Justin", sub: ready.length + " document ready to forward", amount: sum(ready.map(c => c.amountCents)), link: { page: "costs", tab: "handover" }, by: "costs" });
  return out;
}

/* ---- briefing (recalculated from state) ---- */
export function briefingLines(s: DemoState) {
  const out: { text: string; link: Task["link"] }[] = [];
  const mill = job(s, "J-014")!;
  const cov = coverage(s, mill);
  const millInv = invoiceFor(s, "J-014");
  if (millInv && millInv.status === "sent") {
    out.push({ text: "Millrace is invoiced: " + millInv.id + " for " + euro(millInv.totalCents) + ", due " + dShort(millInv.due) + ".", link: { page: "invoices", tab: "book", id: millInv.id } });
  } else if (cov.missing.length) {
    const ap = jobDays(s, "J-014").filter(d => d.status === "approved");
    const missingWord = cov.missing.length === 1 ? dayName(cov.missing[0]) + "’s entry" : words(cov.missing.length) + " days";
    out.push({ text: "Millrace is missing " + missingWord + ". " + cap(words(ap.length)) + " days are logged at " + euro(sum(ap.map(dayAmount))) + ".", link: { page: "jobs", tab: "diary", id: "J-014@" + cov.missing[0] } });
  } else {
    out.push({ text: "Millrace is fully logged: " + words(cov.approved) + " days at " + euro(unbilledCents(s, "J-014")) + ", ready to invoice.", link: { page: "jobs", tab: "ready", id: "J-014" } });
  }
  const birch = invoiceView(s, invoice(s, "INV-029")!);
  if (birch.balance <= 0) out.push({ text: "Birch Lane is paid in full.", link: { page: "invoices", tab: "payments", id: "INV-029" } });
  else if (birch.held) out.push({ text: "Birch Lane owes " + euro(birch.balance) + ". Pat promised it by " + dShort(birch.promise!.date) + ", so reminders are on hold.", link: { page: "invoices", tab: "chase", id: "INV-029" } });
  else out.push({ text: "Birch Lane still owes " + euro(birch.balance) + ", " + birch.overdueDays + " days overdue.", link: { page: "invoices", tab: "chase", id: "INV-029" } });
  const pl1 = serviceView(s, machine(s, "PL-01")!);
  if (pl1.booked) out.push({ text: "Your 13-tonne digger has " + words(pl1.remaining) + " hours to service, booked for " + dShort(pl1.booked.date) + ".", link: { page: "plant", tab: "service", id: "PL-01" } });
  else if (pl1.remaining <= 25) out.push({ text: "Your 13-tonne digger has " + words(pl1.remaining) + " hours to service.", link: { page: "plant", tab: "service", id: "PL-01" } });
  else out.push({ text: "Your 13-tonne digger is serviced. Next one is due at " + pl1.m.nextServiceAt.toLocaleString("en-IE") + " h.", link: { page: "plant", tab: "service", id: "PL-01" } });
  return out;
}
export const briefingText = (s: DemoState) => briefingLines(s).map(l => l.text).join(" ");

function dayName(d: ISODate) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(d + "T12:00:00Z").getUTCDay()];
}

/* ---- the "Who did what" name for an event actor ---- */
export const AGENT_NAMES: Record<string, string> = {
  briefing: "Briefing", watchdog: "Ops Watchdog", diary: "Diary Assistant", invoice: "Invoice Assistant", costs: "Costs Assistant",
};
export function actorName(s: DemoState, id: string) {
  return AGENT_NAMES[id] || person(s, id)?.name || supplier(s, id)?.name || customer(s, id)?.name || id;
}

export function lastPaymentLabel(p?: Payment) {
  return p ? euro(p.amountCents) + " on " + dShort(p.date) : "None yet";
}

export function nextWork(s: DemoState) {
  const items: { date: ISODate; title: string; link: Task["link"] }[] = [];
  s.services.filter(x => x.status === "scheduled").forEach(x => items.push({ date: x.date, title: "Service " + x.machineId + ", " + machine(s, x.machineId)!.short, link: { page: "plant", tab: "service", id: x.machineId } }));
  s.jobs.filter(j => j.status === "scheduled").forEach(j => items.push({ date: j.workdays[0], title: j.id + " " + j.name + ", " + customer(s, j.customerId)!.name, link: { page: "jobs", tab: "jobs", id: j.id } }));
  return items.filter(i => i.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date));
}
