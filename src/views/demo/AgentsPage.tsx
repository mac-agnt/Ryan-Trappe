import { useDemo } from "../../demo/store";
import { AGENT_NAMES, briefingLines, sum } from "../../demo/derive";
import { stampLabel, stampRelative, dShort, TODAY } from "../../demo/format";
import { go, select, useRoute } from "../../demo/router";
import type { AgentId, AgentRun, DemoState } from "../../demo/types";
import AgentFace from "../../components/AgentFace";
import { Btn, Card, Chip, Detail, Empty, IC, Icon, PageHead, Section, Seg, grid } from "./ui";
import { useState } from "react";

/* Exactly five agents. Each has one job, a sample run, the records it read,
   what it produced and a link back. None of them sends anything on its own. */

export const AGENTS: { id: AgentId; name: string; job: string; shape: string; tint: string; acts: string }[] = [
  { id: "briefing", name: "Briefing", job: "Reads the diary, invoices and plant every morning and tells you the few things that matter.", shape: "crown-pebble", tint: "#204D41", acts: "Writes a summary. Changes nothing." },
  { id: "watchdog", name: "Ops Watchdog", job: "Compares planned workdays with approved diary days, and the plant meter with the service interval.", shape: "shield", tint: "#334155", acts: "Flags gaps. Changes nothing." },
  { id: "diary", name: "Diary Assistant", job: "Turns a spoken or typed field note into dated machine lines for you to check.", shape: "low-dome", tint: "#204D41", acts: "Drafts diary lines. You approve." },
  { id: "invoice", name: "Invoice Assistant", job: "Builds the job-end invoice from approved days, adds the diary appendix, drafts reminders and finds receipts.", shape: "executive-capsule", tint: "#2b3340", acts: "Drafts invoices and reminders. You send." },
  { id: "costs", name: "Costs Assistant", job: "Groups supplier costs, spots documents Justin already has and gets the handover ready.", shape: "control-cube", tint: "#1d3a33", acts: "Prepares the handover. You forward." },
];

export default function AgentsPage() {
  const r = useRoute();
  if (r.tab === "roster") return <RosterTab />;
  if (r.tab === "runs") return <RunsTab />;
  return <BriefingTab />;
}

function BriefingTab() {
  const s = useDemo();
  const lines = briefingLines(s);
  const run = s.runs.find(x => x.agentId === "briefing")!;
  return (
    <div className="rt-page">
      <PageHead title="Briefing" sub={"Written at " + run.at.slice(11) + " this morning and kept up to date as things change today."} />
      <div className="rt-split wide-l">
        <Card>
          <div className="rt-card-h">
            <AgentFace shape="crown-pebble" state="complete" tint="#204D41" size="36" />
            <div style={{ flex: 1 }}><div className="rt-card-t">Morning, Ryan</div><div className="rt-card-s">{dShort(TODAY)} · from {s.jobs.length} jobs, {s.invoices.length} invoices and {s.machines.length} machines</div></div>
          </div>
          <div className="rt-card-b">
            {lines.map((l, i) => (
              <button key={i} type="button" className="rt-row" onClick={() => go(l.link)} style={{ ...grid("minmax(0,1fr) auto"), borderTop: i ? undefined : 0, padding: "14px 4px" }}>
                <span style={{ fontSize: 16, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "normal" }}>{l.text}</span>
                <Icon d={IC.arrow} size={15} style={{ color: "var(--faint)" }} />
              </button>
            ))}
          </div>
        </Card>
        <Card title="What it read" sub="Every line links to the record behind it">
          <div className="rt-card-b">
            <div className="rt-inline">
              {["J-014", "INV-029", "PL-01"].map(id => <Chip key={id}>{id}</Chip>)}
              <Chip>{sum(s.days.filter(d => d.jobId === "J-014").map(() => 1))} Millrace diary days</Chip>
              <Chip>PL-01 meter readings</Chip>
            </div>
            <div className="rt-help" style={{ marginTop: 14 }}>The briefing is worked out from the same records as every page, so it changes the moment you log a day, take a payment or book a service.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RosterTab() {
  const s = useDemo();
  const r = useRoute();
  const sel = AGENTS.find(a => a.id === r.id);
  return (
    <div className="rt-page">
      <PageHead title="Agent roster" sub="Five agents, each with one job. They draft and check. Anything that leaves the business waits for Ryan." />
      <div className="rt-split">
        <Card>
          {AGENTS.map(a => {
            const last = latest(s, a.id);
            return (
              <button key={a.id} type="button" className="rt-row" aria-selected={sel?.id === a.id} onClick={() => select(a.id)} style={grid("40px minmax(0,1fr) auto")}>
                <AgentFace shape={a.shape} state={last ? "complete" : "idle"} tint={a.tint} size="34" />
                <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{a.name}</span><span className="rt-cell-s" style={{ display: "block", whiteSpace: "normal" }}>{a.job}</span></span>
                <span className="rt-faint rt-hide-mobile" style={{ fontSize: 12 }}>{last ? stampRelative(last.at) : ""}</span>
              </button>
            );
          })}
        </Card>
        <Detail open={!!sel} backLabel="Roster">
          {sel ? <AgentDetail s={s} id={sel.id} /> : <Card pad title="Pick an agent"><div className="rt-muted" style={{ fontSize: 13 }}>Its job, what it may do and its latest run show here.</div></Card>}
        </Detail>
      </div>
    </div>
  );
}

function latest(s: DemoState, id: AgentId) {
  return s.runs.filter(x => x.agentId === id).sort((a, b) => b.at.localeCompare(a.at))[0];
}

function AgentDetail({ s, id }: { s: DemoState; id: AgentId }) {
  const a = AGENTS.find(x => x.id === id)!;
  const runs = s.runs.filter(x => x.agentId === id).sort((x, y) => y.at.localeCompare(x.at));
  return (
    <Card>
      <div className="rt-card-h">
        <AgentFace shape={a.shape} state="complete" tint={a.tint} size="44" />
        <div style={{ flex: 1 }}><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.4px" }}>{a.name}</div><div className="rt-card-s">{a.acts}</div></div>
      </div>
      <div className="rt-card-b">
        <div className="rt-note">{a.job}</div>
        <Section label={"Runs · " + runs.length}>
          {runs.map(rn => <RunCard key={rn.id} s={s} run={rn} />)}
        </Section>
      </div>
    </Card>
  );
}

function RunCard({ s, run }: { s: DemoState; run: AgentRun }) {
  const out = run.agentId === "briefing" && !run.output ? briefingLines(s).map(l => l.text).join(" ") : run.output;
  return (
    <div className="rt-card" style={{ background: "var(--surface-2)", padding: 14, marginBottom: 10 }}>
      <div className="rt-inline" style={{ flexWrap: "nowrap" }}>
        <span className="rt-strong" style={{ fontSize: 13, flex: 1 }}>{AGENT_NAMES[run.agentId]}</span>
        <span className="rt-faint" style={{ fontSize: 12 }}>{stampLabel(run.at)}</span>
      </div>
      <div className="rt-label" style={{ marginTop: 10 }}>Read</div>
      <div className="rt-inline" style={{ marginTop: 6 }}>{run.inputs.map(i => <Chip key={i}>{i}</Chip>)}</div>
      <div className="rt-label" style={{ marginTop: 10 }}>Produced</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 5, color: "var(--ink)" }}>{out}</div>
      <div style={{ marginTop: 10 }}><Btn sm icon={IC.link} onClick={() => go(run.link)}>Open the record</Btn></div>
    </div>
  );
}

function RunsTab() {
  const s = useDemo();
  const [f, setF] = useState<"all" | AgentId>("all");
  const runs = s.runs.filter(x => f === "all" || x.agentId === f).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="rt-page">
      <PageHead title="Run history" sub="Inputs, output, when and the record each run touched." />
      <Card right={<Seg value={f} onChange={setF} label="Agent" options={[["all", "All"], ...AGENTS.map(a => [a.id, a.name] as [AgentId, string])]} />} title={runs.length + " runs"}>
        <div className="rt-card-b">
          {runs.map(rn => <RunCard key={rn.id} s={s} run={rn} />)}
          {!runs.length && <Empty title="No runs yet" />}
        </div>
      </Card>
    </div>
  );
}
