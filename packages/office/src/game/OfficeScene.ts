import Phaser from 'phaser';
import colegasUrl from '../assets/colegas.png';
import estagiarioUrl from '../assets/estagiario.png';
import estagiarioMolhadoUrl from '../assets/estagiario-molhado.png';
import moveisJsonUrl from '../assets/moveis.json?url';
import moveisUrl from '../assets/moveis.png';
import tilesUrl from '../assets/tiles.png';
import {
  CEO_FRONT,
  CEO_TALK_ZONE,
  findPath,
  FURNITURE,
  MAIN_DOOR,
  MAP_SIZE,
  OBJECTS,
  PLAYER_BODY,
  ROOMS,
  roomAt,
  SOLID_TILES,
  SPAWN,
  TILE,
  TILE_DATA,
  tileIndex,
  type Rect,
  type Room,
  WALLS,
  WORKSTATIONS,
  MEETING_SPOTS,
  RH_HOME,
  RH_STATIONS,
  BOARD,
  BOARD_SPOT,
  COPA_CHAT,
  COPA_CORNER,
  isFree,
  EXIT_INSIDE,
  EXIT_OUTSIDE,
  CEO_SEAT,
  IT_SEAT,
  IT_WAIT,
  IT_TABLET_FLOOR,
  IT_TABLET_DESK,
  WATER_SPOT,
  PC_BOXES,
  MEETING_SEAT,
  URINAL_SPOTS,
  WALL_WORDS,
  besidePlayer,
  landingSpots,
  PICKUP_RADIUS,
  type Furniture,
  type SearchSpot,
} from './map';

export const OFFICE_EVENTS = {
  /** A sala atual mudou: `(room: Room | null)`; `null` = corredor. */
  room: 'office:room',
  /** Visão geral ligada/desligada: `(on: boolean)`. */
  overview: 'office:overview',
  /** Colisões visíveis ou não: `(on: boolean)`. */
  debug: 'office:debug',
  /** O ESTAGIÁRIO chegou perto de alguém que quer conversar: `(npc: 'ceo')`. */
  talk: 'office:talk',
  /** Missão 2: o ESTAGIÁRIO chegou na frente da estação de trabalho `(index: number)`. */
  pc: 'office:pc',
  /** Missão 3: o ESTAGIÁRIO chegou na frente da caixa `(index: number)` no RH. */
  box: 'office:box',
  /** Missão 6: o ESTAGIÁRIO chegou numa área marcada com `setSpots` (computador ou painel do alarme): `(id: string)`. */
  spot: 'office:spot',
  /** Fase 2, missão 3: o ESTAGIÁRIO chegou numa placa caída no chão e pegou: `(id: string)`. */
  pickup: 'office:pickup',
} as const;

type Point = { x: number; y: number };
const WALK_SPEED = 110;
/** Linha da responsável do RH no colegas.png. */
export const RH_LOOK = 5;
/** Linha do CEO andando no colegas.png. */
export const CEO_LOOK = 6;

/** Luz de um computador no escuro: tela acesa, só a luzinha piscando (suspenso) ou nada (desligado). */
export type ScreenLight = 'on' | 'sleep' | 'off';

/** frustrado = fumaça e "!"; feliz = comemorando; tranquilo = depois da comemoração. */
export type CeoMood = 'frustrado' | 'feliz' | 'tranquilo';

// Folha do ESTAGIÁRIO: 6 quadros por linha; linhas = baixo, esquerda, direita, cima.
const FRAME = { w: 36, h: 64, cols: 6 };
/** Linha (em px do quadro) onde ficam as solas dos sapatos. */
const FEET_Y = 60;
const SPEED = 150;
const RUN_SPEED = 240;
export type Facing = 'down' | 'left' | 'right' | 'up';
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };

const inside = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export class OfficeScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'run', Phaser.Input.Keyboard.Key>;
  private shadow!: Phaser.GameObjects.Ellipse;
  private facing: Facing = 'down';
  private room: Room | null | undefined = undefined;
  private debugLayer!: Phaser.GameObjects.Container;
  private bodyOutline!: Phaser.GameObjects.Rectangle;
  private roomLabel!: Phaser.GameObjects.Text;
  private overview = false;
  /** Direção vinda dos botões na tela (toque), somada ao teclado. */
  private touch = { x: 0, y: 0 };
  /** Parado enquanto há diálogo ou minijogo aberto. */
  private frozen = false;
  private ground!: Phaser.Tilemaps.TilemapLayer;
  private doorOpen = false;
  private ceo!: Phaser.GameObjects.Image;
  private ceoMood: CeoMood = 'frustrado';
  private ceoAlert!: Phaser.GameObjects.Image;
  private smoke!: Phaser.Time.TimerEvent;
  /** O CEO puxa conversa ao chegar perto; depois só de novo após sair da área e voltar. */
  private ceoTalkArmed = true;
  /** O React liga/desliga quando o CEO tem algo a dizer. */
  private ceoTalkOn = true;
  private pcZonesOn = false;
  private pcArmed = WORKSTATIONS.map(() => true);
  private pcDone = WORKSTATIONS.map(() => false);
  private chairs: Phaser.GameObjects.Image[] = [];
  private walkers: (Phaser.GameObjects.Sprite | null)[] = WORKSTATIONS.map(() => null);
  private angry: (Phaser.GameObjects.Image | null)[] = WORKSTATIONS.map(() => null);
  private signs: Phaser.GameObjects.Image[] = [];
  private glows: Phaser.GameObjects.Image[] = [];
  private rh!: Phaser.GameObjects.Sprite;
  private rhDesks: Phaser.GameObjects.Image[] = [];
  private rhBoxes: Phaser.GameObjects.Image[] = [];
  private boxZonesOn = false;
  private boxArmed = RH_STATIONS.map(() => true);
  private board!: Phaser.GameObjects.Image;
  private boardCards!: Phaser.GameObjects.Image;
  private walkerAlert: Phaser.GameObjects.Image | null = null;
  private tablet: Phaser.GameObjects.Image | null = null;
  private rhTablet: Phaser.GameObjects.Image | null = null;
  private rhAlert: Phaser.GameObjects.Image | null = null;
  private ceoWalker: Phaser.GameObjects.Sprite | null = null;
  private ceoWalkerAlert: Phaser.GameObjects.Image | null = null;
  private seated: Phaser.GameObjects.Image | null = null;
  private pcBoxes: { img: Phaser.GameObjects.Image; alert: Phaser.GameObjects.Image | null }[] = [];
  private night!: Phaser.GameObjects.Rectangle;
  private siren!: Phaser.GameObjects.Rectangle;
  private screenLights = new Map<string, Phaser.GameObjects.Image[]>();
  private spots: { id: string; zone: Rect }[] = [];
  private spotArmed: boolean[] = [];
  private doorLocked = false;
  /** Quantos colegas estão passando pela porta agora (ela fica aberta para eles). */
  private npcDoor = 0;
  private reception!: Phaser.GameObjects.Image;
  private itGuy!: Phaser.GameObjects.Image;
  private chat: { timer: Phaser.Time.TimerEvent; bubbles: Phaser.GameObjects.Image[] } | null = null;
  /** Fase 2: adesivos colados nos equipamentos (id do equipamento → imagem). */
  private stickers = new Map<string, Phaser.GameObjects.Image>();
  /** Fase 2: o encarregado da TI em pé, esperando a prancheta. */
  private itWalker: Phaser.GameObjects.Sprite | null = null;
  private itAlert: Phaser.GameObjects.Image | null = null;
  /** Fase 2, missão 4: tablet na mão do Marcos, Zzz, tablet (no chão ou na mesa) e as notas da musiquinha. */
  private itTablet: Phaser.GameObjects.Image | null = null;
  private itSleep: Phaser.Time.TimerEvent | null = null;
  private floorTablet: Phaser.GameObjects.Image | null = null;
  private notes: Phaser.Time.TimerEvent | null = null;
  private phoneIcon: Phaser.GameObjects.Image | null = null;
  /** Imagem de cada móvel (para o armário balançar na busca). */
  private furnitureImages = new Map<Furniture, Phaser.GameObjects.Image>();
  /** Lupas em cima dos móveis onde dá para procurar (fase 2, missão 3). */
  private magnifiers = new Map<string, Phaser.GameObjects.Image>();
  /** Placas caídas no chão, esperando o ESTAGIÁRIO pegar. */
  private floorBoards: { id: string; at: Point; board: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }[] = [];
  /** Peças deixadas no chão de propósito: só voltam a abrir depois que o ESTAGIÁRIO se afasta. */
  private pickupHold = new Set<string>();
  /** Travado, mas com animação própria (procurando no armário): o update não mexe no quadro. */
  private acting = false;
  /** Fase 3, missão 5: calça molhada (não deu tempo de chegar ao banheiro). */
  private wet = false;
  /** Fase 3, missão 5: balão com a gota em cima da cabeça (vontade de ir ao banheiro). */
  private urge: Phaser.GameObjects.Image | null = null;
  private puddle: Phaser.GameObjects.Image | null = null;

  constructor() {
    super('office');
  }

  preload() {
    this.load.image('tiles', tilesUrl);
    this.load.atlas('moveis', moveisUrl, moveisJsonUrl);
    this.load.spritesheet('estagiario', estagiarioUrl, { frameWidth: FRAME.w, frameHeight: FRAME.h });
    this.load.spritesheet('estagiario-molhado', estagiarioMolhadoUrl, { frameWidth: FRAME.w, frameHeight: FRAME.h });
    this.load.spritesheet('colegas', colegasUrl, { frameWidth: FRAME.w, frameHeight: FRAME.h });
  }

  create() {
    // piso e paredes: tilemap com colisão nos tiles sólidos
    const map = this.make.tilemap({ data: TILE_DATA, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    const ground = (map.createLayer(0, tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer).setDepth(-10);
    ground.setCollision(SOLID_TILES);
    this.ground = ground;
    this.drawWallEdges();
    this.physics.world.setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);

    // móveis: quem está mais embaixo na tela é desenhado na frente (profundidade = base do sprite)
    const typing: Phaser.GameObjects.Image[] = [];
    for (const f of FURNITURE) {
      const img = this.add.image(f.x, f.y, 'moveis', f.type).setOrigin(0);
      this.furnitureImages.set(f, img);
      img.setDepth(f.layer === 'floor' ? -5 : f.layer === 'wall' ? -4 : f.y + f.h);
      if (f.type.startsWith('colega-')) typing.push(img);
      if (f.label === 'CEO') this.ceo = img;
      const ws = WORKSTATIONS.find((w) => w.colleague.label === f.label);
      if (ws) this.chairs[ws.index] = img;
      if (f.label === BOARD.label) this.board = img;
      if (f.label === 'Recepcionista') this.reception = img;
      if (f.label === 'Colega da TI') this.itGuy = img;
      for (const st of RH_STATIONS) {
        if (st.desk.label === f.label) this.rhDesks[st.index] = img;
        if (st.box.label === f.label) this.rhBoxes[st.index] = img;
      }
    }
    // placa LIBERADO e brilho do monitor de cada estação (escondidos até a missão 2)
    for (const w of WORKSTATIONS) {
      const d = w.desk;
      this.glows[w.index] = this.add
        .image(d.x + d.w / 2, d.y + 2, 'moveis', 'tela-ligada')
        .setDepth(d.y + d.h + 1)
        .setVisible(false);
      this.signs[w.index] = this.add
        .image(d.x + d.w - 22, d.y + 30, 'moveis', 'placa-liberado')
        .setDepth(d.y + d.h + 2)
        .setVisible(false);
    }
    this.setupCeo();
    // colegas digitando: alterna entre os dois quadros de cada um
    this.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        const who = Phaser.Utils.Array.GetRandom(typing);
        if (!who) return;
        const name = String(who.frame.name);
        if (!name.startsWith('colega-')) return; // cadeira vazia (colega na reunião)
        who.setFrame(name.endsWith('-b') ? name.slice(0, -2) : `${name}-b`);
      },
    });

    // base dos móveis: corpos estáticos invisíveis
    const solids = OBJECTS.map((r) => {
      const zone = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      this.physics.add.existing(zone, true);
      return zone;
    });

    // ESTAGIÁRIO: a posição do sprite é a dos pés
    this.shadow = this.add.ellipse(SPAWN.x, SPAWN.y, 24, 8, 0x000000, 0.25);
    this.player = this.physics.add
      .sprite(SPAWN.x, SPAWN.y, 'estagiario', 0)
      .setOrigin(0.5, FEET_Y / FRAME.h);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_BODY.w, PLAYER_BODY.h);
    body.setOffset((FRAME.w - PLAYER_BODY.w) / 2, FEET_Y - PLAYER_BODY.h);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, solids);

    for (const look of new Set([...WORKSTATIONS.map((w) => w.look), RH_LOOK, CEO_LOOK])) {
      for (const facing of Object.keys(ROW) as Facing[]) {
        const first = (look * 4 + ROW[facing]) * FRAME.cols;
        this.anims.create({
          key: `colega${look}-${facing}`,
          frames: this.anims.generateFrameNumbers('colegas', { start: first, end: first + FRAME.cols - 1 }),
          frameRate: 9,
          repeat: -1,
        });
      }
    }
    for (const [prefix, sheet] of [
      ['walk', 'estagiario'],
      ['wet', 'estagiario-molhado'],
    ] as const) {
      for (const facing of Object.keys(ROW) as Facing[]) {
        this.anims.create({
          key: `${prefix}-${facing}`,
          frames: this.anims.generateFrameNumbers(sheet, {
            start: ROW[facing] * FRAME.cols,
            end: ROW[facing] * FRAME.cols + FRAME.cols - 1,
          }),
          frameRate: 10,
          repeat: -1,
        });
      }
    }

    // cards das frases caídos no chão (missão 4), escondidos até o esbarrão
    this.boardCards = this.add
      .image(BOARD.x + BOARD.w / 2, BOARD_SPOT.y - 14, 'moveis', 'cards-chao')
      .setDepth(-3)
      .setVisible(false);

    // responsável do RH: começa na Copa, tomando café
    this.rh = this.add
      .sprite(RH_HOME.x, RH_HOME.y, 'colegas', (RH_LOOK * 4 + ROW.up) * FRAME.cols + 2)
      .setOrigin(0.5, FEET_Y / FRAME.h)
      .setDepth(RH_HOME.y);

    // fim do expediente (missão 6): escurece tudo menos as telas ligadas; luz vermelha do alarme
    this.night = this.add
      .rectangle(0, 0, MAP_SIZE.width, MAP_SIZE.height, 0x0b1330, 1)
      .setOrigin(0)
      .setDepth(50000)
      .setAlpha(0);
    this.siren = this.add
      .rectangle(0, 0, MAP_SIZE.width, MAP_SIZE.height, 0xff1a1a, 1)
      .setOrigin(0)
      .setDepth(99990)
      .setAlpha(0);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, 0.15, 0.15);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
      run: K.SHIFT,
    }) as typeof this.keys;
    kb.on('keydown-M', () => this.setOverview(!this.overview));
    kb.on('keydown-C', () => this.setDebug(!this.debugLayer.visible));

    this.buildDebugLayer();

    // nome da sala que aparece ao entrar
    this.roomLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'Figtree, system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#012f67cc',
        padding: { x: 12, y: 6 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5, 0)
      .setDepth(100002)
      .setAlpha(0);
  }

  update() {
    this.updateDoor();
    if (this.urge) {
      // treme um pouquinho: o ESTAGIÁRIO está agoniado
      const jitter = Math.round(Math.sin(this.time.now / 45) * 1.5);
      this.urge.setPosition(this.player.x + 16 + jitter, this.player.y - FEET_Y - 10);
    }
    if (this.frozen) {
      this.player.setVelocity(0, 0);
      if (this.acting) return;
      this.player.anims.stop();
      this.player.setFrame(ROW[this.facing] * FRAME.cols + 2);
      return;
    }
    this.checkCeoTalk();
    if (this.checkPickups()) return;
    this.checkPcZones();
    this.checkBoxZones();
    this.checkSpots();
    const k = this.keys;
    let dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0) + this.touch.x;
    let dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0) + this.touch.y;
    dx = Phaser.Math.Clamp(dx, -1, 1);
    dy = Phaser.Math.Clamp(dy, -1, 1);

    const speed = k.run.isDown ? RUN_SPEED : SPEED;
    const v = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);
    this.player.setVelocity(v.x, v.y);

    if (dx === 0 && dy === 0) {
      this.player.anims.stop();
      this.player.setFrame(ROW[this.facing] * FRAME.cols + 2); // quadro neutro
    } else {
      // na diagonal vale a direção vertical, como nos RPGs clássicos
      this.facing = dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right';
      this.player.anims.play(this.walkAnim(this.facing), true);
      this.player.anims.timeScale = k.run.isDown ? 1.5 : 1;
    }
    // profundidade pelos pés: passa atrás dos móveis que estão mais abaixo
    this.player.setDepth(this.player.y);
    this.shadow.setPosition(this.player.x, this.player.y - 1).setDepth(this.player.y - 1);

    if (this.bodyOutline.visible) {
      const b = this.player.body as Phaser.Physics.Arcade.Body;
      this.bodyOutline.setPosition(b.x, b.y);
    }

    const room = roomAt(this.player.x, this.player.y);
    if (room !== this.room) {
      this.room = room;
      this.game.events.emit(OFFICE_EVENTS.room, room);
      if (room) this.flashRoomName(room.name);
    }
  }

  /** Liga/desliga a visão do escritório inteiro. */
  setOverview(on: boolean) {
    this.overview = on;
    const cam = this.cameras.main;
    if (on) {
      cam.stopFollow();
      cam.setZoom(Math.min(cam.width / MAP_SIZE.width, cam.height / MAP_SIZE.height));
      cam.removeBounds(); // com zoom menor que a tela, os limites prenderiam o mapa no canto
      cam.centerOn(MAP_SIZE.width / 2, MAP_SIZE.height / 2);
    } else {
      cam.setZoom(1);
      cam.setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);
      cam.startFollow(this.player, true, 0.15, 0.15);
    }
    this.game.events.emit(OFFICE_EVENTS.overview, on);
  }

  /** Mostra/esconde as caixas de colisão, as salas e o corpo do personagem. */
  setDebug(on: boolean) {
    this.debugLayer.setVisible(on);
    this.bodyOutline.setVisible(on);
    this.game.events.emit(OFFICE_EVENTS.debug, on);
  }

  setTouchDirection(x: number, y: number) {
    this.touch = { x, y };
  }

  /** Trava/destrava o ESTAGIÁRIO (diálogos e minijogos). Ao destravar, esquece teclas que ficaram presas. */
  setFrozen(on: boolean) {
    this.frozen = on;
    if (!on) this.input.keyboard?.resetKeys();
    this.touch = { x: 0, y: 0 };
  }

  /** Posição da cabeça do ESTAGIÁRIO na tela, de 0 a 1 (para o balão de escolha do React). */
  playerScreenPosition() {
    const cam = this.cameras.main;
    const view = cam.worldView;
    return {
      x: (this.player.x - view.x) / view.width,
      y: (this.player.y - FEET_Y - view.y) / view.height,
    };
  }

  /** Muda a expressão do CEO. `feliz` = comemora pulando, com confete. */
  setCeoMood(mood: CeoMood) {
    this.ceoMood = mood;
    this.tweens.killTweensOf(this.ceo);
    this.ceo.y = this.ceoBaseY;
    if (mood === 'frustrado') {
      this.smoke.paused = false;
      this.ceoAlert.setVisible(true);
      return;
    }
    this.smoke.paused = true;
    this.ceoAlert.setVisible(false);
    if (mood === 'tranquilo') this.ceo.setFrame('ceo-feliz-b');
    if (mood === 'feliz') {
      this.tweens.add({ targets: this.ceo, y: this.ceoBaseY - 10, duration: 180, yoyo: true, repeat: 7, ease: 'Quad.easeOut' });
      const confetti = this.add.particles(this.ceo.x + this.ceo.width / 2, this.ceo.y + 10, 'moveis', {
        frame: 'confete',
        speed: { min: 120, max: 260 },
        angle: { min: 200, max: 340 },
        gravityY: 400,
        lifespan: 1600,
        rotate: { min: 0, max: 360 },
        tint: [0xf54129, 0xffae00, 0x0190ff, 0xa0c330, 0xffffff],
        emitting: false,
      });
      confetti.setDepth(100000);
      confetti.explode(60);
      this.time.delayedCall(2200, () => confetti.destroy());
    }
  }

  private ceoBaseY = 0;

  private setupCeo() {
    this.ceoBaseY = this.ceo.y;
    // alterna o quadro: frustrado (mãos na cabeça) ou comemorando (braços para cima)
    this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        const prefix = this.ceoMood === 'feliz' ? 'ceo-feliz' : this.ceoMood === 'frustrado' ? 'ceo-bravo' : null;
        if (!prefix) return;
        const name = String(this.ceo.frame.name);
        this.ceo.setFrame(name === `${prefix}-a` ? `${prefix}-b` : `${prefix}-a`);
      },
    });
    // fumaça saindo da cabeça
    const headX = this.ceo.x + this.ceo.width / 2;
    const headY = this.ceo.y + 8;
    this.smoke = this.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        const puff = this.add
          .image(headX + Phaser.Math.Between(-10, 10), headY, 'moveis', 'fumaca')
          .setDepth(100000)
          .setScale(0.6)
          .setAlpha(0.9);
        this.tweens.add({
          targets: puff,
          y: headY - Phaser.Math.Between(40, 60),
          x: puff.x + Phaser.Math.Between(-14, 14),
          scale: 1.3,
          alpha: 0,
          duration: 1300,
          onComplete: () => puff.destroy(),
        });
      },
    });
    // "!" em cima do CEO enquanto a missão estiver disponível
    this.ceoAlert = this.add.image(headX + 22, this.ceo.y - 22, 'moveis', 'alerta').setDepth(100000);
    this.tweens.add({ targets: this.ceoAlert, y: this.ceoAlert.y - 6, duration: 500, yoyo: true, repeat: -1 });
  }

  private checkCeoTalk() {
    const inZone = inside(CEO_TALK_ZONE, this.player.x, this.player.y);
    if (!inZone) {
      this.ceoTalkArmed = true;
      return;
    }
    if (this.ceoTalkArmed && this.ceoTalkOn) {
      this.ceoTalkArmed = false;
      this.facing = 'up';
      this.game.events.emit(OFFICE_EVENTS.talk, 'ceo');
    }
  }

  /** Liga/desliga a conversa automática com o CEO ao chegar perto da mesa dele. */
  setCeoTalk(on: boolean) {
    this.ceoTalkOn = on;
    this.ceoTalkArmed = !inside(CEO_TALK_ZONE, this.player.x, this.player.y);
  }

  // ------------------------------------------------------------ missão 2

  /** Liga/desliga as áreas na frente das mesas que abrem o computador. */
  setPcZones(on: boolean) {
    this.pcZonesOn = on;
    this.pcArmed = WORKSTATIONS.map((w) => !inside(w.zone, this.player.x, this.player.y));
  }

  /** Estado visível da estação: monitor brilhando (ligado) e placa LIBERADO. */
  setPcState(index: number, state: { glow: boolean; sign: boolean }) {
    this.glows[index].setVisible(state.glow);
    this.signs[index].setVisible(state.sign);
    this.pcDone[index] = state.sign;
  }

  /** Todos levantam das mesas e vão para a Sala de Reuniões. */
  async startMeeting() {
    await Promise.all(
      WORKSTATIONS.map(async (w, i) => {
        await this.wait(i * 250);
        this.standUp(i);
        await this.walk(i, MEETING_SPOTS[i]);
        this.faceWalker(i, 'up');
      }),
    );
  }

  /** Voltam da reunião e sentam. `ok[i]` = o computador estava certo; senão o colega fica bravo. */
  async returnToDesks(ok: boolean[]) {
    await Promise.all(
      WORKSTATIONS.map(async (w, i) => {
        await this.wait(i * 300);
        await this.walk(i, w.seat);
        this.sitDown(i);
        this.setAngry(i, !ok[i]);
      }),
    );
  }

  /** O colega levanta bravo e vai até a mesa do CEO reclamar. */
  async complain(index: number) {
    this.standUp(index);
    this.setAngry(index, true);
    await this.walk(index, CEO_FRONT);
    this.faceWalker(index, 'up');
  }

  /** Depois da bronca, o colega volta para a mesa (ainda bravo até o computador ser arrumado). */
  async backToDesk(index: number, angry: boolean) {
    await this.walk(index, WORKSTATIONS[index].seat);
    this.sitDown(index);
    this.setAngry(index, angry);
  }

  /** Volta tudo da missão 2 ao começo (para tentar de novo). */
  resetMission2() {
    WORKSTATIONS.forEach((_, i) => {
      this.walkers[i]?.destroy();
      this.walkers[i] = null;
      this.setAngry(i, false);
      this.sitDown(i);
      this.setPcState(i, { glow: false, sign: false });
    });
  }

  // ------------------------------------------------------------ missão 3

  /** Liga/desliga as áreas na frente das caixas do RH. */
  setBoxZones(on: boolean) {
    this.boxZonesOn = on;
    this.boxArmed = RH_STATIONS.map((st) => !inside(st.zone, this.player.x, this.player.y));
  }

  /** Mesa montada (computador em cima) e caixa aberta (vazia). */
  setRhStation(index: number, state: { built: boolean; boxOpen: boolean }) {
    this.rhDesks[index].setFrame(state.built ? `mesa-montada-${index}` : 'mesa-vazia');
    this.rhBoxes[index].setFrame(state.boxOpen ? 'caixa-aberta' : 'caixa');
  }

  /** A responsável do RH anda até um ponto (desviando dos móveis). */
  async rhWalkTo(to: Point, facing: Facing = 'down') {
    await this.walkSprite(this.rh, RH_LOOK, to);
    this.rhFace(facing);
  }

  rhFace(facing: Facing) {
    this.rh.anims.stop();
    this.rh.setFrame((RH_LOOK * 4 + ROW[facing]) * FRAME.cols + 2);
  }

  private checkBoxZones() {
    if (!this.boxZonesOn) return;
    RH_STATIONS.forEach((st, i) => {
      const inZone = inside(st.zone, this.player.x, this.player.y);
      if (!inZone) {
        this.boxArmed[i] = true;
        return;
      }
      if (this.boxArmed[i]) {
        this.boxArmed[i] = false;
        this.facing = 'up';
        this.game.events.emit(OFFICE_EVENTS.box, i);
      }
    });
  }

  // ------------------------------------------------------------ missão 4

  /** O colega vai até o quadro branco, esbarra e os cards caem no chão. */
  async bumpBoard(index: number) {
    this.standUp(index);
    await this.walk(index, BOARD_SPOT);
    this.faceWalker(index, 'up');
    await this.wait(400);
    const x = this.board.x;
    this.tweens.add({ targets: this.board, x: x + 3, duration: 50, yoyo: true, repeat: 5, onComplete: () => this.board.setX(x) });
    this.cameras.main.shake(250, 0.004);
    this.board.setFrame('quadro-vazio');
    // os cards caem do quadro até o chão
    const floorY = this.boardCards.y;
    this.boardCards.setVisible(true).setY(this.board.y + 20).setAlpha(0.9);
    this.tweens.add({ targets: this.boardCards, y: floorY, alpha: 1, duration: 450, ease: 'Bounce.easeOut' });
    await this.wait(600);
    this.faceWalker(index, 'down');
    this.setWalkerAlert(index, true);
  }

  /** Cards de volta no quadro (frases completas). */
  restoreBoard() {
    this.board.setFrame('quadro-branco');
    this.boardCards.setVisible(false);
  }

  /** "!" em cima de um colega que está em pé (pedindo ajuda). */
  setWalkerAlert(index: number, on: boolean) {
    this.walkerAlert?.destroy();
    this.walkerAlert = null;
    const s = this.walkers[index];
    if (!on || !s) return;
    const icon = this.add.image(s.x + 14, s.y - FEET_Y - 8, 'moveis', 'alerta').setDepth(100000);
    this.tweens.add({ targets: icon, y: icon.y - 5, duration: 450, yoyo: true, repeat: -1 });
    this.walkerAlert = icon;
  }

  // ------------------------------------------------------------ missão 5

  /** A colega levanta e vai até a Copa conversar com a Rita (balõezinhos de conversa alternando). */
  async chatAtCopa(index: number) {
    this.standUp(index);
    await this.walk(index, COPA_CHAT);
    this.faceWalker(index, 'left');
    this.rhFace('right');
    const s = this.walkers[index];
    if (!s) return;
    const bubbles = [this.rh, s].map((who) =>
      this.add
        .image(who.x + 12, who.y - FEET_Y - 10, 'moveis', 'conversa')
        .setDepth(100000)
        .setVisible(false),
    );
    let turn = 0;
    const timer = this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        turn = 1 - turn;
        bubbles.forEach((b, k) => b.setVisible(k === turn));
      },
    });
    bubbles[0].setVisible(true);
    this.chat = { timer, bubbles };
  }

  /** Fim da conversa: a Rita volta para o café e a colega vai para o canto, com o tablet na mão. */
  async goToCorner(index: number) {
    this.stopChat();
    this.rhFace('up');
    await this.walk(index, COPA_CORNER);
    this.faceWalker(index, 'down');
    this.setTablet(index, true);
    this.setWalkerAlert(index, true);
  }

  /** Tablet na mão da colega (só de frente, parada). */
  setTablet(index: number, on: boolean) {
    this.tablet?.destroy();
    this.tablet = null;
    const s = this.walkers[index];
    if (!on || !s) return;
    this.tablet = this.add.image(s.x, s.y - 16, 'moveis', 'tablet-mao').setDepth(s.y + 1);
  }

  /** Câmera vai até um ponto (cena), sem seguir o ESTAGIÁRIO. Na visão geral não mexe. */
  lookAt(x: number, y: number) {
    if (this.overview) return Promise.resolve();
    const cam = this.cameras.main;
    cam.stopFollow();
    return new Promise<void>((resolve) => {
      cam.pan(x, y, 900, 'Sine.easeInOut', true, (_c: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) resolve();
      });
    });
  }

  /** Câmera volta para o ESTAGIÁRIO e continua seguindo. */
  lookAtPlayer() {
    if (this.overview) return Promise.resolve();
    const cam = this.cameras.main;
    return new Promise<void>((resolve) => {
      cam.pan(this.player.x, this.player.y, 700, 'Sine.easeInOut', true, (_c: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress < 1) return;
        cam.startFollow(this.player, true, 0.15, 0.15);
        resolve();
      });
    });
  }

  /** A colega corre até o ESTAGIÁRIO, os dois se abraçam e pulam comemorando, com corações. */
  async hug(index: number) {
    this.setTablet(index, false);
    this.setWalkerAlert(index, false);
    const p = { x: this.player.x, y: this.player.y };
    const side = isFree(p.x + 22, p.y) ? 1 : -1;
    await this.walk(index, { x: p.x + side * 22, y: p.y });
    const s = this.walkers[index];
    if (!s) return;
    s.setVisible(false);
    this.player.setVisible(false);
    this.shadow.setVisible(false);
    // a arte tem o ESTAGIÁRIO à esquerda e a colega à direita
    const hugImg = this.add
      .image(p.x + side * 11, p.y + 2, 'moveis', 'abraco-a')
      .setOrigin(0.5, 62 / 68)
      .setDepth(p.y + 1);
    // a câmera chega mais perto durante o abraço
    const cam = this.cameras.main;
    if (!this.overview) cam.zoomTo(1.8, 500, 'Sine.easeOut');
    const flip = this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => hugImg.setFrame(hugImg.frame.name === 'abraco-a' ? 'abraco-b' : 'abraco-a'),
    });
    const hearts = this.add.particles(hugImg.x, p.y - 60, 'moveis', {
      frame: 'coracao',
      x: { min: -20, max: 20 },
      speedX: { min: -30, max: 30 },
      speedY: { min: -70, max: -40 },
      lifespan: 1400,
      scale: { start: 1, end: 1.6 },
      alpha: { start: 1, end: 0 },
      frequency: 200,
    });
    hearts.setDepth(100000);
    const confetti = this.add.particles(hugImg.x, p.y - 50, 'moveis', {
      frame: 'confete',
      speed: { min: 120, max: 240 },
      angle: { min: 200, max: 340 },
      gravityY: 400,
      lifespan: 1500,
      rotate: { min: 0, max: 360 },
      tint: [0xf54129, 0xffae00, 0x0190ff, 0xa0c330, 0xffffff],
      emitting: false,
    });
    confetti.setDepth(100000);
    confetti.explode(30);
    await this.wait(3000);
    if (!this.overview) cam.zoomTo(1, 400, 'Sine.easeIn');
    flip.remove();
    hearts.stop();
    this.time.delayedCall(1500, () => {
      hearts.destroy();
      confetti.destroy();
    });
    hugImg.destroy();
    s.setVisible(true);
    this.faceWalker(index, side > 0 ? 'left' : 'right');
    this.player.setVisible(true);
    this.shadow.setVisible(true);
    this.facing = side > 0 ? 'right' : 'left';
  }

  // ------------------------------------------------------------ missão 6

  /** 0 = dia, 1 = fim de tarde (só as telas ligadas brilham), 2 = luzes apagadas. */
  setNight(level: 0 | 1 | 2) {
    this.tweens.killTweensOf(this.night);
    this.tweens.add({ targets: this.night, alpha: [0, 0.55, 0.75][level], duration: 1500 });
  }

  /** Luz da tela de um computador no escuro (por cima da noite, com mistura aditiva). */
  setScreenLight(id: string, monitor: Point, state: ScreenLight) {
    this.screenLights.get(id)?.forEach((o) => {
      this.tweens.killTweensOf(o);
      o.destroy();
    });
    this.screenLights.delete(id);
    if (state === 'off') return;
    if (state === 'sleep') {
      const led = this.add.image(monitor.x + 22, monitor.y + 16, 'moveis', 'led').setDepth(60001);
      this.tweens.add({ targets: led, alpha: 0.1, duration: 600, yoyo: true, repeat: -1 });
      this.screenLights.set(id, [led]);
      return;
    }
    const halo = this.add
      .image(monitor.x, monitor.y - 6, 'moveis', 'luz-tela')
      .setScale(1.6)
      .setDepth(60000)
      .setBlendMode(Phaser.BlendModes.ADD);
    const glow = this.add.image(monitor.x, monitor.y, 'moveis', 'tela-ligada').setDepth(60001).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: halo, alpha: 0.65, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.screenLights.set(id, [halo, glow]);
  }

  /** Áreas que avisam o React quando o ESTAGIÁRIO chega (computadores e painel do alarme). */
  setSpots(spots: { id: string; zone: Rect }[]) {
    this.spots = spots;
    this.spotArmed = spots.map((sp) => !inside(sp.zone, this.player.x, this.player.y));
  }

  private checkSpots() {
    this.spots.forEach((sp, i) => {
      const inZone = inside(sp.zone, this.player.x, this.player.y);
      if (!inZone) {
        this.spotArmed[i] = true;
        return;
      }
      if (this.spotArmed[i]) {
        this.spotArmed[i] = false;
        this.facing = 'up';
        this.game.events.emit(OFFICE_EVENTS.spot, sp.id);
      }
    });
  }

  /** Apaga as placas e o brilho da missão 2 (os computadores da Área de Trabalho estavam ligados). */
  clearMission2() {
    WORKSTATIONS.forEach((_, i) => this.setPcState(i, { glow: false, sign: false }));
  }

  /** Fim do expediente: os colegas, a Rita, a recepcionista e o colega da TI levantam e vão embora. */
  async everyoneLeaves(stations: number[]) {
    const leaving: Promise<void>[] = [];
    stations.forEach((i, k) => {
      leaving.push(
        (async () => {
          await this.wait(k * 900);
          this.setAngry(i, false);
          this.standUp(i);
          const s = this.walkers[i]!;
          this.walkers[i] = null; // não volta mais para a mesa hoje
          await this.leave(s, WORKSTATIONS[i].look);
        })(),
      );
    });
    leaving.push(
      (async () => {
        await this.wait(600);
        await this.leave(this.rh, RH_LOOK);
      })(),
    );
    for (const [img, look, delay] of [
      [this.reception, 1, 300],
      [this.itGuy, 0, 2000],
    ] as const) {
      leaving.push(
        (async () => {
          await this.wait(delay);
          // o Marcos pode já estar em pé (fase 3: comemorou a montagem dos computadores e ficou na Sala de TI)
          const standing = img === this.itGuy ? this.itWalker : null;
          if (standing) {
            this.setItAlert(false);
            this.itWalker = null;
            await this.leave(standing, look);
            return;
          }
          const s = this.add
            .sprite(img.x + img.width / 2, img.y + img.height - 4, 'colegas', look * 4 * FRAME.cols + 2)
            .setOrigin(0.5, FEET_Y / FRAME.h);
          img.setFrame('cadeira-vazia');
          await this.leave(s, look);
        })(),
      );
    }
    await Promise.all(leaving);
  }

  /** O CEO levanta e vai embora (depois de explicar a tarefa). */
  async ceoLeaves() {
    const walking = this.ceoWalker;
    if (walking) {
      // já está em pé (fase 3: ainda voltando da Sala de Reuniões)
      this.setCeoWalkerAlert(false);
      this.ceoWalker = null;
      walking.anims.stop();
      await this.leave(walking, CEO_LOOK);
      return;
    }
    this.setCeoMood('tranquilo');
    this.ceoAlert.setVisible(false);
    this.ceo.setFrame('cadeira-vazia').setY(this.ceoBaseY + 4);
    const s = this.add.sprite(CEO_SEAT.x, CEO_SEAT.y, 'colegas', CEO_LOOK * 4 * FRAME.cols + 2).setOrigin(0.5, FEET_Y / FRAME.h);
    await this.leave(s, CEO_LOOK);
  }

  /** Anda até a porta principal, sai para a calçada e some. */
  private async leave(s: Phaser.GameObjects.Sprite, look: number) {
    await this.walkSprite(s, look, EXIT_INSIDE);
    if (!s.active) return;
    this.npcDoor++;
    s.anims.play(`colega${look}-down`, true);
    await new Promise<void>((resolve) =>
      this.tweens.add({
        targets: s,
        y: EXIT_OUTSIDE.y,
        duration: ((EXIT_OUTSIDE.y - s.y) / WALK_SPEED) * 1000,
        onUpdate: () => s.setDepth(s.y),
        onComplete: () => resolve(),
      }),
    );
    this.npcDoor--;
    await new Promise<void>((resolve) => this.tweens.add({ targets: s, alpha: 0, duration: 500, onComplete: () => resolve() }));
    s.destroy();
  }

  /** Tranca (ou destranca) a porta principal: trancada, ela não abre nem com o ESTAGIÁRIO perto. */
  lockDoor(on: boolean) {
    this.doorLocked = on;
  }

  /** Luz vermelha piscando do alarme disparado. */
  setSiren(on: boolean) {
    this.tweens.killTweensOf(this.siren);
    this.siren.setAlpha(0);
    if (on) this.tweens.add({ targets: this.siren, alpha: 0.38, duration: 260, yoyo: true, repeat: -1 });
  }

  /** O ESTAGIÁRIO pula de alegria, com os braços para cima e confete. */
  async cheer() {
    const p = { x: this.player.x, y: this.player.y };
    this.player.setVisible(false);
    this.shadow.setVisible(false);
    const img = this.add
      .image(p.x, p.y + 2, 'moveis', this.wet ? 'viva-molhado-a' : 'viva-a')
      .setOrigin(0.5, 62 / 68)
      .setDepth(100000);
    const flip = this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        const name = String(img.frame.name);
        img.setFrame(`${name.slice(0, -1)}${name.endsWith('a') ? 'b' : 'a'}`);
      },
    });
    const cam = this.cameras.main;
    if (!this.overview) cam.zoomTo(1.6, 500, 'Sine.easeOut');
    const confetti = this.add.particles(p.x, p.y - 60, 'moveis', {
      frame: 'confete',
      speed: { min: 120, max: 260 },
      angle: { min: 200, max: 340 },
      gravityY: 400,
      lifespan: 1600,
      rotate: { min: 0, max: 360 },
      tint: [0xf54129, 0xffae00, 0x0190ff, 0xa0c330, 0xffffff],
      emitting: false,
    });
    confetti.setDepth(100001);
    for (let k = 0; k < 3; k++) {
      confetti.explode(40);
      await this.wait(900);
    }
    flip.remove();
    img.destroy();
    this.time.delayedCall(1600, () => confetti.destroy());
    if (!this.overview) cam.zoomTo(1, 400, 'Sine.easeIn');
    this.player.setVisible(true);
    this.shadow.setVisible(true);
    this.facing = 'down';
  }

  // ------------------------------------------------------------ fase 2

  /** Adesivo do tipo colado no equipamento (no ponto dele no mapa); `null` tira o adesivo. */
  setSticker(id: string, at: Point, type: string | null) {
    this.stickers.get(id)?.destroy();
    this.stickers.delete(id);
    if (!type) return;
    const img = this.add.image(at.x, at.y, 'moveis', `adesivo-${type}`).setDepth(at.y + 80).setScale(0.2);
    this.tweens.add({ targets: img, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.stickers.set(id, img);
  }

  /** Quadro branco com o caça-palavras escrito (fase 2, missão 2). */
  setBoardLetters(on: boolean) {
    this.board.setFrame(on ? 'quadro-letras' : 'quadro-branco');
  }

  /** Colegas levantam e vão até o quadro; ficam conversando (balõezinhos "…" alternando). */
  async crowdAtBoard(indices: number[], spots: Point[]) {
    await Promise.all(
      indices.map(async (i, k) => {
        await this.wait(k * 500);
        this.standUp(i);
        await this.walk(i, spots[k]);
        this.faceWalker(i, 'up');
      }),
    );
    const people = indices.map((i) => this.walkers[i]).filter((w): w is Phaser.GameObjects.Sprite => !!w);
    const bubbles = people.map((who) =>
      this.add
        .image(who.x + 12, who.y - FEET_Y - 10, 'moveis', 'conversa')
        .setDepth(100000)
        .setVisible(false),
    );
    let turn = 0;
    const timer = this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        turn = (turn + 1) % bubbles.length;
        bubbles.forEach((b, k) => b.setVisible(k === turn));
      },
    });
    bubbles[0]?.setVisible(true);
    this.chat = { timer, bubbles };
  }

  /** Para os balõezinhos de conversa (da Copa ou do quadro). */
  stopChat() {
    if (!this.chat) return;
    this.chat.timer.remove();
    this.chat.bubbles.forEach((b) => b.destroy());
    this.chat = null;
  }

  /** Um colega em pé vira para um lado. */
  turnWalker(index: number, facing: Facing) {
    this.faceWalker(index, facing);
  }

  /** Os colegas em pé pulam de alegria (junto com a comemoração do ESTAGIÁRIO). */
  crowdJump(indices: number[]) {
    indices.forEach((i, k) => {
      const s = this.walkers[i];
      if (!s) return;
      this.faceWalker(i, 'down');
      this.tweens.add({ targets: s, y: s.y - 12, duration: 180, yoyo: true, repeat: 7, delay: k * 90, ease: 'Sine.easeOut' });
    });
  }

  /** Vários colegas voltam para as mesas e sentam. */
  async crowdBack(indices: number[]) {
    await Promise.all(indices.map((i, k) => this.wait(k * 400).then(() => this.backToDesk(i, false))));
  }

  /** O encarregado da TI levanta e vai esperar em pé no canto da Sala de TI, com um "!". */
  async itGuyWaits() {
    if (this.itWalker) return;
    const s = this.add.sprite(IT_SEAT.x, IT_SEAT.y, 'colegas', 2).setOrigin(0.5, FEET_Y / FRAME.h);
    this.itGuy.setFrame('cadeira-vazia');
    this.itWalker = s;
    await this.walkSprite(s, 0, IT_WAIT);
    if (!s.active) return;
    s.setFrame(ROW.down * FRAME.cols + 2);
    this.setItAlert(true);
  }

  /** "!" em cima do encarregado da TI (esperando a prancheta). */
  setItAlert(on: boolean) {
    this.itAlert?.destroy();
    this.itAlert = null;
    const s = this.itWalker;
    if (!on || !s) return;
    const icon = this.add.image(s.x + 14, s.y - FEET_Y - 8, 'moveis', 'alerta').setDepth(100000);
    this.tweens.add({ targets: icon, y: icon.y - 5, duration: 450, yoyo: true, repeat: -1 });
    this.itAlert = icon;
  }

  /** O encarregado da TI vira para o ESTAGIÁRIO (para conferir a prancheta). */
  itGuyFacePlayer() {
    const s = this.itWalker;
    if (!s) return;
    const dx = this.player.x - s.x;
    const dy = this.player.y - s.y;
    const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    s.setFrame(ROW[facing] * FRAME.cols + 2);
  }

  /** O encarregado da TI volta para a cadeira dele e senta (para jogar no computador). */
  async itGuySitsDown() {
    this.setItAlert(false);
    const s = this.itWalker;
    if (!s) return;
    await this.walkSprite(s, 0, IT_SEAT);
    s.destroy();
    this.itWalker = null;
    this.itGuy.setFrame('colega-0');
  }

  /** Tablet na mão do encarregado sentado (jogando forca). */
  setItTablet(on: boolean) {
    this.itTablet?.destroy();
    this.itTablet = null;
    if (!on) return;
    const g = this.itGuy;
    this.itTablet = this.add.image(g.x + g.width / 2, g.y + 20, 'moveis', 'tablet-mao').setDepth(100000 - 1);
  }

  /** Zzz subindo de cima do encarregado (cochilando). */
  setItSleeping(on: boolean) {
    this.itSleep?.remove();
    this.itSleep = null;
    if (!on) return;
    const g = this.itGuy;
    const puff = () => {
      const z = this.add.image(g.x + g.width / 2 + 16, g.y - 2, 'moveis', 'zzz').setDepth(100000).setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: z, y: z.y - 26, x: z.x + 10, scale: 1, alpha: { from: 1, to: 0 }, duration: 1800, onComplete: () => z.destroy() });
    };
    puff();
    this.itSleep = this.time.addEvent({ delay: 1100, loop: true, callback: puff });
  }

  /** O tablet escorrega da mão dele e cai no chão (a tela treme); fica lá, com notas musicais saindo. */
  async dropTablet() {
    this.setItTablet(false);
    const g = this.itGuy;
    const img = await this.fling('tablet-chao', { x: g.x + g.width / 2, y: g.y + 20 }, IT_TABLET_FLOOR, 30, 420);
    img.setAngle(-8).setDepth(IT_TABLET_FLOOR.y - 2);
    this.cameras.main.shake(260, 0.006);
    this.floorTablet = img;
    this.setNotes(true);
  }

  /** Notas musicais subindo do tablet (a musiquinha do jogo tocando). */
  private setNotes(on: boolean) {
    this.notes?.remove();
    this.notes = null;
    const t = this.floorTablet;
    if (!on || !t) return;
    let k = 0;
    this.notes = this.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => {
        k++;
        const n = this.add.image(t.x + (k % 2 ? -6 : 8), t.y - 10, 'moveis', k % 3 ? 'nota-a' : 'nota-b').setDepth(100000);
        this.tweens.add({ targets: n, y: n.y - 34, x: n.x + (k % 2 ? -10 : 10), alpha: { from: 1, to: 0 }, duration: 1400, onComplete: () => n.destroy() });
      },
    });
  }

  /** O ESTAGIÁRIO deixa o tablet em cima da mesa do Marcos (a musiquinha para). */
  async tabletToDesk() {
    this.setNotes(false);
    const t = this.floorTablet;
    if (!t) return;
    await new Promise<void>((resolve) =>
      this.tweens.add({ targets: t, x: IT_TABLET_DESK.x, y: IT_TABLET_DESK.y, angle: 0, duration: 450, ease: 'Sine.easeOut', onComplete: () => resolve() }),
    );
    t.setDepth(IT_TABLET_DESK.y + 60);
  }

  /** O encarregado começa a acordar: o Zzz para, ele se mexe na cadeira e aparece um "!". */
  itWakes() {
    this.setItSleeping(false);
    const g = this.itGuy;
    this.tweens.add({ targets: g, x: g.x + 2, duration: 80, yoyo: true, repeat: 5 });
    const icon = this.add.image(g.x + g.width / 2 + 14, g.y - 8, 'moveis', 'alerta').setDepth(100000);
    this.tweens.add({ targets: icon, y: icon.y - 6, duration: 300, yoyo: true, repeat: 3, onComplete: () => icon.destroy() });
  }

  /** Pés do ESTAGIÁRIO (para o volume da musiquinha). */
  playerFeet() {
    return { x: this.player.x, y: this.player.y };
  }

  /** O ESTAGIÁRIO sai correndo até `to`, desviando dos móveis (travado, sem o jogador controlar). */
  async playerRunTo(to: Point, speed = RUN_SPEED) {
    const p = this.player;
    this.acting = true;
    const path = findPath({ x: p.x, y: p.y }, to);
    path.push(to);
    for (const pt of path) {
      const dx = pt.x - p.x;
      const dy = pt.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) continue;
      this.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      p.anims.play(this.walkAnim(this.facing), true);
      p.anims.timeScale = speed === RUN_SPEED ? 1.6 : 1;
      await new Promise<void>((resolve) =>
        this.tweens.add({
          targets: p,
          x: pt.x,
          y: pt.y,
          duration: (dist / speed) * 1000,
          onUpdate: () => {
            p.setDepth(p.y);
            this.shadow.setPosition(p.x, p.y - 1).setDepth(p.y - 1);
          },
          onComplete: () => resolve(),
        }),
      );
    }
    p.anims.stop();
    p.anims.timeScale = 1;
    this.acting = false;
  }

  // ------------------------------------------------------------ fase 2, missão 5: o celular vibrando

  /** O celular do ESTAGIÁRIO vibrando em cima da cabeça dele (chegou mensagem). */
  setPhoneRinging(on: boolean) {
    if (this.phoneIcon) {
      this.tweens.killTweensOf(this.phoneIcon);
      this.phoneIcon.destroy();
      this.phoneIcon = null;
    }
    if (!on) return;
    const p = this.player;
    const icon = this.add.image(p.x + 18, p.y - FEET_Y - 2, 'moveis', 'celular').setDepth(100000);
    this.tweens.add({ targets: icon, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: icon, y: icon.y - 5, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.phoneIcon = icon;
  }

  // ------------------------------------------------------------ fase 2, missão 3: procurar as placas

  /** Lupas em cima dos móveis onde ainda dá para procurar (as que saem da lista somem). */
  setMagnifiers(marks: { id: string; at: Point }[]) {
    const keep = new Set(marks.map((m) => m.id));
    for (const [id, img] of this.magnifiers) {
      if (keep.has(id)) continue;
      this.magnifiers.delete(id);
      this.tweens.killTweensOf(img);
      this.tweens.add({ targets: img, alpha: 0, scale: 1.6, duration: 220, onComplete: () => img.destroy() });
    }
    for (const m of marks) {
      if (this.magnifiers.has(m.id)) continue;
      const img = this.add.image(m.at.x, m.at.y - 16, 'moveis', 'lupa').setDepth(99000);
      this.tweens.add({ targets: img, y: img.y - 5, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.magnifiers.set(m.id, img);
    }
  }

  /**
   * O ESTAGIÁRIO procura no móvel: mexe nas coisas, o cronômetro amarelo esvazia em cima da cabeça e a bagunça voa
   * para o chão. No fim, as placas (`boards`) caem brilhando, perto dele, para ele ir pegar.
   */
  async search(spot: SearchSpot, boards: { id: string; frame: string }[], duration = 3000) {
    const p = this.player;
    const feet = { x: p.x, y: p.y };
    this.acting = true;
    this.facing = 'up';
    p.anims.play(this.walkAnim('up'), true);
    p.anims.timeScale = 1.8;
    const shake = this.tweens.add({ targets: p, x: feet.x + 2, duration: 90, yoyo: true, repeat: -1 });
    const cabinet = this.furnitureImages.get(spot.host);
    const wobble = cabinet && this.tweens.add({ targets: cabinet, x: spot.host.x + 1, duration: 70, yoyo: true, repeat: -1 });

    // cronômetro: o amarelo vai sumindo no sentido do relógio
    const clock = this.add.graphics().setDepth(100001);
    const cx = feet.x;
    const cy = feet.y - FEET_Y - 24;
    const draw = (left: number) => {
      const r = 13;
      clock.clear();
      clock.fillStyle(0x1c1626).fillRect(cx - 3, cy - r - 7, 6, 6);
      clock.fillStyle(0x1c1626).fillCircle(cx, cy, r + 3);
      clock.fillStyle(0xffffff).fillCircle(cx, cy, r);
      const start = -Math.PI / 2 + 2 * Math.PI * (1 - left);
      if (left > 0.002) {
        clock.fillStyle(0xffc21a);
        clock.slice(cx, cy, r - 1, start, (3 * Math.PI) / 2, false);
        clock.fillPath();
      }
      clock.lineStyle(2, 0x1c1626).lineBetween(cx, cy, cx + Math.cos(start) * (r - 1), cy + Math.sin(start) * (r - 1));
      clock.fillStyle(0x1c1626).fillCircle(cx, cy, 2);
    };
    draw(1);
    this.tweens.addCounter({ from: 1, to: 0, duration, onUpdate: (tw) => draw(tw.getValue() ?? 0) });

    // bagunça saindo do armário
    const kinds = ['papel', 'pasta', 'caixa', 'cabo', 'livro', 'grampeador'];
    const messCount = Math.max(5, Math.round(duration / 380));
    for (let k = 0; k < messCount; k++) {
      this.time.delayedCall(200 + (k * (duration - 600)) / messCount, () => {
        // cai no chão da mesma sala (não em cima da parede nem no corredor)
        const room = roomAt(feet.x, feet.y);
        let to = feet;
        for (let tries = 0; tries < 8; tries++) {
          const q = { x: feet.x + Phaser.Math.Between(-62, 62), y: Math.max(spot.zone.y + 6, feet.y + Phaser.Math.Between(-6, 44)) };
          if (roomAt(q.x, q.y) === room && roomAt(q.x, q.y + 10) === room && !WALLS.some((w) => inside(w, q.x, q.y))) {
            to = q;
            break;
          }
        }
        void this.fling(`bagunca-${Phaser.Utils.Array.GetRandom(kinds)}`, { x: spot.top.x, y: spot.top.y + 12 }, to, 46, 520).then((img) => {
          img.setDepth(-3);
          this.tweens.add({ targets: img, alpha: 0, delay: 9000, duration: 1200, onComplete: () => img.destroy() });
        });
      });
    }

    // as placas aparecem no fim, por último, e caem em lugares onde dá para pegar
    const land = landingSpots(
      feet,
      boards.length,
      this.spots.map((sp) => sp.zone),
    );
    const landed = boards.map((b, k) => {
      // sem lugar livre em volta (não acontece nos móveis do mapa, os testes conferem): cai no pé dele
      const to = land[k] ?? feet;
      return this.wait(duration * 0.72 + k * 320).then(async () => {
        const img = await this.fling(b.frame, { x: spot.top.x, y: spot.top.y + 12 }, to, 70, 650);
        this.settleOnFloor(b.id, img, to);
      });
    });

    await this.wait(duration);
    clock.destroy();
    shake.stop();
    p.setX(feet.x);
    wobble?.stop();
    cabinet?.setX(spot.host.x);
    p.anims.stop();
    p.anims.timeScale = 1;
    p.setFrame(ROW.up * FRAME.cols + 2);
    await Promise.all(landed);
    this.acting = false;
  }

  /** Coisa que caiu no chão (placa ou peça): brilha e balança até o ESTAGIÁRIO chegar perto. */
  private settleOnFloor(id: string, img: Phaser.GameObjects.Image, to: Point) {
    img.setAngle(0).setDepth(-2).setScale(1).setAlpha(1).setPosition(to.x, to.y);
    const glow = this.add.image(to.x, to.y, 'moveis', 'brilho-placa').setDepth(-2.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.35, scale: 1.25, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: img, y: to.y - 4, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.floorBoards.push({ id, at: to, board: img, glow });
  }

  /** Fase 3: o ESTAGIÁRIO deixou a peça onde estava (só pega de novo depois de se afastar e voltar). */
  putBack(id: string, frame: string, at: Point) {
    this.pickupHold.add(id);
    this.settleOnFloor(id, this.add.image(at.x, at.y, 'moveis', frame), at);
  }

  /** Fase 3: trocou a peça da mochila; a antiga cai no chão perto dele. */
  async dropNear(id: string, frame: string) {
    const p = this.player;
    const from = { x: p.x, y: p.y };
    const [to = from] = landingSpots(
      from,
      1,
      this.spots.map((sp) => sp.zone),
    );
    this.pickupHold.add(id);
    const img = await this.fling(frame, { x: from.x, y: from.y - FEET_Y + 20 }, to, 40, 500);
    this.settleOnFloor(id, img, to);
  }

  /** Joga uma imagem do atlas de `from` até `to`, num arco, girando. */
  private fling(frame: string, from: Point, to: Point, height: number, duration: number) {
    const img = this.add.image(from.x, from.y, 'moveis', frame).setDepth(100000);
    const spin = Phaser.Math.Between(-540, 540);
    return new Promise<Phaser.GameObjects.Image>((resolve) => {
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration,
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 0;
          img.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * height);
          img.setAngle(spin * t);
        },
        onComplete: () => resolve(img),
      });
    });
  }

  /** Pegou uma placa do chão: ela sobe até o ESTAGIÁRIO e some (o React mostra a placa grande). `true` = pegou. */
  private checkPickups() {
    const p = this.player;
    for (const id of this.pickupHold) {
      const b = this.floorBoards.find((x) => x.id === id);
      if (!b || Math.hypot(b.at.x - p.x, b.at.y - p.y) > PICKUP_RADIUS + 14) this.pickupHold.delete(id);
    }
    const i = this.floorBoards.findIndex((b) => !this.pickupHold.has(b.id) && Math.hypot(b.at.x - p.x, b.at.y - p.y) < PICKUP_RADIUS);
    if (i < 0) return false;
    const [b] = this.floorBoards.splice(i, 1);
    this.tweens.killTweensOf([b.board, b.glow]);
    b.glow.destroy();
    b.board.setDepth(100000);
    this.tweens.add({
      targets: b.board,
      x: p.x,
      y: p.y - FEET_Y - 8,
      scale: 2,
      alpha: 0,
      duration: 380,
      ease: 'Sine.easeIn',
      onComplete: () => b.board.destroy(),
    });
    this.game.events.emit(OFFICE_EVENTS.pickup, b.id, b.at);
    return true;
  }

  // ------------------------------------------------------------ fase 3, missão 2: a água e as palavras-cruzadas da Rita

  /** A Rita aparece parada num ponto (sem andar), virada para `facing`. */
  rhPlace(at: Point, facing: Facing = 'down') {
    this.tweens.killTweensOf(this.rh);
    this.rh.setPosition(at.x, at.y).setDepth(at.y);
    this.rhFace(facing);
  }

  /** Tablet na mão da Rita (de frente, parada) e o "!" em cima dela (esperando o ESTAGIÁRIO). */
  setRhTablet(on: boolean, alert = false) {
    this.rhTablet?.destroy();
    this.rhTablet = null;
    this.rhAlert?.destroy();
    this.rhAlert = null;
    const r = this.rh;
    if (on) {
      this.rhFace('down');
      this.rhTablet = this.add.image(r.x, r.y - 16, 'moveis', 'tablet-mao').setDepth(r.y + 1);
    }
    if (alert) {
      const icon = this.add.image(r.x + 14, r.y - FEET_Y - 8, 'moveis', 'alerta').setDepth(100000);
      this.tweens.add({ targets: icon, y: icon.y - 5, duration: 450, yoyo: true, repeat: -1 });
      this.rhAlert = icon;
    }
  }

  /** Onde a Rita está (para a área de conversa em volta dela). */
  rhAt(): Point {
    return { x: this.rh.x, y: this.rh.y };
  }

  /** A Rita sai correndo atrás do ESTAGIÁRIO e para do lado dele, de frente para ele. */
  async rhRunToPlayer() {
    this.setRhTablet(false);
    const p = { x: this.player.x, y: this.player.y };
    // para atrás dele (do lado de onde ele veio)
    const back = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] }[this.facing];
    const to = besidePlayer(p, { x: p.x + back[0] * 100, y: p.y + back[1] * 100 });
    await this.walkSprite(this.rh, RH_LOOK, to, undefined, RUN_SPEED * 1.1);
    const dx = p.x - to.x;
    const dy = p.y - to.y;
    this.rhFace(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
  }

  /** A Rita anda até um ponto e fica de frente, com o tablet (e o "!" se ainda espera ajuda). */
  async rhWaitWithTablet(at: Point, alert: boolean) {
    this.setRhTablet(false);
    await this.walkSprite(this.rh, RH_LOOK, at);
    this.setRhTablet(true, alert);
  }

  /** O ESTAGIÁRIO leva um susto: vira para a Rita, dá um pulinho e aparece o "!" em cima dele. */
  async startle() {
    const p = this.player;
    const dx = this.rh.x - p.x;
    const dy = this.rh.y - p.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    p.anims.stop();
    p.setFrame(ROW[this.facing] * FRAME.cols + 2);
    const icon = this.add.image(p.x + 14, p.y - FEET_Y - 10, 'moveis', 'alerta').setDepth(100000).setScale(1.3);
    this.tweens.add({ targets: p, y: p.y - 12, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: icon, y: icon.y - 8, duration: 200, yoyo: true, repeat: 3, onComplete: () => icon.destroy() });
    this.cameras.main.shake(200, 0.004);
    await this.wait(900);
  }

  /** O ESTAGIÁRIO vai até o bebedouro e bebe água (gotinhas subindo). */
  async drinkWater() {
    await this.playerRunTo(WATER_SPOT);
    this.facing = 'up';
    const p = this.player;
    p.setFrame(ROW.up * FRAME.cols + 2);
    for (let k = 0; k < 3; k++) {
      const drop = this.add.circle(p.x + (k - 1) * 6, p.y - FEET_Y - 4, 3, 0x6cc6ff).setDepth(100000);
      this.tweens.add({ targets: drop, y: drop.y - 22, alpha: 0, duration: 700, delay: k * 250, onComplete: () => drop.destroy() });
    }
    await this.wait(1500);
  }

  // ------------------------------------------------------------ fase 3, missão 4: o quiz na Sala de Reuniões

  /** O CEO levanta da Diretoria (se estiver sentado) e anda até um ponto; com `alert`, fica com o "!" em cima. */
  async ceoWalkTo(to: Point, facing: Facing, alert = false) {
    let s = this.ceoWalker;
    if (!s) {
      this.setCeoMood('tranquilo');
      this.ceo.setFrame('cadeira-vazia').setY(this.ceoBaseY + 4);
      s = this.add.sprite(CEO_SEAT.x, CEO_SEAT.y, 'colegas', CEO_LOOK * 4 * FRAME.cols + 2).setOrigin(0.5, FEET_Y / FRAME.h);
      this.ceoWalker = s;
    }
    this.setCeoWalkerAlert(false);
    await this.walkSprite(s, CEO_LOOK, to);
    if (!s.active) return;
    s.setFrame((CEO_LOOK * 4 + ROW[facing]) * FRAME.cols + 2);
    this.setCeoWalkerAlert(alert);
  }

  setCeoWalkerAlert(on: boolean) {
    this.ceoWalkerAlert?.destroy();
    this.ceoWalkerAlert = null;
    const s = this.ceoWalker;
    if (!on || !s) return;
    const icon = this.add.image(s.x + 14, s.y - FEET_Y - 8, 'moveis', 'alerta').setDepth(100000);
    this.tweens.add({ targets: icon, y: icon.y - 5, duration: 450, yoyo: true, repeat: -1 });
    this.ceoWalkerAlert = icon;
  }

  /** O CEO (em pé) vira para o ESTAGIÁRIO. */
  ceoFacePlayer() {
    const s = this.ceoWalker;
    if (!s) return;
    const dx = this.player.x - s.x;
    const dy = this.player.y - s.y;
    const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    s.setFrame((CEO_LOOK * 4 + ROW[facing]) * FRAME.cols + 2);
  }

  /** O CEO volta para a cadeira dele na Diretoria. */
  async ceoBackToSeat() {
    const s = this.ceoWalker;
    if (!s) return;
    this.setCeoWalkerAlert(false);
    await this.walkSprite(s, CEO_LOOK, CEO_SEAT);
    s.destroy();
    this.ceoWalker = null;
    this.setCeoMood('tranquilo');
  }

  /** O ESTAGIÁRIO vai até a cadeira da mesa de reunião e senta (de frente, a mesa esconde as pernas). */
  async sitAtMeeting() {
    await this.playerRunTo(MEETING_SEAT.approach, SPEED);
    const p = this.player;
    p.setVisible(false);
    this.shadow.setVisible(false);
    const { seat, depth } = MEETING_SEAT;
    this.seated?.destroy();
    this.seated = this.add.image(seat.x, seat.y, 'moveis', 'estagiario-sentado').setOrigin(0.5, 1).setDepth(depth);
    this.facing = 'down';
    await this.wait(350);
  }

  /** Levanta da cadeira da mesa de reunião e fica em pé atrás dela. */
  leaveMeetingSeat() {
    this.seated?.destroy();
    this.seated = null;
    this.player.setPosition(MEETING_SEAT.approach.x, MEETING_SEAT.approach.y).setVisible(true);
    this.shadow.setPosition(MEETING_SEAT.approach.x, MEETING_SEAT.approach.y - 1).setVisible(true);
    this.facing = 'down';
  }

  // ------------------------------------------------------------ fase 3, missão 3: as 3 caixas dos computadores

  /** As 3 caixas aparecem na Sala de TI (pulando no lugar), com o "!" em cima e a base sólida. */
  showPcBoxes() {
    if (this.pcBoxes.length) return;
    this.pcBoxes = PC_BOXES.map((b, i) => {
      const img = this.add.image(b.at.x, b.at.y - 30, 'moveis', 'caixa').setOrigin(0).setAlpha(0).setDepth(b.at.y + 40);
      this.tweens.add({ targets: img, y: b.at.y, alpha: 1, duration: 420, delay: i * 180, ease: 'Bounce.easeOut' });
      const zone = this.add.zone(b.foot.x + b.foot.w / 2, b.foot.y + b.foot.h / 2, b.foot.w, b.foot.h);
      this.physics.add.existing(zone, true);
      this.physics.add.collider(this.player, zone);
      return { img, alert: null };
    });
    this.time.delayedCall(900, () => this.pcBoxes.forEach((_, i) => this.setPcBox(i, false)));
  }

  /** Caixa aberta (computador montado) ou fechada com o "!" (ainda falta montar). */
  setPcBox(index: number, done: boolean) {
    const b = this.pcBoxes[index];
    if (!b) return;
    b.img.setFrame(done ? 'caixa-aberta' : 'caixa');
    b.alert?.destroy();
    b.alert = null;
    if (done) return;
    const at = PC_BOXES[index].at;
    const icon = this.add.image(at.x + 24, at.y - 10, 'moveis', 'alerta').setDepth(100000);
    this.tweens.add({ targets: icon, y: icon.y - 5, duration: 450, yoyo: true, repeat: -1 });
    b.alert = icon;
  }

  /** O Marcos levanta (se estiver sentado) e vem até o lado do ESTAGIÁRIO, e os dois ficam de frente. */
  async itGuyComesToPlayer() {
    let s = this.itWalker;
    if (!s) {
      s = this.add.sprite(IT_SEAT.x, IT_SEAT.y, 'colegas', 2).setOrigin(0.5, FEET_Y / FRAME.h);
      this.itGuy.setFrame('cadeira-vazia');
      this.itWalker = s;
    }
    this.setItAlert(false);
    const p = { x: this.player.x, y: this.player.y };
    await this.walkSprite(s, 0, besidePlayer(p, { x: s.x, y: s.y }, 34));
    if (!s.active) return;
    this.itGuyFacePlayer();
    const dx = s.x - p.x;
    const dy = s.y - p.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
  }

  /** O Marcos pula de alegria junto com o ESTAGIÁRIO. */
  async itGuyHops(times = 6) {
    const s = this.itWalker;
    if (!s) return;
    this.setItAlert(false);
    s.setFrame(ROW.down * FRAME.cols + 2);
    for (let k = 0; k < times; k++) {
      await new Promise<void>((resolve) =>
        this.tweens.add({ targets: s, y: s.y - 10, duration: 160, yoyo: true, ease: 'Quad.easeOut', onComplete: () => resolve() }),
      );
      await this.wait(120);
    }
  }

  // ------------------------------------------------------------ fase 3, missão 5: o aperto no banheiro

  /** Animação de andar do ESTAGIÁRIO (com a calça molhada, a outra folha). */
  private walkAnim(facing: Facing) {
    return `${this.wet ? 'wet' : 'walk'}-${facing}`;
  }

  /** Balão com uma gota em cima da cabeça, tremendo: a vontade de ir ao banheiro. */
  setUrge(on: boolean) {
    this.urge?.destroy();
    this.urge = null;
    if (!on) return;
    this.urge = this.add.image(this.player.x + 16, this.player.y - FEET_Y - 10, 'moveis', 'vontade').setDepth(100000);
  }

  /** Não deu tempo: a calça fica molhada e aparece uma pocinha embaixo dele. */
  wetPants() {
    this.wet = true;
    const p = this.player;
    p.setTexture('estagiario-molhado', ROW[this.facing] * FRAME.cols + 2);
    this.puddle?.destroy();
    this.puddle = this.add.image(p.x, p.y + 1, 'moveis', 'poca').setDepth(-3).setScale(0.3);
    this.tweens.add({ targets: this.puddle, scale: 1, duration: 900, ease: 'Sine.easeOut' });
    if (!this.overview) this.cameras.main.shake(300, 0.004);
  }

  /** Vai até o mictório livre mais perto e fica de frente para ele (de costas para a câmera). */
  async useUrinal() {
    const p = this.player;
    const spot = URINAL_SPOTS.reduce((a, b) => (Math.hypot(b.x - p.x, b.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? b : a));
    await this.playerRunTo(spot, SPEED);
    this.facing = 'up';
    p.setFrame(ROW.up * FRAME.cols + 2);
  }

  /** A câmera chega perto das palavras rabiscadas na parede do banheiro (ou volta, com `on` = false). */
  async lookAtWords(on: boolean) {
    if (this.overview) return;
    const cam = this.cameras.main;
    if (on) {
      cam.zoomTo(1.8, 900, 'Sine.easeInOut');
      await this.lookAt(WALL_WORDS.x, WALL_WORDS.y + 20);
      return;
    }
    cam.zoomTo(1, 700, 'Sine.easeInOut');
    await this.lookAtPlayer();
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, resolve));
  }

  private standUp(i: number) {
    const w = WORKSTATIONS[i];
    this.chairs[i].setFrame('cadeira-vazia');
    if (!this.walkers[i]) {
      this.walkers[i] = this.add
        .sprite(w.seat.x, w.seat.y, 'colegas', (w.look * 4) * FRAME.cols + 2)
        .setOrigin(0.5, FEET_Y / FRAME.h);
    }
    this.walkers[i]!.setVisible(true).setDepth(w.seat.y);
  }

  private sitDown(i: number) {
    const w = WORKSTATIONS[i];
    this.walkers[i]?.destroy();
    this.walkers[i] = null;
    this.chairs[i].setFrame(`colega-${w.look}`);
    this.positionAngry(i);
  }

  private faceWalker(i: number, facing: Facing) {
    const s = this.walkers[i];
    if (!s) return;
    s.anims.stop();
    s.setFrame((WORKSTATIONS[i].look * 4 + ROW[facing]) * FRAME.cols + 2);
  }

  private setAngry(i: number, on: boolean) {
    if (!on) {
      this.angry[i]?.destroy();
      this.angry[i] = null;
      return;
    }
    if (!this.angry[i]) {
      const icon = this.add.image(0, 0, 'moveis', 'raiva').setDepth(100000);
      this.tweens.add({ targets: icon, scale: 1.25, duration: 300, yoyo: true, repeat: -1 });
      this.angry[i] = icon;
    }
    this.positionAngry(i);
  }

  private positionAngry(i: number) {
    const icon = this.angry[i];
    if (!icon) return;
    const s = this.walkers[i];
    if (s) icon.setPosition(s.x + 14, s.y - FEET_Y - 4);
    else icon.setPosition(this.chairs[i].x + this.chairs[i].width / 2 + 14, this.chairs[i].y + 4);
  }

  private walk(i: number, to: Point) {
    const s = this.walkers[i];
    if (!s) return Promise.resolve();
    return this.walkSprite(s, WORKSTATIONS[i].look, to, () => this.positionAngry(i));
  }

  /** Anda pelo caminho calculado, com a animação da direção de cada trecho. */
  private walkSprite(s: Phaser.GameObjects.Sprite, look: number, to: Point, onStep?: () => void, speed = WALK_SPEED) {
    this.tweens.killTweensOf(s); // um caminho novo substitui o anterior
    const path = findPath({ x: s.x, y: s.y }, to);
    path.push(to);
    return new Promise<void>((resolve) => {
      const step = (k: number) => {
        if (k >= path.length || !s.active) {
          s.anims.stop();
          s.anims.timeScale = 1;
          resolve();
          return;
        }
        const p = path[k];
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return step(k + 1);
        const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
        s.anims.play(`colega${look}-${facing}`, true);
        s.anims.timeScale = speed / WALK_SPEED;
        this.tweens.add({
          targets: s,
          x: p.x,
          y: p.y,
          duration: (dist / speed) * 1000,
          onUpdate: () => {
            s.setDepth(s.y);
            onStep?.();
          },
          onComplete: () => step(k + 1),
        });
      };
      step(0);
    });
  }

  private checkPcZones() {
    if (!this.pcZonesOn) return;
    WORKSTATIONS.forEach((w, i) => {
      const inZone = inside(w.zone, this.player.x, this.player.y);
      if (!inZone) {
        this.pcArmed[i] = true;
        return;
      }
      if (this.pcArmed[i] && !this.pcDone[i]) {
        this.pcArmed[i] = false;
        this.facing = 'up';
        this.game.events.emit(OFFICE_EVENTS.pc, i);
      }
    });
  }

  /** Porta automática: abre quando o ESTAGIÁRIO chega perto (de fora ou de dentro) e fecha depois. */
  private updateDoor() {
    const { center } = MAIN_DOOR;
    const playerNear = Math.abs(this.player.x - center.x) < TILE * 2.5 && Math.abs(this.player.y - center.y) < TILE * 2.6;
    const near = !this.doorLocked && (playerNear || this.npcDoor > 0);
    if (near === this.doorOpen) return;
    if (!near && this.playerOnDoor()) return; // não fecha em cima dele
    this.doorOpen = near;
    const index = tileIndex(near ? 'glassopen' : 'glass');
    for (const col of MAIN_DOOR.cols) this.ground.putTileAt(index, col, MAIN_DOOR.row);
  }

  private playerOnDoor() {
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    const top = MAIN_DOOR.row * TILE;
    return b.bottom > top && b.top < top + TILE;
  }

  private flashRoomName(name: string) {
    this.roomLabel.setText(name).setPosition(this.cameras.main.width / 2, 14);
    this.tweens.killTweensOf(this.roomLabel);
    this.roomLabel.setAlpha(1);
    this.tweens.add({ targets: this.roomLabel, alpha: 0, delay: 1400, duration: 600 });
  }

  /** Contorno escuro onde parede encontra piso, para as paredes se destacarem do chão. */
  private drawWallEdges() {
    const g = this.add.graphics().setDepth(-9);
    g.fillStyle(0x3b2a1e, 0.85);
    const solid = (x: number, y: number) =>
      y < 0 || y >= TILE_DATA.length || x < 0 || x >= TILE_DATA[0].length || SOLID_TILES.includes(TILE_DATA[y][x]);
    TILE_DATA.forEach((row, y) =>
      row.forEach((_, x) => {
        if (!solid(x, y)) return;
        const px = x * TILE;
        const py = y * TILE;
        if (!solid(x, y - 1)) g.fillRect(px, py, TILE, 2);
        if (!solid(x, y + 1)) g.fillRect(px, py + TILE - 2, TILE, 2);
        if (!solid(x - 1, y)) g.fillRect(px, py, 2, TILE);
        if (!solid(x + 1, y)) g.fillRect(px + TILE - 2, py, 2, TILE);
      }),
    );
  }

  private buildDebugLayer() {
    const items: Phaser.GameObjects.GameObject[] = [];
    const wallSet = new Set(WALLS);
    for (const r of ROOMS) {
      items.push(this.add.rectangle(r.x, r.y, r.w, r.h).setOrigin(0).setStrokeStyle(2, 0xffae00, 0.9));
      items.push(
        this.add.text(r.x + 6, r.y + 4, r.name, { fontSize: '13px', color: '#ffae00', backgroundColor: '#000000aa' }),
      );
    }
    for (const r of [...WALLS, ...OBJECTS]) {
      const color = wallSet.has(r) ? 0xf54129 : 0x0190ff;
      items.push(this.add.rectangle(r.x, r.y, r.w, r.h, color, 0.3).setOrigin(0).setStrokeStyle(1, color, 0.9));
    }
    this.debugLayer = this.add.container(0, 0, items).setDepth(100000).setVisible(false);
    this.bodyOutline = this.add
      .rectangle(0, 0, PLAYER_BODY.w, PLAYER_BODY.h, 0xa0c330, 0.6)
      .setOrigin(0)
      .setDepth(100001)
      .setVisible(false);
  }
}
