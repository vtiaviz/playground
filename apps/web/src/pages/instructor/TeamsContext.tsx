import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api } from '../../api';
import type { Team } from '../../types';

interface TeamsState {
  teams: Team[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const TeamsContext = createContext<TeamsState | null>(null);

// Lista de turmas compartilhada entre a barra lateral e as páginas
export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ teams: Team[] }>('/teams');
      setTeams(r.teams);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro ao carregar as turmas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ teams, loading, error, refresh }), [teams, loading, error, refresh]);
  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>;
}

export function useTeams(): TeamsState {
  const ctx = useContext(TeamsContext);
  if (!ctx) throw new Error('useTeams precisa estar dentro de <TeamsProvider>');
  return ctx;
}
