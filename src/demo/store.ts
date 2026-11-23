import { useSyncExternalStore } from "react";
import type {
  ActivityEvent, Cents, DemoState, DiaryDay, ISODate, LinkRef, MachineLine, Task,
} from "./types";
import { makeSeed, SEED_VERSION, dayId, lineId, linesToInvoice } from "./seed";
import { TODAY, addDays, dShort, euro, nowStamp } from "./format";
import {
  coverage, customer, dayFor, invoice, invoiceView, job, jobDays, machine, meterOf, sum, invoiceLines, unbilledLines,
} from "./derive";

/* One shared, persisted store for the demo. Views subscribe with useDemo();
   every write goes through an action below so repeats are no-ops and every
   successful action leaves exactly one Activity event. */

const KEY = "pulse.ryan-trappe.demo";

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === SEED_VERSION) return parsed;
    }
  } catch { /* storage blocked or corrupt: start clean */ }
  return makeSeed();
}

let state: DemoState = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: in-memory only */ }
}
function commit(next: DemoState) {
  state = next;
  persist();
  listeners.forEach(l => l());
}
function edit(fn: (draft: DemoState) => void) {
  const draft: DemoState = JSON.parse(JSON.stringify(state));
  fn(draft);
  commit(draft);
}

export const getState = () => state;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function useDemo(): DemoState {
  return useSyncExternalStore(subscribe, getState, getState);
}

const nextId = (d: DemoState, prefix: string) => prefix + "-" + (++d.seq);
function addEvent(d: DemoState, e: Omit<ActivityEvent, "id" | "at"> & { at?: string }) {
  d.events.push({ id: nextId(d, "EV"), at: e.at || nowStamp(), actor: e.actor, source: e.source, text: e.text, link: e.link, jobId: e.jobId });
}
function resolveTasks(d: DemoState, key: string) {
  d.tasks.forEach(t => { if (t.key === key && t.status !== "done") { t.status = "done"; t.doneAt = nowStamp(); } });
}
function addTask(d: DemoState, t: Omit<Task, "id">) {
  if (d.tasks.some(x => x.key === t.key && x.status !== "done")) return;
  d.tasks.push({ ...t, id: nextId(d, "TSK") });
}

function addInvoiceTaskIfReady(d: DemoState, jobId: string) {
  const j = d.jobs.find(x => x.id === jobId)!;
  if (!coverage(d, j).complete || d.invoices.some(i => i.jobId === jobId) || !unbilledLines(d, jobId).length) return;
  addTask(d, { key: "invoice:" + jobId, title: "Send the " + j.name + " invoice", ownerId: "P-RYAN", due: TODAY, priority: "high", label: "Billing", status: "open", link: { page: "jobs", tab: "ready", id: jobId } });
}

/* ---------------- permissions ---------------- */
export type Perm = "approveDiary" | "submitDiary" | "approveInvoice" | "sendReminder" | "recordPayment" | "viewHandover" | "forwardHandover" | "bookService";
export const PERMS: Record<string, Perm[]> = {
  owner: ["approveDiary", "submitDiary", "approveInvoice", "sendReminder", "recordPayment", "viewHandover", "forwardHandover", "bookService"],
  operator: ["submitDiary"],
  accountant: ["viewHandover"],
};
export function can(s: DemoState, p: Perm) {
  const who = s.people.find(x => x.id === s.settings.actingAs);
  return !!who && PERMS[who.access].includes(p);
}
export const actingAs = (s: DemoState) => s.people.find(x => x.id === s.settings.actingAs)!;

/* ---------------- diary ---------------- */
export interface DraftLine { machineId: string; operatorId: string; hours: number; description: string; }
export interface DraftDay { jobId: string; date: ISODate; note: string; lines: DraftLine[]; source: "voice" | "typed"; }

export type SaveResult = { status: "saved" | "exists" | "denied" | "invalid"; dayId?: string; message?: string };

export function saveDiaryDay(input: DraftDay): SaveResult {
  const s = state;
  const existing = dayFor(s, input.jobId, input.date);
  if (existing && existing.status === "approved") return { status: "exists", dayId: existing.id, message: dShort(input.date) + " is already logged for " + job(s, input.jobId)!.name + "." };
  const owner = can(s, "approveDiary");
  if (!owner && !can(s, "submitDiary")) return { status: "denied", message: "Only the crew can log diary days." };
  const lines = input.lines.filter(l => l.machineId && l.operatorId && l.hours > 0);
  if (!lines.length || !job(s, input.jobId) || !input.date) return { status: "invalid", message: "Each line needs a machine, an operator and hours." };
  const id = dayId(input.jobId, input.date);
  edit(d => {
    const j = d.jobs.find(x => x.id === input.jobId)!;
    const mls: MachineLine[] = lines.map(l => ({
      id: lineId(id, l.machineId), dayId: id, machineId: l.machineId, operatorId: l.operatorId,
      hours: l.hours, rateCents: d.machines.find(m => m.id === l.machineId)!.rateCents, description: l.description.trim(),
    }));
    const day: DiaryDay = {
      id, jobId: input.jobId, date: input.date, status: owner ? "approved" : "submitted",
      source: input.source, note: input.note.trim(), lines: mls, enteredById: d.settings.actingAs,
      approvedAt: owner ? nowStamp() : undefined,
    };
    d.days = d.days.filter(x => x.id !== id).concat([day]);
    if (!j.workdays.includes(input.date)) j.workdays = j.workdays.concat([input.date]).sort();
    const h = sum(mls.map(l => l.hours));
    addEvent(d, {
      actor: d.settings.actingAs, source: "Diary", jobId: j.id,
      text: (owner ? "Approved the diary for " : "Submitted the diary for ") + dShort(input.date) + " at " + j.name + ", " + h + " machine hours, " + euro(sum(mls.map(l => l.hours * l.rateCents))),
      link: { page: "jobs", tab: "diary", id: j.id + "@" + input.date },
    });
    if (input.source === "voice") {
      d.runs.push({ id: nextId(d, "RUN"), agentId: "diary", at: nowStamp(), inputs: ["Voice note, " + dShort(TODAY)], output: dShort(input.date) + " at " + j.name + ": " + mls.map(l => d.machines.find(m => m.id === l.machineId)!.short + " " + l.hours + " h").join(", ") + ".", link: { page: "jobs", tab: "diary", id: j.id + "@" + input.date } });
    }
    if (owner) {
      resolveTasks(d, "diary:" + j.id + ":" + input.date);
      addInvoiceTaskIfReady(d, j.id);
    }
  });
  return { status: "saved", dayId: id };
}

export function approveSubmittedDay(dId: string) {
  const day = state.days.find(x => x.id === dId);
  if (!day || day.status !== "submitted" || !can(state, "approveDiary")) return;
  edit(d => {
    const x = d.days.find(y => y.id === dId)!;
    x.status = "approved"; x.approvedAt = nowStamp();
    const j = d.jobs.find(y => y.id === x.jobId)!;
    addEvent(d, { actor: d.settings.actingAs, source: "Diary", jobId: j.id, text: "Approved the diary for " + dShort(x.date) + " at " + j.name, link: { page: "jobs", tab: "diary", id: j.id + "@" + x.date } });
    resolveTasks(d, "diary:" + j.id + ":" + x.date);
    addInvoiceTaskIfReady(d, j.id);
  });
}

/* ---------------- invoices ---------------- */
export function nextInvoiceNumber(s: DemoState) {
  const n = Math.max(...s.invoices.map(i => Number(i.id.slice(4))));
  return "INV-" + String(n + 1).padStart(3, "0");
}

/** Creates the job-end draft once. Calling again returns the same draft or the issued invoice. */
export function prepareInvoice(jobId: string): string | null {
  const s = state;
  const existing = s.invoices.find(i => i.jobId === jobId);
  if (existing) return existing.id;
  const j = job(s, jobId);
  if (!j || !coverage(s, j).complete || !unbilledLines(s, jobId).length) return null;
  const id = nextInvoiceNumber(s);
  edit(d => {
    d.invoices.push({ id, jobId, customerId: j.customerId, status: "draft", approved: false, lines: [], totalCents: 0, source: "pulse" });
    addEvent(d, { actor: "invoice", source: "Invoice", jobId, text: "Prepared draft " + id + " for " + j.name + " from " + jobDays(d, jobId).filter(x => x.status === "approved").length + " approved days", link: { page: "jobs", tab: "ready", id: jobId } });
  });
  return id;
}

export function approveInvoice(invId: string) {
  const inv = invoice(state, invId);
  if (!inv || inv.status !== "draft" || inv.approved || !can(state, "approveInvoice")) return;
  edit(d => {
    const x = d.invoices.find(i => i.id === invId)!;
    x.approved = true;
    addEvent(d, { actor: d.settings.actingAs, source: "Invoice", jobId: x.jobId, text: "Approved " + invId + " for " + euro(sum(invoiceLines(d, x).map(l => l.amountCents))), link: { page: "invoices", tab: "book", id: invId } });
  });
}

/** Simulated send. Snapshots the lines, sets issue and due dates. Idempotent. */
export function sendInvoice(invId: string) {
  const inv = invoice(state, invId);
  if (!inv || inv.status === "sent" || !inv.approved || !can(state, "approveInvoice")) return;
  edit(d => {
    const x = d.invoices.find(i => i.id === invId)!;
    const j = d.jobs.find(y => y.id === x.jobId)!;
    const c = d.customers.find(y => y.id === x.customerId)!;
    const ds = jobDays(d, j.id).filter(y => y.status === "approved" && !y.invoiceId);
    x.lines = linesToInvoice(x.id, j.name, ds.map(y => y.date), ds.flatMap(y => y.lines));
    x.totalCents = sum(x.lines.map(l => l.amountCents));
    x.status = "sent"; x.issued = TODAY; x.due = addDays(TODAY, c.termsDays); x.sentAt = nowStamp();
    ds.forEach(y => { d.days.find(z => z.id === y.id)!.invoiceId = x.id; });
    d.outbox.push({ id: nextId(d, "OUT"), at: nowStamp(), to: c.email, subject: "Invoice " + x.id + " for " + j.name, kind: "invoice", linkId: x.id });
    addEvent(d, { actor: d.settings.actingAs, source: "Invoice", jobId: j.id, text: "Sent " + x.id + " to " + c.name + " for " + euro(x.totalCents) + ", due " + dShort(x.due), link: { page: "invoices", tab: "book", id: x.id } });
    resolveTasks(d, "invoice:" + j.id);
  });
}

/* ---------------- payments, promises, reminders ---------------- */
export type PayResult = { ok: boolean; message?: string; receiptId?: string };
export function recordPayment(invId: string, amountCents: Cents, method = "Bank transfer", reference = ""): PayResult {
  const s = state;
  const inv = invoice(s, invId);
  if (!inv || inv.status !== "sent") return { ok: false, message: "Only sent invoices take payments." };
  if (!can(s, "recordPayment")) return { ok: false, message: "Only Ryan records payments." };
  const v = invoiceView(s, inv);
  if (!(amountCents > 0)) return { ok: false, message: "Enter an amount above zero." };
  if (amountCents > v.balance) return { ok: false, message: "That is more than the " + euro(v.balance) + " owed." };
  let receiptId = "";
  edit(d => {
    const n = d.payments.filter(p => p.invoiceId === invId).length + 1;
    const pid = "PAY-" + invId.slice(4) + "-" + n;
    const left = v.balance - amountCents;
    receiptId = (left === 0 ? "RC-" : "PA-") + invId.slice(4) + (left === 0 ? "" : "-" + n);
    if (left === 0 && d.receipts.some(r => r.id === receiptId)) receiptId = receiptId + "-" + n;
    const ref = reference.trim() || (d.customers.find(c => c.id === inv.customerId)!.name.split(" ").map(w => w[0]).join("").toUpperCase() + "-" + TODAY.slice(5).replace("-", ""));
    d.payments.push({ id: pid, invoiceId: invId, date: TODAY, amountCents, method, reference: ref, receiptId, recordedAt: nowStamp() });
    d.receipts.push({ id: receiptId, paymentId: pid, invoiceId: invId, kind: left === 0 ? "paid" : "acknowledgement", issued: TODAY });
    const c = d.customers.find(x => x.id === inv.customerId)!;
    addEvent(d, { actor: d.settings.actingAs, source: "Payment", jobId: inv.jobId, text: "Recorded " + euro(amountCents) + " from " + c.name + " against " + invId + (left === 0 ? ", paid in full" : ", " + euro(left) + " left"), link: { page: "invoices", tab: "payments", id: pid } });
    if (left === 0) {
      d.reminders.forEach(r => { if (r.invoiceId === invId && (r.status === "draft" || r.status === "held")) r.status = "cancelled"; });
      d.promises.forEach(p => { if (p.invoiceId === invId && p.status === "open") p.status = "kept"; });
      resolveTasks(d, "chase:" + invId);
    } else {
      d.promises.forEach(p => { if (p.invoiceId === invId && p.status === "open") p.amountCents = Math.min(p.amountCents, left); });
    }
  });
  return { ok: true, receiptId };
}

export function recordPromise(invId: string, date: ISODate) {
  const s = state;
  const inv = invoice(s, invId);
  if (!inv || !date || !can(s, "sendReminder")) return;
  const v = invoiceView(s, inv);
  if (v.balance <= 0) return;
  if (v.promise && v.promise.date === date) return;
  edit(d => {
    d.promises.forEach(p => { if (p.invoiceId === invId && p.status === "open") p.status = "superseded"; });
    d.promises.push({ id: nextId(d, "PRM"), invoiceId: invId, date, amountCents: v.balance, recordedAt: nowStamp(), status: "open" });
    d.reminders.forEach(r => { if (r.invoiceId === invId && r.status === "draft") { r.status = "held"; r.heldUntil = date; } if (r.invoiceId === invId && r.status === "held") r.heldUntil = date; });
    const c = d.customers.find(x => x.id === inv.customerId)!;
    addEvent(d, { actor: d.settings.actingAs, source: "Reminder", jobId: inv.jobId, text: c.contact + " promised " + euro(v.balance) + " by " + dShort(date) + ". Reminders on " + invId + " held until then", link: { page: "invoices", tab: "chase", id: invId } });
    resolveTasks(d, "chase:" + invId);
  });
}

export function sendReminder(invId: string) {
  const s = state;
  const inv = invoice(s, invId);
  if (!inv || !can(s, "sendReminder")) return;
  const v = invoiceView(s, inv);
  if (v.balance <= 0 || v.held) return;
  const draft = s.reminders.find(r => r.invoiceId === invId && r.status === "draft");
  if (!draft) return;
  edit(d => {
    const r = d.reminders.find(x => x.id === draft.id)!;
    r.status = "sent"; r.sentOn = TODAY;
    const c = d.customers.find(x => x.id === inv.customerId)!;
    d.outbox.push({ id: nextId(d, "OUT"), at: nowStamp(), to: c.email, subject: "Balance on " + invId, kind: "reminder", linkId: invId });
    addEvent(d, { actor: d.settings.actingAs, source: "Reminder", jobId: inv.jobId, text: "Sent a reminder to " + c.name + " for the " + euro(v.balance) + " left on " + invId, link: { page: "invoices", tab: "chase", id: invId } });
    resolveTasks(d, "chase:" + invId);
  });
}

/** Makes a fresh reminder draft once the old one is sent, cancelled or released. */
export function draftReminder(invId: string) {
  const s = state;
  const inv = invoice(s, invId);
  if (!inv || invoiceView(s, inv).balance <= 0) return;
  if (s.reminders.some(r => r.invoiceId === invId && (r.status === "draft" || r.status === "held"))) return;
  edit(d => {
    d.reminders.push({ id: nextId(d, "RM"), invoiceId: invId, status: "draft", draftedBy: "invoice" });
  });
}

/* ---------------- costs ---------------- */
export function forwardToJustin(costIds: string[]) {
  const s = state;
  const ids = costIds.filter(id => s.costs.find(c => c.id === id)?.justin === "ready");
  if (!ids.length || !can(s, "forwardHandover")) return;
  edit(d => {
    const hid = nextId(d, "HO");
    d.handovers.push({ id: hid, date: nowStamp(), costIds: ids, note: "Forwarded " + ids.length + " document to Justin" });
    ids.forEach(id => { d.costs.find(c => c.id === id)!.justin = "sent"; resolveTasks(d, "handover:" + id); });
    const total = sum(ids.map(id => d.costs.find(c => c.id === id)!.amountCents));
    d.outbox.push({ id: nextId(d, "OUT"), at: nowStamp(), to: "justin@example.com", subject: "Receipts for November (" + ids.length + ")", kind: "handover", linkId: hid });
    addEvent(d, { actor: d.settings.actingAs, source: "Handover", text: "Forwarded " + ids.length + " receipt to Justin, " + euro(total), link: { page: "costs", tab: "handover", id: hid } });
  });
}

/** Matches on supplier, reference and amount. Never creates a second expense. */
export function matchIncoming(inId: string) {
  const s = state;
  const doc = s.incoming.find(x => x.id === inId);
  if (!doc || doc.status === "matched") return;
  const hit = s.costs.find(c => c.supplierId === doc.supplierId && c.reference === doc.reference && c.amountCents === doc.amountCents);
  if (!hit) return;
  edit(d => {
    const x = d.incoming.find(y => y.id === inId)!;
    x.status = "matched"; x.matchedCostId = hit.id;
    d.costs.find(c => c.id === hit.id)!.duplicateDocIds.push(inId);
    addEvent(d, { actor: "costs", source: "Email", text: "Matched the resent " + doc.reference + " to " + hit.id + ". No new cost added", link: { page: "costs", tab: "receipts", id: hit.id } });
  });
}

/* ---------------- plant ---------------- */
export function bookService(machineId: string, date: ISODate, byId: string) {
  const s = state;
  if (!can(s, "bookService") || s.services.some(x => x.machineId === machineId && x.status === "scheduled")) return;
  edit(d => {
    const sid = "SV-" + machineId.replace("-", "") + "-" + date.slice(5).replace("-", "");
    const m = d.machines.find(x => x.id === machineId)!;
    d.services.push({ id: sid, machineId, kind: "service", status: "scheduled", date, byId, notes: "Booked " + m.intervalH + " h service" });
    addTask(d, { key: "service:" + machineId, title: "Service " + machineId, ownerId: byId, due: date, priority: "normal", label: "Plant", status: "scheduled", link: { page: "plant", tab: "service", id: machineId } });
    addEvent(d, { actor: d.settings.actingAs, source: "Plant", text: "Booked the " + m.short + " (" + machineId + ") service for " + dShort(date) + " with " + d.people.find(p => p.id === byId)!.name, link: { page: "plant", tab: "service", id: machineId } });
  });
}

export function completeService(machineId: string) {
  const s = state;
  const booked = s.services.find(x => x.machineId === machineId && x.status === "scheduled");
  if (!booked || !can(s, "bookService")) return;
  const reading = meterOf(s, machineId).hours;
  edit(d => {
    const x = d.services.find(y => y.id === booked.id)!;
    const m = d.machines.find(y => y.id === machineId)!;
    x.status = "done"; x.meterAt = reading; x.date = TODAY; x.notes = "Engine oil, filters and greased all pins";
    m.nextServiceAt = reading + m.intervalH;
    resolveTasks(d, "service:" + machineId);
    addEvent(d, { actor: d.settings.actingAs, source: "Plant", text: "Recorded the " + machineId + " service at " + reading.toLocaleString("en-IE") + " h. Next due at " + m.nextServiceAt.toLocaleString("en-IE") + " h", link: { page: "plant", tab: "service", id: machineId } });
  });
}

/* ---------------- callbacks and tasks ---------------- */
export function scheduleCallback(cbId: string, time: string) {
  const cb = state.callbacks.find(c => c.id === cbId);
  if (!cb || cb.status === "done" || !time || cb.callAt === time) return;
  edit(d => {
    const x = d.callbacks.find(c => c.id === cbId)!;
    x.status = "scheduled"; x.callAt = time;
    const t = d.tasks.find(y => y.key === "callback:" + cbId && y.status !== "done");
    if (t) { t.status = "scheduled"; t.title = "Ring back " + x.name + " at " + time; }
    addEvent(d, { actor: d.settings.actingAs, source: "Callback", text: "Set a callback to " + x.name + " (" + d.customers.find(c => c.id === x.customerId)!.name + ") for " + time + " today", link: { page: "work", tab: "callbacks", id: cbId } });
  });
}
export function completeCallback(cbId: string, outcome: string) {
  const cb = state.callbacks.find(c => c.id === cbId);
  if (!cb || cb.status === "done") return;
  edit(d => {
    const x = d.callbacks.find(c => c.id === cbId)!;
    x.status = "done"; x.outcome = outcome.trim() || "Rang back."; x.doneAt = nowStamp();
    resolveTasks(d, "callback:" + cbId);
    addEvent(d, { actor: d.settings.actingAs, source: "Callback", text: "Rang back " + x.name + ": " + x.outcome, link: { page: "work", tab: "callbacks", id: cbId } });
  });
}
export function completeTask(taskId: string) {
  const t = state.tasks.find(x => x.id === taskId);
  if (!t || t.status === "done") return;
  edit(d => {
    const x = d.tasks.find(y => y.id === taskId)!;
    x.status = "done"; x.doneAt = nowStamp();
    addEvent(d, { actor: d.settings.actingAs, source: "Diary", text: "Marked done: " + x.title, link: x.link });
  });
}

/* ---------------- settings ---------------- */
export function setActingAs(pid: string) {
  if (state.settings.actingAs === pid) return;
  edit(d => { d.settings.actingAs = pid; });
}
export function updateIdentity(patch: Partial<DemoState["settings"]>) {
  edit(d => { Object.assign(d.settings, patch); });
}
export function resetDemo() {
  commit(makeSeed());
}

/* convenience for views that link to a task */
export function taskLink(t: Task): LinkRef { return t.link; }
export const machineName = (id: string) => machine(state, id)?.name || id;
export const customerName = (id: string) => customer(state, id)?.name || id;
