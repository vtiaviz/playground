import ShadowHost from '../shared/ShadowHost';
import type { EditorProps, GameModule, PlayerProps } from '../types';
import Editor from './components/Editor';
import Game from './components/Game';
import crosswordCss from './components/crossword.css?inline';
import editorCss from './components/Editor.css?inline';
import { maxScore, summarize, validateConfig, type GameConfig } from './config';

const PLAYER_CSS = crosswordCss;
const EDITOR_CSS = PLAYER_CSS + editorCss;

function Player({ config, onComplete, onStart, onFocusChange, allowRestart, compact = true }: PlayerProps<GameConfig>) {
  return (
    <ShadowHost css={PLAYER_CSS}>
      <Game config={config} onComplete={onComplete} onStart={onStart} onFocusChange={onFocusChange} allowRestart={allowRestart} compact={compact} />
    </ShadowHost>
  );
}

// O editor mostra o preview do jogo, então carrega o CSS dos dois
function GameEditor(props: EditorProps<GameConfig>) {
  return (
    <ShadowHost css={EDITOR_CSS}>
      <Editor {...props} />
    </ShadowHost>
  );
}

export const cruzadas: GameModule<GameConfig> = {
  type: 'CRUZADAS',
  label: 'Palavras cruzadas',
  description: 'Monte a grade a partir de respostas e dicas.',
  Player,
  Editor: GameEditor,
  validateConfig,
  maxScore,
  summarize,
};
