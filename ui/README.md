# Estação visual — Etapas 1, 2, 3, 4 e 4.5

Interface conceitual com agente animado, independente dos módulos de pesquisa. O repositório não possuía
frontend, framework, sistema de estilos ou rotas. Esta tela usa HTML, CSS e
JavaScript nativos, sem build, instalação, fontes externas ou serviços remotos.

## Abrir

Execute a partir da raiz do projeto:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory ui
```

Acesse `http://127.0.0.1:4173`. O servidor serve apenas a pasta da interface.
O SVG é incorporado como `object` da mesma origem, preservando um único arquivo
de arte. Abrir via `file://` pode bloquear o acesso ao SVG pelo controlador;
nesse caso a ilustração permanece estática e a interface orienta usar o servidor.

## Organização

- `index.html`: entrada e composição semântica da tela, cabeçalho e painéis.
- `styles.css`: identidade visual, layout e adaptação para telas menores.
- `assets/fly-agent.svg`: desenho original da mosca segurando a guitarra;
  grupos nomeados para asas, cabeça, corpo, patas, guitarra e contato.
- `mock-data.js`: canais, cores, notas com timestamps em segundos e duração visual demonstrativa.
- `components.js`: funções separadas para pista, cérebro, traços e canais.
- `app.js`: montagem, transporte, assinaturas de eventos e visibilidade de camadas.
- `music-timeline.js`: validação, ordenação, relógio monotônico e emissão de eventos.
- `fly-animation.js`: estados, poses coordenadas, pausa e ciclo de animação.
- `neural-visual.js`: resposta visual aos eventos recebidos, intensidade e curva complementar.
- `tests/fly-animation.test.cjs`: transições, interrupções, pausa, suspensão e
  movimento reduzido; execute `node --test ui/tests/fly-animation.test.cjs`.

## Limites do mockup

Toda a geometria neural é artística. Os destaques E1–E5 são associações de
interface, não populações celulares ou correspondências biológicas. Os traços
são desenhos determinísticos associados às mesmas notas estáticas da pista;
não são spikes calculados, medições, taxas em Hz nem resultados experimentais.
O tempo acompanha a execução. BPM e compasso continuam referências visuais e não determinam os timestamps. Nenhum dataset é carregado.

Selecionar um canal destaca sua nota, região ilustrativa e traço. Isso não toca
áudio nem troca o estado do agente. As caixas de seleção apenas mostram/ocultam camadas.
Durante a sequência, os canais são controlados pelos eventos; a seleção manual fica temporariamente desabilitada.

## Animação visual — Etapa 2

Fora da reprodução musical, use o seletor no canto superior direito do painel da mosca. O botão ao lado
pausa/retoma a animação, inclusive as transições temporárias.

| Estado | Comportamento visual | Retorno |
| --- | --- | --- |
| IDLE | Microajustes lentos de corpo, cabeça, asas, patas e guitarra | Permanece |
| PREPARANDO | Inclinação e reposicionamento da guitarra e patas | TOCANDO após 0,85 s |
| TOCANDO | Palhetada, deslizamento no braço, resposta de corpo e guitarra | Permanece |
| ACERTO | Reação curta com destaque verde na guitarra | TOCANDO após 0,55 s |
| ERRO | Interrupção da palhetada, correção postural e destaque coral | TOCANDO após 0,95 s |
| COMBO | Execução um pouco mais intensa e destaque dourado | TOCANDO após 1,8 s |

Os tempos são de reprodução ativa; pausa, aba oculta e agente fora da área
visível suspendem a animação. Mudanças de estado interrompem a reação anterior.
Há um único `requestAnimationFrame`, sem redesenhar os painéis neural/musical.

A pose principal move o corpo; movimentos secundários usam a mesma fase visual.
As extremidades das patas são calculadas no espaço da guitarra e seguem suas
transformações. As patas de apoio compensam o movimento do corpo para manter
contato com o piso. São poses artísticas, sem física, cinemática biológica ou
simulação de cordas. A cadência visual não deriva do BPM e não toca as notas
estáticas da pista. O destaque das cordas é apenas feedback visual.

`prefers-reduced-motion` usa poses fixas, sem laço de animação; apenas um timer
por reação efetua o retorno a TOCANDO. A preferência também é acompanhada se
mudar durante a sessão.

Após carregar o SVG, controles futuros podem usar a API local:

```js
window.flyAgent.setState("PREPARANDO");
window.flyAgent.setState("ACERTO");
window.flyAgent.setPaused(true);
window.flyAgent.snapshot();
```

Estados inválidos retornam `false`. Essa API controla somente a apresentação.
A API manual permanece disponível fora do transporte. Não há áudio, atividade neural real ou integração FlyWire.

A composição prioriza desktop, com dois painéis lado a lado. Abaixo de 800 px,
os painéis passam a uma coluna e as ações permanecem próximas da mosca.


## Sequência demonstrativa — Etapa 3

DECISION (2026-10-09): preservar os 20 tempos originais de `channels[].times`
(em segundos). `fromChannels` converte uma única vez para `timestampMs`, gera
IDs estáveis e valida `NOTE_EVENT`, canal E1–E5, ID único, timestamp finito e
não negativo, duração positiva e limite da sequência. Ordenação cronológica
estável; a ordem original dos canais não possui significado temporal. Empates
preservam a ordem de entrada. Sequência vazia fica inativa; dados inválidos
exibem erro e não iniciam execução.

A duração visual de cada palhetada é 180 ms, uma escolha artística ajustável em
`mock-data.js`; não é duração de áudio nem medida biológica. A janela é de 4 s.
O mapeamento artístico de canal para posição no braço fica em `fretByChannel`.
Pista e gráfico são gerados da mesma sequência normalizada. Os traços completos continuam ilustrativos; na Etapa 3, somente o cursor
acompanhava a execução. A curva complementar e os destaques temporais da
Etapa 4 são descritos abaixo, sem reconstruir o cérebro nem simular propagação neural.

`MusicTimeline` emite `NOTE_EVENT`, `TIME_UPDATE`, `STATE`, `RESET` e `ERROR`.
Os consumidores assinam com `on`, que retorna uma função de cancelamento.
Um único requestAnimationFrame usa tempo monotônico (`performance.now`),
sem limitar o delta ou contar frames. O cursor de eventos avança uma vez por
nota. Durante a reprodução, o controlador da mosca cancela seu relógio manual:
poses são calculadas pela idade dos eventos recebidos, com envelopes suaves,
sobreposição limitada e repouso nas lacunas. Movimento reduzido usa poses fixas
por evento, mantendo o relógio compartilhado para transporte e indicadores.

Iniciar começa em zero; cliques adicionais em execução são ignorados. Pausar
congela a posição e Retomar preserva os eventos processados. Reiniciar interrompe
a execução, limpa eventos e prepara o início (é necessário clicar Iniciar).
Após 4 s, o transporte termina e a mosca fica em repouso. Uma nova execução
limpa a anterior. Ocultar a aba pausa a sequência; ao voltar, use Retomar.
Falhas em consumidores interrompem o relógio e apresentam erro; Reiniciar
permite tentar novamente. Os estados manuais ACERTO/ERRO/COMBO não são inferidos
da sequência, pois não existe avaliação de desempenho musical.

### Precisão e limites

Cada evento é entregue no primeiro frame após seu timestamp. A tolerância
esperada é um intervalo de renderização (aproximadamente 17 ms em 60 Hz), não
uma garantia em tempo real. O teste com frames de 16 ms verifica atraso menor
que 16 ms. Frames atrasados entregam todos os eventos vencidos, uma única vez,
em ordem. Palhetadas cujo intervalo visual já terminou não são reproduzidas
tardiamente: a pose corresponde ao tempo atual, evitando acumular atraso.
Nenhuma latência de hardware ou métrica científica é inventada/exibida.

### Validação

```sh
node ui/tests/music-timeline.test.cjs
node ui/tests/fly-animation.test.cjs
node --check ui/music-timeline.js
node --check ui/app.js
node --check ui/components.js
node --check ui/fly-animation.js
```

Os testes usam o runner nativo do Node, relógio e RAF controlados: fronteira de
entrada, ordenação e empates, disparo único, tolerância por frame, atraso longo,
pausa/retomada repetidas, reset, replay, término, falhas e cancelamento; também
preservam os testes geométricos anteriores e verificam poses musicais e ausência
de timers/loops locais durante a sequência. Validação manual: iniciar, pausar,
retomar, reiniciar durante execução, replay, seleção manual e camadas.

A Etapa 4 usa esse contrato para a resposta visual descrita abaixo. Integração científica FlyWire/dinâmica neural exige especificação, dados e validação próprios; não faz parte desta implementação.


## Visualização neural dinâmica demonstrativa — Etapa 4

DECISION (2026-10-09): ativar os grupos artísticos existentes sem adicionar nós,
sem adjacência científica e sem simular propagação entre eles. Cada E1–E5 tem
25 círculos e 24 conexões já presentes no desenho; são elementos gráficos,
não contagens de neurônios. `NeuralVisual.channelMap` referencia seus IDs
`visual-E*-node-*` e `visual-E*-edge-*`. O mapeamento é configurável via opção
`map` e independente da música e da mosca. Todos os alvos são conferidos na
inicialização. Alvos compartilhados somam as contribuições dos canais com teto 1.
A seleção manual sublinha o rótulo do grupo; não fabrica atividade.

`app.js` encaminha o contrato original `{type: "NOTE_EVENT", channel,
timestampMs, durationMs, eventId}` a `receive`. `TIME_UPDATE` e `STATE` chamam
`update({positionMs, status})`; `RESET` chama `reset`. O módulo não lê a sequência
musical, não consulta `performance.now` e não cria RAF, timer ou listener próprio.
`durationMs` da nota é validado, mas a duração da resposta visual é um parâmetro
artístico separado. O relógio e a animação da mosca da Etapa 3 não foram alterados.

### Regra de intensidade

Para idade `a = posição − timestamp`, a resposta é zero fora de `[0, 600)` ms.
Nos primeiros 40 ms, sobe com `3p² − 2p³`, sendo `p=a/40`. Depois decai como
`((600−a)/560)²`. As respostas recebidas somam, com saturação em 1. Não há sorteio,
flashes aleatórios, deslocamento de nós ou atribuição anatômica.

Uma série fixa de 401 amostras por canal (10 ms na janela atual de 4 s) alimenta
**tanto** a intensidade dos elementos quanto a curva grossa do gráfico.
A posição entre amostras usa interpolação linear; é uma aproximação gráfica,
não uma resolução experimental. IDs já recebidos são ignorados até o reset.
O armazenamento das séries é fixo e os IDs ocupam espaço proporcional ao número
de eventos distintos recebidos na execução. Lotes atrasados atualizam as séries
uma vez por evento; cada curva é redesenhada no máximo uma vez por atualização,
apenas se recebeu eventos. As referências DOM são obtidas na inicialização.

A linha fina original continua representando as notas. A linha grossa representa
intensidade visual 0–1, sem unidade física, e só aparece até a posição atual.
Não há taxas em Hz, spikes ou medições. Ocultar a camada de destaques esconde os
elementos, mas mantém seu estado temporal e a curva complementar coerentes.

Pausa mantém exatamente a mesma intensidade e recorte; não há transições CSS
que continuem por conta própria. Retomar continua do mesmo instante. Reiniciar
zera as séries, os IDs recebidos e o recorte do gráfico. No término, o painel
**congela o quadro de 4 s**, incluindo respostas ainda incompletas; o rótulo
“QUADRO FINAL CONGELADO” explicita essa regra. Não existe relógio de cauda.
Em erro, o estado transitório é limpo e o transporte apresenta a falha.

Com movimento reduzido, os elementos recebem realce fixo e moderado enquanto
há resposta positiva; não há variação contínua de brilho. A curva quantitativa
da demonstração continua acessível. A preferência é acompanhada via matchMedia.
Ao sair da página, o listener é removido e os componentes são destruídos; no
cache de navegação, a execução é apenas pausada para permitir retorno.

### Verificação da Etapa 4

```sh
node ui/tests/neural-visual.test.cjs
node ui/tests/music-timeline.test.cjs
node ui/tests/fly-animation.test.cjs
node --check ui/neural-visual.js
node --check ui/components.js
node --check ui/app.js
```

RESULT (2026-10-09, ambiente local Node): 14 testes novos e os 20 testes da Etapa 3
passaram. Cobrem IDs reais do SVG gerado, cinco canais, entradas inválidas,
mapa incompleto, subida/decaimento, compartilhamento, simultaneidade, lote de
1.000 eventos, duplicação, pausa/retomada, reset, quadro final, reprodução
idêntica, movimento reduzido, sequência vazia e integração com o relógio original.
Não são testes de atividade biológica nem medições de desempenho de hardware.

No navegador local foram conferidos ativação dos grupos, curva complementar,
pausa/retomada e reinício durante execução. O instante pausado de 691,8 ms e
os valores de intensidade permaneceram iguais entre observações; ambos os
painéis terminaram em 4 s com 20/20 notas. Reiniciar deixou intensidade zero
e recorte zero. Casos de entradas inválidas e movimento reduzido foram
verificados nos testes automatizados, não por alteração de dados no navegador.

Próxima etapa científica: definir a pergunta e o modelo computacional, validar
proveniência/materialização e mapeamentos dos dados, especificar parâmetros e
unidades, estabelecer controles e validação experimental. Uma animação baseada
em eventos musicais não substitui nenhuma dessas evidências.


## Notas sustentadas — Etapa 4.5

DECISION (2026-10-09): manter `durationMs` como duração visual da palhetada
(180 ms nos dados originais) e adicionar `sustainMs` como duração musical
**demonstrativa explícita**. Isso evita converter as vinte notas curtas em
notas longas apenas porque já tinham uma duração de animação.

- `sustainMs` ausente ou zero: nota curta, comportamento anterior.
- `sustainMs > 0`: sustentada até `timestampMs + sustainMs`.
- Valores negativos, não finitos, nulos ou textuais são rejeitados; não há
  duração sustentada padrão. `durationMs` continua obrigatório e positivo.
- O término lógico precisa caber na janela da sequência. Se a sustentação
  for menor que a palhetada, o movimento inicial cabe nesse intervalo menor.

Exemplo demonstrativo:

```js
{ type: "NOTE_EVENT", eventId: "demo-hold-1", channel: "E1",
  timestampMs: 200, durationMs: 180, sustainMs: 2400 }
// O agendador deriva, sem exigir outro registro nos dados:
{ type: "NOTE_END", eventId: "demo-hold-1", channel: "E1",
  timestampMs: 2600, startTimestampMs: 200 }
```

A fila do mesmo relógio monotônico contém inícios e términos. Em empates,
términos vêm antes dos inícios; eventos do mesmo tipo mantêm a ordem original.
O contador de eventos continua contando somente inícios. Pausa conserva a
posição da fila; reset zera os dois cursores. Um frame atrasado processa todas
as fronteiras vencidas na ordem, e os consumidores reconciliam seu estado com
a posição atual. Não existem timers por nota. Um NOTE_END nunca é repassado
como nova palhetada nem como novo pulso neural.

### Demonstração e pista

A sequência padrão mantém exatamente as vinte notas e timestamps anteriores.
A opção **Acrescentar 3 notas sustentadas demonstrativas** acrescenta os
exemplos inventados de `SustainDemo`: E1 de 200–2600 ms, E4 de 1200–3200 ms e
E1 de 2600–4000 ms. Não são transcrições de música ou medidas biológicas.
A opção fica indisponível em execução/pausa. Trocar de opção recarrega a página
local no início; `?sustain=1` identifica a variante com 23 notas.

A pista permanece horizontal. A cabeça fica no timestamp inicial; a barra
mede `568 × sustainMs / duraçãoDaSequência` unidades do SVG. O preenchimento
usa a fração transcorrida, sem relógio CSS. Cada nota possui seu próprio grupo
com estado pendente, ativo ou terminado; o fim deixa a barra esmaecida.
As coordenadas do viewBox preservam a proporção em telas estreitas.

### Pose e conflitos visuais

A nota sustentada faz uma única palhetada inicial, mantém a posição de traste
e libera a pose nos últimos até 80 ms do intervalo. A fase visual é `pluck`,
`hold` ou `idle`; os estados manuais anteriores continuam disponíveis. O
retorno ao repouso ocorre somente quando não há outra ação ativa.

O personagem tem uma mão no braço da guitarra: a **nota ativa mais recente**
tem prioridade visual; empates seguem a ordem de emissão. Uma nota curta
pode ocupar temporariamente a mão, que depois volta à sustentação ainda
ativa. Duas sustentações não são representadas como dois trastes simultâneos;
as barras e os anéis continuam indicando ambas. O fim de uma nota remove
somente seu ID/canal/término correspondente. A posição temporal também remove
notas vencidas, mesmo após perda de frames. Movimento reduzido mantém poses
fixas durante as fases sem repetir a palhetada.

### Painel neural

A resposta transitória mantém a subida de 40 ms e o decaimento até 600 ms,
independentes de `sustainMs`. Um **anel tracejado** no grupo indica apenas o
estado demonstrativo da nota sustentada; ele não prolonga a intensidade nem
altera a curva neural visual. O módulo mantém os IDs ativos e remove somente
a nota correspondente ao término. A presença de outra sustentação no mesmo
canal mantém o anel visível. Pausa congela ambos; reset limpa ambos.

Em 4 s, todos os términos são processados: a mosca volta ao repouso, as barras
terminam e os anéis desaparecem. A intensidade transitória do painel continua
congelada conforme a regra da Etapa 4. Não há cauda temporal independente.

### Validação e precisão

```sh
node ui/tests/music-timeline.test.cjs
node ui/tests/fly-animation.test.cjs
node ui/tests/neural-visual.test.cjs
node --check ui/music-timeline.js
node --check ui/fly-animation.js
node --check ui/neural-visual.js
node --check ui/components.js
node --check ui/app.js
node --check ui/mock-data.js
git diff --check -- ui
```

A entrega acontece no primeiro frame disponível após cada início/término.
O teste com frames sintéticos de 16 ms verifica atraso inferior a 16 ms para
ambas as fronteiras. Isso não mede latência física no navegador: sob carga,
frames podem atrasar e a pose é reconciliada com o tempo corrente, sem tentar
reproduzir movimentos já vencidos. Os exemplos têm precisão visual, não
sincronização de áudio nem validação científica.

Os testes cobrem dados inválidos, preservação das notas curtas, términos por
ID, empates, sobreposição no mesmo canal e em canais distintos, troca de
prioridade, pausa/retomada, reset/replay, término na borda da janela, frames
atrasados, anéis independentes do pulso e geometria/progresso das barras.

RESULT (2026-10-09, Node local): 48 testes passaram — 15 da linha do tempo,
14 da animação e 19 da visualização/integração. Sintaxe dos seis módulos
JavaScript alterados e `git diff --check -- ui` sem erros.

Validação no navegador local: sequência original com 20 notas curtas e nenhuma
barra; seleção da variante com 23 notas; cabeça/barra, preenchimento e pose
“Sustentando E1”; pausa/retomada; reinício durante sustentação e término natural.
Em uma pausa a 909,3 ms, a primeira barra tinha 100,7206 unidades preenchidas,
coerentes com `(909,3 − 200) × 568 / 4000`. O final apresentou 23/23, 4 s, três
barras terminadas, cinco anéis apagados e mosca em repouso. Reset retornou a zero,
barras pendentes e anéis apagados. No viewport solicitado de 390×844, a área
útil e a largura do documento eram ambas 375 px, sem transbordamento horizontal.
Nenhum erro/aviso no console da página. A precisão de disparo e a ausência de
palhetadas duplicadas foram verificadas pelo relógio controlado dos testes;
a inspeção do navegador não foi uma medição instrumental de latência.

Antes da Etapa 5, é necessário definir a fonte real de dados/execuções e seu
contrato de integração, mantendo a origem demonstrativa explícita. Qualquer
modelo neural científico requer parâmetros, unidades, controles e validação
próprios. Áudio, pontuação, desempenho de jogador e integração FlyWire continuam
fora desta etapa.
