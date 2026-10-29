import ShadowHost from '../shared/ShadowHost';
import type { EditorProps, GameModule, PlayerProps } from '../types';
import Editor from './components/Editor';
import Game from './components/Game';
import gameCss from './components/Game.css?inline';
import hangmanCss from './components/hangman.css?inline';
import editorCss from './components/Editor.css?inline';
import { maxScore, summarize, validateConfig, type GameConfig } from './config';

const PLAYER_CSS = hangmanCss + gameCss;
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

export const forca: GameModule<GameConfig> = {
  type: 'FORCA',
  label: 'Jogo da forca',
  description: 'Cinco palavras com um tema de dica.',
  Player,
  Editor: GameEditor,
  validateConfig,
  maxScore,
  summarize,
};
