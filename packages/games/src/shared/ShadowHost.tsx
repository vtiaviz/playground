import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GameInstanceContext, activateInstance, isInstanceActive, registerInstance } from './instance';

// Os jogos foram feitos como páginas independentes, com CSS global. Dentro do mesmo app isso
// causaria conflitos (os editores repetem nomes de classe) e herdaria os estilos do app.
// O Shadow DOM isola o CSS nos dois sentidos; o `all: initial` também corta a herança
// (por exemplo, o modo escuro do app não deixa o texto do jogo ilegível).
const BASE_CSS = `
:host {
  all: initial;
  display: block;
  color: #111827;
  background: #ffffff;
  color-scheme: light;
  font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; }
`;

interface Props {
  css: string;
  children: ReactNode;
}

export default function ShadowHost({ css, children }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const id = useMemo(() => Symbol('game'), []);
  const instance = useMemo(() => ({ isActive: () => isInstanceActive(id) }), [id]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    root.replaceChildren();

    const style = document.createElement('style');
    style.textContent = BASE_CSS + css;
    const el = document.createElement('div');
    root.append(style, el);
    setMount(el);

    return () => {
      root.replaceChildren();
      setMount(null);
    };
  }, [css]);

  useEffect(() => registerInstance(id), [id]);

  return (
    <div ref={hostRef} onPointerDownCapture={() => activateInstance(id)} onFocusCapture={() => activateInstance(id)}>
      {mount &&
        createPortal(<GameInstanceContext.Provider value={instance}>{children}</GameInstanceContext.Provider>, mount)}
    </div>
  );
}
