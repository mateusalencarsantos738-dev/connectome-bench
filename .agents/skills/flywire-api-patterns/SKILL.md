---
name: flywire-api-patterns
description: >-
  Padrões de uso da API oficial do FlyWire (fafbseg-py) para enriquecimento de dados.
  Ative quando precisar buscar nomes de neurônios, tipos celulares, conectividade ao vivo,
  ou cruzar root_ids com anotações biológicas via API — em vez de usar apenas o CSV local.
trigger: model_decision
---

# ConnectomeBench — FlyWire API (fafbseg-py)

## Referências Oficiais
- **Biblioteca:** `navis-org/fafbseg-py` — https://github.com/navis-org/fafbseg-py
- **Documentação:** https://fafbseg-py.readthedocs.io/
- **Fonte dos exemplos:** documentação oficial v3.2.2, tutorial "Fetching connectivity"

---

## Instalação (Kaggle ou ambiente com internet)

```bash
pip install fafbseg navis
```

---

## Regras Críticas de Uso

1. **Sempre use o dataset público** (`"public"`) para experimentos reprodutíveis:
   ```python
   from fafbseg import flywire
   flywire.set_default_dataset("public")
   ```

2. **Materializações:** O dataset público usa a versão **v630**. Root IDs devem existir nessa versão.
   ```python
   # Verifica se o root_id existe na materialização atual
   from fafbseg import flywire
   flywire.is_latest_root(720575940625363947)
   
   # Lista versões disponíveis
   flywire.get_materialization_versions(dataset="public")
   ```

3. **Nunca misture root IDs de versões diferentes** em uma mesma query — causa erro.

4. **API requer token:** Configure em variável de ambiente ou via `CODEX_API_TOKEN`.

---

## Padrão 1: Buscar Sinapses de um Neurônio

```python
from fafbseg import flywire

# Busca sinapses (entrada e saída) do nosso neurônio de teste
syn = flywire.get_synapses(
    720575940625363947,
    materialization="auto"  # "auto" detecta a versão correta automaticamente
)

# syn é um DataFrame com colunas:
# pre_pt_root_id, post_pt_root_id, syn_score, x, y, z (coordenadas 3D)
print(syn.head())
print(f"Total de sinapses: {len(syn)}")
```

---

## Padrão 2: Buscar Lista de Conexões (Edge List)

```python
from fafbseg import flywire

# Lista de root_ids de interesse
roots_of_interest = [720575940625363947]

# Busca parceiros (entrada e saída)
edge_list = flywire.get_connectivity(roots_of_interest)

# edge_list tem colunas:
# pre_root_id, post_root_id, syn_count, neuropil
print(edge_list.head())
```

---

## Padrão 3: Buscar Anotações e Tipos Celulares via API

```python
from fafbseg import flywire

# Busca anotações hierárquicas (tipo celular, família, etc.)
annotations = flywire.get_hierarchical_annotations(720575940625363947)

# Busca anotações textuais livres da comunidade
community = flywire.search_community_annotations(720575940625363947)

# Verificar se um neurônio foi revisado (proofreading completo)
is_pr = flywire.is_proofread(720575940625363947)
print(f"Neurônio revisado: {is_pr}")
```

---

## Padrão 4: Atualizar Root IDs Desatualizados

```python
from fafbseg import flywire

# Se um root_id não existir na materialização atual, atualize-o
updated_id = flywire.update_ids(
    720575940625363947, 
    timestamp="mat_630"  # Versão pública
)
print(f"ID atualizado: {updated_id}")
```

---

## Integração com o Nosso Dataset Local

> ⚠️ **Diferença importante de contexto:**
> - O CSV local (`connections_princeton.csv.gz`) usa **`syn_count`** como número de sinapses estruturais.
> - A API do `fafbseg` usa **`syn_score`** como score de confiança da sinapse detectada.
> - São métricas diferentes. Nunca cruze os valores como se fossem equivalentes.

```python
# Maneira correta de enriquecer o dataset local com dados da API:
import pandas as pd
from fafbseg import flywire

# 1. Carrega dataset local (fonte da verdade)
df = pd.read_csv('data/raw/connections_princeton.csv.gz')

# 2. Pega neurônios únicos
unique_neurons = df['pre_root_id'].unique()[:10]  # Exemplo com 10 neurônios

# 3. Busca anotações para esses neurônios via API
# (fazer em lotes pequenos para não estourar o rate limit)
annotations = {}
for root_id in unique_neurons:
    try:
        ann = flywire.get_hierarchical_annotations(root_id)
        annotations[root_id] = ann
    except Exception as e:
        annotations[root_id] = None
        print(f"Aviso: {root_id} sem anotação ({e})")
```

---

## Quando NÃO usar a API

- Quando o dado já está no CSV local (`syn_count`, `neuropil`, `nt_type`) — **use o CSV**.
- Para cálculos globais de grau, distribuição, sparsity — **use a Matriz Esparsa local**.
- Para análise de topologia em escala total — **use os dados locais + scipy**.

A API é complementar, não substituta. Use-a para:
- Buscar nomes biológicos de neurônios específicos.
- Validar root IDs contra versões de materialização.
- Enriquecer um subconjunto pequeno de neurônios de interesse.
