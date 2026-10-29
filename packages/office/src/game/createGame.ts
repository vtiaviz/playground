import Phaser from 'phaser';
import { OfficeScene } from './OfficeScene';

/** Cria o jogo dentro de `parent`. Quem chama é dono do ciclo de vida: chame `game.destroy(true)` ao sair. */
export function createOfficeGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 600,
    backgroundColor: '#1b2230',
    pixelArt: true, // sem suavização: a arte fica nítida ao ampliar
    roundPixels: true,
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    // o teclado só é capturado enquanto o jogo tem foco, para não travar o resto da página
    input: { keyboard: { target: parent } },
    banner: false,
    scene: [OfficeScene],
  });
}

export function getOfficeScene(game: Phaser.Game): OfficeScene | null {
  const scene = game.scene.getScene('office');
  return scene && scene.sys.settings.status >= Phaser.Scenes.RUNNING ? (scene as OfficeScene) : null;
}
