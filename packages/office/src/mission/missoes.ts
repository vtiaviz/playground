// Textos e regras das missões. A primeira: ajudar o CEO com as palavras-cruzadas.
import cruzadasPadrao from '../game/cruzadas-padrao.json';
import frasesPadrao from '../game/frases-padrao.json';
import quizPadrao from '../game/quiz-padrao.json';
import cacaPalavrasPadrao from '../game/caca-palavras-padrao.json';
import forcaPadrao from '../game/forca-padrao.json';
import quizSurpresaPadrao from '../game/quiz-surpresa-padrao.json';
import cruzadasRitaPadrao from '../game/cruzadas-rita-padrao.json';
import quizAlinhamentoPadrao from '../game/quiz-alinhamento-padrao.json';

/** Um jogo salvo em "Meus jogos" usado numa missão (palavras-cruzadas, complete as frases…). */
export interface MissionGame {
  /** Título mostrado na tela do jogo. */
  title: string;
  /** Config do jogo (a mesma salva na biblioteca). */
  config: unknown;
}
export type MissionCrossword = MissionGame;

export const MISSAO_CEO = {
  id: 'ajudar-ceo',
  title: 'Ajudar o CEO',
  xp: 100,
  speaker: 'CEO',
  greeting:
    'Opa, desculpa, não vi você aí! É que estou quebrando a cabeça para tentar resolver este jogo de palavras-cruzadas e não estou conseguindo.',
  question: 'Deseja ajudá-lo a resolver o jogo? Talvez isso possa gerar uma empatia com o chefe.',
  declined: 'Tudo bem, sem problemas! Se mudar de ideia, estou aqui... quebrando a cabeça.',
  celebration: 'UHUUUL! Você conseguiu! Muito obrigado, estagiário! Parabéns, você salvou o meu dia!',
} as const;

/** Usado quando nenhum jogo da biblioteca é passado (ex.: página de teste sem API). */
export const CRUZADAS_PADRAO: MissionCrossword = { title: cruzadasPadrao.title, config: cruzadasPadrao };

export const OBJETIVOS = {
  entrar: 'Entre na empresa pela porta principal',
  ceo: 'Vá até a Diretoria: o CEO parece precisar de ajuda',
  concluida: 'Missão concluída! Explore o escritório',
  ligar: 'Ligue os computadores da Área de Trabalho e coloque a placa LIBERADO',
  voltando: 'A equipe está voltando da reunião…',
  chamado: 'Vá até a Diretoria: o chefe quer falar com você!',
  rh: 'Vá até a sala do RH: a Rita está chamando você',
  montar: 'Monte os computadores das caixas no RH e no Financeiro',
  conferindo: 'A Rita está conferindo a montagem…',
  corrigir: 'Corrija a montagem do que a Rita apontou',
  quadro: 'Vá até a Sala de Reuniões: o Bruno precisa de ajuda',
  prova: 'Vá até a Copa: a Elisa está chamando você, discretamente, lá no cantinho',
  saindo: 'Fim do expediente! O pessoal está indo embora…',
  chefe: 'Vá até a Diretoria: o chefe quer falar com você antes de ir embora',
  desligar: 'Ache os computadores ligados (a tela brilha no escuro) e desligue pelo sistema',
  sair: 'Alarme ativado! Saia pela porta principal',
  conferindo6: 'Porta trancada. Alarme ligando…',
  chefe2: 'Vá até a Diretoria: o chefe chamou você',
  levantar: 'Ache os computadores de todos os setores, marque na prancheta e cole o adesivo do tipo',
  entregar: 'Quando terminar, leve a prancheta ao Marcos, na Sala de TI',
  conferindo2: 'O Marcos está conferindo a prancheta…',
  reuniao2: 'Vá até a Sala de Reuniões: o Diego está chamando você',
  quadro2: 'Chegue perto do quadro branco da Sala de Reuniões e ache todas as palavras',
  ti3: 'Vá até a Sala de TI: o Marcos está chamando você',
  procurar: 'Procure as placas nos móveis com uma lupa em cima e pegue as que caírem no chão',
  levarPlacas: 'Você achou todas! Leve as placas para o Marcos, na Sala de TI',
  descanso: 'O Marcos foi descansar um pouco…',
  barulho: 'Vá até a Sala de TI: que barulho foi esse? Siga a musiquinha',
  celular: 'Seu celular vibrou: chegou mensagem!',
  exercicio: 'Abra o celular (botão 📱 Celular, no topo) e responda o exercício surpresa do curso',
  chefeDia2: 'Vá até a Diretoria: o chefe chamou você',
  embora: 'Dispensado por hoje! Saia da empresa pela porta principal',
  ti31: 'Vá até a Sala de TI: o Marcos está chamando você',
  pecas: 'Procure as peças da lista nos móveis com uma lupa em cima e chegue perto das que caírem no chão',
  levarPecas: 'Mochila completa! Leve as peças para o Marcos, na Sala de TI',
  forcaTablet: 'Termine a forca do tablet do Marcos: acerte as 5 palavras (chegue perto do tablet no chão)',
  copaAgua: 'Bateu uma sede: vá até a Copa beber água',
  ritaCruzadas: 'Fale com a Rita, na Copa, para ajudar com as palavras-cruzadas do tablet',
  ti33: 'Vá até a Sala de TI: o Marcos está chamando de novo',
  montarPcs: 'Monte os 3 computadores: chegue perto de cada caixa na Sala de TI',
  reuniao34: 'Vá até a Sala de Reuniões: o chefe está chamando',
  quizAlinhamento: 'Sente na cadeira da mesa de reunião (perto do quadro) e termine o quiz no notebook',
} as const;

/** Segunda missão: ligar os computadores da Área de Trabalho enquanto a equipe está em reunião. */
export const MISSAO_PCS = {
  id: 'ligar-computadores',
  title: 'Ligar os computadores',
  xp: 100,
  /** XP que o chefe tira na bronca. */
  penalty: 100,
  /** Tempo padrão, em segundos. */
  tempo: 180,
  briefing: (tempo: string) => [
    'Agora que você já me conhece, tenho uma tarefa de verdade para você!',
    'A equipe toda vai para a Sala de Reuniões. Enquanto isso, ligue todos os computadores da Área de Trabalho: o gabinete E o monitor.',
    `Quando aparecer a tela de login, você tem certeza de que está tudo certo: coloque a placa LIBERADO em cima da mesa. Você tem ${tempo}. Vai!`,
  ],
  complaint: 'Chefe! O meu computador não está ligado direito! Como eu vou trabalhar assim?',
  call: 'ESTAGIÁRIO! Venha até a minha sala, AGORA!',
  scolding: (who: string, n: number) =>
    `${who} veio aqui reclamar: o computador da mesa não estava ligado direito.` +
    (n > 1 ? ` E não foi só esse: ${n} computadores ficaram com problema!` : '') +
    ' Isso atrapalha o trabalho de todo mundo. Vou tirar 100 XP de você.',
  retry: 'Vou dar mais uma chance. A equipe volta para a reunião e você liga tudo de novo. Desta vez, só coloque a placa quando aparecer a tela de login!',
  success:
    'Todo mundo sentou e os computadores já estavam na tela de login. Ninguém perdeu tempo! Excelente trabalho, estagiário!',
} as const;

/** Terceira missão: montar e ligar os cabos de dois computadores novos no RH. */
export const MISSAO_MONTAGEM = {
  id: 'montar-computadores',
  title: 'Montar os computadores novos',
  xp: 100,
  penalty: 100,
  /** Quem confere o serviço. */
  rh: 'Rita (RH)',
  call: 'Ah, e a Rita, do RH, está te chamando! Chegaram computadores novos lá. Vá até a sala do RH.',
  briefing: [
    'Oi, estagiário! Eu sou a Rita, do RH. Chegaram dois computadores novos, ainda nas caixas: um aqui no RH e outro no Financeiro, aqui do lado.',
    'Monte cada um na mesa: monitor, gabinete, webcam, caixas de som, teclado e mouse. Depois ligue todos os cabos atrás do gabinete.',
    'Atenção: o monitor do computador do RH vem com cabo VGA e o do Financeiro com cabo HDMI. Vou buscar um café e, quando você terminar os dois, eu volto para conferir!',
  ],
  checking: 'A Rita voltou para conferir o serviço…',
  success: 'Conferi tudo: os dois computadores estão montados e com os cabos certinhos. Parabéns, estagiário! Ficou perfeito.',
  problems: 'Hmm… encontrei problemas na montagem. Vou ter que tirar 100 XP de você.',
  fixIt: 'Corrija o que eu falei e conclua a montagem de novo. Eu espero aqui.',
} as const;

/** Quarta missão: o Bruno derrubou os cards do quadro branco; o ESTAGIÁRIO completa as frases. */
export const MISSAO_QUADRO = {
  id: 'arrumar-quadro',
  title: 'Arrumar as frases do quadro',
  xp: 100,
  /** Estação do colega que esbarra no quadro (Bruno). */
  colleague: 1,
  crash: 'CRASH! Alguma coisa caiu na Sala de Reuniões…',
  call: 'ESTAGIÁRIO! Você pode vir aqui na Sala de Reuniões, por favor?',
  greeting:
    'Ai, que vergonha… Esbarrei no quadro branco e derrubei todos os cards que completavam as frases da reunião! Eu não entendo muito de informática e não sei onde vai cada um.',
  plea: 'Você está fazendo o curso de informática básica, né? Achei que você podia me ajudar!',
  question: 'Vai ajudar o Bruno a arrumar as frases do quadro?',
  declined: 'Tudo bem… vou tentar sozinho. Se mudar de ideia, estou aqui no quadro.',
  success: 'Ficou perfeito! As frases estão todas no lugar e a reunião vai ser um sucesso. Valeu mesmo, estagiário!',
} as const;

/** Usado quando nenhum "Complete as Frases" da biblioteca é passado. */
export const FRASES_PADRAO: MissionGame = { title: frasesPadrao.title, config: frasesPadrao };

/** Quinta missão: a Elisa, que está fazendo uma prova de informática no tablet, pede uma "ajudinha". */
export const MISSAO_PROVA = {
  id: 'ajudar-prova',
  title: 'Ajudar a Elisa com a prova',
  xp: 100,
  /** Estação da colega (Elisa). */
  colleague: 4,
  /** Conversa na Copa, entre a Rita e a Elisa (o ESTAGIÁRIO "ouve" de longe). */
  gossip: [
    { who: 'rita', text: 'Elisa, você viu o estagiário novo? Montou sozinho os computadores do RH e do Financeiro, com cabo e tudo!' },
    { who: 'elisa', text: 'Sério?! E ainda arrumou as frases do quadro do Bruno… Esse menino entende mesmo de informática!' },
    { who: 'elisa', text: '(Hmm… e eu aqui enrolada com a minha prova de informática no tablet. Acho que vou pedir uma ajudinha para ele…)' },
  ],
  call: 'Psiu! Estagiário! Vem aqui na Copa, no cantinho… mas sem chamar atenção, tá?',
  greeting: 'Oi! Olha só: estou fazendo uma prova de informática aqui no tablet e travei em umas perguntas…',
  plea: 'A Rita me contou que você manda muito bem em informática. Me ajuda? É rapidinho, ninguém vai ficar sabendo!',
  question: 'Vai ajudar a Elisa com a prova do tablet?',
  declined: 'Ah, tudo bem… Se mudar de ideia, estou aqui no cantinho da Copa.',
  retry: (right: number, total: number) =>
    `Ih… só ${right} de ${total} certas. Assim eu não passo! Vamos tentar de novo?`,
  hug: 'GABARITEI! Todas certas! Vem cá, me dá um abraço!',
  success: 'Muito obrigada, estagiário! Você é demais! Fico te devendo um café.',
} as const;

/** Usado quando nenhum quiz da biblioteca é passado. */
export const QUIZ_PADRAO: MissionGame = { title: quizPadrao.title, config: quizPadrao };

/** Sexta missão: fim do expediente. Desligar os computadores, ativar o alarme e fechar a empresa. */
export const MISSAO_FIM = {
  id: 'fechar-empresa',
  title: 'Fechar a empresa',
  xp: 100,
  penalty: 100,
  /** Senha do painel do alarme. */
  code: '2468',
  endOfDay: '🕕 18h00: fim do expediente! O pessoal está indo embora…',
  call: 'ESTAGIÁRIO! Passe na minha sala antes de ir embora, por favor!',
  briefing: [
    'Que primeiro dia, hein? Você ajudou todo mundo! Mas ainda tem uma última tarefa antes de ir para casa.',
    'O pessoal saiu correndo e deixou computador ligado. Passe em todas as salas, veja quais estão ligados e desligue cada um. Com as luzes apagadas, a tela ligada brilha: fica fácil de ver!',
    'Atenção: aqui tem computador com Windows XP, 7, 10, 11, Ubuntu e Linux Mint. Desligue pelo sistema, do jeito certo!',
    'No fim, ative o alarme no painel ao lado da porta principal. A senha é 2468. Depois é só sair: a porta tranca sozinha. Até amanhã!',
  ],
  alreadyOff: 'Este computador já está desligado.',
  armed: '🔒 Alarme ativado! Saia pela porta principal.',
  locked: '🔒 Porta trancada. O alarme está ligando…',
  siren: '🚨 O ALARME DISPAROU!',
  phone: (n: number) =>
    `Alô, estagiário?! A central do alarme me ligou: ${n === 1 ? 'ficou 1 computador ligado' : `ficaram ${n} computadores ligados`} aí dentro! Computador ligado a noite toda gasta energia e o sensor do alarme dispara. Vou ter que tirar 100 XP.`,
  retry: 'Já desliguei o alarme e destranquei a porta. Volte, desligue o que faltou e ative o alarme de novo.',
  victory: 'UHUUUL! Tudo desligado, empresa fechada e alarme ligado. Terminei o meu primeiro dia de estágio!',
} as const;

/** Fase 2, missão 1 (aula: o que é um computador e os tipos de computadores): levantamento dos computadores. */
export const MISSAO_LEVANTAMENTO = {
  id: 'levantamento-computadores',
  title: 'Levantamento dos computadores',
  xp: 100,
  penalty: 100,
  /** Quem confere a prancheta. */
  it: 'Marcos (TI)',
  dayStart: '☀️ 2º dia de estágio · Aula: o que é um computador e os tipos de computadores',
  call: 'Bom dia, estagiário! Assim que chegar, passe na minha sala. Tenho uma tarefa nova para você!',
  briefing: [
    'Bom dia! Hoje começa o seu segundo dia, e a aula de hoje é: o que é um computador?',
    'Computador é toda máquina que recebe dados (entrada), processa, guarda (armazenamento) e mostra o resultado (saída). E não é só aquele da mesa: tem computador de todo tamanho e formato!',
    'Preciso de um levantamento: quantos computadores a empresa tem e de que tipo. Passe em TODOS os setores e procure desktops, notebooks, servidores, mainframes, tablets e smartphones.',
    'Para cada um que achar, marque um traço | no tipo dele na prancheta e cole no equipamento o adesivo do tipo. Tome aqui a prancheta e a cartela de adesivos.',
    'Quando terminar, leve a prancheta para o Marcos, o encarregado da TI. Ele confere tudo: se estiver errado, você perde XP e tem que corrigir!',
  ],
  noneYet: 'Oi, estagiário! O chefe me falou do levantamento. Ache os computadores pela empresa, marque na prancheta e cole os adesivos. Depois me traga a prancheta!',
  question: (n: number) => `Entregar a prancheta para o Marcos conferir? (${n} ${n === 1 ? 'equipamento etiquetado' : 'equipamentos etiquetados'})`,
  declined: 'Tudo bem, continue procurando. Estou aqui na Sala de TI.',
  checking: 'Deixa eu ver… Vou conferir a prancheta e passar nos equipamentos olhando os adesivos.',
  success: (n: number) =>
    `Conferi tudo: ${n} computadores, cada um com o traço certo na prancheta e o adesivo certo. Levantamento perfeito! Vou passar para o chefe.`,
  problems: (n: number) =>
    `Hmm… achei ${n === 1 ? '1 problema' : `${n} problemas`} no levantamento. Vou ter que tirar 100 XP de você.`,
  more: (n: number) => `E ainda tem mais ${n === 1 ? '1 problema' : `${n} problemas`} parecidos.`,
  fixIt: 'Já tirei os adesivos errados e apaguei os traços desses equipamentos. Corrija, procure o que faltou e me traga a prancheta de novo!',
} as const;

/** Fase 2, missão 2: o caça-palavras escrito no quadro branco da Sala de Reuniões. */
export const MISSAO_CACA = {
  id: 'caca-palavras-quadro',
  title: 'Caça-palavras do quadro',
  xp: 100,
  /** Os colegas que ficam no quadro (estações): Bruno, Diego e Fábio. O do meio (Diego) chama o ESTAGIÁRIO. */
  colleagues: [1, 3, 5],
  caller: 3,
  /** Conversa no quadro (a câmera mostra a cena). `who` = índice da estação. */
  chat: [
    { who: 1, text: 'Gente, alguém escreveu um caça-palavras no quadro com as palavras da aula de computação. Já achei… nenhuma.' },
    { who: 5, text: 'Eu achei uma! Ah, não… era o nome do Diego escrito torto.' },
    { who: 3, text: 'Já sei! O estagiário fez o levantamento dos computadores hoje cedo. Ele vai achar rapidinho. Vou chamar!' },
  ],
  call: 'ESTAGIÁRIO! Vem aqui na Sala de Reuniões, por favor! Precisamos de você!',
  greeting:
    'Olha só: escreveram este caça-palavras no quadro com as palavras da aula, e a gente está há meia hora sem achar quase nada.',
  plea: 'Você que entende de computador: ajuda a gente a achar todas as palavras?',
  question: 'Vai ajudar o pessoal com o caça-palavras do quadro?',
  declined: 'Poxa… tudo bem. Se mudar de ideia, a gente está aqui no quadro.',
  accepted: 'Isso! Chega perto do quadro e mostra para a gente onde estão as palavras!',
  retry: 'Ah, ainda faltaram palavras! Não desiste: chega perto do quadro e tenta de novo, a gente ajuda a torcer!',
  cheer: 'ACHOU TODAS! Que demais, estagiário! Agora sim a reunião pode começar!',
  success: 'Valeu mesmo! Você é o cara da informática aqui da empresa.',
} as const;

/** Usado quando nenhum caça-palavras da biblioteca é passado. */
export const CACA_PALAVRAS_PADRAO: MissionGame = { title: cacaPalavrasPadrao.title, config: cacaPalavrasPadrao };

/** Fase 2, missão 3: as placas de desenvolvimento (Arduino e Raspberry Pi) espalhadas nos armários da empresa. */
export const MISSAO_PLACAS = {
  id: 'placas-desenvolvimento',
  title: 'Placas de desenvolvimento',
  xp: 100,
  call: 'ESTAGIÁRIO! Pode dar um pulo aqui na Sala de TI? Preciso de ajuda com uma coisa urgente!',
  briefing: [
    'Valeu por vir! O pessoal vai montar um projeto de automação aqui na empresa, mas as placas de desenvolvimento sumiram!',
    'Placa de desenvolvimento é uma plaquinha com um chip programável, que a gente usa para criar projetos: robôs, sensores, automação…',
    'O Arduino (placa azul) tem um microcontrolador: um chip que é processador, memória e entradas e saídas ao mesmo tempo. Ele roda um programa só, para ler sensores e ligar LEDs e motores.',
    'O Raspberry Pi (placa verde) é um computador inteiro numa placa: processador, memória, USB, rede e saída de vídeo. Liga num monitor e roda um sistema operacional, como o Linux!',
    'São 10 placas, e o pessoal guardou em vários armários pela empresa. Onde tiver uma lupa em cima, procure! Quando achar as 10, traga aqui para mim.',
  ],
  noneYet: 'Ainda não achou nenhuma? Procure nos móveis que têm uma lupa em cima. As placas caem no chão brilhando: chegue perto para pegar!',
  missing: (got: number, missing: number, allSearched: boolean) =>
    `Você trouxe ${got} ${got === 1 ? 'placa' : 'placas'}, mas são 10: ${missing === 1 ? 'falta 1' : `faltam ${missing}`}! ` +
    (allSearched
      ? 'Você já procurou em todos os armários, então deve ter ficado placa no chão. Procure o brilho amarelo!'
      : 'Volte e procure nos móveis que ainda têm uma lupa em cima.'),
  empty: (where: string) => `Só papelada e bagunça ${where}… nenhuma placa aqui.`,
  found: (n: number) => (n === 1 ? 'Achou 1 placa! Chegue perto dela para pegar.' : `Achou ${n} placas! Chegue perto delas para pegar.`),
  allFound: '🔌 10|10: você achou todas as placas! Leve para o Marcos, na Sala de TI.',
  success:
    'As 10 placas! 5 da família Arduino e 5 da Raspberry Pi. Agora o projeto de automação sai do papel. Mandou bem, estagiário!',
} as const;

/** Fase 2, missão 4: o Marcos cochila jogando forca no tablet, o tablet cai e o ESTAGIÁRIO termina a partida. */
export const MISSAO_FORCA = {
  id: 'forca-tablet',
  title: 'A forca do tablet do Marcos',
  xp: 100,
  rest: 'Ufa, as placas estão de volta! Vou descansar um pouquinho jogando uma forca no tablet… só uma partida.',
  later: 'Alguns minutos depois…',
  /** Relógio do topo: começa 14h05 e passa 35 minutos. */
  clockFrom: 14 * 60 + 5,
  clockMinutes: 35,
  crash: '💥 PLAFT! Um barulho na Sala de TI… e uma musiquinha de jogo tocando sem parar.',
  heard: 'Que barulho foi esse? Veio da Sala de TI… E que musiquinha é essa? Vou lá ver.',
  found:
    'O Marcos dormiu jogando! O tablet caiu no chão e a forca ainda está aberta, sem resposta… Vou terminar essa partida para ele.',
  retry: (won: number, total: number) =>
    `Acertei ${won} de ${total} palavras… Ainda não está completa. Vou tentar de novo antes que ele acorde!`,
  gaveUp: 'Melhor deixar quieto por enquanto… Mas a forca continua aberta, posso voltar e terminar.',
  solved: 'Acertei as 5 palavras! Partida completinha.',
  waking: 'Hã… hmm… que horas são…?',
  escape: 'Ele está acordando! Deixa o tablet na mesa e… sai de fininho!',
  success: 'Ufa! Ele nem percebeu. E a forca dele ficou resolvida.',
} as const;

/** Usada quando nenhuma forca da biblioteca é passada (palavras do dia). */
export const FORCA_PADRAO: MissionGame = { title: forcaPadrao.title, config: forcaPadrao };

/** Fase 2, missão 5: um amigo do curso de informática básica avisa, pelo WhatsApp, do exercício surpresa. */
export const MISSAO_EXERCICIO = {
  id: 'exercicio-surpresa',
  title: 'Exercício surpresa do curso',
  xp: 100,
  ring: '📱 Bzz… bzz… O celular do estagiário vibrou: mensagem nova!',
  notice: 'Opa, meu celular vibrou! Mensagem nova… Deixa eu ver.',
  /** Quem manda a mensagem e a hora dela (minutos do dia: logo depois da fuga da Sala de TI). */
  friend: 'Lucas · Curso de Informática',
  friendInitials: 'LU',
  at: 14 * 60 + 42,
  chat: [
    'E aí, sumido! Tudo certo no estágio? 😄',
    'Correria: o professor mandou um EXERCÍCIO SURPRESA para a turma de informática básica!',
    'Tem que responder ainda hoje, vale nota. O link está aqui:',
  ],
  link: { title: 'Exercício surpresa: informática básica', site: 'curso-informatica.edu/exercicio', cta: 'Toque para abrir' },
  /** Resposta do ESTAGIÁRIO na conversa depois de cada tentativa. */
  sent: (right: number, total: number) => `Pronto, respondi! Acertei ${right} de ${total}.`,
  passed: 'Boa!! Mandou muito bem! 👏 O professor vai gostar. Até a aula!',
  failed: (needed: number, total: number) =>
    `Hmm… o professor disse que só vale se acertar pelo menos ${needed} de ${total}. Dá para refazer pelo mesmo link! 💪`,
  gaveUp: 'Depois eu respondo… mas tem que ser ainda hoje! O celular está no bolso: é só abrir de novo.',
  success: 'Exercício entregue! Ainda bem que o celular vibrou a tempo.',
} as const;

/** Usado quando nenhum quiz da biblioteca é passado para o exercício surpresa. */
export const QUIZ_SURPRESA_PADRAO: MissionGame = { title: quizSurpresaPadrao.title, config: quizSurpresaPadrao };

/** Fim do 2º dia: o chefe dispensa o ESTAGIÁRIO, que sai da empresa e comemora (não vale XP, mostra o resumo). */
export const FIM_DIA2 = {
  call: 'ESTAGIÁRIO! Dá um pulo aqui na Diretoria, por favor.',
  dismiss: [
    'Fiquei sabendo do seu dia: levantamento dos computadores, o caça-palavras do pessoal, as 10 placas achadas…',
    'O Marcos até comentou que a forca do tablet dele apareceu resolvida. Curioso, né?',
    'Você trabalhou muito bem hoje. Está dispensado por hoje: pode ir para casa descansar. Até amanhã!',
  ],
  leaving: '🚪 Dispensado! Saia da empresa pela porta principal.',
  victory: 'UHUUUL! Segundo dia de estágio concluído!',
} as const;

/** Fase 3, missão 1 (aula: hardware, os componentes internos): as peças da lista do Marcos. */
export const MISSAO_PECAS = {
  id: 'pecas-hardware',
  title: 'As peças da lista do Marcos',
  xp: 100,
  /** XP perdido a cada entrega com alguma peça errada. */
  penalty: 50,
  dayStart: '☀️ 3º dia de estágio · Aula: hardware, as peças de dentro do computador',
  call: 'ESTAGIÁRIO! Gostei muito do seu trabalho ontem. Passa aqui na Sala de TI? Preciso de ajuda de novo!',
  briefing: [
    'Bom dia! Vou montar computadores novos e preciso destas 8 peças. Aqui está a lista: traga cada uma exatamente como está nela.',
    'Elas estão nos móveis com uma lupa em cima. Leia o adesivo de cada peça e compare com a lista antes de guardar: peça errada eu devolvo e você perde 50 XP.',
  ],
  noneYet: 'Ainda não trouxe nenhuma peça? Procure nos móveis com uma lupa em cima e compare cada peça com a lista!',
  missing: (names: string[]) =>
    `Ainda faltam ${names.length === 1 ? 'esta peça' : `${names.length} peças`}: ${names.join(', ')}. Traga as 8 juntas que eu confiro tudo de uma vez.`,
  empty: (where: string) => `Só papelada e bagunça ${where}… nenhuma peça aqui.`,
  found: (n: number) => (n === 1 ? 'Caiu 1 peça! Chegue perto dela para ver.' : `Caíram ${n} peças! Chegue perto de cada uma para ver.`),
  full: '🧰 8|8: uma peça de cada tipo na mochila! Leve para o Marcos, na Sala de TI.',
  stored: (name: string) => `🧰 Guardou ${name} na mochila.`,
  swapped: (name: string) => `🧰 Trocou ${name}: a outra ficou no chão.`,
  left: 'Deixou a peça no chão.',
  checking: 'Deixa eu conferir cada peça com a lista…',
  problems: (n: number) =>
    n === 1 ? 'Hmm… 1 peça não é a da lista. Vou ter que tirar 50 XP.' : `Hmm… ${n} peças não são as da lista. Vou ter que tirar 50 XP.`,
  keepRight: (n: number) =>
    n ? `As outras ${n} estão certas: essas eu já guardei aqui. Procure as que faltam e me traga.` : 'Procure as certas e me traga.',
  success: 'Todas certinhas, iguais à lista! Muito obrigado pela ajuda, estagiário!',
} as const;

/** Fase 3, missão 2: com sede, o ESTAGIÁRIO vai até a Copa; a Rita corre atrás dele para pedir ajuda nas palavras-cruzadas. */
export const MISSAO_CRUZADAS_RITA = {
  id: 'cruzadas-rita',
  title: 'As palavras-cruzadas da Rita',
  xp: 100,
  thirsty: 'Ufa, quanta peça! Bateu uma sede… Vou até a Copa beber uma água.',
  shout: '— ESTAGIÁRIO! Espera aí!',
  startled: 'AAAH! Que susto!',
  sorry: 'Desculpa, desculpa! Eu te vi passando para a Copa e vim correndo atrás de você.',
  calm: 'Ufa… tudo bem, Rita. Aconteceu alguma coisa?',
  plea: 'Estou há um tempão travada nestas palavras-cruzadas do tablet. Me disseram que você é ótimo nisso!',
  question: 'Você vai ajudar a Rita com as palavras-cruzadas?',
  declined: 'Tudo bem… vou ficar aqui na Copa tentando. Se mudar de ideia, é só falar comigo!',
  again: 'Voltou! Vamos tentar de novo as palavras-cruzadas?',
  gaveUp: 'Ficou difícil, né? Sem problema: quando quiser tentar de novo, é só falar comigo aqui na Copa.',
  success: 'Completou tudinho! Muito obrigada, estagiário! Agora volto para o RH bem mais tranquila.',
  water: 'De nada, Rita! Agora sim… a minha água.',
  drink: '💧 Glub, glub… Que água geladinha!',
} as const;

/** Usadas quando nenhuma palavra-cruzada da biblioteca é escolhida para a Rita (as peças do computador). */
export const CRUZADAS_RITA_PADRAO: MissionGame = { title: cruzadasRitaPadrao.title, config: cruzadasRitaPadrao };

/** Fase 3, missão 3: o Marcos chama de novo para montar os 3 computadores (estudante, gamer e escritório). */
export const MISSAO_MONTAR_PCS = {
  id: 'montar-pcs',
  title: 'Os 3 computadores do Marcos',
  xp: 100,
  escape: 'Melhor eu sair rapidinho daqui, antes que apareça mais alguma palavra-cruzada…',
  call: 'ESTAGIÁRIO! Volta aqui na Sala de TI? Agora preciso de ajuda para montar uns computadores!',
  briefing: [
    'Chegaram as peças de 3 computadores novos: um para estudante, um gamer e um para o escritório. Cada caixa tem as peças de um deles.',
    'É simples: chegue perto de uma caixa e arraste cada peça até o lugar dela no gabinete. Depois ligue os cabos de energia e os de dados (SATA).',
    'No fim, aperte o botão de ligar. Se aparecer a tela de inicialização, está montado! Quero ver os três ligando.',
  ],
  built: (title: string, n: number) => `🖥️ ${title}: pronto! (${n}|3)`,
  success: 'Os três ligaram de primeira! Estudante, gamer e escritório, todos prontinhos. Você manda muito bem, estagiário!',
} as const;

/** Fase 3, missão 4: o chefe chama na Sala de Reuniões para o quiz que vai ser passado na reunião de alinhamento. */
export const MISSAO_ALINHAMENTO = {
  id: 'quiz-alinhamento',
  title: 'O quiz da reunião de alinhamento',
  xp: 100,
  /** A partir desta fração de acertos o chefe diz que está no nível esperado (o XP vem de qualquer jeito). */
  goodRatio: 0.7,
  call: 'ESTAGIÁRIO, pode vir até a Sala de Reuniões? Preciso de você um minutinho.',
  briefing: [
    'Senta aí, por favor. Mais tarde temos a reunião de alinhamento, e este quiz vai ser passado nela.',
    'Precisamos saber se você está com o nível de acordo com o esperado. Responda com calma, no notebook da mesa.',
  ],
  gaveUp: 'Sem problema: o quiz fica aberto no notebook. Quando quiser terminar, é só sentar de novo naquela cadeira.',
  result: (right: number, total: number, good: boolean) =>
    good
      ? `${right} de ${total}! Está no nível que a gente esperava. Parabéns!`
      : `${right} de ${total}. Está no caminho certo: na reunião a gente vê o que precisa reforçar.`,
  thanks: 'Muito obrigado, estagiário! Vou levar o resultado para a reunião de alinhamento.',
} as const;

/** Usado quando nenhum quiz da biblioteca é escolhido para a reunião de alinhamento (a aula de hardware do dia). */
export const QUIZ_ALINHAMENTO_PADRAO: MissionGame = { title: quizAlinhamentoPadrao.title, config: quizAlinhamentoPadrao };
