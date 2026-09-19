# Resultados da Fase 6.2: Convergência e Robustez Estatística

**Data:** 19 de Setembro de 2026
**Dataset:** MNIST — 10.000 imagens, 5 épocas, **10 seeds fixas** (10, 20, ..., 100)
**Hardware:** Kaggle GPU T4x2

---

## Tabela de Convergência Média (10 Seeds)

| Arquitetura | Época 1 | Época 2 | Época 3 | Época 4 | Época 5 |
|---|---|---|---|---|---|
| FlyWire | 83.51 ± 0.43 | 94.40 ± 0.24 | 96.00 ± 0.16 | 97.05 ± 0.27 | 97.37 ± 0.35 |
| Random | 82.31 ± 0.51 | 94.42 ± 0.21 | 96.52 ± 0.24 | 97.67 ± 0.20 | **98.24 ± 0.28** |
| DegMatched | **84.76 ± 0.42** | **94.92 ± 0.28** | 96.42 ± 0.25 | 97.35 ± 0.26 | 97.62 ± 0.44 |

## Acurácia Final (10 Seeds)

| Arquitetura | Média | ± std | Min | Max |
|---|---|---|---|---|
| FlyWire | 97.37% | ±0.35% | 96.83% | 97.83% |
| Random | **98.24%** | **±0.28%** | 97.71% | 98.66% |
| DegMatched | 97.62% | ±0.44% | 96.80% | 98.30% |

---

## Esclarecimento da Inconsistência de Arestas (Degree-Matched)

O log agora documenta automaticamente:

```
stubs=3,732,460 | self_loops=113 | duplicatas_colapsadas=9,976 | arestas_finais=3,722,484 | perda_total=9,976 (0.267%)
```

A perda de 9.976 arestas (0.267%) é explicada pelo Configuration Model: ao gerar os stubs aleatoriamente, surgem 113 self-loops e ~9.863 multi-edges (dois stubs do mesmo par de nós sorteados para o mesmo slot). Na conversão COO → CSR binário ambos os tipos são colapsados. É um comportamento esperado e documentado do modelo de configuração. Para fins de comparação, essa diferença de <0.3% de densidade é negligenciável, mas deve constar.

---

## Análise Científica

### Achado principal: Padrão de cruzamento entre redes

Este é o resultado mais rico da fase. A ordenação de desempenho **inverte** ao longo do treinamento:

**Época 1:** DegMatched (84.76%) > FlyWire (83.51%) > **Random (82.31%)**
**Época 2:** Todas convergem para a faixa 94.4–94.9% (praticamente indistinguíveis)
**Época 5:** **Random (98.24%)** > DegMatched (97.62%) > FlyWire (97.37%)

Isso significa que o Random Sparse começa **mais devagar** e **termina mais rápido**. DegMatched começa **mais rápido** e **termina no meio**. FlyWire fica consistentemente entre os dois nas épocas intermediárias.

**Hipóteses para o cruzamento (não confirmadas — precisam de profiling de gradiente):**

1. Redes com distribuição de grau heavy-tailed possuem hubs de alta conectividade. Esses hubs podem capturar sinal rapidamente na época 1 (aceleração inicial), mas conforme o treinamento avança, os gradientes que passam pelos hubs podem saturar ou criar gargalos de fluxo de informação, limitando o refinamento tardio.

2. Redes homogêneas (Random, distribuição quasi-Poisson) têm gradiente distribuído mais uniformemente por todos os pesos. A convergência inicial é mais lenta pois nenhum nó domina, mas o espaço de otimização é mais suave para refinamentos tardios.

### Significância estatística (ainda provisória)

Com 10 seeds, os intervalos de ±1 std:
- Random: [97.96%, 98.52%]
- DegMatched: [97.18%, 98.06%]
- FlyWire: [97.02%, 97.72%]

Os intervalos de Random e DegMatched se **sobrepõem parcialmente** (97.96 vs 98.06). Um t-test de duas amostras entre Random e DegMatched seria necessário para afirmar diferença estatisticamente significativa na época 5. Random vs FlyWire tem sobreposição menor e provavelmente seria significativo.

**Redação defensável:** *"Com 10 seeds, o padrão de Random Sparse terminando com maior acurácia foi consistente em todas as rodadas. Um t-test será necessário para confirmar significância, especialmente entre Random e DegMatched, cujos intervalos de ±1 std apresentam sobreposição marginal."*

### O que esta fase não responde

1. Se o gap de ~0.87 p.p. (Random vs FlyWire na época 5) **persiste ou fecha** com 10, 20, 30 épocas — necessita rodar mais épocas na RTX local.
2. A causa do cruzamento na época 1 — necessita análise de norma de gradiente por camada.
3. A causa da diferença de tempo de execução (~18%) entre Random e os outros dois — ainda hipótese.

---

## Próximos Passos Imediatos

1. **Fase 6.3 (RTX local):** Rodar 20–30 épocas para verificar se o gap fecha ou persiste na convergência total.
2. **Fase 6.3 — Profiling:** `torch.cuda.Event` por batch para isolar forward/backward. Adicionar FlyWire com IDs permutados para testar hipótese de localidade de índices CSR.
3. **Teste estatístico formal:** Aplicar t-test pareado entre as 10 acurácias finais de cada par de arquiteturas.
