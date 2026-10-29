import { lazy, Suspense, useEffect, useState } from 'react';
import { ApiError, api } from '../../api';
import type { SavedGame } from '../../types';

// O Phaser é grande: só é baixado quando alguém abre esta página.
const OfficeGame = lazy(() => import('@playground/office').then((m) => ({ default: m.OfficeGame })));

interface GamePickerProps {
  label: string;
  games: SavedGame[] | null;
  value: string;
  onChange: (id: string) => void;
  emptyLabel: string;
}

function GamePicker({ label, games, value, onChange, emptyLabel }: GamePickerProps) {
  return (
    <label style={{ minWidth: 260 }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={!games?.length}>
        {!games?.length && <option value="">{emptyLabel}</option>}
        {games?.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
    </label>
  );
}

const asMissionGame = (g: SavedGame | null) => (g ? { title: g.title, config: g.config } : null);

export default function OfficePage() {
  const [library, setLibrary] = useState<SavedGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crosswordId, setCrosswordId] = useState<string>('');
  const [phrasesId, setPhrasesId] = useState<string>('');
  const [quizId, setQuizId] = useState<string>('');
  const [wordSearchId, setWordSearchId] = useState<string>('');
  const [hangmanId, setHangmanId] = useState<string>('');
  const [surpriseId, setSurpriseId] = useState<string>('');
  const [ritaId, setRitaId] = useState<string>('');
  const [alignmentId, setAlignmentId] = useState<string>('');
  const [bathroomId, setBathroomId] = useState<string>('');

  useEffect(() => {
    api<{ games: SavedGame[] }>('/games')
      .then((r) => {
        setLibrary(r.games);
        setCrosswordId(r.games.find((g) => g.gameType === 'CRUZADAS')?.id ?? '');
        setPhrasesId(r.games.find((g) => g.gameType === 'COMPLETE_FRASES')?.id ?? '');
        setQuizId(r.games.find((g) => g.gameType === 'QUIZ')?.id ?? '');
        setWordSearchId(r.games.find((g) => g.gameType === 'CACA_PALAVRAS')?.id ?? '');
        setHangmanId(r.games.find((g) => g.gameType === 'FORCA')?.id ?? '');
        // exercício surpresa: de preferência um quiz diferente do da Elisa
        const quizIds = r.games.filter((g) => g.gameType === 'QUIZ').map((g) => g.id);
        setSurpriseId(quizIds[1] ?? quizIds[0] ?? '');
        // quiz da reunião de alinhamento: de preferência um terceiro quiz
        setAlignmentId(quizIds[2] ?? quizIds[0] ?? '');
        // cruzadas da Rita: de preferência uma diferente da do CEO
        const crosswordIds = r.games.filter((g) => g.gameType === 'CRUZADAS').map((g) => g.id);
        setRitaId(crosswordIds[1] ?? crosswordIds[0] ?? '');
        // caça-palavras do banheiro: de preferência um diferente do quadro da reunião
        const wordSearchIds = r.games.filter((g) => g.gameType === 'CACA_PALAVRAS').map((g) => g.id);
        setBathroomId(wordSearchIds[1] ?? wordSearchIds[0] ?? '');
      })
      .catch((e) => {
        setLibrary([]);
        setError(e instanceof ApiError ? e.message : 'Não foi possível carregar a biblioteca.');
      });
  }, []);

  const crosswords = library?.filter((g) => g.gameType === 'CRUZADAS') ?? null;
  const phrases = library?.filter((g) => g.gameType === 'COMPLETE_FRASES') ?? null;
  const crossword = crosswords?.find((g) => g.id === crosswordId) ?? null;
  const phrase = phrases?.find((g) => g.id === phrasesId) ?? null;
  const quizzes = library?.filter((g) => g.gameType === 'QUIZ') ?? null;
  const quiz = quizzes?.find((g) => g.id === quizId) ?? null;
  const wordSearches = library?.filter((g) => g.gameType === 'CACA_PALAVRAS') ?? null;
  const wordSearch = wordSearches?.find((g) => g.id === wordSearchId) ?? null;
  const hangmen = library?.filter((g) => g.gameType === 'FORCA') ?? null;
  const hangman = hangmen?.find((g) => g.id === hangmanId) ?? null;
  const surprise = quizzes?.find((g) => g.id === surpriseId) ?? null;
  const ritaCrossword = crosswords?.find((g) => g.id === ritaId) ?? null;
  const alignment = quizzes?.find((g) => g.id === alignmentId) ?? null;
  const bathroom = wordSearches?.find((g) => g.id === bathroomId) ?? null;

  return (
    <section className="panel">
      <div className="page-head">
        <div>
          <h1>🏢 Office · teste</h1>
          <p className="hint">
            Missões: ajudar o CEO com as palavras-cruzadas, ligar os computadores, montar os computadores novos, arrumar as
            frases do quadro branco, ajudar a Elisa com a prova do tablet e, no fim do expediente, desligar os computadores
            (Windows XP, 7, 10, 11, Ubuntu e Mint) e ativar o alarme. Cada uma vale 100 XP; no fim aparece o resumo do dia.
            No 2º dia (fase 2), o levantamento dos computadores: achar e etiquetar desktops, notebooks, servidores, o
            mainframe, tablets e smartphones; o caça-palavras do quadro da Sala de Reuniões; e as 10 placas de
            desenvolvimento (Arduino e Raspberry Pi) escondidas nos armários com lupa; a forca que ficou aberta no tablet
            quando o Marcos cochilou; e o exercício surpresa do curso, que chega pelo WhatsApp no celular do estagiário.
            No fim, o chefe dispensa o estagiário e aparece o resumo do 2º dia. No 3º dia (fase 3), as peças de hardware da
            lista do Marcos, as palavras-cruzadas do tablet da Rita, na Copa, a montagem de 3 computadores (estudante, gamer
            e escritório) na Sala de TI, o quiz da reunião de alinhamento, no notebook da Sala de Reuniões, e a corrida
            contra o relógio até o banheiro, com o caça-palavras sonhado em frente ao mictório. No fim, todos vão embora e
            aparece o resumo do 3º dia.
          </p>
        </div>
        <GamePicker
          label="Palavras-cruzadas do CEO (de “Meus jogos”)"
          games={crosswords}
          value={crosswordId}
          onChange={setCrosswordId}
          emptyLabel="Jogo de exemplo (sem cruzadas salvas)"
        />
        <GamePicker
          label="Frases do quadro branco (Complete as Frases)"
          games={phrases}
          value={phrasesId}
          onChange={setPhrasesId}
          emptyLabel="Jogo de exemplo (sem frases salvas)"
        />
        <GamePicker
          label="Prova da Elisa no tablet (Quiz)"
          games={quizzes}
          value={quizId}
          onChange={setQuizId}
          emptyLabel="Jogo de exemplo (sem quiz salvo)"
        />
        <GamePicker
          label="Quadro da reunião, 2º dia (Caça-palavras)"
          games={wordSearches}
          value={wordSearchId}
          onChange={setWordSearchId}
          emptyLabel="Jogo de exemplo (sem caça-palavras salvo)"
        />
        <GamePicker
          label="Tablet do Marcos, 2º dia (Forca)"
          games={hangmen}
          value={hangmanId}
          onChange={setHangmanId}
          emptyLabel="Jogo de exemplo (sem forca salva)"
        />
        <GamePicker
          label="Exercício surpresa no celular, 2º dia (Quiz)"
          games={quizzes}
          value={surpriseId}
          onChange={setSurpriseId}
          emptyLabel="Jogo de exemplo (sem quiz salvo)"
        />
        <GamePicker
          label="Tablet da Rita, 3º dia (Palavras-cruzadas)"
          games={crosswords}
          value={ritaId}
          onChange={setRitaId}
          emptyLabel="Jogo de exemplo (sem cruzadas salvas)"
        />
        <GamePicker
          label="Reunião de alinhamento, 3º dia (Quiz)"
          games={quizzes}
          value={alignmentId}
          onChange={setAlignmentId}
          emptyLabel="Jogo de exemplo (sem quiz salvo)"
        />
        <GamePicker
          label="Sonho no banheiro, 3º dia (Caça-palavras)"
          games={wordSearches}
          value={bathroomId}
          onChange={setBathroomId}
          emptyLabel="Jogo de exemplo (sem caça-palavras salvo)"
        />
      </div>
      {error && (
        <p className="hint" role="alert">
          {error} Usando os jogos de exemplo.
        </p>
      )}
      {library === null ? (
        <p className="hint">Carregando a biblioteca…</p>
      ) : (
        <Suspense fallback={<p className="hint">Carregando o escritório…</p>}>
          {/* key: trocar um jogo reinicia as missões */}
          <OfficeGame
            key={`${crosswordId || 'exemplo'}:${phrasesId || 'exemplo'}:${quizId || 'exemplo'}:${wordSearchId || 'exemplo'}:${hangmanId || 'exemplo'}:${surpriseId || 'exemplo'}:${ritaId || 'exemplo'}:${alignmentId || 'exemplo'}:${bathroomId || 'exemplo'}`}
            crossword={asMissionGame(crossword)}
            phrases={asMissionGame(phrase)}
            quiz={asMissionGame(quiz)}
            wordSearch={asMissionGame(wordSearch)}
            hangman={asMissionGame(hangman)}
            surpriseQuiz={asMissionGame(surprise)}
            ritaCrossword={asMissionGame(ritaCrossword)}
            alignmentQuiz={asMissionGame(alignment)}
            bathroomWordSearch={asMissionGame(bathroom)}
          />
        </Suspense>
      )}
    </section>
  );
}
