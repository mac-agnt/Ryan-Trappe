import type { DemoState } from "./types";
import {
  briefingLines, chaseList, coverage, costsByCat, costsPaid, customer, dayAmount, dayFor, invoice, invoiceFor,
  invoiceView, job, jobDays, machine, person, serviceView, sum, unbilledCents, money, STATE_LABEL,
} from "./derive";
import { dDayMon, dShort, euro, words } from "./format";
import { go } from "./router";
import { openCapture, openInvoice, openPrint, openRecord } from "./ui";
import { search, KIND_LABEL } from "./search";

/* Deterministic replies for the Home chat. Same store as every page, so an
   answer here always matches the list it links to. */

export interface ChatAction { label: string; primary?: boolean; run: () => void; }
export interface ChatLink { label: string; run: () => void; }
export interface ChatReply {
  text: string; tool: string; effect?: "read" | "write";
  cols?: string[]; rows?: string[][]; tableCols?: string;
  chain?: ChatLink[]; actions?: ChatAction[];
}

const has = (s: string, re: RegExp) => re.test(s);

export function reply(s: DemoState, q: string, ask: (q: string) => void): ChatReply {
  const t = q.toLowerCase();

  if (has(t, /receipt|grant/) && has(t, /october|river|alder|weir|grant|glenwater/)) return riverReceipt(s);
  if (has(t, /friday|20 nov|that day|the machine do/)) return friday(s);
  if (has(t, /log (a |the )?day|log friday|diary|field note|record (a |the )?day/)) return logDay(s);
  if (has(t, /who owes|owe me|owed|money owed|outstanding|unpaid|balance|chase|debt/)) return whoOwes(s);
  if (has(t, /find (a |the )?receipt|receipts?$|^receipt/)) return receipts(s, ask);
  if (has(t, /millrace|ready to invoice|invoice the job|prepare.*invoice/)) return millrace(s);
  if (has(t, /service|serviced|meter|pl-01|13.?tonne|thirteen|digger/)) return service(s);
  if (has(t, /justin|accountant|cost|fuel|spend|spent|outgoing|money out/)) return costs(s);
  if (has(t, /callback|call back|maeve|missed call|enquir/)) return callback(s);
  if (has(t, /brief|today|morning|what.*(need|matter)|summary|update/)) return briefing(s);
  return fallback(s, q, ask);
}

function riverReceipt(s: DemoState): ChatReply {
  const inv = invoice(s, "INV-028")!;
  const v = invoiceView(s, inv);
  const pay = v.payments[0];
  const rc = v.receipts.find(r => r.kind === "paid")!;
  const mill = job(s, "J-014")!;
  return {
    tool: "search · receipts", effect: "read",
    text: "The October river job is " + v.job.id + " " + v.job.name + " for " + v.customer.name + ". " + inv.id + " was issued on " + dShort(inv.issued) + " for " + euro(v.total)
      + ". " + v.customer.name + " paid " + euro(pay.amountCents) + " on " + dShort(pay.date) + " (reference " + pay.reference + "), so paid receipt " + rc.id + " shows a balance of " + euro(v.balance) + ". "
      + "I left out " + mill.name + ", the November job for the same customer, because it has no paid receipt.",
    cols: ["Record", "What", "Date", "Amount"], tableCols: "1fr 1.5fr .9fr .8fr",
    rows: [
      [inv.id, "Invoice, " + v.job.name, dDayMon(inv.issued), euro(v.total)],
      [pay.reference, "Payment received", dDayMon(pay.date), euro(pay.amountCents)],
      [rc.id, "Paid receipt, balance " + euro(v.balance), dDayMon(rc.issued), euro(pay.amountCents)],
    ],
    chain: [
      { label: v.customer.name, run: () => openRecord("customer", v.customer.id) },
      { label: v.job.id + " " + v.job.name, run: () => go({ page: "jobs", tab: "jobs", id: v.job.id }) },
      { label: inv.id, run: () => go({ page: "invoices", tab: "book", id: inv.id }) },
      { label: pay.reference, run: () => go({ page: "invoices", tab: "payments", id: pay.id }) },
      { label: rc.id, run: () => openPrint("receipt", rc.id) },
    ],
    actions: [
      { label: "Open receipt " + rc.id, primary: true, run: () => openPrint("receipt", rc.id) },
      { label: "Grant paperwork", run: () => openPrint("grant", inv.id) },
      { label: "Open " + inv.id, run: () => go({ page: "invoices", tab: "book", id: inv.id }) },
    ],
  };
}

function friday(s: DemoState): ChatReply {
  const date = "2026-11-20";
  const d = dayFor(s, "J-014", date);
  const mill = job(s, "J-014")!;
  if (!d) {
    const m = serviceView(s, machine(s, "PL-01")!);
    return {
      tool: "diary · J-014", effect: "read",
      text: "On " + dShort(date) + " the job was " + mill.name + ", but there is no diary entry for that day, so it is not on any invoice yet. The 13-tonne digger’s meter was read at " + m.meter.hours.toLocaleString("en-IE") + " h after work that evening, so it did run. Log the day and it will go on the Millrace invoice with the other nine.",
      actions: [{ label: "Log Friday at Millrace", primary: true, run: () => openCapture({ jobId: "J-014", date, mode: "sample" }) }],
    };
  }
  const inv = d.invoiceId ? invoice(s, d.invoiceId) : invoiceFor(s, "J-014");
  const parts = d.lines.map(l => machine(s, l.machineId)!.short + " " + l.hours + " h with " + person(s, l.operatorId)!.first + ", " + l.description.charAt(0).toLowerCase() + l.description.slice(1));
  let where = " It isn’t on an invoice yet.";
  const acts: ChatAction[] = [{ label: "Open the day", run: () => go({ page: "jobs", tab: "diary", id: "J-014@" + date }) }];
  if (inv) {
    const lines = inv.status === "sent" ? inv.lines : [];
    const hit = lines.filter(il => il.machineLineIds.some(id => d.lines.some(l => l.id === id)));
    where = inv.status === "sent"
      ? " It’s on " + inv.id + ": " + hit.map((il, i) => "line " + (inv.lines.indexOf(il) + 1) + " (" + machine(s, il.machineId)!.short.toLowerCase() + ", " + il.hours + " h)" + (i < hit.length - 1 ? " and " : "")).join("") + ". Each line opens the dated entries behind it."
      : " It’s in draft " + inv.id + ", not sent yet.";
    if (inv.status === "sent" && hit[0]) acts.unshift({ label: "Show it on " + inv.id, primary: true, run: () => openInvoice(inv.id, hit[0].id) });
    else acts.unshift({ label: "Open draft " + inv.id, primary: true, run: () => openInvoice(inv.id) });
  } else {
    acts.unshift({ label: "Prepare the invoice", primary: true, run: () => go({ page: "jobs", tab: "ready", id: "J-014" }) });
  }
  return {
    tool: "diary · J-014", effect: "read",
    text: "On " + dShort(date) + " at " + mill.name + ": " + parts.join(". ") + ". That day comes to " + euro(dayAmount(d)) + "." + where,
    actions: acts,
  };
}

function logDay(s: DemoState): ChatReply {
  const mill = job(s, "J-014")!;
  const cov = coverage(s, mill);
  if (cov.missing.length) {
    return {
      tool: "diary · capture", effect: "write",
      text: mill.name + " is missing " + dShort(cov.missing[0]) + ". Play the sample field note, check the date, hours and what you did, then approve it. Nothing is saved until you approve.",
      actions: [
        { label: "Log " + dShort(cov.missing[0]), primary: true, run: () => openCapture({ jobId: mill.id, date: cov.missing[0], mode: "sample" }) },
        { label: "Type it instead", run: () => openCapture({ jobId: mill.id, date: cov.missing[0], mode: "typed" }) },
      ],
    };
  }
  return {
    tool: "diary · capture", effect: "write",
    text: "Every planned day is logged. You can still log another day for any job.",
    actions: [{ label: "Log a day", primary: true, run: () => openCapture({}) }],
  };
}

function whoOwes(s: DemoState): ChatReply {
  const list = chaseList(s);
  if (!list.length) return { tool: "invoices · balances", effect: "read", text: "Nobody owes you anything on a sent invoice. Approved work not yet invoiced comes to " + euro(unbilledCents(s)) + ".", actions: [{ label: "Ready to invoice", primary: true, run: () => go({ page: "jobs", tab: "ready" }) }] };
  const total = sum(list.map(v => v.balance));
  const sentences = list.map(v => {
    const paid = v.lastPayment ? " after " + (v.payments.length > 1 ? "payments of " + v.payments.map(p => euro(p.amountCents)).join(" and ") : "a " + euro(v.lastPayment.amountCents) + " payment") : "";
    const when = v.held ? ", promised by " + dShort(v.promise!.date)
      : v.overdueDays > 0 ? ", " + v.overdueDays + " days overdue" : ", due " + dShort(v.inv.due);
    return v.customer.name + " owes " + euro(v.balance) + " on " + v.inv.id + paid + when + ".";
  });
  const unbilled = unbilledCents(s);
  return {
    tool: "invoices · balances", effect: "read",
    text: sentences.join(" ") + (list.length > 1 ? " That’s " + euro(total) + " in all." : "") + (unbilled ? " Separately, " + euro(unbilled) + " of approved work isn’t invoiced yet." : ""),
    cols: ["Customer", "Invoice", "Owed", "State"], tableCols: "1.4fr .8fr .8fr 1.1fr",
    rows: list.map(v => [v.customer.name, v.inv.id, euro(v.balance), v.held ? "Promised " + dDayMon(v.promise!.date) : v.overdueDays ? v.overdueDays + " days overdue" : "Due " + dDayMon(v.inv.due)]),
    actions: [
      { label: "Preview the " + list[0].customer.name + " reminder", primary: true, run: () => go({ page: "invoices", tab: "chase", id: list[0].inv.id }) },
      { label: "Open To chase", run: () => go({ page: "invoices", tab: "chase" }) },
    ],
  };
}

function receipts(s: DemoState, ask: (q: string) => void): ChatReply {
  const rs = [...s.receipts].sort((a, b) => b.issued.localeCompare(a.issued)).slice(0, 5);
  return {
    tool: "search · receipts", effect: "read",
    text: "Here are the latest receipts. Ask by customer, job, month or in plain English, for example “the paid receipt for the October river job”.",
    cols: ["Receipt", "Customer", "Amount", "Date"], tableCols: "1fr 1.4fr .8fr .8fr",
    rows: rs.map(r => {
      const p = s.payments.find(x => x.id === r.paymentId)!;
      return [r.id, invoiceView(s, invoice(s, r.invoiceId)!).customer.name, euro(p.amountCents), dDayMon(p.date)];
    }),
    actions: [
      { label: "Find the paid receipt for the October river job", primary: true, run: () => ask("Find the paid receipt for the October river job") },
      { label: "Payments & receipts", run: () => go({ page: "invoices", tab: "payments" }) },
    ],
  };
}

function millrace(s: DemoState): ChatReply {
  const mill = job(s, "J-014")!;
  const cov = coverage(s, mill);
  const inv = invoiceFor(s, mill.id);
  const days = jobDays(s, mill.id).filter(d => d.status === "approved");
  if (inv && inv.status === "sent") {
    const v = invoiceView(s, inv);
    return { tool: "invoices · J-014", effect: "read", text: mill.name + " is invoiced on " + inv.id + " for " + euro(v.total) + ", issued " + dShort(inv.issued) + " and due " + dShort(inv.due) + ". " + STATE_LABEL[v.state] + ".", actions: [{ label: "Open " + inv.id, primary: true, run: () => openInvoice(inv.id) }] };
  }
  if (cov.missing.length) {
    return { tool: "jobs · J-014", effect: "read", text: "The work at " + mill.name + " finished on " + dShort(mill.finishedOn) + ", but the paperwork isn’t ready: " + days.length + " of " + cov.planned + " days are logged at " + euro(sum(days.map(dayAmount))) + ". " + dShort(cov.missing[0]) + " is missing.", actions: [{ label: "Log " + dShort(cov.missing[0]), primary: true, run: () => openCapture({ jobId: mill.id, date: cov.missing[0], mode: "sample" }) }] };
  }
  return { tool: "jobs · J-014", effect: "read", text: mill.name + " is fully logged: " + words(days.length) + " days, " + euro(unbilledCents(s, mill.id)) + ". It’s ready to invoice.", actions: [{ label: "Prepare invoice", primary: true, run: () => go({ page: "jobs", tab: "ready", id: mill.id }) }] };
}

function service(s: DemoState): ChatReply {
  const v = serviceView(s, machine(s, "PL-01")!);
  const oak = job(s, "J-015")!;
  const txt = v.booked
    ? "The 13-tonne digger read " + v.meter.hours.toLocaleString("en-IE") + " h on " + dShort(v.meter.date) + ". Its service is booked for " + dShort(v.booked.date) + " with " + person(s, v.booked.byId)!.first + ", before " + oak.name + " on " + dShort(oak.workdays[0]) + ". The " + words(v.remaining) + " hours stay on the clock until the service is recorded."
    : v.remaining <= 25
      ? "The 13-tonne digger read " + v.meter.hours.toLocaleString("en-IE") + " h on " + dShort(v.meter.date) + ". Service is due at " + v.m.nextServiceAt.toLocaleString("en-IE") + " h, so it has " + words(v.remaining) + " hours left. " + oak.name + " starts " + dShort(oak.workdays[0]) + ", so " + dShort("2026-11-24") + " is free for it."
      : "The 13-tonne digger was serviced at " + (v.last?.meterAt || 0).toLocaleString("en-IE") + " h. Next service is due at " + v.m.nextServiceAt.toLocaleString("en-IE") + " h.";
  return { tool: "plant · PL-01", effect: "read", text: txt, actions: [{ label: v.booked ? "Open the service diary" : "Book the service", primary: true, run: () => go({ page: "plant", tab: "service", id: "PL-01" }) }] };
}

function costs(s: DemoState): ChatReply {
  const outs = costsPaid(s);
  const cats = costsByCat(s);
  const ready = s.costs.filter(c => c.justin === "ready");
  return {
    tool: "costs · November", effect: "read",
    text: "November paid out " + euro(sum(outs.map(c => c.amountCents))) + " across " + words(outs.length) + " costs. " + cats.map(c => c.cat + " " + euro(c.cents)).join(", ") + ". "
      + (ready.length ? "Justin already has " + words(outs.filter(c => c.justin === "received").length) + " of them. The " + ready.map(c => s.suppliers.find(x => x.id === c.supplierId)!.name + " receipt (" + euro(c.amountCents) + ")").join(" and ") + " still needs forwarding." : "Justin has every November document."),
    actions: [
      { label: ready.length ? "Open the handover" : "Spend overview", primary: true, run: () => go({ page: "costs", tab: ready.length ? "handover" : "overview" }) },
    ],
  };
}

function callback(s: DemoState): ChatReply {
  const cb = s.callbacks.find(c => c.status !== "done") || s.callbacks[0];
  const c = customer(s, cb.customerId)!;
  return {
    tool: "work · callbacks", effect: "read",
    text: cb.status === "done" ? "No callbacks are waiting. The last one was " + cb.name + " at " + c.name + ": " + cb.outcome
      : cb.name + " at " + c.name + " rang at " + cb.received.slice(11) + " about " + (cb.enquiry.includes("drainage") ? "yard drainage" : "a job") + "." + (cb.callAt ? " You’re down to ring back at " + cb.callAt + "." : " No callback time is set yet."),
    actions: [{ label: "Open callbacks", primary: true, run: () => go({ page: "work", tab: "callbacks", id: cb.id }) }],
  };
}

function briefing(s: DemoState): ChatReply {
  const lines = briefingLines(s);
  return {
    tool: "briefing", effect: "read",
    text: lines.map(l => l.text).join(" "),
    actions: lines.slice(0, 3).map((l, i) => ({ label: ["Open Millrace", "Open Birch Lane", "Open the digger"][i], primary: i === 0, run: () => go(l.link) })),
  };
}

function fallback(s: DemoState, q: string, ask: (q: string) => void): ChatReply {
  const hits = search(s, q).slice(0, 6);
  if (hits.length) {
    const m = money(s);
    return {
      tool: "search · records", effect: "read",
      text: hits.length === 1 ? "I found one record that matches." : "I found " + words(hits.length) + " records that match. Open any of them below." + (m.overdueC ? "" : ""),
      cols: ["Record", "Type", "Details"], tableCols: "1.3fr .6fr 1.6fr",
      rows: hits.map(h => [h.title, KIND_LABEL[h.kind], h.sub]),
      actions: hits.slice(0, 3).map((h, i) => ({ label: "Open " + h.title.split(" ").slice(0, 3).join(" "), primary: i === 0, run: () => go(h.link) })),
    };
  }
  return {
    tool: "search · records", effect: "read",
    text: "I couldn’t find that in the diary, invoices, costs or plant records. Try a customer, a job, a month or a machine, or one of these.",
    actions: [
      { label: "Who owes me?", primary: true, run: () => ask("Who owes me?") },
      { label: "What did the machine do that Friday?", run: () => ask("What did the machine do that Friday, and where is that on my invoice?") },
      { label: "Find a receipt", run: () => ask("Find a receipt") },
    ],
  };
}

