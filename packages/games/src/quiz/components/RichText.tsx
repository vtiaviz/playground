import { splitBlocks, splitInlineCode } from '../lib/quiz';

// Texto com `trechos em crases` e blocos de código (linhas ```). Montado por React (nunca HTML cru),
// então qualquer "<tag>" digitada pelo autor aparece como texto, sem executar nada.
export default function RichText({ text }: { text: string }) {
  return (
    <>
      {splitBlocks(text).map((block, i) =>
        block.kind === 'code' ? (
          <pre className="qz-pre" key={i}>
            <code>{block.text}</code>
          </pre>
        ) : (
          <span key={i}>
            {splitInlineCode(block.text).map((s, j) =>
              s.code ? <code key={j}>{s.text}</code> : <span key={j}>{s.text}</span>,
            )}
          </span>
        ),
      )}
    </>
  );
}
