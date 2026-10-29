import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import type { GameType, LevelConfigs } from '@playground/games';
import { ApiError, api } from '../../api';
import ActivityContent from '../../components/ActivityContent';
import { buildExtensions } from '../../editor/extensions';
import { NewGameModal } from '../../editor/GameModals';
import Toolbar from '../../editor/Toolbar';
import { ensureUniqueBlockIds, newBlockId } from '../../lib/blockId';
import { createTutorHandle, previewTutor } from '../../lib/tutor';
import type { ActivityFull, ActivitySummary, AiStatus, DocNode, SavedGame } from '../../types';
import PublishModal from './PublishModal';

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Erro inesperado.');

function insertGame(editor: Editor, gameType: GameType, config: unknown, levels?: LevelConfigs) {
  const { $from } = editor.state.selection;
  // o jogo entra logo depois do bloco (parágrafo, lista…) onde está o cursor
  const pos = $from.depth >= 1 ? $from.after(1) : $from.pos;
  editor
    .chain()
    .focus()
    .insertContentAt(pos, { type: 'gameBlock', attrs: { blockId: newBlockId(), gameType, config, levels: levels ?? null } })
    .run();
  // garante um parágrafo depois do último jogo para continuar escrevendo
  const last = editor.state.doc.lastChild;
  if (last && last.type.name !== 'paragraph') {
    editor.chain().insertContentAt(editor.state.doc.content.size, { type: 'paragraph' }).run();
  }
}

function EditorScreen({ initial }: { initial: ActivityFull }) {
  const [meta, setMeta] = useState<ActivitySummary>(initial);
  const [title, setTitle] = useState(initial.title);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [inserting, setInserting] = useState(false);
  const [library, setLibrary] = useState<SavedGame[] | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState<DocNode | null>(null);
  // tutor IA na pré-visualização (o instrutor testa as dicas; nada é gravado)
  const tutor = useMemo(() => createTutorHandle(), []);
  useEffect(() => {
    api<AiStatus>('/ai/status')
      .then((s) => tutor.set(s.tutor ? previewTutor(s.tutor) : null))
      .catch(() => tutor.set(null));
  }, [tutor]);

  const editor = useEditor({
    extensions: buildExtensions(),
    content: initial.content,
    onUpdate: () => setDirty(true),
  });

  const save = useCallback(async (): Promise<boolean> => {
    if (!editor) return false;
    if (!title.trim()) {
      setError('Informe o título da atividade.');
      return false;
    }
    setSaving(true);
    setError('');
    try {
      const content = ensureUniqueBlockIds(editor.getJSON() as DocNode);
      const r = await api<{ activity: ActivityFull }>(`/activities/${meta.id}`, {
        method: 'PATCH',
        body: { title: title.trim(), content },
      });
      setMeta(r.activity);
      setDirty(false);
      setSavedAt(new Date());
      return true;
    } catch (e) {
      setError(errMsg(e));
      return false;
    } finally {
      setSaving(false);
    }
  }, [editor, title, meta.id]);

  // Ctrl/Cmd+S salva (o handler lê sempre a versão mais recente de `save`)
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // avisa antes de fechar a aba com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (!editor) return <p className="hint">Carregando editor…</p>;

  const openPreview = () => setPreview(ensureUniqueBlockIds(editor.getJSON() as DocNode));

  const openPublish = async () => {
    if (dirty || title !== meta.title) {
      if (!(await save())) return;
    }
    setPublishing(true);
  };

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <input
            className="title-input"
            value={title}
            maxLength={120}
            aria-label="Título da atividade"
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
          />
          <p className="hint">
            {meta.status === 'PUBLISHED' ? (
              <>
                <span className="badge ok">Publicada</span> {meta.teams.map((t) => t.name).join(', ')}
              </>
            ) : (
              <span className="badge warn">Rascunho</span>
            )}{' '}
            {dirty ? 'Alterações não salvas' : savedAt ? `Salvo às ${savedAt.toLocaleTimeString('pt-BR', { timeStyle: 'short' })}` : ''}
          </p>
        </div>
        <div className="actions">
          <Link to="/instrutor/atividades" className="button-link secondary">
            ← Atividades
          </Link>
          {preview ? (
            <button type="button" className="secondary" onClick={() => setPreview(null)}>
              Voltar a editar
            </button>
          ) : (
            <button type="button" className="secondary" onClick={openPreview}>
              Visualizar como aluno
            </button>
          )}
          <button type="button" className="secondary" onClick={() => void save()} disabled={saving || (!dirty && title === meta.title)}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button type="button" onClick={() => void openPublish()} disabled={saving}>
            {meta.status === 'PUBLISHED' ? 'Turmas…' : 'Publicar…'}
          </button>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {meta.hasScores && (
        <p className="hint">Alguns alunos já jogaram: os jogos com notas gravadas não podem ser removidos nem alterados.</p>
      )}

      {preview && (
        <section className="panel">
          <p className="hint">Pré-visualização: os jogos funcionam, mas nada é gravado. O botão 💡 Pedir ajuda mostra o tutor IA como o aluno vê.</p>
          <ActivityContent content={preview} allowRestart tutor={tutor} />
        </section>
      )}

      <section className="panel editor-panel" hidden={preview !== null}>
        <Toolbar
          editor={editor}
          onInsertGame={() => {
            // carrega a biblioteca a cada abertura (pode ter mudado em outra aba)
            api<{ games: SavedGame[] }>('/games').then((r) => setLibrary(r.games)).catch(() => setLibrary([]));
            setInserting(true);
          }}
        />
        <EditorContent editor={editor} className="activity-body activity-edit" />
      </section>

      {inserting && library !== null && (
        <NewGameModal
          heading="Inserir jogo"
          saveLabel="Inserir na atividade"
          library={library ?? []}
          offerSave
          onClose={() => setInserting(false)}
          onLibrarySaved={(games) => setLibrary((l) => [...games, ...(l ?? [])])}
          onCreateAdaptive={(type, levels) => {
            insertGame(editor, type, levels.normal ?? Object.values(levels)[0], levels);
            setInserting(false);
          }}
          onCreate={(type, config, alsoSave) => {
            insertGame(editor, type, config);
            setInserting(false);
            // salvar na biblioteca é um extra: se falhar, o jogo já está na atividade
            if (alsoSave) void api('/games', { body: { gameType: type, config } }).catch(() => setError('O jogo foi inserido, mas não foi possível salvá-lo na biblioteca.'));
          }}
        />
      )}

      {publishing && (
        <PublishModal
          activity={meta}
          onClose={() => setPublishing(false)}
          onDone={(a) => {
            setMeta((m) => ({ ...m, ...a }));
            setPublishing(false);
          }}
        />
      )}
    </>
  );
}

export default function ActivityEditorPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState<ActivityFull | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setActivity(null);
    api<{ activity: ActivityFull }>(`/activities/${id}`)
      .then((r) => setActivity(r.activity))
      .catch((e) => setError(e instanceof ApiError && e.status === 404 ? 'Atividade não encontrada.' : errMsg(e)));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!activity) return <p className="hint">Carregando…</p>;
  return <EditorScreen key={activity.id} initial={activity} />;
}
