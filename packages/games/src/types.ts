import type { ComponentType } from 'react';

// Mesmos valores do enum `GameType` do Prisma (apps/api/prisma/schema.prisma)
export const GAME_TYPES = ['CRUZADAS', 'FORCA', 'CACA_PALAVRAS', 'QUIZ', 'COMPLETE_FRASES'] as const;
export type GameType = (typeof GAME_TYPES)[number];

// O que cada jogo entrega quando a partida termina. É isto que vai para `game_scores`.
export interface GameResult {
  score: number; // inteiro >= 0
  maxScore: number; // inteiro > 0 (a nota "cheia" deste jogo com esta configuração)
  durationSeconds: number; // inteiro >= 0
  details: Record<string, unknown>; // específico de cada jogo; sempre serializável em JSON
  // Os jogos também colocam em `details.items` o desempenho item a item (ItemResult[]): é a base
  // do nível adaptativo (veja adaptive.ts).
}

// Desempenho em UM item do jogo: pergunta (quiz), palavra (forca, caça-palavras, cruzadas) ou
// lacuna (complete as frases), na ordem da configuração.
export interface ItemResult {
  correct: number; // 0 a 1 (1 = acertou de primeira; a forca desconta as letras erradas)
  seconds: number; // tempo ATIVO gasto no item (aba em segundo plano não conta), 1 casa decimal
  errors?: number; // tentativas erradas no item (letras erradas, seleções que não eram palavra…)
}

// O que o aluno está resolvendo agora, para o tutor IA (apps/api usa `@playground/games/tutor`).
// item = índice na ordem da configuração: pergunta (quiz), palavra (forca, cruzadas) ou frase
// (complete as frases); null = o jogo todo (caça-palavras). `state` descreve, em texto curto, o que
// o aluno já fez naquele item (letras tentadas, palavras colocadas…), nunca a resposta.
export interface GameFocus {
  item: number | null;
  state: string;
}

export interface PlayerProps<C> {
  config: C;
  // Chamado UMA vez por partida, no instante em que ela termina (não ao clicar em "ver resultado").
  onComplete?: (result: GameResult) => void;
  // Chamado quando o aluno clica em "Começar" (cada partida). A atividade usa para travar o nível.
  onStart?: () => void;
  // false esconde "Jogar de novo" (a atividade vale uma tentativa). Padrão: true.
  allowRestart?: boolean;
  // Chamado quando o item em jogo muda (ou o que o aluno fez nele). null = nada para resolver agora
  // (tela inicial, resultado de uma palavra/pergunta, fim de jogo).
  onFocusChange?: (focus: GameFocus | null) => void;
  // true (padrão) = sem altura de tela cheia, próprio para ficar dentro de uma página.
  compact?: boolean;
}

export interface EditorProps<C> {
  initialConfig?: C; // para editar um jogo existente
  onSave: (config: C) => void;
  onCancel?: () => void;
  saveLabel?: string;
}

export interface GameModule<C> {
  type: GameType;
  label: string;
  description: string;
  Player: ComponentType<PlayerProps<C>>;
  Editor: ComponentType<EditorProps<C>>;
  // Valida/normaliza uma config vinda de fora (banco, rede). null = inválida.
  validateConfig: (raw: unknown) => C | null;
  // Pontuação máxima possível com esta config (o servidor confere contra `maxScore` enviado).
  maxScore: (config: C) => number;
  // Resumo curto para listas: "5 palavras", "12 questões"
  summarize: (config: C) => string;
}
