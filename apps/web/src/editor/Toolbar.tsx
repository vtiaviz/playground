import { useState } from 'react';
import type { Editor } from '@tiptap/react';

interface Props {
  editor: Editor;
  onInsertGame: () => void;
}

type Panel = null | 'link' | 'image';

export default function Toolbar({ editor, onInsertGame }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [urlError, setUrlError] = useState('');

  const level = ([1, 2, 3, 4] as const).find((l) => editor.isActive('heading', { level: l }));
  const blockValue = level ? String(level) : 'p';

  const openPanel = (p: Exclude<Panel, null>) => {
    setUrlError('');
    setAlt('');
    setUrl(p === 'link' ? ((editor.getAttributes('link').href as string | undefined) ?? '') : '');
    setPanel(p);
  };

  const validUrl = (raw: string, mailto: boolean) => {
    try {
      const u = new URL(raw.trim());
      return u.protocol === 'http:' || u.protocol === 'https:' || (mailto && u.protocol === 'mailto:');
    } catch {
      return false;
    }
  };

  const apply = () => {
    if (panel === 'link') {
      if (url.trim() === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else if (!validUrl(url, true)) {
        setUrlError('Use um endereço completo, começando com https://');
        return;
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
      }
    } else if (panel === 'image') {
      if (!validUrl(url, false)) {
        setUrlError('Use o endereço completo da imagem, começando com https://');
        return;
      }
      editor.chain().focus().setImage({ src: url.trim(), alt: alt.trim() || undefined }).run();
    }
    setPanel(null);
  };

  const btn = (label: string, title: string, active: boolean, onClick: () => void, extra?: string) => (
    <button
      type="button"
      className={`tb-btn${active ? ' active' : ''}${extra ? ` ${extra}` : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      // mousedown não rouba o foco do texto selecionado
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatação">
      <select
        aria-label="Tipo de bloco"
        value={blockValue}
        onChange={(e) => {
          const v = e.target.value;
          const chain = editor.chain().focus();
          if (v === 'p') chain.setParagraph().run();
          else chain.setHeading({ level: Number(v) as 1 | 2 | 3 | 4 }).run();
        }}
      >
        <option value="p">Parágrafo</option>
        <option value="1">Título 1</option>
        <option value="2">Título 2</option>
        <option value="3">Título 3</option>
        <option value="4">Título 4</option>
      </select>

      {btn('N', 'Negrito', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'tb-bold')}
      {btn('I', 'Itálico', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'tb-italic')}
      {btn('</>', 'Código em linha', editor.isActive('code'), () => editor.chain().focus().toggleCode().run())}
      <span className="tb-sep" />
      {btn('• Lista', 'Lista com marcadores', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
      {btn('1. Lista', 'Lista numerada', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
      <span className="tb-sep" />
      {btn('🔗 Link', 'Link externo', editor.isActive('link'), () => openPanel('link'))}
      {btn('🖼 Imagem', 'Imagem por endereço (URL)', false, () => openPanel('image'))}
      <span className="tb-sep" />
      {btn('🎮 Inserir jogo', 'Inserir jogo', false, onInsertGame, 'tb-game')}
      <span className="tb-sep" />
      {btn('↶', 'Desfazer', false, () => editor.chain().focus().undo().run())}
      {btn('↷', 'Refazer', false, () => editor.chain().focus().redo().run())}

      {panel && (
        <form
          className="tb-panel"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={panel === 'link' ? 'https://kahoot.it/…  (vazio remove o link)' : 'https://…/imagem.png'}
            aria-label={panel === 'link' ? 'Endereço do link' : 'Endereço da imagem'}
          />
          {panel === 'image' && (
            <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Descrição da imagem (opcional)" aria-label="Descrição da imagem" />
          )}
          <button type="submit">{panel === 'link' ? 'Aplicar' : 'Inserir'}</button>
          <button type="button" className="secondary" onClick={() => setPanel(null)}>
            Cancelar
          </button>
          {urlError && <span className="error">{urlError}</span>}
        </form>
      )}
    </div>
  );
}
