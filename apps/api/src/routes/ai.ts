import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { buildMessages, convertResponse, parseModelJson } from '@playground/games/ai';
import { isGameType } from '@playground/games/validate';
import { config } from '../config';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { tutorItem } from '@playground/games/tutor';
import { LlmError, chatJson, llmFromConfig } from '../ai/llm';
import { TUTOR_DISABLED, askTutor, tutorAskSchema, tutorEnabled, tutorStatus } from '../ai/tutor';
import { ScrapeError, scrape } from '../ai/scrape';

// Gerador de conteúdo com IA: link -> scraping -> texto -> modelo -> fácil / normal / difícil.
// Não grava nada: o instrutor confere, ajusta e salva na biblioteca (POST /api/games/batch).
export const aiRouter = Router();

aiRouter.use(requireAuth, requirePasswordChanged, requireRole('INSTRUCTOR'));

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: () => config.ai.rateLimit,
  keyGenerator: (req) => req.user!.id,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas gerações seguidas. Espere alguns minutos e tente de novo.' },
});

const generateSchema = z.object({
  gameType: z.string(),
  url: z.string().trim().min(1, 'Informe o link do material').max(2000, 'Link longo demais'),
  instructions: z.string().trim().max(500, 'As instruções extras têm no máximo 500 caracteres').optional().default(''),
});

const providerName = (baseUrl: string) => {
  try {
    return new URL(baseUrl).hostname.replace(/^api\./, '');
  } catch {
    return baseUrl;
  }
};

aiRouter.get('/status', (_req, res) => {
  res.json({ enabled: config.ai.apiKey !== '', provider: providerName(config.ai.baseUrl), model: config.ai.model, tutor: tutorStatus() });
});

aiRouter.post('/generate', limiter, async (req, res) => {
  if (!config.ai.apiKey) {
    res.status(503).json({ error: 'O gerador com IA não está configurado: defina AI_API_KEY no .env da API.', code: 'AI_DISABLED' });
    return;
  }
  const body = generateSchema.parse(req.body);
  if (!isGameType(body.gameType)) {
    res.status(400).json({ error: 'Tipo de jogo desconhecido' });
    return;
  }

  try {
    const source = await scrape(body.url, { maxChars: config.ai.maxSourceChars });
    const messages = buildMessages(body.gameType, source, body.instructions);
    const seed = Math.floor(Math.random() * 2 ** 31);

    let result = convertResponse(body.gameType, parseModelJson(await chatJson(messages, llmFromConfig())), { fallbackTitle: source.title, seed });
    // resposta fora do formato: uma segunda tentativa costuma resolver
    if (result.levels.every((l) => l.config === null)) {
      result = convertResponse(body.gameType, parseModelJson(await chatJson(messages, llmFromConfig())), { fallbackTitle: source.title, seed });
    }
    if (result.levels.every((l) => l.config === null)) {
      res.status(502).json({ error: 'A IA não gerou conteúdo aproveitável para este jogo. Tente de novo ou use outra página.' });
      return;
    }

    res.json({
      gameType: body.gameType,
      title: result.title,
      levels: result.levels,
      source: { title: source.title, url: source.url, chars: source.text.length, truncated: source.truncated },
      model: config.ai.model,
    });
  } catch (e) {
    if (e instanceof ScrapeError || e instanceof LlmError) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    throw e;
  }
});

// ---------- Tutor IA na pré-visualização ("Visualizar como aluno") ----------
// O instrutor testa o tutor com a configuração do editor. Nada é gravado; a conversa vem do navegador.

const tutorLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: () => config.ai.rateLimit * 2,
  keyGenerator: (req) => req.user!.id,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitos pedidos ao tutor seguidos. Espere alguns minutos e tente de novo.' },
});

const previewSchema = tutorAskSchema.and(
  z.object({
    gameType: z.string(),
    config: z.unknown(),
    history: z
      .array(z.object({ role: z.enum(['student', 'tutor']), text: z.string().max(1000) }))
      .max(8)
      .optional()
      .default([]),
  }),
);

aiRouter.post('/tutor', tutorLimiter, async (req, res) => {
  if (!tutorEnabled()) {
    res.status(503).json(TUTOR_DISABLED);
    return;
  }
  const body = previewSchema.parse(req.body);
  if (!isGameType(body.gameType)) {
    res.status(400).json({ error: 'Tipo de jogo desconhecido' });
    return;
  }
  const item = tutorItem(body.gameType, body.config, body.item);
  if (!item) {
    res.status(400).json({ error: 'Pergunta inválida para este jogo' });
    return;
  }
  try {
    const r = await askTutor(item, {
      state: body.state,
      trigger: body.trigger,
      message: body.message,
      history: body.history,
      helpNumber: body.history.filter((t) => t.role === 'tutor').length + 1,
    });
    res.json({ reply: r.reply, label: item.label, filtered: r.filtered });
  } catch (e) {
    if (e instanceof LlmError) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    throw e;
  }
});
