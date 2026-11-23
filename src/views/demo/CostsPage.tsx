import { useState } from "react";
import { useDemo, can, forwardToJustin, matchIncoming } from "../../demo/store";
import { costsByCat, costsPaid, machine, supplier, sum } from "../../demo/derive";
import { dMed, dShort, euro, plural, stampLabel } from "../../demo/format";
import { select, useRoute, go } from "../../demo/router";
import { openPrint, openRecord, toast } from "../../demo/ui";
import type { Cost, DemoState } from "../../demo/types";
import { Btn, Card, Chip, Detail, Empty, IC, Kv, PageHead, Section, grid } from "./ui";

export default function CostsPage() {
  const r = useRoute();
  if (r.tab === "receipts") return <ReceiptsTab />;
  if (r.tab === "handover") return <HandoverTab />;
  return <OverviewTab />;
}

const justinChip = (c: Cost) => c.justin === "ready" ? <Chip tone="attn">Ready to send</Chip> : c.justin === "sent" ? <Chip tone="sel">Sent by you</Chip> : <Chip tone="ok">Justin has it</Chip>;

function CostRow({ s, c, sel }: { s: DemoState; c: Cost; sel?: boolean }) {
  return (
    <button type="button" className="rt-row" aria-selected={sel} onClick={() => select(c.id)} style={grid("70px minmax(0,1fr) 84px auto", "52px minmax(0,1fr) auto")}>
      <span className="rt-cell">{dShort(c.date).slice(4)}</span>
      <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{supplier(s, c.supplierId)!.name}</span><span className="rt-cell-s" style={{ display: "block" }}>{c.category} · {c.reference} · {c.source}</span></span>
      <span className="rt-strong rt-num rt-right">{euro(c.amountCents)}</span>
      <span className="rt-hide-mobile">{justinChip(c)}</span>
    </button>
  );
}

function OverviewTab() {
  const s = useDemo();
  const r = useRoute();
  const cats = costsByCat(s);
  const outs = costsPaid(s);
  const total = sum(outs.map(c => c.amountCents));
  const max = Math.max(...cats.map(c => c.cents));
  const pick = r.id && cats.find(c => c.cat === r.id) ? r.id : "";
  const rows = pick ? cats.find(c => c.cat === pick)!.items : outs;
  return (
    <div className="rt-page">
      <PageHead title="Spend overview" sub={"Paid out in November: " + euro(total) + " across " + plural(outs.length, "cost") + ". Open a category to see what’s in it."} />
      <div className="rt-split">
        <Card title="By category" sub="November, paid">
          <div className="rt-card-b">
            <div className="rt-bars">
              {cats.map(c => (
                <button key={c.cat} type="button" className="rt-bar" aria-pressed={pick === c.cat} onClick={() => select(pick === c.cat ? undefined : c.cat)}>
                  <span className="lbl">{c.cat}<span className="rt-faint"> · {c.items.length}</span></span>
                  <span><span className={"fill" + (c.cat === "Fuel" ? " sel" : "")} style={{ display: "block", width: Math.max(4, Math.round((c.cents / max) * 100)) + "%" }} /></span>
                  <span className="amt">{euro(c.cents)}</span>
                </button>
              ))}
            </div>
            <div className="rt-inline" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <span className="rt-muted" style={{ flex: 1, fontSize: 13 }}>Fuel is {Math.round((cats.find(c => c.cat === "Fuel")?.cents || 0) / total * 100)}% of what went out</span>
              <span className="rt-strong rt-num" style={{ fontSize: 16 }}>{euro(total)}</span>
            </div>
          </div>
        </Card>
        <Card title={pick ? pick + " · " + plural(rows.length, "cost") : "Every November cost"} right={pick ? <Btn sm kind="g" onClick={() => select(undefined)}>Show all</Btn> : undefined}
          footer={<><span className="rt-muted" style={{ fontSize: 12.5, flex: 1 }}>Total</span><span className="rt-strong rt-num">{euro(sum(rows.map(c => c.amountCents)))}</span></>}>
          {rows.map(c => (
            <button key={c.id} type="button" className="rt-row" onClick={() => go({ page: "costs", tab: "receipts", id: c.id })} style={grid("70px minmax(0,1fr) auto")}>
              <span className="rt-cell">{dShort(c.date).slice(4)}</span>
              <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{supplier(s, c.supplierId)!.name}</span><span className="rt-cell-s" style={{ display: "block" }}>{c.reference}{c.machineId ? " · " + c.machineId : ""}</span></span>
              <span className="rt-strong rt-num">{euro(c.amountCents)}</span>
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ReceiptsTab() {
  const s = useDemo();
  const r = useRoute();
  const outs = s.costs.slice().sort((a, b) => b.date.localeCompare(a.date));
  const sel = s.costs.find(c => c.id === r.id);
  const inc = s.incoming.find(x => x.id === r.id);
  const waiting = s.incoming.filter(x => x.status === "waiting");
  return (
    <div className="rt-page">
      <PageHead title="Receipts" sub="Supplier emails and paper receipts in one list, with proof and the date each was paid." />
      <div className="rt-split">
        <div className="rt-stack">
          {waiting.map(x => {
            const hit = s.costs.find(c => c.supplierId === x.supplierId && c.reference === x.reference && c.amountCents === x.amountCents);
            return (
              <Card key={x.id} title={"Arrived again: " + supplier(s, x.supplierId)!.name + " " + x.reference} sub={"By email on " + dShort(x.received) + ", " + euro(x.amountCents)}
                right={<Chip tone="attn">Possible duplicate</Chip>}
                footer={<><span className="rt-muted" style={{ fontSize: 12.5, flex: 1 }}>{hit ? "Same supplier, reference and amount as " + hit.id + "." : "No match found."}</span>{hit && <Btn kind="p" onClick={() => { matchIncoming(x.id); toast("Matched to " + hit.id + ". Still five costs."); }}>Attach to {hit.id}</Btn>}</>} />
            );
          })}
          <Card title={plural(outs.length, "cost") + " · " + euro(sum(outs.map(c => c.amountCents)))}>
            {outs.map(c => <CostRow key={c.id} s={s} c={c} sel={sel?.id === c.id} />)}
          </Card>
        </div>
        <Detail open={!!sel || !!inc} backLabel="Receipts">
          {sel ? <CostDetail s={s} c={sel} /> : inc ? (
            <Card pad title={"Resent " + inc.reference}>
              <div className="rt-note">{inc.status === "matched" ? "Matched to " + inc.matchedCostId + " by supplier, reference and amount. No new cost was added." : "Waiting to be matched."}</div>
            </Card>
          ) : <Card pad title="Pick a cost"><div className="rt-muted" style={{ fontSize: 13 }}>The document, where it came from, what it’s for and whether Justin has it.</div></Card>}
        </Detail>
      </div>
    </div>
  );
}

function CostDetail({ s, c }: { s: DemoState; c: Cost }) {
  const sup = supplier(s, c.supplierId)!;
  const svc = c.serviceId ? s.services.find(x => x.id === c.serviceId) : undefined;
  return (
    <Card>
      <div className="rt-card-h" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div className="rt-label">{c.id} · {c.category}</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px", marginTop: 5 }}>{sup.name} · {euro(c.amountCents)}</div>
        </div>
        {justinChip(c)}
      </div>
      <div className="rt-card-b">
        <Kv items={[["Reference", c.reference], ["Dated", dMed(c.date)], ["Paid", dMed(c.paidDate)], ["Proof", c.source === "Paper receipt" ? "Photo of paper receipt" : "Supplier email"], ["Source", c.source]]} />
        {(c.machineId || c.policyId) && (
          <Section label="What it’s for">
            {c.machineId && <div className="rt-note">{c.machineId} {machine(s, c.machineId)!.name}{svc ? ": " + svc.notes.toLowerCase() + " on " + dShort(svc.date) + " at " + (svc.meterAt || 0).toLocaleString("en-IE") + " h." : "."}</div>}
            {c.policyId && <div className="rt-note">November instalment on the plant policy covering all six machines.</div>}
            <div className="rt-inline" style={{ marginTop: 10 }}>
              {c.machineId && <Btn sm onClick={() => go({ page: "plant", tab: "machines", id: c.machineId })}>Open {c.machineId}</Btn>}
              {c.policyId && <Btn sm onClick={() => go({ page: "plant", tab: "insurance" })}>Open the policy</Btn>}
            </div>
          </Section>
        )}
        {c.duplicateDocIds.length > 0 && <Section label="Duplicates"><div className="rt-note">{sup.name} sent {c.reference} again. It was matched by supplier, reference and amount and attached here, so this is still one cost.</div></Section>}
        <div className="rt-inline" style={{ marginTop: 16 }}>
          <Btn kind="p" icon={IC.doc} onClick={() => openPrint("doc", c.docId)}>Open the document</Btn>
          <Btn onClick={() => openRecord("supplier", sup.id)}>{sup.name}</Btn>
        </div>
      </div>
    </Card>
  );
}

function HandoverTab() {
  const s = useDemo();
  const r = useRoute();
  const [incl, setIncl] = useState<Record<string, boolean>>({});
  const outs = costsPaid(s);
  const received = outs.filter(c => c.justin === "received");
  const ready = outs.filter(c => c.justin === "ready");
  const sent = outs.filter(c => c.justin === "sent");
  const chosen = ready.filter(c => incl[c.id] !== false);
  const allowed = can(s, "forwardHandover");
  const viewer = can(s, "viewHandover");
  const sel = s.handovers.find(h => h.id === r.id);
  return (
    <div className="rt-page">
      <PageHead title="Accountant handover" sub={"Justin gets most bills straight from suppliers. Here’s what he has for November, and the only thing he doesn’t."} />
      {!viewer && <div className="rt-note attn" style={{ marginBottom: 14 }}>Your role can’t open handover documents.</div>}
      <div className="rt-cols c3" style={{ marginBottom: 14 }}>
        <Card><div className="rt-stat"><div className="rt-label">Received by Justin</div><div className="v">{received.length}</div><div className="s">{euro(sum(received.map(c => c.amountCents)))}, from suppliers</div></div></Card>
        <Card><div className="rt-stat"><div className="rt-label">Ready to send</div><div className="v" style={{ color: ready.length ? "var(--attn-ink)" : undefined }}>{ready.length}</div><div className="s">{ready.length ? euro(sum(ready.map(c => c.amountCents))) + ", only on your phone" : "Nothing waiting"}</div></div></Card>
        <Card><div className="rt-stat"><div className="rt-label">In a handover</div><div className="v">{sent.length}</div><div className="s">{sent.length ? "Sent by you" : "None yet"}</div></div></Card>
      </div>
      <div className="rt-split">
        <Card title="Ready to send" sub={ready.length ? "Tick what goes. Preview it first." : "All of November is accounted for."}
          footer={ready.length ? <>
            <Btn kind="g" icon={IC.doc} onClick={() => openPrint("handover", "pending")}>Preview</Btn>
            <span className="rt-sp" />
            {!allowed && <span className="rt-faint" style={{ fontSize: 12 }}>Only Ryan forwards to Justin.</span>}
            <Btn kind="p" icon={IC.send} disabled={!allowed || !chosen.length} onClick={() => { forwardToJustin(chosen.map(c => c.id)); toast("Forwarded " + plural(chosen.length, "receipt") + " to Justin (simulated)."); }}>Forward to Justin</Btn>
          </> : undefined}>
          {ready.map(c => (
            <label key={c.id} className="rt-row" style={grid("24px minmax(0,1fr) auto")}>
              <input type="checkbox" checked={incl[c.id] !== false} onChange={e => setIncl(x => ({ ...x, [c.id]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--sel)" }} />
              <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{supplier(s, c.supplierId)!.name} {c.reference}</span><span className="rt-cell-s" style={{ display: "block" }}>{c.category} for {c.machineId} · {c.source}, photographed {dShort(c.date)}</span></span>
              <span className="rt-strong rt-num">{euro(c.amountCents)}</span>
            </label>
          ))}
          {!ready.length && <Empty title="Nothing to forward">Justin has all {outs.length} November costs.</Empty>}
        </Card>
        <div className="rt-stack">
          <Card title="Justin already has">
            {received.map(c => (
              <button key={c.id} type="button" className="rt-row" onClick={() => go({ page: "costs", tab: "receipts", id: c.id })} style={grid("minmax(0,1fr) auto")}>
                <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{supplier(s, c.supplierId)!.name}</span><span className="rt-cell-s" style={{ display: "block" }}>{c.reference} · emailed by the supplier</span></span>
                <span className="rt-num">{euro(c.amountCents)}</span>
              </button>
            ))}
          </Card>
          <Card title="Handover history">
            {s.handovers.slice().reverse().map(h => (
              <button key={h.id} type="button" className="rt-row" aria-selected={sel?.id === h.id} onClick={() => openPrint("handover", h.id)} style={grid("minmax(0,1fr) auto")}>
                <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{h.id} · {plural(h.costIds.length, "receipt")}</span><span className="rt-cell-s" style={{ display: "block" }}>{stampLabel(h.date)} · {h.costIds.join(", ")}</span></span>
                <span className="rt-num">{euro(sum(h.costIds.map(id => s.costs.find(c => c.id === id)!.amountCents)))}</span>
              </button>
            ))}
            {!s.handovers.length && <Empty title="No handovers yet">Forwarded receipts are kept here.</Empty>}
          </Card>
        </div>
      </div>
    </div>
  );
}
