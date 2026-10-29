import { describe, expect, it } from 'vitest';
import { allPlaced, allPlugged, checkKit, ITEMS, KITS, newKitState, placeItem, plugCable, unplug, type KitState } from '../src/mission/montagem';

const [vga, hdmi] = KITS;

function montado(): KitState {
  let s = newKitState();
  for (const i of ITEMS) s = placeItem(s, i.id, i.id).state;
  return { ...s, step: 'cabos' };
}

describe('montagem dos computadores (missão 3)', () => {
  it('um computador usa VGA e o outro HDMI', () => {
    expect(vga.cables.find((c) => c.id === 'video')!.shape).toBe('vga');
    expect(hdmi.cables.find((c) => c.id === 'video')!.shape).toBe('hdmi');
  });

  it('peça no lugar errado volta para a caixa com uma dica', () => {
    const r = placeItem(newKitState(), 'teclado', 'mouse');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('teclado fica');
  });

  it('a webcam só entra depois do monitor', () => {
    expect(placeItem(newKitState(), 'webcam', 'webcam').ok).toBe(false);
    const s = placeItem(newKitState(), 'monitor', 'monitor').state;
    expect(placeItem(s, 'webcam', 'webcam').ok).toBe(true);
  });

  it('todas as peças no lugar libera os cabos', () => {
    expect(allPlaced(montado())).toBe(true);
  });

  it('formato diferente não encaixa', () => {
    const r = plugCable(vga, montado(), 'video', 'hdmi');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('Não encaixa');
    expect(plugCable(hdmi, montado(), 'video', 'vga').ok).toBe(false);
    expect(plugCable(vga, montado(), 'teclado', 'rj45').ok).toBe(false);
  });

  it('não encaixa dois cabos na mesma entrada', () => {
    const s = plugCable(vga, montado(), 'teclado', 'usb-1').state;
    expect(plugCable(vga, s, 'mouse', 'usb-1').ok).toBe(false);
  });

  it('tudo certo → o RH não acha nada', () => {
    let s = montado();
    const ports = { video: 'vga', energia: 'energia', teclado: 'usb-1', mouse: 'usb-2', webcam: 'usb-3', microfone: 'p2-rosa', som: 'p2-verde', rede: 'rj45' } as const;
    for (const [c, p] of Object.entries(ports)) s = plugCable(vga, s, c as never, p).state;
    expect(allPlugged(vga, s)).toBe(true);
    expect(checkKit(vga, s)).toEqual([]);
  });

  it('P2 trocado encaixa, mas o RH percebe', () => {
    let s = montado();
    s = plugCable(vga, s, 'som', 'p2-rosa').state;
    s = plugCable(vga, s, 'microfone', 'p2-verde').state;
    const errors = checkKit(vga, s);
    expect(errors.some((e) => e.includes('caixas de som'))).toBe(true);
    expect(errors.some((e) => e.includes('microfone'))).toBe(true);
    expect(errors.some((e) => e.includes('desconectado'))).toBe(true);
  });

  it('desconectar tira o cabo', () => {
    const s = plugCable(vga, montado(), 'rede', 'rj45').state;
    expect(unplug(s, 'rede').plugs.rede).toBeUndefined();
  });
});
