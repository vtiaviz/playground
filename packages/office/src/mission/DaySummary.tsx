import { createPortal } from 'react-dom';
import { AtlasSprite } from './Dialogs';

/** Uma mudança de XP no dia: missão concluída (+) ou bronca (−). */
export interface XpEntry {
  mission: string;
  title: string;
  xp: number;
  note?: string;
}

export interface DaySummaryData {
  /** XP final do dia. */
  total: number;
  /** Tudo o que aconteceu, na ordem. */
  entries: XpEntry[];
}

export interface DaySummaryProps extends DaySummaryData {
  /** Qual dia terminou: 1 (fase 1, padrão), 2, 3 ou 4. */
  day?: 1 | 2 | 3 | 4;
  /** XP com que o dia começou (no 2º dia, o que veio do 1º): o resumo mostra o ganho do dia e o total. */
  startXp?: number;
  onRestart: () => void;
  onClose: () => void;
  /** Começa o dia seguinte. Sem ele, o botão não aparece. */
  onNextDay?: () => void;
}

/** Agrupa as mudanças de XP por missão, na ordem em que as missões aconteceram. */
export function summarize(entries: XpEntry[]) {
  const rows: { mission: string; title: string; gained: number; lost: number; notes: string[] }[] = [];
  for (const e of entries) {
    let row = rows.find((r) => r.mission === e.mission);
    if (!row) {
      row = { mission: e.mission, title: e.title, gained: 0, lost: 0, notes: [] };
      rows.push(row);
    }
    if (e.xp >= 0) row.gained += e.xp;
    else {
      row.lost += -e.xp;
      if (e.note) row.notes.push(e.note);
    }
  }
  const penalties = entries.filter((e) => e.xp < 0).length;
  const stars = penalties === 0 ? 3 : penalties <= 2 ? 2 : 1;
  return { rows, penalties, stars };
}

/** Fim de uma fase: resumo do dia de estágio, com o XP de cada missão. */
export default function DaySummary({ day = 1, startXp = 0, total, entries, onRestart, onClose, onNextDay }: DaySummaryProps) {
  const { rows, penalties, stars } = summarize(entries);
  const today = total - startXp;
  const ordinal = ['primeiro', 'segundo', 'terceiro', 'quarto'][day - 1];
  return createPortal(
    <div className="office-summary-modal" role="dialog" aria-modal="true" aria-label={`Resumo do ${ordinal} dia`}>
      <div className="office-summary">
        <header className="office-summary-head">
          <AtlasSprite frame="viva-b" scale={2.5} />
          <div>
            <p className="office-summary-kicker">Fase {day} concluída!</p>
            <h2>Fim do {day}º dia de estágio</h2>
            <p className="office-summary-stars" aria-label={`${stars} de 3 estrelas`}>
              {'★'.repeat(stars)}
              <span>{'★'.repeat(3 - stars)}</span>
            </p>
          </div>
        </header>
        <table className="office-summary-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Missão</th>
              <th>Ganhou</th>
              <th>Perdeu</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.mission}>
                <td>{i + 1}</td>
                <td>
                  {r.title}
                  {r.notes.map((n, k) => (
                    <small key={k}>⚠ {n}</small>
                  ))}
                </td>
                <td className="is-gain">+{r.gained}</td>
                <td className={r.lost ? 'is-loss' : ''}>{r.lost ? `−${r.lost}` : '0'}</td>
                <td>
                  <strong>{r.gained - r.lost}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {startXp > 0 ? (
          <p className="office-summary-total">
            Hoje: <strong>{today >= 0 ? `+${today}` : `−${-today}`} XP</strong> · ⭐ Total acumulado: <strong>{total} XP</strong>
          </p>
        ) : (
          <p className="office-summary-total">
            ⭐ Total do dia: <strong>{total} XP</strong>
          </p>
        )}
        <p className="office-summary-note">
          {penalties === 0
            ? 'Dia perfeito: nenhuma bronca! O chefe já está esperando você amanhã.'
            : `Você levou ${penalties} ${penalties === 1 ? 'bronca' : 'broncas'} hoje. Amanhã dá para fazer ainda melhor!`}
        </p>
        <div className="office-summary-actions">
          <button type="button" onClick={onRestart}>
            ↺ Jogar o {day === 1 ? 'dia' : `${day}º dia`} de novo
          </button>
          <button type="button" className={onNextDay ? undefined : 'office-primary'} autoFocus={!onNextDay} onClick={onClose}>
            Continuar explorando
          </button>
          {onNextDay && (
            <button type="button" className="office-primary" autoFocus onClick={onNextDay}>
              Começar o {day + 1}º dia ▶
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
