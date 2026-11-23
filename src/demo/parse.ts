import type { DemoState, ISODate, Job } from "./types";
import type { DraftDay, DraftLine } from "./store";
import { TODAY, addDays, dow } from "./format";

/* Diary Assistant: turns a spoken or typed field note into dated machine
   lines. Deterministic and offline. Anything it cannot pin down is flagged so
   the review sheet asks for that field instead of guessing. */

export const SAMPLE_NOTE = "Last Friday at Millrace, I had eight hours on the thirteen-tonner clearing the last stretch of bank. Eoin had four hours on the dumper moving spoil to the gate.";

export interface ParseFlags { date?: string; job?: string; lines: { machine?: string; operator?: string; hours?: string }[]; }
export interface ParseResult { draft: DraftDay; flags: ParseFlags; jobOptions: Job[]; heard: { date?: string; job?: string }; }

const NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  half: 0.5, "an hour": 1, "a half": 0.5,
};
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function resolveDate(t: string): { date?: ISODate; heard?: string } {
  const s = t.toLowerCase();
  if (/\btoday\b/.test(s)) return { date: TODAY, heard: "today" };
  if (/\byesterday\b/.test(s)) return { date: addDays(TODAY, -1), heard: "yesterday" };
  const m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/);
  if (m) {
    const mon = MONTHS.indexOf(m[2]) + 1;
    return { date: "2026-" + String(mon).padStart(2, "0") + "-" + String(Number(m[1])).padStart(2, "0"), heard: m[0] };
  }
  for (let i = 0; i < 7; i++) {
    const name = DAYS[i];
    const re = new RegExp("\\b(last |this past |on )?" + name + "\\b");
    const hit = s.match(re);
    if (hit) {
      // The most recent such weekday before the business date.
      let d = addDays(TODAY, -1);
      while (dow(d) !== i) d = addDays(d, -1);
      return { date: d, heard: hit[0].trim() };
    }
  }
  return {};
}

function words(s: string) { return s.toLowerCase().replace(/[^a-z0-9\- ]/g, " "); }

function matchJobs(state: DemoState, t: string): { jobs: Job[]; heard?: string } {
  const s = words(t);
  const scored: { j: Job; hit: string }[] = [];
  state.jobs.forEach(j => {
    const cust = state.customers.find(c => c.id === j.customerId)!;
    const keys = [j.name, j.location, cust.name, j.id].map(x => x.toLowerCase());
    const tokens = Array.from(new Set(keys.flatMap(k => k.split(/[^a-z0-9-]+/)).filter(w => w.length > 3 && !["yard", "site", "field", "clearance", "drainage", "farms", "office", "rivers", "lane", "builders", "track", "service", "preparation", "agri", "access", "houses"].includes(w))));
    const hit = tokens.find(w => new RegExp("\\b" + w + "\\b").test(s)) || (s.includes(j.id.toLowerCase()) ? j.id : undefined);
    if (hit) scored.push({ j, hit });
  });
  return { jobs: scored.map(x => x.j), heard: scored[0]?.hit };
}

function parseHours(c: string): number | undefined {
  const s = c.toLowerCase();
  const d = s.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (d) return parseFloat(d[1]);
  const w = s.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?: and a half)?\s+hours?\b/);
  if (w) return NUM[w[1]] + (/and a half/.test(w[0]) ? 0.5 : 0);
  if (/\bhalf a day\b/.test(s)) return 4;
  if (/\bfull day\b/.test(s)) return 8;
  return undefined;
}

export function parseNote(state: DemoState, text: string, source: "voice" | "typed"): ParseResult {
  const flags: ParseFlags = { lines: [] };
  const { date, heard: heardDate } = resolveDate(text);
  const { jobs: jobHits, heard: heardJob } = matchJobs(state, text);
  let jobId = "";
  let jobOptions: Job[] = [];
  if (jobHits.length === 1) jobId = jobHits[0].id;
  else if (jobHits.length > 1) {
    const onDate = date ? jobHits.filter(j => j.workdays.includes(date)) : [];
    if (onDate.length === 1) jobId = onDate[0].id;
    else { jobOptions = jobHits; flags.job = "That matches " + jobHits.length + " jobs. Which one?"; }
  } else flags.job = "Which job was this?";
  if (!date) flags.date = "Which day was this?";

  const acting = state.settings.actingAs;
  const clauses = text.split(/(?<=[.;])\s+|\s+(?:and then|then)\s+/i).map(c => c.trim()).filter(Boolean);
  const aliasList = state.machines.flatMap(m => m.aliases.map(a => ({ a, id: m.id }))).sort((x, y) => y.a.length - x.a.length);
  const lines: DraftLine[] = [];
  clauses.forEach(c => {
    const lc = c.toLowerCase();
    const hours = parseHours(c);
    const alias = aliasList.find(x => new RegExp("(^|[^a-z])" + x.a.replace(/[-]/g, "[- ]?") + "([^a-z]|$)").test(lc));
    if (hours === undefined && !alias) return;
    const named = state.people.find(p => p.crew !== "external" && new RegExp("\\b" + p.first.toLowerCase() + "\\b").test(lc));
    const self = /\b(i|i’d|i'd|me|myself)\b/.test(lc);
    const operatorId = named ? named.id : self ? acting : "";
    let description = "";
    if (alias) {
      const idx = lc.search(new RegExp(alias.a.replace(/[-]/g, "[- ]?")));
      description = c.slice(idx).replace(new RegExp("^" + alias.a.replace(/[-]/g, "[- ]?"), "i"), "");
    }
    description = description.replace(/^[\s,:-]+/, "").replace(/^(doing|for|on|at)\s+/i, "").replace(/[.;\s]+$/, "");
    if (!description) description = c.replace(/[.;\s]+$/, "");
    description = description.charAt(0).toUpperCase() + description.slice(1);
    const f: ParseFlags["lines"][number] = {};
    if (!alias) f.machine = "Which machine?";
    if (!operatorId) f.operator = "Who was driving?";
    if (hours === undefined) f.hours = "How many hours?";
    flags.lines.push(f);
    lines.push({ machineId: alias?.id || "", operatorId, hours: hours ?? 0, description });
  });
  if (!lines.length) {
    lines.push({ machineId: "", operatorId: acting, hours: 0, description: text.trim() });
    flags.lines.push({ machine: "Which machine?", hours: "How many hours?" });
  }
  return {
    draft: { jobId, date: date || "", note: text.trim(), lines, source },
    flags, jobOptions, heard: { date: heardDate, job: heardJob },
  };
}
