---
name: sparse-graph-patterns
description: >-
  Padrões de código aprovados para construção e análise de grafos esparsos no ConnectomeBench.
  Ative SEMPRE que for escrever código que usa scipy.sparse, networkx, ou manipula a matriz de adjacência.
trigger: model_decision
---

# ConnectomeBench — Padrões de Grafos Esparsos

## Regra Principal
> **Nunca** use NetworkX para a rede inteira. **Sempre** use matrizes esparsas SciPy para operações globais.

---

## Padrão 1: Construção da Matriz (COO → CSR)

```python
import scipy.sparse as sp
import numpy as np

# 1. SEMPRE construa em COO primeiro (mais rápido para inserção)
adj_coo = sp.coo_matrix((data, (row_idx, col_idx)), shape=(N, N))

# 2. SEMPRE converta para CSR antes de qualquer cálculo
adj_csr = adj_coo.tocsr()

# 3. Use o módulo builder do projeto — NÃO reimplemente do zero
from src.graph.builder import ConnectomeBuilder, NodeMapper
builder = ConnectomeBuilder(df)
adj_matrix, mapper = builder.build_sparse_matrix(weight_col='syn_count')
```

---

## Padrão 2: Operações Aprovadas por Escala

| Operação | Escala | Ferramenta Correta |
|---|---|---|
| Grau de saída (todos os nós) | Global | `np.array(adj_csr.sum(axis=1)).flatten()` |
| Grau de entrada (todos os nós) | Global | `np.array(adj_csr.sum(axis=0)).flatten()` |
| Vizinhos de 1 neurônio | Local | `adj_csr[idx, :].indices` |
| Componentes conectados | Global | `scipy.sparse.csgraph.connected_components(adj_csr)` |
| Caminho mais curto | Local (≤1000 nós) | `scipy.sparse.csgraph.shortest_path(sub_matrix)` |
| Visualização topológica | Subgrafo (<500 nós) | `networkx` sobre submatriz extraída |
| Análise de modularidade | Global | `scipy.sparse.csgraph` ou `igraph` |

---

## Padrão 3: Extração de Subgrafo (Correto)

```python
# CERTO: extraia a submatriz, depois converta para NetworkX
import networkx as nx

neuron_idx = mapper.get_idx(720575940625363947)
neighbor_indices = adj_csr[neuron_idx, :].indices

subgraph_nodes = [neuron_idx] + list(neighbor_indices)
sub_matrix = adj_csr[subgraph_nodes, :][:, subgraph_nodes]

G = nx.from_scipy_sparse_array(sub_matrix, create_using=nx.DiGraph)
```

```python
# ERRADO: nunca faça isso para a rede inteira
G_full = nx.from_scipy_sparse_array(adj_csr)  # ❌ Vai explodir a memória
```

---

## Padrão 4: Métricas Topológicas com `scipy.sparse.csgraph`

```python
from scipy.sparse import csgraph

# Componentes fracamente conectados
n_components, labels = csgraph.connected_components(
    adj_csr, directed=True, connection='weak'
)

# Componentes fortemente conectados
n_strong, labels_strong = csgraph.connected_components(
    adj_csr, directed=True, connection='strong'
)

# Menor caminho de 1 nó para todos os outros (use sub-grafos pequenos)
dist_matrix = csgraph.shortest_path(sub_matrix, directed=True, indices=0)
```

---

## Checklist Antes de Rodar no Kaggle

- [ ] Confirmar que `adj_csr.shape == (138584, 138584)`
- [ ] Confirmar que `adj_csr.sum() == 50_666_648`
- [ ] Confirmar que `adj_csr.nnz` representa pares únicos (não linhas brutas)
- [ ] Não usar `dense arrays` em operações globais
- [ ] Sempre fazer `gc.collect()` após liberar DataFrames grandes
