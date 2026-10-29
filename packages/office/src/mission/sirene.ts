/** Toca a sirene do alarme (som sintetizado, sem arquivo). Em navegador sem áudio, só não toca. */
export function playSiren(ms = 2600) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    gain.gain.value = 0.04;
    osc.connect(gain).connect(ctx.destination);
    const t = ctx.currentTime;
    for (let i = 0; i < ms / 500; i++) {
      osc.frequency.setValueAtTime(900, t + i * 0.5);
      osc.frequency.linearRampToValueAtTime(580, t + i * 0.5 + 0.45);
    }
    osc.start(t);
    osc.stop(t + ms / 1000);
    osc.onended = () => void ctx.close();
  } catch {
    // sem áudio: o alarme continua aparecendo na tela
  }
}
