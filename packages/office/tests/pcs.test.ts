import { describe, expect, it } from 'vitest';
import { BOOT_MS, diagnose, isPcReady, newPcState, PC_MODELS, pressPart, screenPhase } from '../src/mission/pcs';
import { WORKSTATIONS } from '../src/game/map';

const [torre] = PC_MODELS;
const tudoEmUm = PC_MODELS.find((m) => m.caseType === null)!;

describe('computadores da missão 2', () => {
  it('tem um modelo por estação, todos diferentes', () => {
    expect(PC_MODELS).toHaveLength(WORKSTATIONS.length);
    expect(new Set(PC_MODELS.map((m) => m.monitorType)).size).toBe(PC_MODELS.length);
  });

  it('só fica pronto com gabinete e monitor ligados, e a tela passa por "Sem sinal" e "Iniciando" até o login', () => {
    let s = newPcState();
    expect(screenPhase(s, 0)).toBe('desligado');
    s = pressPart(torre, s, 'monitor-ligar', 0).state;
    expect(screenPhase(s, 0)).toBe('sem-sinal');
    expect(isPcReady(s)).toBe(false);
    s = pressPart(torre, s, 'gabinete-ligar', 1000).state;
    expect(isPcReady(s)).toBe(true);
    expect(screenPhase(s, 1000 + BOOT_MS - 1)).toBe('iniciando');
    expect(screenPhase(s, 1000 + BOOT_MS)).toBe('login');
  });

  it('gabinete ligado com monitor desligado não está pronto', () => {
    const s = pressPart(torre, newPcState(), 'gabinete-ligar', 0).state;
    expect(isPcReady(s)).toBe(false);
    expect(diagnose(torre, s)).toContain('monitor ficou desligado');
  });

  it('clicar de novo desliga', () => {
    let s = pressPart(torre, newPcState(), 'gabinete-ligar', 0).state;
    const r = pressPart(torre, s, 'gabinete-ligar', 10);
    s = r.state;
    expect(s.caseOn).toBe(false);
    expect(r.tone).toBe('warn');
  });

  it('no tudo-em-um um botão liga tudo', () => {
    const s = pressPart(tudoEmUm, newPcState(), 'monitor-ligar', 0).state;
    expect(isPcReady(s)).toBe(true);
  });

  it('botões que não ligam nada explicam o que são e não mudam o estado', () => {
    const s = newPcState();
    for (const part of ['dvd', 'usb', 'menu-monitor', 'reset', 'teclado', 'mouse'] as const) {
      const r = pressPart(torre, s, part, 0);
      expect(r.state).toBe(s);
      expect(r.message.length).toBeGreaterThan(10);
    }
  });
});
