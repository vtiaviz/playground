import { useEffect, useState, type ReactNode } from 'react';
import type { OsId, PowerAction } from '../desligar';
import {
  AppIcon,
  BatteryIcon,
  FlagXP,
  GearIcon,
  LockIcon,
  LogoutIcon,
  MintLogo,
  MoonIcon,
  PowerIcon,
  RestartIcon,
  SearchIcon,
  SpeakerIcon,
  UbuntuLogo,
  UserIcon,
  WifiIcon,
  Win10Logo,
  Win11Logo,
  type AppKind,
} from './icones';

// Áreas de trabalho dos 6 sistemas, desenhadas em 960 × 600 (o modal escala para caber).
// Imitações próximas das telas reais, só com o necessário para achar o caminho de desligar.

export interface DesktopProps {
  user: string;
  onAction: (action: PowerAction) => void;
}

/** Fim do expediente no jogo. */
export const CLOCK = '18:07';
export const today = () => new Date().toLocaleDateString('pt-BR');
const shortDate = () => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');

function DeskIcon({ kind, label }: { kind: AppKind; label: string }) {
  return (
    <span className="os-desk-icon">
      <AppIcon kind={kind} size={40} />
      <span>{label}</span>
    </span>
  );
}

function MenuItem({ icon, children, onClick, bold }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; bold?: boolean }) {
  return (
    <button type="button" role="menuitem" className={bold ? 'os-mi is-bold' : 'os-mi'} onClick={onClick}>
      {icon && <span className="os-mi-icon">{icon}</span>}
      <span className="os-mi-text">{children}</span>
    </button>
  );
}

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

// ------------------------------------------------------------------ Windows XP

function XpTurnOff({ title = 'Desligar o computador', onPick }: { title?: string; onPick: (a: PowerAction | null) => void }) {
  return (
    <div className="os-xp-dialog-back">
      <div className="os-xp-dialog" role="dialog" aria-label={title}>
        <div className="os-xp-dialog-top">
          <span>{title}</span>
          <FlagXP size={26} />
        </div>
        <div className="os-xp-dialog-body">
          {(
            [
              ['sleep', 'Em espera', 'is-yellow', <MoonIcon key="m" size={22} />],
              ['shutdown', 'Desativar', 'is-red', <PowerIcon key="p" size={22} />],
              ['restart', 'Reiniciar', 'is-green', <RestartIcon key="r" size={22} />],
            ] as const
          ).map(([a, label, cls, icon]) => (
            <button key={a} type="button" className="os-xp-round" onClick={() => onPick(a)}>
              <span className={`os-xp-ball ${cls}`}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="os-xp-dialog-foot">
          <button type="button" className="os-xp-btn" onClick={() => onPick(null)}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function DesktopXP({ user, onAction }: DesktopProps) {
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState(false);
  return (
    <div className="os-screen os-xp" onClick={() => setMenu(false)}>
      <div className={dialog ? 'os-xp-desk is-gray' : 'os-xp-desk'}>
        <div className="os-icons">
          <DeskIcon kind="doc" label="Meus documentos" />
          <DeskIcon kind="computer" label="Meu computador" />
          <DeskIcon kind="browser" label="Internet Explorer" />
          <DeskIcon kind="trash" label="Lixeira" />
        </div>
        {menu && (
          <div className="os-xp-start-menu" role="menu" aria-label="Menu iniciar" onClick={stop}>
            <div className="os-xp-sm-top">
              <span className="os-xp-avatar" />
              <strong>{user}</strong>
            </div>
            <div className="os-xp-sm-cols">
              <div className="os-xp-sm-left">
                <MenuItem icon={<AppIcon kind="browser" size={26} />} bold>
                  Internet
                  <small>Internet Explorer</small>
                </MenuItem>
                <MenuItem icon={<AppIcon kind="mail" size={26} />} bold>
                  E-mail
                  <small>Outlook Express</small>
                </MenuItem>
                <hr />
                <MenuItem icon={<AppIcon kind="video" size={26} />}>Windows Media Player</MenuItem>
                <MenuItem icon={<AppIcon kind="paint" size={26} />}>Paint</MenuItem>
                <MenuItem icon={<AppIcon kind="notes" size={26} />}>Bloco de notas</MenuItem>
                <MenuItem icon={<AppIcon kind="calc" size={26} />}>Calculadora</MenuItem>
                <hr />
                <span className="os-xp-allprog">
                  Todos os programas <b>▶</b>
                </span>
              </div>
              <div className="os-xp-sm-right">
                <MenuItem icon={<AppIcon kind="doc" size={22} />} bold>
                  Meus documentos
                </MenuItem>
                <MenuItem icon={<AppIcon kind="image" size={22} />} bold>
                  Minhas imagens
                </MenuItem>
                <MenuItem icon={<AppIcon kind="music" size={22} />} bold>
                  Minhas músicas
                </MenuItem>
                <MenuItem icon={<AppIcon kind="computer" size={22} />} bold>
                  Meu computador
                </MenuItem>
                <hr />
                <MenuItem icon={<AppIcon kind="settings" size={22} />}>Painel de controle</MenuItem>
                <hr />
                <MenuItem icon={<AppIcon kind="help" size={22} />}>Ajuda e suporte</MenuItem>
                <MenuItem icon={<SearchIcon size={20} />}>Pesquisar</MenuItem>
              </div>
            </div>
            <div className="os-xp-sm-foot">
              <button type="button" onClick={() => onAction('logoff')}>
                <span className="os-xp-foot-icon is-key">
                  <LogoutIcon size={14} />
                </span>
                Fazer logoff
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenu(false);
                  setDialog(true);
                }}
              >
                <span className="os-xp-foot-icon is-power">
                  <PowerIcon size={14} />
                </span>
                Desligar o computador
              </button>
            </div>
          </div>
        )}
        <div className="os-xp-taskbar">
          <button
            type="button"
            className="os-xp-start"
            aria-label="iniciar"
            aria-expanded={menu}
            onClick={(e) => {
              stop(e);
              setMenu((m) => !m);
            }}
          >
            <FlagXP size={20} />
            <i>iniciar</i>
          </button>
          <span className="os-spacer" />
          <span className="os-xp-tray">
            <SpeakerIcon size={14} /> {CLOCK}
          </span>
        </div>
      </div>
      {dialog && (
        <XpTurnOff
          onPick={(a) => {
            setDialog(false);
            if (a) onAction(a);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Windows 7

export function Desktop7({ user, onAction }: DesktopProps) {
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const close = () => {
    setMenu(false);
    setMore(false);
  };
  return (
    <div className="os-screen os-w7" onClick={close}>
      <div className="os-icons">
        <DeskIcon kind="computer" label="Computador" />
        <DeskIcon kind="trash" label="Lixeira" />
      </div>
      {menu && (
        <div className="os-w7-start-menu" role="menu" aria-label="Menu Iniciar" onClick={stop}>
          <div className="os-w7-sm-left">
            <MenuItem icon={<AppIcon kind="help" size={26} />}>Introdução</MenuItem>
            <MenuItem icon={<AppIcon kind="video" size={26} />}>Windows Media Center</MenuItem>
            <MenuItem icon={<AppIcon kind="calc" size={26} />}>Calculadora</MenuItem>
            <MenuItem icon={<AppIcon kind="notes" size={26} />}>Notas Autoadesivas</MenuItem>
            <MenuItem icon={<AppIcon kind="paint" size={26} />}>Paint</MenuItem>
            <MenuItem icon={<AppIcon kind="notes" size={26} />}>Bloco de Notas</MenuItem>
            <span className="os-w7-allprog">▶ Todos os Programas</span>
            <span className="os-w7-search">
              Pesquisar programas e arquivos <SearchIcon />
            </span>
          </div>
          <div className="os-w7-sm-right">
            <span className="os-w7-userpic" />
            {[user, 'Documentos', 'Imagens', 'Músicas', 'Jogos', 'Computador', 'Painel de Controle', 'Dispositivos e Impressoras', 'Programas Padrão', 'Ajuda e Suporte'].map((t) => (
              <MenuItem key={t}>{t}</MenuItem>
            ))}
            <div className="os-w7-shut">
              <button type="button" className="os-w7-shut-main" onClick={() => onAction('shutdown')}>
                Desligar
              </button>
              <button
                type="button"
                className="os-w7-shut-more"
                aria-label="Mais opções de desligamento"
                aria-expanded={more}
                onClick={() => setMore((m) => !m)}
              >
                ▶
              </button>
              {more && (
                <div className="os-w7-more" role="menu" aria-label="Opções de desligamento">
                  <MenuItem onClick={() => onAction('logoff')}>Trocar usuário</MenuItem>
                  <MenuItem onClick={() => onAction('logoff')}>Fazer logoff</MenuItem>
                  <MenuItem onClick={() => onAction('lock')}>Bloquear</MenuItem>
                  <hr />
                  <MenuItem onClick={() => onAction('restart')}>Reiniciar</MenuItem>
                  <MenuItem onClick={() => onAction('sleep')}>Suspender</MenuItem>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="os-w7-taskbar">
        <button
          type="button"
          className="os-w7-orb"
          aria-label="Iniciar"
          aria-expanded={menu}
          onClick={(e) => {
            stop(e);
            setMore(false);
            setMenu((m) => !m);
          }}
        >
          <FlagXP size={22} />
        </button>
        <span className="os-w7-pin">
          <AppIcon kind="browser" size={26} />
        </span>
        <span className="os-w7-pin">
          <AppIcon kind="folder" size={26} />
        </span>
        <span className="os-w7-pin">
          <AppIcon kind="video" size={26} />
        </span>
        <span className="os-spacer" />
        <span className="os-w7-tray">
          <SpeakerIcon /> <WifiIcon />
          <span className="os-clock2">
            {CLOCK}
            <small>{today()}</small>
          </span>
        </span>
        <span className="os-w7-show" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Windows 10

const WIN_POWER: [PowerAction, string, ReactNode][] = [
  ['sleep', 'Suspender', <MoonIcon key="s" />],
  ['shutdown', 'Desligar', <PowerIcon key="d" />],
  ['restart', 'Reiniciar', <RestartIcon key="r" />],
];

function PowerPopup({ className, onAction }: { className: string; onAction: (a: PowerAction) => void }) {
  return (
    <div className={className} role="menu" aria-label="Opções de energia">
      {WIN_POWER.map(([a, label, icon]) => (
        <MenuItem key={label} icon={icon} onClick={() => onAction(a)}>
          {label}
        </MenuItem>
      ))}
    </div>
  );
}


export function Desktop10({ user, onAction }: DesktopProps) {
  const [menu, setMenu] = useState(false);
  const [pop, setPop] = useState<'power' | 'user' | null>(null);
  const close = () => {
    setMenu(false);
    setPop(null);
  };
  const apps: [string, AppKind][] = [
    ['Alarmes e Relógio', 'clock'],
    ['Calculadora', 'calc'],
    ['Calendário', 'calendar'],
    ['Configurações', 'settings'],
    ['Email', 'mail'],
    ['Explorador de Arquivos', 'folder'],
    ['Fotos', 'photos'],
    ['Microsoft Edge', 'browser'],
    ['Microsoft Store', 'store'],
  ];
  return (
    <div className="os-screen os-w10" onClick={close}>
      <div className="os-w10-beam" />
      <div className="os-icons">
        <DeskIcon kind="trash" label="Lixeira" />
        <DeskIcon kind="computer" label="Este Computador" />
      </div>
      {menu && (
        <div className="os-w10-start-menu" role="menu" aria-label="Menu Iniciar" onClick={stop}>
          <div className="os-w10-rail">
            <span className="os-w10-rail-btn">≡</span>
            <span className="os-spacer" />
            <button type="button" className="os-w10-rail-btn" aria-label={user} onClick={() => setPop(pop === 'user' ? null : 'user')}>
              <UserIcon />
            </button>
            <span className="os-w10-rail-btn">
              <AppIcon kind="doc" size={18} />
            </span>
            <span className="os-w10-rail-btn">
              <AppIcon kind="image" size={18} />
            </span>
            <span className="os-w10-rail-btn">
              <GearIcon />
            </span>
            <button type="button" className="os-w10-rail-btn" aria-label="Energia" onClick={() => setPop(pop === 'power' ? null : 'power')}>
              <PowerIcon />
            </button>
            {pop === 'power' && (
              <PowerPopup className="os-w10-pop" onAction={onAction} />
            )}
            {pop === 'user' && (
              <div className="os-w10-pop is-user" role="menu" aria-label={user}>
                <MenuItem onClick={() => onAction('lock')}>Bloquear</MenuItem>
                <MenuItem onClick={() => onAction('logoff')}>Sair</MenuItem>
              </div>
            )}
          </div>
          <div className="os-w10-list">
            <span className="os-w10-letter">A</span>
            {apps.slice(0, 2).map(([t, k]) => (
              <MenuItem key={t} icon={<AppIcon kind={k} size={22} />}>
                {t}
              </MenuItem>
            ))}
            <span className="os-w10-letter">C</span>
            {apps.slice(2, 4).map(([t, k]) => (
              <MenuItem key={t} icon={<AppIcon kind={k} size={22} />}>
                {t}
              </MenuItem>
            ))}
            <span className="os-w10-letter">E</span>
            {apps.slice(4, 6).map(([t, k]) => (
              <MenuItem key={t} icon={<AppIcon kind={k} size={22} />}>
                {t}
              </MenuItem>
            ))}
            <span className="os-w10-letter">F</span>
            <MenuItem icon={<AppIcon kind="photos" size={22} />}>Fotos</MenuItem>
            <span className="os-w10-letter">M</span>
            {apps.slice(7).map(([t, k]) => (
              <MenuItem key={t} icon={<AppIcon kind={k} size={22} />}>
                {t}
              </MenuItem>
            ))}
          </div>
          <div className="os-w10-tiles">
            <span className="os-w10-group">Produtividade</span>
            <div className="os-w10-grid">
              {(
                [
                  ['Email', 'mail', 'is-wide'],
                  ['Edge', 'browser', ''],
                  ['Fotos', 'photos', ''],
                  ['Calendário', 'calendar', ''],
                  ['Planilhas', 'sheet', ''],
                ] as [string, AppKind, string][]
              ).map(([t, k, c]) => (
                <span key={t} className={`os-w10-tile ${c}`}>
                  <AppIcon kind={k} size={30} />
                  <small>{t}</small>
                </span>
              ))}
            </div>
            <span className="os-w10-group">Explorar</span>
            <div className="os-w10-grid">
              {(
                [
                  ['Microsoft Store', 'store', 'is-wide'],
                  ['Clima', 'weather', ''],
                  ['Filmes e TV', 'video', ''],
                ] as [string, AppKind, string][]
              ).map(([t, k, c]) => (
                <span key={t} className={`os-w10-tile ${c}`}>
                  <AppIcon kind={k} size={30} />
                  <small>{t}</small>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="os-w10-taskbar">
        <button
          type="button"
          className="os-w10-start"
          aria-label="Iniciar"
          aria-expanded={menu}
          onClick={(e) => {
            stop(e);
            setPop(null);
            setMenu((m) => !m);
          }}
        >
          <Win10Logo size={17} />
        </button>
        <span className="os-w10-search">
          <SearchIcon /> Digite aqui para pesquisar
        </span>
        <span className="os-w10-pin">
          <AppIcon kind="browser" size={24} />
        </span>
        <span className="os-w10-pin">
          <AppIcon kind="folder" size={24} />
        </span>
        <span className="os-w10-pin">
          <AppIcon kind="store" size={24} />
        </span>
        <span className="os-spacer" />
        <span className="os-w10-tray">
          ˄ <WifiIcon /> <SpeakerIcon /> POR
          <span className="os-clock2">
            {CLOCK}
            <small>{today()}</small>
          </span>
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Windows 11

export function Desktop11({ user, onAction }: DesktopProps) {
  const [menu, setMenu] = useState(false);
  const [pop, setPop] = useState<'power' | 'user' | null>(null);
  const close = () => {
    setMenu(false);
    setPop(null);
  };
  const pinned: [string, AppKind][] = [
    ['Edge', 'browser'],
    ['Word', 'doc'],
    ['Excel', 'sheet'],
    ['PowerPoint', 'slides'],
    ['Email', 'mail'],
    ['Calendário', 'calendar'],
    ['Microsoft Store', 'store'],
    ['Fotos', 'photos'],
    ['Configurações', 'settings'],
    ['Calculadora', 'calc'],
    ['Relógio', 'clock'],
    ['Bloco de Notas', 'notes'],
    ['Paint', 'paint'],
    ['Explorador de Arquivos', 'folder'],
    ['Clima', 'weather'],
    ['Filmes e TV', 'video'],
    ['Música', 'music'],
    ['Dicas', 'help'],
  ];
  return (
    <div className="os-screen os-w11" onClick={close}>
      <div className="os-w11-bloom" />
      <div className="os-icons">
        <DeskIcon kind="trash" label="Lixeira" />
        <DeskIcon kind="computer" label="Este Computador" />
      </div>
      {menu && (
        <div className="os-w11-start-menu" role="menu" aria-label="Menu Iniciar" onClick={stop}>
          <span className="os-w11-search">
            <SearchIcon /> Pesquisar aplicativos, configurações e documentos
          </span>
          <div className="os-w11-head">
            <strong>Fixado</strong>
            <span className="os-w11-chip">Todos os aplicativos ›</span>
          </div>
          <div className="os-w11-grid">
            {pinned.map(([t, k]) => (
              <span key={t} className="os-w11-app">
                <AppIcon kind={k} size={30} />
                <small>{t}</small>
              </span>
            ))}
          </div>
          <div className="os-w11-head">
            <strong>Recomendado</strong>
            <span className="os-w11-chip">Mais ›</span>
          </div>
          <div className="os-w11-rec">
            <span>
              <AppIcon kind="doc" size={26} /> Relatório do dia.docx <small>Há 2 horas</small>
            </span>
            <span>
              <AppIcon kind="sheet" size={26} /> Planilha de horas.xlsx <small>Há 5 horas</small>
            </span>
          </div>
          <div className="os-w11-foot">
            <button type="button" className="os-w11-user" onClick={() => setPop(pop === 'user' ? null : 'user')}>
              <span className="os-w11-avatar">
                <UserIcon />
              </span>
              {user}
            </button>
            <span className="os-spacer" />
            <button type="button" className="os-w11-power" aria-label="Energia" onClick={() => setPop(pop === 'power' ? null : 'power')}>
              <PowerIcon />
            </button>
            {pop === 'power' && (
              <PowerPopup className="os-w11-pop" onAction={onAction} />
            )}
            {pop === 'user' && (
              <div className="os-w11-pop is-user" role="menu" aria-label={user}>
                <MenuItem onClick={() => onAction('lock')}>Bloquear</MenuItem>
                <MenuItem onClick={() => onAction('logoff')}>Sair</MenuItem>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="os-w11-taskbar">
        <span className="os-w11-weather">
          <AppIcon kind="weather" size={22} /> 21°C
        </span>
        <span className="os-spacer" />
        <button
          type="button"
          className="os-w11-btn"
          aria-label="Iniciar"
          aria-expanded={menu}
          onClick={(e) => {
            stop(e);
            setPop(null);
            setMenu((m) => !m);
          }}
        >
          <Win11Logo size={22} />
        </button>
        <span className="os-w11-btn">
          <SearchIcon size={18} />
        </span>
        <span className="os-w11-btn">
          <AppIcon kind="folder" size={24} />
        </span>
        <span className="os-w11-btn">
          <AppIcon kind="browser" size={24} />
        </span>
        <span className="os-w11-btn">
          <AppIcon kind="store" size={24} />
        </span>
        <span className="os-spacer" />
        <span className="os-w11-tray">
          ˄ <WifiIcon /> <SpeakerIcon /> <BatteryIcon />
          <span className="os-clock2">
            {CLOCK}
            <small>{today()}</small>
          </span>
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Ubuntu (GNOME)

type UbuntuAsk = 'shutdown' | 'restart' | 'logoff';
const UBUNTU_ASK: Record<UbuntuAsk, { title: string; text: (n: number) => string; ok: string }> = {
  shutdown: { title: 'Desligar', text: (n) => `O sistema será desligado automaticamente em ${n} segundos.`, ok: 'Desligar' },
  restart: { title: 'Reiniciar', text: (n) => `O sistema será reiniciado automaticamente em ${n} segundos.`, ok: 'Reiniciar' },
  logoff: { title: 'Encerrar sessão', text: (n) => `Você sairá automaticamente em ${n} segundos.`, ok: 'Encerrar sessão' },
};

/** Pergunta de confirmação do GNOME, com a contagem regressiva de 60 s. */
function GnomeAsk({ kind, onPick }: { kind: UbuntuAsk; onPick: (a: PowerAction | null) => void }) {
  const [n, setN] = useState(60);
  useEffect(() => {
    const id = window.setInterval(() => setN((v) => v - 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (n <= 0) onPick(kind);
  }, [n, kind, onPick]);
  const ask = UBUNTU_ASK[kind];
  return (
    <div className="os-ub-dialog-back">
      <div className="os-ub-dialog" role="dialog" aria-label={ask.title}>
        <strong>{ask.title}</strong>
        <p>{ask.text(Math.max(0, n))}</p>
        <div className="os-ub-dialog-btns">
          <button type="button" onClick={() => onPick(null)}>
            Cancelar
          </button>
          <button type="button" className="is-danger" onClick={() => onPick(kind)}>
            {ask.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DesktopUbuntu({ onAction }: DesktopProps) {
  const [panel, setPanel] = useState(false);
  const [powerOpen, setPowerOpen] = useState(false);
  const [ask, setAsk] = useState<UbuntuAsk | null>(null);
  const close = () => {
    setPanel(false);
    setPowerOpen(false);
  };
  const askFor = (k: UbuntuAsk) => {
    close();
    setAsk(k);
  };
  const dock: [string, AppKind][] = [
    ['Firefox', 'fox'],
    ['Thunderbird', 'mail'],
    ['Arquivos', 'folder'],
    ['Rhythmbox', 'music'],
    ['LibreOffice Writer', 'doc'],
    ['Central de Aplicativos', 'store'],
    ['Ajuda', 'help'],
  ];
  return (
    <div className="os-screen os-ub" onClick={close}>
      <div className="os-ub-topbar">
        <span className="os-ub-act">Atividades</span>
        <span className="os-spacer" />
        <span className="os-ub-clock">
          {shortDate()} {CLOCK}
        </span>
        <span className="os-spacer" />
        <button
          type="button"
          className={panel ? 'os-ub-status is-open' : 'os-ub-status'}
          aria-label="Menu do sistema"
          aria-expanded={panel}
          onClick={(e) => {
            stop(e);
            setPowerOpen(false);
            setPanel((p) => !p);
          }}
        >
          <WifiIcon /> <SpeakerIcon /> <PowerIcon size={14} />
        </button>
      </div>
      <div className="os-ub-dock">
        {dock.map(([t, k]) => (
          <span key={t} className="os-ub-dock-app" title={t}>
            <AppIcon kind={k} size={36} />
          </span>
        ))}
        <span className="os-spacer" />
        <span className="os-ub-dock-app" title="Mostrar aplicativos">
          <span className="os-ub-grid" />
        </span>
      </div>
      <div className="os-icons is-right">
        <DeskIcon kind="home" label="Pasta pessoal" />
        <DeskIcon kind="trash" label="Lixeira" />
      </div>
      {panel && (
        <div className="os-ub-panel" role="menu" aria-label="Configurações rápidas" onClick={stop}>
          <div className="os-ub-row">
            <span className="os-ub-pill">
              <BatteryIcon /> 87%
            </span>
            <span className="os-spacer" />
            <span className="os-ub-circle">
              <AppIcon kind="image" size={16} />
            </span>
            <span className="os-ub-circle">
              <GearIcon />
            </span>
            <button type="button" className="os-ub-circle" aria-label="Bloquear" onClick={() => onAction('lock')}>
              <LockIcon />
            </button>
            <button
              type="button"
              className={powerOpen ? 'os-ub-circle is-on' : 'os-ub-circle'}
              aria-label="Desligar / Encerrar sessão"
              aria-expanded={powerOpen}
              onClick={() => setPowerOpen((p) => !p)}
            >
              <PowerIcon />
            </button>
          </div>
          {powerOpen ? (
            <div className="os-ub-power" role="menu" aria-label="Desligar">
              <strong>
                <PowerIcon /> Desligar
              </strong>
              <MenuItem onClick={() => onAction('sleep')}>Suspender</MenuItem>
              <MenuItem onClick={() => askFor('restart')}>Reiniciar…</MenuItem>
              <MenuItem onClick={() => askFor('shutdown')}>Desligar…</MenuItem>
              <hr />
              <MenuItem onClick={() => askFor('logoff')}>Encerrar sessão…</MenuItem>
            </div>
          ) : (
            <>
              <div className="os-ub-slider">
                <SpeakerIcon /> <span className="os-ub-track" style={{ ['--v' as string]: '65%' }} />
              </div>
              <div className="os-ub-toggles">
                <span className="is-on">
                  <WifiIcon /> Com fio
                </span>
                <span className="is-on">Wi-Fi</span>
                <span>Bluetooth</span>
                <span className="is-on">Equilibrado</span>
                <span>Estilo escuro</span>
                <span>Luz noturna</span>
              </div>
            </>
          )}
        </div>
      )}
      {ask && (
        <GnomeAsk
          kind={ask}
          onPick={(a) => {
            setAsk(null);
            if (a) onAction(a);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Linux Mint (Cinnamon)

export function DesktopMint({ user, onAction }: DesktopProps) {
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState(false);
  const [hint, setHint] = useState('');
  const side: [string, ReactNode, string, (() => void) | undefined][] = [
    ['Firefox', <AppIcon key="f" kind="fox" size={24} />, 'Navegue na internet', undefined],
    ['Gerenciador de aplicativos', <AppIcon key="s" kind="store" size={24} />, 'Instale novos aplicativos', undefined],
    ['Configurações do sistema', <AppIcon key="c" kind="settings" size={24} />, 'Ajuste o computador', undefined],
    ['Terminal', <AppIcon key="t" kind="terminal" size={24} />, 'Use a linha de comando', undefined],
    ['Arquivos', <AppIcon key="a" kind="folder" size={24} />, 'Acesse seus arquivos', undefined],
  ];
  const power: [string, ReactNode, string, () => void][] = [
    ['Bloquear a tela', <LockIcon key="l" size={20} />, 'Bloqueia a tela', () => onAction('lock')],
    ['Encerrar sessão', <LogoutIcon key="o" size={20} />, 'Sair da sessão ou trocar de usuário', () => onAction('logoff')],
    [
      'Desligar',
      <PowerIcon key="p" size={20} />,
      'Desligar, reiniciar ou suspender o computador',
      () => {
        setMenu(false);
        setAsk(true);
      },
    ],
  ];
  return (
    <div className="os-screen os-mint" onClick={() => setMenu(false)}>
      <div className="os-icons">
        <DeskIcon kind="computer" label="Computador" />
        <DeskIcon kind="home" label={`Pasta pessoal de ${user}`} />
      </div>
      {menu && (
        <div className="os-mint-menu" role="menu" aria-label="Menu" onClick={stop}>
          <div className="os-mint-side">
            {side.map(([t, icon, d]) => (
              <span key={t} className="os-mint-side-btn" title={t} onMouseEnter={() => setHint(`${t}: ${d}`)}>
                {icon}
              </span>
            ))}
            <span className="os-spacer" />
            {power.map(([t, icon, d, go]) => (
              <button key={t} type="button" className="os-mint-side-btn" aria-label={t} title={t} onMouseEnter={() => setHint(`${t}: ${d}`)} onFocus={() => setHint(`${t}: ${d}`)} onClick={go}>
                {icon}
              </button>
            ))}
          </div>
          <div className="os-mint-main">
            <span className="os-mint-search">
              <SearchIcon />
            </span>
            <div className="os-mint-cols">
              <div className="os-mint-cats">
                {['Todos os aplicativos', 'Favoritos', 'Acessórios', 'Escritório', 'Gráficos', 'Internet', 'Multimídia', 'Preferências', 'Administração'].map((c, i) => (
                  <span key={c} className={i === 0 ? 'is-on' : ''}>
                    {c}
                  </span>
                ))}
              </div>
              <div className="os-mint-apps">
                {(
                  [
                    ['Arquivos', 'folder'],
                    ['Calculadora', 'calc'],
                    ['Captura de tela', 'image'],
                    ['Editor de texto', 'notes'],
                    ['Firefox', 'fox'],
                    ['LibreOffice Calc', 'sheet'],
                    ['LibreOffice Writer', 'doc'],
                    ['Rhythmbox', 'music'],
                    ['Terminal', 'terminal'],
                    ['Thunderbird', 'mail'],
                  ] as [string, AppKind][]
                ).map(([t, k]) => (
                  <span key={t}>
                    <AppIcon kind={k} size={22} /> {t}
                  </span>
                ))}
              </div>
            </div>
            <p className="os-mint-hint">{hint || ' '}</p>
          </div>
        </div>
      )}
      <div className="os-mint-panel">
        <button
          type="button"
          className="os-mint-menu-btn"
          aria-label="Menu"
          aria-expanded={menu}
          onClick={(e) => {
            stop(e);
            setMenu((m) => !m);
          }}
        >
          <MintLogo size={24} />
        </button>
        <span className="os-mint-pin">
          <AppIcon kind="fox" size={24} />
        </span>
        <span className="os-mint-pin">
          <AppIcon kind="terminal" size={24} />
        </span>
        <span className="os-mint-pin">
          <AppIcon kind="folder" size={24} />
        </span>
        <span className="os-spacer" />
        <span className="os-mint-tray">
          <WifiIcon /> <SpeakerIcon /> {CLOCK}
        </span>
      </div>
      {ask && (
        <div className="os-mint-dialog-back">
          <div className="os-mint-dialog" role="dialog" aria-label="Desligar o computador agora?">
            <strong>
              <PowerIcon size={22} /> Desligar o computador agora?
            </strong>
            <div className="os-mint-dialog-btns">
              <button type="button" onClick={() => onAction('sleep')}>
                Suspender
              </button>
              <button type="button" onClick={() => onAction('restart')}>
                Reiniciar
              </button>
              <span className="os-spacer" />
              <button type="button" onClick={() => setAsk(false)}>
                Cancelar
              </button>
              <button type="button" className="is-danger" onClick={() => onAction('shutdown')}>
                Desligar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ tela de entrada (sessão encerrada ou bloqueada)

export function LoginScreen({ os, user, onLogin, onAction }: { os: OsId; user: string; onLogin: () => void; onAction: (a: PowerAction) => void }) {
  const [power, setPower] = useState(false);
  const [xpDialog, setXpDialog] = useState(false);
  if (os === 'xp') {
    return (
      <div className="os-screen os-login-xp">
        <div className="os-login-xp-mid">
          <div className="os-login-xp-left">
            <span className="os-login-xp-logo">
              <FlagXP size={54} />
              <b>
                Windows<sup>xp</sup>
              </b>
            </span>
            <p>Para começar, clique no seu nome de usuário</p>
          </div>
          <div className="os-login-xp-right">
            <button type="button" className="os-login-xp-user" onClick={onLogin}>
              <span className="os-xp-avatar is-big" />
              {user}
            </button>
          </div>
        </div>
        <div className="os-login-xp-foot">
          <button type="button" onClick={() => setXpDialog(true)}>
            <span className="os-xp-foot-icon is-power">
              <PowerIcon size={16} />
            </span>
            Desativar o computador
          </button>
        </div>
        {xpDialog && (
          <XpTurnOff
            onPick={(a) => {
              setXpDialog(false);
              if (a) onAction(a);
            }}
          />
        )}
      </div>
    );
  }
  const linux = os === 'ubuntu' || os === 'mint';
  return (
    <div className={`os-screen os-login os-login-${os}`} onClick={() => setPower(false)}>
      {linux && (
        <div className="os-login-top">
          <span className="os-spacer" />
          {CLOCK}
          <span className="os-spacer" />
        </div>
      )}
      <div className="os-login-center">
        <span className="os-login-avatar">
          <UserIcon size={56} />
        </span>
        <strong>{user}</strong>
        <button type="button" className="os-login-enter" onClick={onLogin}>
          {os === 'win7' ? 'Clique para entrar' : 'Entrar'}
        </button>
      </div>
      <div className={linux ? 'os-login-power is-top' : 'os-login-power'} onClick={stop}>
        <button type="button" aria-label="Energia" aria-expanded={power} onClick={() => setPower((p) => !p)}>
          <PowerIcon size={20} />
        </button>
        {power && (
          <PowerPopup className="os-login-pop" onAction={onAction} />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ telas de desligando, reiniciando e ligando

export function StatusScreen({ os, kind }: { os: OsId; kind: 'shutting' | 'restarting' | 'booting' }) {
  const text: Record<OsId, Record<typeof kind, string>> = {
    xp: { shutting: 'O Windows está sendo desligado...', restarting: 'O Windows está sendo reiniciado...', booting: '' },
    win7: { shutting: 'Desligando...', restarting: 'Reiniciando...', booting: 'Iniciando o Windows' },
    win10: { shutting: 'Desligando', restarting: 'Reiniciando', booting: '' },
    win11: { shutting: 'Desligando', restarting: 'Reiniciando', booting: '' },
    ubuntu: { shutting: '', restarting: '', booting: '' },
    mint: { shutting: '', restarting: '', booting: '' },
  };
  const logo =
    os === 'xp' || os === 'win7' ? (
      <FlagXP size={64} />
    ) : os === 'win10' ? (
      <Win10Logo size={64} color="#3a96dd" />
    ) : os === 'win11' ? (
      <Win11Logo size={64} />
    ) : os === 'ubuntu' ? (
      <UbuntuLogo size={64} />
    ) : (
      <MintLogo size={64} />
    );
  const blue = kind !== 'booting' && (os === 'xp' || os === 'win7' || os === 'win10');
  return (
    <div className={`os-screen os-status os-status-${os}${blue ? ' is-blue' : ''}`} role="status">
      {(kind === 'booting' || os === 'ubuntu' || os === 'mint' || os === 'xp') && <span className="os-status-logo">{logo}</span>}
      {os === 'xp' && kind === 'booting' && <span className="os-status-xpbar" />}
      {os !== 'xp' && <span className={os === 'ubuntu' ? 'os-dots is-row' : 'os-spinner'} />}
      {text[os][kind] && <p>{text[os][kind]}</p>}
    </div>
  );
}

export const DESKTOPS: Record<OsId, (p: DesktopProps) => React.JSX.Element> = {
  xp: DesktopXP,
  win7: Desktop7,
  win10: Desktop10,
  win11: Desktop11,
  ubuntu: DesktopUbuntu,
  mint: DesktopMint,
};
