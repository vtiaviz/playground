import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OfficeGame } from '../src';
import { OFFICE_PCS, type PowerState } from '../src/mission/desligar';
import DesktopModal from '../src/mission/sistemas/DesktopModal';

// ?tempo=30 encurta a missão 2; ?missao=3 (ou 2 a 6) começa direto nessa missão (útil para testar);
// ?sistema=xp (win7, win10, win11, ubuntu, mint) abre só a tela de um computador da missão 6;
// ?fase=2 começa direto no 2º dia (fase 2); ?fase=2&missao=2 (a 5) começa nessa missão da fase 2 e ?fase=2&missao=6 no fim do dia (o chefe dispensando); ?fase=3 começa no 3º dia e ?fase=3&missao=2 nas palavras-cruzadas da Rita ?fase=3&missao=3 na montagem dos 3 computadores, ?fase=3&missao=4 no quiz da reunião de alinhamento, ?fase=3&missao=5 na corrida até o banheiro, ?fase=4 começa no 4º dia (o projetor e a webcam), ?fase=4&missao=2 nas 10 cópias da impressora, ?fase=4&missao=3 nas frases do treinamento de TI e ?fase=4&missao=4 no quiz da segunda folha
const params = new URLSearchParams(location.search);
const tempo = Number(params.get('tempo')) || undefined;
const missao = Number(params.get('missao'));
const startAt = missao >= 2 && missao <= 6 ? (missao as 2 | 3 | 4 | 5 | 6) : undefined;
const sistema = OFFICE_PCS.find((pc) => pc.os === params.get('sistema'));
const fase = ({ '2': 2, '3': 3, '4': 4 } as const)[params.get('fase') ?? ''] ?? 1;

function SoOSistema({ pc }: { pc: (typeof OFFICE_PCS)[number] }) {
  const [state, setState] = useState<PowerState>('on');
  const [open, setOpen] = useState(true);
  return open ? (
    <DesktopModal pc={pc} state={state} onChange={setState} onClose={() => setOpen(false)} />
  ) : (
    <button type="button" onClick={() => setOpen(true)}>
      Abrir de novo ({state})
    </button>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{sistema ? <SoOSistema pc={sistema} /> : <OfficeGame missionTime={tempo} startAt={startAt} fase={fase} />}</StrictMode>,
);
