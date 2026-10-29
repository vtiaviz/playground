// Ícones desenhados à mão (SVG) para as telas dos sistemas operacionais da missão 6.
// São imitações simplificadas, só para o aluno reconhecer cada sistema.

type P = { size?: number };

/** Bandeira de 4 cores tremulando (Windows XP e 7). */
export function FlagXP({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2 4 Q5 2.5 9 3.6 L8.4 9.2 Q5 8 1.6 9.4 Z" fill="#f35325" />
      <path d="M10.2 3.9 Q14 5 18 3.6 L17.4 9.2 Q13.6 10.4 9.6 9.4 Z" fill="#81bc06" />
      <path d="M1.4 10.6 Q5 9.2 8.2 10.4 L7.6 16.2 Q4.4 15 0.8 16.4 Z" fill="#05a6f0" />
      <path d="M9.4 10.6 Q13.4 11.8 17.2 10.4 L16.6 16 Q12.6 17.2 8.8 16.2 Z" fill="#ffba08" />
    </svg>
  );
}

/** Logotipo de 4 vidraças em perspectiva (Windows 10). */
export function Win10Logo({ size = 18, color = '#fff' }: P & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M1 3.6 L8.4 2.6 V9.4 H1 Z M9.6 2.4 L19 1 V9.4 H9.6 Z M1 10.6 H8.4 V17.4 L1 16.4 Z M9.6 10.6 H19 V19 L9.6 17.6 Z" fill={color} />
    </svg>
  );
}

/** Quatro quadrados azuis (Windows 11). */
export function Win11Logo({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <linearGradient id="w11g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3ccbf4" />
          <stop offset="1" stopColor="#0f6cbd" />
        </linearGradient>
      </defs>
      <path d="M1 1h8.6v8.6H1zM10.4 1H19v8.6h-8.6zM1 10.4h8.6V19H1zM10.4 10.4H19V19h-8.6z" fill="url(#w11g)" />
    </svg>
  );
}

/** Círculo com três pontos (lembra o símbolo do Ubuntu). */
export function UbuntuLogo({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9.4" fill="#e95420" />
      <circle cx="10" cy="10" r="4.6" fill="none" stroke="#fff" strokeWidth="1.8" />
      {[0, 120, 240].map((a) => (
        <circle key={a} cx={10 + 6.4 * Math.cos((a * Math.PI) / 180)} cy={10 + 6.4 * Math.sin((a * Math.PI) / 180)} r="1.9" fill="#fff" stroke="#e95420" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

/** Quadradinho verde com "lm" (lembra o símbolo do Linux Mint). */
export function MintLogo({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1" y="1" width="18" height="18" rx="5" fill="#87cf3e" />
      <path d="M5 5v7.2a2.8 2.8 0 0 0 2.8 2.8H15V9.4a2.6 2.6 0 0 0-5.2 0V13M12.4 9.4V13" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Símbolo de energia ⏻. */
export function PowerIcon({ size = 16, color = 'currentColor' }: P & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 4.6a7 7 0 1 0 8 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10 2v7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MoonIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M13 3a7 7 0 1 0 4 11A6 6 0 0 1 13 3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function RestartIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M16 10a6 6 0 1 1-2-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.6 1.8v4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="9" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function LogoutIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8 3H4v14h4M13 6l4 4-4 4M17 10H8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ size = 14 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M13 13l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GearIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M4.2 15.8l1.7-1.7M14.1 5.9l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UserIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="7" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 18a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function WifiIcon({ size = 14 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2 8a12 12 0 0 1 16 0M5 11a8 8 0 0 1 10 0M8 14a4 4 0 0 1 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="17" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function SpeakerIcon({ size = 14 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 8h3l4-3.5v11L6 12H3Z" fill="currentColor" />
      <path d="M13 7a4 4 0 0 1 0 6M15.4 4.6a7.4 7.4 0 0 1 0 10.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BatteryIcon({ size = 16 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 20" aria-hidden="true">
      <rect x="1" y="5.5" width="17" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="7.5" width="13" height="5" rx="0.8" fill="currentColor" />
      <rect x="19" y="8.4" width="2" height="3.2" rx="0.6" fill="currentColor" />
    </svg>
  );
}

/** Ícones de programas e pastas: quadradinhos coloridos com um desenho simples. */
export type AppKind =
  | 'folder'
  | 'computer'
  | 'trash'
  | 'browser'
  | 'mail'
  | 'music'
  | 'image'
  | 'doc'
  | 'calc'
  | 'notes'
  | 'paint'
  | 'terminal'
  | 'store'
  | 'settings'
  | 'fox'
  | 'help'
  | 'calendar'
  | 'photos'
  | 'video'
  | 'sheet'
  | 'slides'
  | 'clock'
  | 'weather'
  | 'home';

export function AppIcon({ kind, size = 32 }: { kind: AppKind; size?: number }) {
  const s = size;
  const body = (() => {
    switch (kind) {
      case 'folder':
      case 'home':
        return (
          <>
            <path d="M2 6.5a1.5 1.5 0 0 1 1.5-1.5h5l2 2h7A1.5 1.5 0 0 1 19 8.5V16a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 2 16Z" fill="#e8a92c" />
            <path d="M2 9h17v7a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 2 16Z" fill="#fcc94a" />
            {kind === 'home' && <path d="M7 15v-3l3.5-2.6L14 12v3Z" fill="#fff" />}
          </>
        );
      case 'computer':
        return (
          <>
            <rect x="2.5" y="3" width="15" height="10.5" rx="1" fill="#41566e" />
            <rect x="3.8" y="4.3" width="12.4" height="7.9" fill="#5fb6f5" />
            <rect x="8" y="13.5" width="4" height="2.5" fill="#8a97a6" />
            <rect x="5.5" y="16" width="9" height="1.6" rx="0.6" fill="#b9c3cf" />
          </>
        );
      case 'trash':
        return (
          <>
            <path d="M5 6h10l-1 12H6Z" fill="#c9d4df" stroke="#7b8896" strokeWidth="0.8" />
            <rect x="4" y="4" width="12" height="2" rx="0.6" fill="#9eacba" />
            <path d="M8 8v8M10 8v8M12 8v8" stroke="#8796a6" strokeWidth="0.8" />
          </>
        );
      case 'browser':
        return (
          <>
            <circle cx="10" cy="10" r="8" fill="#1e88e5" />
            <path d="M2 10h16M10 2c3 3 3 13 0 16M10 2c-3 3-3 13 0 16" fill="none" stroke="#bfe1ff" strokeWidth="1" />
          </>
        );
      case 'fox':
        return (
          <>
            <circle cx="10" cy="10" r="8.4" fill="#5b2dc4" />
            <path d="M3.4 7.2A7.6 7.6 0 0 0 16.8 14c-2 1.2-6 1.4-8-1-1.8-2.2-.4-5 1.8-5.4C8 5 5.6 5.6 3.4 7.2Z" fill="#ff8a1c" />
            <path d="M14 3.4c2 1.2 3.4 3.6 3 6.4-1-2.6-3-3.6-5-3.4 1-.8 1.6-1.8 2-3Z" fill="#ffc23a" />
          </>
        );
      case 'mail':
        return (
          <>
            <rect x="2" y="4.5" width="16" height="11" rx="1.2" fill="#2f8be0" />
            <path d="M2.6 5.4 10 11l7.4-5.6" fill="none" stroke="#fff" strokeWidth="1.4" />
          </>
        );
      case 'music':
        return (
          <>
            <rect x="2" y="2" width="16" height="16" rx="3.5" fill="#f25b2a" />
            <path d="M8 14V6l6-1.4v7.8" fill="none" stroke="#fff" strokeWidth="1.5" />
            <circle cx="6.8" cy="14" r="1.8" fill="#fff" />
            <circle cx="12.8" cy="12.6" r="1.8" fill="#fff" />
          </>
        );
      case 'image':
      case 'photos':
        return (
          <>
            <rect x="2" y="3" width="16" height="14" rx="2" fill={kind === 'photos' ? '#0f6cbd' : '#3aa36b'} />
            <circle cx="7" cy="7.5" r="1.8" fill="#ffe08a" />
            <path d="M2.5 15l5-5 3.5 3.5 2.5-2.5 4 4" fill="none" stroke="#fff" strokeWidth="1.4" />
          </>
        );
      case 'doc':
        return (
          <>
            <path d="M4 2h8l4 4v12H4Z" fill="#fff" stroke="#8796a6" strokeWidth="0.8" />
            <path d="M12 2v4h4" fill="#d7dee6" />
            <path d="M6.5 9h7M6.5 11.5h7M6.5 14h5" stroke="#2b6cc4" strokeWidth="1.1" />
          </>
        );
      case 'sheet':
        return (
          <>
            <rect x="2" y="2" width="16" height="16" rx="3" fill="#1d7a46" />
            <path d="M5 6h10M5 10h10M5 14h10M10 6v8" stroke="#fff" strokeWidth="1.2" />
          </>
        );
      case 'slides':
        return (
          <>
            <rect x="2" y="2" width="16" height="16" rx="3" fill="#c94f2b" />
            <rect x="5" y="5.5" width="10" height="7" rx="0.8" fill="#fff" />
            <path d="M10 12.5v3" stroke="#fff" strokeWidth="1.3" />
          </>
        );
      case 'calc':
        return (
          <>
            <rect x="3.5" y="2" width="13" height="16" rx="2" fill="#4b5563" />
            <rect x="5.2" y="3.8" width="9.6" height="3.4" rx="0.6" fill="#c8f0d2" />
            {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={5.3 + c * 3.4} y={9 + r * 2.9} width="2.4" height="2" rx="0.4" fill="#e5e7eb" />))}
          </>
        );
      case 'notes':
        return (
          <>
            <rect x="3.5" y="2" width="13" height="16" rx="1" fill="#f8f3c8" stroke="#9b8f4a" strokeWidth="0.8" />
            <path d="M6 7h8M6 10h8M6 13h6" stroke="#6b7280" strokeWidth="1" />
            <rect x="3.5" y="2" width="13" height="2.6" fill="#5b8fd0" />
          </>
        );
      case 'paint':
        return (
          <>
            <path d="M10 2.4a7.6 7.6 0 1 0 0 15.2c1.2 0 1.6-1 1-2-.8-1.2 0-2.4 1.4-2.4h2.2A3 3 0 0 0 17.6 10 7.6 7.6 0 0 0 10 2.4Z" fill="#f4e3c0" stroke="#a58a5a" strokeWidth="0.8" />
            <circle cx="6.4" cy="8" r="1.4" fill="#e53935" />
            <circle cx="9.4" cy="5.6" r="1.4" fill="#fbc02d" />
            <circle cx="13" cy="6.6" r="1.4" fill="#43a047" />
            <circle cx="6.4" cy="12" r="1.4" fill="#1e88e5" />
          </>
        );
      case 'terminal':
        return (
          <>
            <rect x="2" y="3" width="16" height="14" rx="2" fill="#2b2b2b" />
            <path d="M5 8l3 2-3 2M9.5 13H14" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          </>
        );
      case 'store':
        return (
          <>
            <path d="M3 6h14l-1 11H4Z" fill="#e95420" />
            <path d="M7 6V5a3 3 0 0 1 6 0v1" fill="none" stroke="#e95420" strokeWidth="1.5" />
            <path d="M8 10.5h4M10 8.5v4" stroke="#fff" strokeWidth="1.4" />
          </>
        );
      case 'settings':
        return (
          <>
            <rect x="2" y="2" width="16" height="16" rx="3.5" fill="#6b7280" />
            <g color="#fff" transform="translate(2 2) scale(0.8)">
              <GearInline />
            </g>
          </>
        );
      case 'help':
        return (
          <>
            <circle cx="10" cy="10" r="8" fill="#2f8be0" />
            <path d="M7.6 7.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="10" cy="14.6" r="1" fill="#fff" />
          </>
        );
      case 'calendar':
        return (
          <>
            <rect x="2.5" y="3.5" width="15" height="14" rx="2" fill="#fff" stroke="#8796a6" strokeWidth="0.8" />
            <rect x="2.5" y="3.5" width="15" height="4" rx="2" fill="#2f8be0" />
            <text x="10" y="15.4" fontSize="7" textAnchor="middle" fill="#1f2937" fontFamily="sans-serif" fontWeight="700">
              27
            </text>
          </>
        );
      case 'video':
        return (
          <>
            <rect x="2" y="4" width="16" height="12" rx="2" fill="#7c3aed" />
            <path d="M8.5 7.5v5l4.5-2.5Z" fill="#fff" />
          </>
        );
      case 'clock':
        return (
          <>
            <circle cx="10" cy="10" r="8" fill="#fff" stroke="#4b5563" strokeWidth="1" />
            <path d="M10 5.5V10l3 2" fill="none" stroke="#1f2937" strokeWidth="1.4" strokeLinecap="round" />
          </>
        );
      case 'weather':
        return (
          <>
            <circle cx="8" cy="8" r="3.6" fill="#fbbf24" />
            <path d="M6 16h8.5a3 3 0 0 0 0-6 4 4 0 0 0-7.7 1.2A2.4 2.4 0 0 0 6 16Z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.6" />
          </>
        );
    }
  })();
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" aria-hidden="true">
      {body}
    </svg>
  );
}

function GearInline() {
  return (
    <>
      <circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M4.2 15.8l1.7-1.7M14.1 5.9l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </>
  );
}
