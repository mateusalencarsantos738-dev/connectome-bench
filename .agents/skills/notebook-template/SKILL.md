---
name: notebook-template
description: >-
  Template padrão e checklist de qualidade para notebooks do ConnectomeBench.
  Ative SEMPRE que for criar ou editar um arquivo .ipynb para garantir reprodutibilidade científica.
trigger: model_decision
---

# ConnectomeBench — Template Padrão de Notebooks

## Estrutura Obrigatória de Seções

Todo notebook do projeto DEVE seguir esta ordem:

```
1. Título e Objetivo (Markdown)
2. Configuração do Ambiente (imports + caminhos)
3. Carregamento e Validação dos Dados
4. Análise Principal
5. Resultados e Visualizações
6. Conclusões e Próximos Passos
```

---

## Template de Célula 1 — Cabeçalho (Markdown)

```markdown
# Fase N: [Nome da Fase]

**Objetivo:** [Uma frase clara sobre o que este notebook calcula/demonstra]

**Inputs:**
- `data/raw/connections_princeton.csv.gz` — Dataset bruto de conexões

**Outputs:**
- [Listar arquivos ou objetos produzidos, ex: `results/tables/topology_metrics.csv`]

**Referências:**
- AGENTS.md, Seção N
- [Link para paper relevante se houver]
```

---

## Template de Célula 2 — Configuração do Ambiente

```python
# === Configuração do Ambiente ===
import sys
import os
import time
import gc
import numpy as np
import pandas as pd
import scipy.sparse as sp
from scipy.sparse import csgraph
import matplotlib.pyplot as plt

# Adiciona src ao path (necessário para importar módulos do projeto)
PROJECT_ROOT = os.path.abspath('..')
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Caminhos padronizados
DATA_RAW = os.path.join(PROJECT_ROOT, 'data', 'raw')
DATA_PROCESSED = os.path.join(PROJECT_ROOT, 'data', 'processed')
RESULTS = os.path.join(PROJECT_ROOT, 'results')

# Semente para reprodutibilidade
RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)

print(f"Python: {sys.version}")
print(f"Numpy: {np.__version__}, Pandas: {pd.__version__}, SciPy: {sp.__version__}")
```

---

## Template de Célula 3 — Carregamento com Validação

```python
# === Carregamento e Validação dos Dados ===
CONN_PATH = os.path.join(DATA_RAW, 'connections_princeton.csv.gz')

print(f"Carregando {CONN_PATH}...")
t0 = time.time()
df = pd.read_csv(CONN_PATH)
print(f"Concluído em {time.time()-t0:.2f}s | Shape: {df.shape}")

# Sanidade básica (baseada na auditoria da Fase 0)
assert df.shape == (5_342_446, 5), f"Shape inesperado: {df.shape}"
assert df['syn_count'].sum() == 50_666_648, "Soma de sinapses diverge da auditoria!"
print("✅ Validação OK — dataset íntegro")
```

---

## Regras de Qualidade Científica

1. **Toda afirmação numérica** deve especificar sua base (linhas brutas / pares únicos / neurônios únicos).
2. **Toda métrica de hardware** (tempo, memória) deve incluir: versão, tamanho do batch, número de repetições.
3. **Todo gráfico** deve ter: título, labels nos eixos, e unidades.
4. **Toda célula de conclusão** deve responder: *"O que esse número significa biologicamente?"*
5. **Nunca apresente hipótese como conclusão** antes de medir.

---

## Checklist Antes de Commitar o Notebook

- [ ] Todas as células executadas em ordem (Kernel → Restart & Run All)
- [ ] Sem outputs de erro visíveis
- [ ] Sem caminhos absolutos hardcoded (ex: `/home/teus/...`)
- [ ] Semente aleatória definida explicitamente
- [ ] Seção de Conclusão preenchida com interpretação dos resultados
- [ ] Arquivo salvo com outputs limpos se for pro GitHub (opcional)
