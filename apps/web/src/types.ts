export interface Team {
  id: string;
  name: string;
  shift: string | null;
  studentCount: number;
}

export interface Student {
  id: string;
  name: string;
  login: string;
  email: string | null;
  registration: string | null;
  mustChangePassword: boolean;
}

// Senha temporária em texto: só existe na resposta da importação / "nova senha"
export interface Credential {
  id: string;
  name: string;
  login: string;
  password: string;
}

export interface ImportResult {
  created: Credential[];
  enrolledExisting: { id: string; name: string; login: string }[];
  alreadyInTeam: { id: string; name: string; login: string }[];
  errors: { line: number; text: string; message: string }[];
}

export type Level = 'easy' | 'normal' | 'hard';

// ---------- Fase 3: atividades ----------

// Documento do editor (Tiptap/ProseMirror em JSON)
export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface ActivitySummary {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  dueAt: string | null;
  updatedAt: string;
  teams: { id: string; name: string }[];
  gameCount: number;
  hasScores: boolean;
}

export interface ActivityFull extends ActivitySummary {
  content: DocNode;
}

// ---------- Fase 4: aluno ----------

export interface StudentActivity {
  id: string;
  title: string;
  publishedAt: string;
  dueAt: string | null;
  gameCount: number;
  playedCount: number;
  score: number;
  maxScore: number;
  feedbackGiven: boolean;
  finishedGames: boolean;
  done: boolean;
}

export interface StudentActivityDetail {
  activity: StudentActivity & { content: DocNode };
  scores: {
    blockId: string;
    score: number;
    maxScore: number;
    durationSeconds: number | null;
    completedAt: string;
    level: Level | null;
    performance: number | null;
  }[];
  feedback: { rating: number; comment: string | null } | null;
}

export interface RankRow {
  rank: number;
  studentId: string;
  name: string;
  total: number;
  isMe: boolean;
}

export interface RankingResponse {
  general: RankRow[];
  teams: { id: string; name: string; ranking: RankRow[] }[];
  me: RankRow | null;
}

// ---------- Fase 5: painel do instrutor ----------

export type DeliveryStatus = 'DONE' | 'IN_PROGRESS' | 'PENDING';

export interface StatusCounts {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
}

export interface DashboardOverview {
  kpis: {
    students: number;
    activities: number;
    deliveries: number;
    completionPct: number | null;
    pending: number;
    avgScorePct: number | null;
    avgRating: number | null;
    ratingCount: number;
  };
  teams: (StatusCounts & { id: string; name: string; students: number; activities: number; completionPct: number | null; avgScorePct: number | null })[];
  activities: (StatusCounts & {
    id: string;
    title: string;
    teams: string[];
    gameCount: number;
    avgScorePct: number | null;
    avgRating: number | null;
    ratingCount: number;
  })[];
  games: { gameType: string; plays: number; avgScorePct: number | null }[];
  ranking: { rank: number; studentId: string; name: string; teams: string[]; total: number; done: number; assigned: number; avgScorePct: number | null }[];
  satisfaction: {
    distribution: { rating: number; count: number }[];
    best: { id: string; title: string; avgRating: number | null; ratingCount: number }[];
    worst: { id: string; title: string; avgRating: number | null; ratingCount: number }[];
    comments: { activityId: string; activity: string; student: string; rating: number; comment: string }[];
  };
}

export interface ActivityDelivery {
  activity: { id: string; title: string; publishedAt: string; dueAt: string | null; gameCount: number };
  counts: StatusCounts;
  students: {
    studentId: string;
    name: string;
    teams: string[];
    status: DeliveryStatus;
    played: number;
    gameCount: number;
    score: number;
    maxScore: number;
    avgScorePct: number | null;
    lastAt: string | null;
    rating: number | null;
    avgPerformance: number | null;
    plays: { blockId: string; level: Level | null; performance: number | null }[];
  }[];
  games: {
    blockId: string;
    gameType: string;
    title: string;
    maxScore: number | null;
    plays: number;
    avgScorePct: number | null;
    adaptive: boolean;
    levelCount: number;
    byLevel: Record<Level, number> | null;
    avgPerformance: number | null;
  }[];
  feedbacks: { student: string; rating: number; comment: string | null }[];
}

export interface StudentCard {
  student: { id: string; name: string; teams: string[]; total: number; avgScorePct: number | null; done: number; assigned: number };
  activities: {
    activityId: string;
    title: string;
    dueAt: string | null;
    status: DeliveryStatus;
    played: number;
    gameCount: number;
    score: number;
    maxScore: number;
    avgScorePct: number | null;
    lastAt: string | null;
    rating: number | null;
  }[];
  games: { gameType: string; plays: number; avgScorePct: number | null }[];
}

// ---------- Biblioteca de jogos ----------

export interface SavedGame {
  id: string;
  gameType: string;
  title: string;
  config: unknown;
  maxScore: number | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Gerador com IA ----------

export interface AiStatus {
  enabled: boolean;
  provider: string;
  model: string;
  tutor?: TutorStatus;
}

export interface AiLevel {
  level: 'easy' | 'normal' | 'hard';
  title: string;
  config: unknown | null; // null = o modelo não gerou este nível
  answerKey: string[];
  error?: string;
  edited?: boolean; // ajustado pelo instrutor (o gabarito gerado deixa de valer)
}

export interface AiGeneration {
  gameType: import('@playground/games').GameType;
  title: string;
  levels: AiLevel[];
  source: { title: string; url: string; chars: number; truncated: boolean };
  model: string;
}

// ---------- Aprendizado personalizado ----------

export interface Performance {
  score: number; // 0–100
  accuracy: number;
  speed: number | null;
  items: number;
  avgSecondsPerItem: number | null;
  guesses: number;
  errors: number;
  checks: number;
  hints?: number; // pedidos de ajuda ao tutor IA (partidas antigas não têm)
  trend: number | null;
  penalties: number;
  basis: 'items' | 'score';
}

export interface LevelOutcome {
  played: Level;
  before: Level;
  after: Level;
  change: 'up' | 'down' | null;
  reason: string;
  locked: boolean;
}

export interface ScoreSaved {
  score: { blockId: string; score: number; maxScore: number; level: Level | null };
  performance: Performance;
  level: LevelOutcome | null;
  updatedGames: { blockId: string; level: Level; config: unknown }[];
}

export interface LevelCell {
  level: Level | null; // null = ainda sem partida adaptativa
  startsAt: Level | null; // nível em que vai começar
  locked: boolean;
  streak: number;
  games: number;
  plays?: number;
  lastPerformance: number | null;
  avgPerformance?: number | null;
  trend?: number | null;
}

export interface LevelsOverview {
  students: { studentId: string; name: string; teams: string[]; games: Record<string, LevelCell> }[];
  distribution: { gameType: string; easy: number; normal: number; hard: number; none: number }[];
}

export interface StudentLevelsCard {
  student: { id: string; name: string };
  games: (LevelCell & { gameType: string })[];
  events: {
    id: string;
    gameType: string;
    fromLevel: Level | null;
    toLevel: Level;
    performance: number | null;
    reason: string;
    source: 'GAME' | 'INSTRUCTOR';
    activity: string | null;
    createdAt: string;
  }[];
  plays: {
    activityId: string;
    activity: string;
    blockId: string;
    gameType: string;
    level: Level | null;
    score: number;
    maxScore: number;
    durationSeconds: number | null;
    performance: number | null;
    metrics: Performance | null;
    completedAt: string;
  }[];
  tutor: TutorLogEntry[];
}

// ---------- Tutor IA ----------

export interface TutorStatus {
  enabled: boolean;
  idleSeconds: number; // 0 = não oferece ajuda sozinho
}

export interface TutorLogEntry {
  id: string;
  activityId: string;
  activity: string;
  blockId: string;
  gameType: string;
  item: string; // "Pergunta 3 de 8"
  trigger: 'BUTTON' | 'IDLE' | 'MESSAGE';
  question: string | null;
  reply: string;
  filtered: boolean;
  createdAt: string;
}
