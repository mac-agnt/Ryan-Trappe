import { useSyncExternalStore } from "react";
import type { ISODate } from "./types";

/* Overlay state shared by every page: the diary capture sheet, invoice
   preview, evidence drawer, print views and record sheets. Not persisted. */

export type PrintKind = "invoice" | "receipt" | "grant" | "handover" | "policy" | "doc";
export interface UiState {
  capture: null | { jobId?: string; date?: ISODate; mode?: "start" | "sample" | "typed"; autoplay?: boolean };
  invoice: null | { invoiceId: string; lineId?: string };
  print: null | { kind: PrintKind; id: string };
  record: null | { kind: string; id: string };
  search: boolean;
  navOpen: boolean;
  toast: null | { text: string; n: number };
}

let ui: UiState = { capture: null, invoice: null, print: null, record: null, search: false, navOpen: false, toast: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<UiState>) => { ui = { ...ui, ...patch }; listeners.forEach(l => l()); };

export const getUi = () => ui;
export const subscribeUi = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const useUi = () => useSyncExternalStore(subscribeUi, getUi, getUi);

export const openCapture = (o: UiState["capture"] = {}) => set({ capture: o || {}, search: false });
export const closeCapture = () => set({ capture: null });
export const openInvoice = (invoiceId: string, lineId?: string) => set({ invoice: { invoiceId, lineId }, search: false });
export const closeInvoice = () => set({ invoice: null });
export const openPrint = (kind: PrintKind, id: string) => set({ print: { kind, id }, search: false });
export const closePrint = () => set({ print: null });
export const openRecord = (kind: string, id: string) => set({ record: { kind, id }, search: false });
export const closeRecord = () => set({ record: null });
export const setSearch = (open: boolean) => set({ search: open });
export const setNavOpen = (open: boolean) => set({ navOpen: open });

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string) {
  clearTimeout(toastTimer);
  set({ toast: { text, n: (ui.toast?.n || 0) + 1 } });
  toastTimer = setTimeout(() => set({ toast: null }), 3600);
}
export function resetUi() {
  set({ capture: null, invoice: null, print: null, record: null, search: false, navOpen: false, toast: null });
}
