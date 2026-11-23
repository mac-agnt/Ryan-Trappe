import { useEffect, type CSSProperties, type ReactNode } from "react";
import { select } from "../../demo/router";

/* Shared building blocks for the demo pages. They only use Pulse theme
   tokens (see styles/demo.css), so both themes stay in step. */

export const IC = {
  back: "M15 5.5 8.5 12l6.5 6.5",
  arrow: "M5 12h13 M13 6.5 18.5 12 13 17.5",
  x: "M6 6l12 12 M18 6 6 18",
  check: "M5 12.5l4.2 4.2L19 7",
  plus: "M12 5v14 M5 12h14",
  mic: "M12 3.5a2.8 2.8 0 0 1 2.8 2.8v5.4a2.8 2.8 0 0 1-5.6 0V6.3A2.8 2.8 0 0 1 12 3.5Z M6.5 11.2a5.5 5.5 0 0 0 11 0 M12 16.8v3.7",
  play: "M8 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4A.8.8 0 0 0 8 5.6Z",
  type: "M4.5 7.5V5h15v2.5 M12 5v14 M9 19h6",
  print: "M7 9V3.8h10V9 M7 17.5H5.2A1.7 1.7 0 0 1 3.5 15.8v-5.1A1.7 1.7 0 0 1 5.2 9h13.6a1.7 1.7 0 0 1 1.7 1.7v5.1a1.7 1.7 0 0 1-1.7 1.7H17 M7 14h10v6.2H7V14Z",
  phone: "M5.4 3.8h3l1.5 4-2 1.3a10.5 10.5 0 0 0 7 7l1.3-2 4 1.5v3a1.7 1.7 0 0 1-1.8 1.7A16.6 16.6 0 0 1 3.7 5.6 1.7 1.7 0 0 1 5.4 3.8Z",
  cal: "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z",
  receipt: "M6 3.5h12v17l-2.4-1.4-2.4 1.4-2.4-1.4-2.4 1.4L6 19.1V3.5Z M9 8h6 M9 11.5h6 M9 15h3.5",
  digger: "M3.5 18.5h11 M3.5 18.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0Z M10.5 18.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0Z M4.5 16.5V12h6.5v4.5 M11 12l3.5-6.5 5 3.5-1.5 3 M18 12l1.5 3.5h-3.2",
  send: "M4 12 20 4.5 13.5 20l-2.2-6.3L4 12Z M11.3 13.7 20 4.5",
  pause: "M8.5 5.5v13 M15.5 5.5v13",
  link: "M10 14a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1-1",
  doc: "M7 3.5h7l5 5v12H7v-17Z M14 3.7v5h5 M10 13h6 M10 16.5h4",
  search: "m21 21-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
  menu: "M4 6.5h16 M4 12h16 M4 17.5h16",
  clock: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z M12 7.5V12l3 2",
  euro: "M17.5 6.6A6.5 6.5 0 1 0 17.5 17.4 M4 10.2h9 M4 13.8h9",
  wrench: "M14.5 5.2a4 4 0 0 0-5.1 5.1l-5.6 5.6a1.8 1.8 0 0 0 2.5 2.5l5.6-5.6a4 4 0 0 0 5.1-5.1l-2.4 2.4-2.4-.6-.6-2.4 2.9-1.9Z",
  shield: "M12 3.2 5 5.8v5.9c0 4 2.8 7.1 7 8.6 4.2-1.5 7-4.6 7-8.6V5.8L12 3.2Z",
  user: "M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
};

export function Icon({ d, size = 16, sw = 1.8, style }: { d: string; size?: number; sw?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", ...style }} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function PageHead({ title, sub, actions, children }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rt-head">
      <div className="rt-head-main">
        <h1 className="rt-title">{title}</h1>
        {sub && <div className="rt-sub">{sub}</div>}
        {children}
      </div>
      {actions && <div className="rt-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, sub, right, children, footer, className, style, pad }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string; style?: CSSProperties; pad?: boolean;
}) {
  return (
    <section className={"rt-card" + (className ? " " + className : "")} style={style}>
      {(title || right) && (
        <div className="rt-card-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <div className="rt-card-t">{title}</div>}
            {sub && <div className="rt-card-s">{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {pad ? <div className="rt-card-b">{children}</div> : children}
      {footer && <div className="rt-card-f">{footer}</div>}
    </section>
  );
}

type BtnKind = "p" | "s" | "a" | "g" | undefined;
export function Btn({ children, onClick, kind, sm, lg, block, disabled, icon, title, type }: {
  children?: ReactNode; onClick?: () => void; kind?: BtnKind; sm?: boolean; lg?: boolean; block?: boolean; disabled?: boolean; icon?: string; title?: string; type?: "button" | "submit";
}) {
  const cls = "rt-btn" + (kind ? " rt-btn-" + kind : "") + (sm ? " rt-btn-sm" : "") + (lg ? " rt-btn-lg" : "") + (block ? " rt-btn-block" : "");
  return (
    <button type={type || "button"} className={cls} onClick={onClick} disabled={disabled} title={title}>
      {icon && <Icon d={icon} size={sm ? 13 : lg ? 18 : 15} />}
      {children}
    </button>
  );
}

export function Chip({ children, tone, title }: { children: ReactNode; tone?: "ok" | "attn" | "warn" | "sel" | "slate" | "bad" | "ghost"; title?: string }) {
  return <span className={"rt-chip" + (tone ? " " + tone : "")} title={title}>{children}</span>;
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string, (string | number)?][]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="rt-seg" role="group" aria-label={label}>
      {options.map(([v, l, n]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}{n !== undefined && n !== "" && <span className="n">{n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, flag, help, children, error }: { label: string; flag?: string; help?: string; error?: string; children: ReactNode }) {
  return (
    <div className={"rt-field" + (flag ? " flag" : "")}>
      <label>{label}</label>
      {children}
      {flag && <div className="rt-flag"><span className="rt-dot attn" />{flag}</div>}
      {help && !flag && <div className="rt-help">{help}</div>}
      {error && <div className="rt-error">{error}</div>}
    </div>
  );
}

export function Kv({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="rt-kv">
      {items.map(([k, v], i) => (
        <div key={i}><div className="k">{k}</div><div className="v">{v}</div></div>
      ))}
    </div>
  );
}

export function Avatar({ initials, sel, lg }: { initials: string; sel?: boolean; lg?: boolean }) {
  return <span className={"rt-av" + (sel ? " sel" : "") + (lg ? " lg" : "")}>{initials}</span>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rt-empty"><b>{title}</b>{children}</div>;
}

/** Right-hand detail column. On phones it becomes a full-height sheet with a back button. */
export function Detail({ open, children, backLabel }: { open: boolean; children: ReactNode; backLabel?: string }) {
  return (
    <div className={"rt-detail" + (open ? " has-sel" : "")}>
      {open && (
        <button type="button" className="rt-btn rt-btn-g rt-mobile-back" style={{ marginBottom: 10 }} onClick={() => select(undefined)}>
          <Icon d={IC.back} size={15} />{backLabel || "Back"}
        </button>
      )}
      {children}
    </div>
  );
}

export function Sheet({ title, eyebrow, onClose, children, footer, wide, chips }: {
  title: ReactNode; eyebrow?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; chips?: ReactNode;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <>
      <div className="rt-scrim" onClick={onClose} />
      <aside className={"rt-sheet" + (wide ? " wide" : "")} role="dialog" aria-modal="true">
        <div className="rt-sheet-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <div className="rt-label">{eyebrow}</div>}
            <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.5px", marginTop: eyebrow ? 6 : 0, lineHeight: 1.25 }}>{title}</div>
            {chips && <div className="rt-inline" style={{ marginTop: 9 }}>{chips}</div>}
          </div>
          <button type="button" className="rt-x" onClick={onClose} aria-label="Close"><Icon d={IC.x} size={13} sw={2.4} /></button>
        </div>
        <div className="rt-sheet-b">{children}</div>
        {footer && <div className="rt-sheet-f">{footer}</div>}
      </aside>
    </>
  );
}

export function Section({ label, children, right, style }: { label: ReactNode; children: ReactNode; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ marginTop: 22, ...style }}>
      <div className="rt-inline" style={{ marginBottom: 10 }}>
        <span className="rt-label" style={{ flex: 1 }}>{label}</span>{right}
      </div>
      {children}
    </div>
  );
}

export function Chain({ items }: { items: { label: string; run: () => void }[] }) {
  return (
    <div className="rt-chain">
      {items.map((x, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span className="arr">→</span>}
          <button type="button" onClick={x.run}>{x.label}</button>
        </span>
      ))}
    </div>
  );
}

/** Row columns; the optional second template is used on phones. */
export const grid = (cols: string, mobile?: string): CSSProperties => (mobile ? { gridTemplateColumns: cols, ["--m-cols" as string]: mobile } : { gridTemplateColumns: cols }) as CSSProperties;
