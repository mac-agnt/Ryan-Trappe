import { css, cat } from "../../runtime/template";
import KpiBackdrop from "./KpiBackdrop";
import { useDemo } from "../../demo/store";
import { useRoute } from "../../demo/router";
import { KpiCards, DashTitle } from "../demo/DashboardPage";

type Props = { v: any };

/* Core numbers, always in view on the Dashboard. Every figure is derived from
   the demo store; each card opens its matching rows below. */
export default function DashboardKpiBand({ v }: Props) {
  const s = useDemo();
  const r = useRoute();
  return (
    <div data-kpi-band="1" className="rt-kpi-band" style={css(cat("position:relative;z-index:3;flex:none;width:100%;max-width:1380px;margin:0 auto;padding:34px 46px 28px;box-sizing:border-box;background:none;--kb:", v.kpiBackdrop))}>
      {v.kpiBackdropOn && <KpiBackdrop v={v} />}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 12, paddingBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.8px", color: "var(--ink)" }}><DashTitle tab={r.tab} /></div>
          <div style={{ fontSize: 12.5, color: "var(--on-accent-2)", marginTop: 5 }}>Recorded money and work up to Mon 23 Nov 2026. Open a card for the rows behind it.</div>
        </div>
      </div>
      <KpiCards s={s} tab={r.tab} sel={r.id} />
    </div>
  );
}
