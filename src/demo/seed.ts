import type {
  ActivityEvent, AgentRun, Callback, Cost, Customer, DemoState, DiaryDay, Doc, IncomingDoc, Instalment,
  Invoice, InvoiceLine, Job, Machine, MachineLine, MeterReading, Payment, Person, Policy, ReceiptDoc,
  Reminder, Service, Supplier, Task,
} from "./types";

/* Canonical demo fixtures. Every customer, operator, rate, machine, date,
   supplier and amount here is illustrative. Counts, balances and alerts are
   never stored: they are derived from these rows (see derive.ts). */

export const SEED_VERSION = 4;

const people: Person[] = [
  { id: "P-RYAN", name: "Ryan Trappe", first: "Ryan", initials: "RT", role: "Owner and operator", crew: "regular", email: "ryan@example.com", access: "owner" },
  { id: "P-EOIN", name: "Eoin Byrne", first: "Eoin", initials: "EB", role: "Operator", crew: "regular", email: "eoin@example.com", access: "operator" },
  { id: "P-NIAMH", name: "Niamh Kelly", first: "Niamh", initials: "NK", role: "Relief operator", crew: "relief", email: "niamh@example.com", access: "operator" },
  { id: "P-DARA", name: "Dara Quinn", first: "Dara", initials: "DQ", role: "Relief operator", crew: "relief", email: "dara@example.com", access: "operator" },
  { id: "P-JUSTIN", name: "Justin", first: "Justin", initials: "J", role: "External accountant", crew: "external", email: "justin@example.com", access: "accountant" },
];

const customers: Customer[] = [
  { id: "C-GLEN", name: "Glenwater Rivers Office", contact: "Accounts office", email: "accounts.glenwater@example.com", kind: "public body", termsDays: 14 },
  { id: "C-BIRCH", name: "Birch Lane Agri", contact: "Pat", email: "pat.birchlane@example.com", kind: "business", termsDays: 21 },
  { id: "C-OAK", name: "Oakfield Farms", contact: "Farm office", email: "office.oakfield@example.com", kind: "business", termsDays: 14 },
  { id: "C-ASH", name: "Ashgrove Builders", contact: "Site office", email: "site.ashgrove@example.com", kind: "business", termsDays: 14 },
  { id: "C-MEAD", name: "Meadow Lane Stables", contact: "Maeve", email: "maeve.meadowlane@example.com", kind: "enquiry", termsDays: 14 },
];

const suppliers: Supplier[] = [
  { id: "S-FERN", name: "Fern Fuel Co.", category: "Fuel", email: "accounts.fernfuel@example.com" },
  { id: "S-QUARRY", name: "Quarry Road Oils", category: "Fuel", email: "billing.quarryroad@example.com" },
  { id: "S-HILL", name: "Hillgate Plant Parts", category: "Parts", email: "counter.hillgate@example.com" },
  { id: "S-LANE", name: "Lane End Tyres", category: "Tyres", email: "office.laneend@example.com" },
  { id: "S-FIELD", name: "Fieldstone Cover", category: "Insurance", email: "policies.fieldstone@example.com" },
];

const POLICY = "POL-2207";
const machines: Machine[] = [
  { id: "PL-01", name: "13-tonne tracked digger", short: "13-tonne digger", aliases: ["thirteen-tonner", "thirteen tonner", "thirteen tonne", "13 tonne", "13-tonne", "13t", "big digger", "pl-01"], rateCents: 8000, intervalH: 250, nextServiceAt: 2500, policyId: POLICY },
  { id: "PL-02", name: "Six-tonne site dumper", short: "Site dumper", aliases: ["six-tonne dumper", "six tonne dumper", "site dumper", "6 tonne dumper", "the dumper", "dumper", "pl-02"], rateCents: 5500, intervalH: 250, nextServiceAt: 2000, policyId: POLICY },
  { id: "PL-03", name: "Five-tonne digger", short: "5-tonne digger", aliases: ["five-tonner", "five tonner", "five tonne", "5 tonne", "5t", "pl-03"], rateCents: 6500, intervalH: 250, nextServiceAt: 3250, policyId: POLICY },
  { id: "PL-04", name: "Three-tonne mini digger", short: "Mini digger", aliases: ["mini digger", "mini", "three tonne", "3 tonne", "pl-04"], rateCents: 5000, intervalH: 250, nextServiceAt: 1250, policyId: POLICY },
  { id: "PL-05", name: "Tracked dumper", short: "Tracked dumper", aliases: ["tracked dumper", "pl-05"], rateCents: 5500, intervalH: 250, nextServiceAt: 1000, policyId: POLICY },
  { id: "PL-06", name: "Roller", short: "Roller", aliases: ["roller", "pl-06"], rateCents: 4500, intervalH: 250, nextServiceAt: 2250, policyId: POLICY },
];

const jobs: Job[] = [
  { id: "J-008", name: "Yard slab preparation", customerId: "C-OAK", location: "Oakfield yard", workdays: ["2026-09-01", "2026-09-02", "2026-09-03"], status: "finished", finishedOn: "2026-09-03" },
  { id: "J-009", name: "Site strip for two houses", customerId: "C-ASH", location: "Ashgrove site", workdays: ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17"], status: "finished", finishedOn: "2026-09-17" },
  { id: "J-010", name: "Drain to soakaway", customerId: "C-OAK", location: "Oakfield lower field", workdays: ["2026-09-29", "2026-09-30"], status: "finished", finishedOn: "2026-09-30" },
  { id: "J-012", name: "Birch Lane yard drainage", customerId: "C-BIRCH", location: "Birch Lane yard", workdays: ["2026-10-05", "2026-10-06", "2026-10-07"], status: "finished", finishedOn: "2026-10-07" },
  { id: "J-011", name: "Alder Weir clearance", customerId: "C-GLEN", location: "Alder Weir", workdays: ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"], status: "finished", finishedOn: "2026-10-16" },
  { id: "J-013", name: "Service trench", customerId: "C-ASH", location: "Ashgrove site", workdays: ["2026-10-21", "2026-10-22"], status: "finished", finishedOn: "2026-10-22" },
  { id: "J-014", name: "Millrace bank clearance", customerId: "C-GLEN", location: "Millrace", workdays: ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"], status: "finished", finishedOn: "2026-11-20" },
  { id: "J-015", name: "Oakfield access track", customerId: "C-OAK", location: "Oakfield top field", workdays: ["2026-11-25", "2026-11-26", "2026-11-27"], status: "scheduled" },
];

type L = [machineId: string, operatorId: string, hours: number, description: string];
type D = [jobId: string, date: string, source: DiarySourceLike, note: string, lines: L[]];
type DiarySourceLike = "excel" | "typed";

const rate = (mid: string) => machines.find(m => m.id === mid)!.rateCents;
export const dayId = (jobId: string, date: string) => "DD-" + jobId.replace("-", "") + "-" + date;
export const lineId = (dId: string, machineId: string) => "ML-" + dId.slice(3) + "-" + machineId;

const DIARY: D[] = [
  ["J-008", "2026-09-01", "excel", "Stripped topsoil off the slab area. Heaped by the hedge.", [["PL-03", "P-RYAN", 8, "Stripped topsoil from the slab area"]]],
  ["J-008", "2026-09-02", "excel", "Down to formation. Eoin rolled the first layer.", [["PL-03", "P-RYAN", 8, "Dug out to formation level"], ["PL-06", "P-EOIN", 6, "Rolled the first layer of hardcore"]]],
  ["J-008", "2026-09-03", "excel", "Levelled and rolled. Slab ready for the shutters.", [["PL-03", "P-RYAN", 8, "Spread and levelled hardcore"], ["PL-06", "P-EOIN", 6, "Final roll of the base"]]],
  ["J-009", "2026-09-14", "excel", "Niamh on the mini. Stripped plot one.", [["PL-04", "P-NIAMH", 8, "Stripped plot one"], ["PL-05", "P-EOIN", 6, "Moved topsoil to the back of the site"]]],
  ["J-009", "2026-09-15", "excel", "Plot one finished, started plot two.", [["PL-04", "P-NIAMH", 8, "Finished plot one, started plot two"], ["PL-05", "P-EOIN", 6, "Moved topsoil to the back of the site"]]],
  ["J-009", "2026-09-16", "excel", "Plot two stripped.", [["PL-04", "P-NIAMH", 8, "Stripped plot two"], ["PL-05", "P-EOIN", 6, "Moved spoil off site to the tip lane"]]],
  ["J-009", "2026-09-17", "excel", "Tidy up and access path.", [["PL-04", "P-NIAMH", 8, "Cut the access path and tidied both plots"], ["PL-05", "P-EOIN", 6, "Cleared the last of the spoil"]]],
  ["J-010", "2026-09-29", "excel", "Dara on the mini. Trench to the soakaway.", [["PL-04", "P-DARA", 7, "Dug the trench to the soakaway"]]],
  ["J-010", "2026-09-30", "excel", "Pipe in, backfilled.", [["PL-04", "P-DARA", 7, "Laid pipe and backfilled the trench"]]],
  ["J-012", "2026-10-05", "excel", "Birch Lane. Opened the yard at the gate. Pat happy with the fall.", [["PL-01", "P-RYAN", 7, "Opened a trench across the yard at the gate"], ["PL-02", "P-EOIN", 4, "Took spoil to the back field"]]],
  ["J-012", "2026-10-06", "excel", "Pipe down along the shed.", [["PL-01", "P-RYAN", 7, "Laid drain pipe along the shed wall"], ["PL-02", "P-EOIN", 4, "Brought stone up from the road"]]],
  ["J-012", "2026-10-07", "excel", "Backfilled with stone, gully at the gate.", [["PL-01", "P-RYAN", 7, "Backfilled with stone and set the gully"], ["PL-02", "P-EOIN", 4, "Cleared spoil and swept the yard"]]],
  ["J-011", "2026-10-12", "excel", "Alder Weir. Access in from the road, cleared the pool.", [["PL-01", "P-RYAN", 8, "Cleared silt from the weir pool"], ["PL-02", "P-EOIN", 4, "Moved silt to the drying area"]]],
  ["J-011", "2026-10-13", "excel", "Fallen alder out of the channel.", [["PL-01", "P-RYAN", 8, "Lifted fallen alder from the channel"]]],
  ["J-011", "2026-10-14", "excel", "Bank toe reshaped below the weir.", [["PL-01", "P-RYAN", 8, "Reshaped the bank toe below the weir"]]],
  ["J-011", "2026-10-15", "excel", "Stone along the left bank.", [["PL-01", "P-RYAN", 8, "Placed stone along the left bank"]]],
  ["J-011", "2026-10-16", "excel", "Half day. Tidied the access and left.", [["PL-01", "P-RYAN", 4, "Tidied the access and reseeded the verge"]]],
  ["J-013", "2026-10-21", "excel", "Service trench for the two houses.", [["PL-04", "P-NIAMH", 8, "Dug the service trench along the boundary"]]],
  ["J-013", "2026-10-22", "excel", "Ducting in, backfilled.", [["PL-04", "P-NIAMH", 6, "Backfilled over the ducting"]]],
  ["J-014", "2026-11-09", "typed", "Millrace start. Lower gate open, scrub cleared first 60 m. Wet underfoot.", [["PL-01", "P-RYAN", 8, "Set up access at the lower gate and cleared scrub from the first 60 m of bank"]]],
  ["J-014", "2026-11-10", "typed", "Silt and timber out of the lower reach. Eoin on the dumper pm.", [["PL-01", "P-RYAN", 8, "Cleared silt and fallen timber from the lower reach"], ["PL-02", "P-EOIN", 4, "Moved timber and silt to the stockpile by the gate"]]],
  ["J-014", "2026-11-11", "typed", "Bank toe below the footbridge. Slow, soft ground.", [["PL-01", "P-RYAN", 8, "Reshaped the bank toe below the footbridge"]]],
  ["J-014", "2026-11-12", "typed", "Rock armour at the outfall. Eoin ran stone.", [["PL-01", "P-RYAN", 8, "Placed rock armour at the outfall"], ["PL-02", "P-EOIN", 4, "Brought stone from the stockpile to the outfall"]]],
  ["J-014", "2026-11-13", "typed", "Middle reach. Trimmed the overhanging alder.", [["PL-01", "P-RYAN", 8, "Cleared the middle reach and trimmed overhanging alder"]]],
  ["J-014", "2026-11-16", "typed", "Old weir pool dug out, bank reshaped.", [["PL-01", "P-RYAN", 8, "Dug out the old weir pool and reshaped the bank"]]],
  ["J-014", "2026-11-17", "typed", "Stone along the middle reach. Eoin on the dumper.", [["PL-01", "P-RYAN", 8, "Placed stone along the middle reach"], ["PL-02", "P-EOIN", 4, "Ran stone from the gate to the middle reach"]]],
  ["J-014", "2026-11-18", "typed", "Upstream reach toward the mill wall.", [["PL-01", "P-RYAN", 8, "Cleared the upstream reach toward the mill wall"]]],
  ["J-014", "2026-11-19", "typed", "Access track regraded, turning area tidy. Eoin moved spoil.", [["PL-01", "P-RYAN", 8, "Tidied the access track and regraded the turning area"], ["PL-02", "P-EOIN", 4, "Moved spoil from the upstream reach to the gate"]]],
];

function approvedStamp(date: string, src: DiarySourceLike) {
  return src === "excel" ? "2026-11-02T20:10" : date + "T19:" + String(20 + (Number(date.slice(8)) % 30)).padStart(2, "0");
}

const INVOICE_OF: Record<string, string> = {
  "J-008": "INV-025", "J-009": "INV-026", "J-010": "INV-027", "J-011": "INV-028", "J-012": "INV-029", "J-013": "INV-030",
};

const days: DiaryDay[] = DIARY.map(([jobId, date, source, note, ls]) => {
  const id = dayId(jobId, date);
  const lines: MachineLine[] = ls.map(([mid, op, h, desc]) => ({
    id: lineId(id, mid), dayId: id, machineId: mid, operatorId: op, hours: h, rateCents: rate(mid), description: desc,
  }));
  return { id, jobId, date, status: "approved", source, note, lines, enteredById: "P-RYAN", approvedAt: approvedStamp(date, source), invoiceId: INVOICE_OF[jobId] };
});

export function linesToInvoice(invId: string, jobName: string, dates: string[], ls: MachineLine[]): InvoiceLine[] {
  const byMachine = new Map<string, MachineLine[]>();
  ls.forEach(l => byMachine.set(l.machineId, (byMachine.get(l.machineId) || []).concat([l])));
  return machines.filter(m => byMachine.has(m.id)).map(m => {
    const group = byMachine.get(m.id)!;
    const h = group.reduce((n, l) => n + l.hours, 0);
    const r = group[0].rateCents;
    return {
      id: "IL-" + invId.replace("-", "") + "-" + m.id,
      machineId: m.id,
      description: m.name + " with operator, " + jobName + ", " + rangeLabel(dates),
      hours: h, rateCents: r, amountCents: h * r, machineLineIds: group.map(l => l.id),
    };
  });
}
function rangeLabel(dates: string[]) {
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const s = [...dates].sort();
  const a = s[0], b = s[s.length - 1];
  const da = Number(a.slice(8)), db = Number(b.slice(8)), ma = Number(a.slice(5, 7)), mb = Number(b.slice(5, 7));
  if (s.length === 1) return da + " " + MON[ma - 1];
  return ma === mb ? da + "–" + db + " " + MON[mb - 1] : da + " " + MON[ma - 1] + " – " + db + " " + MON[mb - 1];
}

const INV_META: [id: string, jobId: string, issued: string, due: string][] = [
  ["INV-025", "J-008", "2026-09-04", "2026-09-18"],
  ["INV-026", "J-009", "2026-09-18", "2026-10-02"],
  ["INV-027", "J-010", "2026-09-30", "2026-10-14"],
  ["INV-028", "J-011", "2026-10-16", "2026-10-30"],
  ["INV-029", "J-012", "2026-10-19", "2026-11-09"],
  ["INV-030", "J-013", "2026-10-22", "2026-11-05"],
];

const invoices: Invoice[] = INV_META.map(([id, jobId, issued, due]) => {
  const job = jobs.find(j => j.id === jobId)!;
  const ds = days.filter(d => d.jobId === jobId);
  const lines = linesToInvoice(id, job.name, ds.map(d => d.date), ds.flatMap(d => d.lines));
  return {
    id, jobId, customerId: job.customerId, status: "sent", approved: true, issued, due, lines,
    totalCents: lines.reduce((n, l) => n + l.amountCents, 0), source: "excel", sentAt: issued + "T18:00",
  };
});

const payments: Payment[] = [
  { id: "PAY-025", invoiceId: "INV-025", date: "2026-09-25", amountCents: 210000, method: "Bank transfer", reference: "OAK-0925", receiptId: "RC-025", recordedAt: "2026-11-02T20:10" },
  { id: "PAY-026", invoiceId: "INV-026", date: "2026-10-09", amountCents: 292000, method: "Bank transfer", reference: "ASH-1009", receiptId: "RC-026", recordedAt: "2026-11-02T20:10" },
  { id: "PAY-027", invoiceId: "INV-027", date: "2026-10-20", amountCents: 70000, method: "Cheque", reference: "OAK-1020", receiptId: "RC-027", recordedAt: "2026-11-02T20:10" },
  { id: "PAY-030", invoiceId: "INV-030", date: "2026-10-30", amountCents: 70000, method: "Bank transfer", reference: "ASH-1030", receiptId: "RC-030", recordedAt: "2026-11-02T20:10" },
  { id: "PAY-028", invoiceId: "INV-028", date: "2026-11-04", amountCents: 310000, method: "Bank transfer", reference: "GRO-0411", receiptId: "RC-028", recordedAt: "2026-11-04T18:42" },
  { id: "PAY-029-1", invoiceId: "INV-029", date: "2026-11-12", amountCents: 90000, method: "Bank transfer", reference: "BLA-1112", receiptId: "PA-029-1", recordedAt: "2026-11-12T19:05" },
];

const receipts: ReceiptDoc[] = [
  { id: "RC-025", paymentId: "PAY-025", invoiceId: "INV-025", kind: "paid", issued: "2026-09-25" },
  { id: "RC-026", paymentId: "PAY-026", invoiceId: "INV-026", kind: "paid", issued: "2026-10-09" },
  { id: "RC-027", paymentId: "PAY-027", invoiceId: "INV-027", kind: "paid", issued: "2026-10-20" },
  { id: "RC-030", paymentId: "PAY-030", invoiceId: "INV-030", kind: "paid", issued: "2026-10-30" },
  { id: "RC-028", paymentId: "PAY-028", invoiceId: "INV-028", kind: "paid", issued: "2026-11-04" },
  { id: "PA-029-1", paymentId: "PAY-029-1", invoiceId: "INV-029", kind: "acknowledgement", issued: "2026-11-12" },
];

const reminders: Reminder[] = [
  { id: "RM-029-1", invoiceId: "INV-029", status: "sent", sentOn: "2026-11-10", draftedBy: "invoice" },
  { id: "RM-029-2", invoiceId: "INV-029", status: "draft", draftedBy: "invoice" },
];

const costs: Cost[] = [
  { id: "CST-01", date: "2026-11-03", supplierId: "S-FERN", category: "Fuel", amountCents: 92000, paidDate: "2026-11-03", reference: "FF-20931", source: "Email", docId: "DOC-FF-20931", justin: "received", duplicateDocIds: [] },
  { id: "CST-02", date: "2026-11-06", supplierId: "S-QUARRY", category: "Fuel", amountCents: 36000, paidDate: "2026-11-06", reference: "QRO-5512", source: "Email", docId: "DOC-QRO-5512", justin: "received", duplicateDocIds: [] },
  { id: "CST-03", date: "2026-11-10", supplierId: "S-HILL", category: "Parts", amountCents: 18500, paidDate: "2026-11-10", reference: "HPP-0874", source: "Paper receipt", docId: "DOC-HPP-0874", justin: "ready", machineId: "PL-01", serviceId: "SV-PL01-1110", duplicateDocIds: [] },
  { id: "CST-04", date: "2026-11-17", supplierId: "S-LANE", category: "Tyres", amountCents: 24000, paidDate: "2026-11-17", reference: "LET-3306", source: "Email", docId: "DOC-LET-3306", justin: "received", machineId: "PL-02", duplicateDocIds: [] },
  { id: "CST-05", date: "2026-11-20", supplierId: "S-FIELD", category: "Insurance", amountCents: 16800, paidDate: "2026-11-20", reference: "FC-2207-11", source: "Email", docId: "DOC-FC-2207", justin: "received", policyId: POLICY, duplicateDocIds: [] },
];

const incoming: IncomingDoc[] = [
  { id: "IN-LET-3306", supplierId: "S-LANE", reference: "LET-3306", amountCents: 24000, received: "2026-11-21", source: "Email", status: "waiting" },
];

const docs: Doc[] = [
  { id: "DOC-WORKBOOK", kind: "workbook", title: "Invoice workbook (Excel)", source: "Excel import", date: "2026-11-02", linkIds: ["INV-025", "INV-026", "INV-027", "INV-028", "INV-029", "INV-030"] },
  { id: "DOC-FF-20931", kind: "supplier bill", title: "Fern Fuel Co. invoice FF-20931", source: "Email", date: "2026-11-03", linkIds: ["CST-01"] },
  { id: "DOC-QRO-5512", kind: "supplier bill", title: "Quarry Road Oils invoice QRO-5512", source: "Email", date: "2026-11-06", linkIds: ["CST-02"] },
  { id: "DOC-HPP-0874", kind: "paper receipt", title: "Hillgate Plant Parts receipt HPP-0874 (photo)", source: "Paper receipt", date: "2026-11-10", linkIds: ["CST-03", "PL-01", "SV-PL01-1110"] },
  { id: "DOC-LET-3306", kind: "supplier bill", title: "Lane End Tyres invoice LET-3306", source: "Email", date: "2026-11-17", linkIds: ["CST-04", "PL-02"] },
  { id: "DOC-FC-2207", kind: "policy schedule", title: "Fieldstone Cover plant policy schedule", source: "Email", date: "2026-11-20", linkIds: ["CST-05", POLICY] },
];

const meters: MeterReading[] = [
  { id: "MR-01-0814", machineId: "PL-01", date: "2026-08-14", hours: 2250, note: "At service", byId: "P-RYAN" },
  { id: "MR-01-1108", machineId: "PL-01", date: "2026-11-08", hours: 2412, note: "Before Millrace", byId: "P-RYAN" },
  { id: "MR-01-1110", machineId: "PL-01", date: "2026-11-10", hours: 2428, note: "Hose repair", byId: "P-RYAN" },
  { id: "MR-01-1120", machineId: "PL-01", date: "2026-11-20", hours: 2492, note: "After work, end of Millrace", byId: "P-RYAN" },
  { id: "MR-02-1120", machineId: "PL-02", date: "2026-11-20", hours: 1836, note: "After work, end of Millrace", byId: "P-EOIN" },
  { id: "MR-03-0903", machineId: "PL-03", date: "2026-09-03", hours: 3104, note: "End of Oakfield slab", byId: "P-RYAN" },
  { id: "MR-04-1022", machineId: "PL-04", date: "2026-10-22", hours: 1212, note: "End of Ashgrove trench", byId: "P-NIAMH" },
  { id: "MR-05-0917", machineId: "PL-05", date: "2026-09-17", hours: 968, note: "End of Ashgrove strip", byId: "P-EOIN" },
  { id: "MR-06-0903", machineId: "PL-06", date: "2026-09-03", hours: 2140, note: "End of Oakfield slab", byId: "P-EOIN" },
];

const services: Service[] = [
  { id: "SV-PL01-0814", machineId: "PL-01", kind: "service", status: "done", date: "2026-08-14", meterAt: 2250, byId: "P-RYAN", notes: "Engine oil, filters and greased all pins" },
  { id: "SV-PL01-1110", machineId: "PL-01", kind: "repair", status: "done", date: "2026-11-10", meterAt: 2428, byId: "P-RYAN", notes: "Replaced a split hydraulic hose on the dipper and the return filter", costId: "CST-03" },
  { id: "SV-PL02-0902", machineId: "PL-02", kind: "service", status: "done", date: "2026-09-02", meterAt: 1750, byId: "P-RYAN", notes: "Oil, filters, checked the skip ram" },
  { id: "SV-PL03-0712", machineId: "PL-03", kind: "service", status: "done", date: "2026-07-12", meterAt: 3000, byId: "P-RYAN", notes: "Oil, filters, new bucket teeth" },
  { id: "SV-PL04-0620", machineId: "PL-04", kind: "service", status: "done", date: "2026-06-20", meterAt: 1000, byId: "P-RYAN", notes: "Oil, filters, track tension" },
  { id: "SV-PL05-0505", machineId: "PL-05", kind: "service", status: "done", date: "2026-05-05", meterAt: 750, byId: "P-RYAN", notes: "Oil, filters, greased the tip pivots" },
  { id: "SV-PL06-0430", machineId: "PL-06", kind: "service", status: "done", date: "2026-04-30", meterAt: 2000, byId: "P-RYAN", notes: "Oil, filters, vibration bearings checked" },
];

const policies: Policy[] = [
  { id: POLICY, insurer: "Fieldstone Cover", name: "Plant policy", reference: "FC-PL-2207", machineIds: machines.map(m => m.id), starts: "2026-07-01", renews: "2027-07-01", monthlyCents: 16800 },
];

const instalments: Instalment[] = ["2026-07-20", "2026-08-20", "2026-09-20", "2026-10-20", "2026-11-20", "2026-12-20", "2027-01-20", "2027-02-20", "2027-03-20", "2027-04-20", "2027-05-20", "2027-06-20"]
  .map(date => ({
    id: "INS-" + date.slice(0, 7), policyId: POLICY, date, amountCents: 16800,
    costId: date === "2026-11-20" ? "CST-05" : undefined,
    status: date <= "2026-11-20" ? "paid" : "due",
  }));

const tasks: Task[] = [
  { id: "TSK-101", key: "diary:J-014:2026-11-20", title: "Review Friday at J-014 Millrace", ownerId: "P-RYAN", due: "2026-11-23", priority: "high", label: "Billing", status: "open", link: { page: "jobs", tab: "diary", id: "J-014@2026-11-20" } },
  { id: "TSK-102", key: "chase:INV-029", title: "Decide on the Birch Lane reminder", ownerId: "P-RYAN", due: "2026-11-23", priority: "normal", label: "Billing", status: "open", link: { page: "invoices", tab: "chase", id: "INV-029" } },
  { id: "TSK-103", key: "callback:CB-201", title: "Ring back Maeve at Meadow Lane Stables", ownerId: "P-RYAN", due: "2026-11-23", priority: "normal", label: "Site work", status: "open", link: { page: "work", tab: "callbacks", id: "CB-201" } },
  { id: "TSK-104", key: "handover:CST-03", title: "Forward the Hillgate parts receipt to Justin", ownerId: "P-RYAN", due: "2026-11-24", priority: "normal", label: "Billing", status: "open", link: { page: "costs", tab: "handover" } },
  { id: "TSK-105", key: "float:J-015", title: "Float the 13-tonne digger to Oakfield", ownerId: "P-EOIN", due: "2026-11-25", priority: "normal", label: "Site work", status: "open", link: { page: "jobs", tab: "jobs", id: "J-015" } },
  { id: "TSK-090", key: "done:meter", title: "Read the PL-01 meter after Millrace", ownerId: "P-RYAN", due: "2026-11-20", priority: "normal", label: "Plant", status: "done", doneAt: "2026-11-20T18:05", link: { page: "plant", tab: "machines", id: "PL-01" } },
  { id: "TSK-091", key: "done:pay029", title: "Record the Birch Lane part-payment", ownerId: "P-RYAN", due: "2026-11-12", priority: "normal", label: "Billing", status: "done", doneAt: "2026-11-12T19:05", link: { page: "invoices", tab: "payments", id: "PAY-029-1" } },
  { id: "TSK-092", key: "done:rc028", title: "Send the Alder Weir receipt to Glenwater", ownerId: "P-RYAN", due: "2026-11-04", priority: "normal", label: "Billing", status: "done", doneAt: "2026-11-04T18:44", link: { page: "invoices", tab: "payments", id: "RC-028" } },
];

const callbacks: Callback[] = [
  { id: "CB-201", name: "Maeve", customerId: "C-MEAD", received: "2026-11-23T08:42", enquiry: "Missed call while on the machine. Voicemail: the yard floods at the gate after heavy rain, wants a price for drainage.", status: "waiting" },
  { id: "CB-188", name: "Farm office", customerId: "C-OAK", received: "2026-11-11T10:15", enquiry: "Wants an access track to the top field before the ground gets too soft.", status: "done", callAt: "17:30", outcome: "Rang back, priced it, booked J-015 for 25 Nov.", doneAt: "2026-11-11T17:41" },
];

let ev = 0;
const E = (at: string, actor: string, source: ActivityEvent["source"], text: string, link: ActivityEvent["link"], jobId?: string): ActivityEvent =>
  ({ id: "EV-" + String(++ev).padStart(3, "0"), at, actor, source, text, link, jobId });

const events: ActivityEvent[] = [
  E("2026-11-02T20:10", "P-RYAN", "Excel import", "Imported the invoice workbook: 6 invoices, 19 diary days, 4 payments", { page: "activity", tab: "sources", id: "excel" }),
  E("2026-11-03T09:12", "S-FERN", "Email", "Fern Fuel Co. invoice FF-20931 arrived, €920 fuel", { page: "costs", tab: "receipts", id: "CST-01" }),
  E("2026-11-04T18:42", "P-RYAN", "Payment", "Recorded €3,100 from Glenwater Rivers Office against INV-028 (GRO-0411)", { page: "invoices", tab: "payments", id: "PAY-028" }, "J-011"),
  E("2026-11-04T18:44", "invoice", "Invoice", "Issued paid receipt RC-028 for INV-028, balance €0", { page: "invoices", tab: "payments", id: "RC-028" }, "J-011"),
  E("2026-11-06T11:30", "S-QUARRY", "Email", "Quarry Road Oils invoice QRO-5512 arrived, €360 fuel", { page: "costs", tab: "receipts", id: "CST-02" }),
  ...days.filter(d => d.jobId === "J-014").flatMap(d => [
    E(d.approvedAt!, "P-RYAN", "Diary", "Approved the diary for " + d.date.slice(8).replace(/^0/, "") + " Nov at Millrace, " + d.lines.reduce((n, l) => n + l.hours, 0) + " machine hours", { page: "jobs", tab: "diary", id: "J-014@" + d.date }, "J-014"),
  ]),
  E("2026-11-10T13:20", "P-RYAN", "Paper receipt", "Photographed the Hillgate Plant Parts receipt HPP-0874, €185", { page: "costs", tab: "receipts", id: "CST-03" }),
  E("2026-11-10T17:55", "P-RYAN", "Plant", "Logged a hose repair on PL-01 at 2,428 h", { page: "plant", tab: "machines", id: "PL-01" }),
  E("2026-11-10T09:00", "invoice", "Reminder", "Sent the first reminder for INV-029 to Birch Lane Agri", { page: "invoices", tab: "chase", id: "INV-029" }, "J-012"),
  E("2026-11-12T19:05", "P-RYAN", "Payment", "Recorded €900 from Birch Lane Agri against INV-029, €1,440 left", { page: "invoices", tab: "payments", id: "PAY-029-1" }, "J-012"),
  E("2026-11-17T08:40", "S-LANE", "Email", "Lane End Tyres invoice LET-3306 arrived, €240 tyres", { page: "costs", tab: "receipts", id: "CST-04" }),
  E("2026-11-20T08:05", "S-FIELD", "Email", "Fieldstone Cover policy schedule and November instalment, €168", { page: "costs", tab: "receipts", id: "CST-05" }),
  E("2026-11-20T18:05", "P-RYAN", "Plant", "Read the PL-01 meter after work: 2,492 h", { page: "plant", tab: "machines", id: "PL-01" }),
  E("2026-11-21T10:02", "costs", "Agent", "Recognised a resent Lane End Tyres invoice LET-3306 as a possible duplicate", { page: "costs", tab: "receipts", id: "IN-LET-3306" }),
  E("2026-11-22T18:00", "invoice", "Agent", "Drafted a second reminder for INV-029 on the €1,440 balance", { page: "invoices", tab: "chase", id: "INV-029" }, "J-012"),
  E("2026-11-23T06:30", "watchdog", "Agent", "Compared Millrace's 10 planned days with 9 approved diary days", { page: "jobs", tab: "diary", id: "J-014@2026-11-20" }, "J-014"),
  E("2026-11-23T07:00", "briefing", "Agent", "Wrote this morning's briefing", { page: "agents", tab: "briefing" }),
  E("2026-11-23T08:42", "C-MEAD", "Callback", "Missed call from Maeve at Meadow Lane Stables about yard drainage", { page: "work", tab: "callbacks", id: "CB-201" }),
].sort((a, b) => a.at.localeCompare(b.at));

const runs: AgentRun[] = [
  { id: "RUN-B-1123", agentId: "briefing", at: "2026-11-23T07:00", inputs: ["J-014", "INV-029", "PL-01"], output: "", link: { page: "agents", tab: "briefing" } },
  { id: "RUN-W-1123", agentId: "watchdog", at: "2026-11-23T06:30", inputs: ["J-014", "DD-J014-2026-11-19", "MR-01-1120"], output: "Millrace planned 10 days and has 9 approved. Fri 20 Nov has no diary entry. PL-01 read 2,492 h on 20 Nov; service falls due at 2,500 h, 8 h away, and Oakfield starts on 25 Nov.", link: { page: "jobs", tab: "diary", id: "J-014@2026-11-20" } },
  { id: "RUN-D-1119", agentId: "diary", at: "2026-11-19T19:38", inputs: ["Typed note, 19 Nov"], output: "Thu 19 Nov at Millrace: 13-tonne digger 8 h (Ryan), site dumper 4 h (Eoin). Ryan approved it.", link: { page: "jobs", tab: "diary", id: "J-014@2026-11-19" } },
  { id: "RUN-I-1122", agentId: "invoice", at: "2026-11-22T18:00", inputs: ["INV-029", "PAY-029-1", "RM-029-1"], output: "Drafted a second reminder to Pat for the €1,440 left on INV-029. Waiting for Ryan.", link: { page: "invoices", tab: "chase", id: "INV-029" } },
  { id: "RUN-I-1104", agentId: "invoice", at: "2026-11-04T18:44", inputs: ["INV-028", "PAY-028"], output: "Issued paid receipt RC-028 for €3,100, reference GRO-0411, balance €0.", link: { page: "invoices", tab: "payments", id: "RC-028" } },
  { id: "RUN-C-1121", agentId: "costs", at: "2026-11-21T10:02", inputs: ["IN-LET-3306", "CST-04"], output: "Lane End Tyres sent LET-3306 again. Same supplier, reference and amount as CST-04, so it is not a new cost.", link: { page: "costs", tab: "receipts", id: "IN-LET-3306" } },
  { id: "RUN-C-1120", agentId: "costs", at: "2026-11-20T18:30", inputs: ["CST-01", "CST-02", "CST-03", "CST-04", "CST-05"], output: "November paid out €1,873 across five costs. Justin already has four. The Hillgate parts receipt is only on Ryan's phone.", link: { page: "costs", tab: "handover" } },
];

export function makeSeed(): DemoState {
  // Deep copy so a reset always starts from untouched fixtures.
  return JSON.parse(JSON.stringify({
    version: SEED_VERSION,
    people, customers, suppliers, machines, meters, jobs, days, invoices, payments, receipts,
    promises: [], reminders, costs, docs, incoming, services, policies, instalments,
    handovers: [], outbox: [], tasks, callbacks, events, runs,
    settings: { displayName: "Ryan Trappe", descriptor: "Plant & groundworks", country: "Ireland", monogram: "RT", email: "ryan@example.com", actingAs: "P-RYAN" },
    seq: 500,
  } satisfies DemoState));
}
