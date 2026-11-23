/* Typed records for the Ryan Trappe demo. Money is integer cents, dates are
   ISO "YYYY-MM-DD" strings, timestamps are ISO "YYYY-MM-DDTHH:MM". */

export type Cents = number;
export type ISODate = string;
export type Stamp = string;

export type PersonId = string;
export type Label = "Site work" | "Billing" | "Plant";

export interface Person {
  id: PersonId;
  name: string;
  first: string;
  initials: string;
  role: string;
  crew: "regular" | "relief" | "external";
  email: string;
  access: "owner" | "operator" | "accountant";
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  kind: "business" | "public body" | "enquiry";
  termsDays: number;
}

export interface Supplier {
  id: string;
  name: string;
  category: CostCategory;
  email: string;
}

export interface Machine {
  id: string;
  name: string;
  short: string;
  aliases: string[];
  rateCents: Cents;
  intervalH: number;
  nextServiceAt: number;
  policyId: string;
}

export interface MeterReading {
  id: string;
  machineId: string;
  date: ISODate;
  hours: number;
  note: string;
  byId: PersonId;
}

export type JobStatus = "scheduled" | "active" | "finished";

export interface Job {
  id: string;
  name: string;
  customerId: string;
  location: string;
  workdays: ISODate[];
  status: JobStatus;
  finishedOn?: ISODate;
}

export interface MachineLine {
  id: string;
  dayId: string;
  machineId: string;
  operatorId: PersonId;
  hours: number;
  rateCents: Cents;
  description: string;
}

export type DaySource = "excel" | "typed" | "voice";
export type DayStatus = "approved" | "submitted";

export interface DiaryDay {
  id: string;
  jobId: string;
  date: ISODate;
  status: DayStatus;
  source: DaySource;
  note: string;
  lines: MachineLine[];
  enteredById: PersonId;
  approvedAt?: Stamp;
  invoiceId?: string;
}

export interface InvoiceLine {
  id: string;
  machineId: string;
  description: string;
  hours: number;
  rateCents: Cents;
  amountCents: Cents;
  machineLineIds: string[];
}

export type InvoiceStatus = "draft" | "sent";

export interface Invoice {
  id: string;
  jobId: string;
  customerId: string;
  status: InvoiceStatus;
  approved: boolean;
  issued?: ISODate;
  due?: ISODate;
  lines: InvoiceLine[];
  totalCents: Cents;
  source: "excel" | "pulse";
  sentAt?: Stamp;
}

export interface Payment {
  id: string;
  invoiceId: string;
  date: ISODate;
  amountCents: Cents;
  method: string;
  reference: string;
  receiptId: string;
  recordedAt: Stamp;
}

export interface ReceiptDoc {
  id: string;
  paymentId: string;
  invoiceId: string;
  kind: "paid" | "acknowledgement";
  issued: ISODate;
}

export interface PromiseToPay {
  id: string;
  invoiceId: string;
  date: ISODate;
  amountCents: Cents;
  recordedAt: Stamp;
  status: "open" | "kept" | "superseded";
}

export interface Reminder {
  id: string;
  invoiceId: string;
  status: "draft" | "sent" | "held" | "cancelled";
  sentOn?: ISODate;
  heldUntil?: ISODate;
  draftedBy: string;
}

export type CostCategory = "Fuel" | "Parts" | "Tyres" | "Insurance";
export type JustinStatus = "received" | "ready" | "sent";

export interface Cost {
  id: string;
  date: ISODate;
  supplierId: string;
  category: CostCategory;
  amountCents: Cents;
  paidDate: ISODate;
  reference: string;
  source: "Email" | "Paper receipt";
  docId: string;
  justin: JustinStatus;
  machineId?: string;
  serviceId?: string;
  policyId?: string;
  duplicateDocIds: string[];
}

export interface Doc {
  id: string;
  kind: "invoice" | "receipt" | "supplier bill" | "paper receipt" | "policy schedule" | "workbook" | "acknowledgement";
  title: string;
  source: "Email" | "Paper receipt" | "Excel import" | "Pulse";
  date: ISODate;
  linkIds: string[];
}

export interface IncomingDoc {
  id: string;
  supplierId: string;
  reference: string;
  amountCents: Cents;
  received: ISODate;
  source: "Email";
  status: "waiting" | "matched";
  matchedCostId?: string;
}

export interface Service {
  id: string;
  machineId: string;
  kind: "service" | "repair";
  status: "done" | "scheduled";
  date: ISODate;
  meterAt?: number;
  byId: PersonId;
  notes: string;
  costId?: string;
}

export interface Policy {
  id: string;
  insurer: string;
  name: string;
  reference: string;
  machineIds: string[];
  starts: ISODate;
  renews: ISODate;
  monthlyCents: Cents;
}

export interface Instalment {
  id: string;
  policyId: string;
  date: ISODate;
  amountCents: Cents;
  costId?: string;
  status: "paid" | "due";
}

export interface Handover {
  id: string;
  date: Stamp;
  costIds: string[];
  note: string;
}

export interface OutboxItem {
  id: string;
  at: Stamp;
  to: string;
  subject: string;
  kind: "invoice" | "reminder" | "handover" | "receipt";
  linkId: string;
}

export type TaskStatus = "open" | "scheduled" | "done";

export interface LinkRef {
  page: string;
  tab?: string;
  id?: string;
}

export interface Task {
  id: string;
  title: string;
  ownerId: PersonId;
  due: ISODate;
  priority: "high" | "normal";
  label: Label;
  status: TaskStatus;
  link: LinkRef;
  key: string;
  doneAt?: Stamp;
}

export interface Callback {
  id: string;
  name: string;
  customerId: string;
  received: Stamp;
  enquiry: string;
  status: "waiting" | "scheduled" | "done";
  callAt?: string;
  outcome?: string;
  doneAt?: Stamp;
}

export type EventSource = "Diary" | "Invoice" | "Payment" | "Email" | "Excel import" | "Paper receipt" | "Reminder" | "Plant" | "Callback" | "Handover" | "Agent";

export interface ActivityEvent {
  id: string;
  at: Stamp;
  actor: string;
  source: EventSource;
  text: string;
  jobId?: string;
  link: LinkRef;
}

export type AgentId = "briefing" | "watchdog" | "diary" | "invoice" | "costs";

export interface AgentRun {
  id: string;
  agentId: AgentId;
  at: Stamp;
  inputs: string[];
  output: string;
  link: LinkRef;
}

export interface Settings {
  displayName: string;
  descriptor: string;
  country: string;
  monogram: string;
  email: string;
  actingAs: PersonId;
}

export interface DemoState {
  version: number;
  people: Person[];
  customers: Customer[];
  suppliers: Supplier[];
  machines: Machine[];
  meters: MeterReading[];
  jobs: Job[];
  days: DiaryDay[];
  invoices: Invoice[];
  payments: Payment[];
  receipts: ReceiptDoc[];
  promises: PromiseToPay[];
  reminders: Reminder[];
  costs: Cost[];
  docs: Doc[];
  incoming: IncomingDoc[];
  services: Service[];
  policies: Policy[];
  instalments: Instalment[];
  handovers: Handover[];
  outbox: OutboxItem[];
  tasks: Task[];
  callbacks: Callback[];
  events: ActivityEvent[];
  runs: AgentRun[];
  settings: Settings;
  seq: number;
}
