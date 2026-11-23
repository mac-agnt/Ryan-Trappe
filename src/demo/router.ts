import { useSyncExternalStore } from "react";
import type { LinkRef } from "./types";

/* Hash routes, so every sidebar and top-bar destination has a direct link and
   the browser back button works: #/invoices/chase/INV-029 */

export interface PageDef { slug: string; page: string; label: string; tabs: [id: string, label: string][]; }

export const PAGES: PageDef[] = [
  { slug: "home", page: "Home", label: "Home", tabs: [] },
  { slug: "agents", page: "Agents", label: "Agents", tabs: [["briefing", "Briefing"], ["roster", "Agent roster"], ["runs", "Run history"]] },
  { slug: "jobs", page: "Jobs", label: "Jobs & diary", tabs: [["jobs", "Jobs"], ["diary", "Day diary"], ["ready", "Ready to invoice"]] },
  { slug: "invoices", page: "Invoices", label: "Invoices", tabs: [["book", "Invoice book"], ["chase", "To chase"], ["payments", "Payments & receipts"]] },
  { slug: "costs", page: "Costs", label: "Costs", tabs: [["overview", "Spend overview"], ["receipts", "Receipts"], ["handover", "Accountant handover"]] },
  { slug: "plant", page: "Plant", label: "Plant", tabs: [["machines", "Machines"], ["service", "Service diary"], ["insurance", "Insurance"]] },
  { slug: "work", page: "Work", label: "Work", tabs: [["today", "Today"], ["approvals", "Approvals"], ["callbacks", "Callbacks"]] },
  { slug: "dashboard", page: "Dashboard", label: "Dashboard", tabs: [["money", "Money"], ["plant", "Jobs & plant"]] },
  { slug: "records", page: "Records", label: "Records", tabs: [["ontology", "Ontology"], ["files", "Files"], ["directory", "Directory"]] },
  { slug: "activity", page: "Activity", label: "Activity", tabs: [["timeline", "Timeline"], ["sources", "Sources"]] },
  { slug: "settings", page: "Settings", label: "Settings", tabs: [["organisation", "Organisation"], ["team", "Team & access"], ["systems", "Systems"], ["ai", "AI controls"], ["experience", "Experience"]] },
];

export interface Route { slug: string; page: string; tab: string; id?: string; }

const bySlug = (slug: string) => PAGES.find(p => p.slug === slug);
export const pageDef = (page: string) => PAGES.find(p => p.page === page || p.slug === page);

export function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent).filter(Boolean);
  const def = bySlug(parts[0] || "home") || PAGES[0];
  const tab = def.tabs.find(t => t[0] === parts[1]) ? parts[1] : (def.tabs[0]?.[0] || "");
  return { slug: def.slug, page: def.page, tab, id: parts[2] };
}
export function toHash(r: { page: string; tab?: string; id?: string }) {
  const def = pageDef(r.page) || PAGES[0];
  const tab = r.tab || def.tabs[0]?.[0] || "";
  return "#/" + def.slug + (tab ? "/" + tab : "") + (r.id ? "/" + encodeURIComponent(r.id) : "");
}

let current: Route = parse(typeof location === "undefined" ? "" : location.hash);
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    current = parse(location.hash);
    listeners.forEach(l => l());
  });
}

export const getRoute = () => current;
export function subscribeRoute(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function useRoute(): Route {
  return useSyncExternalStore(subscribeRoute, getRoute, getRoute);
}

/** Navigate to a page/tab/record. Pushes history so back works. */
export function go(r: LinkRef | { page: string; tab?: string; id?: string }, opts?: { replace?: boolean }) {
  const h = toHash(r);
  if (h === location.hash) return;
  if (opts?.replace) {
    history.replaceState(null, "", h);
    current = parse(h);
    listeners.forEach(l => l());
  } else {
    location.hash = h;
  }
}
/** Select a record on the current page/tab (or clear it). */
export function select(id?: string) {
  go({ page: current.page, tab: current.tab, id });
}
export function setTab(tab: string) {
  go({ page: current.page, tab });
}
