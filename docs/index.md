# Índice de documentação do ConnectomeBench

Use este mapa para localizar a fonte antes de ler documentos inteiros. O índice aponta para registros; não substitui os dados, o código nem a evidência experimental.

| Pergunta | Fonte a consultar |
|---|---|
| Objetivo, regras permanentes e segurança do agente | [`AGENTS.md`](../AGENTS.md) |
| Visão geral e artefatos disponíveis | [`README.md`](../README.md), [`notebooks/`](../notebooks/) |
| Dataset FlyWire v783, esquema, auditoria e definição do grafo | [`00_dataset_audit.ipynb`](../notebooks/00_dataset_audit.ipynb), [`01_graph_construction.ipynb`](../notebooks/01_graph_construction.ipynb), [referência de dados](agent_reference/data_and_graph.md) |
| Metodologia, controles, reprodutibilidade e benchmark | [protocolos](agent_reference/experiment_protocols.md), [`configs/`](../configs/), notebooks da fase relevante |
| Hipóteses e roadmap, inclusive arquitetura inspirada no connectoma | [roadmap detalhado](agent_reference/roadmap_and_applications.md), [`plano_de_acao.md`](plano_de_acao.md) |
| Resultados documentados das fases 5, 6, 6.1 e 6.2 | [`notes/`](../notes/) e notebook correspondente; os notebooks versionados não contêm outputs salvos |
| Decisões arquiteturais e taxonomia | `AGENTS.md` e seções 32–37 da [referência de roadmap](agent_reference/roadmap_and_applications.md) e dos [protocolos](agent_reference/experiment_protocols.md); não há log de decisões separado nesta data |
| Notas científicas e explicações históricas | [`notes/`](../notes/), [`mosca.md`](mosca.md), [`plano_de_acao.md`](plano_de_acao.md) |
| Código e parâmetros efetivamente usados | [`src/`](../src/), [`configs/`](../configs/), notebook e logs da execução |
| Procedimentos de acesso a dados, API, notebooks e grafos esparsos | [quatro Skills](../.agents/skills/): `connectome-data`, `flywire-api-patterns`, `notebook-template`, `sparse-graph-patterns` |
| API FlyWire e credenciais | [Skill FlyWire](../.agents/skills/flywire-api-patterns/SKILL.md), [guia local de token](como_obter_token_codex.md), [documentação do fafbseg-py](https://fafbseg-py.readthedocs.io/) |

As quatro [referências detalhadas para agentes](agent_reference/) preservam as 38 seções do antigo `AGENTS.md`. Seus trechos de “estado atual”, marco imediato e versões de API são históricos. Para responder sobre o estado presente, confira o Git, os notebooks, as notas e, se aplicável, a documentação oficial atual.

Para uma afirmação científica, registre se ela é `FACT`, `HYPOTHESIS`, `INFERENCE`, `RESULT`, `UNVERIFIED` ou `DECISION` e inclua o caminho da fonte, escopo, versão e limitações. Uma nota posterior não altera silenciosamente o resultado anterior.
