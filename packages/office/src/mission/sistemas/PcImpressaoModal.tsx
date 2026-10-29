import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { COPIES, parseCopies, tryPrint, type PrinterState } from '../impressao';
import { useFullscreen } from '../useFullscreen';
import { today } from './Desktops';
import { AppIcon, SearchIcon, SpeakerIcon, WifiIcon, Win10Logo } from './icones';
import './sistemas.css';

// Fase 4, missão 2: o PC da Sala de Impressão (Windows 10). A janela das impressoras mostra a impressora nova off-line
// (ou pronta, depois de ligar os cabos); o documento "Reunião" abre num editor de texto parecido com o Word, onde
// Arquivo → Imprimir mostra a pré-visualização, o campo Cópias e o botão Imprimir.

/** Tamanho em que a tela é desenhada (o monitor escala para caber). */
const SCREEN = { w: 960, h: 600 };
/** Quanto demora cada cópia saindo da impressora. */
const PAGE_MS = 450;
/** Dois cliques em menos tempo que isso = clique duplo (funciona também no toque). */
const DOUBLE_MS = 500;
const CLOCK = '09:12';
const PRINTER_NAME = 'Impressora da Sala de Impressão';

export interface PcImpressaoModalProps {
  state: PrinterState;
  onChange: (state: PrinterState) => void;
  /** `true` = as 10 cópias foram impressas. */
  onClose: (printed: boolean) => void;
}

type View = 'doc' | 'backstage' | 'print';

function WordIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 2h9l3 3v13H6Z" fill="#fff" stroke="#8796a6" strokeWidth="0.6" />
      <path d="M9 8h7M9 10.5h7M9 13h7M9 15.5h5" stroke="#9db7e0" strokeWidth="0.9" />
      <rect x="1.5" y="5" width="9" height="10" rx="1" fill="#2b579a" />
      <path d="M3 7.5l1.3 5 1.7-4 1.7 4 1.3-5" stroke="#fff" strokeWidth="1" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function PrinterIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 2h10v4H5Z" fill="none" stroke={color} strokeWidth="1.3" />
      <rect x="2" y="6" width="16" height="8" rx="1.5" fill="none" stroke={color} strokeWidth="1.3" />
      <path d="M5 11h10v7H5Z" fill="#fff" stroke={color} strokeWidth="1.3" />
      <path d="M7 14h6M7 16h4" stroke={color} strokeWidth="1" />
    </svg>
  );
}

function Status({ online }: { online: boolean }) {
  return online ? (
    <span className="os-prn-status is-ok">● Pronta (on-line)</span>
  ) : (
    <span className="os-prn-status is-off">● Off-line</span>
  );
}

/** O documento "Reunião": a página no editor e, menor, na pré-visualização. */
function Page({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? 'os-word-page is-small' : 'os-word-page'}>
      <h3>Reunião com os clientes</h3>
      <p className="os-word-sub">Pauta da vídeo chamada · hoje, 10h · Sala de Reuniões</p>
      <ol>
        <li>Apresentação da equipe</li>
        <li>Resultados do trimestre</li>
        <li>Novo projeto: sistema de pedidos on-line</li>
        <li>Perguntas dos clientes</li>
        <li>Próximos passos e prazos</li>
      </ol>
      <p>
        <strong>Participantes:</strong> Diretoria, Comercial e TI.
      </p>
      <p>
        <strong>Importante:</strong> levar uma cópia impressa para cada participante.
      </p>
    </div>
  );
}

function Window({
  title,
  className,
  front,
  onFront,
  onClose,
  children,
}: {
  title: ReactNode;
  className: string;
  front: boolean;
  onFront: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`os-win ${className}${front ? ' is-front' : ''}`} onClick={(e) => e.stopPropagation()} onPointerDown={onFront}>
      <div className="os-win-bar">
        <span className="os-win-title">{title}</span>
        <span className="os-spacer" />
        <span className="os-win-ctl">—</span>
        <span className="os-win-ctl">☐</span>
        <button type="button" className="os-win-ctl is-close" aria-label="Fechar" onClick={onClose}>
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

/** O PC da Sala de Impressão: ver a impressora off-line, abrir o documento e imprimir as 10 cópias. */
export default function PcImpressaoModal({ state, onChange, onClose }: PcImpressaoModalProps) {
  const [statusOpen, setStatusOpen] = useState(true);
  const [word, setWord] = useState(false);
  /** Qual janela está na frente. */
  const [front, setFront] = useState<'word' | 'status'>('status');
  const [view, setView] = useState<View>('doc');
  const [copies, setCopies] = useState('1');
  const [selected, setSelected] = useState(false);
  const [printing, setPrinting] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(() =>
    state.printed
      ? { text: 'As 10 cópias já foram impressas: é só pegar na impressora.', ok: true }
      : state.on
        ? { text: 'A impressora está on-line de novo! Agora abra o documento Reunião e imprima.', ok: true }
        : null,
  );
  const [tip, setTip] = useState(false);
  const [scale, setScale] = useState(0.8);
  const modalRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const lastClick = useRef(0);
  const timers = useRef<number[]>([]);
  const { fullscreen, toggle, exit } = useFullscreen(modalRef);
  const busy = printing > 0;
  const done = state.printed;

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const list = timers.current;
    return () => {
      document.body.style.overflow = overflow;
      list.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  // a tela de 960 × 600 cabe no espaço que sobra
  useLayoutEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const fit = () => setScale(Math.max(0.2, Math.min((el.clientWidth - 40) / SCREEN.w, (el.clientHeight - 40) / SCREEN.h, 1.4)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const close = () => {
    if (busy) return;
    exit();
    onClose(state.printed);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const openDoc = () => {
    setWord(true);
    setFront('word');
    setView('doc');
    setSelected(false);
    if (!state.printed) setFeedback(null);
  };

  /** Clique no ícone do documento: o primeiro seleciona, o segundo (logo em seguida) abre. */
  const clickDoc = (e: MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (selected && now - lastClick.current < DOUBLE_MS) openDoc();
    else setSelected(true);
    lastClick.current = now;
  };

  const print = () => {
    if (busy) return;
    const r = tryPrint(state, parseCopies(copies));
    if (!r.ok) {
      setFeedback({ text: r.reason, ok: false });
      return;
    }
    setFeedback(null);
    for (let k = 1; k <= COPIES; k++) timers.current.push(window.setTimeout(() => setPrinting(k), (k - 1) * PAGE_MS));
    timers.current.push(
      window.setTimeout(
        () => {
          setPrinting(0);
          onChange(r.state);
          setFeedback({
            text: `Pronto: ${COPIES} cópias do documento Reunião impressas! Pegue na impressora e leve para o chefe.`,
            ok: true,
          });
        },
        COPIES * PAGE_MS + 400,
      ),
    );
  };

  const online = state.on;

  return createPortal(
    <div
      ref={modalRef}
      className={fullscreen ? 'office-os-modal is-fullscreen' : 'office-os-modal'}
      role="dialog"
      aria-modal="true"
      aria-label="Computador da Sala de Impressão (Windows 10)"
    >
      <div className="office-os-box">
        <header className="office-os-head">
          <strong>
            🖥️ PC da Sala de Impressão · <span className="office-os-name">Windows 10</span>
          </strong>
          <span className="office-spacer" />
          <button type="button" className="office-os-btn" onClick={() => setTip((t) => !t)} aria-pressed={tip}>
            💡 Dica
          </button>
          <button type="button" className="office-os-btn" onClick={toggle} aria-pressed={fullscreen}>
            {fullscreen ? '🗗 Sair da tela cheia' : '⛶ Tela cheia'}
          </button>
          <button
            type="button"
            className={done ? 'office-os-btn office-primary' : 'office-os-btn'}
            disabled={busy}
            onClick={close}
            autoFocus={done}
          >
            {done ? 'Voltar ao escritório ▶' : 'Sair (Esc)'}
          </button>
        </header>
        <p className="office-os-tip">
          {tip ? (
            <>
              <strong>Como imprimir:</strong> clique duas vezes no ícone <em>Reunião</em> da área de trabalho para abrir no Word. Depois,{' '}
              <strong>Arquivo → Imprimir</strong>: confira a pré-visualização, mude <strong>Cópias</strong> para {COPIES} e clique em{' '}
              <strong>Imprimir</strong>. A impressora precisa estar <strong>on-line</strong>.
            </>
          ) : (
            `O chefe precisa de ${COPIES} cópias impressas do documento Reunião, que está na área de trabalho.`
          )}
        </p>
        <div className="office-os-fit" ref={fitRef}>
          <div className="office-os-monitor" style={{ width: SCREEN.w * scale + 28, height: SCREEN.h * scale + 28 }}>
            <div className="office-os-glass" style={{ width: SCREEN.w * scale, height: SCREEN.h * scale }}>
              <div className="office-os-scaler" style={{ width: SCREEN.w, height: SCREEN.h, transform: `scale(${scale})` }}>
                <div className="os-screen os-w10" onClick={() => setSelected(false)}>
                  <div className="os-w10-beam" />
                  <div className="os-icons">
                    <span className="os-desk-icon">
                      <AppIcon kind="trash" size={40} />
                      <span>Lixeira</span>
                    </span>
                    <span className="os-desk-icon">
                      <AppIcon kind="computer" size={40} />
                      <span>Este Computador</span>
                    </span>
                    <button
                      type="button"
                      className={selected ? 'os-desk-icon os-doc-icon is-selected' : 'os-desk-icon os-doc-icon'}
                      onClick={clickDoc}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openDoc();
                      }}
                      title="Clique duas vezes para abrir"
                    >
                      <WordIcon />
                      <span>Reunião</span>
                    </button>
                  </div>

                  {word && (
                    <Window
                      className="os-word"
                      front={front === 'word'}
                      onFront={() => setFront('word')}
                      title={
                        <>
                          <WordIcon size={16} /> Reunião - Word
                        </>
                      }
                      onClose={() => !busy && setWord(false)}
                    >
                      {view === 'doc' ? (
                        <>
                          <div className="os-word-tabs" role="menubar">
                            <button type="button" className="os-word-file" onClick={() => setView('backstage')}>
                              Arquivo
                            </button>
                            {['Página Inicial', 'Inserir', 'Design', 'Layout', 'Referências', 'Revisão', 'Exibir'].map((t, i) => (
                              <span key={t} className={i === 0 ? 'os-word-tab is-on' : 'os-word-tab'}>
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="os-word-ribbon" aria-hidden="true">
                            <span className="os-word-tool is-big">📋 Colar</span>
                            <span className="os-word-sep" />
                            <span className="os-word-tool is-field">Calibri</span>
                            <span className="os-word-tool is-field is-num">11</span>
                            <span className="os-word-tool">
                              <b>N</b>
                            </span>
                            <span className="os-word-tool">
                              <i>I</i>
                            </span>
                            <span className="os-word-tool">
                              <u>S</u>
                            </span>
                            <span className="os-word-sep" />
                            <span className="os-word-tool">≡</span>
                            <span className="os-word-tool">☰</span>
                            <span className="os-word-sep" />
                            <span className="os-word-style">Normal</span>
                            <span className="os-word-style">Título 1</span>
                            <span className="os-word-style">Título 2</span>
                          </div>
                          <div className="os-word-body">
                            <Page />
                          </div>
                          <div className="os-word-status">Página 1 de 1 · 62 palavras · Português (Brasil)</div>
                        </>
                      ) : (
                        <div className="os-word-backstage">
                          <nav className="os-word-nav" aria-label="Arquivo">
                            <button type="button" className="os-word-back" aria-label="Voltar ao documento" onClick={() => setView('doc')}>
                              ←
                            </button>
                            {['Início', 'Novo', 'Abrir', 'Informações', 'Salvar', 'Salvar como'].map((t) => (
                              <span key={t} className="os-word-nav-item">
                                {t}
                              </span>
                            ))}
                            <button
                              type="button"
                              className={view === 'print' ? 'os-word-nav-item is-on' : 'os-word-nav-item'}
                              onClick={() => setView('print')}
                            >
                              Imprimir
                            </button>
                            {['Compartilhar', 'Exportar', 'Fechar'].map((t) => (
                              <span key={t} className="os-word-nav-item">
                                {t}
                              </span>
                            ))}
                          </nav>
                          {view === 'print' ? (
                            <div className="os-prn">
                              <div className="os-prn-opts">
                                <h2>Imprimir</h2>
                                <div className="os-prn-go">
                                  <button type="button" className="os-prn-btn" onClick={print} disabled={busy || done}>
                                    <PrinterIcon size={34} color="#2b579a" />
                                    Imprimir
                                  </button>
                                  <label className="os-prn-copies">
                                    Cópias:
                                    <input
                                      type="number"
                                      min={1}
                                      max={999}
                                      value={copies}
                                      disabled={busy || done}
                                      onChange={(e) => setCopies(e.target.value)}
                                      aria-label="Cópias"
                                    />
                                  </label>
                                </div>
                                <h4>Impressora</h4>
                                <div className="os-prn-box">
                                  <PrinterIcon size={26} color="#444" />
                                  <span>
                                    <strong>{PRINTER_NAME}</strong>
                                    <Status online={online} />
                                  </span>
                                </div>
                                <h4>Configurações</h4>
                                {[
                                  ['Imprimir Todas as Páginas', 'O documento inteiro'],
                                  ['Agrupado', '1,2,3  1,2,3  1,2,3'],
                                  ['Orientação Retrato', ''],
                                  ['A4', '21 cm x 29,7 cm'],
                                  ['Margens Normais', 'Esquerda: 3 cm  Direita: 2 cm'],
                                ].map(([a, b]) => (
                                  <div key={a} className="os-prn-box is-setting">
                                    <span>
                                      <strong>{a}</strong>
                                      {b && <small>{b}</small>}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="os-prn-preview" aria-label="Pré-visualização da impressão">
                                <Page small />
                                <span className="os-prn-pages">◀ 1 de 1 ▶</span>
                              </div>
                            </div>
                          ) : (
                            <div className="os-word-info">
                              <h2>Informações</h2>
                              <p>Reunião.docx · Área de Trabalho</p>
                              <p className="os-word-hint">Escolha uma opção no menu à esquerda.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Window>
                  )}

                  {statusOpen && (
                    <Window
                      className="os-prn-win"
                      front={front === 'status'}
                      onFront={() => setFront('status')}
                      title={
                        <>
                          <PrinterIcon size={14} /> Configurações · Impressoras e scanners
                        </>
                      }
                      onClose={() => setStatusOpen(false)}
                    >
                      <div className="os-prn-win-body">
                        <h2>Impressoras e scanners</h2>
                        <div className={online ? 'os-prn-item is-ok' : 'os-prn-item is-off'}>
                          <PrinterIcon size={34} color="#333" />
                          <span>
                            <strong>{PRINTER_NAME}</strong>
                            <Status online={online} />
                          </span>
                        </div>
                        <div className="os-prn-item is-dim">
                          <AppIcon kind="doc" size={30} />
                          <span>
                            <strong>Microsoft Print to PDF</strong>
                            <small>Salva em arquivo PDF</small>
                          </span>
                        </div>
                        <p className="os-prn-help">
                          {online
                            ? 'A impressora está conectada à rede e pronta para imprimir.'
                            : 'O computador não encontra a impressora. Verifique se ela está ligada e conectada à rede.'}
                        </p>
                      </div>
                    </Window>
                  )}

                  {busy && (
                    <div className="os-prn-job" role="status">
                      <PrinterIcon size={28} color="#2b579a" />
                      <span>
                        <strong>Imprimindo Reunião.docx…</strong>
                        <small>
                          Cópia {printing} de {COPIES}
                        </small>
                        <span className="os-prn-bar">
                          <span style={{ width: `${(printing / COPIES) * 100}%` }} />
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="os-w10-taskbar">
                    <span className="os-w10-start">
                      <Win10Logo size={17} />
                    </span>
                    <span className="os-w10-search">
                      <SearchIcon /> Digite aqui para pesquisar
                    </span>
                    <span className="os-w10-pin">
                      <AppIcon kind="folder" size={24} />
                    </span>
                    {word && (
                      <span className="os-w10-pin is-open">
                        <WordIcon size={24} />
                      </span>
                    )}
                    <span className="os-spacer" />
                    <span className="os-w10-tray">
                      <button
                        type="button"
                        className={online ? 'os-tray-prn is-ok' : 'os-tray-prn is-off'}
                        aria-label="Impressoras"
                        title={online ? `${PRINTER_NAME}: pronta` : `${PRINTER_NAME}: off-line`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusOpen(true);
                          setFront('status');
                        }}
                      >
                        <PrinterIcon size={16} />
                      </button>
                      ˄ <WifiIcon /> <SpeakerIcon /> POR
                      <span className="os-clock2">
                        {CLOCK}
                        <small>{today()}</small>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <span className="office-os-led is-on" title="Luz de energia" />
          </div>
        </div>
        <p
          className={feedback ? (feedback.ok ? 'office-os-feedback is-ok' : 'office-os-feedback is-warn') : 'office-os-feedback'}
          role="status"
        >
          {feedback?.text ?? ' '}
        </p>
      </div>
    </div>,
    document.body,
  );
}
