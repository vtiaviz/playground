import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { GameFocus } from '@playground/games';
import { ApiError } from '../api';
import type { TutorAdapter, TutorTrigger, TutorTurn } from '../lib/tutor';

interface Props {
  tutor: TutorAdapter;
  blockId: string;
  gameType: string;
  config: unknown;
  gameLabel: string;
  focus: GameFocus | null; // null = nada em jogo agora (tela inicial, resultado…)
  // área do jogo: toque/clique aqui conta como "o aluno está mexendo" (zera o tempo parado)
  watchRef: RefObject<HTMLElement | null>;
}

interface Turn extends TutorTurn {
  shown: boolean; // o pedido "pediu ajuda" vai para o histórico, mas não aparece como balão
}

// Com vários jogos na página, só o último em que o aluno mexeu conta o tempo parado (um quiz
// largado pela metade não fica oferecendo ajuda enquanto o aluno joga a forca).
let activeBlock: string | null = null;

const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'O tutor não conseguiu responder agora. Tente de novo.');

// Botão "Pedir ajuda" + painel de conversa com o tutor IA, preso ao pé do jogo enquanto ele está na
// tela. Também oferece ajuda sozinho quando o aluno fica um tempo sem mexer na mesma pergunta.
export default function TutorDock({ tutor, blockId, gameType, config, gameLabel, focus, watchRef }: Props) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<{ trigger: TutorTrigger; message?: string } | null>(null);
  const [offer, setOffer] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // pergunta/palavra nova = conversa nova
  const itemKey = focus ? String(focus.item) : null;
  useEffect(() => {
    setOpen(false);
    setTurns([]);
    setError('');
    setRetry(null);
    setOffer(false);
    setDraft('');
  }, [itemKey]);

  // ---- tempo parado na mesma pergunta (só conta com a aba visível e o painel fechado) ----
  const idle = useRef(0);
  const offered = useRef(new Set<string>());
  const live = useRef({ itemKey, open, loading });
  live.current = { itemKey, open, loading };

  useEffect(() => {
    idle.current = 0;
  }, [itemKey, focus?.state]);

  useEffect(() => {
    const el = watchRef.current;
    const reset = () => {
      idle.current = 0;
    };
    const touch = () => {
      activeBlock = blockId;
      reset();
    };
    el?.addEventListener('pointerdown', touch, true);
    window.addEventListener('keydown', reset, true); // a forca escuta o teclado na janela inteira
    return () => {
      el?.removeEventListener('pointerdown', touch, true);
      window.removeEventListener('keydown', reset, true);
      if (activeBlock === blockId) activeBlock = null;
    };
  }, [watchRef, blockId]);

  useEffect(() => {
    if (tutor.idleSeconds <= 0) return;
    const t = window.setInterval(() => {
      const { itemKey: key, open: isOpen, loading: busy } = live.current;
      if (key === null || isOpen || busy || document.hidden || activeBlock !== blockId) return;
      idle.current += 1;
      if (idle.current >= tutor.idleSeconds && !offered.current.has(key)) {
        offered.current.add(key); // uma oferta por pergunta
        setOffer(true);
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [tutor.idleSeconds, blockId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, loading]);

  if (!focus) return null;

  const ask = async (trigger: TutorTrigger, message?: string) => {
    if (loading) return;
    setOpen(true);
    setOffer(false);
    setError('');
    setRetry(null);
    setLoading(true);
    const history: TutorTurn[] = turns.map(({ role, text }) => ({ role, text }));
    const asked: Turn =
      trigger === 'message' && message
        ? { role: 'student', text: message, shown: true }
        : {
            role: 'student',
            text: trigger === 'idle' ? '(aceitou a ajuda oferecida)' : turns.length ? '(pediu mais uma ajuda)' : '(pediu ajuda)',
            shown: false,
          };
    setTurns((t) => [...t, asked]);
    try {
      const r = await tutor.ask({ blockId, gameType, config, focus, trigger, message, history });
      setTurns((t) => [...t, { role: 'tutor', text: r.reply, shown: true }]);
    } catch (e) {
      setTurns((t) => t.filter((x) => x !== asked));
      setError(errText(e));
      setRetry({ trigger, message });
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void ask('message', text);
  };

  const hasReply = turns.some((t) => t.role === 'tutor');

  return (
    <div className="tutor-dock">
      {open && (
        <div className="tutor-panel" role="dialog" aria-label={`Tutor IA — ${gameLabel}`}>
          <div className="tutor-head">
            <strong>
              <span aria-hidden="true">🦉</span> Tutor
            </strong>
            <span className="hint">dicas para você pensar</span>
            <button type="button" className="tutor-close" aria-label="Fechar o tutor" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <div className="tutor-list" ref={listRef} aria-live="polite">
            {turns
              .filter((t) => t.shown)
              .map((t, i) => (
                <p key={i} className={t.role === 'tutor' ? 'tutor-msg' : 'tutor-msg me'}>
                  {t.text}
                </p>
              ))}
            {loading && <p className="tutor-msg typing">Pensando…</p>}
            {error && (
              <p className="tutor-error" role="alert">
                {error}{' '}
                {retry && (
                  <button type="button" className="secondary small" onClick={() => void ask(retry.trigger, retry.message)}>
                    Tentar de novo
                  </button>
                )}
              </p>
            )}
          </div>
          <form className="tutor-form" onSubmit={submit}>
            <input
              ref={inputRef}
              value={draft}
              maxLength={300}
              placeholder="Escreva sua dúvida…"
              aria-label="Sua dúvida para o tutor"
              disabled={loading}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="small" disabled={loading || !draft.trim()}>
              Enviar
            </button>
          </form>
          <div className="tutor-foot">
            {hasReply && (
              <button type="button" className="secondary small" disabled={loading} onClick={() => void ask('button')}>
                💡 Outra dica
              </button>
            )}
            <span className="hint">{tutor.note}</span>
          </div>
        </div>
      )}

      {offer && !open && (
        <div className="tutor-offer" role="status">
          <span>
            <span aria-hidden="true">🦉</span> Parece que essa está difícil. Quer uma dica?
          </span>
          <span className="actions">
            <button type="button" className="small" onClick={() => void ask('idle')}>
              Quero uma dica
            </button>
            <button type="button" className="secondary small" onClick={() => setOffer(false)}>
              Agora não
            </button>
          </span>
        </div>
      )}

      {!open && (
        <button
          type="button"
          className="tutor-btn"
          onClick={() => {
            if (hasReply || loading || error) setOpen(true);
            else void ask('button');
          }}
        >
          <span aria-hidden="true">💡</span> {hasReply ? 'Ver dicas' : 'Pedir ajuda'}
        </button>
      )}
    </div>
  );
}
