import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import atlas from '../assets/moveis.json';
import moveisUrl from '../assets/moveis.png';
import colegasUrl from '../assets/colegas.png';
import estagiarioUrl from '../assets/estagiario.png';

type Frame = { x: number; y: number; w: number; h: number };
const FRAMES = atlas.frames as Record<string, { frame: Frame }>;

/** Um quadro do atlas de móveis como imagem (retrato no diálogo). */
export function AtlasSprite({ frame, scale = 2 }: { frame: string; scale?: number }) {
  const f = FRAMES[frame].frame;
  const style: CSSProperties = {
    width: f.w * scale,
    height: f.h * scale,
    backgroundImage: `url(${moveisUrl})`,
    backgroundPosition: `-${f.x * scale}px -${f.y * scale}px`,
    backgroundSize: `${atlas.meta.size.w * scale}px ${atlas.meta.size.h * scale}px`,
    imageRendering: 'pixelated',
  };
  return <span className="office-sprite" style={style} aria-hidden="true" />;
}

// colegas.png: 6 quadros de 36×64 por linha; 4 linhas (direções) por colega. estagiario.png: só um (4 linhas)
const SHEET = { w: 216, h: 1792, frameW: 36, frameH: 64 };
const INTERN_SHEET_H = 256;

/** Rosto e tronco de um colega (de frente), para o diálogo. `look` −1 = o ESTAGIÁRIO. */
export function ColleaguePortrait({ look, scale = 1.5 }: { look: number; scale?: number }) {
  const top = 4;
  const h = 44;
  const intern = look < 0;
  if (intern) look = 0;
  const style: CSSProperties = {
    width: SHEET.frameW * scale,
    height: h * scale,
    backgroundImage: `url(${intern ? estagiarioUrl : colegasUrl})`,
    backgroundPosition: `-${2 * SHEET.frameW * scale}px -${(look * 4 * SHEET.frameH + top) * scale}px`,
    backgroundSize: `${SHEET.w * scale}px ${(intern ? INTERN_SHEET_H : SHEET.h) * scale}px`,
    imageRendering: 'pixelated',
  };
  return <span className="office-sprite" style={style} aria-hidden="true" />;
}

/** Texto que aparece letra a letra. Clicar em "Continuar" antes do fim mostra tudo de uma vez. */
function useTypewriter(text: string) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const id = window.setInterval(() => setShown((n) => (n >= text.length ? n : n + 1)), 22);
    return () => window.clearInterval(id);
  }, [text]);
  return { visible: text.slice(0, shown), done: shown >= text.length, finish: () => setShown(text.length) };
}

export interface DialogBoxProps {
  speaker: string;
  /** Quadro do atlas (ex.: `ceo-bravo-a`), `colega:<n>` para o colega n ou `estagiario`. */
  portrait: string;
  text: string;
  badge?: string;
  continueLabel?: string;
  onContinue: () => void;
}

/** Caixa de diálogo de RPG na parte de baixo do jogo. */
export function DialogBox({ speaker, portrait, text, badge, continueLabel = 'Continuar', onContinue }: DialogBoxProps) {
  const tw = useTypewriter(text);
  return (
    <div className="office-dialog" role="dialog" aria-label={`${speaker} diz`}>
      <div className="office-dialog-portrait">
        {portrait === 'estagiario' ? (
          <ColleaguePortrait look={-1} />
        ) : portrait.startsWith('colega:') ? (
          <ColleaguePortrait look={Number(portrait.slice(7))} />
        ) : (
          <AtlasSprite frame={portrait} scale={1.5} />
        )}
      </div>
      <div className="office-dialog-body">
        <strong className="office-dialog-name">{speaker}</strong>
        <p aria-live="polite">
          {tw.visible}
          <span className="office-sr">{tw.done ? '' : text.slice(tw.visible.length)}</span>
        </p>
        {badge && tw.done && <span className={badge.startsWith('−') ? 'office-xp-badge is-loss' : 'office-xp-badge'}>{badge}</span>}
      </div>
      <button type="button" autoFocus onClick={() => (tw.done ? onContinue() : tw.finish())}>
        {tw.done ? `${continueLabel} ▶` : 'Pular ▶▶'}
      </button>
    </div>
  );
}

export interface ChoiceBalloonProps {
  text: string;
  /** Posição da cabeça do personagem dentro do palco, em px. */
  at: { x: number; y: number };
  onChoose: (yes: boolean) => void;
}

/** Balão de pensamento em cima do ESTAGIÁRIO com Sim / Não (teclas S e N também valem). */
export function ChoiceBalloon({ text, at, onChoose }: ChoiceBalloonProps) {
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 's') onChoose(true);
    if (k === 'n') onChoose(false);
    if (k === 'arrowleft' || k === 'arrowright') {
      const buttons = Array.from(e.currentTarget.querySelectorAll('button'));
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(i + 1) % buttons.length]?.focus();
      e.preventDefault();
    }
  };
  return (
    <div className="office-balloon" style={{ left: at.x, top: at.y }} role="dialog" aria-label="Sua escolha" onKeyDown={onKeyDown}>
      <p>{text}</p>
      <div className="office-balloon-actions">
        <button type="button" autoFocus onClick={() => onChoose(true)}>
          <u>S</u>im
        </button>
        <button type="button" onClick={() => onChoose(false)}>
          <u>N</u>ão
        </button>
      </div>
    </div>
  );
}
