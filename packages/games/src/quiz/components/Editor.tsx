import { useMemo, useState } from 'react';
import Game from './Game';
import { formatTime } from '../lib/format';
import { formatQuiz, parseQuiz } from '../lib/quiz';
import { referenceSeconds } from '../lib/scoring';
import type { GameConfig } from '../config';
import type { EditorProps } from '../../types';

const EXAMPLE = `1 - Qual a principal função do HD?
a) Armazenar informações
b) Criar novas paginas web
c) Ocupar espaço vazio no gabinete
d) É uma peça em desuso
resposta: a

2 - Qual é a principal função do método \`Array.prototype.map()\` em JavaScript?
A) Filtrar elementos de um array com base em uma condição
B) Criar um novo array com os resultados da chamada de uma função para cada elemento
C) Adicionar um novo elemento ao final do array
D) Remover o primeiro elemento de um array
resposta: B

3 - O que será impresso pelo código abaixo?
\`\`\`js
const nums = [1, 2, 3].map((n) => {
  return n * 2;
});
console.log(nums);
\`\`\`
a) [1, 2, 3]
b) [2, 4, 6]
c) undefined
d) Um erro de sintaxe
resposta: b`;

export default function Editor({ initialConfig, onSave, onCancel, saveLabel = 'Salvar jogo' }: EditorProps<GameConfig>) {
  const [title, setTitle] = useState(initialConfig?.title ?? 'Informática');
  const [text, setText] = useState(() => (initialConfig ? formatQuiz(initialConfig.questions) : EXAMPLE));

  // ler o texto é barato: erros e preview acompanham a digitação sem atraso
  const { questions, errors } = useMemo(() => parseQuiz(text), [text]);
  const canSave = errors.length === 0 && questions.length > 0;

  const config: GameConfig = useMemo(
    () => ({ title: title.trim() || 'Quiz', questions }),
    [title, questions],
  );
  const previewKey = useMemo(() => JSON.stringify(config), [config]);

  return (
    <div className="editor">
      <h1>Gerador de quiz</h1>

      <div className="editor-grid">
        <section className="editor-form">
          <label>
            Título
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label>
            Perguntas, alternativas e gabarito
            <textarea
              rows={18}
              value={text}
              spellCheck={false}
              placeholder={'1 - Qual a principal função do HD?\na) Armazenar informações\nb) Criar novas páginas web\nresposta: a'}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          {errors.length > 0 && (
            <ul className="editor-errors" aria-live="polite">
              {errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          )}

          <div className="editor-row">
            <button type="button" className="editor-btn editor-btn-light" onClick={() => setText(EXAMPLE)}>
              Usar exemplo
            </button>
          </div>

          <p className="editor-note">
            {questions.length > 0
              ? `${questions.length} ${questions.length === 1 ? 'pergunta' : 'perguntas'} · tempo de referência ${formatTime(referenceSeconds(questions))}`
              : 'Nenhuma pergunta válida ainda.'}
          </p>

          <details className="editor-help">
            <summary>Como escrever as perguntas</summary>
            <ul>
              <li>
                Cada pergunta começa com um número (<code>1 -</code>, <code>1.</code> ou <code>1)</code>);
                a numeração é refeita automaticamente. O enunciado pode ter várias linhas.
              </li>
              <li>
                Alternativas: <code>a)</code>, <code>b)</code>, ... (de 2 a 6), em ordem.
              </li>
              <li>
                Gabarito: uma linha <code>resposta: b</code> (também vale <code>gabarito: b</code>).
              </li>
              <li>
                Código: trechos entre crases (<code>`map()`</code>) ou um bloco entre linhas{' '}
                <code>```</code> no enunciado; dentro do bloco, nada é lido como alternativa.
              </li>
              <li>Máximo de 30 perguntas; enunciado até 800 caracteres e alternativa até 200.</li>
            </ul>
          </details>
        </section>

        <section className="editor-side">
          {canSave ? (
            <Game key={previewKey} config={config} compact />
          ) : (
            <p className="editor-warn">
              {errors.length > 0
                ? 'Corrija os erros indicados para ver o preview e salvar.'
                : 'Digite ou cole as perguntas no formato ao lado para ver o preview e salvar.'}
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
