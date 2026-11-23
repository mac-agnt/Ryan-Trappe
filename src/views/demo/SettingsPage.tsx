import { useState } from "react";
import { useDemo, PERMS, setActingAs, updateIdentity, resetDemo, actingAs, type Perm } from "../../demo/store";
import { dMed } from "../../demo/format";
import { useRoute, go } from "../../demo/router";
import { resetUi, toast } from "../../demo/ui";
import { Avatar, Btn, Card, Chip, Field, IC, Kv, PageHead, Section, grid } from "./ui";

export default function SettingsPage({ theme, toggleTheme, onReset }: { theme: string; toggleTheme: () => void; onReset: () => void }) {
  const r = useRoute();
  if (r.tab === "team") return <TeamTab />;
  if (r.tab === "systems") return <SystemsTab />;
  if (r.tab === "ai") return <AiTab />;
  if (r.tab === "experience") return <ExperienceTab theme={theme} toggleTheme={toggleTheme} onReset={onReset} />;
  return <OrgTab />;
}

function OrgTab() {
  const s = useDemo();
  const [name, setName] = useState(s.settings.displayName);
  const [desc, setDesc] = useState(s.settings.descriptor);
  const [mono, setMono] = useState(s.settings.monogram);
  const dirty = name !== s.settings.displayName || desc !== s.settings.descriptor || mono !== s.settings.monogram;
  return (
    <div className="rt-page">
      <PageHead title="Organisation" sub="How the business shows on screen and on every invoice, receipt and handover." />
      <div className="rt-split">
        <Card pad title="Display identity" footer={<><span className="rt-sp" /><Btn kind="p" disabled={!dirty || !name.trim()} onClick={() => { updateIdentity({ displayName: name.trim(), descriptor: desc.trim(), monogram: mono.trim().slice(0, 3).toUpperCase() }); toast("Identity saved."); }}>Save</Btn></>}>
          <div className="rt-stack">
            <Field label="Name"><input className="rt-input" value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Descriptor"><input className="rt-input" value={desc} onChange={e => setDesc(e.target.value)} /></Field>
            <Field label="Monogram" help="Two or three letters."><input className="rt-input" value={mono} maxLength={3} onChange={e => setMono(e.target.value)} /></Field>
            <Kv items={[["Country", s.settings.country], ["Email on documents", s.settings.email], ["Legal suffix", "None"]]} />
          </div>
        </Card>
        <Card pad title="Preview">
          <div style={{ background: "#fff", color: "#1b2129", borderRadius: 12, padding: 22, display: "flex", gap: 14, alignItems: "center", borderBottom: "3px solid #204D41" }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, background: "#204D41", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{mono.toUpperCase() || "?"}</div>
            <div><div style={{ fontWeight: 700, fontSize: 16 }}>{name || "Name"}</div><div style={{ color: "#5b6570", fontSize: 13 }}>{desc} · {s.settings.country}</div></div>
          </div>
          <div className="rt-help" style={{ marginTop: 12 }}>The letterhead on printed invoices and receipts.</div>
        </Card>
      </div>
    </div>
  );
}

const PERM_LABEL: [Perm, string][] = [
  ["submitDiary", "Log diary days"], ["approveDiary", "Approve diary days"], ["approveInvoice", "Approve and send invoices"],
  ["sendReminder", "Send reminders, record promises"], ["recordPayment", "Record payments"], ["bookService", "Book plant services"],
  ["viewHandover", "Open handover documents"], ["forwardHandover", "Forward to the accountant"],
];

function TeamTab() {
  const s = useDemo();
  const me = actingAs(s);
  return (
    <div className="rt-page">
      <PageHead title="Team & access" sub="Two regular crew and two relief operators, plus Justin for the handover. Switch who you’re viewing as to see what each can do." />
      <Card title="Viewing as" sub="Demo role switch. It changes what buttons do across the app.">
        {s.people.map(p => (
          <button key={p.id} type="button" className="rt-row" aria-selected={me.id === p.id} onClick={() => { setActingAs(p.id); toast("Viewing as " + p.name + "."); }} style={grid("40px minmax(0,1fr) auto auto")}>
            <Avatar initials={p.initials} sel={p.id === "P-RYAN"} lg />
            <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{p.name}</span><span className="rt-cell-s" style={{ display: "block" }}>{p.role} · {p.email}</span></span>
            <Chip tone={p.crew === "regular" ? "sel" : p.crew === "relief" ? "slate" : undefined}>{p.crew === "regular" ? "Regular" : p.crew === "relief" ? "Relief" : "External"}</Chip>
            {me.id === p.id ? <Chip tone="ok">Viewing</Chip> : <span className="rt-link" style={{ fontSize: 12.5 }}>Switch</span>}
          </button>
        ))}
      </Card>
      <Section label="What each role can do">
        <Card>
          <div className="rt-row-head" style={grid("minmax(0,1.6fr) repeat(3,minmax(0,.7fr))")}>
            <span className="rt-label">Action</span><span className="rt-label">Ryan</span><span className="rt-label">Operators</span><span className="rt-label">Justin</span>
          </div>
          {PERM_LABEL.map(([k, l]) => (
            <div key={k} className="rt-row static" style={grid("minmax(0,1.6fr) repeat(3,minmax(0,.7fr))")}>
              <span className="rt-cell">{l}</span>
              {(["owner", "operator", "accountant"] as const).map(a => <span key={a} className="rt-cell">{PERMS[a].includes(k) ? <Chip tone="ok">Yes</Chip> : <span className="rt-faint">No</span>}</span>)}
            </div>
          ))}
        </Card>
      </Section>
    </div>
  );
}

function SystemsTab() {
  const s = useDemo();
  const rows: [string, string, string, string][] = [
    ["Excel invoice workbook", "Simulated historical import", "Imported once on " + dMed("2026-11-02") + ": 6 invoices, 19 diary days, 4 payments", "excel"],
    ["Email", "Sample supplier attachments", s.costs.filter(c => c.source === "Email").length + " bills and " + s.incoming.length + " resent copy", "email"],
    ["Paper receipts", "Captured on Ryan’s phone", s.costs.filter(c => c.source === "Paper receipt").length + " receipt", "paper"],
    ["Payments", "Entered by hand", s.payments.length + " payments, no bank feed", "payments"],
    ["Outbox", "Simulated sending", s.outbox.length + " sent from Pulse in this demo", "outbox"],
    ["Accounting package", "Not connected", "None was named, so nothing is synced", ""],
  ];
  return (
    <div className="rt-page">
      <PageHead title="Systems" sub="What feeds the demo and how. Sample history lives in Activity." />
      <Card>
        {rows.map(([n, how, hist, key]) => (
          <button key={n} type="button" className={"rt-row" + (key ? "" : " static")} onClick={() => key && go({ page: "activity", tab: "sources", id: key })} style={grid("minmax(0,1fr) minmax(0,1.2fr) auto")}>
            <span style={{ minWidth: 0 }}><span className="rt-cell-t" style={{ display: "block" }}>{n}</span><span className="rt-cell-s" style={{ display: "block" }}>{how}</span></span>
            <span className="rt-cell wrap rt-muted">{hist}</span>
            <Chip tone={key ? "sel" : undefined}>{key ? "In use" : "Off"}</Chip>
          </button>
        ))}
      </Card>
    </div>
  );
}

function AiTab() {
  const rows: [string, string, string][] = [
    ["Turn a field note into diary lines", "Diary Assistant", "Ryan approves the day"],
    ["Prepare a job-end invoice", "Invoice Assistant", "Ryan approves, then sends"],
    ["Draft a reminder on a balance", "Invoice Assistant", "Ryan sends or holds it"],
    ["Find an invoice or receipt", "Invoice Assistant", "No approval, read only"],
    ["Prepare the accountant handover", "Costs Assistant", "Ryan forwards it"],
    ["Match a resent supplier bill", "Costs Assistant", "Ryan attaches it"],
    ["Flag a missing day or service due", "Ops Watchdog", "No approval, read only"],
    ["Write the morning briefing", "Briefing", "No approval, read only"],
  ];
  return (
    <div className="rt-page">
      <PageHead title="AI controls" sub="Agents read and draft. Anything that changes the diary, goes to a customer or goes to Justin needs Ryan." />
      <Card>
        <div className="rt-row-head" style={grid("minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)")}><span className="rt-label">Action</span><span className="rt-label">Agent</span><span className="rt-label">Approval</span></div>
        {rows.map(([a, ag, ap]) => (
          <div key={a} className="rt-row static" style={grid("minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)")}>
            <span className="rt-cell">{a}</span><span className="rt-cell rt-muted">{ag}</span>
            <span>{ap.startsWith("No") ? <Chip>{ap}</Chip> : <Chip tone="sel">{ap}</Chip>}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ExperienceTab({ theme, toggleTheme, onReset }: { theme: string; toggleTheme: () => void; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="rt-page">
      <PageHead title="Experience" sub="Locale, theme and the demo reset." />
      <div className="rt-split">
        <Card pad title="Locale">
          <Kv items={[["Time zone", "Europe/Dublin"], ["Dates", "Mon 23 Nov 2026"], ["Currency", "Euro, €1,440"], ["Business date", "Mon 23 Nov 2026"]]} />
          <div className="rt-help">The demo always runs on Monday 23 November 2026, so “last Friday” is 20 November. The greeting uses the real time in Dublin.</div>
          <Section label="Theme">
            <div className="rt-inline"><Chip tone="sel">{theme === "light" ? "Light" : "Dark"}</Chip><Btn sm onClick={toggleTheme}>Switch to {theme === "light" ? "dark" : "light"}</Btn></div>
          </Section>
        </Card>
        <Card pad title="Reset demo" sub="Puts every record back to Monday morning: Friday missing, Birch Lane owing €1,440, the digger eight hours from service.">
          {!confirm ? <Btn kind="a" icon={IC.back} onClick={() => setConfirm(true)}>Reset demo</Btn> : (
            <div className="rt-note attn">
              This clears every change made in the demo on this browser. It can’t be undone.
              <div className="rt-inline" style={{ marginTop: 10 }}>
                <Btn kind="a" onClick={() => { resetDemo(); resetUi(); onReset(); setConfirm(false); go({ page: "home" }); toast("Demo reset to Mon 23 Nov."); }}>Yes, reset</Btn>
                <Btn kind="g" onClick={() => setConfirm(false)}>Cancel</Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
