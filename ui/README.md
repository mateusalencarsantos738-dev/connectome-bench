# Estação visual — Etapas 1, 2 e 3

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
Pista e gráfico são gerados da mesma sequência normalizada. Os traços completos
continuam ilustrativos: somente o cursor acompanha a execução, sem reconstruir
o cérebro ou simular propagação neural.

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

A próxima etapa é evoluir a visualização neural conceitual sobre este contrato
de eventos. Integração científica FlyWire/dinâmica neural exige especificação,
dados e validação próprios; não faz parte desta implementação.
