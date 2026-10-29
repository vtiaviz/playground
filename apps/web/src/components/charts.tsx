import { useRef, useState, type ReactNode } from 'react';

// Gráficos do painel, feitos em HTML/CSS (sem biblioteca):
//  - barras finas (12 px), ponta arredondada, base reta; valor na ponta;
//  - segmentos separados por 2 px de "respiro" (cor da superfície), nunca por borda;
//  - dica (tooltip) ao passar o mouse OU ao focar com o teclado; o mesmo dado está na "Ver tabela";
//  - cores: azul e laranja (slots 1 e 2 da paleta validada) + cinza neutro; texto sempre em cores de texto.

export const fmtPct = (v: number | null) => (v === null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
export const fmtNum = (v: number | null, digits = 1) => (v === null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: digits }));

// ---------- dica flutuante ----------

interface Tip {
  x: number;
  y: number;
  title: string;
  lines: { key?: string; value: string; label: string }[];
}

function useTip() {
  const root = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const place = (clientX: number, clientY: number, content: Pick<Tip, 'title' | 'lines'>) => {
    const r = root.current?.getBoundingClientRect();
    if (!r) return;
    setTip({ x: Math.min(Math.max(clientX - r.left, 80), Math.max(r.width - 80, 80)), y: clientY - r.top, ...content });
  };

  const handlers = (content: Pick<Tip, 'title' | 'lines'>) => ({
    tabIndex: 0,
    onPointerMove: (e: React.PointerEvent) => place(e.clientX, e.clientY, content),
    onPointerLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      const b = e.currentTarget.getBoundingClientRect();
      place(b.left + b.width / 2, b.top, content);
    },
    onBlur: () => setTip(null),
  });

  const node = tip && (
    <div className="viz-tip" style={{ left: tip.x, top: tip.y }} role="status">
      <div className="viz-tip-title">{tip.title}</div>
      {tip.lines.map((l, i) => (
        <div key={i} className="viz-tip-line">
          {l.key && <span className="viz-key" style={{ background: l.key }} />}
          <strong>{l.value}</strong> <span>{l.label}</span>
        </div>
      ))}
    </div>
  );
  return { root, handlers, node };
}

// ---------- barras horizontais (uma série) ----------

export interface BarRow {
  label: string;
  value: number | null; // null = sem dado
  display: string; // texto na ponta da barra
  detail?: { value: string; label: string }[]; // linhas extras da dica
  sub?: string;
}

export function HBarChart({ rows, max = 100, empty = 'Sem dados ainda.' }: { rows: BarRow[]; max?: number; empty?: string }) {
  const { root, handlers, node } = useTip();
  if (rows.length === 0) return <p className="hint">{empty}</p>;
  const top = max > 0 ? max : 1;
  return (
    <div className="viz-wrap" ref={root}>
      <div className="hbars">
        {rows.map((r, i) => (
          <div
            key={i}
            className="hbar-row"
            {...handlers({
              title: r.label,
              lines: [{ key: 'var(--viz-1)', value: r.display, label: r.sub ?? '' }, ...(r.detail ?? []).map((d) => ({ ...d }))],
            })}
            aria-label={`${r.label}: ${r.display}${r.sub ? `, ${r.sub}` : ''}`}
          >
            <span className="hbar-label" title={r.label}>
              {r.label}
            </span>
            <span className="hbar-track">
              <span className="hbar-fill" style={{ width: `${r.value === null ? 0 : Math.max(0, Math.min(100, (r.value / top) * 100))}%` }} />
            </span>
            <span className="hbar-value">{r.display}</span>
          </div>
        ))}
      </div>
      {node}
    </div>
  );
}

// ---------- barras empilhadas (parte de um todo) ----------

export interface StackRow {
  label: string;
  total: number;
  segments: { name: string; value: number }[]; // mesma ordem/nomes em todas as linhas
}

const STACK_COLORS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-neutral)'];

export function StackedBars({ rows, empty = 'Sem dados ainda.' }: { rows: StackRow[]; empty?: string }) {
  const { root, handlers, node } = useTip();
  if (rows.length === 0) return <p className="hint">{empty}</p>;
  const names = rows[0].segments.map((s) => s.name);
  return (
    <div className="viz-wrap" ref={root}>
      <ul className="viz-legend" aria-label="Legenda">
        {names.map((n, i) => (
          <li key={n}>
            <span className="viz-key" style={{ background: STACK_COLORS[i] }} /> {n}
          </li>
        ))}
      </ul>
      <div className="hbars">
        {rows.map((r, i) => (
          <div key={i} className="hbar-row">
            <span className="hbar-label" title={r.label}>
              {r.label}
            </span>
            <span className="stack-track">
              {r.total === 0 ? (
                <span className="stack-empty" />
              ) : (
                r.segments.map((s, k) =>
                  s.value > 0 ? (
                    <span
                      key={s.name}
                      className="stack-seg"
                      style={{ flexGrow: s.value, background: STACK_COLORS[k] }}
                      {...handlers({
                        title: r.label,
                        lines: r.segments.map((x, j) => ({
                          key: STACK_COLORS[j],
                          value: String(x.value),
                          label: `${x.name} (${Math.round((x.value / r.total) * 100)}%)`,
                        })),
                      })}
                      aria-label={`${r.label}: ${s.value} ${s.name}`}
                    />
                  ) : null,
                )
              )}
            </span>
            <span className="hbar-value">
              {r.segments[0].value}/{r.total}
            </span>
          </div>
        ))}
      </div>
      {node}
    </div>
  );
}

// ---------- cartão do gráfico, com "Ver tabela" ----------

export function ChartCard({
  title,
  subtitle,
  table,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  table?: { head: string[]; rows: (string | number)[][] };
  children: ReactNode;
  wide?: boolean;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={wide ? 'panel viz viz-card viz-wide' : 'panel viz viz-card'}>
      <div className="viz-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="hint">{subtitle}</p>}
        </div>
        {table && table.rows.length > 0 && (
          <button type="button" className="secondary small" onClick={() => setAsTable((v) => !v)}>
            {asTable ? 'Ver gráfico' : 'Ver tabela'}
          </button>
        )}
      </div>
      {asTable && table ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {table.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
