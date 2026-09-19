---
name: connectome-data
description: >-
  Schema, estatísticas auditadas e regras de integridade do dataset FlyWire FAFB v783.
  Ative SEMPRE que for escrever código que acessa o CSV de conexões ou o CSV de tipos celulares.
trigger: model_decision
---

# ConnectomeBench — Esquema e Estatísticas Auditadas

## Arquivo Principal de Conexões
**Caminho:** `data/raw/connections_princeton.csv.gz`

### Colunas (exatamente estas — nunca invente outras)
| Coluna | Tipo | Descrição |
|---|---|---|
| `pre_root_id` | int64 | ID do neurônio pré-sináptico (fonte) |
| `post_root_id` | int64 | ID do neurônio pós-sináptico (destino) |
| `neuropil` | object (str) | Região anatômica da conexão |
| `syn_count` | int64 | Número de sinapses estruturais |
| `nt_type` | object (str) | Tipo de neurotransmissor (predito) |

### Estatísticas Auditadas (Fase 0 — Ground Truth)
- **Total de linhas brutas:** 5.342.446
- **Neurônios únicos pré-sinápticos:** a calcular na Fase 2
- **Neurônios únicos pós-sinápticos:** a calcular na Fase 2
- **Neurônios únicos totais (pre ∪ post):** 138.584
- **Pares únicos (pre, post):** verificar após groupby
- **Total de sinapses (soma de syn_count):** 50.666.648

### Neurônio de Teste Padrão do Projeto
```python
TEST_NEURON = 720575940625363947
# Parceiros de entrada: 173 | Sinapses de entrada: 3437
# Parceiros de saída: 303  | Sinapses de saída: 2788
```

---

## Arquivo de Tipos Celulares
**Caminho:** `data/raw/consolidated_cell_types.csv.gz`

> ⚠️ Ainda não auditado. Inspecionar colunas reais antes de escrever código que acessa este arquivo.

---

## Regras de Integridade (OBRIGATÓRIAS)

1. **Nunca invente nomes de colunas.** Use apenas as 5 colunas listadas acima.
2. **`syn_count` é contagem estrutural de sinapses**, não eventos de disparo.
3. **`nt_type` é uma predição**, não um fato experimental direto.
4. **Nunca confunda:** linhas brutas ≠ pares únicos ≠ neurônios únicos.
5. **Ao afirmar qualquer número**, especifique se é baseado em linhas brutas, pares únicos ou arestas filtradas.
6. **Nunca sobrescreva arquivos em `data/raw/`.**

---

## Carregamento Padrão

```python
import pandas as pd

# Carregamento padrão (local ou Kaggle)
df = pd.read_csv('data/raw/connections_princeton.csv.gz')

# Verificação rápida de sanidade
assert df.shape[1] == 5, "Número de colunas inesperado!"
assert set(df.columns) == {'pre_root_id', 'post_root_id', 'neuropil', 'syn_count', 'nt_type'}
assert len(df) == 5_342_446, f"Linhas inesperadas: {len(df)}"
```
