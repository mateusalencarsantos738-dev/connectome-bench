# Avaliação da recuperação de contexto

Este conjunto registra perguntas para testar futuras mudanças de `AGENTS.md`, índice, Skills e busca. A resposta deve apontar para a fonte indicada, preservar versão/escopo e distinguir fato, hipótese e resultado. A presença de um arquivo ou de um link não comprova que um agente responderá corretamente. Nenhum resultado experimental é redefinido aqui.

## Perguntas e fontes esperadas

| Nº | Pergunta | Fonte principal a recuperar |
|---:|---|---|
| 1 | Qual é a pergunta científica central e o que não se pode assumir sobre eficiência biológica? | `AGENTS.md`; `README.md` |
| 2 | Qual dataset FlyWire é o baseline biológico e por que outra materialização não pode ser trocada silenciosamente? | `AGENTS.md`; `docs/agent_reference/data_and_graph.md` |
| 3 | Quais são as cinco colunas verificadas do CSV de conexões? | `.agents/skills/connectome-data/SKILL.md`; `notebooks/00_dataset_audit.ipynb` |
| 4 | Por que 5.342.446 linhas não significam 5.342.446 pares únicos? | `docs/agent_reference/data_and_graph.md`; Skill `connectome-data` |
| 5 | O que `syn_count` mede e o que não mede? | `AGENTS.md`; Skill `connectome-data` |
| 6 | Qual a condição epistêmica do `nt_type`? | `AGENTS.md`; Skill `connectome-data` |
| 7 | Qual arquivo contém o procedimento de carga e validação dos CSVs? | Skill `connectome-data`; Skill `notebook-template` |
| 8 | Como distinguir grau ponderado de não ponderado na matriz esparsa? | Skill `sparse-graph-patterns` |
| 9 | Qual representação é indicada para operações globais e quando cabe NetworkX? | Skill `sparse-graph-patterns`; `docs/agent_reference/data_and_graph.md` |
| 10 | Quando consultar a API FlyWire em vez do CSV local? | Skill `flywire-api-patterns` |
| 11 | É seguro presumir que a materialização pública atual é v630? | Skill `flywire-api-patterns`; verificar documentação atual antes do uso |
| 12 | Quais controles são indispensáveis para testar efeito de topologia? | `AGENTS.md`; `docs/agent_reference/experiment_protocols.md` |
| 13 | Que comparação separa efeito de pesos e efeito da topologia? | `docs/agent_reference/experiment_protocols.md` |
| 14 | Menos FLOPs implica menor latência neste projeto? | `AGENTS.md`; `docs/agent_reference/experiment_protocols.md` |
| 15 | Que metadados uma medição de hardware deve registrar? | `AGENTS.md`; `docs/agent_reference/experiment_protocols.md` |
| 16 | Qual evidência sustenta a acurácia relatada na fase 6.1 e qual é sua limitação estatística? | `notes/06_1_resultado_rigor.md`; notebook correspondente |
| 17 | O que foi registrado sobre o padrão de cruzamento de acurácia da fase 6.2? | `notes/06_2_resultado_convergencia.md` |
| 18 | O teste de significância formal da fase 6.2 consta como concluído? | `notes/06_2_resultado_convergencia.md` |
| 19 | A causa da diferença de tempo entre Random e FlyWire foi estabelecida? | `notes/06_1_resultado_rigor.md`; `notes/06_2_resultado_convergencia.md` |
| 20 | Que ressalva existe sobre o número de GPUs T4 efetivamente usadas? | `notes/06_2_resultado_convergencia.md` |
| 21 | Qual é o objetivo do controle com IDs permutados? | `notes/06_2_resultado_convergencia.md`; `docs/agent_reference/roadmap_and_applications.md` |
| 22 | Quando uma variante deixa de receber o nome “FlyWire”? | `docs/agent_reference/roadmap_and_applications.md` |
| 23 | Discovery e Optimization são a mesma fase? Qual é a condição para iniciar a segunda? | `docs/agent_reference/roadmap_and_applications.md` |
| 24 | Que artefatos estão versionados para as fases 0–8, e isso comprova execução? | `README.md`; `notebooks/`; `notes/` |

## Protocolo de avaliação

1. Teste inicialmente cinco perguntas que cubram dados, API, método, resultado e estado. Sem fornecer a resposta, peça fonte exata e limite da afirmação.
2. Corrija referências quebradas ou omissões; só então repita as 24 perguntas com um contexto novo, usando o mesmo modelo e as mesmas condições para comparar revisões futuras.
3. Registre por pergunta: fonte correta recuperada, resposta correta, ressalva preservada, arquivos lidos, tempo e tokens reais se o cliente expuser esse dado.
4. Não conclua equivalência de qualidade com testes de link ou com uma única leitura manual. Guarde respostas e método ao comparar modelos ou versões de contexto.

## Verificação inicial desta revisão

Inspeção manual limitada de cinco perguntas após a reorganização: **3, 8, 12, 18 e 24**. Resultado: **5/5 fontes localizadas e ressalvas essenciais verificadas no texto**. A pergunta 3 retorna as cinco colunas da Skill de dados; a 8 distingue soma dos pesos de contagem de vizinhos; a 12 localiza os quatro controles; a 18 exige dizer que o teste formal está pendente; a 24 separa existência de notebook de execução comprovada. Este é um teste de roteamento e preservação da ressalva, não uma avaliação cega de respostas de agentes nem prova de qualidade equivalente.

Verificações estruturais: as **38/38 seções** numeradas do antigo `AGENTS.md` foram preservadas **sem alteração textual** nas quatro referências; não há links locais quebrados em `AGENTS.md`, `README.md`, neste índice e nas quatro Skills; `git diff --check` passou. As 24 perguntas foram definidas, mas ainda não executadas como avaliação cega de agentes.

## Tamanho e custo de leitura

Medição reproduzível em UTF-8, usando `git show HEAD:AGENTS.md` como antes e o arquivo de trabalho como depois:

| Contexto permanente | Antes | Depois |
|---|---:|---:|
| Bytes de `AGENTS.md` | 32.207 | 5.628 |
| Palavras separadas por espaços | 4.366 | 722 |

O índice tem 2.741 bytes e é consultado quando a tarefa precisa localizar uma fonte. Exemplos de **bytes de arquivos lidos integralmente**, mantendo a mesma fonte específica antes e depois:

| Tarefa ilustrativa | Antes | Depois com rota direta | Depois incluindo índice | Arquivos antes → depois com índice |
|---|---:|---:|---:|---:|
| Esquema CSV: `AGENTS.md` + Skill de dados | 34.753 | 8.174 | 10.915 | 2 → 3 |
| Significância 6.2: `AGENTS.md` + nota | 37.005 | 10.426 | 13.167 | 2 → 3 |
| Código de grafo: `AGENTS.md` + Skill de grafos | 35.550 | 8.971 | 11.712 | 2 → 3 |
| Roadmap detalhado: antes só `AGENTS.md`; depois `AGENTS.md` + referência | 32.207 | 15.770 | 18.511 | 1 → 3 |

Esses valores medem arquivos, **não o prompt real**: um agente pode ler apenas trechos, e o cliente pode incluir outras instruções. Não havia tokenizador ou contador de uso disponível para esta comparação e nada foi instalado. Como aproximação grosseira e reproduzível, `bytes UTF-8 ÷ 4` dá cerca de **8.052 → 1.407 unidades de token** para o `AGENTS.md` isolado; a relação varia com idioma, Markdown e tokenizador. Não trate esses valores como tokens medidos nem como economia observada de uma tarefa completa.

As regras permanentes aparecem resumidas no novo `AGENTS.md` e desenvolvidas nas referências ou Skills. Essa sobreposição curta é intencional para manter a segurança científica; o conteúdo detalhado não foi copiado para o índice. Duplicações históricas entre `docs/mosca.md`, `docs/plano_de_acao.md` e as antigas instruções permanecem fora do escopo desta reorganização e não devem ser interpretadas como fontes independentes de resultados.
