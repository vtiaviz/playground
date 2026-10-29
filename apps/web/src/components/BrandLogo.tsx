interface Props {
  // full = marca + nome + slogan; compact = marca + nome (cabeçalhos)
  variant?: 'full' | 'compact';
  // true quando o fundo é sempre escuro (barra azul-marinho): usa a versão clara do logo
  onDark?: boolean;
  height?: number;
  className?: string;
}

const FILES = {
  full: { light: '/logo.png', dark: '/logo-dark.png' },
  compact: { light: '/logo-compact.png', dark: '/logo-compact-dark.png' },
} as const;

// Logo da marca. Em fundos que mudam com o tema, troca sozinho entre a versão escura e a clara.
export default function BrandLogo({ variant = 'full', onDark = false, height, className }: Props) {
  const f = FILES[variant];
  const style = height ? { height } : undefined;
  if (onDark) return <img src={f.dark} alt="Playground" className={className ? `logo ${className}` : 'logo'} style={style} />;
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={f.dark} />
      <img src={f.light} alt="Playground" className={className ? `logo ${className}` : 'logo'} style={style} />
    </picture>
  );
}
