// Tutor IA: pergunta ao modelo e confere a resposta antes de mandar para o aluno.
// As regras (o que pedir, o que nunca dizer) ficam em `@playground/games/tutor`.
import { z } from 'zod';
import { TUTOR_FALLBACK, TUTOR_LIMITS, buildTutorMessages, cleanReply, leaksAnswer, type TutorItem, type TutorRequest } from '@playground/games/tutor';
import { config } from '../config';
import { chatText, llmFromConfig } from './llm';

export const tutorEnabled = () => config.tutor.enabled && config.ai.apiKey !== '';

export const tutorStatus = () => ({ enabled: tutorEnabled(), idleSeconds: config.tutor.idleSeconds });

export const TUTOR_DISABLED = {
  error: 'O tutor IA não está disponível agora.',
  code: 'TUTOR_DISABLED',
};

// Corpo comum dos pedidos de ajuda (aluno e pré-visualização do instrutor)
export const tutorAskSchema = z
  .object({
    item: z.number().int().min(0).max(500).nullable(),
    state: z
      .string()
      .max(2000)
      .optional()
      .transform((v) => (v ?? '').slice(0, TUTOR_LIMITS.stateChars)),
    trigger: z.enum(['button', 'idle', 'message']),
    message: z.string().trim().max(TUTOR_LIMITS.messageChars, `A mensagem pode ter no máximo ${TUTOR_LIMITS.messageChars} caracteres`).optional(),
  })
  .refine((b) => b.trigger !== 'message' || Boolean(b.message), { message: 'Escreva sua dúvida', path: ['message'] });

// Uma chamada ao modelo; se a resposta entregar a resposta do exercício, pede outra pista uma vez
// e, se insistir, manda uma pista genérica no lugar.
export async function askTutor(item: TutorItem, req: TutorRequest): Promise<{ reply: string; filtered: boolean }> {
  const messages = buildTutorMessages(item, req);
  const ask = (extra?: string) =>
    chatText(extra ? [...messages, { role: 'user', content: extra }] : messages, llmFromConfig(), {
      maxTokens: 1500, // modelos que "pensam" gastam parte disso antes de responder
      temperature: 0.5,
      timeoutMs: 30_000,
    });

  const first = cleanReply(await ask());
  if (!leaksAnswer(first, item)) return { reply: first, filtered: false };

  const second = cleanReply(
    await ask('Sua resposta anterior revelava a resposta do exercício. Escreva OUTRA pista, sem a resposta, sem soletrar e sem dizer letras ou a alternativa.'),
  );
  return { reply: leaksAnswer(second, item) ? TUTOR_FALLBACK : second, filtered: true };
}
