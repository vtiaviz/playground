# Playground — Fase 1: estrutura base e acesso

Monorepo (npm workspaces):

    apps/api         Node + Express 5 + Prisma 6 + PostgreSQL 16 (login, troca de senha, JWT, turmas)
    apps/web         React 19 + Vite (login, painel do instrutor, laboratório de jogos)
    packages/office  jogo Office (Phaser): escritório top-down com o ESTAGIÁRIO
    packages/games   os 5 jogos como módulos reutilizáveis (cruzadas, forca, caça-palavras, quiz, complete as frases), cada um com seu gerador de conteúdo com IA, e a regra do nível adaptativo

## O que a Fase 1 entrega

- Modelo de dados completo do plano (`apps/api/prisma/schema.prisma`): users, teams, team_students,
  activities, activity_teams, game_scores, feedbacks. Só `users` é usada nesta fase.
- `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/change-password`
- Flag `must_change_password`: enquanto estiver `true`, o aluno só consegue ir para a tela
  "Crie sua nova senha". A API tem os middlewares `requireAuth`, `requirePasswordChanged` e
  `requireRole(...)`, que as rotas das próximas fases vão usar.
- Seed com um instrutor e um aluno de teste (em primeiro acesso).

## O que a Fase 2 entrega (turmas e alunos)

- **Sem migração e sem dependências novas** — é só copiar os arquivos por cima e reiniciar a API e o Vite.
- Barra lateral do instrutor com a lista de turmas, **criar / editar / excluir** turma (nome e turno).
- **Importar alunos em lote**: uma linha por aluno, com nome, e-mail e/ou matrícula em qualquer ordem
  (separador `;`, Tab ou vírgula — dá para colar direto de uma planilha). Limite de 150 por vez.
  - Login = e-mail, senão matrícula, senão gerado pelo nome (`maria.silva`, `maria.silva2`…).
  - Senha temporária **aleatória por aluno** (10 caracteres) e troca obrigatória no primeiro acesso.
  - Linhas com problema são listadas e continuam na caixa de texto para corrigir; as válidas são importadas.
  - Aluno que já é seu pode ser adicionado a outra turma sem trocar a senha dele. Login que pertence a
    outro instrutor nunca é vinculado.
- **Credenciais**: modal com tabela, "Copiar tudo" (cola em planilha) e "Baixar CSV". As senhas só aparecem
  na hora, porque o banco guarda apenas o hash. Para rever, use **Nova senha** (um aluno) ou
  **Ver/gerar senhas dos pendentes** (todos que ainda não trocaram a senha).
- Remover aluno da turma e excluir turma **não apagam as contas** dos alunos.

API (todas exigem instrutor logado e só enxergam as turmas dele):

    GET    /api/teams                                   POST   /api/teams
    GET    /api/teams/:id                               PATCH  /api/teams/:id        DELETE /api/teams/:id
    POST   /api/teams/:id/students/import               {text}
    POST   /api/teams/:id/students/reset-passwords      {studentIds?}  (sem ids = todos os pendentes)
    DELETE /api/teams/:id/students/:studentId

## O que a Fase 2.5 entrega (jogos como módulos)

Os quatro jogos viraram o pacote `@playground/games`. Cada um é um `GameModule` com:

- **`Player`** — `config`, `onComplete(result)`, `allowRestart` (padrão `true`), `compact`.
  `result = { score, maxScore, durationSeconds, details }` e é chamado **uma única vez**, ao terminar.
- **`Editor`** — `initialConfig?`, `onSave(config)`, `onCancel?`, `saveLabel?`. O botão Salvar só
  habilita com a configuração válida; `initialConfig` reabre um jogo já salvo.
- `validateConfig`, `maxScore(config)` e `summarize(config)`.

Detalhes que importam para as próximas fases:

- Cada jogo roda dentro de um **Shadow DOM**: o CSS de um jogo não vaza para o site nem para outro jogo.
- Com vários jogos na mesma página, só o último em que se clicou recebe o teclado físico (forca e quiz).
- `@playground/games/validate` não importa React: a API (Fase 3/4) usa para validar a configuração
  de uma atividade e conferir `maxScore` contra a nota recebida.
- Links/iframes de compartilhamento dos jogos originais foram removidos; o jogo agora é salvo no banco.
- A tela de teste dos módulos virou a **biblioteca “Meus jogos”** (veja a seção da biblioteca, abaixo).

**Precisa de `npm install`** (workspace novo + `lz-string`, `jsdom`, Testing Library, `tsx`):

```bash
npm install
npm test                  # API (Fase 1/2) e jogos
npm run check -w @playground/games   # conferências de lógica (tsx)
npm run typecheck
```

Os testes dos jogos rodam em jsdom e não precisam de banco.

## Checklist manual da Fase 2.5

1. Entrar como instrutor → barra lateral → "🎮 Laboratório de jogos".
2. Para cada jogo (cruzadas, forca, caça-palavras, quiz): abrir o editor, ver o preview, **Salvar jogo**.
3. Jogar até o fim → o bloco `onComplete` mostra `score`, `maxScore` e `durationSeconds`.
4. Marcar/desmarcar "permitir jogar de novo" → o botão "Jogar de novo" aparece/some.
5. Clicar em **Editar** → o editor reabre com os dados salvos (no quiz, o texto volta no formato `1 - … a) … resposta: a`).
6. Apagar o texto/palavras no editor → o botão Salvar fica desabilitado.

## O que a Fase 3 entrega (criador de atividades)

- **Sem migração** (as tabelas `activities` e `activity_teams` já existem desde a Fase 1), mas precisa de
  **`npm install`** (Tiptap no web; `@playground/games` na API).
- Barra lateral → **📝 Atividades**: lista com situação (Rascunho / Publicada), turmas, nº de jogos;
  criar, editar, publicar/ajustar turmas, despublicar e excluir.
- **Editor** (Tiptap): parágrafos, títulos H1–H4, negrito/itálico/código, listas, **links externos** (ex.: Kahoot),
  **imagens por URL**, desfazer/refazer, `Ctrl+S` para salvar e aviso ao fechar com alterações não salvas.
- **🎮 Inserir jogo**: modal de busca com os 4 jogos → editor do jogo → entra como bloco no texto, logo depois
  do parágrafo onde está o cursor. O bloco tem **Editar jogo**, **Remover** e pode ser arrastado.
  Cada jogo recebe um `blockId` estável (é a chave das notas na Fase 4).
- **Visualizar como aluno**: mostra o texto com os jogos jogáveis (nada é gravado).
- **Publicar**: escolha uma ou mais turmas (e prazo opcional). Dá para voltar e mudar as turmas depois.
- **Segurança**: a API reconstrói o documento só com elementos permitidos, aceita links/imagens `http(s)`,
  exige `blockId` único e valida cada jogo com `@playground/games/validate`. Um instrutor não enxerga
  atividades de outro.
- **Jogos com notas gravadas** (Fase 4) não podem ser removidos nem alterados; o resto da atividade pode.

API (instrutor logado; só as atividades dele):

    GET    /api/activities                         POST  /api/activities           {title, content?}
    GET    /api/activities/:id                     PATCH /api/activities/:id       {title?, content?, dueAt?}
    POST   /api/activities/:id/publish             {teamIds, dueAt?}
    POST   /api/activities/:id/unpublish           DELETE /api/activities/:id

O conteúdo é o JSON do Tiptap (`{type:"doc", content:[…]}`) com o bloco
`{type:"gameBlock", attrs:{blockId, gameType, config}}`.

## Checklist manual da Fase 3

1. Entrar como instrutor → **Atividades** → **+ Nova atividade** ("Aula 1") → abre o editor.
2. Escrever um título H2, um parágrafo, uma lista, um link (`https://kahoot.it`) e uma imagem por URL.
3. **Inserir jogo** → buscar "quiz" → montar → **Inserir na atividade**. Repetir com a forca.
4. Clicar em **Editar jogo** num bloco, mudar algo, aplicar; **Salvar**; recarregar a página → tudo continua lá.
5. **Visualizar como aluno** → jogar os dois jogos; **Voltar a editar**.
6. **Publicar…** → marcar duas turmas → a lista mostra "Publicada" com as turmas; **Despublicar** volta a rascunho.
7. Colocar `javascript:alert(1)` no link → o editor recusa ("Use um endereço completo…").

## O que a Fase 4 entrega (experiência do aluno)

- **Sem migração e sem dependências novas** — é só copiar por cima e reiniciar a API e o Vite.
- Área do aluno com abas **Abertas · Concluídas · Ranking**. Cada atividade mostra prazo, jogos feitos e pontos.
  - *Concluída* = todos os jogos feitos (atividade só de texto: concluída ao enviar a avaliação).
  - O aluno só vê atividades **publicadas** para as turmas dele.
- **Visualizador**: o texto e os jogos jogáveis (os mesmos módulos do editor). Ao terminar um jogo, a nota é
  **gravada sozinha** (`onComplete` → `POST /api/student/activities/:id/scores`); se falhar, aparece "Tentar de novo".
  Jogo já concluído aparece como cartão com a nota (não dá para jogar de novo e melhorar a nota).
- **Feedback**: ao terminar o último jogo abre um modal (1 a 5 estrelas + comentário); também fica em "Sua avaliação"
  no fim da página e pode ser ajustado depois.
- **Ranking**: "Geral" (colegas de todas as suas turmas) e por turma; soma dos pontos das atividades publicadas;
  empates dividem a posição; o aluno aparece destacado.

API (aluno logado, senha já trocada):

    GET  /api/student/activities                      lista com progresso
    GET  /api/student/activities/:id                  conteúdo + notas + feedback
    POST /api/student/activities/:id/scores           {blockId, score, maxScore?, durationSeconds?, details?}
    PUT  /api/student/activities/:id/feedback         {rating 1-5, comment?}
    GET  /api/student/ranking

**Sobre a confiança nas notas:** os jogos rodam no navegador, então o servidor não vê a partida. Ele confere que o
jogo existe na atividade, que a nota é inteira, não passa do máximo calculado a partir da configuração e que o
`maxScore` enviado bate; cada jogo vale só a primeira vez. Isso barra erros e fraudes grosseiras, mas um aluno
técnico pode abrir o DevTools e enviar a nota máxima (e ler as respostas no JSON). Para sala de aula costuma bastar;
se precisar de mais rigor, o próximo passo é validar a partida no servidor.

## Checklist manual da Fase 4

1. Como instrutor: publicar uma atividade com 2 jogos para uma turma que tenha alunos já com senha trocada.
2. Entrar como esse aluno → **Abertas** mostra a atividade (0/2 jogos).
3. Abrir, jogar o 1º jogo até o fim → "Salvando sua nota…" e o topo mostra 1/2 jogos e os pontos.
4. Recarregar a página → o 1º jogo aparece como "✅ concluído — X / Y pontos".
5. Terminar o 2º jogo → abre o modal de avaliação; enviar 4 estrelas. A atividade passa para **Concluídas**.
6. **Ranking**: o aluno aparece destacado; alternar entre Geral e a turma. Um 2º aluno com mais pontos aparece na frente.
7. Como instrutor, "Despublicar" a atividade → some da lista do aluno e deixa de contar no ranking.

## O que a Fase 5 entrega (painel do instrutor)

- **Sem migração e sem dependências novas** — copie por cima e reinicie a API e o Vite.
- Sidebar → **📊 Painel** (agora é a página inicial do instrutor), com filtro **por turma** no topo; tudo na página
  acompanha o filtro.
- **Indicadores**: alunos, atividades publicadas, % de entregas concluídas (e quantas pendentes), média de acertos
  e satisfação média.
- **Gráficos** (barras finas, dica ao passar o mouse ou focar com o teclado, **“Ver tabela”** com os mesmos números,
  tema claro/escuro): entrega por atividade e por turma (concluídas · em andamento · pendentes), média de acertos por
  turma, por atividade e por tipo de jogo, e distribuição das avaliações (1 a 5).
- **Satisfação**: atividades mais bem e pior avaliadas e comentários recentes.
- **Status de entrega**: escolha a atividade → tabela aluno a aluno, **pendentes primeiro e destacados**, com jogos feitos,
  pontos, acertos, última jogada e avaliação; filtro “só quem falta concluir” e acertos por jogo da atividade.
- **Ranking de alunos** por pontos acumulados (empates dividem a posição) e **ficha do aluno** (clique no nome).

Definições usadas nas contas:

- *Entrega* = aluno × atividade publicada para alguma turma dele (conta uma vez, mesmo que o aluno esteja em duas
  turmas que receberam a atividade).
- *Concluída* = todos os jogos feitos (atividade só de texto: avaliação enviada). *Em andamento* = alguns jogos.
  *Pendente* = nenhum.
- *Acertos* = soma das notas ÷ soma das notas máximas dos jogos jogados. Notas de jogos que foram removidos da
  atividade não entram. Atividades em rascunho não entram.

API (instrutor logado; só dados das turmas dele):

    GET /api/dashboard?teamId=            visão geral (todas as turmas ou uma)
    GET /api/dashboard/activities/:id     entrega aluno a aluno + desempenho por jogo + avaliações
    GET /api/dashboard/students/:id       ficha do aluno

## Checklist manual da Fase 5

1. Ter ao menos 2 alunos numa turma com uma atividade (2 jogos) publicada; um aluno jogou tudo e avaliou, outro jogou
   só o 1º jogo, um terceiro não jogou.
2. Entrar como instrutor → **Painel**: os indicadores batem com isso (1 de 3 concluída = 33,3%).
3. Em **Entrega por atividade** passar o mouse na barra: a dica mostra as 3 quantidades; **Ver tabela** mostra o mesmo.
4. **Status de entrega**: o aluno sem jogadas aparece primeiro, em destaque, como “⚠ Pendente”.
5. Clicar no nome de um aluno → ficha com as atividades dele.
6. Trocar o filtro para uma turma → todos os números mudam; “Todas as turmas” volta ao total.
7. Alternar o tema do sistema para escuro → gráficos continuam legíveis.

## Biblioteca de jogos (“Meus jogos”)

- **Precisa de migração** (tabela nova `saved_games`) e reiniciar a API:

  ```bash
  cd apps/api && npx prisma migrate dev --name saved_games && cd ../..
  ```
- Sidebar → **🎮 Meus jogos**: lista dos jogos salvos (título, tipo, conteúdo, pontos, data), com busca e filtro
  por tipo. **+ Novo jogo**, **Jogar** (teste, nada é gravado), **Editar**, **Duplicar** e **Excluir**.
- No editor de atividades, **Inserir jogo** agora tem as abas **Meus jogos** (reaproveitar) e **Criar novo**.
  Ao criar um jogo novo dentro da atividade há a opção **“Salvar também na minha biblioteca”** (marcada), e todo
  bloco de jogo tem o botão **Salvar na biblioteca**.
- O jogo é **copiado** para a atividade: editar ou excluir na biblioteca não muda atividades já montadas ou publicadas
  (e, por isso, notas já gravadas continuam válidas).

API (instrutor logado; só os jogos dele):

    GET /api/games            POST /api/games   {gameType, config}
    GET /api/games/:id        PUT  /api/games/:id   {config}
    POST /api/games/:id/duplicate        DELETE /api/games/:id

## Checklist manual da biblioteca

1. **Meus jogos** → **+ Novo jogo** → Quiz → montar → **Salvar na biblioteca** → o jogo aparece na lista.
2. **Jogar**, **Editar** (mudar o título), **Duplicar** (aparece “… (cópia)”) e **Excluir** (com confirmação).
3. Atividades → abrir uma → **Inserir jogo → Meus jogos** → escolher o jogo → o bloco entra no texto.
4. **Inserir jogo → Criar novo** com “Salvar também na biblioteca” marcado → o jogo aparece em **Meus jogos**.
5. Num bloco já existente, **Salvar na biblioteca** → "Salvo ✔" e o jogo aparece na lista.

## Jogo novo: Complete as Frases

Quinto jogo do pacote `packages/games` (`src/completefrases/`), no mesmo formato dos outros: `Player`, `Editor`, `validateConfig`, `maxScore` e `summarize`. Aparece sozinho em **Meus jogos**, em **Inserir jogo** e no painel (tipo `COMPLETE_FRASES`, selo roxo).

- **Visual:** o mesmo dos outros jogos (degradê azul, cartões translúcidos, botões amarelos), com tela inicial e botão **Começar**.
- **Aluno:** lista de frases com lacunas e um banco de palavras com as respostas embaralhadas mais as palavras extras (pegadinhas). Arrasta a palavra até a lacuna ou toca na palavra e depois na lacuna; dá para arrastar de uma lacuna para outra (troca) ou de volta para o banco.
- **Banco sempre visível:** o banco fica grudado no topo da tela enquanto a página rola (até o fim do jogo).
- **Desfazer:** clique duplo (ou toque duplo) numa lacuna preenchida devolve a palavra ao banco. No teclado, `Delete`/`Backspace` na lacuna faz o mesmo.
- **Envio único:** o botão só habilita com todas as lacunas preenchidas e pede confirmação. Depois do envio aparece o cartão de resultado (estrelas, pontos, tempo e "Copiar resultado") e, abaixo, cada frase com Correto/Incorreto, a resposta certa e a explicação.
- **Pontuação:** 10 pontos por lacuna certa, sem bônus de tempo (o tempo é registrado em `durationSeconds`). Maiúsculas/minúsculas não contam.
- **Editor:** uma frase por linha com a resposta entre colchetes (`do lado [direito].`), explicação opcional numa linha começando com `>`, e as palavras extras separadas por vírgula. Até 30 frases, 5 lacunas por frase e 20 palavras extras; uma palavra extra igual a uma resposta é recusada.

**Migração necessária** (novo valor no enum `GameType`):

```bash
cd apps/api && npx prisma migrate dev --name complete_frases && cd ../..
```

### Checklist manual do Complete as Frases
1. **Meus jogos → + Novo jogo → Complete as Frases.** O preview mostra a tela inicial com **Começar**, como nos outros jogos. **Usar exemplo → Salvar**: o jogo aparece na lista com o selo roxo e "10 frases · 4 pegadinhas".
2. **Jogar → Começar** (o tempo só conta a partir daqui): arraste uma palavra para a lacuna 1; toque em outra palavra e depois na lacuna 2. Role a página: o banco continua visível no topo.
3. Dê **clique duplo** na lacuna 1: a palavra volta ao banco, no mesmo lugar.
4. Arraste a palavra da lacuna 2 para a lacuna 3: ela muda de lugar.
5. Preencha tudo (erre uma de propósito), **Enviar respostas → Confirmar envio**: aparecem o resultado (estrelas, pontos e tempo) e a correção de cada frase. As lacunas não mudam mais.
6. Coloque o jogo numa atividade, publique e jogue como aluno: a nota é gravada e o cartão de "concluído" aparece ao recarregar.
7. No celular (ou no modo dispositivo do navegador), repita os passos 2 e 3 usando só toques.

## Gerador de conteúdo com IA

- **Sem migração.** Precisa de **`npm install`** (dependência nova na API: `cheerio`, para ler o HTML) e de uma
  chave grátis de IA no `apps/api/.env`:

  ```bash
  # https://console.groq.com/keys  (grátis, sem cartão; a chave fica só no servidor)
  AI_API_KEY="gsk_..."
  ```

  Sem a chave o resto do sistema funciona normalmente; o botão de gerar mostra o aviso de configuração.
- **Fluxo:** link → leitura da página → texto limpo → modelo → **três versões do jogo: Fácil, Normal e Difícil**.
  - Lê **só a página do link**. Em sites GitBook usa a versão Markdown da página (`<link>.md`); em outros sites
    lê o HTML e fica só com o conteúdo principal (sem menu, rodapé e scripts). A página precisa ser pública.
  - O texto vai para o modelo com no máximo `AI_MAX_SOURCE_CHARS` caracteres (padrão 8 000, que cabe no limite
    por minuto do plano grátis do Groq). Página maior: só o começo é usado, e a tela avisa.
  - **Uma chamada** devolve os três níveis em JSON; se vier fora do formato, tenta mais uma vez.
- **Cada jogo tem o próprio gerador** (`packages/games/src/<jogo>/ai.ts`): o que pedir ao modelo em cada nível e
  como transformar a resposta numa configuração válida. Itens ruins são descartados um a um (alternativa
  inexistente, palavra com número, dica que entrega a resposta, pegadinha igual à resposta…) e o resultado passa
  pelo mesmo `validateConfig` do editor.

  | Jogo | Fácil | Normal | Difícil |
  | --- | --- | --- | --- |
  | Quiz | 5 perguntas, 3 alternativas | 8 perguntas, 4 alternativas | 10 perguntas, 5 alternativas (aplicação) |
  | Forca | palavras de 4–7 letras | 6–10 letras | termos técnicos de 8–16 letras |
  | Caça-palavras | 6 palavras, só → e ↓ | 10 palavras, 8 direções | 15 palavras, 8 direções |
  | Palavras cruzadas | 8 palavras, dicas diretas | 11 palavras | 15 palavras, dicas indiretas |
  | Complete as Frases | 5 frases, 1 lacuna, sem pegadinhas | 7 frases, 3 pegadinhas | 10 frases, até 2 lacunas, 6 pegadinhas |

  No quiz as alternativas são embaralhadas (o modelo tende a pôr a certa sempre na mesma posição). Nas cruzadas,
  palavras que não cruzam com nenhuma outra ficam de fora da grade.
- **Onde fica na tela:**
  - **Meus jogos → ✨ Gerar com IA**: escolhe o jogo, cola o link e, opcionalmente, instruções extras
    (“público do 1º ano”, “foque em protocolos”).
  - **Novo jogo → (um jogo) → ✨ Gerar com IA**, e o mesmo dentro de **Atividade → Inserir jogo → Criar novo**.
    Na atividade aparece também **Inserir “Fácil/Normal/Difícil” na atividade**.
- **Conferir antes de salvar:** abas Fácil / Normal / Difícil com o **gabarito**, o jogo jogável e
  **Editar conteúdo** (abre o editor normal do jogo). Marque os níveis e **Salvar N jogos na biblioteca**: entram
  como “Título — Fácil”, “Título — Normal”, “Título — Difícil”. Nada é gravado antes disso.
- **Trocar de provedor:** a API fala o formato da OpenAI, então basta mudar `AI_BASE_URL` e `AI_MODEL`
  (exemplos de Groq, Gemini, OpenRouter e Ollama no `.env.example`). O padrão é `openai/gpt-oss-120b` no Groq
  (o Llama 3.3 70B foi descontinuado no plano grátis em agosto/2026). Os modelos mudam: a lista atual fica em
  https://console.groq.com/docs/models. Se o provedor recusar o modelo, a tela diz para trocar `AI_MODEL`.
- **Segurança:** a chave nunca vai para o navegador; só instrutores usam a rota; limite de `AI_RATE_LIMIT`
  gerações por instrutor a cada 10 minutos; o leitor só abre `http(s)` público (recusa `localhost`, IPs internos,
  portas diferentes de 80/443 e redirecionamentos para eles), com limite de 15 s e 3 MB. O texto da página é
  tratado como material, não como instrução para o modelo.

API (instrutor logado):

    GET  /api/ai/status                       {enabled, provider, model}
    POST /api/ai/generate                     {gameType, url, instructions?} -> {title, levels:[{level, title, config, answerKey}], source}
    POST /api/games/batch                     {games:[{gameType, config}]}  (até 10; salva todos ou nenhum)

## Checklist manual do gerador com IA

1. Colocar `AI_API_KEY` no `apps/api/.env` e reiniciar a API.
2. **Meus jogos → ✨ Gerar com IA** → Quiz → colar o link de uma página pública do GitBook → **Gerar 3 níveis**.
3. Ver as abas Fácil / Normal / Difícil, abrir o **Gabarito**, jogar um pouco o nível Difícil.
4. **Editar conteúdo** no Normal, mudar uma pergunta, aplicar → o teste mostra a mudança.
5. **Salvar 3 jogos na biblioteca** → a lista mostra “… — Fácil/Normal/Difícil”.
6. Repetir com Forca, Caça-palavras, Palavras cruzadas e Complete as Frases (pelo **+ Novo jogo → jogo → ✨ Gerar com IA**).
7. Numa atividade: **Inserir jogo → Criar novo → Forca → ✨ Gerar com IA** → **Inserir “Fácil” na atividade**.
8. Link inválido (`http://localhost:3333`) → mensagem “não é público”; página privada → mensagem de página privada.

## Aprendizado personalizado (nível adaptativo)

- **Precisa de migração** (tabelas novas `student_levels`, `level_events`, `game_starts` e colunas `level`,
  `performance` e `metrics` em `game_scores`). Sem dependências novas:

  ```bash
  cd apps/api && npx prisma migrate dev --name nivel_adaptativo && cd ../..
  ```
- **Ideia:** o instrutor coloca na atividade um **jogo adaptativo** (🎯) com as versões Fácil, Normal e Difícil.
  Cada aluno joga a versão do **nível dele naquele tipo de jogo** (o nível de Quiz vale em todas as atividades;
  Forca, Cruzadas etc. têm níveis próprios) e, ao terminar, o nível é recalculado sozinho.
- **Como inserir:**
  - **Inserir jogo → Meus jogos**: os conjuntos “Título — Fácil/Normal/Difícil” da biblioteca aparecem como
    **🎯 Título (adaptativo)** — um clique e pronto. Ou **🎯 Montar jogo adaptativo…** para escolher cada nível.
  - **Inserir jogo → Criar novo → ✨ Gerar com IA → 🎯 Inserir jogo adaptativo** (usa os níveis marcados).
  - Num jogo que já está na atividade: **🎯 Tornar adaptativo**. No cartão do jogo adaptativo: **Editar Fácil /
    Normal / Difícil** e **Níveis…** (trocar, tirar um nível ou voltar a jogo fixo). Precisa de pelo menos 2 níveis.
  - **Visualizar como aluno** mostra abas para testar cada nível.
- **Desempenho (0 a 100)**, calculado item a item (pergunta, palavra ou lacuna) em `packages/games/src/adaptive.ts`:
  - **acerto: 70%** — média dos itens (a forca desconta 0,1 por letra errada; caça-palavras, 0,1 por seleção errada;
    cruzadas, 0,15 por letra errada digitada na palavra);
  - **ritmo: 30%** — tempo de cada item **acertado** comparado com o esperado para ele (pergunta longa e palavra
    grande têm mais tempo); no tempo esperado = 100%, 3× o esperado = 0%. Só conta o tempo ativo: aba em segundo
    plano e a leitura do feedback do quiz não contam;
  - **descontos**: chutes (errar em menos de 35% do tempo esperado; até −20), “Verificar” nas cruzadas (−3 cada, até −15);
  - também guarda a **tendência** (acerto da 2ª metade − 1ª metade), erros e segundos por item, para o instrutor.
- **Regra do nível** (`ADAPTIVE_PARAMS`, fácil de ajustar): **sobe** com 2 desempenhos seguidos ≥ 80 ou na hora com
  ≥ 90; **desce** com 2 seguidos < 50 ou na hora com < 35; entre 50 e 79 fica. Quem nunca jogou um tipo de jogo
  começa na média dos níveis que já tem nos outros (sem histórico, Normal).
- **Aluno:** o jogo mostra o selo do nível. Ao terminar aparece o desempenho (acertos, ritmo, segundos por item, aviso
  de chute) e, se mudou, “🎉 você sobe para o nível Difícil…” / “vamos reforçar a base…”. Os próximos jogos
  adaptativos **ainda não começados** da mesma atividade já trocam de nível na hora. Ao clicar em **Começar** o nível
  daquele jogo fica travado (não muda no meio da partida).
- **Instrutor:**
  - Sidebar → **🎯 Níveis dos alunos**: alunos por nível em cada jogo, tabela aluno × jogo (nível, desempenho médio
    das últimas 5 partidas e tendência ↑/↓), filtro por turma e “Como o nível é calculado”.
  - Clique no aluno: **trocar o nível** e **Fixar** (o ajuste automático para até liberar), partidas com
    desempenho/acertos/ritmo/s por item/chutes e o **histórico** de cada mudança com o motivo.
  - **Painel → Status de entrega**: coluna **Desempenho** com o nível jogado; em “Acertos por jogo” os adaptativos têm 🎯
    e a dica mostra quantos jogaram em cada nível. A ficha do aluno tem o botão **🎯 Níveis e desempenho**.
- Jogos fixos continuam iguais e também gravam o desempenho, mas **só jogos adaptativos mudam o nível**. Um jogo
  adaptativo com notas não pode ter os níveis alterados (como os jogos fixos).
- **Segurança:** o aluno só recebe a configuração do nível dele (as outras ficam no servidor) e a nota é conferida
  contra o máximo daquele nível. O desempenho vem do navegador, como a nota (veja “confiança nas notas”).

API:

    POST /api/student/activities/:id/start     {blockId}  -> {game:{level, config}}  (trava o nível)
    POST /api/student/activities/:id/scores    agora devolve {score, performance, level:{played,before,after,change,reason}, updatedGames}
    GET  /api/levels?teamId=                   matriz alunos × jogos + distribuição       (instrutor)
    GET  /api/levels/students/:id              níveis, partidas e histórico               (instrutor)
    PUT  /api/levels/students/:id/:gameType    {level?, locked?}                          (instrutor)

No conteúdo da atividade, o jogo adaptativo é `{type:"gameBlock", attrs:{blockId, gameType, config, levels:{easy, normal, hard}}}`
(`config` = a do Normal). Os jogos mandam `details.items = [{correct 0–1, seconds, errors?}]` e têm o callback `onStart`.

## Checklist manual do nível adaptativo

1. Rodar a migração acima e reiniciar a API.
2. Ter na biblioteca um conjunto “Redes — Fácil/Normal/Difícil” (✨ Gerar com IA salva assim).
3. Atividades → nova atividade → **Inserir jogo → Meus jogos → 🎯 Redes** → o cartão mostra “Adaptativo · 3 níveis”.
   Inserir um segundo jogo igual. **Visualizar como aluno** → as abas Fácil/Normal/Difícil trocam o jogo. Salvar e publicar.
4. Entrar como aluno → os dois jogos aparecem com o selo **Normal**. Jogar o 1º acertando tudo rápido → “Desempenho 100/100”
   e “você sobe para o nível Difícil”; o 2º jogo (não começado) muda para **Difícil** na hora.
5. Nova atividade igual: errar tudo no 1º → “vamos reforçar a base”, e o 2º volta para **Normal**.
6. Instrutor → **🎯 Níveis dos alunos** → o aluno aparece no Quiz com o nível e o desempenho médio; clicar no nome → partidas e
   histórico com os motivos. Escolher **Fácil** e marcar **Fixar** → como aluno, o próximo jogo vem no Fácil e não sobe.
7. **Painel → Status de entrega** da atividade → coluna Desempenho com o selo do nível.

## Tutor IA nos jogos

- **Precisa de migração** (tabela nova `tutor_messages`) e reiniciar a API. Sem dependências novas:

  ```bash
  cd apps/api && npx prisma migrate dev --name tutor_ia && cd ../..
  ```
- Usa a mesma `AI_API_KEY` / `AI_MODEL` do gerador. Três variáveis novas (opcionais) no `apps/api/.env`:

  ```bash
  AI_TUTOR_ENABLED=true        # false desliga o botão de ajuda em todos os jogos
  AI_TUTOR_IDLE_SECONDS=60     # segundos parado na mesma pergunta até o tutor oferecer ajuda (0 = nunca)
  AI_TUTOR_RATE_LIMIT=15       # pedidos de ajuda por aluno a cada 10 minutos
  ```
- **Aluno:** com o jogo em andamento aparece o botão amarelo **💡 Pedir ajuda**, preso ao pé do jogo enquanto ele está na
  tela. Abre o painel do **🦉 Tutor**, que explica o que a pergunta pede e dá uma pista, **sem dar a resposta**. O aluno
  pode escrever a dúvida ("não sei o que é HD") ou pedir **💡 Outra dica**; cada nova dica no mesmo item é um pouco mais
  concreta, mas nunca a resposta. Pergunta/palavra nova = conversa nova.
- **Oferta automática:** depois de `AI_TUTOR_IDLE_SECONDS` sem nenhuma interação (clique, toque ou tecla) na mesma
  pergunta, aparece “Parece que essa está difícil. Quer uma dica?” (**Quero uma dica** / **Agora não**). Uma oferta por
  pergunta; só conta o tempo com a aba visível, com o painel fechado e no último jogo em que o aluno mexeu.
- **O que o tutor sabe de cada jogo** (`packages/games/src/tutor.ts`). Cada jogo informa o item em andamento pelo novo
  callback `onFocusChange({item, state})`:

  | Jogo | Item | O que o tutor recebe além do enunciado |
  | --- | --- | --- |
  | Quiz | a pergunta aberta | — (depois de responder, enquanto o aluno lê o resultado, não há botão) |
  | Forca | a palavra em jogo | letras descobertas, letras erradas, erros restantes, tema |
  | Palavras cruzadas | a palavra selecionada | a dica, o tamanho e as letras já digitadas |
  | Caça-palavras | o jogo todo | palavras já achadas; pode dar a região e a direção aproximadas de uma palavra |
  | Complete as Frases | a frase da última lacuna mexida | como a frase está agora e o banco de palavras |
- **Sem dar a resposta, em duas camadas:**
  1. as regras do pedido ao modelo (nunca dizer a resposta, não soletrar, não dizer letras nem a alternativa, não
     eliminar alternativas, recusar com gentileza quando o aluno pede a resposta, ignorar instruções escritas pelo aluno);
  2. o servidor **confere o texto** antes de mandar: se aparecer a resposta (inteira, sem acento, soletrada "R-E-D-E",
     "alternativa B", "letra b"…), pede outra pista uma vez e, se insistir, troca por uma pista genérica. Na forca e nas
     cruzadas vale para **todas** as palavras do jogo. Esses casos ficam marcados para o instrutor.
- **Ajuda e pontuação:** a nota (pontos) **não muda**. No **desempenho** do nível adaptativo, cada pedido de ajuda naquele
  jogo desconta **3 pontos, até 15** (`ADAPTIVE_PARAMS.hintPenalty` / `maxHintPenalty`). O servidor conta os pedidos
  pelo banco; o navegador não informa nada.
- **Instrutor:**
  - **Visualizar como aluno** tem o mesmo botão para testar o tutor (nada é gravado).
  - **🎯 Níveis dos alunos → aluno**: coluna **Ajudas** nas partidas e a seção **💡 Conversas com o tutor** (quando, atividade,
    jogo, pergunta, o que o aluno escreveu e a resposta do tutor).
- **Segurança:** a chave fica no servidor; o aluno só pede ajuda em jogo de atividade publicada para a turma dele, ainda não
  concluído; o servidor usa a configuração do nível do aluno e monta o histórico da conversa pelo banco (o navegador manda
  só o item, a situação em texto curto e a mensagem, até 300 caracteres). Resposta da IA limitada a ~70 palavras.

API:

    GET  /api/student/tutor                       {enabled, idleSeconds}                                   (aluno)
    POST /api/student/activities/:id/tutor        {blockId, item, state?, trigger: button|idle|message, message?} -> {reply, label, hints}
    POST /api/ai/tutor                            {gameType, config, item, state?, trigger, message?, history?} -> {reply, label}  (instrutor, pré-visualização)
    GET  /api/ai/status                           agora inclui tutor: {enabled, idleSeconds}
    GET  /api/levels/students/:id                 agora inclui tutor: [...] (conversas do aluno)

## Checklist manual do tutor IA

1. Rodar a migração acima, conferir `AI_API_KEY` no `apps/api/.env` e reiniciar a API. (Para testar a oferta rápido, use
   `AI_TUTOR_IDLE_SECONDS=10`.)
2. Como instrutor: abrir uma atividade com Quiz e Forca → **Visualizar como aluno** → **Começar** o quiz → **💡 Pedir ajuda**:
   o tutor explica a pergunta sem dizer a alternativa. Clicar em **Outra dica**.
3. Publicar para uma turma. Como aluno: abrir a atividade, **Começar** o quiz, **Pedir ajuda**, escrever “me fala a resposta”
   → o tutor recusa com gentileza e dá outra pista.
4. Responder a pergunta → o painel fecha; na pergunta seguinte o botão volta como “Pedir ajuda” (conversa nova).
5. Na forca, **Começar** e ficar parado → depois do tempo configurado aparece “Quer uma dica?”; **Quero uma dica** abre o painel.
   Digitar no campo do tutor não chuta letras na forca.
6. Terminar o quiz → o desempenho vem com o desconto das ajudas (a nota em pontos é a mesma).
7. Instrutor → **🎯 Níveis dos alunos** → o aluno → coluna **Ajudas** e **💡 Conversas com o tutor**.
8. `AI_TUTOR_ENABLED=false` e reiniciar a API → o botão some dos jogos.

## Jogo novo: Office (primeiro teste)

Office é o jogo de estágio: o aluno vira o **ESTAGIÁRIO** de uma empresa virtual e cumpre tarefas ligadas às aulas
(ex.: aula "o que é um computador" → identificar e etiquetar os computadores dos departamentos). Este primeiro teste
entrega o **mapa do escritório** e o **personagem andando com colisão**; as tarefas entram nas próximas fases.

- **Sem migração** (não mexe no banco), mas precisa de **`npm install`** (pacote novo `@playground/office` + Phaser).
- Instrutor → barra lateral → **🏢 Office (teste)**. Ou, sem API e sem login: `npm run dev:office` → http://localhost:5174
- Controles: setas ou **W A S D** para andar, **Shift** corre, **M** visão geral do escritório, **C** mostra as colisões
  (paredes em vermelho, móveis em azul, salas em amarelo). Em tela de toque aparecem setas na tela.
- O nome da sala aparece ao entrar e fica no selo acima do jogo. O mapa tem 48 × 35 tiles: o prédio e, embaixo, a calçada e a rua.

### Por que Phaser

| Opção | Prós | Contras |
| --- | --- | --- |
| **Phaser 4** (escolhido) | Motor 2D completo: tilemaps (com suporte ao editor Tiled), física Arcade para colisão, câmera que segue, animações por sprite sheet, teclado/toque. Roda num `<canvas>` dentro de um componente React, então entra no app como os outros jogos. TypeScript nativo. | ~370 KB gzip; por isso só é baixado quando a página do Office abre (`React.lazy`). |
| PixiJS | Renderização rápida e leve | Só desenha: colisão, câmera, tilemap e input teriam de ser feitos à mão. |
| Kaplay (Kaboom) | API simples | Menos maduro para mapas grandes e Tiled; tipagem mais fraca. |
| React/DOM puro | Nenhuma dependência | Movimento a 60 fps, colisão e câmera ficam frágeis e lentos com muitos objetos. |

Como conversa com o resto do sistema: o jogo emite eventos (`office:room` etc.) e o React mostra a interface (sala atual,
botões). As tarefas das próximas fases seguem o mesmo caminho: o Phaser avisa "o aluno interagiu com o computador X" e o
React abre a tarefa, e a nota vai para a API como nos outros jogos.

### Como está organizado

    packages/office/
      src/OfficeGame.tsx         componente React (monta/destroi o Phaser, HUD, setas de toque, fluxo da missão)
      src/mission/               textos das missões, diálogo, balão Sim/Não, modal "PC do chefe" (MinigameOverlay),
                                 computadores da missão 2 (pcs.ts: modelos e regras) e o PC na mesa (PcModal.tsx)
                                 montagem da missão 3 (montagem.ts: peças, cabos e regras; MontagemModal.tsx;
                                 Conectores.tsx: pontas e entradas USB, VGA, HDMI, RJ45, P2 e força) e o quadro
                                 branco da missão 4 (QuadroOverlay.tsx) e o tablet da missão 5 (TabletOverlay.tsx);
                                 missão 6: regras de desligar (desligar.ts), telas dos sistemas (sistemas/: Windows XP,
                                 7, 10, 11, Ubuntu e Mint), painel do alarme (AlarmPanel.tsx), sirene (sirene.ts) e o
                                 resumo do dia (DaySummary.tsx); fase 2, missão 1: tipos de computador e conferência
                                 (levantamento.ts) e o modal com a prancheta e os adesivos (LevantamentoModal.tsx);
                                 missão 3: as placas escondidas e a entrega (placas.ts) e a placa em destaque
                                 (PlacaDestaque.tsx); missão 4: a forca do tablet do Marcos (forca.ts: partida
                                 resolvida, volume da música e relógio; RelogioPassando.tsx; musiquinha.ts: o
                                 barulho e a música) no mesmo modal de tablet da missão 5; missão 5: o celular
                                 com a conversa e o quiz (CelularOverlay.tsx) e a nota mínima (exercicio.ts);
                                 fase 3, missão 1: as peças, a lista e a conferência (pecas.ts) e a peça na mão
                                 com o adesivo, ao lado da lista (PecaNaMao.tsx)
      src/game/OfficeScene.ts    cena: tilemap, móveis, colegas, ESTAGIÁRIO, câmera, colisão, porta automática, CEO
      src/game/map.ts            salas, colisões e regras do mapa (sem Phaser, testado com vitest)
      src/game/office-map.json   grade 48×32 tiles + posição de cada móvel (gerado)
      src/assets/                tiles.png, moveis.png/.json (atlas), estagiario.png, equipamentos/ (imagens grandes
                                 dos computadores do levantamento), placas/ (Arduino e Raspberry Pi em destaque),
                                 pecas/ (peças de hardware grandes e etiquetas.json: onde fica o adesivo de cada uma)
      scripts/gerar-arte.py      desenha toda a arte e o mapa (Python 3 + Pillow)
      tests/map.test.ts          todas as salas alcançáveis andando, sem sair do prédio, móveis dentro do mapa
      tests/missao2.test.ts      mesas, lugares na reunião e caminhos dos colegas
      tests/pcs.test.ts          regras de ligar gabinete/monitor e da tela (sem sinal → iniciando → login)
      tests/missao3.test.ts      mesas novas e caixas no RH/Financeiro, caminhos da Rita
      tests/montagem.test.ts     peças no lugar, encaixes por formato, VGA × HDMI, conferência da Rita
      tests/missao4.test.ts      quadro branco, caminho do Bruno e o jogo de frases de exemplo
      tests/missao5.test.ts      conversa e cantinho na Copa, caminho da Elisa e o quiz de exemplo
      tests/missao6.test.ts      PCs ligados por sistema, armadilhas (reiniciar/suspender/sair), alarme e resumo do dia
      tests/levantamento.test.ts equipamentos em todos os setores e alcançáveis, prancheta, conferência e correção
      tests/missao-f2m2.test.ts  colegas em volta do quadro, frente do quadro livre e o caça-palavras de exemplo
      tests/placas.test.ts       10 placas nos móveis com lupa, móveis alcançáveis, onde as placas caem e a entrega
      tests/missao-f2m4.test.ts  forca de exemplo, partida resolvida, relógio, volume, onde o tablet cai e a fuga da sala
      tests/missao-f2m5.test.ts  quiz de exemplo do exercício surpresa, nota mínima de 70% e as mensagens
      tests/fim-dia2.test.ts     dispensa do chefe, saída para a calçada e o resumo das 5 missões do 2º dia
      tests/pecas.test.ts        lista com 8 peças e as parecidas (desenho próprio), adesivos, onde as peças caem e a conferência
      tests/missao-f3m2.test.ts  cruzadas de exemplo da Rita, a corrida do RH até a porta da Copa, bebedouro e o canto da Rita
      tests/montar-pc.test.ts    pedidos dos 3 computadores, ordem de encaixe, cabos de energia e SATA, ligar e as caixas na TI
      tests/missao-f3m4.test.ts  quiz de exemplo da reunião de alinhamento, caminho do chefe e a cadeira da mesa de reunião
      tests/missao-f3m5.test.ts  mictórios do banheiro, tempo da corrida saindo da Sala de Reuniões e o caça-palavras de exemplo

- **Arte própria.** Tudo é pixel art desenhada pelo `scripts/gerar-arte.py` (tiles de 32 px, 1 pixel de arte = 2 px).
  As imagens de referência (planta do escritório e folhas de personagens) serviram só de inspiração para a disposição
  das salas e para o formato da animação; nada delas foi copiado.
- **ESTAGIÁRIO:** camisa verde, cabelo castanho; folha 6 × 4 (baixo, esquerda, direita, cima), 6 quadros por direção,
  quadros de 36 × 64 px.
- **Colisão pelos pés:** o corpo do personagem é um retângulo de 20 × 10 px nos sapatos e cada móvel colide só pela
  base. A profundidade é pela posição dos pés, então ele passa **atrás** da parte alta das mesas e estantes.
- **Salas:** Diretoria, Sala de Reuniões, RH, Financeiro, Impressão e Almoxarifado, Copa, Sala de TI, Arquivo,
  Banheiro, Área de Trabalho e Recepção (o resto é Corredor). O Banheiro (fase 3) ocupa a metade direita do antigo
  Arquivo, com porta no corredor do meio; o Arquivo passou a ter a porta pelo lado da Recepção.
- **Mudar o mapa ou a arte:** edite `scripts/gerar-arte.py` (função `build_grid` para paredes/pisos, bloco
  "posicionamento" para móveis) e rode `python3 packages/office/scripts/gerar-arte.py`. Depois `npm test -w @playground/office`.
  Quando o mapa crescer, dá para trocar o gerador pelo editor **Tiled** sem mexer no jogo (o Phaser lê o JSON do Tiled).

### Primeira missão: ajudar o CEO (100 XP)

1. O ESTAGIÁRIO começa **na calçada**, em frente à empresa. A porta de vidro **abre sozinha** quando ele chega perto
   (e fecha quando ele se afasta).
2. Na **Diretoria**, o CEO está frustrado, com **fumaça saindo da cabeça** e um **"!"** em cima, perdendo no jogo do computador.
3. Ao chegar perto da mesa dele, abre o **diálogo**: *"Opa, desculpa, não vi você aí! É que estou quebrando a cabeça…"*
4. Um **balão em cima do ESTAGIÁRIO** pergunta se ele quer ajudar (Sim / Não; teclas **S** e **N** também valem).
   - **Não:** o CEO responde e a missão continua disponível (ele puxa conversa de novo quando você voltar).
   - **Sim:** abre um **modal com o monitor do PC do chefe**: área de trabalho, janela do jogo, barra de tarefas com
     relógio e LED aceso, como se o ESTAGIÁRIO estivesse usando o computador dele. As palavras-cruzadas rodam dentro da
     janela. O botão **⛶ Tela cheia** usa a tela inteira (Esc ou **Sair da tela cheia** volta); **✕ Desistir** volta ao
     escritório sem concluir.
5. Terminando as cruzadas → **Voltar ao escritório**: o CEO **comemora pulando, com confete**, dá os parabéns e o
   ESTAGIÁRIO ganha **+100 XP** (selo ⭐ no topo). O objetivo da missão fica como concluído.

- **Qual jogo de cruzadas:** na página do instrutor há a lista **"Palavras-cruzadas do CEO"** com as cruzadas salvas em
  **Meus jogos**; a primeira já vem escolhida. Sem cruzadas salvas (ou na página de teste `npm run dev:office`), usa um
  jogo de exemplo sobre as partes do computador (`packages/office/src/game/cruzadas-padrao.json`).
- **XP:** por enquanto fica só na tela (recarregar a página zera). O componente já avisa cada resultado por
  `onMissionComplete({ missionId, xp, success, game })`, que é onde a próxima etapa grava o XP do aluno na API.
- Textos da missão em `packages/office/src/mission/missoes.ts`.

### Segunda missão: ligar os computadores (+100 XP ou −100 XP)

1. Depois da comemoração, o CEO passa a missão 2: a equipe vai para a **Sala de Reuniões** e o ESTAGIÁRIO tem
   **3 minutos** (relógio ⏱ no topo, fica vermelho nos últimos 30 s) para ligar os 6 computadores da **Área de Trabalho**.
   Os colegas levantam (a cadeira fica vazia) e andam até a sala de reuniões desviando dos móveis.
2. Chegando na frente de uma mesa abre o **PC na mesa** em pixel art. O cursor vira um **dedo indicador** e o aluno clica
   nos botões. Não há destaque ao passar o mouse: ele precisa observar. Cada clique explica o que é a peça (DVD, USB,
   ventoinha, menu do monitor, reset, teclado…), e clicar de novo num botão de ligar **desliga**.
3. A tela mostra o resultado: **preta** (monitor desligado), **"Sem sinal"** (monitor ligado, gabinete desligado),
   **Iniciando…** com barra e, por fim, a **tela de login** com o nome do colega, que é a prova de que está tudo certo.
   O LED do monitor fica laranja sem sinal e verde com sinal; o do gabinete acende quando ele liga.
4. **Colocar placa LIBERADO** põe a placa na mesa (aparece no mapa e a mesa não abre mais). **Sair sem placa** (ou Esc)
   guarda o que foi feito e dá para voltar depois.
5. Quando o tempo acaba (ou logo depois da 6ª placa), a equipe volta e senta.
   - **Tudo certo:** o CEO comemora e o ESTAGIÁRIO ganha **+100 XP**.
   - **Algum errado:** o colega fica bravo; o primeiro levanta e vai reclamar com o CEO, que volta a soltar fumaça e
     chama: *"ESTAGIÁRIO! Venha até a minha sala, AGORA!"*. Na Diretoria vem a **bronca (−100 XP**, sem ficar negativo)
     e, para cada computador errado, o que ficou errado e onde fica o botão. Depois o chefe dá **mais uma chance**: tudo
     volta desligado e a rodada recomeça.
   - "Certo" = gabinete **e** monitor ligados. A placa é a confirmação do aluno: placa em computador errado conta como
     erro; computador certo sem placa não deixa o colega bravo.

Os 6 computadores (um por mesa, em `packages/office/src/mission/pcs.ts`):

| Estação | Computador | Onde liga (o "pega") |
| --- | --- | --- |
| 1 · Ana | gabinete torre + monitor | botão redondo grande ⏻; monitor no canto de baixo (o mais fácil) |
| 2 · Bruno | gabinete gamer + monitor | botão no **teto** do gabinete (a frente só tem ventoinhas e um botão de luz); monitor é o **último** de 5 botõezinhos embaixo da borda |
| 3 · Carla | gabinete horizontal (desktop) + monitor | botão **quadrado** à direita (o redondo é reset); monitor com botão na **lateral** |
| 4 · Diego | tudo-em-um | um botão só, na **lateral esquerda**; liga computador e tela juntos |
| 5 · Elisa | mini PC + monitor | **pontinho** em cima da caixinha; monitor com botão de toque quase invisível no canto |
| 6 · Fábio | gabinete de escritório + monitor | dois botões iguais: o de cima é **reiniciar** (↻), o de ligar é o de baixo (⏻); monitor no **meio** da borda |

- **Tempo:** `<OfficeGame missionTime={180} />` (segundos). Na página de teste: `http://localhost:5174/?tempo=60`.

### Terceira missão: montar os computadores novos (+100 XP ou −100 XP)

1. Depois da missão 2, o CEO avisa que a **Rita, do RH**, está chamando. Ela sai da **Copa** e vai até o **RH**.
2. Ao entrar no RH, a Rita explica: chegaram dois computadores, **um no RH (caixa 1) e outro no Financeiro (caixa 2)**;
   o monitor do RH vem com cabo **VGA** e o do Financeiro com cabo **HDMI**. Depois ela volta para a Copa tomar café.
3. Chegando perto de uma caixa abre a montagem, em duas partes:
   - **Mesa:** à esquerda a mesa vazia, à direita a caixa no estilo **mochila de RPG** (quadrados com monitor, gabinete,
     webcam, caixas de som, teclado e mouse). Arrastar cada peça até o lugar dela (ou clicar na peça e depois no lugar).
     Ao arrastar aparecem os lugares tracejados. Lugar errado → a peça volta com uma dica; webcam só depois do monitor.
   - **Parte de trás:** a traseira do gabinete com as entradas em pixel art (4 USB, VGA, HDMI, RJ45, P2 azul/verde/rosa e
     a entrada de força) e os cabos pendurados da mesa. Clicar num cabo mostra **a ponta dele de perto**, para comparar com
     as entradas; arrastar a ponta (ou clicar na entrada). **Formato diferente não encaixa** ("Não encaixa! Compare…").
     Formato igual encaixa, mesmo na entrada errada: é o caso dos P2 (som na rosa, microfone na verde), e o plugue fica
     menor que o anel da entrada para dar para ver as duas cores.
4. **Concluir montagem** nos dois → a Rita volta, passa em cada mesa (RH e Financeiro) e confere:
   - **Tudo certo:** parabéns e **+100 XP**.
   - **Algo errado:** **−100 XP** (sem ficar negativo), a explicação de cada erro e "corrija e conclua de novo"; ela espera
     no RH e confere de novo quando você concluir.
- O progresso de cada caixa fica guardado: dá para sair (**Sair e continuar depois** / Esc) e voltar.
- Na mesa do mapa: a caixa fica aberta quando você começa e o computador aparece montado na mesa quando todas as peças
  estão no lugar.
- **Para testar:** `http://localhost:5174/?missao=3` começa direto na missão 3 (ou `?missao=2`, `?missao=4`, `?missao=5`, `?missao=6`). No
  componente: `<OfficeGame startAt={3} />`.

### Quarta missão: arrumar as frases do quadro branco (100 XP)

1. Depois da missão 3, o **Bruno** (estação 2) levanta, vai até o **quadro branco da Sala de Reuniões** e esbarra nele:
   o quadro balança, os **cards das frases caem no chão** e aparece "CRASH! Alguma coisa caiu na Sala de Reuniões…".
2. Ele chama: *"ESTAGIÁRIO! Você pode vir aqui na Sala de Reuniões, por favor?"* e fica esperando no quadro com um "!".
3. Na sala, o Bruno explica que não entende muito de informática e que o estagiário, que está fazendo o curso, pode ajudar.
   Um **balão em cima do ESTAGIÁRIO** pergunta se ele vai ajudar (Sim / Não).
   - **Não:** o Bruno responde e pergunta de novo quando o ESTAGIÁRIO sair e voltar para a sala.
   - **Sim:** abre o modal **em forma de quadro branco** (moldura de alumínio, ímãs, bandeja com canetas e apagador) com o
     **Complete as Frases** da biblioteca. **⛶ Tela cheia** e **✕ Desistir** como no PC do chefe.
4. Enviando as respostas → **Voltar para a reunião**: os cards voltam para o quadro no mapa, o Bruno agradece, o
   ESTAGIÁRIO ganha **+100 XP** e o Bruno volta para a mesa.

- **Qual jogo:** na página do instrutor, a lista **"Frases do quadro branco (Complete as Frases)"** mostra os jogos desse
  tipo em **Meus jogos**. Sem nenhum salvo, usa um exemplo sobre informática básica
  (`packages/office/src/game/frases-padrao.json`).

### Quinta missão: a "ajudinha" na prova do tablet (100 XP)

1. Depois da missão 4, a **Elisa** (estação 5) vai até a **Copa** e conversa com a **Rita** (balõezinhos "…" alternando).
   A câmera mostra a cena: a Rita conta que o estagiário novo montou os computadores sozinho, e a Elisa decide
   "se aproveitar" um pouco, porque está fazendo uma prova de informática no tablet.
2. A câmera volta para o ESTAGIÁRIO, a Elisa vai para o **cantinho da Copa** (perto da porta, longe da Rita) com o
   **tablet na mão** e um "!", e chama discretamente: *"Psiu! Estagiário! Vem aqui na Copa, no cantinho…"*.
3. Na Copa, ela mostra o tablet e pede ajuda. **Balão em cima do ESTAGIÁRIO**: vai ajudar? (Sim / Não)
   - **Não:** ela fica no cantinho e pergunta de novo quando o ESTAGIÁRIO sair e voltar para a Copa.
   - **Sim:** abre o modal **em forma de tablet** (moldura em pixel art, câmera, barra com relógio, Wi-Fi e bateria, e
     as mãos da Elisa segurando) com o **Quiz** da biblioteca. **⛶ Tela cheia** e **✕ Desistir** como nos outros.
4. **Devolver o tablet**:
   - com alguma resposta errada, ela diz quantas acertou e pede para tentar de novo (balão Sim/Não outra vez, sem perder
     XP);
   - com **todas certas**, ela comemora, corre até o ESTAGIÁRIO e os dois se **abraçam pulando**, com corações e
     confete (a câmera chega mais perto); o ESTAGIÁRIO ganha **+100 XP** e a Elisa volta para a mesa.

- **Qual jogo:** na página do instrutor, a lista **"Prova da Elisa no tablet (Quiz)"** mostra os quizzes de
  **Meus jogos**. Sem nenhum salvo, usa um exemplo com 6 perguntas de informática básica
  (`packages/office/src/game/quiz-padrao.json`).
- A Elisa agora tem cabelo comprido (no mapa, andando e no retrato do diálogo).

### Sexta missão: fechar a empresa (+100 XP ou −100 XP) e fim do 1º dia

1. Depois da missão 5, o **expediente acaba**: o escritório escurece e os colegas, a Rita, a recepção e o pessoal da TI
   levantam e saem pela porta principal. O **CEO chama** o ESTAGIÁRIO na Diretoria.
2. O CEO pede para conferir as salas, **desligar os computadores que ficaram ligados** e, no fim, fechar a porta e
   **ativar o alarme** no painel ao lado da porta principal. Ele conta a senha (**2468**) e também vai embora.
3. Um PC ligado se reconhece pelo **brilho azul da tela** no escuro. Chegando perto, abre o monitor com a área de
   trabalho do sistema daquele PC (6 PCs, um de cada):

   | Onde | Sistema | Como desligar |
   |---|---|---|
   | Estação 1 (Ana) | Windows 10 | Iniciar → botão Energia → Desligar |
   | Estação 3 (Carla) | Windows 7 | Iniciar (orbe) → Desligar |
   | Estação 5 (Elisa) | Windows 11 | Iniciar → botão Energia → Desligar |
   | RH (mesa nova) | Ubuntu | menu do sistema (canto direito) → Energia → Desligar… → Desligar |
   | Financeiro (mesa nova) | Linux Mint | Menu → Desligar → Desligar |
   | Sala de TI | Windows XP | iniciar → Desligar o computador → Desativar |

   **Armadilhas:** **Reiniciar** desliga e liga de novo; **Suspender / Em espera** apaga a tela mas a luz de energia
   fica piscando (continua ligado); **Sair / Fazer logoff / Bloquear** volta para a tela de login (continua ligado).
   Na tela de login também dá para desligar pelo botão de energia. **💡 Dica** mostra o caminho de cada sistema.
4. No painel do alarme: senha errada → "SENHA INCORRETA"; **2468 + ATIVAR** → "ALARME ATIVADO". Saindo pela porta, ela
   tranca:
   - com **algum PC ainda ligado** (inclusive suspenso ou na tela de login), o **alarme dispara** (sirene e tela
     vermelha), o ESTAGIÁRIO perde **−100 XP**, o CEO liga e diz quais PCs ficaram ligados e por quê; a porta destranca
     para ele voltar, desligar e ativar o alarme de novo;
   - com **tudo desligado**, o ESTAGIÁRIO **comemora na calçada** (pulando de braços para cima, com confete), ganha
     **+100 XP**, e aparece o **resumo do dia**.
5. **Fim do 1º dia de estágio / Fase 1 concluída:** tabela com cada missão (XP ganho, XP perdido e o motivo de cada
   perda), o total do dia e estrelas (3 sem nenhuma perda, 2 com até duas, 1 com mais). Botões **↺ Jogar o dia de novo**
   e **Continuar explorando**.

- **Para testar:** `?missao=6` começa no fim do expediente. `?sistema=xp` (ou `win7`, `win10`, `win11`, `ubuntu`,
  `mint`) abre só a tela daquele sistema, para treinar. No componente: `<OfficeGame startAt={6} onDayComplete={...} />`.
- Nada muda no banco: não precisa de migração.

## Office · Fase 2 (2º dia): o que é um computador e os tipos de computadores

No resumo do fim do 1º dia, **Começar o 2º dia ▶** abre a fase 2, levando o XP do primeiro dia. Para testar direto:
`http://localhost:5174/?fase=2` (começa com 600 XP, como se a fase 1 tivesse saído sem erro). No componente:
`<OfficeGame fase={2} />`.

### Missão 1: levantamento dos computadores (+100 XP ou −100 XP)

1. O ESTAGIÁRIO chega pela calçada e o **CEO chama**. Na Diretoria, a aula: computador é toda máquina que recebe dados
   (entrada), processa, guarda e mostra o resultado (saída), e existe de vários tamanhos. A tarefa: passar em todos os
   setores, achar os computadores, **marcar um traço | na prancheta** no tipo de cada um e **colar o adesivo** do tipo.
   O CEO entrega a prancheta e a cartela de adesivos.
2. O **Marcos** (encarregado da TI) levanta e fica esperando no canto da Sala de TI, com um "!".
3. São **24 equipamentos**, em todos os setores:

   | Tipo | Quantos | Onde |
   |---|---|---|
   | Desktop | 11 | 6 estações da Área de Trabalho (2 são tudo-em-um), mesa do CEO, balcão da Recepção, mesas novas do RH e do Financeiro (montadas na missão 3), mesa do Marcos |
   | Notebook | 4 | 2 na mesa de reunião, mesinha do RH, mesinha do Financeiro |
   | Servidor | 3 | os 3 racks da Sala de TI |
   | Mainframe | 1 | os dois armários grandes da Sala de TI (novo no mapa) |
   | Tablet | 2 | mesinha da Copa (o da prova da Elisa) e no suporte em cima de um arquivo, no Arquivo |
   | Smartphone | 3 | mesa de reunião, em cima da copiadora, carregando na bancada da Copa |

4. Chegando na frente de um equipamento, abre o modal: **resumo** no alto (descreve o equipamento sem dizer o tipo),
   a **imagem** dele, a **cartela de adesivos** e a **prancheta na mão do ESTAGIÁRIO** (planilha com os 6 tipos e os
   traços, agrupados de 5 em 5).
   - Clicar num tipo da prancheta marca o traço deste equipamento (clicar em outro troca; no mesmo, apaga).
   - Arrastar um adesivo até a imagem cola o adesivo (clicar no adesivo e depois na imagem também funciona; Enter cola
     no meio). Arrastar o adesivo colado para fora descola.
   - **Pronto ✓** com traço e adesivo. O adesivo aparece no equipamento, no mapa. O objetivo mostra quantos já foram
     etiquetados, mas não quantos existem: achar todos faz parte da missão.
5. Perto do Marcos, o balão pergunta se quer **entregar a prancheta** (Sim/Não). Ele confere:
   - **tudo certo** (os 24, cada um com o traço e o adesivo do tipo certo) → **+100 XP**, missão concluída;
   - **com erro** → **−100 XP**. Ele diz quantos de cada tipo faltou achar e em que salas procurar, e para cada
     equipamento errado diz o que foi marcado/colado e explica o tipo certo. Depois tira os adesivos e apaga os traços
     dos errados, e o ESTAGIÁRIO corrige e entrega de novo.

- Arte nova no `gerar-arte.py`: notebooks, celulares e tablets desenhados em cima dos móveis, o mainframe, os adesivos no
  mapa e as imagens grandes de cada tipo (`src/assets/equipamentos/`). A Sala de TI foi rearrumada (a mesa do Marcos foi
  para a esquerda, o mainframe para a direita da porta).

### Missão 2: caça-palavras do quadro da reunião (+100 XP)

1. Depois do levantamento, o quadro branco da **Sala de Reuniões** aparece com um caça-palavras escrito. O **Bruno**, o
   **Diego** e o **Fábio** levantam e vão até o quadro; a câmera mostra os três conversando (eles não acham nada) e o
   Diego tem a ideia de chamar o ESTAGIÁRIO: *"ESTAGIÁRIO! Vem aqui na Sala de Reuniões…"* (com um "!" em cima dele).
2. Entrando na sala, o Diego explica e pede ajuda. **Balão em cima do ESTAGIÁRIO**: vai ajudar? (Sim / Não)
   - **Não:** ele responde e pergunta de novo quando o ESTAGIÁRIO sair e voltar para a sala.
   - **Sim:** "chega perto do quadro". Na frente do quadro abre o modal **em forma de quadro branco** (o mesmo da
     missão 4) com o **Caça-palavras** da biblioteca.
3. O jogo só termina com **todas as palavras achadas**. Se desistir antes (**✕ Desistir**), o Diego pede para tentar de
   novo (sem perder XP) e o quadro abre outra vez ao chegar perto.
4. Achou todas → **Voltar para a reunião**: os três colegas pulam de alegria, o ESTAGIÁRIO comemora com confete,
   **+100 XP**, e os colegas voltam para as mesas.

- **Qual jogo:** na página do instrutor, a lista **"Quadro da reunião, 2º dia (Caça-palavras)"** mostra os
  caça-palavras de **Meus jogos**. Sem nenhum salvo, usa um exemplo com 10 palavras da aula (computador, desktop,
  notebook, servidor, mainframe, tablet, smartphone, entrada, saída, processar):
  `packages/office/src/game/caca-palavras-padrao.json`.
- **Para testar:** `?fase=2&missao=2` começa direto nesta missão (o levantamento conta como feito). No componente:
  `<OfficeGame fase={2} startAt={2} wordSearch={...} />`.

### Missão 3: placas de desenvolvimento (+100 XP)

1. Depois do caça-palavras, o **Marcos** (TI) chama: *"ESTAGIÁRIO! Pode dar um pulo aqui na Sala de TI?"*, em pé no
   canto da sala, com um "!" em cima.
2. Na Sala de TI, a aula: placa de desenvolvimento é uma plaquinha com um chip programável para criar projetos; o
   **Arduino** (placa azul) tem um **microcontrolador** e roda um programa só; o **Raspberry Pi** (placa verde) é um
   **computador inteiro numa placa**, com sistema operacional. São **10 placas** escondidas pela empresa.
3. Aparecem **lupas** em cima de 11 móveis. Chegando na frente de um deles, o ESTAGIÁRIO procura: mexe nas coisas, um
   **cronômetro amarelo** esvazia em cima da cabeça dele (3 s) e a bagunça do armário (papéis, pastas, caixas, cabos,
   livros, grampeador) voa para o chão e some depois de uns segundos. A lupa daquele móvel some.
4. No fim da busca, as placas caem no chão **brilhando** (amarelo), perto dele mas não no pé: é preciso andar até elas.
   Dois móveis têm só bagunça ("nenhuma placa aqui").
5. Chegando na placa, ela aparece **grande, em destaque**, com o nome, o tipo (microcontrolador ou computador numa
   placa) e o que ela é; some sozinha (ou **Guardar ✓**) e o contador **🔌 N|10** no topo aumenta.
6. Com as 10, entregar ao Marcos → **+100 XP** e comemoração. Faltando alguma, ele diz quantas faltam e manda voltar a
   procurar (sem perder XP); se já procurou em todos os móveis, avisa que ficou placa no chão.

| Móvel com lupa | Sala | Placas |
| --- | --- | --- |
| Estante | Diretoria | Raspberry Pi 4 |
| Armário (novo) | Sala de Reuniões | Raspberry Pi Zero |
| Prateleira da esquerda | Impressão e Almoxarifado | nenhuma |
| Prateleira da direita | Impressão e Almoxarifado | Arduino Uno e Arduino Nano |
| Arquivo cinza | Impressão e Almoxarifado | Raspberry Pi Pico |
| Arquivo verde | Impressão e Almoxarifado | nenhuma |
| Bancada | Copa | Arduino Nano |
| 1º arquivo | Arquivo | Arduino Mega |
| 2º arquivo | Arquivo | Raspberry Pi Zero |
| Arquivo verde | Arquivo | Arduino Uno |
| Armário | Recepção | Raspberry Pi 4 |

- **Arte:** as placas no chão, as placas grandes (`src/assets/placas/`), a lupa, a bagunça e o armário de duas portas
  da Sala de Reuniões são desenhados pelo `scripts/gerar-arte.py`. O **Raspberry Pi Pico** é uma pegadinha de
  propósito: tem o nome Raspberry, mas é um microcontrolador, como o Arduino (o destaque explica).
- **Para testar:** `?fase=2&missao=3` começa direto nesta missão (o levantamento e o caça-palavras contam como feitos).
  No componente: `<OfficeGame fase={2} startAt={3} />`.

### Missão 4: a forca do tablet do Marcos (+100 XP)

1. Depois de entregar as placas, o **Marcos** diz que vai descansar jogando uma forca no tablet, volta para a cadeira
   e começa a jogar (tablet na mão). A câmera mostra a mesa dele e um **relógio no topo da tela** passa o tempo
   (14:05 → 14:40, *"Alguns minutos depois…"*).
2. Ele **cochila** (Zzz subindo) e o **tablet cai no chão** com um *PLAFT* (som e a tela treme). Fica no chão, ao lado
   da mesa, com **notas musicais** saindo: a **musiquinha do jogo** continua tocando (8 bits, sintetizada), mais alta
   quanto mais perto o ESTAGIÁRIO está.
3. A câmera volta para o ESTAGIÁRIO: *"Que barulho foi esse?…"*. Chegando no tablet: *"O Marcos dormiu jogando! … a
   forca ainda está aberta, sem resposta… Vou terminar essa partida para ele."* → abre o **modal do tablet** (o mesmo
   da prova da Elisa, agora com as mãos de manga verde do ESTAGIÁRIO) com a **Forca** da biblioteca.
4. **Acertou as 5 palavras** → o Marcos começa a acordar (*"Hã… que horas são…?"*), o ESTAGIÁRIO deixa o tablet em cima
   da mesa, a musiquinha para e ele **sai correndo da sala** → *"Ufa! Ele nem percebeu."* **+100 XP**.
5. Errou alguma palavra (ou **✕ Desistir**): sem perder XP; o tablet continua no chão e é só chegar perto de novo.

- **Qual jogo:** na página do instrutor, **"Tablet do Marcos, 2º dia (Forca)"** mostra as forcas de **Meus jogos**. Sem
  nenhuma salva, usa uma de exemplo com as palavras do dia (Arduino, Raspberry, servidor, mainframe, smartphone):
  `packages/office/src/game/forca-padrao.json`.
- **Arte e som:** tablet caído, Zzz e notas musicais no `scripts/gerar-arte.py`; o barulho e a musiquinha em
  `src/mission/musiquinha.ts` (Web Audio, sem arquivo de som).
- **Para testar:** `?fase=2&missao=4` começa direto nesta missão. No componente: `<OfficeGame fase={2} startAt={4} hangman={...} />`.

### Missão 5: exercício surpresa do curso, pelo WhatsApp (+100 XP)

1. Logo depois de sair correndo da Sala de TI, o **celular do ESTAGIÁRIO vibra** (ícone tremendo em cima da cabeça,
   zumbido e o "plim" da notificação): *"Opa, meu celular vibrou! Mensagem nova…"* → **Abrir o celular**.
2. Abre o **modal do celular na mão do ESTAGIÁRIO** (pixel art: palma e manga verde por trás, dedão e pontas dos dedos
   por cima da borda), numa conversa estilo WhatsApp com o **Lucas, do curso de informática básica**: as mensagens
   chegam uma a uma (*digitando…*) avisando que o professor mandou um **exercício surpresa** para entregar hoje, com o
   **link**.
3. O link abre o **Quiz** da biblioteca na tela do celular. No fim, **Enviar respostas** volta para a conversa com
   *"Pronto, respondi! Acertei X de Y."* e a resposta do Lucas.
4. **Êxito = pelo menos 70% de acertos** (5 de 6 no quiz de exemplo): *"Boa!! Mandou muito bem!"* → **Guardar o
   celular ✓** → **+100 XP**.
5. Abaixo de 70%: o Lucas diz quantas precisa acertar e o link continua lá para refazer, sem perder XP. Dá para guardar
   o celular e voltar depois pelo botão **📱 Celular**, no topo.

- **Qual jogo:** na página do instrutor, **"Exercício surpresa no celular, 2º dia (Quiz)"** mostra os quizzes de **Meus
  jogos** (de preferência um diferente da prova da Elisa). Sem nenhum salvo, usa um de exemplo sobre a aula do dia:
  `packages/office/src/game/quiz-surpresa-padrao.json`.
- **Para testar:** `?fase=2&missao=5` começa direto nesta missão. No componente:
  `<OfficeGame fase={2} startAt={5} surpriseQuiz={...} />`.

### Fim do 2º dia: dispensado

1. Depois do exercício surpresa, o **chefe chama** o ESTAGIÁRIO na Diretoria.
2. Na Diretoria, ele lembra o dia (levantamento, caça-palavras, as 10 placas… e *"o Marcos comentou que a forca do
   tablet dele apareceu resolvida. Curioso, né?"*) e diz que o ESTAGIÁRIO está **dispensado por hoje**.
3. Objetivo: *"Saia da empresa pela porta principal"*. Passando pela porta, ele vai até a calçada, **comemora** (pulo
   e confete): *"UHUUUL! Segundo dia de estágio concluído!"* → **Ver o resumo do dia**.
4. **Resumo do 2º dia**: as 5 missões da fase 2 com o XP ganho e perdido (broncas do levantamento aparecem com ⚠),
   estrelas, **XP de hoje** e **total acumulado** (com o XP do 1º dia). Botões: **↺ Jogar o 2º dia de novo** (volta ao
   começo da fase 2 com o XP do 1º dia) e **Continuar explorando**. A dispensa não vale XP.

- **Para testar:** `?fase=2&missao=6` começa direto na chamada do chefe (as 5 missões contam como feitas).
- No resumo do 2º dia, **Começar o 3º dia ▶** abre a fase 3 levando o XP acumulado.

## Office · Fase 3 (3º dia): hardware, as peças de dentro do computador

### Missão 1: as peças da lista do Marcos (+100 XP)

1. O 3º dia começa (*"Aula: hardware, as peças de dentro do computador"*) e o **Marcos** chama o ESTAGIÁRIO na Sala
   de TI. Em duas falas curtas, ele pede para trazer as peças **exatamente como estão na lista** e entrega a **lista
   com 8 peças**, cada uma com **desenho** e **referências** (marca e modelo, tipo e especificações), que abre na tela.
2. Os mesmos **móveis com lupa** da fase 2 têm as peças. Procurar usa a mesma animação das placas (cronômetro amarelo,
   bagunça voando) e **várias peças pulam e caem no chão** brilhando. Um dos móveis só tem bagunça.
3. Chegando perto de uma peça, abre o modal com a **peça na mão do ESTAGIÁRIO** e o **adesivo** colado nela (marca e
   modelo, tipo, especificações), ao lado da **lista do Marcos** na prancheta. O aluno compara o desenho e as
   referências e escolhe **🧰 Guardar na mochila** ou **✕ Deixar aqui** (a peça continua no chão para depois).
4. Há **6 peças parecidas** para confundir, cada uma com desenho próprio e outra referência: memória DDR3, memória
   de notebook, SSD SATA, HD de notebook, processador LGA e placa de vídeo de 2 GB.
5. A mochila leva **uma peça de cada tipo**. Pegando outra do mesmo tipo, o botão vira **⇄ Guardar e deixar a da
   mochila** (a antiga cai no chão). O contador **🧰 N|8** fica no topo, com o botão **📋 Lista** para rever a lista.
6. Com as 8, é voltar à Sala de TI. O Marcos confere: tudo certo → *"Muito obrigado pela ajuda!"* **+100 XP** e
   comemoração. Com alguma errada → **−50 XP** (aparece com ⚠ no resumo do dia), ele explica cada diferença
   (*"O SSD que você trouxe é SSD SATA 2,5"… O da lista é SSD M.2 NVMe…"*), fica com as certas e devolve as erradas;
   é procurar as que faltam e voltar. Antes de ter as 8, ele só diz quais tipos ainda faltam.

- **Arte:** as peças no chão e as 14 peças grandes (com o espaço do adesivo) são desenhadas pelo
  `scripts/gerar-arte.py`; as marcas são inventadas. O texto do adesivo é escrito pelo React em cima do desenho.
- **Para testar:** `?fase=3` começa direto no 3º dia. No componente: `<OfficeGame fase={3} />`.

### Missão 2: as palavras-cruzadas da Rita (+100 XP)

1. Desde o começo do 3º dia, a **Rita** está no RH fazendo palavras-cruzadas no tablet. Depois das peças, o
   ESTAGIÁRIO fica com sede: *"Vou até a Copa beber uma água."*
2. Ao entrar na Copa, aparece *"— ESTAGIÁRIO! Espera aí!"* e a Rita sai **correndo** do RH atrás dele. Ele **leva um
   susto** (vira, dá um pulinho e aparece o **!**), mas logo se acalma: ela só quer ajuda com as palavras-cruzadas.
3. Abre o balão **"Você vai ajudar a Rita com as palavras-cruzadas?"**. **Sim** → modal no formato do **tablet**, com as
   palavras-cruzadas da biblioteca na tela. **Não** → a Rita fica esperando na Copa, com o tablet e o **!**; é só
   chegar perto dela para ela perguntar de novo.
4. Completou as palavras-cruzadas → **Devolver o tablet** → *"Muito obrigada!"* **+100 XP**. A Rita volta para o RH e o
   ESTAGIÁRIO, enfim, bebe água no bebedouro.
5. **Desistir** no tablet não perde XP: a Rita diz que pode tentar de novo e fica esperando na Copa (refazer quantas
   vezes quiser).

- **Qual jogo:** na página do instrutor, **"Tablet da Rita, 3º dia (Palavras-cruzadas)"** mostra as palavras-cruzadas
  de **Meus jogos** (de preferência uma diferente da do CEO). Sem nenhuma salva, usa uma de exemplo com as peças do
  computador, a aula do dia: `packages/office/src/game/cruzadas-rita-padrao.json`.
- **Para testar:** `?fase=3&missao=2` começa direto nesta missão (a das peças conta como feita). No componente:
  `<OfficeGame fase={3} startAt={2} ritaCrossword={...} />`.

### Missão 3: os 3 computadores do Marcos (+100 XP)

1. Depois da água, o ESTAGIÁRIO sai rapidinho da Copa (*"antes que apareça mais alguma palavra-cruzada…"*). Logo o
   **Marcos** chama de novo na Sala de TI.
2. Lá, ele explica em três falas curtas e **3 caixas** aparecem no chão da sala, cada uma com um **!**: o computador do
   **estudante** (i3, 8 GB, HD 512 GB), o **gamer** (i7, 32 GB, SSD 512 GB, placa de vídeo, fonte 500 W, gabinete
   gamer) e o do **escritório** (i5, 16 GB, SSD 256 GB + HD 512 GB). Os três também levam placa-mãe, cooler e fonte
   (350 W e 400 W nos que não são gamer).
3. Chegando perto de uma caixa abre a **mesa de montagem**: a bancada com o monitor à esquerda e, à direita, a caixa em
   **quadradinhos** (estilo mochila) só com as peças daquele computador.
4. **Arrastar** cada peça até o lugar dela: primeiro o gabinete na mesa; depois a placa-mãe; o processador no soquete; o
   cooler em cima do processador; as memórias nos slots; a placa de vídeo no slot PCI Express; a fonte embaixo; o HD e
   o SSD nas baias da frente. Peça solta no lugar errado volta para a caixa, com uma dica de onde ela vai.
5. **Cabos:** cada porta aparece como uma bolinha colorida (com legenda). Arrastar de uma até a outra: energia da
   placa-mãe (24 pinos), energia SATA da fonte até o HD/SSD, dados SATA da placa-mãe até o HD/SSD e, no gamer, a
   energia da placa de vídeo. Cabo de outro tipo não encaixa, e aparece a explicação.
6. **⏻ Ligar o computador** (ou o botão do gabinete): faltando peça ou cabo, ele não liga e diz o que falta. Tudo certo
   → o LED acende e a **tela de inicialização** aparece no monitor → **Pronto ✓**. Fechar no meio guarda a montagem.
7. Os 3 ligados (contador **🖥️ N|3** no topo) → o Marcos vem até o ESTAGIÁRIO, **+100 XP**, e os dois comemoram
   pulando.

- **Arte:** a bancada, os gabinetes, as peças encaixadas e a tela de inicialização são camadas do tamanho da bancada
  desenhadas pelo `scripts/gerar-arte.py` (`src/assets/montar/`); os lugares e as portas ficam em `bancada.json`.
- **Para testar:** `?fase=3&missao=3` começa direto nesta missão (as duas anteriores contam como feitas). No
  componente: `<OfficeGame fase={3} startAt={3} />`.

### Missão 4: o quiz da reunião de alinhamento (+100 XP)

1. Depois dos 3 computadores, o **chefe** (CEO) levanta da Diretoria, vai até a ponta da mesa da **Sala de Reuniões**
   (com o **!**) e chama o ESTAGIÁRIO.
2. Lá, ele explica que o quiz vai ser passado na **reunião de alinhamento** de mais tarde e que precisam saber se o
   estagiário está com o nível esperado.
3. O ESTAGIÁRIO **senta** na cadeira da mesa de reunião (a mais perto do quadro) e abre o modal no formato de
   **notebook** com o **quiz da biblioteca**.
4. Ao terminar → **Entregar ao chefe** → o chefe comenta o resultado (*"7 de 8! Está no nível que a gente
   esperava"* a partir de 70%; abaixo disso, *"está no caminho certo"*), agradece e dá **+100 XP** de qualquer jeito.
   Depois volta para a Diretoria.
5. **✕ Desistir** no notebook: o ESTAGIÁRIO levanta e o chefe diz que o quiz fica aberto; é só voltar para a cadeira
   para sentar e responder de novo.

- **Qual jogo:** na página do instrutor, **"Reunião de alinhamento, 3º dia (Quiz)"** (de preferência um terceiro quiz,
  diferente da prova da Elisa e do exercício surpresa). Sem nenhum salvo, usa um de exemplo sobre a aula de hardware:
  `packages/office/src/game/quiz-alinhamento-padrao.json`.
- **Para testar:** `?fase=3&missao=4` começa direto nesta missão. No componente:
  `<OfficeGame fase={3} startAt={4} alignmentQuiz={...} />`.

### Missão 5: o caça-palavras do banheiro (+100 XP) e o fim do 3º dia

1. Depois do quiz, o ESTAGIÁRIO fica **agoniado**: aparece um balão com uma **gota** tremendo em cima da cabeça (toda
   aquela água da Copa…).
2. Um **relógio** (🚽 ⏱, no topo) começa a contar **25 segundos** para chegar a um dos **3 mictórios** do **Banheiro**
   (corredor do meio, à direita, depois do Arquivo; a plaquinha azul fica ao lado da porta). Andando dá tempo, mas fica
   apertado; segurando **Shift** sobra mais.
3. **Não deu tempo:** a calça fica molhada (mancha escura, até o fim do dia), aparece uma pocinha no chão e ele diz que
   vai terminar no mictório mesmo assim.
4. No mictório, ele olha as **palavras rabiscadas na parede** (CPU, RAM, BIT, SSD, USB), a câmera chega perto e ele
   começa a imaginar um caça-palavras.
5. Abre o **sonho**: a imagem entra **tremendo e embaçada** e mostra o **caça-palavras da biblioteca** numa nuvem.
6. **Acordar ▶** (achou todas) → ele acorda ainda de frente para o mictório, **+100 XP**. **✕ Desistir** → acorda sem
   XP e **não tem outra chance** (o dia segue).
7. Ao sair do banheiro: **fim do expediente**. Escurece, os colegas, a Rita, a recepcionista, o Marcos e o chefe vão
   embora. O ESTAGIÁRIO sai pela porta principal, **comemora** na calçada e aparece o **resumo do 3º dia**.

- **Qual jogo:** na página do instrutor, **"Sonho no banheiro, 3º dia (Caça-palavras)"** (de preferência um diferente
  do quadro da reunião do 2º dia). Sem nenhum salvo, usa um de exemplo com as peças do computador:
  `packages/office/src/game/caca-palavras-banheiro-padrao.json`.
- **Para testar:** `?fase=3&missao=5` começa direto nesta missão, saindo da Sala de Reuniões. No componente:
  `<OfficeGame fase={3} startAt={5} bathroomWordSearch={...} />`.

## Checklist manual do Office

1. `npm install` e `npm run dev:office` (ou entrar como instrutor → **🏢 Office (teste)**).
2. O ESTAGIÁRIO aparece na calçada; andar para cima → a porta de vidro abre e ele entra; se afastar → a porta fecha.
3. Andar contra paredes, mesas, estantes e vasos → para na base deles; passar por cima de uma mesa (andando para cima) → fica atrás dela.
4. Entrar em cada sala pelas portas → o nome aparece no jogo e no selo; no corredor o selo mostra "Corredor".
5. **M** → escritório inteiro na tela; **M** de novo volta a seguir o personagem. **C** liga/desliga as caixas de colisão.
6. Não dá para ir para a rua nem atravessar paredes.
7. Missão: ir até o CEO → diálogo → **Não** → sair e voltar → diálogo de novo → **Sim** → resolver as cruzadas →
   **⛶ Tela cheia** e Esc → entra e sai da tela cheia → **Voltar ao escritório** → CEO comemora, **⭐ 100 XP**, missão concluída. Chegar perto do CEO de novo não reabre a missão.
8. Missão 2 (dica: `?tempo=90` na página de teste): o CEO explica → os colegas vão para a Sala de Reuniões e o ⏱ começa.
   Ir até uma mesa da Área de Trabalho → abre o PC. Clicar no DVD → mensagem explicando; ligar só o monitor → "Sem sinal";
   ligar o gabinete → Iniciando… → tela de login → **Colocar placa LIBERADO** → placa aparece na mesa no mapa.
9. Numa mesa, ligar só o gabinete e colocar a placa; nas outras, tudo certo. Os colegas voltam, um fica bravo e vai até
   o CEO → "Venha até a minha sala" → ir à Diretoria → bronca, **−100 XP**, explicação de cada computador errado →
   **Tentar de novo** → equipe volta para a reunião e tudo começa desligado.
10. Ligar tudo certo → colegas sentam, CEO comemora, **+100 XP**, missão concluída.
11. Deixar o tempo acabar com o PC aberto → o modal fecha e a equipe volta.
12. Missão 3 (`?missao=3`): o CEO avisa → ir ao RH → a Rita explica e vai para a Copa.
13. Caixa do RH: arrastar o teclado para o lugar do mouse → volta com dica; webcam antes do monitor → "coloque o monitor
    primeiro"; montar tudo → **Ir para a parte de trás**.
14. Clicar no cabo do monitor → ponta VGA de perto; arrastar até a HDMI → "Não encaixa"; até a VGA → encaixa. Ligar o
    resto trocando os P2 (som na rosa, microfone na verde) → **Concluir montagem**.
15. Caixa do Financeiro: montar e ligar tudo certo (cabo HDMI) → **Concluir** → a Rita volta, confere as duas mesas →
    −100 XP e explica a troca dos P2 → abrir a caixa do RH, **Desconectar** e trocar → **Concluir** → +100 XP.
16. Missão 4 (`?missao=4`): o Bruno vai ao quadro, os cards caem, ele chama → ir à Sala de Reuniões → diálogo → balão
    **Não** → sair e voltar → pergunta de novo → **Sim** → quadro branco com as frases → **⛶ Tela cheia** e voltar →
    completar e enviar → **Voltar para a reunião** → cards de volta no quadro, **+100 XP**.
17. Missão 5 (`?missao=5`): a Elisa vai à Copa e conversa com a Rita (câmera na Copa) → vai para o cantinho com o
    tablet e chama → entrar na Copa → diálogo → balão **Não** → sair e voltar → **Sim** → tablet com o quiz →
    **⛶ Tela cheia** e voltar → errar uma pergunta → **Devolver o tablet** → "só 5 de 6 certas" → **Sim** de novo →
    acertar todas → abraço com corações, **+100 XP**, a Elisa volta para a mesa.
18. Missão 6 (`?missao=6`): os colegas saem, o escritório escurece, o CEO chama → ir à Diretoria → explicação e senha →
    andar pelas salas e achar as telas acesas → no XP, **Em espera** → tela apaga e a luz pisca (ainda ligado) → no
    Windows 10, **Reiniciar** → volta ligado → desligar todos menos um → alarme com senha errada → "SENHA INCORRETA" →
    **2468** → sair → alarme dispara, **−100 XP**, o CEO diz qual PC ficou ligado → voltar, desligar, ativar de novo →
    sair → comemoração na calçada, **+100 XP** → resumo do dia com as 6 missões, perdas e total → **Jogar o dia de novo**.
19. Fase 2 (`?fase=2`, ou **Começar o 2º dia** no resumo da fase 1): o CEO chama → Diretoria → aula e prancheta →
    o Marcos vai para o canto da Sala de TI → na mesa do Bruno, marcar Desktop e arrastar o adesivo → **Pronto** → o
    adesivo aparece no mapa → etiquetar quase tudo, mas trocar o tablet da Copa por Smartphone e deixar o mainframe →
    entregar ao Marcos → **−100 XP**, "Faltou achar 1 mainframe…" e a explicação do tablet → o adesivo errado some →
    corrigir e entregar de novo → **+100 XP**, missão concluída.
20. Fase 2, missão 2 (`?fase=2&missao=2`): o quadro aparece com letras, três colegas vão até ele e conversam (câmera
    na sala) → o Diego chama → entrar na Sala de Reuniões → explicação → balão **Não** → sair e voltar → **Sim** →
    chegar na frente do quadro → caça-palavras → **✕ Desistir** → "tenta de novo" → voltar ao quadro → achar todas →
    **Voltar para a reunião** → todos comemoram, **+100 XP**, os colegas voltam para as mesas.
21. Fase 2, missão 3 (`?fase=2&missao=3`): o Marcos chama → Sala de TI → aula do Arduino e do Raspberry Pi → lupas em
    cima dos móveis → entregar sem nada → "ainda não achou nenhuma" → na estante da Diretoria: animação, cronômetro
    amarelo, bagunça voando e a placa caindo com brilho → andar até ela → Raspberry Pi 4 em destaque → some e o contador
    vai para **🔌 1|10** → prateleira da esquerda: só bagunça → achar 9 e entregar → "falta 1" → pegar a última →
    entregar → **+100 XP** e comemoração.
22. Fase 2, missão 4 (`?fase=2&missao=4`): o Marcos vai descansar → senta com o tablet → relógio no topo passando
    o tempo → Zzz → tablet cai (PLAFT, tela treme) e a musiquinha toca → *"Que barulho foi esse?"* → andar para longe
    (a música baixa) e voltar → chegar no tablet → forca no tablet → errar uma palavra → **Pronto** → "acertei 4 de 5",
    sem perder XP → chegar no tablet de novo → acertar todas → o Marcos acorda, o tablet vai para a mesa, a música para
    e o ESTAGIÁRIO sai correndo da sala → **+100 XP**.
23. Fase 2, missão 5 (`?fase=2&missao=5`, ou seguindo depois da missão 4): o celular vibra em cima da cabeça →
    **Abrir o celular** → mensagens chegando com *digitando…* → tocar no link → quiz na tela do celular → errar 3 →
    **Enviar respostas** → "acertei 3 de 6" e o Lucas pede 5 → **✕ Guardar o celular** → botão **📱 Celular** no topo →
    link de novo → acertar tudo → "Mandou muito bem!" → **Guardar o celular ✓** → **+100 XP**.
24. Fim do 2º dia (`?fase=2&missao=6`, ou seguindo depois da missão 5): o chefe chama → Diretoria → elogio e
    "dispensado por hoje" → sair pela porta principal → caminha até a calçada e comemora → **Ver o resumo do dia** →
    resumo com as 5 missões, XP de hoje e total acumulado → **Jogar o 2º dia de novo** recomeça a fase 2.
25. Fase 3, missão 1 (`?fase=3`, ou **Começar o 3º dia** no resumo do 2º): o Marcos chama → Sala de TI → duas falas
    curtas e a lista abre → fechar → **📋 Lista** no topo abre de novo → estante da Diretoria: 2 peças caem → pegar o
    processador → adesivo e lista lado a lado → **Guardar** (🧰 1|8) → memória DDR3 → **Guardar** → na bancada da Copa,
    a memória certa → **Guardar e deixar a da mochila** (a DDR3 cai no chão) → no armário da Sala de Reuniões, o SSD
    SATA → **Guardar** → pegar as outras (🧰 8|8) → Sala de TI → o Marcos explica o SSD errado, **−50 XP**, 🧰 7|8 →
    pegar o SSD M.2 no armário da Recepção → entregar → **+100 XP** e comemoração.
26. Fase 3, missão 2 (`?fase=3&missao=2`, ou seguindo depois das peças): "bateu uma sede" → ir até a Copa → a Rita
    vem correndo do RH, o ESTAGIÁRIO se assusta (pulinho e **!**) → conversa → balão: **Não** → a Rita fica na Copa
    com o tablet e o **!** → chegar perto dela → **Sim** → tablet com as palavras-cruzadas → **Começar** → **✕
    Desistir** → ela diz que pode tentar de novo → chegar perto → **Sim** → completar → **Devolver o tablet** →
    **+100 XP**, a Rita volta para o RH e o ESTAGIÁRIO bebe água.
27. Fase 3, missão 3 (`?fase=3&missao=3`, ou seguindo depois da água): o ESTAGIÁRIO sai da Copa → o Marcos chama →
    Sala de TI → 3 caixas aparecem → caixa do estudante → arrastar a placa-mãe antes do gabinete (*"Primeiro coloque o
    gabinete…"*) → gabinete → placa-mãe → processador na fonte (dica do soquete) → processador no soquete → cooler,
    memória, HD e fonte → **Ligar** (diz os cabos que faltam) → energia SATA na entrada de dados (não encaixa) → ligar
    os 3 cabos → **Ligar** → tela de inicialização → **Pronto ✓** (🖥️ 1|3) → gamer (com a energia da placa de vídeo)
    → escritório (HD e SSD) → o Marcos vem, **+100 XP** e comemoração.
28. Fase 3, missão 4 (`?fase=3&missao=4`, ou seguindo depois dos computadores): o chefe vai até a Sala de Reuniões e
    chama → entrar na sala → duas falas → o ESTAGIÁRIO senta → notebook com o quiz → **✕ Desistir** → ele levanta e o
    chefe diz que o quiz fica aberto → voltar para a cadeira → senta de novo → responder tudo → **Entregar ao chefe** →
    o chefe comenta os acertos, **+100 XP**, e volta para a Diretoria.
29. Fase 3, missão 5 (`?fase=3&missao=5`, ou seguindo depois do quiz): balão com a gota e relógio de 25 s → esperar
    acabar → calça molhada e pocinha → ir até um mictório → falas → a câmera mostra as palavras da parede → sonho
    tremido com o caça-palavras → **✕ Desistir** → acorda sem XP → sair do banheiro → escurece e todos vão embora →
    sair pela porta principal → comemora → resumo do 3º dia. Repetir chegando a tempo (sem mancha) e achando todas
    as palavras → **Acordar ▶** → **+100 XP**.

## Correções incluídas desde a Fase 1

- Atividade (aluno e “Visualizar como aluno”): o bloco do jogo não é mais selecionável nem arrastável pelo editor. Antes,
  depois do primeiro clique o bloco ficava selecionado e marcado como arrastável, e o navegador tratava o arrastar do
  caça-palavras como arrastar o bloco: depois da primeira palavra não dava para marcar mais nada
  (`apps/web/src/editor/extensions.ts`, opção `readOnly`).

- `apps/web/vite.config.ts`: `host: true` (abrir pelo IP da rede) e proxy de `/api` para `127.0.0.1:3333`.
- `apps/web/src/api.ts`: quando a resposta não é JSON, a mensagem mostra o status HTTP em vez de só
  "Erro inesperado."
- `apps/api/tests/teams.test.ts`: a checagem de "nenhuma senha na resposta" usa
  `/"password"|passwordHash|password_hash/i` (o regex antigo casava com `mustChangePassword`).

## Como rodar

Pré-requisitos: Node 20+ e Docker (ou um PostgreSQL 16 seu — veja o fim).

```bash
# 1. variáveis de ambiente
cp apps/api/.env.example apps/api/.env

# 2. banco (cria os bancos `playground` e `playground_test`)
docker compose up -d

# 3. dependências (também roda `prisma generate`)
npm install

# 4. cria as tabelas (gera a pasta prisma/migrations)
cd apps/api && npx prisma migrate dev --name init && cd ../..

# 5. usuários iniciais
npm run db:seed

# 6. em dois terminais
npm run dev:api     # http://localhost:3333
npm run dev:web     # http://localhost:5173
```

Usuários criados pelo seed (ajustáveis no `.env`):

| Perfil | Login | Senha | Observação |
| --- | --- | --- | --- |
| Instrutor | `instrutor@exemplo.com` | `Instrutor2026!` | entra direto |
| Aluno | `aluno.teste` | `Alunos2026!` | cai na tela "Crie sua nova senha" |

Rodar `npm run db:seed` de novo devolve o aluno de teste ao estado de primeiro acesso.

## Testes

```bash
npm test
```

Usam o banco `playground_test` (`DATABASE_URL_TEST`) e **apagam os dados dele**. Eles cobrem login,
logins inexistentes, token adulterado, troca de senha (regras, senha antiga invalidada) e os middlewares
de acesso.

Conferência de tipos e build: `npm run typecheck` e `npm run build`.

## Checklist manual (5 minutos)

1. Entrar como `aluno.teste` → deve abrir "Crie sua nova senha".
2. Tentar abrir `/aluno` direto pela barra de endereço → volta para "Crie sua nova senha".
3. Trocar a senha (ex.: `NovaSenha1`) → abre "Minhas atividades".
4. Sair e entrar com a senha nova; a antiga deve falhar.
5. Entrar como instrutor → "Painel do instrutor"; abrir `/aluno` → volta para `/instrutor`.

## Checklist manual da Fase 2

1. Entrar como instrutor → "+ Nova" → criar a turma "Turma A", turno "Manhã".
2. Em "Importar alunos", colar as linhas de exemplo (o placeholder da caixa) e importar → o modal mostra
   login e senha de cada aluno; testar "Copiar tudo" e "Baixar CSV".
3. Importar uma linha inválida (ex.: `12345`) → aparece o erro e a linha permanece na caixa.
4. Entrar com um dos alunos criados → "Crie sua nova senha".
5. De volta como instrutor: o aluno passa de "Aguardando 1º acesso" para "Ativo"; "Nova senha" volta a exigir a troca.
6. Remover um aluno e excluir a turma (as contas continuam existindo).

## Notas de projeto

- **Token:** fica no `localStorage` (simples para a fase atual). Uma alternativa mais robusta contra XSS
  é cookie `httpOnly`; dá para migrar depois sem mudar as rotas.
- **Execução da API:** `npm run start -w @playground/api` usa `tsx`. Para produção, a Fase 5 inclui
  empacotar a API (`tsup`/`esbuild`) e um `Dockerfile`.
- **Nota da avaliação de feedback (1 a 5):** o Prisma não cria `CHECK`; a validação ficará na API (Fase 4).
- **Senha temporária:** aleatória por aluno e exibida uma única vez (não fica guardada em texto).
  Se preferir poder rever as credenciais pendentes a qualquer momento, dá para guardá-las criptografadas
  até o primeiro acesso — é uma troca de segurança por conveniência; hoje optamos pela mais segura.
- **Importação grande:** cada senha passa por bcrypt (CPU), então o limite é 150 alunos por vez.

## Usando um PostgreSQL próprio (sem Docker)

Crie os dois bancos e ajuste `DATABASE_URL` / `DATABASE_URL_TEST` no `apps/api/.env`:

```bash
createdb playground && createdb playground_test
```

## Identidade visual e design system

- Logo e ícones em `apps/web/public/` (`logo*.png`, `logo-dark*.png`, `favicon.*`, `icon-*.png`, `site.webmanifest`). Use o componente `BrandLogo` (troca sozinho para a versão clara no tema escuro; `onDark` para fundos sempre escuros, como a barra superior).
- Tokens em `apps/web/src/styles.css` (topo): marca (`--navy`, `--amber`, `--dot-blue/green/red`), superfícies, estados, raios, foco e sombra; tema claro e escuro automáticos. Fonte: Figtree (Google Fonts; sem internet cai em `system-ui`).
- Cada tipo de jogo tem uma cor do controle do logo (`GameTypeBadge`): Quiz azul, Caça-palavras verde, Forca vermelho, Cruzadas amarelo. Estados sempre combinam texto + cor, nunca só cor.
