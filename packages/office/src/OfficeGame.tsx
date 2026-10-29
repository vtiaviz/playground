import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import type { GameResult } from '@playground/games';
import { createOfficeGame, getOfficeScene } from './game/createGame';
import { ALARM_ZONE, BOARD, BOARD_CROWD, BOARD_ZONE, COPA_ESCAPE, COPA_RITA_WAIT, MEETING_BOSS, MEETING_SEAT_ZONE, PC_BOXES, PROJECTOR_BOX, PRINT_DESK, PRINTER, TRAINING_PAPER, TRAINING_ZONE, QUIZ_PAPER, WORDSEARCH_PAPER, RITA_ANNOUNCE, URINAL_ZONE, CORRIDOR_NAME, deskSpot, deviceSpot, IT_EXIT, IT_SEAT, IT_TABLET_FLOOR, IT_TABLET_ZONE, IT_ZONE, searchSpot, RH_HOME, RH_STATIONS, RH_WAIT, ROOMS, SPAWN, WORKSTATIONS, type Room } from './game/map';
import { OFFICE_EVENTS, RH_LOOK } from './game/OfficeScene';
import AlarmPanel from './mission/AlarmPanel';
import CelularOverlay from './mission/CelularOverlay';
import DaySummary, { type DaySummaryData, type XpEntry } from './mission/DaySummary';
import { checkExercise, type ExerciseCheck } from './mission/exercicio';
import { describeOn, newPowerStates, OFFICE_PCS, stillOn, type PowerState } from './mission/desligar';
import { playSiren } from './mission/sirene';
import DesktopModal from './mission/sistemas/DesktopModal';
import { ChoiceBalloon, DialogBox } from './mission/Dialogs';
import { checkSurvey, clearWrong, explainProblems, SURVEY_DEVICES, taggedCount, type DeviceTag, type Survey } from './mission/levantamento';
import LevantamentoModal from './mission/LevantamentoModal';
import MinigameOverlay from './mission/MinigameOverlay';
import PecaNaMao from './mission/PecaNaMao';
import MontarPcModal from './mission/MontarPcModal';
import { BUILDS, newBuildState, type BuildId, type BuildState } from './mission/montarPc';
import { checkParts, explainWrong, KINDS, partById, partsIn, PART_KINDS, type Bag, type Part, type PartKind } from './mission/pecas';
import PlacaDestaque from './mission/PlacaDestaque';
import RelogioPassando from './mission/RelogioPassando';
import { checkHangman, jingleVolume } from './mission/forca';
import { playMessageTone, playThud, startJingle, type Jingle } from './mission/musiquinha';
import { BOARD_TOTAL, boardById, BOARDS, checkDelivery, HIDEOUTS, type BoardModel, type Hideout } from './mission/placas';
import {
  CACA_PALAVRAS_BANHEIRO_PADRAO,
  CACA_PALAVRAS_PADRAO,
  CRUZADAS_PADRAO,
  CRUZADAS_RITA_PADRAO,
  FORCA_PADRAO,
  FRASES_PADRAO,
  MISSAO_CACA,
  MISSAO_ALINHAMENTO,
  MISSAO_CEO,
  MISSAO_CRUZADAS_RITA,
  MISSAO_EXERCICIO,
  FIM_DIA2,
  FIM_DIA3,
  MISSAO_BANHEIRO,
  MISSAO_FIM,
  MISSAO_FORCA,
  MISSAO_IMPRESSAO,
  MISSAO_TREINAMENTO,
  FRASES_TREINAMENTO_PADRAO,
  MISSAO_QUIZ_TREINAMENTO,
  QUIZ_TREINAMENTO_PADRAO,
  MISSAO_CACA_TREINAMENTO,
  CACA_PALAVRAS_TREINAMENTO_PADRAO,
  FIM_DIA4,
  MISSAO_LEVANTAMENTO,
  MISSAO_MONTAGEM,
  MISSAO_MONTAR_PCS,
  MISSAO_PCS,
  MISSAO_PECAS,
  MISSAO_PLACAS,
  MISSAO_PROJETOR,
  MISSAO_PROVA,
  MISSAO_QUADRO,
  OBJETIVOS,
  QUIZ_ALINHAMENTO_PADRAO,
  QUIZ_PADRAO,
  QUIZ_SURPRESA_PADRAO,
  type MissionCrossword,
  type MissionGame,
} from './mission/missoes';
import QuadroOverlay from './mission/QuadroOverlay';
import SonhoOverlay from './mission/SonhoOverlay';
import ProjetorModal from './mission/ProjetorModal';
import { newSetupState, type SetupState } from './mission/projetor';
import ImpressoraModal from './mission/ImpressoraModal';
import PapelOverlay from './mission/PapelOverlay';
import { newPrinterState, type PrinterState } from './mission/impressao';
import PcImpressaoModal from './mission/sistemas/PcImpressaoModal';
import { allPlaced, checkKit, KITS, newKitState, type KitState } from './mission/montagem';
import MontagemModal from './mission/MontagemModal';
import PcModal, { formatTime } from './mission/PcModal';
import TabletOverlay from './mission/TabletOverlay';
import { diagnose, isPcReady, newPcState, PC_MODELS, type PcState } from './mission/pcs';
import './office.css';

export interface MissionResult {
  missionId: string;
  /** XP ganho (ou perdido, se negativo). */
  xp: number;
  /** `false` = a missão deu errado (ex.: bronca do chefe na missão 2). */
  success: boolean;
  /** Resultado do minijogo, quando a missão tem um (missão 1: palavras-cruzadas). */
  game?: GameResult;
}

export interface OfficeGameProps {
  /** Chamado quando o ESTAGIÁRIO entra numa sala (`null` = corredor). */
  onRoomChange?: (room: Room | null) => void;
  /** Palavras-cruzadas que o CEO está tentando resolver (padrão: um jogo de exemplo sobre o computador). */
  crossword?: MissionCrossword | null;
  /** Tempo da missão 2 em segundos (padrão: 3 minutos). */
  missionTime?: number;
  /** "Complete as Frases" do quadro branco da missão 4 (padrão: um jogo de exemplo sobre informática básica). */
  phrases?: MissionGame | null;
  /** Quiz da "prova de informática" da Elisa na missão 5 (padrão: um quiz de exemplo sobre informática básica). */
  quiz?: MissionGame | null;
  /** Caça-palavras do quadro da Sala de Reuniões, fase 2, missão 2 (padrão: um de exemplo com os tipos de computador). */
  wordSearch?: MissionGame | null;
  /** Forca do tablet do Marcos, fase 2, missão 4 (padrão: uma de exemplo com as palavras do dia). */
  hangman?: MissionGame | null;
  /** Quiz do exercício surpresa do curso, que chega pelo celular, fase 2, missão 5 (padrão: um de exemplo sobre o dia). */
  surpriseQuiz?: MissionGame | null;
  /** Palavras-cruzadas do tablet da Rita, fase 3, missão 2 (padrão: uma de exemplo com as peças do computador). */
  ritaCrossword?: MissionGame | null;
  /** Quiz da reunião de alinhamento, no notebook da Sala de Reuniões, fase 3, missão 4 (padrão: um sobre hardware). */
  alignmentQuiz?: MissionGame | null;
  /** Caça-palavras sonhado em frente ao mictório, fase 3, missão 5 (padrão: um de exemplo com as peças do computador). */
  bathroomWordSearch?: MissionGame | null;
  /** Fase 4, missão 3: as frases do treinamento de TI no papel da mesa do Marcos (`null` = jogo de exemplo). */
  trainingPhrases?: MissionGame | null;
  /** Fase 4, missão 4: o quiz da segunda folha do treinamento de TI (`null` = jogo de exemplo). */
  trainingQuiz?: MissionGame | null;
  /** Fase 4, missão 5: o caça-palavras da terceira folha do treinamento de TI (`null` = jogo de exemplo). */
  trainingWordSearch?: MissionGame | null;
  /** Para testes: começa direto na missão 2 a 6 da fase 1, na 2 a 5 da fase 2 (6 = fim do 2º dia) ou na 2 a 5 da fase 3 (as anteriores contam como feitas). */
  startAt?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Começa no 1º dia (fase 1, padrão) ou direto no 2º, 3º ou 4º dia (com o XP dos dias anteriores sem erros). */
  fase?: 1 | 2 | 3 | 4;
  /** Chamado quando uma missão termina (para guardar o XP). */
  onMissionComplete?: (result: MissionResult) => void;
  /** Chamado no fim da fase 1 (fim do primeiro dia), com o resumo do XP. */
  onDayComplete?: (summary: DaySummaryData) => void;
}

type Phase =
  | 'explore'
  | 'greeting'
  | 'ask'
  | 'declined'
  | 'playing'
  | 'dialog'
  | 'pc'
  | 'kit'
  | 'ask4'
  | 'board'
  | 'ask5'
  | 'tablet'
  | 'os'
  | 'alarm'
  | 'summary'
  | 'survey'
  | 'askF2'
  | 'askF2b'
  | 'board2'
  | 'search'
  | 'placa'
  | 'hangman'
  | 'phone'
  | 'peca'
  | 'askP2'
  | 'crosswordP2'
  | 'montar'
  | 'quizP4'
  | 'dreamP5'
  | 'projetor'
  | 'pcImpressao'
  | 'impressora'
  | 'paperQ3'
  | 'quizQ4'
  | 'cacaQ5';
/** Fase 2, missão 1: chefe chamou, procurando os computadores, Marcos conferindo, concluída. */
type Fase2M1 = 'off' | 'called' | 'working' | 'checking' | 'done';
/** Fase 2, missão 2: colegas conversando no quadro, Diego chamou, aceitou ajudar (ir ao quadro), concluída. */
type Fase2M2 = 'off' | 'chat' | 'called' | 'accepted' | 'done';
/** Fase 2, missão 3: Marcos chamou, procurando as placas, entregue. */
type Fase2M3 = 'off' | 'called' | 'working' | 'done';
/** Fase 2, missão 4: Marcos descansando (relógio), tablet caído, forca aberta, saindo de fininho, concluída. */
type Fase2M4 = 'off' | 'resting' | 'crashed' | 'playing' | 'escaping' | 'done';
/** Fase 2, missão 5: o celular vibrando, aberto (exercício ainda não entregue), concluída. */
type Fase2M5 = 'off' | 'ringing' | 'pending' | 'done';
/** Fase 3, missão 1: Marcos chamou, procurando as peças, conferindo, concluída. */
type Fase3M1 = 'off' | 'called' | 'working' | 'checking' | 'done';
/** Fase 3, missão 2: com sede (indo à Copa), a Rita correu atrás dele, esperando na Copa (não ajudou ainda), concluída. */
type Fase3M2 = 'off' | 'thirsty' | 'met' | 'waiting' | 'done';
/** Fase 3, missão 3: Marcos chamou, montando os computadores, concluída. */
type Fase3M3 = 'off' | 'called' | 'working' | 'done';
/** Fase 3, missão 4: chefe chamou, respondendo (sentado), levantou sem terminar, concluída. */
type Fase3M4 = 'off' | 'called' | 'quiz' | 'waiting' | 'done';
/**
 * Fase 3, missão 5: correndo para o banheiro (relógio), não deu tempo (indo mesmo assim), no mictório (sonho),
 * saindo do banheiro, fim do expediente (indo embora) e concluída (saiu e viu o resumo do dia).
 */
type Fase3M5 = 'off' | 'running' | 'wet' | 'urinal' | 'exit' | 'leaving' | 'done';
/** Fase 4, missão 1: o chefe chamou (indo à Sala de Reuniões), instalando o projetor e a webcam, concluída. */
type Fase4M1 = 'off' | 'called' | 'working' | 'done';
/** Fase 4, missão 2: imprimindo (PC e impressora), as cópias saíram (pegar), levando ao chefe, concluída. */
type Fase4M2 = 'off' | 'working' | 'printed' | 'carrying' | 'done';
/** Fase 4, missão 3: completando as frases do treinamento (o papel na mesa do Marcos), concluída. */
type Fase4M3 = 'off' | 'working' | 'done';
/** Fase 4, missão 4: respondendo o quiz da segunda folha, concluída. */
type Fase4M4 = 'off' | 'working' | 'done';
/** Fase 4, missão 5: o caça-palavras da terceira folha, a Rita vindo avisar, indo embora (dispensado), concluída. */
type Fase4M5 = 'off' | 'working' | 'rita' | 'leaving' | 'done';
/** Fim do 2º dia: chefe chamou, dispensado (indo embora), saiu e viu o resumo. */
type Fase2Fim = 'off' | 'called' | 'leaving' | 'done';
/** Missão 6: equipe indo embora, chefe chamou, desligando, alarme ativado, conferindo, concluída. */
type Mission6 = 'off' | 'leaving' | 'called' | 'working' | 'armed' | 'checking' | 'done';
/** Missão 5: Elisa conversando com a Rita na Copa, chamou o ESTAGIÁRIO, concluída. */
type Mission5 = 'off' | 'gossip' | 'called' | 'done';
/** Missão 4: Bruno indo ao quadro, chamou o ESTAGIÁRIO, concluída. */
type Mission4 = 'off' | 'walking' | 'called' | 'done';
/** Missão 3: chamado no RH, montando, Rita conferindo, corrigindo, concluída. */
type Mission3 = 'off' | 'called' | 'working' | 'checking' | 'fixing' | 'done';
/** Missão 2: antes, contando o tempo, equipe voltando, chefe chamou o ESTAGIÁRIO, concluída. */
type Mission2 = 'off' | 'running' | 'returning' | 'called' | 'done';

interface Line {
  speaker: string;
  portrait: string;
  text: string;
  badge?: string;
  continueLabel?: string;
}

const ceo = (text: string, portrait = 'ceo-feliz-b', extra: Partial<Line> = {}): Line => ({
  speaker: MISSAO_CEO.speaker,
  portrait,
  text,
  ...extra,
});

/** "3 minutos", "1 minuto e 30 segundos", "45 segundos". */
function tempoPorExtenso(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  const min = m === 1 ? '1 minuto' : `${m} minutos`;
  const seg = r === 1 ? '1 segundo' : `${r} segundos`;
  if (!m) return seg;
  return r ? `${min} e ${seg}` : min;
}

/** Missão 6: onde fica cada computador que ficou ligado (luz da tela e área que abre o sistema). */
const PC_SPOTS = OFFICE_PCS.map((pc) => ({ pc, ...deskSpot(pc.desk) }));

/** Fase 2: onde fica cada equipamento do levantamento (ponto do adesivo e área que abre o modal). */
const DEVICE_SPOTS = new Map(SURVEY_DEVICES.map((d) => [d.id, deviceSpot(d.host, d.gadget, d.nth)]));

/** Fase 2, missão 3: os móveis com lupa (topo, para a lupa, e área na frente, que começa a busca). */
const HIDE_SPOTS = new Map(HIDEOUTS.map((h) => [h.id, searchSpot(h.host, h.nth)]));

/** XP de quem terminou a fase 1 sem nenhuma bronca (para começar direto na fase 2). */
const FASE1_XP = [MISSAO_CEO, MISSAO_PCS, MISSAO_MONTAGEM, MISSAO_QUADRO, MISSAO_PROVA, MISSAO_FIM].reduce((a, m) => a + m.xp, 0);
const FASE2_XP = [MISSAO_LEVANTAMENTO, MISSAO_CACA, MISSAO_PLACAS, MISSAO_FORCA, MISSAO_EXERCICIO].reduce((a, m) => a + m.xp, 0);
const FASE3_XP = [MISSAO_PECAS, MISSAO_CRUZADAS_RITA, MISSAO_MONTAR_PCS, MISSAO_ALINHAMENTO, MISSAO_BANHEIRO].reduce((a, m) => a + m.xp, 0);
/** XP com que cada dia começa quando se abre direto nele (os dias anteriores sem nenhuma bronca). */
const START_XP: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: FASE1_XP, 3: FASE1_XP + FASE2_XP, 4: FASE1_XP + FASE2_XP + FASE3_XP };

const DPAD: { label: string; x: number; y: number; area: string }[] = [
  { label: '▲', x: 0, y: -1, area: 'up' },
  { label: '◀', x: -1, y: 0, area: 'left' },
  { label: '▶', x: 1, y: 0, area: 'right' },
  { label: '▼', x: 0, y: 1, area: 'down' },
];

/**
 * Jogo Office: escritório top-down com o ESTAGIÁRIO e as missões. "Jogar o dia de novo" recomeça o dia do zero (o 2º
 * dia volta com o XP do primeiro); "Começar o 2º dia" abre a fase 2 levando o XP do primeiro dia.
 */
export default function OfficeGame(props: OfficeGameProps) {
  const [day, setDay] = useState<{ run: number; fase: 1 | 2 | 3 | 4; xp?: number }>({ run: 0, fase: props.fase ?? 1 });
  return (
    <OfficeDay
      key={day.run}
      {...props}
      fase={day.fase}
      startXp={day.xp ?? START_XP[day.fase]}
      onRestart={() => setDay((d) => (d.fase === 1 ? { run: d.run + 1, fase: 1 } : { run: d.run + 1, fase: d.fase, xp: d.xp }))}
      onNextDay={(xp) => setDay((d) => ({ run: d.run + 1, fase: d.fase === 1 ? 2 : d.fase === 2 ? 3 : 4, xp }))}
    />
  );
}

function OfficeDay({
  onRoomChange,
  crossword,
  phrases,
  quiz,
  wordSearch,
  hangman,
  surpriseQuiz,
  ritaCrossword,
  alignmentQuiz,
  bathroomWordSearch,
  trainingPhrases,
  trainingQuiz,
  trainingWordSearch,
  missionTime = MISSAO_PCS.tempo,
  startAt = 1,
  fase = 1,
  startXp = FASE1_XP,
  onMissionComplete,
  onDayComplete,
  onRestart,
  onNextDay,
}: OfficeGameProps & { startXp?: number; onRestart: () => void; onNextDay: (xp: number) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const alive = useRef(true);
  const roomCb = useRef(onRoomChange);
  roomCb.current = onRoomChange;

  const [room, setRoom] = useState<Room | null>(null);
  const [overview, setOverview] = useState(false);
  const [debug, setDebug] = useState(false);
  const [phase, setPhase] = useState<Phase>('explore');
  const [balloonAt, setBalloonAt] = useState({ x: 0, y: 0 });
  const [xp, setXp] = useState(0);
  const [missionDone, setMissionDone] = useState(false);
  const [enteredBuilding, setEnteredBuilding] = useState(false);
  const [dialog, setDialog] = useState<{ lines: Line[]; i: number; done: () => void } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // missão 2
  const [m2, setM2State] = useState<Mission2>('off');
  const m2Ref = useRef<Mission2>('off');
  const setM2 = (v: Mission2) => {
    m2Ref.current = v;
    setM2State(v);
  };
  const pcStates = useRef<PcState[]>(PC_MODELS.map(newPcState));
  const [openPc, setOpenPc] = useState<number | null>(null);
  const [signCount, setSignCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(missionTime);
  const deadline = useRef(0);
  /** Resultado da última rodada (`true` = computador ligado certo) e quem foi reclamar. */
  const lastOk = useRef<boolean[]>([]);
  const complainer = useRef(0);

  // missão 3
  const [m3, setM3State] = useState<Mission3>('off');
  const m3Ref = useRef<Mission3>('off');
  const setM3 = (v: Mission3) => {
    m3Ref.current = v;
    setM3State(v);
  };
  const kitStates = useRef<KitState[]>(KITS.map(newKitState));
  const [openKit, setOpenKit] = useState<number | null>(null);
  const [kitsDone, setKitsDone] = useState(0);
  /** A Rita chega no RH (para o diálogo esperar por ela). */
  const ritaArrived = useRef<Promise<void>>(Promise.resolve());
  const started = useRef(false);

  // missão 4
  const [m4, setM4State] = useState<Mission4>('off');
  const m4Ref = useRef<Mission4>('off');
  const setM4 = (v: Mission4) => {
    m4Ref.current = v;
    setM4State(v);
  };
  // missão 5
  const [m5, setM5State] = useState<Mission5>('off');
  const m5Ref = useRef<Mission5>('off');
  const setM5 = (v: Mission5) => {
    m5Ref.current = v;
    setM5State(v);
  };
  // missão 6
  const [m6, setM6State] = useState<Mission6>('off');
  const m6Ref = useRef<Mission6>('off');
  const setM6 = (v: Mission6) => {
    m6Ref.current = v;
    setM6State(v);
  };
  const power = useRef<Record<string, PowerState>>(newPowerStates());
  const [openOs, setOpenOs] = useState<string | null>(null);
  const [pcsOn, setPcsOn] = useState(OFFICE_PCS.length);

  // fase 2, missão 1
  const [f2, setF2State] = useState<Fase2M1>('off');
  const f2Ref = useRef<Fase2M1>('off');
  const setF2 = (v: Fase2M1) => {
    f2Ref.current = v;
    setF2State(v);
  };
  const [f2b, setF2bState] = useState<Fase2M2>('off');
  const f2bRef = useRef<Fase2M2>('off');
  const setF2b = (v: Fase2M2) => {
    f2bRef.current = v;
    setF2bState(v);
  };
  // fase 2, missão 3
  const [f3, setF3State] = useState<Fase2M3>('off');
  const f3Ref = useRef<Fase2M3>('off');
  const setF3 = (v: Fase2M3) => {
    f3Ref.current = v;
    setF3State(v);
  };
  /** Móveis onde o ESTAGIÁRIO já procurou. */
  const searched = useRef(new Set<string>());
  const collectedRef = useRef(0);
  const [collected, setCollected] = useState(0);
  /** Placa que acabou de pegar (em destaque) e quantas terá com ela. */
  const [picked, setPicked] = useState<{ model: BoardModel; count: number } | null>(null);
  // fase 2, missão 4
  const [f4, setF4State] = useState<Fase2M4>('off');
  const f4Ref = useRef<Fase2M4>('off');
  const setF4 = (v: Fase2M4) => {
    f4Ref.current = v;
    setF4State(v);
  };
  const [clockShow, setClockShow] = useState(false);
  const jingle = useRef<Jingle | null>(null);
  // fase 2, missão 5
  const [f5, setF5State] = useState<Fase2M5>('off');
  const f5Ref = useRef<Fase2M5>('off');
  const setF5 = (v: Fase2M5) => {
    f5Ref.current = v;
    setF5State(v);
  };
  // fase 3, missão 1
  const [p1, setP1State] = useState<Fase3M1>('off');
  const p1Ref = useRef<Fase3M1>('off');
  const setP1 = (v: Fase3M1) => {
    p1Ref.current = v;
    setP1State(v);
  };
  // fase 3, missão 2
  const [p2, setP2State] = useState<Fase3M2>('off');
  const p2Ref = useRef<Fase3M2>('off');
  const setP2 = (v: Fase3M2) => {
    p2Ref.current = v;
    setP2State(v);
  };
  // fase 3, missão 3
  const [p3, setP3State] = useState<Fase3M3>('off');
  const p3Ref = useRef<Fase3M3>('off');
  const setP3 = (v: Fase3M3) => {
    p3Ref.current = v;
    setP3State(v);
  };
  /** Montagem de cada computador (continua de onde parou ao fechar o modal) e os que já ligaram. */
  const builds = useRef<Record<BuildId, BuildState>>({ estudante: newBuildState(), gamer: newBuildState(), escritorio: newBuildState() });
  const [buildsDone, setBuildsDone] = useState<BuildId[]>([]);
  const buildsDoneRef = useRef<BuildId[]>([]);
  const [openBuild, setOpenBuild] = useState<number | null>(null);
  const [, setBuildTick] = useState(0);
  // fase 3, missão 4
  const [p4, setP4State] = useState<Fase3M4>('off');
  const p4Ref = useRef<Fase3M4>('off');
  const setP4 = (v: Fase3M4) => {
    p4Ref.current = v;
    setP4State(v);
  };
  // fase 3, missão 5
  const [p5, setP5State] = useState<Fase3M5>('off');
  const p5Ref = useRef<Fase3M5>('off');
  const setP5 = (v: Fase3M5) => {
    p5Ref.current = v;
    setP5State(v);
  };
  const deadline5 = useRef(0);
  // fase 4, missão 1
  const [q1, setQ1State] = useState<Fase4M1>('off');
  const q1Ref = useRef<Fase4M1>('off');
  const setQ1 = (v: Fase4M1) => {
    q1Ref.current = v;
    setQ1State(v);
  };
  /** Instalação do projetor e da webcam (continua de onde parou ao fechar o modal). */
  const [setup, setSetup] = useState<SetupState>(() => newSetupState());
  // fase 4, missão 2
  const [q2, setQ2State] = useState<Fase4M2>('off');
  const q2Ref = useRef<Fase4M2>('off');
  const setQ2 = (v: Fase4M2) => {
    q2Ref.current = v;
    setQ2State(v);
  };
  /** Os cabos da impressora, se ela já ligou e se as cópias já saíram (continua de onde parou ao fechar). */
  const [printer, setPrinterState] = useState<PrinterState>(() => newPrinterState());
  const printerRef = useRef<PrinterState>(printer);
  const setPrinter = (p: PrinterState) => {
    printerRef.current = p;
    setPrinterState(p);
  };
  // fase 4, missão 3
  const [q3, setQ3State] = useState<Fase4M3>('off');
  const q3Ref = useRef<Fase4M3>('off');
  const setQ3 = (v: Fase4M3) => {
    q3Ref.current = v;
    setQ3State(v);
  };
  // fase 4, missão 4
  const [q4, setQ4State] = useState<Fase4M4>('off');
  const q4Ref = useRef<Fase4M4>('off');
  const setQ4 = (v: Fase4M4) => {
    q4Ref.current = v;
    setQ4State(v);
  };
  // fase 4, missão 5
  const [q5, setQ5State] = useState<Fase4M5>('off');
  const q5Ref = useRef<Fase4M5>('off');
  const setQ5 = (v: Fase4M5) => {
    q5Ref.current = v;
    setQ5State(v);
  };
  /** Já viu a impressora off-line no PC (o "!" passa para a impressora). */
  const [pcSeen, setPcSeenState] = useState(false);
  const pcSeenRef = useRef(false);
  const setPcSeen = (v: boolean) => {
    pcSeenRef.current = v;
    setPcSeenState(v);
  };
  const [secondsLeft5, setSecondsLeft5] = useState<number>(MISSAO_BANHEIRO.tempo);
  /** Mochila (uma peça de cada tipo) e os itens da lista que o Marcos já recebeu certos. */
  const [bag, setBagState] = useState<Bag>({});
  const bagRef = useRef<Bag>({});
  const setBag = (b: Bag) => {
    bagRef.current = b;
    setBagState(b);
  };
  const [delivered, setDeliveredState] = useState<ReadonlySet<PartKind>>(new Set());
  const deliveredRef = useRef<ReadonlySet<PartKind>>(new Set());
  const setDelivered = (d: ReadonlySet<PartKind>) => {
    deliveredRef.current = d;
    setDeliveredState(d);
  };
  /** Peça na mão (e onde estava no chão); `part: null` = só olhando a lista. */
  const [held, setHeld] = useState<{ part: Part | null; at?: { x: number; y: number } } | null>(null);
  // fim do 2º dia
  const [fEnd, setFEndState] = useState<Fase2Fim>('off');
  const fEndRef = useRef<Fase2Fim>('off');
  const setFEnd = (v: Fase2Fim) => {
    fEndRef.current = v;
    setFEndState(v);
  };
  /** Respostas do exercício já enviadas pelo celular (e o resultado do último quiz). */
  const [attempts, setAttempts] = useState<ExerciseCheck[]>([]);
  const attemptsRef = useRef<ExerciseCheck[]>([]);
  const lastExercise = useRef<GameResult | null>(null);
  const phoneSeen = useRef(false);
  const survey = useRef<Survey>({});
  const [tagged, setTagged] = useState(0);
  const [openDevice, setOpenDevice] = useState<string | null>(null);

  /** Tudo o que mudou o XP no dia (para o resumo do fim da fase). */
  const xpLog = useRef<XpEntry[]>([]);
  const xpNow = useRef(0);
  const setXpTo = (v: number) => {
    xpNow.current = v;
    setXp(v);
  };
  const addXp = (m: { id: string; title: string }, delta: number, note?: string) => {
    xpLog.current.push({ mission: m.id, title: m.title, xp: delta, note });
    setXpTo(Math.max(0, xpNow.current + delta));
  };
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const roomRef = useRef<Room | null>(null);

  const scene = () => (gameRef.current ? getOfficeScene(gameRef.current) : null);
  const refocus = () => hostRef.current?.focus();

  // Os eventos do Phaser chamam a versão mais nova destas funções.
  const handlers = useRef({
    talk: () => {},
    pc: (_i: number) => {},
    box: (_i: number) => {},
    spot: (_id: string) => {},
    pickup: (_id: string, _at: { x: number; y: number }) => {},
    room: (_r: Room | null) => {},
    endRound: (_r: 'tempo' | 'todas') => {},
    timeUp5: () => {},
  });

  useEffect(() => {
    alive.current = true;
    const host = hostRef.current!;
    const game = createOfficeGame(host);
    gameRef.current = game;
    // em desenvolvimento, deixa o jogo acessível no console (e nos testes de navegador)
    if (import.meta.env.DEV) (window as unknown as { __officeGame?: Phaser.Game }).__officeGame = game;
    game.events.on(OFFICE_EVENTS.room, (r: Room | null) => {
      setRoom(r);
      roomRef.current = r;
      if (r?.id !== 'entrada') setEnteredBuilding(true);
      roomCb.current?.(r);
      handlers.current.room(r);
    });
    game.events.on(OFFICE_EVENTS.overview, setOverview);
    game.events.on(OFFICE_EVENTS.debug, setDebug);
    game.events.on(OFFICE_EVENTS.talk, () => handlers.current.talk());
    game.events.on(OFFICE_EVENTS.pc, (i: number) => handlers.current.pc(i));
    game.events.on(OFFICE_EVENTS.box, (i: number) => handlers.current.box(i));
    game.events.on(OFFICE_EVENTS.spot, (id: string) => handlers.current.spot(id));
    game.events.on(OFFICE_EVENTS.pickup, (id: string, at: { x: number; y: number }) => handlers.current.pickup(id, at));
    host.focus();
    return () => {
      alive.current = false;
      gameRef.current = null;
      game.destroy(true);
    };
  }, []);

  // contagem regressiva da missão 2
  useEffect(() => {
    if (m2 !== 'running') return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) handlers.current.endRound('tempo');
    }, 250);
    return () => window.clearInterval(id);
  }, [m2]);

  // contagem regressiva da fase 3, missão 5 (até o mictório)
  useEffect(() => {
    if (p5 !== 'running') return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline5.current - Date.now()) / 1000));
      setSecondsLeft5(left);
      if (left <= 0) handlers.current.timeUp5();
    }, 250);
    return () => window.clearInterval(id);
  }, [p5]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  /** Calcula onde fica a cabeça do personagem dentro do palco, para o balão. */
  const placeBalloon = () => {
    const s = scene();
    const canvas = hostRef.current?.querySelector('canvas');
    const stage = stageRef.current;
    if (!s || !canvas || !stage) return;
    const pos = s.playerScreenPosition();
    const c = canvas.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    setBalloonAt({ x: c.left - st.left + pos.x * c.width, y: c.top - st.top + pos.y * c.height });
  };

  const backToExplore = () => {
    setPhase('explore');
    scene()?.setFrozen(false);
    refocus();
  };

  /** Mostra uma sequência de falas; `done` roda depois da última. */
  const say = (lines: Line[], done: () => void) => {
    scene()?.setFrozen(true);
    setDialog({ lines, i: 0, done });
    setPhase('dialog');
  };

  const nextLine = () => {
    if (!dialog) return;
    if (dialog.i + 1 < dialog.lines.length) {
      setDialog({ ...dialog, i: dialog.i + 1 });
      return;
    }
    setDialog(null);
    setPhase('explore');
    dialog.done();
  };

  // ------------------------------------------------------------ missão 1

  const finishGame = (result: GameResult | null) => {
    if (!result) {
      // desistiu: o CEO continua frustrado e puxa conversa de novo quando você voltar
      backToExplore();
      return;
    }
    addXp(MISSAO_CEO, MISSAO_CEO.xp);
    setMissionDone(true);
    const s = scene();
    s?.setCeoTalk(false);
    s?.setCeoMood('feliz');
    say([ceo(MISSAO_CEO.celebration, 'ceo-feliz-a', { badge: `+${MISSAO_CEO.xp} XP · Missão concluída!`, continueLabel: 'Valeu, chefe!' })], () => {
      scene()?.setCeoMood('tranquilo');
      onMissionComplete?.({ missionId: MISSAO_CEO.id, xp: MISSAO_CEO.xp, success: true, game: result });
      briefing();
    });
  };

  // ------------------------------------------------------------ missão 2

  const briefing = () => {
    const texts = MISSAO_PCS.briefing(tempoPorExtenso(missionTime));
    say(
      texts.map((t, i) => ceo(t, 'ceo-feliz-b', i === texts.length - 1 ? { continueLabel: 'Começar!' } : {})),
      startRound,
    );
  };

  /** A equipe vai para a reunião e o tempo começa a contar. */
  const startRound = () => {
    const s = scene();
    if (!s) return;
    pcStates.current = PC_MODELS.map(newPcState);
    setSignCount(0);
    s.resetMission2();
    s.setCeoMood('tranquilo');
    s.setCeoTalk(false);
    deadline.current = Date.now() + missionTime * 1000;
    setSecondsLeft(missionTime);
    setM2('running');
    s.setPcZones(true);
    backToExplore();
    setToast('A equipe foi para a Sala de Reuniões. Corra para a Área de Trabalho!');
    void s.startMeeting();
  };

  const openStation = (i: number) => {
    if (m2Ref.current !== 'running') return;
    scene()?.setFrozen(true);
    setOpenPc(i);
    setPhase('pc');
  };

  const updatePc = (i: number, st: PcState) => {
    pcStates.current[i] = st;
    scene()?.setPcState(i, { glow: st.monitorOn, sign: st.sign });
  };

  const closePc = (i: number, signed: boolean) => {
    if (m2Ref.current !== 'running') return; // o tempo acabou com o modal aberto
    setOpenPc(null);
    backToExplore();
    if (!signed) return;
    updatePc(i, { ...pcStates.current[i], sign: true });
    const count = pcStates.current.filter((p) => p.sign).length;
    setSignCount(count);
    if (count === PC_MODELS.length) window.setTimeout(() => handlers.current.endRound('todas'), 1200);
  };

  /** Fim do tempo (ou todas as placas colocadas): a equipe volta e senta. */
  const endRound = async (reason: 'tempo' | 'todas') => {
    if (m2Ref.current !== 'running') return;
    const s = scene();
    if (!s) return;
    setM2('returning');
    s.setPcZones(false);
    if (openPc !== null || phase === 'pc') {
      setOpenPc(null);
      backToExplore();
    }
    setToast(
      reason === 'tempo'
        ? '⏰ Acabou o tempo! A equipe está voltando da reunião.'
        : '✅ Todas as mesas com placa! A equipe está voltando da reunião.',
    );
    const ok = pcStates.current.map(isPcReady);
    lastOk.current = ok;
    await s.returnToDesks(ok);
    if (!alive.current) return;

    if (ok.every(Boolean)) {
      s.setCeoMood('feliz');
      addXp(MISSAO_PCS, MISSAO_PCS.xp);
      say([ceo(MISSAO_PCS.success, 'ceo-feliz-a', { badge: `+${MISSAO_PCS.xp} XP · Missão concluída!`, continueLabel: 'Valeu, chefe!' })], () => {
        scene()?.setCeoMood('tranquilo');
        setM2('done');
        onMissionComplete?.({ missionId: MISSAO_PCS.id, xp: MISSAO_PCS.xp, success: true });
        callToRh();
      });
      return;
    }

    // um colega sem computador vai reclamar com o chefe
    const first = ok.indexOf(false);
    complainer.current = first;
    s.setCeoMood('frustrado');
    await s.complain(first);
    if (!alive.current) return;
    say(
      [
        { speaker: PC_MODELS[first].owner, portrait: `colega:${WORKSTATIONS[first].look}`, text: MISSAO_PCS.complaint },
        ceo(MISSAO_PCS.call, 'ceo-bravo-a'),
      ],
      () => {
        setM2('called');
        scene()?.setCeoTalk(true);
        backToExplore();
      },
    );
  };

  /** O ESTAGIÁRIO chegou na Diretoria depois de ser chamado: bronca, −XP e nova chance. */
  const scolding = () => {
    const s = scene();
    if (!s) return;
    s.setCeoTalk(false);
    const wrong = lastOk.current.flatMap((ok, i) => (ok ? [] : [i]));
    const first = complainer.current;
    const back = s.backToDesk(first, true);
    addXp(MISSAO_PCS, -MISSAO_PCS.penalty, 'Bronca do chefe: computador mal ligado');
    const lessons = wrong.map((i) =>
      ceo(
        `Estação ${i + 1}, mesa de ${PC_MODELS[i].owner}: ${diagnose(PC_MODELS[i], pcStates.current[i])}. Preste atenção: ${PC_MODELS[i].lesson}`,
        'ceo-bravo-b',
      ),
    );
    say([ceo(MISSAO_PCS.scolding(PC_MODELS[first].owner, wrong.length), 'ceo-bravo-a', { badge: `−${MISSAO_PCS.penalty} XP` }), ...lessons], async () => {
      scene()?.setFrozen(true);
      await back;
      if (!alive.current) return;
      onMissionComplete?.({ missionId: MISSAO_PCS.id, xp: -MISSAO_PCS.penalty, success: false });
      say([ceo(MISSAO_PCS.retry, 'ceo-bravo-a', { continueLabel: 'Tentar de novo' })], startRound);
    });
  };

  // ------------------------------------------------------------ missão 3

  const rita = (text: string, extra: Partial<Line> = {}): Line => ({
    speaker: MISSAO_MONTAGEM.rh,
    portrait: `colega:${RH_LOOK}`,
    text,
    ...extra,
  });

  /** O CEO avisa que o RH chamou; a Rita sai da Copa e vai esperar no RH. */
  const callToRh = () => {
    say([ceo(MISSAO_MONTAGEM.call, 'ceo-feliz-b', { continueLabel: 'Estou indo!' })], () => {
      const s = scene();
      if (!s) return;
      setM3('called');
      ritaArrived.current = s.rhWalkTo(RH_WAIT, 'down');
      backToExplore();
    });
  };

  /** Entrou no RH depois de chamado: a Rita explica a tarefa e vai tomar café. */
  const meetRita = async () => {
    const s = scene();
    if (!s) return;
    setM3('working');
    s.setFrozen(true);
    await ritaArrived.current;
    if (!alive.current) return;
    const lines = MISSAO_MONTAGEM.briefing.map((t, i, all) => rita(t, i === all.length - 1 ? { continueLabel: 'Combinado!' } : {}));
    say(lines, () => {
      const sc = scene();
      if (!sc) return;
      sc.setBoxZones(true);
      void sc.rhWalkTo(RH_HOME, 'up');
      backToExplore();
    });
  };

  const openBox = (i: number) => {
    if (m3Ref.current !== 'working' && m3Ref.current !== 'fixing') return;
    scene()?.setFrozen(true);
    setOpenKit(i);
    setPhase('kit');
  };

  const updateKit = (i: number, st: KitState) => {
    kitStates.current[i] = st;
    scene()?.setRhStation(i, { built: allPlaced(st), boxOpen: st.placed.length > 0 });
    setKitsDone(kitStates.current.filter((k) => k.done).length);
  };

  const closeKit = (i: number, done: boolean) => {
    setOpenKit(null);
    backToExplore();
    if (done) updateKit(i, { ...kitStates.current[i], done: true });
    if (kitStates.current.every((k) => k.done)) void checkAssembly();
  };

  /** A Rita volta (ou, se já está no RH, só confere): passa em cada mesa e dá o resultado. */
  const checkAssembly = async () => {
    const s = scene();
    if (!s) return;
    setM3('checking');
    s.setBoxZones(false);
    setToast(MISSAO_MONTAGEM.checking);
    for (const st of RH_STATIONS) {
      await s.rhWalkTo(st.spot, 'up');
      await new Promise((r) => window.setTimeout(r, 900));
      if (!alive.current) return;
    }
    await s.rhWalkTo(RH_WAIT, 'down');
    if (!alive.current) return;
    const errors = KITS.map((k, i) => checkKit(k, kitStates.current[i]));
    if (errors.every((e) => e.length === 0)) {
      addXp(MISSAO_MONTAGEM, MISSAO_MONTAGEM.xp);
      say([rita(MISSAO_MONTAGEM.success, { badge: `+${MISSAO_MONTAGEM.xp} XP · Missão concluída!`, continueLabel: 'Obrigado, Rita!' })], () => {
        setM3('done');
        void scene()?.rhWalkTo(RH_HOME, 'up');
        backToExplore();
        onMissionComplete?.({ missionId: MISSAO_MONTAGEM.id, xp: MISSAO_MONTAGEM.xp, success: true });
        void startMission4();
      });
      return;
    }
    addXp(MISSAO_MONTAGEM, -MISSAO_MONTAGEM.penalty, 'A Rita achou erro na montagem');
    const details = errors.flatMap((e, i) => (e.length ? [rita(`No computador do ${KITS[i].room}: ${e.join(' ')}`)] : []));
    say([rita(MISSAO_MONTAGEM.problems, { badge: `−${MISSAO_MONTAGEM.penalty} XP` }), ...details, rita(MISSAO_MONTAGEM.fixIt, { continueLabel: 'Vou corrigir' })], () => {
      errors.forEach((e, i) => {
        if (e.length) updateKit(i, { ...kitStates.current[i], done: false });
      });
      setM3('fixing');
      scene()?.setBoxZones(true);
      backToExplore();
      onMissionComplete?.({ missionId: MISSAO_MONTAGEM.id, xp: -MISSAO_MONTAGEM.penalty, success: false });
    });
  };

  // ------------------------------------------------------------ missão 4

  const bruno = (text: string, extra: Partial<Line> = {}): Line => ({
    speaker: PC_MODELS[MISSAO_QUADRO.colleague].owner,
    portrait: `colega:${WORKSTATIONS[MISSAO_QUADRO.colleague].look}`,
    text,
    ...extra,
  });

  /** Espera o ESTAGIÁRIO ficar livre (sem diálogo nem modal aberto). */
  const whenFree = () =>
    new Promise<void>((resolve) => {
      const check = () => (phaseRef.current === 'explore' || !alive.current ? resolve() : window.setTimeout(check, 300));
      check();
    });

  /** O Bruno vai até o quadro branco, esbarra, os cards caem e ele chama o ESTAGIÁRIO. */
  const startMission4 = async () => {
    const s = scene();
    if (!s) return;
    setM4('walking');
    await s.bumpBoard(MISSAO_QUADRO.colleague);
    if (!alive.current) return;
    setToast(MISSAO_QUADRO.crash);
    await whenFree();
    if (!alive.current) return;
    say([bruno(MISSAO_QUADRO.call, { continueLabel: 'Estou indo!' })], () => {
      setM4('called');
      backToExplore();
      // se o ESTAGIÁRIO já está na sala, a conversa começa na hora
      if (roomRef.current?.id === 'reunioes') meetBruno();
    });
  };

  const meetBruno = () => {
    say([bruno(MISSAO_QUADRO.greeting), bruno(MISSAO_QUADRO.plea)], () => {
      scene()?.setFrozen(true);
      placeBalloon();
      setPhase('ask4');
    });
  };

  const finishBoard = (result: GameResult | null) => {
    if (!result) {
      // desistiu: o Bruno continua esperando no quadro
      backToExplore();
      return;
    }
    const s = scene();
    s?.restoreBoard();
    s?.setWalkerAlert(MISSAO_QUADRO.colleague, false);
    addXp(MISSAO_QUADRO, MISSAO_QUADRO.xp);
    say([bruno(MISSAO_QUADRO.success, { badge: `+${MISSAO_QUADRO.xp} XP · Missão concluída!`, continueLabel: 'De nada!' })], () => {
      setM4('done');
      void scene()?.backToDesk(MISSAO_QUADRO.colleague, false);
      backToExplore();
      onMissionComplete?.({ missionId: MISSAO_QUADRO.id, xp: MISSAO_QUADRO.xp, success: true, game: result });
      void startMission5();
    });
  };

  // ------------------------------------------------------------ missão 5

  const elisa = (text: string, extra: Partial<Line> = {}): Line => ({
    speaker: PC_MODELS[MISSAO_PROVA.colleague].owner,
    portrait: `colega:${WORKSTATIONS[MISSAO_PROVA.colleague].look}`,
    text,
    ...extra,
  });

  /**
   * A Elisa vai até a Copa e conversa com a Rita (a câmera mostra a cena). Fica sabendo do ESTAGIÁRIO,
   * vai para o cantinho com o tablet e chama ele discretamente.
   */
  const startMission5 = async () => {
    const s = scene();
    if (!s) return;
    setM5('gossip');
    await new Promise((r) => window.setTimeout(r, 1500));
    if (!alive.current) return;
    await s.chatAtCopa(MISSAO_PROVA.colleague);
    if (!alive.current) return;
    await whenFree();
    if (!alive.current) return;
    const copa = ROOMS.find((r) => r.id === 'copa')!;
    s.setFrozen(true);
    setPhase('dialog');
    await s.lookAt(copa.x + copa.w / 2, copa.y + copa.h / 2);
    if (!alive.current) return;
    const lines = MISSAO_PROVA.gossip.map((g) => (g.who === 'rita' ? rita(g.text) : elisa(g.text)));
    say(lines, async () => {
      const sc = scene();
      if (!sc) return;
      sc.setFrozen(true);
      setPhase('dialog');
      await sc.goToCorner(MISSAO_PROVA.colleague);
      if (!alive.current) return;
      await sc.lookAtPlayer();
      if (!alive.current) return;
      say([elisa(MISSAO_PROVA.call, { continueLabel: 'Estou indo!' })], () => {
        setM5('called');
        backToExplore();
        if (roomRef.current?.id === 'copa') meetElisa();
      });
    });
  };

  /** Chegou na Copa: a Elisa mostra o tablet e pede ajuda. */
  const meetElisa = () => {
    say([elisa(MISSAO_PROVA.greeting), elisa(MISSAO_PROVA.plea)], askElisa);
  };

  const askElisa = () => {
    scene()?.setFrozen(true);
    placeBalloon();
    setPhase('ask5');
  };

  const finishTablet = (result: GameResult | null) => {
    if (!result) {
      // desistiu: a Elisa continua esperando no canto da Copa
      backToExplore();
      return;
    }
    const right = Number(result.details.correct);
    const total = Number(result.details.total);
    if (right < total) {
      say([elisa(MISSAO_PROVA.retry(right, total))], askElisa);
      return;
    }
    say([elisa(MISSAO_PROVA.hug, { continueLabel: 'Vem!' })], async () => {
      const s = scene();
      if (!s) return;
      s.setFrozen(true);
      setPhase('dialog');
      await s.hug(MISSAO_PROVA.colleague);
      if (!alive.current) return;
      addXp(MISSAO_PROVA, MISSAO_PROVA.xp);
      say([elisa(MISSAO_PROVA.success, { badge: `+${MISSAO_PROVA.xp} XP · Missão concluída!`, continueLabel: 'De nada!' })], () => {
        setM5('done');
        void scene()?.backToDesk(MISSAO_PROVA.colleague, false);
        backToExplore();
        onMissionComplete?.({ missionId: MISSAO_PROVA.id, xp: MISSAO_PROVA.xp, success: true, game: result });
        void startMission6();
      });
    });
  };

  // ------------------------------------------------------------ missão 6

  const spotsFor6 = () => [...PC_SPOTS.map((sp) => ({ id: sp.pc.id, zone: sp.zone })), { id: 'alarme', zone: ALARM_ZONE }];
  const lightOf = (st: PowerState) => (st === 'off' ? 'off' : st === 'sleep' ? 'sleep' : 'on');

  /** Fim do expediente: escurece, todos vão embora e o chefe chama o ESTAGIÁRIO. */
  const startMission6 = async () => {
    const s = scene();
    if (!s) return;
    setM6('leaving');
    await new Promise((r) => window.setTimeout(r, 1500));
    if (!alive.current) return;
    power.current = newPowerStates();
    setPcsOn(OFFICE_PCS.length);
    s.clearMission2();
    s.setNight(1);
    PC_SPOTS.forEach((sp) => s.setScreenLight(sp.pc.id, sp.monitor, 'on'));
    setToast(MISSAO_FIM.endOfDay);
    void s.everyoneLeaves(WORKSTATIONS.map((w) => w.index));
    await new Promise((r) => window.setTimeout(r, 3500));
    await whenFree();
    if (!alive.current) return;
    say([ceo(MISSAO_FIM.call, 'ceo-feliz-b', { continueLabel: 'Estou indo!' })], () => {
      setM6('called');
      scene()?.setCeoTalk(true);
      backToExplore();
    });
  };

  /** Na Diretoria: o CEO explica a última tarefa, passa a senha do alarme e vai embora. */
  const ceoBriefing6 = () => {
    const s = scene();
    if (!s) return;
    s.setCeoTalk(false);
    const lines = MISSAO_FIM.briefing.map((t, i, all) => ceo(t, 'ceo-feliz-b', i === all.length - 1 ? { continueLabel: 'Até amanhã, chefe!' } : {}));
    say(lines, () => {
      const sc = scene();
      if (!sc) return;
      setM6('working');
      sc.setSpots(spotsFor6());
      void sc.ceoLeaves();
      backToExplore();
    });
  };

  const onSpot = (id: string) => {
    if (m6Ref.current !== 'working' || phaseRef.current !== 'explore') return;
    if (id === 'alarme') {
      scene()?.setFrozen(true);
      setPhase('alarm');
      return;
    }
    if (power.current[id] === 'off') {
      setToast(MISSAO_FIM.alreadyOff);
      return;
    }
    scene()?.setFrozen(true);
    setOpenOs(id);
    setPhase('os');
  };

  const updatePower = (id: string, st: PowerState) => {
    power.current = { ...power.current, [id]: st };
    const sp = PC_SPOTS.find((x) => x.pc.id === id)!;
    scene()?.setScreenLight(id, sp.monitor, lightOf(st));
    setPcsOn(stillOn(power.current).length);
  };

  const closeOs = () => {
    setOpenOs(null);
    backToExplore();
  };

  const armAlarm = () => {
    setM6('armed');
    scene()?.setSpots([]);
    setToast(MISSAO_FIM.armed);
    backToExplore();
  };

  /** Saiu com o alarme ativado: tranca a porta e confere se ficou computador ligado. */
  const lockUp = async () => {
    const s = scene();
    if (!s) return;
    setM6('checking');
    s.lockDoor(true);
    s.setNight(2);
    setToast(MISSAO_FIM.locked);
    await new Promise((r) => window.setTimeout(r, 2200));
    if (!alive.current) return;
    const on = stillOn(power.current);
    if (on.length) {
      setToast(MISSAO_FIM.siren);
      s.setSiren(true);
      playSiren(2600);
      await new Promise((r) => window.setTimeout(r, 2600));
      if (!alive.current) return;
      s.setSiren(false);
      addXp(MISSAO_FIM, -MISSAO_FIM.penalty, `O alarme disparou: ${on.length === 1 ? '1 computador ligado' : `${on.length} computadores ligados`}`);
      const details = on.map((pc) => ceo(describeOn(pc, power.current[pc.id]), 'ceo-bravo-b'));
      say(
        [ceo(MISSAO_FIM.phone(on.length), 'ceo-bravo-a', { badge: `−${MISSAO_FIM.penalty} XP` }), ...details, ceo(MISSAO_FIM.retry, 'ceo-bravo-a', { continueLabel: 'Vou resolver!' })],
        () => {
          const sc = scene();
          if (!sc) return;
          sc.lockDoor(false);
          sc.setNight(1);
          setM6('working');
          sc.setSpots(spotsFor6());
          backToExplore();
          onMissionComplete?.({ missionId: MISSAO_FIM.id, xp: -MISSAO_FIM.penalty, success: false });
        },
      );
      return;
    }
    s.setFrozen(true);
    setPhase('dialog');
    await s.cheer();
    if (!alive.current) return;
    addXp(MISSAO_FIM, MISSAO_FIM.xp);
    say([{ speaker: 'ESTAGIÁRIO', portrait: 'viva-a', text: MISSAO_FIM.victory, badge: `+${MISSAO_FIM.xp} XP · Fase 1 concluída!`, continueLabel: 'Ver o resumo do dia' }], () => {
      setM6('done');
      scene()?.setFrozen(true);
      setPhase('summary');
      onMissionComplete?.({ missionId: MISSAO_FIM.id, xp: MISSAO_FIM.xp, success: true });
      onDayComplete?.({ total: xpNow.current, entries: xpLog.current });
    });
  };

  // ------------------------------------------------------------ fase 2, missão 1: levantamento dos computadores

  const marcos = (text: string, extra: Partial<Line> = {}): Line => ({
    speaker: MISSAO_LEVANTAMENTO.it,
    portrait: 'colega:0',
    text,
    ...extra,
  });

  const spotsForF2 = () => [
    ...SURVEY_DEVICES.map((d) => ({ id: d.id, zone: DEVICE_SPOTS.get(d.id)!.zone })),
    { id: 'marcos', zone: IT_ZONE },
  ];

  /** Começo do 2º dia: os computadores montados ontem estão nas mesas e o chefe chama o ESTAGIÁRIO. */
  const startDay2 = async () => {
    const s = scene();
    if (!s) return;
    setXpTo(startXp);
    setMissionDone(true);
    setM2('done');
    setM3('done');
    setM4('done');
    setM5('done');
    setM6('done');
    s.setCeoTalk(false);
    s.setCeoMood('tranquilo');
    RH_STATIONS.forEach((st) => s.setRhStation(st.index, { built: true, boxOpen: true }));
    setToast(MISSAO_LEVANTAMENTO.dayStart);
    if (startAt > 1) {
      // para testes: as missões anteriores da fase 2 contam como feitas (e entram no resumo do dia)
      const done = [MISSAO_LEVANTAMENTO, MISSAO_CACA, MISSAO_PLACAS, MISSAO_FORCA, MISSAO_EXERCICIO].slice(0, startAt - 1);
      xpLog.current = done.map((m) => ({ mission: m.id, title: m.title, xp: m.xp }));
      setXpTo(startXp + done.reduce((sum, m) => sum + m.xp, 0));
      setF2('done');
      if (startAt === 2) {
        void s.itGuyWaits().then(() => scene()?.setItAlert(false));
        void startF2M2();
        return;
      }
      setF2b('done');
      if (startAt === 3) {
        void s.itGuyWaits().then(() => startF2M3());
        return;
      }
      setF3('done');
      if (startAt === 4) {
        void s.itGuyWaits().then(() => startF2M4());
        return;
      }
      setF4('done');
      if (startAt === 5) {
        void startF2M5();
        return;
      }
      setF5('done');
      void startF2End();
      return;
    }
    await new Promise((r) => window.setTimeout(r, 1800));
    await whenFree();
    if (!alive.current) return;
    say([ceo(MISSAO_LEVANTAMENTO.call, 'ceo-feliz-b', { continueLabel: 'Estou indo!' })], () => {
      setF2('called');
      scene()?.setCeoTalk(true);
      backToExplore();
    });
  };

  /** Na Diretoria: a aula (o que é um computador), a tarefa, a prancheta e os adesivos. */
  const ceoBriefingF2 = () => {
    const s = scene();
    if (!s) return;
    s.setCeoTalk(false);
    const lines = MISSAO_LEVANTAMENTO.briefing.map((t, i, all) =>
      ceo(t, 'ceo-feliz-b', i === all.length - 1 ? { continueLabel: 'Pode deixar!', badge: '📋 Prancheta e cartela de adesivos' } : {}),
    );
    say(lines, () => {
      const sc = scene();
      if (!sc) return;
      setF2('working');
      sc.setSpots(spotsForF2());
      void sc.itGuyWaits();
      backToExplore();
    });
  };

  const onSpotF2 = (id: string) => {
    if (id === 'tablet') {
      if (f4Ref.current !== 'crashed' || phaseRef.current !== 'explore') return;
      say([me(MISSAO_FORCA.found, { continueLabel: 'Pegar o tablet' })], openHangman);
      return;
    }
    if (f3Ref.current === 'called' || f3Ref.current === 'working') {
      onSpotF3(id);
      return;
    }
    if (id === 'quadro') {
      if (f2bRef.current !== 'accepted' || phaseRef.current !== 'explore') return;
      scene()?.setFrozen(true);
      setPhase('board2');
      return;
    }
    if (f2Ref.current !== 'working' || phaseRef.current !== 'explore') return;
    const s = scene();
    if (!s) return;
    s.setFrozen(true);
    if (id === 'marcos') {
      s.itGuyFacePlayer();
      if (!taggedCount(survey.current)) {
        say([marcos(MISSAO_LEVANTAMENTO.noneYet)], backToExplore);
        return;
      }
      placeBalloon();
      setPhase('askF2');
      return;
    }
    setOpenDevice(id);
    setPhase('survey');
  };

  const updateTag = (id: string, tag: DeviceTag) => {
    survey.current = { ...survey.current, [id]: tag };
    setTagged(taggedCount(survey.current));
    scene()?.setSticker(id, DEVICE_SPOTS.get(id)!.point, tag.sticker);
  };

  const closeSurvey = () => {
    setOpenDevice(null);
    backToExplore();
  };

  /** O Marcos confere a prancheta e os adesivos. */
  const checkSurveyF2 = () => {
    const s = scene();
    if (!s) return;
    setF2('checking');
    s.setItAlert(false);
    const problems = checkSurvey(survey.current);
    if (!problems.length) {
      addXp(MISSAO_LEVANTAMENTO, MISSAO_LEVANTAMENTO.xp);
      say(
        [
          marcos(MISSAO_LEVANTAMENTO.checking),
          marcos(MISSAO_LEVANTAMENTO.success(SURVEY_DEVICES.length), {
            badge: `+${MISSAO_LEVANTAMENTO.xp} XP · Missão concluída!`,
            continueLabel: 'Valeu, Marcos!',
          }),
        ],
        () => {
          setF2('done');
          scene()?.setSpots([]);
          backToExplore();
          onMissionComplete?.({ missionId: MISSAO_LEVANTAMENTO.id, xp: MISSAO_LEVANTAMENTO.xp, success: true });
          void startF2M2();
        },
      );
      return;
    }
    addXp(MISSAO_LEVANTAMENTO, -MISSAO_LEVANTAMENTO.penalty, 'O Marcos achou erro no levantamento');
    const all = explainProblems(problems);
    const shown = all.slice(0, 6);
    const details = shown.map((t) => marcos(t));
    if (all.length > shown.length) details.push(marcos(MISSAO_LEVANTAMENTO.more(all.length - shown.length)));
    const wrongCount = new Set(problems.map((p) => p.device.id)).size;
    say(
      [
        marcos(MISSAO_LEVANTAMENTO.checking),
        marcos(MISSAO_LEVANTAMENTO.problems(wrongCount), { badge: `−${MISSAO_LEVANTAMENTO.penalty} XP` }),
        ...details,
        marcos(MISSAO_LEVANTAMENTO.fixIt, { continueLabel: 'Vou corrigir' }),
      ],
      () => {
        const sc = scene();
        if (!sc) return;
        const before = survey.current;
        survey.current = clearWrong(before, problems);
        for (const id of Object.keys(before)) if (!survey.current[id]) sc.setSticker(id, DEVICE_SPOTS.get(id)!.point, null);
        setTagged(taggedCount(survey.current));
        sc.setItAlert(true);
        setF2('working');
        sc.setSpots(spotsForF2());
        backToExplore();
        onMissionComplete?.({ missionId: MISSAO_LEVANTAMENTO.id, xp: -MISSAO_LEVANTAMENTO.penalty, success: false });
      },
    );
  };

  // ------------------------------------------------------------ fase 2, missão 2: caça-palavras no quadro

  const colleague = (index: number) => (text: string, extra: Partial<Line> = {}): Line => ({
    speaker: PC_MODELS[index].owner,
    portrait: `colega:${WORKSTATIONS[index].look}`,
    text,
    ...extra,
  });
  const diego = colleague(MISSAO_CACA.caller);

  /** Três colegas vão até o quadro, que agora tem um caça-palavras; conversam (a câmera mostra) e o Diego chama. */
  const startF2M2 = async () => {
    const s = scene();
    if (!s) return;
    setF2b('chat');
    s.setBoardLetters(true);
    await new Promise((r) => window.setTimeout(r, 1500));
    if (!alive.current) return;
    await s.crowdAtBoard([...MISSAO_CACA.colleagues], BOARD_CROWD);
    if (!alive.current) return;
    await whenFree();
    if (!alive.current) return;
    s.setFrozen(true);
    setPhase('dialog');
    await s.lookAt(BOARD.x + BOARD.w / 2, BOARD.y + 90);
    if (!alive.current) return;
    say(
      MISSAO_CACA.chat.map((c) => colleague(c.who)(c.text)),
      async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        sc.turnWalker(MISSAO_CACA.caller, 'down');
        sc.setWalkerAlert(MISSAO_CACA.caller, true);
        await sc.lookAtPlayer();
        if (!alive.current) return;
        say([diego(MISSAO_CACA.call, { continueLabel: 'Estou indo!' })], () => {
          setF2b('called');
          backToExplore();
          if (roomRef.current?.id === 'reunioes') meetDiego();
        });
      },
    );
  };

  /** Chegou na Sala de Reuniões: o Diego explica e pergunta se o ESTAGIÁRIO ajuda. */
  const meetDiego = () => {
    scene()?.stopChat();
    say([diego(MISSAO_CACA.greeting), diego(MISSAO_CACA.plea)], () => {
      scene()?.setFrozen(true);
      placeBalloon();
      setPhase('askF2b');
    });
  };

  const acceptF2M2 = () => {
    say([diego(MISSAO_CACA.accepted, { continueLabel: 'Bora!' })], () => {
      const s = scene();
      if (!s) return;
      setF2b('accepted');
      s.setWalkerAlert(MISSAO_CACA.caller, false);
      s.setSpots([{ id: 'quadro', zone: BOARD_ZONE }]);
      backToExplore();
    });
  };

  const finishBoard2 = (result: GameResult | null) => {
    if (!result) {
      // desistiu antes de achar todas: precisa refazer (é só chegar no quadro de novo)
      say([diego(MISSAO_CACA.retry, { continueLabel: 'Vou tentar de novo' })], backToExplore);
      return;
    }
    say([diego(MISSAO_CACA.cheer, { continueLabel: 'Uhuu!' })], async () => {
      const s = scene();
      if (!s) return;
      s.setFrozen(true);
      setPhase('dialog');
      s.crowdJump([...MISSAO_CACA.colleagues]);
      await s.cheer();
      if (!alive.current) return;
      addXp(MISSAO_CACA, MISSAO_CACA.xp);
      say([diego(MISSAO_CACA.success, { badge: `+${MISSAO_CACA.xp} XP · Missão concluída!`, continueLabel: 'De nada!' })], () => {
        const sc = scene();
        setF2b('done');
        sc?.setSpots([]);
        void sc?.crowdBack([...MISSAO_CACA.colleagues]);
        backToExplore();
        onMissionComplete?.({ missionId: MISSAO_CACA.id, xp: MISSAO_CACA.xp, success: true, game: result });
        void startF2M3();
      });
    });
  };

  // ------------------------------------------------------------ fase 2, missão 3: placas de desenvolvimento

  const hideoutsLeft = () => HIDEOUTS.filter((h) => !searched.current.has(h.id));
  const spotsForF3 = () => [
    ...hideoutsLeft().map((h) => ({ id: `busca:${h.id}`, zone: HIDE_SPOTS.get(h.id)!.zone })),
    { id: 'marcos', zone: IT_ZONE },
  ];
  const magnifiersForF3 = () => hideoutsLeft().map((h) => ({ id: h.id, at: HIDE_SPOTS.get(h.id)!.top }));

  /** O Marcos (em pé na Sala de TI) chama o ESTAGIÁRIO. */
  const startF2M3 = async () => {
    await new Promise((r) => window.setTimeout(r, 2500));
    await whenFree();
    const s = scene();
    if (!alive.current || !s) return;
    setF3('called');
    await s.itGuyWaits();
    s.setItAlert(true);
    say([marcos(MISSAO_PLACAS.call, { continueLabel: 'Estou indo!' })], () => {
      scene()?.setSpots([{ id: 'marcos', zone: IT_ZONE }]);
      backToExplore();
    });
  };

  const onSpotF3 = (id: string) => {
    if (phaseRef.current !== 'explore') return;
    const s = scene();
    if (!s) return;
    if (id === 'marcos') {
      s.setFrozen(true);
      s.itGuyFacePlayer();
      if (f3Ref.current === 'called') briefingF3();
      else deliverBoards();
      return;
    }
    const h = HIDEOUTS.find((x) => `busca:${x.id}` === id);
    if (f3Ref.current !== 'working' || !h || searched.current.has(h.id)) return;
    void searchHideout(h);
  };

  /** Na Sala de TI: a aula (Arduino e Raspberry Pi) e a tarefa. */
  const briefingF3 = () => {
    scene()?.setItAlert(false);
    const lines = MISSAO_PLACAS.briefing.map((t, i, all) =>
      marcos(t, i === all.length - 1 ? { continueLabel: 'Vou procurar!', badge: '🔍 Procure nos móveis com uma lupa em cima' } : {}),
    );
    say(lines, () => {
      const sc = scene();
      if (!sc) return;
      setF3('working');
      sc.setMagnifiers(magnifiersForF3());
      sc.setSpots(spotsForF3());
      backToExplore();
    });
  };

  /** Procura no móvel: animação e cronômetro na cena; a lupa some e as placas (se tiver) caem no chão. */
  const searchHideout = async (h: Hideout) => {
    const s = scene();
    if (!s) return;
    searched.current.add(h.id);
    s.setFrozen(true);
    setPhase('search');
    s.setMagnifiers(magnifiersForF3());
    s.setSpots(spotsForF3());
    await s.search(
      HIDE_SPOTS.get(h.id)!,
      h.boards.map((model, k) => ({ id: `${h.id}:${k}`, frame: `placa-${BOARDS[model].family}` })),
    );
    if (!alive.current) return;
    backToExplore();
    setToast(h.boards.length ? MISSAO_PLACAS.found(h.boards.length) : MISSAO_PLACAS.empty(h.where));
  };

  /** Chegou perto de uma placa no chão: ela aparece grande. */
  const pickUp = (id: string) => {
    const b = boardById(id);
    if (!b || f3Ref.current !== 'working') return;
    scene()?.setFrozen(true);
    setPicked({ model: b.model, count: collectedRef.current + 1 });
    setPhase('placa');
  };

  /** A placa em destaque some e conta mais uma. */
  const storeBoard = () => {
    collectedRef.current += 1;
    setCollected(collectedRef.current);
    setPicked(null);
    backToExplore();
    if (collectedRef.current === BOARD_TOTAL) setToast(MISSAO_PLACAS.allFound);
  };

  /** Entrega para o Marcos: com as 10, ganha XP; faltando, ele diz quantas e manda voltar a procurar. */
  const deliverBoards = () => {
    const r = checkDelivery(collectedRef.current, searched.current.size);
    if (!r.ok) {
      const text = r.got ? MISSAO_PLACAS.missing(r.got, r.missing, r.allSearched) : MISSAO_PLACAS.noneYet;
      say([marcos(text, { continueLabel: 'Vou procurar' })], backToExplore);
      return;
    }
    const s = scene();
    if (!s) return;
    addXp(MISSAO_PLACAS, MISSAO_PLACAS.xp);
    setF3('done');
    s.setSpots([]);
    s.setItAlert(false);
    say([marcos(MISSAO_PLACAS.success, { badge: `+${MISSAO_PLACAS.xp} XP · Missão concluída!`, continueLabel: 'Uhuu!' })], async () => {
      const sc = scene();
      if (!sc) return;
      sc.setFrozen(true);
      setPhase('dialog');
      await sc.cheer();
      if (!alive.current) return;
      backToExplore();
      onMissionComplete?.({ missionId: MISSAO_PLACAS.id, xp: MISSAO_PLACAS.xp, success: true });
      void startF2M4();
    });
  };

  // ------------------------------------------------------------ fase 2, missão 4: a forca do tablet do Marcos

  /** O ESTAGIÁRIO pensando alto. */
  const me = (text: string, extra: Partial<Line> = {}): Line => ({ speaker: 'ESTAGIÁRIO', portrait: 'estagiario', text, ...extra });

  /** O Marcos senta para jogar forca no tablet; o relógio do topo passa o tempo e ele cochila. */
  const startF2M4 = async () => {
    await new Promise((r) => window.setTimeout(r, 1500));
    await whenFree();
    const s = scene();
    if (!alive.current || !s) return;
    setF4('resting');
    say([marcos(MISSAO_FORCA.rest, { continueLabel: 'Bom descanso!' })], async () => {
      const sc = scene();
      if (!sc) return;
      sc.setFrozen(true);
      setPhase('dialog');
      await sc.itGuySitsDown();
      if (!alive.current) return;
      sc.setItTablet(true);
      await sc.lookAt(IT_SEAT.x, IT_SEAT.y);
      if (!alive.current) return;
      setClockShow(true);
    });
  };

  /** Passou o tempo: ele dorme, o tablet cai (PLAFT) e a musiquinha do jogo continua tocando. */
  const clockDone = async () => {
    setClockShow(false);
    const s = scene();
    if (!s) return;
    s.setItSleeping(true);
    await new Promise((r) => window.setTimeout(r, 1600));
    if (!alive.current) return;
    playThud();
    await s.dropTablet();
    jingle.current?.stop();
    jingle.current = startJingle();
    setF4('crashed');
    setToast(MISSAO_FORCA.crash);
    await new Promise((r) => window.setTimeout(r, 1300));
    await s.lookAtPlayer();
    if (!alive.current) return;
    say([me(MISSAO_FORCA.heard)], () => {
      scene()?.setSpots([{ id: 'tablet', zone: IT_TABLET_ZONE }]);
      backToExplore();
    });
  };

  // a musiquinha fica mais alta perto do tablet
  useEffect(() => {
    if (f4 !== 'crashed' && f4 !== 'playing') return;
    const id = window.setInterval(() => {
      const p = scene()?.playerFeet();
      if (p) jingle.current?.setVolume(jingleVolume(Math.hypot(p.x - IT_TABLET_FLOOR.x, p.y - IT_TABLET_FLOOR.y)));
    }, 200);
    return () => window.clearInterval(id);
  }, [f4]);

  // sai da página (ou recomeça o dia) com a musiquinha tocando: para
  useEffect(() => () => jingle.current?.stop(), []);

  const openHangman = () => {
    setF4('playing');
    scene()?.setFrozen(true);
    setPhase('hangman');
  };

  /** Fechou o tablet: com as 5 palavras certas, o Marcos acorda e o ESTAGIÁRIO sai correndo; senão, tenta de novo. */
  const finishHangman = (result: GameResult | null) => {
    const check = result ? checkHangman(result) : null;
    if (!result || !check?.solved) {
      setF4('crashed');
      const text = check ? MISSAO_FORCA.retry(check.wordsWon, check.words) : MISSAO_FORCA.gaveUp;
      say([me(text)], backToExplore);
      return;
    }
    setF4('escaping');
    scene()?.setSpots([]);
    say([me(MISSAO_FORCA.solved)], async () => {
      const s = scene();
      if (!s) return;
      s.setFrozen(true);
      setPhase('dialog');
      jingle.current?.stop();
      jingle.current = null;
      s.itWakes();
      await new Promise((r) => window.setTimeout(r, 700));
      if (!alive.current) return;
      say([marcos(MISSAO_FORCA.waking), me(MISSAO_FORCA.escape, { continueLabel: 'Correr!' })], async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        await sc.tabletToDesk();
        if (!alive.current) return;
        await sc.playerRunTo(IT_EXIT);
        if (!alive.current) return;
        addXp(MISSAO_FORCA, MISSAO_FORCA.xp);
        setF4('done');
        say([me(MISSAO_FORCA.success, { badge: `+${MISSAO_FORCA.xp} XP · Missão concluída!`, continueLabel: 'Ufa!' })], () => {
          backToExplore();
          onMissionComplete?.({ missionId: MISSAO_FORCA.id, xp: MISSAO_FORCA.xp, success: true, game: result });
          void startF2M5();
        });
      });
    });
  };

  // ------------------------------------------------------------ fase 2, missão 5: o exercício surpresa no celular

  /** Logo depois da fuga, o celular vibra: mensagem do amigo do curso. */
  const startF2M5 = async () => {
    await new Promise((r) => window.setTimeout(r, 1500));
    await whenFree();
    const s = scene();
    if (!alive.current || !s) return;
    s.setFrozen(true);
    setPhase('dialog');
    setF5('ringing');
    s.setPhoneRinging(true);
    playMessageTone();
    setToast(MISSAO_EXERCICIO.ring);
    await new Promise((r) => window.setTimeout(r, 1600));
    if (!alive.current) return;
    say([me(MISSAO_EXERCICIO.notice, { continueLabel: 'Abrir o celular' })], openPhone);
  };

  const openPhone = () => {
    const s = scene();
    s?.setPhoneRinging(false);
    s?.setFrozen(true);
    if (f5Ref.current === 'ringing') setF5('pending');
    setPhase('phone');
  };

  const sendExercise = (result: GameResult) => {
    lastExercise.current = result;
    attemptsRef.current = [...attemptsRef.current, checkExercise(result)];
    setAttempts(attemptsRef.current);
  };

  /** Guardou o celular: com o exercício certo, ganha o XP; senão, dá para abrir de novo pelo botão do topo. */
  const closePhone = () => {
    phoneSeen.current = true;
    const last = attemptsRef.current[attemptsRef.current.length - 1];
    if (!last?.passed) {
      say([me(MISSAO_EXERCICIO.gaveUp)], backToExplore);
      return;
    }
    addXp(MISSAO_EXERCICIO, MISSAO_EXERCICIO.xp);
    setF5('done');
    say([me(MISSAO_EXERCICIO.success, { badge: `+${MISSAO_EXERCICIO.xp} XP · Missão concluída!`, continueLabel: 'Boa!' })], () => {
      backToExplore();
      onMissionComplete?.({
        missionId: MISSAO_EXERCICIO.id,
        xp: MISSAO_EXERCICIO.xp,
        success: true,
        game: lastExercise.current ?? undefined,
      });
      void startF2End();
    });
  };

  // ------------------------------------------------------------ fim do 2º dia: dispensado

  /** Depois do exercício, o chefe chama o ESTAGIÁRIO na Diretoria. */
  const startF2End = async () => {
    await new Promise((r) => window.setTimeout(r, 1800));
    await whenFree();
    if (!alive.current) return;
    say([ceo(FIM_DIA2.call, 'ceo-feliz-b', { continueLabel: 'Estou indo!' })], () => {
      setFEnd('called');
      scene()?.setCeoTalk(true);
      backToExplore();
    });
  };

  /** Na Diretoria: elogia o dia e dispensa o ESTAGIÁRIO. */
  const ceoDismiss = () => {
    scene()?.setCeoTalk(false);
    const lines = FIM_DIA2.dismiss.map((t, i, all) => ceo(t, 'ceo-feliz-b', i === all.length - 1 ? { continueLabel: 'Até amanhã!' } : {}));
    say(lines, () => {
      setFEnd('leaving');
      setToast(FIM_DIA2.leaving);
      backToExplore();
    });
  };

  /** Saiu pela porta principal: vai para a calçada, comemora e vê o resumo do 2º dia. */
  const leaveDay2 = async () => {
    const s = scene();
    if (!s) return;
    setFEnd('done');
    s.setFrozen(true);
    setPhase('dialog');
    await s.playerRunTo({ x: s.playerFeet().x, y: SPAWN.y });
    if (!alive.current) return;
    await s.cheer();
    if (!alive.current) return;
    say([{ speaker: 'ESTAGIÁRIO', portrait: 'viva-a', text: FIM_DIA2.victory, badge: 'Fase 2 concluída!', continueLabel: 'Ver o resumo do dia' }], () => {
      scene()?.setFrozen(true);
      setPhase('summary');
      onDayComplete?.({ total: xpNow.current, entries: xpLog.current });
    });
  };

  // ------------------------------------------------------------ fase 3, missão 1: as peças da lista do Marcos

  const partsLeft = () => HIDEOUTS.filter((h) => !searched.current.has(h.id));
  const spotsForP1 = () => [
    ...partsLeft().map((h) => ({ id: `busca:${h.id}`, zone: HIDE_SPOTS.get(h.id)!.zone })),
    { id: 'marcos', zone: IT_ZONE },
  ];
  const magnifiersForP1 = () => partsLeft().map((h) => ({ id: h.id, at: HIDE_SPOTS.get(h.id)!.top }));
  /** Peças na mochila mais as já entregues (o contador 🧰 N|8). */
  const partsCount = (b: Bag = bag, d: ReadonlySet<PartKind> = delivered) => PART_KINDS.filter((k) => d.has(k) || b[k]).length;

  /** Começo do 3º dia: o escritório como ficou ontem e o Marcos chamando. */
  const startDay3 = async () => {
    const s = scene();
    if (!s) return;
    setXpTo(startXp);
    setMissionDone(true);
    setM2('done');
    setM3('done');
    setM4('done');
    setM5('done');
    setM6('done');
    s.setCeoTalk(false);
    s.setCeoMood('tranquilo');
    RH_STATIONS.forEach((st) => s.setRhStation(st.index, { built: true, boxOpen: true }));
    // a Rita passa o dia no RH, fazendo palavras-cruzadas no tablet
    s.rhPlace(RH_WAIT, 'down');
    s.setRhTablet(true);
    setToast(MISSAO_PECAS.dayStart);
    if (startAt >= 2 && startAt <= 5) {
      // para testes: as missões anteriores contam como feitas (e entram no resumo do dia)
      const done = [MISSAO_PECAS, MISSAO_CRUZADAS_RITA, MISSAO_MONTAR_PCS, MISSAO_ALINHAMENTO].slice(0, startAt - 1);
      xpLog.current = done.map((m) => ({ mission: m.id, title: m.title, xp: m.xp }));
      setXpTo(startXp + done.reduce((sum, m) => sum + m.xp, 0));
      setP1('done');
      if (startAt === 2) {
        void startF3M2();
        return;
      }
      setP2('done');
      if (startAt === 3) {
        void startF3M3(false);
        return;
      }
      setP3('done');
      if (startAt === 4) {
        void startF3M4();
        return;
      }
      // a missão 5 começa saindo da Sala de Reuniões, onde termina a 4
      setP4('done');
      s.leaveMeetingSeat();
      void startF3M5();
      return;
    }
    await new Promise((r) => window.setTimeout(r, 2500));
    await whenFree();
    const sc = scene();
    if (!alive.current || !sc) return;
    setP1('called');
    await sc.itGuyWaits();
    sc.setItAlert(true);
    say([marcos(MISSAO_PECAS.call, { continueLabel: 'Estou indo!' })], () => {
      scene()?.setSpots([{ id: 'marcos', zone: IT_ZONE }]);
      backToExplore();
    });
  };

  const onSpotP1 = (id: string) => {
    if (phaseRef.current !== 'explore') return;
    if (id === 'rita') {
      talkToRita();
      return;
    }
    if (id === 'cadeira') {
      if (p4Ref.current === 'waiting') void sitForQuiz();
      return;
    }
    if (id === 'mictorio') {
      if (p5Ref.current === 'running' || p5Ref.current === 'wet') void atUrinal();
      return;
    }
    if (id.startsWith('pcbox:')) {
      openPcBox(Number(id.slice(6)));
      return;
    }
    const s = scene();
    if (!s) return;
    if (id === 'marcos' && p3Ref.current === 'called') {
      s.setFrozen(true);
      s.itGuyFacePlayer();
      void briefingP3();
      return;
    }
    if (id === 'marcos') {
      if (p1Ref.current !== 'called' && p1Ref.current !== 'working') return;
      s.setFrozen(true);
      s.itGuyFacePlayer();
      if (p1Ref.current === 'called') briefingP1();
      else deliverParts();
      return;
    }
    const h = HIDEOUTS.find((x) => `busca:${x.id}` === id);
    if (p1Ref.current !== 'working' || !h || searched.current.has(h.id)) return;
    void searchParts(h);
  };

  /** Na Sala de TI: a aula de hardware, a tarefa e a lista. */
  const briefingP1 = () => {
    scene()?.setItAlert(false);
    const lines = MISSAO_PECAS.briefing.map((t, i, all) =>
      marcos(t, i === all.length - 1 ? { continueLabel: 'Vou procurar!', badge: '📋 Lista de peças (botão 📋 Lista, no topo)' } : {}),
    );
    say(lines, () => {
      const sc = scene();
      if (!sc) return;
      setP1('working');
      sc.setMagnifiers(magnifiersForP1());
      sc.setSpots(spotsForP1());
      sc.setFrozen(true);
      setHeld({ part: null });
      setPhase('peca');
    });
  };

  /** Procura no móvel (a mesma animação das placas): as peças pulam e caem no chão. */
  const searchParts = async (h: Hideout) => {
    const s = scene();
    if (!s) return;
    searched.current.add(h.id);
    s.setFrozen(true);
    setPhase('search');
    s.setMagnifiers(magnifiersForP1());
    s.setSpots(spotsForP1());
    const ids = partsIn(h.id);
    await s.search(
      HIDE_SPOTS.get(h.id)!,
      ids.map((id) => ({ id, frame: `peca-${partById(id)!.kind}` })),
    );
    if (!alive.current) return;
    backToExplore();
    setToast(ids.length ? MISSAO_PECAS.found(ids.length) : MISSAO_PECAS.empty(h.where));
  };

  /** Chegou perto de uma peça no chão: ela aparece na mão do ESTAGIÁRIO, ao lado da lista. */
  const pickPart = (id: string, at: { x: number; y: number }) => {
    const part = partById(id);
    if (!part || p1Ref.current !== 'working') return;
    scene()?.setFrozen(true);
    setHeld({ part, at });
    setPhase('peca');
  };

  /** Guardou: vai para a mochila; se já tinha uma do mesmo tipo, a antiga cai no chão. */
  const storePart = () => {
    const part = held?.part;
    if (!part) return;
    const old = bagRef.current[part.kind];
    const next = { ...bagRef.current, [part.kind]: part.id };
    setBag(next);
    setHeld(null);
    backToExplore();
    if (old) void scene()?.dropNear(old, `peca-${part.kind}`);
    if (partsCount(next) === PART_KINDS.length) setToast(MISSAO_PECAS.full);
    else setToast(old ? MISSAO_PECAS.swapped(KINDS[part.kind].the) : MISSAO_PECAS.stored(KINDS[part.kind].the));
  };

  /** Deixou: a peça volta para o chão onde estava (ou fecha a lista). */
  const leavePart = () => {
    const h = held;
    setHeld(null);
    backToExplore();
    if (h?.part && h.at) scene()?.putBack(h.part.id, `peca-${h.part.kind}`, h.at);
  };

  /** Entrega ao Marcos: confere tudo; peça errada volta, ele explica a diferença e tira 50 XP. */
  const deliverParts = () => {
    const r = checkParts(bagRef.current, deliveredRef.current);
    if (!r.ok) {
      const none = !Object.keys(bagRef.current).length && !deliveredRef.current.size;
      const text = none ? MISSAO_PECAS.noneYet : MISSAO_PECAS.missing(r.missing.map((k) => KINDS[k].name));
      say([marcos(text, { continueLabel: 'Vou procurar' })], backToExplore);
      return;
    }
    const s = scene();
    if (!s) return;
    const accepted = new Set([...deliveredRef.current, ...r.right]);
    setDelivered(accepted);
    if (r.wrong.length) {
      addXp(MISSAO_PECAS, -MISSAO_PECAS.penalty, `${r.wrong.length === 1 ? '1 peça errada' : `${r.wrong.length} peças erradas`} na entrega`);
      const back: Bag = {};
      setBag(back);
      say(
        [
          marcos(MISSAO_PECAS.checking),
          marcos(MISSAO_PECAS.problems(r.wrong.length), { badge: `−${MISSAO_PECAS.penalty} XP` }),
          ...r.wrong.map((w) => marcos(explainWrong(w.kind, w.got))),
          marcos(MISSAO_PECAS.keepRight(r.right.length), { continueLabel: 'Vou procurar' }),
        ],
        () => {
          backToExplore();
          onMissionComplete?.({ missionId: MISSAO_PECAS.id, xp: -MISSAO_PECAS.penalty, success: false });
        },
      );
      return;
    }
    setBag({});
    addXp(MISSAO_PECAS, MISSAO_PECAS.xp);
    setP1('done');
    s.setSpots([]);
    s.setMagnifiers([]);
    s.setItAlert(false);
    say(
      [marcos(MISSAO_PECAS.checking), marcos(MISSAO_PECAS.success, { badge: `+${MISSAO_PECAS.xp} XP · Missão concluída!`, continueLabel: 'De nada!' })],
      async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        await sc.cheer();
        if (!alive.current) return;
        backToExplore();
        onMissionComplete?.({ missionId: MISSAO_PECAS.id, xp: MISSAO_PECAS.xp, success: true });
        void startF3M2();
      },
    );
  };


  // ------------------------------------------------------------ fase 3, missão 2: as palavras-cruzadas da Rita

  /** Depois das peças: o ESTAGIÁRIO fica com sede e quer ir até a Copa. */
  const startF3M2 = async () => {
    await new Promise((r) => window.setTimeout(r, 1200));
    await whenFree();
    if (!alive.current) return;
    say([me(MISSAO_CRUZADAS_RITA.thirsty, { continueLabel: 'Ir até a Copa' })], () => {
      setP2('thirsty');
      backToExplore();
      if (roomRef.current?.id === 'copa') void ritaRuns();
    });
  };

  /** Entrou na Copa: a Rita vem correndo do RH, o ESTAGIÁRIO leva um susto e ela pede ajuda. */
  const ritaRuns = async () => {
    const s = scene();
    if (!s) return;
    setP2('met');
    s.setFrozen(true);
    setPhase('dialog');
    setToast(MISSAO_CRUZADAS_RITA.shout);
    const run = s.rhRunToPlayer();
    await new Promise((r) => window.setTimeout(r, 700));
    if (!alive.current) return;
    await s.startle();
    await run;
    if (!alive.current) return;
    say(
      [
        me(MISSAO_CRUZADAS_RITA.startled),
        rita(MISSAO_CRUZADAS_RITA.sorry),
        me(MISSAO_CRUZADAS_RITA.calm),
        rita(MISSAO_CRUZADAS_RITA.plea),
      ],
      askRita,
    );
  };

  const askRita = () => {
    scene()?.setFrozen(true);
    placeBalloon();
    setPhase('askP2');
  };

  /** Não ajudou (ou desistiu): a Rita fica esperando na Copa, com o tablet e o "!". Falar com ela de novo recomeça. */
  const ritaWaits = () => {
    setP2('waiting');
    backToExplore();
    const s = scene();
    if (!s) return;
    s.setSpots([]);
    void s.rhWaitWithTablet(COPA_RITA_WAIT, true).then(() => {
      if (p2Ref.current !== 'waiting') return;
      const at = scene()?.rhAt() ?? COPA_RITA_WAIT;
      scene()?.setSpots([{ id: 'rita', zone: { x: at.x - 44, y: at.y - 24, w: 88, h: 56 } }]);
    });
  };

  const talkToRita = () => {
    if (p2Ref.current !== 'waiting' || phaseRef.current !== 'explore') return;
    scene()?.setSpots([]);
    say([rita(MISSAO_CRUZADAS_RITA.again)], askRita);
  };

  const finishRitaCrossword = (result: GameResult | null) => {
    if (!result) {
      say([rita(MISSAO_CRUZADAS_RITA.gaveUp)], ritaWaits);
      return;
    }
    const s = scene();
    s?.setSpots([]);
    s?.setRhTablet(false);
    addXp(MISSAO_CRUZADAS_RITA, MISSAO_CRUZADAS_RITA.xp);
    setP2('done');
    say(
      [
        rita(MISSAO_CRUZADAS_RITA.success, { badge: `+${MISSAO_CRUZADAS_RITA.xp} XP · Missão concluída!` }),
        me(MISSAO_CRUZADAS_RITA.water, { continueLabel: 'Beber água' }),
      ],
      async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        void sc.rhWalkTo(RH_WAIT, 'down').then(() => scene()?.setRhTablet(true));
        await sc.drinkWater();
        if (!alive.current) return;
        setToast(MISSAO_CRUZADAS_RITA.drink);
        backToExplore();
        onMissionComplete?.({ missionId: MISSAO_CRUZADAS_RITA.id, xp: MISSAO_CRUZADAS_RITA.xp, success: true, game: result });
        void startF3M3(true);
      },
    );
  };

  // ------------------------------------------------------------ fase 3, missão 3: os 3 computadores do Marcos

  const boxSpots = () =>
    PC_BOXES.flatMap((b, i) => (buildsDoneRef.current.includes(BUILDS[i].id) ? [] : [{ id: `pcbox:${i}`, zone: b.zone }]));

  /** Depois da água o ESTAGIÁRIO sai de fininho da Copa, e logo o Marcos chama de novo. */
  const startF3M3 = async (escape: boolean) => {
    await new Promise((r) => window.setTimeout(r, escape ? 600 : 2500));
    await whenFree();
    const s = scene();
    if (!alive.current || !s) return;
    if (escape) {
      await new Promise<void>((resolve) => say([me(MISSAO_MONTAR_PCS.escape, { continueLabel: 'Sair de fininho' })], () => resolve()));
      const sc = scene();
      if (!alive.current || !sc) return;
      sc.setFrozen(true);
      setPhase('dialog');
      await sc.playerRunTo(COPA_ESCAPE);
      if (!alive.current) return;
      backToExplore();
      await new Promise((r) => window.setTimeout(r, 1800));
      await whenFree();
    }
    const sc = scene();
    if (!alive.current || !sc) return;
    setP3('called');
    await sc.itGuyWaits();
    if (!alive.current) return;
    sc.setItAlert(true);
    say([marcos(MISSAO_MONTAR_PCS.call, { continueLabel: 'Estou indo!' })], () => {
      scene()?.setSpots([{ id: 'marcos', zone: IT_ZONE }]);
      backToExplore();
    });
  };

  /** Na Sala de TI: o Marcos mostra as 3 caixas e explica o serviço. */
  const briefingP3 = async () => {
    const s = scene();
    if (!s) return;
    s.setItAlert(false);
    s.setSpots([]);
    setPhase('dialog');
    s.showBoxes();
    const mid = PC_BOXES[1].at;
    await s.lookAt(mid.x + 60, mid.y);
    if (!alive.current) return;
    const lines = MISSAO_MONTAR_PCS.briefing.map((t, i, all) => marcos(t, i === all.length - 1 ? { continueLabel: 'Vamos montar!' } : {}));
    say(lines, async () => {
      const sc = scene();
      if (!sc) return;
      sc.setFrozen(true);
      setPhase('dialog');
      await sc.lookAtPlayer();
      if (!alive.current) return;
      setP3('working');
      sc.setSpots(boxSpots());
      void sc.itGuySitsDown();
      backToExplore();
    });
  };

  const openPcBox = (index: number) => {
    if (p3Ref.current !== 'working' || buildsDoneRef.current.includes(BUILDS[index].id)) return;
    scene()?.setFrozen(true);
    setOpenBuild(index);
    setPhase('montar');
  };

  const closePcBox = (done: boolean) => {
    const index = openBuild;
    setOpenBuild(null);
    if (index === null) return backToExplore();
    const build = BUILDS[index];
    if (!done || buildsDoneRef.current.includes(build.id)) return backToExplore();
    const next = [...buildsDoneRef.current, build.id];
    buildsDoneRef.current = next;
    setBuildsDone(next);
    const s = scene();
    s?.setBox(index, true);
    s?.setSpots(boxSpots());
    setToast(MISSAO_MONTAR_PCS.built(build.title, next.length));
    backToExplore();
    if (next.length === BUILDS.length) void finishP3();
  };

  /** Os 3 ligaram: o Marcos levanta, agradece e os dois comemoram. */
  const finishP3 = async () => {
    await new Promise((r) => window.setTimeout(r, 800));
    await whenFree();
    const s = scene();
    if (!alive.current || !s) return;
    s.setFrozen(true);
    setPhase('dialog');
    s.setSpots([]);
    await s.itGuyComesToPlayer();
    if (!alive.current) return;
    addXp(MISSAO_MONTAR_PCS, MISSAO_MONTAR_PCS.xp);
    setP3('done');
    say([marcos(MISSAO_MONTAR_PCS.success, { badge: `+${MISSAO_MONTAR_PCS.xp} XP · Missão concluída!`, continueLabel: 'Bate aqui!' })], async () => {
      const sc = scene();
      if (!sc) return;
      sc.setFrozen(true);
      setPhase('dialog');
      await Promise.all([sc.cheer(), sc.itGuyHops()]);
      if (!alive.current) return;
      backToExplore();
      onMissionComplete?.({ missionId: MISSAO_MONTAR_PCS.id, xp: MISSAO_MONTAR_PCS.xp, success: true });
      void startF3M4();
    });
  };

  // ------------------------------------------------------------ fase 3, missão 4: o quiz da reunião de alinhamento

  /** O chefe vai até a Sala de Reuniões e chama o ESTAGIÁRIO. */
  const startF3M4 = async () => {
    await new Promise((r) => window.setTimeout(r, 2000));
    await whenFree();
    const s = scene();
    if (!alive.current || !s) return;
    await s.ceoWalkTo(MEETING_BOSS, 'left', true);
    if (!alive.current) return;
    await whenFree();
    if (!alive.current) return;
    setP4('called');
    say([ceo(MISSAO_ALINHAMENTO.call, 'ceo-feliz-b', { continueLabel: 'Estou indo!' })], () => {
      backToExplore();
      if (roomRef.current?.id === 'reunioes') meetBoss4();
    });
  };

  /** Chegou na Sala de Reuniões: o chefe explica e o ESTAGIÁRIO senta para o quiz. */
  const meetBoss4 = () => {
    const s = scene();
    if (!s || p4Ref.current !== 'called') return;
    s.setFrozen(true);
    s.setCeoWalkerAlert(false);
    s.ceoFacePlayer();
    const lines = MISSAO_ALINHAMENTO.briefing.map((t, i, all) => ceo(t, 'ceo-feliz-b', i === all.length - 1 ? { continueLabel: 'Vou sentar' } : {}));
    say(lines, () => void sitForQuiz());
  };

  const sitForQuiz = async () => {
    const s = scene();
    if (!s) return;
    s.setSpots([]);
    s.setFrozen(true);
    setPhase('dialog');
    await s.sitAtMeeting();
    if (!alive.current) return;
    setP4('quiz');
    setPhase('quizP4');
  };

  const finishQuizP4 = (result: GameResult | null) => {
    const s = scene();
    if (!s) return;
    if (!result) {
      s.leaveMeetingSeat();
      setP4('waiting');
      say([ceo(MISSAO_ALINHAMENTO.gaveUp, 'ceo-feliz-b')], () => {
        scene()?.setSpots([{ id: 'cadeira', zone: MEETING_SEAT_ZONE }]);
        backToExplore();
      });
      return;
    }
    const right = Number(result.details.correct);
    const total = Number(result.details.total);
    const good = total > 0 && right / total >= MISSAO_ALINHAMENTO.goodRatio;
    addXp(MISSAO_ALINHAMENTO, MISSAO_ALINHAMENTO.xp);
    setP4('done');
    say(
      [
        ceo(MISSAO_ALINHAMENTO.result(right, total, good), good ? 'ceo-feliz-a' : 'ceo-feliz-b'),
        ceo(MISSAO_ALINHAMENTO.thanks, 'ceo-feliz-b', { badge: `+${MISSAO_ALINHAMENTO.xp} XP · Missão concluída!`, continueLabel: 'De nada!' }),
      ],
      () => {
        const sc = scene();
        sc?.leaveMeetingSeat();
        void sc?.ceoBackToSeat();
        backToExplore();
        onMissionComplete?.({ missionId: MISSAO_ALINHAMENTO.id, xp: MISSAO_ALINHAMENTO.xp, success: true, game: result });
        void startF3M5();
      },
    );
  };

  // ------------------------------------------------------------ fase 3, missão 5: o aperto no banheiro

  /** Bate a vontade: balão com a gota, e o relógio começa a contar até ele chegar num mictório. */
  const startF3M5 = async () => {
    await new Promise((r) => window.setTimeout(r, 2500));
    await whenFree();
    const s = scene();
    if (!alive.current || !s) return;
    s.setUrge(true);
    const lines = MISSAO_BANHEIRO.urge.map((t, i, all) => me(t, i === all.length - 1 ? { continueLabel: 'Correr! 🏃' } : {}));
    say(lines, () => {
      deadline5.current = Date.now() + MISSAO_BANHEIRO.tempo * 1000;
      setSecondsLeft5(MISSAO_BANHEIRO.tempo);
      setP5('running');
      scene()?.setSpots([{ id: 'mictorio', zone: URINAL_ZONE }]);
      setToast(MISSAO_BANHEIRO.start);
      backToExplore();
    });
  };

  /** O tempo acabou antes do mictório: faz nas calças, mas continua indo para o banheiro. */
  const pantsWet = async () => {
    if (p5Ref.current !== 'running') return;
    setP5('wet');
    await whenFree();
    const s = scene();
    if (!alive.current || !s) return;
    s.setUrge(false);
    s.wetPants();
    say([me(MISSAO_BANHEIRO.accident, { continueLabel: 'Vou até o banheiro' })], backToExplore);
  };

  /** Chegou num mictório: alívio, olha as palavras escritas na parede e começa a sonhar com um caça-palavras. */
  const atUrinal = async () => {
    const s = scene();
    if (!s) return;
    const inTime = p5Ref.current === 'running';
    setP5('urinal');
    s.setSpots([]);
    s.setUrge(false);
    s.setFrozen(true);
    setPhase('dialog');
    await s.useUrinal();
    if (!alive.current) return;
    say([me(inTime ? MISSAO_BANHEIRO.relief : MISSAO_BANHEIRO.wetRelief)], async () => {
      const sc = scene();
      if (!sc) return;
      setPhase('dialog');
      await sc.lookAtWords(true);
      if (!alive.current) return;
      say([me(MISSAO_BANHEIRO.words, { continueLabel: '💭 …' })], () => {
        scene()?.setFrozen(true);
        setPhase('dreamP5');
      });
    });
  };

  /** Acordou do sonho, ainda de frente para o mictório. Achou todas: 100 XP; desistiu: não tem outra chance. */
  const finishDream = async (result: GameResult | null) => {
    const s = scene();
    if (!s) return;
    setPhase('dialog');
    await s.lookAtWords(false);
    if (!alive.current) return;
    if (result) addXp(MISSAO_BANHEIRO, MISSAO_BANHEIRO.xp);
    const last = result
      ? me(MISSAO_BANHEIRO.success, { badge: `+${MISSAO_BANHEIRO.xp} XP · Missão concluída!`, continueLabel: 'Sair do banheiro' })
      : me(MISSAO_BANHEIRO.gaveUp, { continueLabel: 'Sair do banheiro' });
    say([me(MISSAO_BANHEIRO.wake), last], () => {
      setP5('exit');
      backToExplore();
      onMissionComplete?.({ missionId: MISSAO_BANHEIRO.id, xp: result ? MISSAO_BANHEIRO.xp : 0, success: !!result, game: result ?? undefined });
    });
  };

  /** Saiu do banheiro: fim do expediente, escurece e todo mundo vai embora. */
  const startDay3End = () => {
    const s = scene();
    if (!s) return;
    setP5('leaving');
    s.setNight(1);
    setToast(FIM_DIA3.endOfDay);
    void s.everyoneLeaves(WORKSTATIONS.map((w) => w.index));
    window.setTimeout(() => void scene()?.ceoLeaves(), 1500);
  };

  /** Saiu pela porta principal: vai para a calçada, comemora e vê o resumo do 3º dia. */
  const leaveDay3 = async () => {
    const s = scene();
    if (!s) return;
    setP5('done');
    s.setFrozen(true);
    setPhase('dialog');
    await s.playerRunTo({ x: s.playerFeet().x, y: SPAWN.y });
    if (!alive.current) return;
    await s.cheer();
    if (!alive.current) return;
    say([{ speaker: 'ESTAGIÁRIO', portrait: 'viva-a', text: FIM_DIA3.victory, badge: 'Fase 3 concluída!', continueLabel: 'Ver o resumo do dia' }], () => {
      scene()?.setFrozen(true);
      setPhase('summary');
      onDayComplete?.({ total: xpNow.current, entries: xpLog.current });
    });
  };

  // ------------------------------------------------------------ fase 4, missão 1: o projetor e a webcam da vídeo chamada

  /** Começo do 4º dia: o Marcos faltou e o chefe, nervoso, vai até a Sala de Reuniões chamar o ESTAGIÁRIO. */
  const startDay4 = async () => {
    const s = scene();
    if (!s) return;
    setXpTo(startXp);
    setMissionDone(true);
    setM2('done');
    setM3('done');
    setM4('done');
    setM5('done');
    setM6('done');
    s.setCeoTalk(false);
    s.setCeoMood('frustrado');
    RH_STATIONS.forEach((st) => s.setRhStation(st.index, { built: true, boxOpen: true }));
    s.rhPlace(RH_WAIT, 'down');
    s.itGuyAbsent();
    setToast(MISSAO_PROJETOR.dayStart);
    if (startAt === 4 || startAt === 5) {
      // para testes: as missões anteriores contam como feitas; a folha nova já está na mesa do Marcos
      const done = [MISSAO_PROJETOR, MISSAO_IMPRESSAO, MISSAO_TREINAMENTO, MISSAO_QUIZ_TREINAMENTO].slice(0, startAt - 1);
      xpLog.current = done.map((m) => ({ mission: m.id, title: m.title, xp: m.xp }));
      setXpTo(startXp + done.reduce((sum, m) => sum + m.xp, 0));
      setQ1('done');
      setQ2('done');
      setQ3('done');
      s.setCeoMood('tranquilo');
      s.setTrainingPaper(true);
      s.setQuizPaper(true);
      if (startAt === 4) {
        armQ4();
        setToast(MISSAO_QUIZ_TREINAMENTO.appeared);
        return;
      }
      setQ4('done');
      s.setWordSearchPaper(true);
      armQ5();
      setToast(MISSAO_CACA_TREINAMENTO.appeared);
      return;
    }
    if (startAt === 2 || startAt === 3) {
      // para testes: as missões anteriores contam como feitas (e entram no resumo do dia); o chefe vai para a Sala de
      // Reuniões
      const done = [MISSAO_PROJETOR, MISSAO_IMPRESSAO].slice(0, startAt - 1);
      xpLog.current = done.map((m) => ({ mission: m.id, title: m.title, xp: m.xp }));
      setXpTo(startXp + done.reduce((sum, m) => sum + m.xp, 0));
      setQ1('done');
      if (startAt === 3) setQ2('done');
      s.setCeoMood('tranquilo');
      await s.ceoWalkTo(MEETING_BOSS, 'left');
      await whenFree();
      if (!alive.current) return;
      if (startAt === 2) startQ2();
      else startQ3();
      return;
    }
    await new Promise((r) => window.setTimeout(r, 4800));
    if (!alive.current) return;
    setToast(MISSAO_PROJETOR.absent);
    await new Promise((r) => window.setTimeout(r, 1500));
    await whenFree();
    const sc = scene();
    if (!alive.current || !sc) return;
    sc.setCeoWalkerSmoke(true);
    await sc.ceoWalkTo(MEETING_BOSS, 'left', true);
    if (!alive.current) return;
    await whenFree();
    if (!alive.current) return;
    setQ1('called');
    say([ceo(MISSAO_PROJETOR.call, 'ceo-bravo-b', { continueLabel: 'Estou indo!' })], () => {
      backToExplore();
      if (roomRef.current?.id === 'reunioes') meetBoss41();
    });
  };

  /** Chegou na Sala de Reuniões: o chefe explica o problema e a caixa aparece no canto. */
  const meetBoss41 = () => {
    const s = scene();
    if (!s || q1Ref.current !== 'called') return;
    s.setFrozen(true);
    s.setCeoWalkerAlert(false);
    s.ceoFacePlayer();
    const lines = MISSAO_PROJETOR.briefing.map((t, i, all) =>
      ceo(t, i === 0 ? 'ceo-bravo-b' : 'ceo-bravo-a', i === all.length - 1 ? { continueLabel: 'Deixa comigo!' } : {}),
    );
    say(lines, () => {
      const sc = scene();
      if (!sc) return;
      setQ1('working');
      sc.showBoxes([PROJECTOR_BOX]);
      sc.setSpots([{ id: 'projetor', zone: PROJECTOR_BOX.zone }]);
      setToast(MISSAO_PROJETOR.open);
      backToExplore();
    });
  };

  const onSpotQ = (id: string) => {
    if (phaseRef.current !== 'explore' || id !== 'projetor' || q1Ref.current !== 'working') return;
    scene()?.setFrozen(true);
    setPhase('projetor');
  };

  /** Fechou a mesa: com tudo funcionando, o chefe agradece muito; senão, continua depois. */
  const closeProjector = (done: boolean) => {
    if (!done) {
      setToast(MISSAO_PROJETOR.notYet);
      backToExplore();
      return;
    }
    void finishQ1();
  };

  const finishQ1 = async () => {
    const s = scene();
    if (!s) return;
    s.setFrozen(true);
    setPhase('dialog');
    s.setSpots([]);
    s.setBox(0, true);
    s.setCeoWalkerSmoke(false);
    s.ceoFacePlayer();
    addXp(MISSAO_PROJETOR, MISSAO_PROJETOR.xp);
    setQ1('done');
    const [first, last] = MISSAO_PROJETOR.thanks;
    say(
      [ceo(first, 'ceo-feliz-a'), ceo(last, 'ceo-feliz-b', { badge: `+${MISSAO_PROJETOR.xp} XP · Missão concluída!`, continueLabel: 'De nada, chefe!' })],
      async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        await sc.cheer();
        if (!alive.current) return;
        onMissionComplete?.({ missionId: MISSAO_PROJETOR.id, xp: MISSAO_PROJETOR.xp, success: true });
        startQ2();
      },
    );
  };

  // ------------------------------------------------------------ fase 4, missão 2: as 10 cópias da reunião

  /** O chefe lembra das 10 cópias; a mesa com o PC aparece na Sala de Impressão. */
  const startQ2 = () => {
    const s = scene();
    if (!s) return;
    s.ceoFacePlayer();
    const lines = MISSAO_IMPRESSAO.call.map((t, i, all) =>
      ceo(t, i === 1 ? 'ceo-bravo-a' : 'ceo-feliz-b', i === all.length - 1 ? { continueLabel: 'Pode deixar, chefe!' } : {}),
    );
    say(lines, () => {
      const sc = scene();
      if (!sc) return;
      setQ2('working');
      sc.showPrintDesk();
      sc.setSpots([
        { id: 'pc-impressao', zone: PRINT_DESK.zone },
        { id: 'impressora', zone: PRINTER.zone },
      ]);
      markQ2(printerRef.current, pcSeenRef.current);
      setToast(MISSAO_IMPRESSAO.go);
      backToExplore();
    });
  };

  /** O "!" mostra aonde ir: o PC; a impressora (depois de ver que está off-line); o PC de novo (para imprimir). */
  const markQ2 = (p: PrinterState, seen: boolean) => {
    const s = scene();
    if (!s) return;
    s.setMarks([!p.on && seen ? PRINTER.top : PRINT_DESK.monitor]);
  };

  const onSpotQ2 = (id: string) => {
    if (phaseRef.current !== 'explore') return;
    const q = q2Ref.current;
    const p = printerRef.current;
    if (id === 'pc-impressao') {
      if (q === 'printed') setToast(MISSAO_IMPRESSAO.takeFirst);
      if (q !== 'working') return;
      scene()?.setFrozen(true);
      setPcSeen(true);
      setPhase('pcImpressao');
      return;
    }
    if (id !== 'impressora') return;
    if (q === 'printed') {
      pickCopies();
      return;
    }
    if (q !== 'working') return;
    if (p.on) {
      setToast(MISSAO_IMPRESSAO.alreadyOn);
      return;
    }
    if (Object.keys(p.plugs).length) {
      scene()?.setFrozen(true);
      setPhase('impressora');
      return;
    }
    say([me(MISSAO_IMPRESSAO.cables, { continueLabel: 'Ver a traseira' })], () => {
      scene()?.setFrozen(true);
      setPhase('impressora');
    });
  };

  /** Saiu do PC: imprimiu (as cópias aparecem em cima da impressora) ou ainda não. */
  const closePcImpressao = (printed: boolean) => {
    backToExplore();
    const s = scene();
    if (!s) return;
    if (printed) {
      setQ2('printed');
      s.setCopies(true);
      s.setMarks([PRINTER.top]);
      setToast(MISSAO_IMPRESSAO.printed);
      return;
    }
    markQ2(printerRef.current, true);
    setToast(printerRef.current.on ? MISSAO_IMPRESSAO.notYet : MISSAO_IMPRESSAO.offline);
  };

  const closeImpressora = (done: boolean) => {
    backToExplore();
    markQ2(printerRef.current, true);
    setToast(done ? MISSAO_IMPRESSAO.online : MISSAO_IMPRESSAO.notYet);
  };

  /** Pegou o maço das cópias em cima da impressora: agora é levar ao chefe. */
  const pickCopies = () => {
    const s = scene();
    if (!s) return;
    setQ2('carrying');
    s.setCopies(false);
    s.setMarks([]);
    s.setCeoWalkerAlert(true);
    setToast(MISSAO_IMPRESSAO.picked);
  };

  /** Chegou na Sala de Reuniões com as cópias: o chefe vem buscar, agradece e os dois comemoram muito. */
  const deliverCopies = async () => {
    const s = scene();
    if (!s) return;
    s.setFrozen(true);
    setPhase('dialog');
    s.setSpots([]);
    await s.ceoComesToPlayer();
    if (!alive.current) return;
    addXp(MISSAO_IMPRESSAO, MISSAO_IMPRESSAO.xp);
    setQ2('done');
    const [first, last] = MISSAO_IMPRESSAO.thanks;
    say(
      [
        ceo(first, 'ceo-feliz-a'),
        ceo(last, 'ceo-feliz-b', { badge: `+${MISSAO_IMPRESSAO.xp} XP · Missão concluída!`, continueLabel: 'Foi um prazer, chefe!' }),
      ],
      async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        await Promise.all([sc.cheer(), sc.ceoCelebrates()]);
        if (!alive.current) return;
        onMissionComplete?.({ missionId: MISSAO_IMPRESSAO.id, xp: MISSAO_IMPRESSAO.xp, success: true });
        startQ3();
      },
    );
  };

  // ------------------------------------------------------------ fase 4, missão 3: as frases do treinamento de TI

  /** O chefe lembra do treinamento de TI parado: o papel com as frases aparece na mesa do Marcos. */
  const startQ3 = () => {
    const s = scene();
    if (!s) return;
    s.ceoFacePlayer();
    const lines = MISSAO_TREINAMENTO.call.map((t, i, all) =>
      ceo(t, i === 0 ? 'ceo-bravo-a' : 'ceo-feliz-b', i === all.length - 1 ? { continueLabel: 'Claro, chefe!' } : {}),
    );
    say(lines, () => {
      const sc = scene();
      if (!sc) return;
      setQ3('working');
      sc.setTrainingPaper(true);
      sc.setMarks([{ x: TRAINING_PAPER.x + 13, y: TRAINING_PAPER.y - 4 }]);
      sc.setSpots([{ id: 'papel', zone: TRAINING_ZONE }]);
      setToast(MISSAO_TREINAMENTO.go);
      backToExplore();
    });
  };

  const onSpotQ3 = (id: string) => {
    if (phaseRef.current !== 'explore' || id !== 'papel' || q3Ref.current !== 'working') return;
    scene()?.setFrozen(true);
    setPhase('paperQ3');
  };

  /** Fechou o papel: completou as frases (+100 XP e comemora) ou deixou para depois. */
  const finishPaper = (result: GameResult | null) => {
    if (!result) {
      setToast(MISSAO_TREINAMENTO.notYet);
      backToExplore();
      return;
    }
    const s = scene();
    s?.setMarks([]);
    s?.setSpots([]);
    addXp(MISSAO_TREINAMENTO, MISSAO_TREINAMENTO.xp);
    setQ3('done');
    say(
      [me(MISSAO_TREINAMENTO.success, { badge: `+${MISSAO_TREINAMENTO.xp} XP · Missão concluída!`, continueLabel: 'Uhuu!' })],
      async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        await sc.cheer();
        if (!alive.current) return;
        onMissionComplete?.({ missionId: MISSAO_TREINAMENTO.id, xp: MISSAO_TREINAMENTO.xp, success: true, game: result });
        void startQ4();
      },
    );
  };

  // ------------------------------------------------------------ fase 4, missão 4: o quiz da segunda folha

  /** Depois da comemoração, o ESTAGIÁRIO leva um susto: outra folha sai de baixo da primeira, com um quiz. */
  const startQ4 = async () => {
    const s = scene();
    if (!s) return;
    s.setFrozen(true);
    setPhase('dialog');
    s.setQuizPaper(true, true);
    await s.startle({ x: QUIZ_PAPER.x + 13, y: QUIZ_PAPER.y });
    if (!alive.current) return;
    say([me(MISSAO_QUIZ_TREINAMENTO.scare, { continueLabel: 'Ver a folha' })], () => {
      armQ4();
      scene()?.setFrozen(true);
      setPhase('quizQ4');
    });
  };

  /** A folha do quiz fica esperando na mesa do Marcos, com o "!" em cima. */
  const armQ4 = () => {
    const s = scene();
    if (!s) return;
    setQ4('working');
    s.setMarks([{ x: QUIZ_PAPER.x + 13, y: QUIZ_PAPER.y - 4 }]);
    s.setSpots([{ id: 'quiz', zone: TRAINING_ZONE }]);
  };

  const onSpotQ4 = (id: string) => {
    if (phaseRef.current !== 'explore' || id !== 'quiz' || q4Ref.current !== 'working') return;
    scene()?.setFrozen(true);
    setPhase('quizQ4');
  };

  /** Fechou a folha do quiz: respondeu (+100 XP e comemora) ou deixou para depois. */
  const finishQuizQ4 = (result: GameResult | null) => {
    if (!result) {
      setToast(MISSAO_QUIZ_TREINAMENTO.notYet);
      backToExplore();
      return;
    }
    const s = scene();
    s?.setMarks([]);
    s?.setSpots([]);
    addXp(MISSAO_QUIZ_TREINAMENTO, MISSAO_QUIZ_TREINAMENTO.xp);
    setQ4('done');
    say(
      [
        me(MISSAO_QUIZ_TREINAMENTO.success, {
          badge: `+${MISSAO_QUIZ_TREINAMENTO.xp} XP · Missão concluída!`,
          continueLabel: 'Uhuu!',
        }),
      ],
      async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        await sc.cheer();
        if (!alive.current) return;
        onMissionComplete?.({ missionId: MISSAO_QUIZ_TREINAMENTO.id, xp: MISSAO_QUIZ_TREINAMENTO.xp, success: true, game: result });
        void startQ5();
      },
    );
  };

  // ------------------------------------------------------------ fase 4, missão 5: o caça-palavras da terceira folha

  /** Cansado, o ESTAGIÁRIO enxuga o suor da testa… e leva outro susto: mais uma folha, com um caça-palavras. */
  const startQ5 = async () => {
    const s = scene();
    if (!s) return;
    s.setFrozen(true);
    setPhase('dialog');
    await s.wipeSweat();
    if (!alive.current) return;
    s.setWordSearchPaper(true, true);
    await s.startle({ x: WORDSEARCH_PAPER.x + 13, y: WORDSEARCH_PAPER.y });
    if (!alive.current) return;
    say([me(MISSAO_CACA_TREINAMENTO.wow, { continueLabel: 'Ver a folha' })], () => {
      armQ5();
      scene()?.setFrozen(true);
      setPhase('cacaQ5');
    });
  };

  /** A terceira folha fica esperando na mesa do Marcos, com o "!" em cima. */
  const armQ5 = () => {
    const s = scene();
    if (!s) return;
    setQ5('working');
    s.setMarks([{ x: WORDSEARCH_PAPER.x + 13, y: WORDSEARCH_PAPER.y - 4 }]);
    s.setSpots([{ id: 'caca', zone: TRAINING_ZONE }]);
  };

  const onSpotQ5 = (id: string) => {
    if (phaseRef.current !== 'explore' || id !== 'caca' || q5Ref.current !== 'working') return;
    scene()?.setFrozen(true);
    setPhase('cacaQ5');
  };

  /** Fechou a terceira folha: achou todas as palavras (+100 XP, comemora e a Rita vem avisar) ou deixou para depois. */
  const finishCacaQ5 = (result: GameResult | null) => {
    if (!result) {
      setToast(MISSAO_CACA_TREINAMENTO.notYet);
      backToExplore();
      return;
    }
    const s = scene();
    s?.setMarks([]);
    s?.setSpots([]);
    addXp(MISSAO_CACA_TREINAMENTO, MISSAO_CACA_TREINAMENTO.xp);
    setQ5('rita');
    say(
      [
        me(MISSAO_CACA_TREINAMENTO.success, {
          badge: `+${MISSAO_CACA_TREINAMENTO.xp} XP · Missão concluída!`,
          continueLabel: 'Uhuu!',
        }),
      ],
      async () => {
        const sc = scene();
        if (!sc) return;
        sc.setFrozen(true);
        setPhase('dialog');
        await sc.cheer();
        if (!alive.current) return;
        onMissionComplete?.({ missionId: MISSAO_CACA_TREINAMENTO.id, xp: MISSAO_CACA_TREINAMENTO.xp, success: true, game: result });
        void startDay4End();
      },
    );
  };

  /** A Rita passa pela Área de Trabalho avisando que o chefe dispensou todo mundo e vem até o ESTAGIÁRIO. */
  const startDay4End = async () => {
    const s = scene();
    if (!s) return;
    await s.ritaAnnounces(RITA_ANNOUNCE);
    if (!alive.current) return;
    const [first, last] = FIM_DIA4.rita;
    say([rita(first), rita(last, { continueLabel: 'Oba! Até amanhã!' })], () => {
      const sc = scene();
      if (!sc) return;
      setQ5('leaving');
      setToast(FIM_DIA4.dismissed);
      void sc.everyoneLeaves(WORKSTATIONS.map((w) => w.index));
      window.setTimeout(() => void scene()?.ceoLeaves(), 1200);
      backToExplore();
    });
  };

  /** Saiu pela porta principal: vai para a calçada, comemora e vê o resumo do 4º dia. */
  const leaveDay4 = async () => {
    const s = scene();
    if (!s) return;
    setQ5('done');
    s.setFrozen(true);
    setPhase('dialog');
    await s.playerRunTo({ x: s.playerFeet().x, y: SPAWN.y });
    if (!alive.current) return;
    await s.cheer();
    if (!alive.current) return;
    say([{ speaker: 'ESTAGIÁRIO', portrait: 'viva-a', text: FIM_DIA4.victory, badge: 'Fase 4 concluída!', continueLabel: 'Ver o resumo do dia' }], () => {
      scene()?.setFrozen(true);
      setPhase('summary');
      onDayComplete?.({ total: xpNow.current, entries: xpLog.current });
    });
  };

  /** Para testes: pula direto para a missão 2 a 6 (as anteriores entram no resumo como feitas, sem bronca). */
  const skipTo = (n: 2 | 3 | 4 | 5 | 6) => {
    const done = [MISSAO_CEO, MISSAO_PCS, MISSAO_MONTAGEM, MISSAO_QUADRO, MISSAO_PROVA].slice(0, n - 1);
    xpLog.current = done.map((m) => ({ mission: m.id, title: m.title, xp: m.xp }));
    setMissionDone(true);
    setEnteredBuilding(true);
    scene()?.setCeoTalk(false);
    scene()?.setCeoMood('tranquilo');
    if (n === 2) {
      setXpTo(MISSAO_CEO.xp);
      briefing();
      return;
    }
    setM2('done');
    if (n === 3) {
      setXpTo(MISSAO_CEO.xp + MISSAO_PCS.xp);
      callToRh();
      return;
    }
    setM3('done');
    RH_STATIONS.forEach((st) => scene()?.setRhStation(st.index, { built: true, boxOpen: true }));
    if (n === 4) {
      setXpTo(MISSAO_CEO.xp + MISSAO_PCS.xp + MISSAO_MONTAGEM.xp);
      void startMission4();
      return;
    }
    setM4('done');
    if (n === 5) {
      setXpTo(MISSAO_CEO.xp + MISSAO_PCS.xp + MISSAO_MONTAGEM.xp + MISSAO_QUADRO.xp);
      void startMission5();
      return;
    }
    setXpTo(MISSAO_CEO.xp + MISSAO_PCS.xp + MISSAO_MONTAGEM.xp + MISSAO_QUADRO.xp + MISSAO_PROVA.xp);
    setM5('done');
    void startMission6();
  };

  handlers.current = {
    talk: () => {
      if (fase >= 2) {
        if (f2Ref.current === 'called') ceoBriefingF2();
        else if (fEndRef.current === 'called') ceoDismiss();
        return;
      }
      if (m6Ref.current === 'called') {
        ceoBriefing6();
        return;
      }
      if (m2Ref.current === 'called') {
        scolding();
        return;
      }
      if (missionDone) return;
      scene()?.setFrozen(true);
      setPhase('greeting');
    },
    pc: openStation,
    box: openBox,
    spot: (id) =>
      fase === 4
        ? q5Ref.current !== 'off'
          ? onSpotQ5(id)
          : q4Ref.current !== 'off'
            ? onSpotQ4(id)
          : q3Ref.current !== 'off'
            ? onSpotQ3(id)
          : q2Ref.current !== 'off'
            ? onSpotQ2(id)
            : onSpotQ(id)
        : fase === 3 ? onSpotP1(id) : fase === 2 ? onSpotF2(id) : onSpot(id),
    pickup: (id, at) => (fase === 3 ? pickPart(id, at) : pickUp(id)),
    room: (r) => {
      if (!started.current) {
        started.current = true;
        if (fase === 4) void startDay4();
        else if (fase === 3) void startDay3();
        else if (fase === 2) void startDay2();
        else if (startAt > 1) skipTo(startAt as 2 | 3 | 4 | 5 | 6);
      }
      if (r?.id === 'rh' && m3Ref.current === 'called') void meetRita();
      if (r?.id === 'reunioes' && m4Ref.current === 'called' && phaseRef.current === 'explore') meetBruno();
      if (r?.id === 'reunioes' && f2bRef.current === 'called' && phaseRef.current === 'explore') meetDiego();
      if (r?.id === 'copa' && m5Ref.current === 'called' && phaseRef.current === 'explore') meetElisa();
      if (r?.id === 'copa' && p2Ref.current === 'thirsty' && phaseRef.current === 'explore') void ritaRuns();
      if (r?.id === 'reunioes' && p4Ref.current === 'called' && phaseRef.current === 'explore') meetBoss4();
      if (r?.id === 'reunioes' && q1Ref.current === 'called' && phaseRef.current === 'explore') meetBoss41();
      if (r?.id === 'reunioes' && q2Ref.current === 'carrying' && phaseRef.current === 'explore') void deliverCopies();
      if (r?.id === 'entrada' && m6Ref.current === 'armed') void lockUp();
      if (r?.id === 'entrada' && fEndRef.current === 'leaving') void leaveDay2();
      if (r?.id !== 'banheiro' && p5Ref.current === 'exit') startDay3End();
      if (r?.id === 'entrada' && p5Ref.current === 'leaving') void leaveDay3();
      if (r?.id === 'entrada' && q5Ref.current === 'leaving') void leaveDay4();
    },
    endRound: (r) => void endRound(r),
    timeUp5: () => void pantsWet(),
  };

  // ------------------------------------------------------------ tela

  let objective: { title: string; text: string; done: boolean };
  if (fase === 4 && q5 !== 'off') {
    const title = `Fase 4 · Missão 5: ${MISSAO_CACA_TREINAMENTO.title}.`;
    if (q5 === 'done') objective = { title: 'Fase 4 concluída:', text: 'Quarto dia de estágio completo!', done: true };
    else if (q5 === 'leaving') objective = { title: 'Fim do 4º dia.', text: OBJETIVOS.embora4, done: false };
    else if (q5 === 'rita')
      objective = { title: 'Missão concluída:', text: `${MISSAO_CACA_TREINAMENTO.title} (+${MISSAO_CACA_TREINAMENTO.xp} XP). ${OBJETIVOS.rita4}`, done: true };
    else objective = { title, text: OBJETIVOS.cacaTreinamento, done: false };
  } else if (fase === 4 && q4 !== 'off') {
    objective =
      q4 === 'done'
        ? {
            title: 'Missão concluída:',
            text: `${MISSAO_QUIZ_TREINAMENTO.title} (+${MISSAO_QUIZ_TREINAMENTO.xp} XP). Explore o escritório à vontade.`,
            done: true,
          }
        : { title: `Fase 4 · Missão 4: ${MISSAO_QUIZ_TREINAMENTO.title}.`, text: OBJETIVOS.quizTreinamento, done: false };
  } else if (fase === 4 && q3 !== 'off') {
    objective =
      q3 === 'done'
        ? {
            title: 'Missão concluída:',
            text: `${MISSAO_TREINAMENTO.title} (+${MISSAO_TREINAMENTO.xp} XP). Explore o escritório à vontade.`,
            done: true,
          }
        : { title: `Fase 4 · Missão 3: ${MISSAO_TREINAMENTO.title}.`, text: OBJETIVOS.treinamento, done: false };
  } else if (fase === 4 && q2 !== 'off') {
    const title = `Fase 4 · Missão 2: ${MISSAO_IMPRESSAO.title}.`;
    if (q2 === 'done')
      objective = {
        title: 'Missão concluída:',
        text: `${MISSAO_IMPRESSAO.title} (+${MISSAO_IMPRESSAO.xp} XP). A reunião está salva! Explore o escritório à vontade.`,
        done: true,
      };
    else
      objective = {
        title,
        text:
          q2 === 'carrying'
            ? OBJETIVOS.levarCopias
            : q2 === 'printed'
              ? OBJETIVOS.pegarCopias
              : printer.on
                ? OBJETIVOS.imprimir
                : pcSeen
                  ? OBJETIVOS.impressoraCabos
                  : OBJETIVOS.impressaoPc,
        done: false,
      };
  } else if (fase === 4) {
    const title = `Fase 4 · Missão 1: ${MISSAO_PROJETOR.title}.`;
    if (q1 === 'done')
      objective = { title: 'Missão concluída:', text: `${MISSAO_PROJETOR.title} (+${MISSAO_PROJETOR.xp} XP). Explore o escritório à vontade.`, done: true };
    else if (q1 === 'off') objective = { title: '4º dia de estágio.', text: OBJETIVOS.entrar, done: false };
    else objective = { title, text: q1 === 'called' ? OBJETIVOS.reuniao41 : OBJETIVOS.projetor, done: false };
  } else if (fase === 3 && p5 !== 'off') {
    const title = `Fase 3 · Missão 5: ${MISSAO_BANHEIRO.title}.`;
    if (p5 === 'leaving') objective = { title: 'Fim do 3º dia.', text: OBJETIVOS.embora3, done: false };
    else if (p5 === 'done') objective = { title: 'Fase 3 concluída:', text: 'Terceiro dia de estágio completo!', done: true };
    else
      objective = {
        title,
        text:
          p5 === 'running'
            ? OBJETIVOS.banheiroCorre
            : p5 === 'wet'
              ? OBJETIVOS.banheiroMolhado
              : p5 === 'exit'
                ? OBJETIVOS.banheiroSair
                : 'Ache as palavras do caça-palavras do sonho.',
        done: p5 === 'exit',
      };
  } else if (fase === 3 && p4 !== 'off') {
    const title = `Fase 3 · Missão 4: ${MISSAO_ALINHAMENTO.title}.`;
    if (p4 === 'done')
      objective = { title: 'Missão concluída:', text: `${MISSAO_ALINHAMENTO.title} (+${MISSAO_ALINHAMENTO.xp} XP). Explore o escritório à vontade.`, done: true };
    else
      objective = {
        title,
        text: p4 === 'called' ? OBJETIVOS.reuniao34 : p4 === 'waiting' ? OBJETIVOS.quizAlinhamento : 'Responda o quiz no notebook.',
        done: false,
      };
  } else if (fase === 3 && p3 !== 'off') {
    const title = `Fase 3 · Missão 3: ${MISSAO_MONTAR_PCS.title}.`;
    if (p3 === 'done')
      objective = { title: 'Missão concluída:', text: `${MISSAO_MONTAR_PCS.title} (+${MISSAO_MONTAR_PCS.xp} XP). Explore o escritório à vontade.`, done: true };
    else if (p3 === 'working') objective = { title, text: `${OBJETIVOS.montarPcs} (${buildsDone.length}|${BUILDS.length} ligados).`, done: false };
    else objective = { title, text: OBJETIVOS.ti33, done: false };
  } else if (fase === 3 && p2 !== 'off') {
    if (p2 === 'done')
      objective = { title: 'Missão concluída:', text: `${MISSAO_CRUZADAS_RITA.title} (+${MISSAO_CRUZADAS_RITA.xp} XP). Explore o escritório à vontade.`, done: true };
    else if (p2 === 'thirsty') objective = { title: 'Fase 3 · Missão 2:', text: OBJETIVOS.copaAgua, done: false };
    else
      objective = {
        title: `Fase 3 · Missão 2: ${MISSAO_CRUZADAS_RITA.title}.`,
        text: p2 === 'waiting' ? OBJETIVOS.ritaCruzadas : 'A Rita quer falar com você…',
        done: false,
      };
  } else if (fase === 3) {
    const title = `Fase 3 · Missão 1: ${MISSAO_PECAS.title}.`;
    if (p1 === 'done') objective = { title: 'Missão concluída:', text: `${MISSAO_PECAS.title} (+${MISSAO_PECAS.xp} XP). Explore o escritório à vontade.`, done: true };
    else if (p1 === 'working')
      objective = { title, text: partsCount() === PART_KINDS.length ? OBJETIVOS.levarPecas : `${OBJETIVOS.pecas} (${partsCount()}|${PART_KINDS.length}).`, done: false };
    else objective = { title, text: p1 === 'called' ? OBJETIVOS.ti31 : 'O Marcos está na Sala de TI…', done: false };
  } else if (fase === 2 && fEnd !== 'off') {
    objective =
      fEnd === 'done'
        ? { title: 'Fase 2 concluída:', text: 'Fim do 2º dia de estágio. Até amanhã!', done: true }
        : { title: 'Fase 2 · Fim do dia.', text: fEnd === 'called' ? OBJETIVOS.chefeDia2 : OBJETIVOS.embora, done: false };
  } else if (fase === 2 && f5 !== 'off') {
    if (f5 === 'done') {
      objective = { title: 'Missão concluída:', text: `${MISSAO_EXERCICIO.title} (+${MISSAO_EXERCICIO.xp} XP). Explore o escritório à vontade.`, done: true };
    } else {
      objective = { title: `Fase 2 · Missão 5: ${MISSAO_EXERCICIO.title}.`, text: f5 === 'ringing' ? OBJETIVOS.celular : OBJETIVOS.exercicio, done: false };
    }
  } else if (fase === 2 && f4 !== 'off') {
    if (f4 === 'done') {
      objective = { title: 'Missão concluída:', text: `${MISSAO_FORCA.title} (+${MISSAO_FORCA.xp} XP). Explore o escritório à vontade.`, done: true };
    } else {
      const text = f4 === 'resting' ? OBJETIVOS.descanso : f4 === 'crashed' ? OBJETIVOS.barulho : OBJETIVOS.forcaTablet;
      objective = { title: `Fase 2 · Missão 4: ${MISSAO_FORCA.title}.`, text, done: false };
    }
  } else if (fase === 2 && f3 !== 'off') {
    if (f3 === 'done') {
      objective = { title: 'Missão concluída:', text: `${MISSAO_PLACAS.title} (+${MISSAO_PLACAS.xp} XP). Explore o escritório à vontade.`, done: true };
    } else {
      const text =
        f3 === 'called' ? OBJETIVOS.ti3 : collected < BOARD_TOTAL ? `${OBJETIVOS.procurar} (${collected}|${BOARD_TOTAL}).` : OBJETIVOS.levarPlacas;
      objective = { title: `Fase 2 · Missão 3: ${MISSAO_PLACAS.title}.`, text, done: false };
    }
  } else if (fase === 2 && f2b !== 'off') {
    const title = `Fase 2 · Missão 2: ${MISSAO_CACA.title}.`;
    if (f2b === 'done') {
      objective = { title: 'Missão concluída:', text: `${MISSAO_CACA.title} (+${MISSAO_CACA.xp} XP). Explore o escritório à vontade.`, done: true };
    } else {
      const text = f2b === 'chat' ? 'O pessoal está reunido no quadro da Sala de Reuniões…' : f2b === 'called' ? OBJETIVOS.reuniao2 : OBJETIVOS.quadro2;
      objective = { title, text, done: false };
    }
  } else if (fase === 2) {
    const title = `Fase 2 · Missão 1: ${MISSAO_LEVANTAMENTO.title}.`;
    if (f2 === 'done') {
      objective = { title: 'Missão concluída:', text: `${MISSAO_LEVANTAMENTO.title} (+${MISSAO_LEVANTAMENTO.xp} XP). Explore o escritório à vontade.`, done: true };
    } else if (f2 === 'working') {
      objective = { title, text: `${OBJETIVOS.levantar} (${tagged} ${tagged === 1 ? 'etiquetado' : 'etiquetados'}). ${OBJETIVOS.entregar}.`, done: false };
    } else if (f2 === 'checking') {
      objective = { title, text: OBJETIVOS.conferindo2, done: false };
    } else {
      objective = { title, text: f2 === 'called' ? OBJETIVOS.chefe2 : OBJETIVOS.entrar, done: false };
    }
  } else if (!missionDone) {
    objective = { title: `Missão: ${MISSAO_CEO.title}.`, text: enteredBuilding ? OBJETIVOS.ceo : OBJETIVOS.entrar, done: false };
  } else if (m2 === 'off') {
    objective = { title: 'Missão concluída:', text: `${MISSAO_CEO.title} (+${MISSAO_CEO.xp} XP)`, done: true };
  } else if (m6 !== 'off') {
    const text =
      m6 === 'leaving'
        ? OBJETIVOS.saindo
        : m6 === 'called'
          ? OBJETIVOS.chefe
          : m6 === 'working'
            ? `${OBJETIVOS.desligar} (${OFFICE_PCS.length - pcsOn}/${OFFICE_PCS.length} desligados). Depois, ative o alarme ao lado da porta.`
            : m6 === 'armed'
              ? OBJETIVOS.sair
              : m6 === 'checking'
                ? OBJETIVOS.conferindo6
                : `${MISSAO_FIM.title} (+${MISSAO_FIM.xp} XP). Fim do primeiro dia de estágio!`;
    objective = { title: m6 === 'done' ? 'Fase 1 concluída:' : `Missão 6: ${MISSAO_FIM.title}.`, text, done: m6 === 'done' };
  } else if (m5 === 'called') {
    objective = { title: `Missão 5: ${MISSAO_PROVA.title}.`, text: OBJETIVOS.prova, done: false };
  } else if (m5 === 'done') {
    objective = { title: 'Missão concluída:', text: `${MISSAO_PROVA.title} (+${MISSAO_PROVA.xp} XP). Explore o escritório à vontade.`, done: true };
  } else if (m3 === 'done' && m4 === 'called') {
    objective = { title: `Missão 4: ${MISSAO_QUADRO.title}.`, text: OBJETIVOS.quadro, done: false };
  } else if (m4 === 'done') {
    objective = { title: 'Missão concluída:', text: `${MISSAO_QUADRO.title} (+${MISSAO_QUADRO.xp} XP). Explore o escritório à vontade.`, done: true };
  } else if (m2 === 'done' && (m3 === 'off' || m3 === 'done')) {
    const last = m3 === 'done' ? MISSAO_MONTAGEM : MISSAO_PCS;
    objective = { title: 'Missão concluída:', text: `${last.title} (+${last.xp} XP). Explore o escritório à vontade.`, done: true };
  } else if (m2 === 'done') {
    const text =
      m3 === 'called'
        ? OBJETIVOS.rh
        : m3 === 'working'
          ? `${OBJETIVOS.montar} (${kitsDone}/${KITS.length} prontos)`
          : m3 === 'checking'
            ? OBJETIVOS.conferindo
            : OBJETIVOS.corrigir;
    objective = { title: `Missão 3: ${MISSAO_MONTAGEM.title}.`, text, done: false };
  } else {
    const text =
      m2 === 'running'
        ? `${OBJETIVOS.ligar} (${signCount}/${PC_MODELS.length} placas)`
        : m2 === 'called'
          ? OBJETIVOS.chamado
          : OBJETIVOS.voltando;
    objective = { title: `Missão 2: ${MISSAO_PCS.title}.`, text, done: false };
  }

  const line = dialog?.lines[dialog.i];

  return (
    <div className="office-game">
      <div className="office-hud">
        <span className="office-room" aria-live="polite">
          📍 {room ? room.name : CORRIDOR_NAME}
        </span>
        <span className="office-xp" title="Experiência acumulada">
          ⭐ {xp} XP
        </span>
        {m2 === 'running' && (
          <span className={secondsLeft <= 30 ? 'office-timer is-low' : 'office-timer'} title="Tempo até a equipe voltar da reunião">
            ⏱ {formatTime(secondsLeft)}
          </span>
        )}
        {p5 === 'running' && (
          <span className={secondsLeft5 <= 10 ? 'office-timer is-low' : 'office-timer'} title="Tempo para chegar a um mictório">
            🚽 ⏱ {formatTime(secondsLeft5)}
          </span>
        )}
        {f3 === 'working' && (
          <span className={collected === BOARD_TOTAL ? 'office-boards is-full' : 'office-boards'} title="Placas de desenvolvimento encontradas">
            <span aria-hidden="true">🔌</span>
            <span>
              <strong key={collected}>{collected}</strong>|{BOARD_TOTAL}
            </span>
          </span>
        )}
        {p1 === 'working' && (
          <>
            <span className={partsCount() === PART_KINDS.length ? 'office-parts is-full' : 'office-parts'} title="Peças na mochila e entregues">
              <span aria-hidden="true">🧰</span>
              <span>
                <strong key={partsCount()}>{partsCount()}</strong>|{PART_KINDS.length}
              </span>
            </span>
            <button
              type="button"
              disabled={phase !== 'explore'}
              onClick={() => {
                scene()?.setFrozen(true);
                setHeld({ part: null });
                setPhase('peca');
              }}
            >
              📋 Lista
            </button>
          </>
        )}
        {p3 === 'working' && (
          <span className={buildsDone.length === BUILDS.length ? 'office-parts is-full' : 'office-parts'} title="Computadores montados e ligados">
            <span aria-hidden="true">🖥️</span>
            <span>
              <strong key={buildsDone.length}>{buildsDone.length}</strong>|{BUILDS.length}
            </span>
          </span>
        )}
        {q2 === 'carrying' && (
          <span className="office-parts is-full" title="Cópias impressas na mão">
            <span aria-hidden="true">📄</span>
            <span>
              <strong>10</strong> cópias
            </span>
          </span>
        )}
        {f5 === 'pending' && (
          <button type="button" className="office-phone-hud" disabled={phase !== 'explore'} onClick={openPhone}>
            📱 Celular
          </button>
        )}
        <span className="office-spacer" />
        <button
          type="button"
          aria-pressed={overview}
          onClick={() => {
            scene()?.setOverview(!overview);
            refocus();
          }}
        >
          🗺️ Visão geral <kbd>M</kbd>
        </button>
        <button
          type="button"
          aria-pressed={debug}
          onClick={() => {
            scene()?.setDebug(!debug);
            refocus();
          }}
        >
          🧱 Colisões <kbd>C</kbd>
        </button>
      </div>
      <p className={objective.done ? 'office-objective done' : 'office-objective'}>
        🎯 <strong>{objective.title}</strong> {objective.text}
      </p>

      <div className="office-stage" ref={stageRef}>
        <div
          ref={hostRef}
          className="office-canvas"
          tabIndex={0}
          aria-label="Escritório. Use as setas ou W A S D para andar."
          onPointerDown={refocus}
        />

        {clockShow && (
          <RelogioPassando
            from={MISSAO_FORCA.clockFrom}
            minutes={MISSAO_FORCA.clockMinutes}
            caption={MISSAO_FORCA.later}
            onDone={() => void clockDone()}
          />
        )}
        {toast && (
          <div className="office-toast" role="status">
            {toast}
          </div>
        )}

        {phase === 'greeting' && (
          <DialogBox
            speaker={MISSAO_CEO.speaker}
            portrait="ceo-bravo-a"
            text={MISSAO_CEO.greeting}
            onContinue={() => {
              placeBalloon();
              setPhase('ask');
            }}
          />
        )}
        {phase === 'ask' && (
          <ChoiceBalloon
            text={MISSAO_CEO.question}
            at={balloonAt}
            onChoose={(yes) => setPhase(yes ? 'playing' : 'declined')}
          />
        )}
        {phase === 'declined' && (
          <DialogBox speaker={MISSAO_CEO.speaker} portrait="ceo-bravo-b" text={MISSAO_CEO.declined} onContinue={backToExplore} />
        )}
        {phase === 'ask4' && (
          <ChoiceBalloon
            text={MISSAO_QUADRO.question}
            at={balloonAt}
            onChoose={(yes) => {
              if (yes) setPhase('board');
              else say([bruno(MISSAO_QUADRO.declined)], backToExplore);
            }}
          />
        )}
        {phase === 'ask5' && (
          <ChoiceBalloon
            text={MISSAO_PROVA.question}
            at={balloonAt}
            onChoose={(yes) => {
              if (yes) setPhase('tablet');
              else say([elisa(MISSAO_PROVA.declined)], backToExplore);
            }}
          />
        )}
        {phase === 'tablet' && (
          <TabletOverlay heading="Prova de informática da Elisa" game={quiz ?? QUIZ_PADRAO} onClose={finishTablet} />
        )}
        {phase === 'os' && openOs && (
          <DesktopModal
            key={openOs}
            pc={OFFICE_PCS.find((pc) => pc.id === openOs)!}
            state={power.current[openOs]}
            onChange={(st) => updatePower(openOs, st)}
            onClose={closeOs}
          />
        )}
        {phase === 'alarm' && <AlarmPanel code={MISSAO_FIM.code} onArm={armAlarm} onClose={backToExplore} />}
        {phase === 'summary' && (
          <DaySummary
            day={fase}
            total={xp}
            startXp={fase > 1 ? startXp : 0}
            entries={xpLog.current}
            onRestart={onRestart}
            onClose={backToExplore}
            onNextDay={fase < 4 ? () => onNextDay(xpNow.current) : undefined}
          />
        )}
        {phase === 'survey' && openDevice && (
          <LevantamentoModal
            key={openDevice}
            device={SURVEY_DEVICES.find((d) => d.id === openDevice)!}
            survey={survey.current}
            onChange={(tag) => updateTag(openDevice, tag)}
            onClose={closeSurvey}
          />
        )}
        {phase === 'askF2b' && (
          <ChoiceBalloon
            text={MISSAO_CACA.question}
            at={balloonAt}
            onChoose={(yes) => {
              if (yes) acceptF2M2();
              else say([diego(MISSAO_CACA.declined)], backToExplore);
            }}
          />
        )}
        {phase === 'board2' && (
          <QuadroOverlay
            heading="Ache as palavras do quadro da reunião"
            game={wordSearch ?? CACA_PALAVRAS_PADRAO}
            gameType="CACA_PALAVRAS"
            onClose={finishBoard2}
          />
        )}
        {phase === 'placa' && picked && <PlacaDestaque key={picked.count} model={picked.model} count={picked.count} onDone={storeBoard} />}
        {phase === 'hangman' && (
          <TabletOverlay
            heading="Forca do Marcos"
            game={hangman ?? FORCA_PADRAO}
            gameType="FORCA"
            holder="estagiario"
            doneLabel="Pronto"
            onClose={finishHangman}
          />
        )}
        {phase === 'peca' && held && (
          <PecaNaMao key={held.part?.id ?? 'lista'} part={held.part} bag={bag} delivered={delivered} onStore={storePart} onLeave={leavePart} />
        )}
        {phase === 'askP2' && (
          <ChoiceBalloon
            text={MISSAO_CRUZADAS_RITA.question}
            at={balloonAt}
            onChoose={(yes) => {
              if (yes) setPhase('crosswordP2');
              else say([rita(MISSAO_CRUZADAS_RITA.declined)], ritaWaits);
            }}
          />
        )}
        {phase === 'crosswordP2' && (
          <TabletOverlay
            heading="Palavras-cruzadas da Rita"
            game={ritaCrossword ?? CRUZADAS_RITA_PADRAO}
            gameType="CRUZADAS"
            holder="estagiario"
            doneLabel="Devolver o tablet"
            onClose={finishRitaCrossword}
          />
        )}
        {phase === 'montar' && openBuild !== null && (
          <MontarPcModal
            key={BUILDS[openBuild].id}
            build={BUILDS[openBuild]}
            index={openBuild + 1}
            state={builds.current[BUILDS[openBuild].id]}
            onChange={(st) => {
              builds.current = { ...builds.current, [BUILDS[openBuild].id]: st };
              setBuildTick((n) => n + 1);
            }}
            onClose={closePcBox}
          />
        )}
        {phase === 'quizP4' && (
          <TabletOverlay
            heading="Quiz da reunião de alinhamento"
            game={alignmentQuiz ?? QUIZ_ALINHAMENTO_PADRAO}
            device="notebook"
            doneLabel="Entregar ao chefe"
            onClose={finishQuizP4}
          />
        )}
        {phase === 'projetor' && <ProjetorModal state={setup} onChange={setSetup} onClose={closeProjector} />}
        {phase === 'pcImpressao' && <PcImpressaoModal state={printer} onChange={setPrinter} onClose={closePcImpressao} />}
        {phase === 'impressora' && <ImpressoraModal state={printer} onChange={setPrinter} onClose={closeImpressora} />}
        {phase === 'paperQ3' && (
          <PapelOverlay heading={MISSAO_TREINAMENTO.heading} game={trainingPhrases ?? FRASES_TREINAMENTO_PADRAO} onClose={finishPaper} />
        )}
        {phase === 'quizQ4' && (
          <PapelOverlay
            heading={MISSAO_QUIZ_TREINAMENTO.heading}
            kicker={MISSAO_QUIZ_TREINAMENTO.kicker}
            gameType="QUIZ"
            game={trainingQuiz ?? QUIZ_TREINAMENTO_PADRAO}
            onClose={finishQuizQ4}
          />
        )}
        {phase === 'cacaQ5' && (
          <PapelOverlay
            heading={MISSAO_CACA_TREINAMENTO.heading}
            kicker={MISSAO_CACA_TREINAMENTO.kicker}
            gameType="CACA_PALAVRAS"
            game={trainingWordSearch ?? CACA_PALAVRAS_TREINAMENTO_PADRAO}
            onClose={finishCacaQ5}
          />
        )}
        {phase === 'dreamP5' && (
          <SonhoOverlay heading={MISSAO_BANHEIRO.dreamHeading} game={bathroomWordSearch ?? CACA_PALAVRAS_BANHEIRO_PADRAO} onClose={finishDream} />
        )}
        {phase === 'phone' && (
          <CelularOverlay
            game={surpriseQuiz ?? QUIZ_SURPRESA_PADRAO}
            attempts={attempts}
            intro={!phoneSeen.current}
            onAttempt={sendExercise}
            onClose={closePhone}
          />
        )}
        {phase === 'askF2' && (
          <ChoiceBalloon
            text={MISSAO_LEVANTAMENTO.question(tagged)}
            at={balloonAt}
            onChoose={(yes) => {
              if (yes) checkSurveyF2();
              else say([marcos(MISSAO_LEVANTAMENTO.declined)], backToExplore);
            }}
          />
        )}
        {phase === 'board' && (
          <QuadroOverlay heading="Ajude o Bruno a arrumar as frases" game={phrases ?? FRASES_PADRAO} onClose={finishBoard} />
        )}
        {phase === 'playing' && (
          <MinigameOverlay heading="Ajude o CEO a resolver" game={crossword ?? CRUZADAS_PADRAO} onClose={finishGame} />
        )}
        {phase === 'dialog' && line && (
          <DialogBox
            key={`${dialog.i}:${line.text}`}
            speaker={line.speaker}
            portrait={line.portrait}
            text={line.text}
            badge={line.badge}
            continueLabel={line.continueLabel}
            onContinue={nextLine}
          />
        )}
        {phase === 'kit' && openKit !== null && (
          <MontagemModal
            key={openKit}
            kit={KITS[openKit]}
            state={kitStates.current[openKit]}
            onChange={(st) => updateKit(openKit, st)}
            onClose={(done) => closeKit(openKit, done)}
          />
        )}
        {phase === 'pc' && openPc !== null && (
          <PcModal
            key={openPc}
            index={openPc}
            model={PC_MODELS[openPc]}
            state={pcStates.current[openPc]}
            secondsLeft={secondsLeft}
            onChange={(st) => updatePc(openPc, st)}
            onClose={(signed) => closePc(openPc, signed)}
          />
        )}

        <div className="office-dpad" aria-hidden="true">
          {DPAD.map((b) => (
            <button
              key={b.area}
              type="button"
              tabIndex={-1}
              style={{ gridArea: b.area }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                scene()?.setTouchDirection(b.x, b.y);
              }}
              onPointerUp={() => scene()?.setTouchDirection(0, 0)}
              onPointerCancel={() => scene()?.setTouchDirection(0, 0)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <p className="office-help">
        <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> ou <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> para andar ·
        segure <kbd>Shift</kbd> para correr · clique no jogo se o teclado não responder
      </p>
    </div>
  );
}
