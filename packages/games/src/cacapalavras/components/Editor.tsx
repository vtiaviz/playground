import { useMemo, useState } from 'react';
import Game from './Game';
import { generate } from '../lib/generator';
import type { GameConfig } from '../config';
import type { EditorProps } from '../../types';

const EXAMPLE = 'afiar\ncamas\ngás\nlaca\nlagoa\nleis\nmau\npalma\nsalto\nsega\nsoma\nóleos';
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20];

export default function Editor({ initialConfig, onSave, onCancel, saveLabel = 'Salvar jogo' }: EditorProps<GameConfig>) {
  const [title, setTitle] = useState(initialConfig?.title ?? 'Caça-palavras');
  const [text, setText] = useState(initialConfig ? initialConfig.words.join('\n') : EXAMPLE);
  const [size, setSize] = useState<number | 'auto'>(initialConfig?.size ?? 'auto');
  const [directions, setDirections] = useState<'simple' | 'all'>(initialConfig?.directions ?? 'all');
  const [seed, setSeed] = useState(() => initialConfig?.seed ?? newSeed());

  const words = useMemo(
    () => text.split(/[\n,;]+/).map((w) => w.trim()).filter(Boolean),
    [text],
  );

  const config: GameConfig = useMemo(
    () => ({
      title: title.trim() || 'Caça-palavras',
      words,
      seed,
      size: size === 'auto' ? undefined : size,
      directions,
    }),
    [title, words, seed, size, directions],
  );

  const puzzle = useMemo(() => generate(config), [config]);
  const previewKey = useMemo(() => JSON.stringify(config), [config]);

  const ignored = words.length - puzzle.placements.length - puzzle.skipped.length;
  const canSave = puzzle.placements.length > 0;

  return (
    <div className="editor">
      <h1>Gerador de caça-palavras</h1>

      <div className="editor-grid">
        <section className="editor-form">
          <label>
            Título
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label>
            Palavras (uma por linha, ou separadas por vírgula)
            <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} />
          </label>

          <div className="editor-row">
            <label>
              Tamanho da grade
              <select
                value={size}
                onChange={(e) => setSize(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
              >
                <option value="auto">Automático</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} × {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Direções
              <select value={directions} onChange={(e) => setDirections(e.target.value as 'simple' | 'all')}>
                <option value="all">Todas (8 direções)</option>
                <option value="simple">Só → e ↓ (mais fácil)</option>
              </select>
            </label>
          </div>

          <button type="button" onClick={() => setSeed(newSeed())}>
            🔀 Gerar de novo
          </button>

          {puzzle.skipped.length > 0 && (
            <p className="editor-warn">
              Não couberam na grade: {puzzle.skipped.join(', ')}. Aumente o tamanho ou use menos palavras.
            </p>
          )}
          {ignored > 0 && (
            <p className="editor-warn">
              {ignored} palavra(s) ignorada(s): precisam ter pelo menos 3 letras e não podem se repetir.
            </p>
          )}
          {words.length > 100 && <p className="editor-warn">Máximo de 100 palavras.</p>}
        </section>

        <section className="editor-side">
          {canSave ? (
            <Game key={previewKey} config={config} compact />
          ) : (
            <p className="editor-warn">Digite pelo menos uma palavra com 3 letras ou mais.</p>
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
