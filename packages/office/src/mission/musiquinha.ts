// Sons da fase 2 (sintetizados, sem arquivo): o tablet caindo no chão e a musiquinha do jogo da forca (missão 4),
// que continua tocando, e o celular vibrando com mensagem nova (missão 5). Em navegador sem áudio, só não toca.

/** "PLAFT": batida grave com um chiado curto. */
export function playThud() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(ctx.destination);
    // chiado do plástico batendo
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const ng = ctx.createGain();
    src.buffer = noise;
    ng.gain.value = 0.18;
    src.connect(ng).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
    src.start(t);
    osc.onended = () => void ctx.close();
  } catch {
    // sem áudio
  }
}

// melodia de 8 bits em loop (notas em Hz; 0 = pausa), uma por colcheia
const MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 0];
const BASS = [131, 0, 196, 0, 147, 0, 175, 0, 131, 0, 196, 0, 165, 0, 196, 0];
const STEP = 0.18;

export interface Jingle {
  /** 0 (mudo) a 1 (perto do tablet). */
  setVolume: (v: number) => void;
  stop: () => void;
}

/** Musiquinha do jogo tocando sem parar até `stop()`. */
export function startJingle(): Jingle {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    let next = ctx.currentTime + 0.05;
    let step = 0;
    const note = (freq: number, at: number, type: OscillatorType, level: number) => {
      if (!freq) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(level, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + STEP * 0.9);
      osc.connect(g).connect(master);
      osc.start(at);
      osc.stop(at + STEP);
    };
    // agenda as notas um pouco à frente (o setInterval do navegador não é preciso)
    const id = window.setInterval(() => {
      while (next < ctx.currentTime + 0.5) {
        note(MELODY[step % MELODY.length], next, 'square', 0.5);
        note(BASS[step % BASS.length], next, 'triangle', 0.7);
        next += STEP;
        step++;
      }
    }, 120);
    return {
      setVolume: (v) => master.gain.setTargetAtTime(0.06 * Math.max(0, Math.min(1, v)), ctx.currentTime, 0.1),
      stop: () => {
        window.clearInterval(id);
        void ctx.close();
      },
    };
  } catch {
    return { setVolume: () => {}, stop: () => {} };
  }
}

/** Celular vibrando com mensagem nova: zumbido curto duas vezes e o "plim" da notificação. */
export function playMessageTone() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    for (const at of [0, 0.32]) {
      const buzz = ctx.createOscillator();
      const g = ctx.createGain();
      buzz.type = 'sawtooth';
      buzz.frequency.value = 95;
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.linearRampToValueAtTime(0.12, t + at + 0.02);
      g.gain.setValueAtTime(0.12, t + at + 0.2);
      g.gain.linearRampToValueAtTime(0.0001, t + at + 0.24);
      buzz.connect(g).connect(ctx.destination);
      buzz.start(t + at);
      buzz.stop(t + at + 0.25);
    }
    for (const [k, f] of [988, 1319].entries()) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const at = t + 0.7 + k * 0.12;
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.2, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.35);
      osc.connect(g).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.36);
      if (k === 1) osc.onended = () => void ctx.close();
    }
  } catch {
    // sem áudio
  }
}
