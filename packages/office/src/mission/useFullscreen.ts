import { useEffect, useState, type RefObject } from 'react';

/**
 * Tela cheia de verdade (API do navegador) para um modal; sem ela, o modal só ganha a classe de tela cheia
 * e ocupa a janela inteira. Esc sai da tela cheia do navegador e o evento mantém o estado em dia.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const sync = () => setFullscreen(document.fullscreenElement === el);
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      if (el && document.fullscreenElement === el) void document.exitFullscreen().catch(() => {});
    };
  }, [ref]);

  const toggle = async () => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    } else if (el.requestFullscreen) {
      try {
        await el.requestFullscreen();
        setFullscreen(true);
      } catch {
        setFullscreen((v) => !v);
      }
    } else {
      setFullscreen((v) => !v);
    }
  };

  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };

  return { fullscreen, toggle, exit };
}
