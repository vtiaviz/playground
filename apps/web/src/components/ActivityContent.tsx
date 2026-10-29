import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { GameResult } from '@playground/games';
import { buildExtensions } from '../editor/extensions';
import type { GameBlockOptions } from '../editor/GameBlock';
import type { BlockStore } from '../lib/blockStore';
import type { TutorHandle } from '../lib/tutor';
import type { DocNode } from '../types';

interface Props {
  content: DocNode;
  allowRestart?: boolean;
  onGameComplete?: (blockId: string, result: GameResult) => void;
  onGameStart?: (blockId: string) => void;
  getCompleted?: GameBlockOptions['getCompleted'];
  blockStore?: BlockStore;
  tutor?: TutorHandle; // botão "Pedir ajuda" do tutor IA em cada jogo
}

// Mostra uma atividade em modo leitura (texto + jogos jogáveis).
// Usado na pré-visualização do editor e, na Fase 4, na tela do aluno.
export default function ActivityContent({ content, allowRestart = false, onGameComplete, onGameStart, getCompleted, blockStore, tutor }: Props) {
  // os callbacks são lidos no momento do evento (a extensão é criada uma única vez)
  const cb = useRef(onGameComplete);
  cb.current = onGameComplete;
  const sb = useRef(onGameStart);
  sb.current = onGameStart;
  const gc = useRef(getCompleted);
  gc.current = getCompleted;

  const editor = useEditor({
    extensions: buildExtensions({
      allowRestart,
      onGameComplete: (id, r) => cb.current?.(id, r),
      onGameStart: (id) => sb.current?.(id),
      getCompleted: (id) => gc.current?.(id),
      blockStore,
      tutor,
    }, true),
    content,
    editable: false,
  });

  // só recarrega quando o documento realmente muda (não recria os jogos à toa)
  const shown = useRef(content);
  useEffect(() => {
    if (editor && shown.current !== content) {
      shown.current = content;
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

  return <EditorContent editor={editor} className="activity-body" />;
}
