import { useMemo, useState } from 'react';
import Game from './Game';
import { formatSentences, parseDecoys, parseSentences } from '../lib/sentences';
import { blankCount, maxScore, type GameConfig } from '../config';
import type { EditorProps } from '../../types';

const EXAMPLE = `O [mouse] é o dispositivo usado para mover o ponteiro na tela e clicar.
> Junto com o teclado, é um dos principais dispositivos de entrada.

A memória [RAM] guarda os dados dos programas abertos e é apagada quando o computador desliga.
> Por isso é preciso salvar o trabalho: o que fica só na RAM se perde ao desligar.

O [processador] é o "cérebro" do computador: ele executa as instruções dos programas.
> Também é chamado de CPU (Unidade Central de Processamento).

A [impressora] é um dispositivo de saída que passa documentos para o papel.
> Dispositivos de saída mostram ou entregam o resultado do processamento: monitor, caixa de som, impressora.

O programa que gerencia o computador e permite usar os outros programas é o sistema [operacional].
> Windows, Linux e macOS são exemplos de sistemas operacionais.

O atalho Ctrl + C serve para [copiar] e o Ctrl + V serve para [colar].
> Para mover em vez de copiar, use Ctrl + X (recortar) e depois Ctrl + V.

O [navegador] é o programa usado para acessar sites, como o Chrome ou o Firefox.
> O endereço do site é digitado na barra de endereços do navegador.

O [pendrive] é um dispositivo portátil que guarda arquivos e se conecta pela porta USB.
> É prático para levar arquivos, mas pode se perder: tenha sempre uma cópia em outro lugar.

Os arquivos excluídos vão para a [lixeira] e podem ser restaurados até que ela seja esvaziada.
> No Windows, Shift + Delete exclui o arquivo direto, sem passar pela lixeira.

Uma senha [forte] mistura letras maiúsculas, minúsculas, números e símbolos.
> Evite datas de nascimento e sequências como 123456: são as primeiras que os golpistas tentam.`;

const EXAMPLE_DECOYS = 'monitor, scanner, recortar, fraca';

export default function Editor({ initialConfig, onSave, onCancel, saveLabel = 'Salvar jogo' }: EditorProps<GameConfig>) {
  const [title, setTitle] = useState(initialConfig?.title ?? 'Informática básica');
  const [text, setText] = useState(() => (initialConfig ? formatSentences(initialConfig.sentences) : EXAMPLE));
  const [decoyText, setDecoyText] = useState(() => (initialConfig ? initialConfig.decoys.join(', ') : EXAMPLE_DECOYS));

  const { sentences, errors } = useMemo(() => parseSentences(text), [text]);
  const decoyResult = useMemo(() => parseDecoys(decoyText, sentences), [decoyText, sentences]);
  const allErrors = [...errors.map((e) => e.message), ...decoyResult.errors];
  const canSave = allErrors.length === 0 && sentences.length > 0;

  const config: GameConfig = useMemo(
    () => ({ title: title.trim() || 'Complete as Frases', sentences, decoys: decoyResult.decoys }),
    [title, sentences, decoyResult.decoys],
  );
  const previewKey = useMemo(() => JSON.stringify(config), [config]);
  const blanks = blankCount(config);

  return (
    <div className="editor">
      <h1>Gerador de Complete as Frases</h1>

      <div className="editor-grid">
        <section className="editor-form">
          <label>
            Título
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label>
            Frases (palavra certa entre colchetes)
            <textarea
              rows={16}
              value={text}
              spellCheck={false}
              placeholder={'A preferência, no trânsito, é de quem vem do lado [direito].\n> Explicação opcional'}
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          <label>
            Palavras extras para confundir (separadas por vírgula)
            <textarea rows={2} value={decoyText} spellCheck={false} placeholder="esquerdo, frente" onChange={(e) => setDecoyText(e.target.value)} />
          </label>

          {allErrors.length > 0 && (
            <ul className="editor-errors" aria-live="polite">
              {allErrors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}

          <div className="editor-row">
            <button
              type="button"
              className="editor-btn editor-btn-light"
              onClick={() => {
                setText(EXAMPLE);
                setDecoyText(EXAMPLE_DECOYS);
              }}
            >
              Usar exemplo
            </button>
          </div>

          <p className="editor-note">
            {sentences.length > 0
              ? `${sentences.length} ${sentences.length === 1 ? 'frase' : 'frases'} · ${blanks} ${blanks === 1 ? 'lacuna' : 'lacunas'} · ${decoyResult.decoys.length} ${decoyResult.decoys.length === 1 ? 'palavra extra' : 'palavras extras'} · vale ${maxScore(config)} pontos`
              : 'Nenhuma frase válida ainda.'}
          </p>

          <details className="editor-help">
            <summary>Como escrever as frases</summary>
            <ul>
              <li>
                Uma frase por linha, com a palavra certa entre colchetes: <code>do lado [direito].</code> Uma frase pode ter até 5
                lacunas.
              </li>
              <li>
                Explicação (opcional): uma linha começando com <code>&gt;</code> logo abaixo da frase. O aluno vê depois de enviar.
              </li>
              <li>Numeração no início da linha (<code>1 -</code>, <code>1.</code>) é ignorada; linhas em branco também.</li>
              <li>As palavras extras não podem ser iguais a nenhuma resposta. Maiúsculas e minúsculas não contam na correção.</li>
              <li>Cada lacuna certa vale 10 pontos. Máximo de 30 frases e 20 palavras extras.</li>
            </ul>
          </details>
        </section>

        <section className="editor-side">
          {canSave ? (
            <Game key={previewKey} config={config} compact />
          ) : (
            <p className="editor-warn">
              {allErrors.length > 0
                ? 'Corrija os erros indicados para ver o preview e salvar.'
                : 'Digite as frases no formato ao lado para ver o preview e salvar.'}
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
