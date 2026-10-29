// Cliente mínimo de chat compatível com a API da OpenAI (Groq, Gemini, OpenRouter, Ollama…).
// Sem SDK: um POST em /chat/completions com resposta em JSON.
import { config } from '../config';
import type { ChatMessage } from '@playground/games/ai';

export class LlmError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export interface LlmOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  fetch?: typeof fetch;
}

export const llmFromConfig = (): LlmOptions => ({
  apiKey: config.ai.apiKey,
  baseUrl: config.ai.baseUrl,
  model: config.ai.model,
  maxTokens: config.ai.maxOutputTokens,
});

// Modelos que "pensam" antes de responder (gpt-oss): pensamento curto economiza a cota de tokens
const isReasoningModel = (model: string) => /gpt-oss/i.test(model);

const TIMEOUT_MS = 90_000;
const TOO_LARGE = 'O pedido passou do limite de tokens do plano grátis. Diminua AI_MAX_SOURCE_CHARS (ou AI_MAX_OUTPUT_TOKENS) no .env da API.';

export interface ChatOptions {
  json?: boolean; // pede um objeto JSON (padrão: true)
  maxTokens?: number; // padrão: opts.maxTokens
  temperature?: number;
  timeoutMs?: number;
}

export const chatJson = (messages: ChatMessage[], opts: LlmOptions) => chat(messages, opts, { json: true });

// Texto livre (tutor): resposta curta, sem JSON
export const chatText = (messages: ChatMessage[], opts: LlmOptions, o: Omit<ChatOptions, 'json'> = {}) =>
  chat(messages, opts, { ...o, json: false });

export async function chat(messages: ChatMessage[], opts: LlmOptions, o: ChatOptions = {}): Promise<string> {
  const doFetch = opts.fetch ?? fetch;
  const wantJson = o.json ?? true;
  const send = (jsonMode: boolean) =>
    doFetch(`${opts.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(o.timeoutMs ?? TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({
        model: opts.model,
        messages,
        temperature: o.temperature ?? 0.6,
        max_tokens: o.maxTokens ?? opts.maxTokens,
        ...(isReasoningModel(opts.model) ? { reasoning_effort: 'low' } : {}),
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

  let res: Response;
  try {
    res = await send(wantJson);
    // alguns provedores/modelos não aceitam response_format: tenta de novo sem
    if (wantJson && res.status === 400) {
      const body = await res.clone().text();
      if (/response_format|json_object|json mode/i.test(body) && !/json_validate_failed/i.test(body)) res = await send(false);
    }
  } catch {
    throw new LlmError('O serviço de IA não respondeu a tempo. Tente de novo.', 504);
  }

  if (res.status === 401 || res.status === 403) throw new LlmError('A chave da IA (AI_API_KEY) foi recusada pelo provedor. Confira o .env da API.', 502);
  if (res.status === 429) {
    const wait = res.headers.get('retry-after');
    throw new LlmError(`Limite do plano grátis da IA atingido. Tente de novo ${wait ? `em ${wait}s` : 'daqui a pouco'}.`, 429);
  }
  if (res.status === 413) throw new LlmError(TOO_LARGE, 422);
  const data = (await res.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[]; error?: { message?: string; code?: string } }
    | null;
  if (!res.ok) {
    // Groq devolve 400 json_validate_failed quando o modelo escreve JSON quebrado
    const detail = data?.error?.message ?? `HTTP ${res.status}`;
    if (data?.error?.code === 'model_not_found' || /does not exist|decommissioned|not found/i.test(detail))
      throw new LlmError(
        `O modelo "${opts.model}" não está disponível no provedor (pode ter sido descontinuado). Troque AI_MODEL no .env da API; no Groq, use "openai/gpt-oss-120b".`,
        502,
      );
    if (/request too large|tokens per minute|context length|too many tokens/i.test(detail)) throw new LlmError(TOO_LARGE, 422);
    throw new LlmError(`O serviço de IA recusou o pedido: ${detail.slice(0, 200)}`, 502);
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new LlmError('O serviço de IA devolveu uma resposta vazia. Tente de novo.', 502);
  return content;
}
