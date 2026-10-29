const BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'playground:token';

// localStorage pode lançar exceção (modo privado, dados bloqueados): nunca deixa isso quebrar o app.
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* segue sem persistir */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignora */
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // resposta sem JSON = não veio da nossa API (ex.: proxy do Vite sem destino)
    const fallback =
      res.status >= 500
        ? `Servidor indisponível (HTTP ${res.status}). Verifique se a API está rodando.`
        : `Erro inesperado (HTTP ${res.status}).`;
    throw new ApiError(res.status, data?.error ?? fallback, data?.code);
  }
  return data as T;
}
