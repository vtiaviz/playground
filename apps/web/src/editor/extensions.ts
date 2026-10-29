import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { GameBlock, type GameBlockOptions } from './GameBlock';

// O servidor só aceita estes elementos (apps/api/src/lib/content.ts): manter as duas listas iguais.
// readOnly (aluno / pré-visualização): o bloco de jogo não pode ser selecionado nem arrastado pelo
// editor. Selecionado, o ProseMirror marca o bloco como draggable e o navegador passa a tratar o
// arrastar do caça-palavras como arrastar o bloco (a seleção da palavra é cancelada).
export function buildExtensions(opts: Partial<GameBlockOptions> = {}, readOnly = false) {
  const block = readOnly ? GameBlock.extend({ selectable: false, draggable: false }) : GameBlock;
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
    }),
    Image.configure({ inline: false, allowBase64: false }),
    block.configure({ allowRestart: false, ...opts }),
  ];
}
