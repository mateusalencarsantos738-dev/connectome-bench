# Resultados da Fase 6.1: Replicação Estatística e Verificação Topológica

**Data:** 19 de Setembro de 2026
**Dataset:** MNIST Clássico — 10.000 imagens, 5 épocas, 3 seeds fixas (10, 20, 30)
**Objetivo:** Verificar se os resultados da Fase 6 eram ruído de mini-batch ou efeito real.

---

## Verificação Topológica (Antes do Treino)

| Arquitetura | Edges | Avg Degree | Max Degree | Var Degree |
|---|---|---|---|---|
| FlyWire | 3.732.460 | 26.93 | **6.261** | **3.689** |
| Random Sparse | 3.732.460 | 26.93 | **51** | **26.99** |
| Degree-Matched | 3.722.484 | 26.86 | **5.825** | **3.527** |

**Achado imediato:** O Random tem `Max Degree = 51` e `Var Degree = 26.99`. Isso é característico de uma distribuição homogênea (compatível com Poisson), sem hubs relevantes. O FlyWire e o Degree-Matched possuem `Max Degree > 5.000` e variância de grau ~3.500, indicando uma distribuição de grau **altamente heterogênea (heavy-tailed)** — poucos neurônios com milhares de conexões, muitos com poucas. Esse é o dado estrutural que precisávamos para começar a levantar hipóteses sobre os tempos. A confirmação de que é especificamente power-law requer ajuste formal de distribuição.

---

## Tabela Estatística Final

| Arquitetura | Acurácia (±std) | Tempo Médio/Época (±std) |
|---|---|---|
| FlyWire | 97.52% ± 0.35% | 33.67s ± 0.02s |
| Random Sparse | **98.36% ± 0.21%** | 39.90s ± 0.00s |
| Degree-Matched | 97.57% ± 0.16% | 33.77s ± 0.01s |

---

## Análise Científica

### Achado 1: Reprodutibilidade confirmada, mas significância estatística ainda incompleta

Nas três seeds avaliadas, Random Sparse apresentou maior acurácia média em todas as rodadas. A magnitude do efeito é de aproximadamente **0.84 ponto percentual** em relação ao FlyWire.

Entretanto, três seeds ainda são insuficientes para tratar essa diferença como evidência estatística definitiva. A ausência de sobreposição dos desvios-padrão não constitui, por si só, um teste estatístico de significância. Uma análise com mais seeds (5–10) e teste estatístico apropriado (t-test ou Wilcoxon) será necessária na Fase 6.2.

**Redação defensável:** *"Os resultados reproduzem consistentemente maior acurácia para Random Sparse nas três seeds avaliadas, com diferença de ~0.84 p.p. em relação ao FlyWire. Essa diferença necessita de mais repetições e teste estatístico antes de ser tratada como confirmada."*

### Achado 2: FlyWire e Degree-Matched têm custo de execução praticamente idêntico

FlyWire: **33.67s ± 0.02s** | Degree-Matched: **33.77s ± 0.01s** | Random Sparse: **39.90s ± 0.00s**

O dado mais importante: apesar de FlyWire e Degree-Matched não compartilharem a mesma conectividade específica, seus tempos são quase idênticos. O único diferente é o Random Sparse — e ele é o único com distribuição de grau homogênea (Max Degree = 51, Var ≈ 27). FlyWire e Degree-Matched possuem grau altamente heterogêneo (Max Degree > 5.000, Var > 3.500).

**Hipótese operacional:** Propriedades estatísticas do padrão de grau podem influenciar fortemente o comportamento computacional dessa implementação, independentemente da topologia biológica específica. Isso ainda é hipótese — a causa exata (distribuição do `row_ptr` no CSR, ocupação de kernel, coalescência de memória) precisa de profiling para ser isolada.

### Ponto de atenção: Distribuição de grau não confirmada como power-law

Escrever "distribuição power-law" com base apenas em Max Degree elevado e variância alta é prematuro. Pode ser heavy-tailed, log-normal, power-law truncada ou outra distribuição assimétrica. A terminologia correta, antes de ajuste formal de distribuição, é **"distribuição de grau altamente heterogênea"** ou **"heavy-tailed"**.

### Inconsistência de arestas — Degree-Matched

```
FlyWire       3.732.460 arestas
Random        3.732.460 arestas
Degree-Match  3.722.484 arestas  (diferença: 9.976 ≈ 0.267%)
```

Essa diferença precisa ser explicada. Causas prováveis no Configuration Model:
- Self-loops removidos na conversão para CSR binário.
- Duplicatas colapsadas ao binarizar a matriz COO.
- Impossibilidade de matching exato com alguns stubs.

Não é grave, mas deve ser documentado no código e controlado nos próximos experimentos.

---

## Próximos Passos — Roadmap Revisado

```
6.1  Replicação (concluído) ✓
  ↓
6.2  Convergência: curvas de 5/10/20/30 épocas + mais seeds
  ↓
6.3  Profiling CUDA: latência por batch (forward/backward/optimizer), ocupação de kernel
  ↓
6.4  Controle de Ordenação: FlyWire com IDs permutados aleatoriamente (isolamento de localidade)
  ↓
6.5  Block Sparse: baseline de esparsidade estruturada para hardware
  ↓
6.6  Ablação de Hubs: remover top-k hubs do FlyWire e medir impacto no tempo
  ↓
7.   SNN / Event-Driven
  ↓
8.   Hardware Benchmark (RTX local)
  ↓
9.   Game Demo (Guitar Hero)
```

**Pergunta central reformulada:** Não mais *"O conectoma é mais eficiente?"*, mas sim *"Quais propriedades estatísticas do conectoma são responsáveis pelo comportamento computacional observado?"*
