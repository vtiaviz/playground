import type { GameType } from '../types';

// Os três níveis que a IA sempre gera, nesta ordem
export const LEVELS = ['easy', 'normal', 'hard'] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABEL: Record<Level, string> = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };

export interface ConvertContext {
  title: string; // título já com o nível ("Redes — Fácil")
  level: Level;
  seed: number; // para jogos com sorteio (grade, ordem das alternativas)
}

// Gerador de conteúdo de UM jogo: o que pedir ao modelo e como transformar a resposta em config.
// Sem React e sem rede: roda no servidor (`@playground/games/ai`).
export interface AiSpec<C> {
  type: GameType;
  // Formato JSON de um nível, descrito para o modelo
  shape: string;
  // Regras que valem para todos os níveis
  rules: string[];
  // O que muda em cada nível (quantidade e dificuldade)
  levels: Record<Level, string>;
  // Resposta do modelo (um nível) -> config válida do jogo, ou null se não der para aproveitar.
  // Itens ruins são descartados um a um; só falha se sobrar pouco.
  toConfig: (raw: unknown, ctx: ConvertContext) => C | null;
  // Gabarito legível, para o instrutor conferir antes de salvar
  answerKey: (config: C) => string[];
}
