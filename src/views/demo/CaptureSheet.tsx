import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDemo, saveDiaryDay, can, actingAs, prepareInvoice, type DraftDay, type DraftLine } from "../../demo/store";
import { parseNote, SAMPLE_NOTE, type ParseFlags } from "../../demo/parse";
import { coverage, dayFor, jobDays, machine, person, customer, sum, unbilledLines, lineAmount, job as jobOf } from "../../demo/derive";
import { TODAY, dLong, dShort, euro, hours } from "../../demo/format";
import { closeCapture, openInvoice, toast, useUi } from "../../demo/ui";
import { go } from "../../demo/router";
import { Btn, Chip, Field, IC, Icon, Sheet, Section } from "./ui";

/* Log a day: sample voice note (or typed note) → editable review → approve.
   The sample runs offline: no microphone, network or speech service. */

type Phase = "start" | "playing" | "typed" | "review" | "done" | "exists";

export default function CaptureSheet() {
  const s = useDemo();
  const { capture } = useUi();
  const pre = capture || {};
  const missingFor = (jid?: string) => {
    const j = jobOf(s, jid);
    return j ? coverage(s, j).missing[0] : undefined;
  };
  const defaultJob = pre.jobId || s.jobs.find(j => coverage(s, j).missing.length)?.id || "";
  const defaultDate = pre.date || missingFor(defaultJob) || TODAY;

  const [phase, setPhase] = useState<Phase>(pre.mode === "typed" ? "typed" : "start");
  const [shown, setShown] = useState(0);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<DraftDay>({ jobId: defaultJob, date: defaultDate, note: "", lines: [], source: "voice" });
  const [flags, setFlags] = useState<ParseFlags>({ lines: [] });
  const [heard, setHeard] = useState<{ date?: string; job?: string }>({});
  const [existingId, setExistingId] = useState<string>("");
  const [savedId, setSavedId] = useState<string>("");
  const [error, setError] = useState("");
  const before = useRef<{ cents: number; days: number } | null>(null);
  const sampleWords = useMemo(() => SAMPLE_NOTE.split(" "), []);
  const owner = can(s, "approveDiary");

  // Reveal the scripted field note word by word.
  useEffect(() => {
    if (phase !== "playing") return;
    if (shown >= sampleWords.length) {
      const t = setTimeout(() => readNote(SAMPLE_NOTE, "voice"), 380);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown(n => n + 1), 95);
    return () => clearTimeout(t);
  }, [phase, shown]);

  function readNote(text: string, source: "voice" | "typed") {
    const r = parseNote(s, text, source);
    const d: DraftDay = { ...r.draft, jobId: r.draft.jobId || (r.flags.job && r.jobOptions.length ? "" : draft.jobId), date: r.draft.date || draft.date };
    const f: ParseFlags = { ...r.flags };
    if (!r.draft.jobId && d.jobId && !r.jobOptions.length) f.job = undefined;
    if (!r.draft.date && d.date) f.date = undefined;
    setNote(text); setDraft(d); setFlags(f); setHeard(r.heard); setError("");
    const ex = d.jobId && d.date ? dayFor(s, d.jobId, d.date) : undefined;
    if (ex && ex.status === "approved") { setExistingId(ex.id); setPhase("exists"); return; }
    setPhase("review");
  }

  const setLine = (i: number, patch: Partial<DraftLine>) => {
    setDraft(d => ({ ...d, lines: d.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
    setFlags(f => ({ ...f, lines: f.lines.map((x, k) => (k === i ? {
      machine: patch.machineId !== undefined ? (patch.machineId ? undefined : "Which machine?") : x.machine,
      operator: patch.operatorId !== undefined ? (patch.operatorId ? undefined : "Who was driving?") : x.operator,
      hours: patch.hours !== undefined ? (patch.hours > 0 ? undefined : "How many hours?") : x.hours,
    } : x)) }));
  };
  const addLine = () => {
    setDraft(d => ({ ...d, lines: d.lines.concat([{ machineId: "", operatorId: s.settings.actingAs, hours: 0, description: "" }]) }));
    setFlags(f => ({ ...f, lines: f.lines.concat([{ machine: "Which machine?", hours: "How many hours?" }]) }));
  };
  const removeLine = (i: number) => {
    setDraft(d => ({ ...d, lines: d.lines.filter((_, k) => k !== i) }));
    setFlags(f => ({ ...f, lines: f.lines.filter((_, k) => k !== i) }));
  };

  const j = jobOf(s, draft.jobId);
  const cust = j ? customer(s, j.customerId) : undefined;
  const lineFlags = draft.lines.map((l, i) => ({
    machine: !l.machineId ? (flags.lines[i]?.machine || "Which machine?") : undefined,
    operator: !l.operatorId ? (flags.lines[i]?.operator || "Who was driving?") : undefined,
    hours: !(l.hours > 0) ? (flags.lines[i]?.hours || "How many hours?") : undefined,
  }));
  const jobFlag = !draft.jobId ? (flags.job || "Which job was this?") : undefined;
  const dateFlag = !draft.date ? "Which day was this?" : undefined;
  const ready = !jobFlag && !dateFlag && draft.lines.length > 0 && lineFlags.every(f => !f.machine && !f.operator && !f.hours);
  const dayTotal = sum(draft.lines.map(l => (machine(s, l.machineId)?.rateCents || 0) * (l.hours || 0)));
  const clash = draft.jobId && draft.date ? dayFor(s, draft.jobId, draft.date) : undefined;

  function approve() {
    if (!ready) return;
    const jb = jobOf(s, draft.jobId)!;
    before.current = { cents: sum(unbilledLines(s, jb.id).map(lineAmount)), days: jobDays(s, jb.id).filter(d => d.status === "approved").length };
    const r = saveDiaryDay({ ...draft, note: note || draft.note });
    if (r.status === "exists") { setExistingId(r.dayId!); setPhase("exists"); return; }
    if (r.status !== "saved") { setError(r.message || "Couldn’t save that."); return; }
    setSavedId(r.dayId!);
    setPhase("done");
  }

  const title = phase === "done" ? (owner ? "Day approved" : "Sent to Ryan") : phase === "exists" ? "Already logged" : "Log a day";
  const eyebrow = j ? j.id + " · " + j.name : "Diary";

  let body: ReactNode = null;
  let footer: ReactNode = null;

  if (phase === "start") {
    const missing = j ? coverage(s, j).missing : [];
    body = (
      <>
        {j && missing.length > 0 && (
          <div className="rt-note attn" style={{ marginBottom: 16 }}>
            <b>{j.name}</b> finished on {dShort(j.finishedOn)}, but {dShort(missing[0])} has no diary entry. {jobDays(s, j.id).filter(d => d.status === "approved").length} of {j.workdays.length} days are logged.
          </div>
        )}
        <div className="rt-stack">
          <Btn kind="p" lg block icon={IC.play} onClick={() => { setShown(0); setPhase("playing"); }}>Use sample recording</Btn>
          <Btn lg block icon={IC.mic} disabled title="Live microphone is outside this demo">Record a voice note</Btn>
          <Btn lg block icon={IC.type} onClick={() => setPhase("typed")}>Type it instead</Btn>
        </div>
        <div className="rt-help" style={{ marginTop: 12 }}>The sample is a scripted field note. It plays here without a microphone or a connection.</div>
      </>
    );
  }

  if (phase === "playing") {
    body = (
      <>
        <div className="rt-inline" style={{ gap: 14 }}>
          <span className="rt-av sel lg"><Icon d={IC.mic} size={18} /></span>
          <div style={{ flex: 1 }}>
            <div className="rt-strong">Field note</div>
            <div className="rt-faint" style={{ fontSize: 12 }}>Sample recording · {Math.min(shown, sampleWords.length)} of {sampleWords.length} words</div>
          </div>
          <div className={"rt-wave" + (shown >= sampleWords.length ? " still" : "")} aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ animationDelay: (i * 0.07) + "s", opacity: .5 + (i % 3) * .2 }} />)}
          </div>
        </div>
        <div className="rt-quote rt-heard" style={{ marginTop: 16 }}>
          {sampleWords.slice(0, shown).join(" ")}
          <span className="pending"> {sampleWords.slice(shown).join(" ")}</span>
        </div>
      </>
    );
    footer = <><span className="rt-sp" /><Btn onClick={() => readNote(SAMPLE_NOTE, "voice")}>Skip to review</Btn></>;
  }

  if (phase === "typed") {
    body = (
      <>
        <Field label="What did you do?" help="Say the day, the job, the machine, who drove it, the hours and the work. For example: Friday at Millrace, eight hours on the 13-tonne digger clearing bank.">
          <textarea className="rt-input" rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="Friday at Millrace, I had eight hours on the 13-tonne digger…" autoFocus />
        </Field>
        <div className="rt-inline" style={{ marginTop: 12 }}>
          <Btn sm onClick={() => setNote(SAMPLE_NOTE)}>Fill in the sample</Btn>
        </div>
      </>
    );
    footer = <><Btn kind="g" onClick={() => setPhase("start")}>Back</Btn><span className="rt-sp" /><Btn kind="p" disabled={!note.trim()} onClick={() => readNote(note, "typed")}>Read it</Btn></>;
  }

  if (phase === "review") {
    const jobOptions = s.jobs.slice().sort((a, b) => b.id.localeCompare(a.id));
    body = (
      <>
        <div className="rt-label">Check it before you approve</div>
        <div className="rt-cols c2" style={{ marginTop: 12 }}>
          <Field label="Date" flag={dateFlag} help={heard.date ? "Heard “" + heard.date + "” → " + dLong(draft.date) : draft.date ? dLong(draft.date) : undefined}>
            <input className="rt-input" type="date" value={draft.date} max={TODAY} onChange={e => { setDraft(d => ({ ...d, date: e.target.value })); setFlags(f => ({ ...f, date: undefined })); }} />
          </Field>
          <Field label="Job" flag={jobFlag} help={j && cust ? cust.name + ", " + j.location : undefined}>
            <select className="rt-input" value={draft.jobId} onChange={e => { setDraft(d => ({ ...d, jobId: e.target.value })); setFlags(f => ({ ...f, job: undefined })); }}>
              <option value="">Choose a job…</option>
              {jobOptions.map(x => <option key={x.id} value={x.id}>{x.id} {x.name}, {customer(s, x.customerId)!.name}</option>)}
            </select>
          </Field>
        </div>
        {clash && clash.status === "approved" && <div className="rt-note attn" style={{ marginTop: 12 }}>{dShort(draft.date)} is already logged for this job. Approving will open the existing entry instead of adding hours.</div>}

        <Section label={"Machine lines · " + draft.lines.length} right={<Btn sm icon={IC.plus} onClick={addLine}>Add a line</Btn>}>
          <div className="rt-stack" style={{ gap: 10 }}>
            {draft.lines.map((l, i) => {
              const m = machine(s, l.machineId);
              const f = lineFlags[i];
              return (
                <div key={i} className="rt-card" style={{ padding: 14, background: "var(--surface-2)" }}>
                  <div className="rt-cols c2">
                    <Field label="Machine" flag={f.machine}>
                      <select className="rt-input" value={l.machineId} onChange={e => setLine(i, { machineId: e.target.value })}>
                        <option value="">Which machine?</option>
                        {s.machines.map(x => <option key={x.id} value={x.id}>{x.id} {x.name} · {euro(x.rateCents)}/h</option>)}
                      </select>
                    </Field>
                    <Field label="Operator" flag={f.operator}>
                      <select className="rt-input" value={l.operatorId} onChange={e => setLine(i, { operatorId: e.target.value })}>
                        <option value="">Who was driving?</option>
                        {s.people.filter(p => p.crew !== "external").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr)", gap: 12, marginTop: 12 }}>
                    <Field label="Hours" flag={f.hours ? "Hours?" : undefined}>
                      <input className="rt-input" type="number" min={0} max={14} step={0.5} value={l.hours || ""} onChange={e => setLine(i, { hours: Number(e.target.value) })} />
                    </Field>
                    <Field label="What we did">
                      <input className="rt-input" value={l.description} onChange={e => setLine(i, { description: e.target.value })} />
                    </Field>
                  </div>
                  <div className="rt-inline" style={{ marginTop: 10, fontSize: 12.5 }}>
                    <span className="rt-muted" style={{ flex: 1 }}>{m && l.hours > 0 ? hours(l.hours) + " × " + euro(m.rateCents) + " = " : ""}<span className="rt-strong">{m && l.hours > 0 ? euro(m.rateCents * l.hours) : ""}</span></span>
                    <Btn sm kind="g" onClick={() => removeLine(i)}>Remove</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section label="Field note">
          <textarea className="rt-input" rows={3} value={note} onChange={e => setNote(e.target.value)} />
          <div className="rt-inline" style={{ marginTop: 8 }}>
            <Btn sm onClick={() => readNote(note, draft.lines.length ? "typed" : "voice")}>Read the note again</Btn>
            <span className="rt-help" style={{ marginTop: 0 }}>Edit the words to change the lines, or edit the fields directly.</span>
          </div>
        </Section>
        {error && <div className="rt-error" style={{ marginTop: 12 }}>{error}</div>}
      </>
    );
    footer = (
      <>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rt-faint" style={{ fontSize: 11.5 }}>This day</div>
          <div className="rt-strong rt-num" style={{ fontSize: 17 }}>{euro(dayTotal)}</div>
        </div>
        <Btn kind="g" onClick={closeCapture}>Cancel</Btn>
        <Btn kind="p" icon={IC.check} disabled={!ready} onClick={approve}>{owner ? "Approve day" : "Submit for Ryan’s approval"}</Btn>
      </>
    );
  }

  if (phase === "exists") {
    const d = s.days.find(x => x.id === existingId);
    const jb = d ? jobOf(s, d.jobId) : undefined;
    body = d && jb ? (
      <>
        <div className="rt-note sel">{dLong(d.date)} is already in the diary for {jb.name}. Nothing new was added, so the hours and the invoice stay as they are.</div>
        <DayLines dayId={d.id} />
        {d.invoiceId && <div className="rt-help" style={{ marginTop: 12 }}>It’s on {d.invoiceId}.</div>}
      </>
    ) : null;
    footer = (
      <>
        <span className="rt-sp" />
        {d?.invoiceId && <Btn onClick={() => { closeCapture(); openInvoice(d.invoiceId!); }}>Open {d.invoiceId}</Btn>}
        <Btn kind="p" onClick={() => { closeCapture(); if (d) go({ page: "jobs", tab: "diary", id: d.jobId + "@" + d.date }); }}>Open the day</Btn>
      </>
    );
  }

  if (phase === "done") {
    const d = s.days.find(x => x.id === savedId);
    const jb = d ? jobOf(s, d.jobId)! : undefined;
    const cov = jb ? coverage(s, jb) : undefined;
    const lines = jb ? unbilledLines(s, jb.id) : [];
    const byM = s.machines.map(m => ({ m, h: sum(lines.filter(l => l.machineId === m.id).map(l => l.hours)) })).filter(x => x.h > 0);
    const after = sum(lines.map(lineAmount));
    body = d && jb && cov ? (
      <>
        <div className="rt-inline" style={{ gap: 12 }}>
          <span className="rt-av sel lg"><Icon d={IC.check} size={20} sw={2.2} /></span>
          <div>
            <div className="rt-strong" style={{ fontSize: 16 }}>{dShort(d.date)} {owner ? "is in the diary" : "is waiting for Ryan"}</div>
            <div className="rt-muted" style={{ fontSize: 13 }}>{jb.name} now has {cov.approved} of {cov.planned} days{owner ? " approved" : ""}.</div>
          </div>
        </div>
        <div className="rt-cover" style={{ marginTop: 16 }}>
          {jb.workdays.map(w => {
            const x = dayFor(s, jb.id, w);
            return <span key={w} title={dShort(w)} className={!x ? "missing" : x.status === "submitted" ? "submitted" : ""} />;
          })}
        </div>
        <DayLines dayId={d.id} />
        {owner && (
          <Section label="Billable so far">
            <div className="rt-card" style={{ background: "var(--surface-2)" }}>
              {byM.map(x => (
                <div key={x.m.id} className="rt-row static" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                  <span className="rt-cell">{x.h} {x.m.short.toLowerCase()} hours × {euro(x.m.rateCents)}</span>
                  <span className="rt-cell rt-strong rt-num">{euro(x.h * x.m.rateCents)}</span>
                </div>
              ))}
              <div className="rt-row static" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                <span className="rt-cell">{dShort(d.date)} adds <b className="rt-strong">{euro(after - (before.current?.cents || 0))}</b></span>
                <span className="rt-cell rt-strong rt-num" style={{ fontSize: 15 }}>{euro(after)}</span>
              </div>
            </div>
          </Section>
        )}
      </>
    ) : null;
    footer = (
      <>
        <Btn kind="g" onClick={closeCapture}>Done</Btn>
        <span className="rt-sp" />
        {owner && cov?.complete && (
          <Btn kind="p" icon={IC.arrow} onClick={() => {
            const id = prepareInvoice(jb!.id);
            closeCapture();
            if (id) { go({ page: "jobs", tab: "ready", id: jb!.id }); openInvoice(id); }
            else toast("Couldn’t prepare that invoice yet.");
          }}>Prepare invoice</Btn>
        )}
      </>
    );
  }

  return (
    <Sheet title={title} eyebrow={eyebrow} onClose={closeCapture} footer={footer}
      chips={!owner ? <Chip tone="slate">Logging as {actingAs(s).name}</Chip> : undefined}>
      {body}
    </Sheet>
  );
}

export function DayLines({ dayId }: { dayId: string }) {
  const s = useDemo();
  const d = s.days.find(x => x.id === dayId);
  if (!d) return null;
  return (
    <div className="rt-card" style={{ marginTop: 16, background: "var(--surface-2)" }}>
      {d.lines.map(l => {
        const m = machine(s, l.machineId)!;
        return (
          <div key={l.id} className="rt-row static" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
            <div style={{ minWidth: 0 }}>
              <div className="rt-cell-t">{m.name}</div>
              <div className="rt-cell-s">{person(s, l.operatorId)!.name} · {hours(l.hours)} · {l.description}</div>
            </div>
            <span className="rt-cell rt-strong rt-num">{euro(l.hours * l.rateCents)}</span>
          </div>
        );
      })}
      {d.note && <div className="rt-row static" style={{ gridTemplateColumns: "1fr" }}><span className="rt-cell wrap rt-muted" style={{ fontSize: 12.5 }}>“{d.note}”</span></div>}
    </div>
  );
}
