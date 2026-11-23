import { useEffect, useState } from "react";
import { useDemo } from "../../demo/store";
import { search, KIND_LABEL, type Kind } from "../../demo/search";
import { invoiceLines, invoiceView, machine, person } from "../../demo/derive";
import { dShort, euro, hours } from "../../demo/format";
import { go, useRoute } from "../../demo/router";
import { openInvoice, openPrint, openRecord } from "../../demo/ui";
import { openHit } from "./RecordSheet";
import { Card, Chain, Chip, Empty, Seg, grid } from "./ui";

/* Records → Directory: every customer, supplier, person, job, machine and
   document in one list, plus a trail that walks an invoice line back to the
   diary entry, the machine and the operator. */

type F = "all" | "customer" | "supplier" | "person" | "job" | "machine" | "document";
const KINDS: Kind[] = ["customer", "supplier", "person", "job", "machine", "document"];

export default function RecordsDirectory({ query }: { query: string }) {
  const s = useDemo();
  const r = useRoute();
  const [f, setF] = useState<F>("all");
  const hits = search(s, query, KINDS);
  const shown = hits.filter(h => f === "all" || h.kind === f);
  const count = (k: Kind) => hits.filter(h => h.kind === k).length;

  // A direct link to a record opens its sheet.
  useEffect(() => {
    if (!r.id) return;
    const h = search(s, "", KINDS).find(x => x.id === r.id);
    if (h && ["customer", "supplier", "person", "document"].includes(h.kind)) openRecord(h.kind, h.id);
  }, [r.id]);

  // Trail: the newest invoice line with diary evidence.
  const inv = s.invoices.filter(i => i.status === "sent").sort((a, b) => b.id.localeCompare(a.id))[0];
  const v = invoiceView(s, inv);
  const lines = invoiceLines(s, inv);
  const [lineId, setLineId] = useState("");
  const line = lines.find(l => l.id === lineId) || lines[lines.length - 1];
  const mlId = line.machineLineIds[line.machineLineIds.length - 1];
  const day = s.days.find(d => d.lines.some(l => l.id === mlId))!;
  const ml = day.lines.find(l => l.id === mlId)!;

  return (
    <div className="rt-stack" style={{ gap: 14 }}>
      <Card title="Follow a record" sub="From an invoice line back to the day, the machine and who drove it">
        <div className="rt-card-b">
          <div className="rt-inline" style={{ marginBottom: 12 }}>
            {lines.map(l => <button key={l.id} type="button" className="rt-btn rt-btn-sm" aria-pressed={line.id === l.id} onClick={() => setLineId(l.id)} style={line.id === l.id ? { background: "var(--sel)", color: "var(--on-sel)", borderColor: "transparent" } : undefined}>{inv.id} · {machine(s, l.machineId)!.short}</button>)}
          </div>
          <Chain items={[
            { label: v.customer.name, run: () => openRecord("customer", v.customer.id) },
            { label: v.job.id + " " + v.job.name, run: () => go({ page: "jobs", tab: "jobs", id: v.job.id }) },
            { label: inv.id, run: () => openInvoice(inv.id) },
            { label: "Line: " + hours(line.hours) + " " + machine(s, line.machineId)!.short.toLowerCase() + ", " + euro(line.amountCents), run: () => openInvoice(inv.id, line.id) },
            { label: "Diary " + dShort(day.date), run: () => go({ page: "jobs", tab: "diary", id: day.jobId + "@" + day.date }) },
            { label: ml.machineId + " " + machine(s, ml.machineId)!.short, run: () => go({ page: "plant", tab: "machines", id: ml.machineId }) },
            { label: person(s, ml.operatorId)!.name, run: () => openRecord("person", ml.operatorId) },
          ]} />
          <div className="rt-help" style={{ marginTop: 10 }}>{line.machineLineIds.length} diary entries make up this line. The newest is {dShort(day.date)}: “{ml.description}”.</div>
        </div>
      </Card>
      <Card title="Directory" sub={query.trim() ? "Matching “" + query.trim() + "”" : "Customers, suppliers, people, jobs, machines and documents"}
        right={<Chip>{shown.length} / {hits.length}</Chip>}>
        <div style={{ padding: "0 18px 12px" }}>
          <Seg value={f} onChange={setF} label="Type" options={[["all", "All", hits.length], ["customer", "Customers", count("customer")], ["supplier", "Suppliers", count("supplier")], ["person", "People", count("person")], ["job", "Jobs", count("job")], ["machine", "Machines", count("machine")], ["document", "Documents", count("document")]]} />
        </div>
        <div className="rt-row-head rt-hide-mobile" style={grid("minmax(0,1.3fr) 110px minmax(0,1.4fr)")}><span className="rt-label">Name</span><span className="rt-label">Type</span><span className="rt-label">Details</span></div>
        {shown.map(h => (
          <button key={h.kind + h.id} type="button" className="rt-row" onClick={() => h.kind === "document" ? openPrint("doc", h.id) : openHit(h)} style={grid("minmax(0,1.3fr) 110px minmax(0,1.4fr)", "minmax(0,1fr) auto")}>
            <span className="rt-cell-t">{h.title}</span>
            <span><Chip tone={h.kind === "customer" ? "sel" : h.kind === "machine" ? "slate" : undefined}>{KIND_LABEL[h.kind]}</Chip></span>
            <span className="rt-cell rt-muted rt-hide-mobile">{h.sub}</span>
          </button>
        ))}
        {!shown.length && <Empty title="Nothing matches">It searches names, jobs, places, months and machine names.</Empty>}
      </Card>
    </div>
  );
}
