import { useEffect, useMemo, useState } from 'react';
import Game from './Game';
import { generateLayout, parseEntries } from '../lib/crossword';
import type { GameConfig } from '../config';
import type { EditorProps } from '../../types';

const EXAMPLE = `cachorro  Melhor amigo do homem
gato      Gosta de caçar ratos
morcego   Mamífero que voa
elefante  Tem tromba
canguru   Marsupial grande`;

const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const DEBOUNCE_MS = 400; // gerar o layout leva algumas centenas de ms: espera parar de digitar
const MIN_WORDS = 3;

// Texto editável de um jogo salvo: "resposta  dica", uma por linha
const toText = (c: GameConfig) => c.layout.words.map((w) => `${w.answer}  ${w.clue}`).join('\n');

type Generated = ReturnType<typeof generateLayout>;

export default function Editor({ initialConfig, onSave, onCancel, saveLabel = 'Salvar jogo' }: EditorProps<GameConfig>) {
  const [initialText] = useState(() => (initialConfig ? toText(initialConfig) : EXAMPLE));
  const [title, setTitle] = useState(initialConfig?.title ?? 'Animais');
  const [text, setText] = useState(initialText);
  const [debounced, setDebounced] = useState(initialText);
  const [seed, setSeed] = useState(newSeed);
  // Ao reabrir um jogo salvo, a grade só é refeita se o autor mexer nas palavras ou pedir "Gerar de novo"
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text]);
  const pending = text !== debounced;

  // erros por linha aparecem na hora; o layout usa o texto "assentado"
  const liveErrors = useMemo(() => parseEntries(text).errors, [text]);
  const parsed = useMemo(() => parseEntries(debounced), [debounced]);
  const { layout, unplaced } = useMemo<Generated>(
    () =>
      initialConfig && !touched
        ? { layout: initialConfig.layout, unplaced: [] }
        : generateLayout(parsed.entries, { seed }),
    [parsed, seed, initialConfig, touched],
  );

  const problem = useMemo(() => {
    if (parsed.errors.length > 0) return 'Corrija os erros indicados nas linhas.';
    if (parsed.entries.length < MIN_WORDS) return `Adicione pelo menos ${MIN_WORDS} palavras.`;
    if (unplaced.length > 0)
      return `Não encaixaram: ${unplaced.map((u) => u.answer).join(', ')}. Troque essas palavras ou clique em Gerar de novo.`;
    return null;
  }, [parsed, unplaced]);

  const canSave = !pending && problem === null;

  const config: GameConfig = useMemo(
    () => ({ title: title.trim() || 'Palavras cruzadas', layout }),
    [title, layout],
  );
  const previewKey = useMemo(() => JSON.stringify(config), [config]);

  return (
    <div className="editor">
      <h1>Gerador de palavras cruzadas</h1>

      <div className="editor-grid">
        <section className="editor-form">
          <label>
            Título
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label>
            Respostas e dicas (uma por linha: resposta, espaço e dica)
            <textarea
              rows={12}
              value={text}
              spellCheck={false}
              placeholder={'resposta  dica\ncachorro  Melhor amigo do homem'}
              onChange={(e) => {
                setText(e.target.value);
                setTouched(true);
              }}
            />
          </label>

          {liveErrors.length > 0 && (
            <ul className="editor-errors" aria-live="polite">
              {liveErrors.map((e, i) => (
                <li key={i}>{e.line > 0 ? `Linha ${e.line}: ${e.message}` : e.message}</li>
              ))}
            </ul>
          )}

          <div className="editor-row">
            <button type="button" className="editor-btn" onClick={() => {
                setSeed(newSeed());
                setTouched(true);
              }}>
              🔀 Gerar de novo
            </button>
            <button type="button" className="editor-btn editor-btn-light" onClick={() => {
                setText(EXAMPLE);
                setTouched(true);
              }}>
              Usar exemplo
            </button>
          </div>

          <p className="editor-note">
            {pending
              ? 'Atualizando…'
              : layout.words.length > 0
                ? `${layout.words.length} palavras · grade ${layout.rows} × ${layout.cols}`
                : 'Nenhuma palavra válida ainda.'}
          </p>
          <p className="editor-note">
            Cada resposta tem de 3 a 20 letras, sem espaço, hífen ou número (acentos são aceitos e
            aparecem sem acento na grade). A dica é o resto da linha. Máximo de 30 palavras.
          </p>
        </section>

        <section className="editor-side">
          {canSave ? (
            <Game key={previewKey} config={config} compact />
          ) : (
            <p className="editor-warn">
              {pending ? 'Atualizando…' : `${problem} O preview aparece quando tudo estiver certo.`}
            </p>
          )}
        </section>
      </div>

      <div className="editor-row editor-actions">
        <button type="button" className="editor-btn" disabled={!canSave} onClick={() => onSave(config)}>
          {saveLabel}
        </button>
        {onCancel && (
          <button type="button" className="editor-btn editor-btn-light" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
