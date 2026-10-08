# Estação visual — Etapas 1 e 2

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
- `mock-data.js`: canais, cores, notas e instante de referência demonstrativos.
- `components.js`: funções separadas para pista, cérebro, traços e canais.
- `app.js`: montagem e seleção visual de canal; visibilidade de camadas.
- `fly-animation.js`: estados, poses coordenadas, pausa e ciclo de animação.
- `tests/fly-animation.test.cjs`: transições, interrupções, pausa, suspensão e
  movimento reduzido; execute `node --test ui/tests/fly-animation.test.cjs`.

## Limites do mockup

Toda a geometria neural é artística. Os destaques E1–E5 são associações de
interface, não populações celulares ou correspondências biológicas. Os traços
são desenhos determinísticos associados às mesmas notas estáticas da pista;
não são spikes calculados, medições, taxas em Hz nem resultados experimentais.
Tempo, BPM e compasso são exemplos fixos. Nenhum dataset é carregado.

Selecionar um canal destaca sua nota, região ilustrativa e traço. Isso não toca
áudio nem troca o estado do agente. As caixas de seleção apenas mostram/ocultam camadas.
O controle de execução está explicitamente desabilitado nesta etapa.

## Animação visual — Etapa 2

Use o seletor no canto superior direito do painel da mosca. O botão ao lado
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
Não há sistema central de eventos musicais, áudio, atividade neural real ou
integração FlyWire. **A Etapa 3 permanece pendente.**

A composição prioriza desktop, com dois painéis lado a lado. Abaixo de 800 px,
os painéis passam a uma coluna e as ações permanecem próximas da mosca.
