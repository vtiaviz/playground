import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { config } from './config';
import { activitiesRouter } from './routes/activities';
import { aiRouter } from './routes/ai';
import { authRouter } from './routes/auth';
import { studentRouter } from './routes/student';
import { dashboardRouter } from './routes/dashboard';
import { gamesRouter } from './routes/games';
import { levelsRouter } from './routes/levels';
import { teamsRouter } from './routes/teams';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/games', gamesRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/student', studentRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/levels', levelsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: err.issues[0]?.message ?? 'Dados inválidos',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    // erros 4xx do próprio Express (ex.: JSON malformado)
    const status = (err as { status?: unknown } | null)?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ error: 'Requisição inválida' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  return app;
}
