import { useMemo, useState } from 'react';
import Game from './Game';
import { validateWord } from '../lib/hangman';
import { WORD_COUNT } from '../lib/share';
import type { GameConfig } from '../config';
import type { EditorProps } from '../../types';

const EXAMPLE = ['tabela', 'chave primária', 'índice', 'consulta', 'gatilho'];

const countLetters = (base: string) => [...base].filter((c) => c >= 'A' && c <= 'Z').length;

export default function Editor({ initialConfig, onSave, onCancel, saveLabel = 'Salvar jogo' }: EditorProps<GameConfig>) {
  const [title, setTitle] = useState(initialConfig?.title ?? 'Banco de dados');
  const [theme, setTheme] = useState(initialConfig ? initialConfig.theme : 'Termos de SQL');
  const [words, setWords] = useState<string[]>(initialConfig?.words ?? EXAMPLE);

  const checks = useMemo(() => words.map((w) => validateWord(w)), [words]);

  // Uma mensagem de erro por palavra (null = válida)
  const errors = useMemo(
    () =>
      words.map((w, i) => {
        if (!w.trim()) return 'Digite a palavra.';
        const c = checks[i];
        if (!c.ok) return `Inválida: ${c.reason}.`;
        const dup = checks.findIndex((o, j) => j < i && o.ok && o.secret.base === c.secret.base);
        return dup >= 0 ? `Repetida (palavra ${dup + 1}).` : null;
      }),
    [words, checks],
  );
  const canSave = errors.every((e) => e === null);

  const config: GameConfig = useMemo(
    () => ({
      title: title.trim() || 'Jogo da forca',
      theme: theme.trim(),
      words: words.map((w) => w.trim()),
    }),
    [title, theme, words],
  );

  const previewKey = useMemo(() => JSON.stringify(config), [config]);

  const setWord = (i: number, value: string) =>
    setWords((ws) => ws.map((w, j) => (j === i ? value : w)));

  return (
    <div className="editor">
      <h1>Gerador de jogo da forca</h1>

      <div className="editor-grid">
        <section className="editor-form">
          <label>
            Título
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label>
            Tema (dica para o jogador, opcional)
            <input value={theme} maxLength={80} onChange={(e) => setTheme(e.target.value)} />
          </label>

          <div className="editor-words">
            {words.slice(0, WORD_COUNT).map((w, i) => {
              const c = checks[i];
              return (
                <div className="editor-word" key={i}>
                  <label>
                    Palavra {i + 1}
                    <input
                      value={w}
                      maxLength={40}
                      aria-invalid={errors[i] !== null}
                      aria-describedby={`word-msg-${i}`}
                      onChange={(e) => setWord(i, e.target.value)}
                    />
                  </label>
                  <small id={`word-msg-${i}`} className={errors[i] ? 'editor-error' : 'editor-ok'}>
                    {errors[i] ?? (c.ok ? `${countLetters(c.secret.base)} letras` : '')}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="editor-note">
            3 a 20 letras por palavra. Acentos, espaços e hífens são permitidos; digitar “a” acerta “á”.
          </p>
        </section>

        <section className="editor-side">
          {canSave ? (
            <Game key={previewKey} config={config} compact />
          ) : (
            <p className="editor-warn">Corrija as palavras indicadas para ver o jogo e salvar.</p>
          )}
        </section>
      </div>

      <div className="editor-row editor-actions">
        <button type="button" disabled={!canSave} onClick={() => onSave(config)}>
          {saveLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
