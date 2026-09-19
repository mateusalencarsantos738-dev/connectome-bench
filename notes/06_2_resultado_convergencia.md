# Resultados da Fase 6.2: Convergência e Robustez Estatística

**Data:** 19 de Setembro de 2026
**Dataset:** MNIST — 10.000 imagens, 5 épocas, **10 seeds fixas** (10, 20, ..., 100)
**Hardware:** Kaggle GPU T4x2 (verificar com `torch.cuda.device_count()` se 1 ou 2 GPUs foram efetivamente utilizadas — o código não usa DataParallel, portanto provavelmente apenas 1 T4 estava ativa)

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

| Época | Random − FlyWire | Degree-Matched − FlyWire |
|---|---|---|
| 1 | **−1.20 p.p.** | **+1.25 p.p.** |
| 2 | +0.02 p.p. | +0.52 p.p. |
| 3 | +0.52 p.p. | +0.42 p.p. |
| 4 | +0.62 p.p. | +0.30 p.p. |
| 5 | **+0.87 p.p.** | +0.25 p.p. |

**Época 1:** DegMatched (84.76%) > FlyWire (83.51%) > **Random (82.31%)**
**Época 2:** Todas convergem para a faixa 94.4–94.9% (praticamente indistinguíveis)
**Época 5:** **Random (98.24%)** > DegMatched (97.62%) > FlyWire (97.37%)

O Random não é simplesmente "melhor". Ele tem uma **dinâmica de treinamento diferente**: começa mais devagar e termina mais alto. DegMatched e FlyWire (ambos com distribuição de grau heavy-tailed) têm padrão oposto.

**Pergunta que emerge:** Por que determinadas topologias aprendem mais rápido no início, enquanto outras obtêm maior desempenho final?

**O que os dados NÃO demonstram ainda:** As explicações causais (saturação de hubs, fluxo de gradiente, suavidade do espaço de otimização) são hipóteses plausíveis mas sem suporte experimental neste momento. Para testá-las, precisamos medir norma de gradiente por época, ativação média e variância dos pesos — o que será feito na Fase 6.3C.

### Significância estatística (pendente de teste formal)

Com 10 seeds usando as **mesmas seeds em cada arquitetura**, o design experimental permite **t-test pareado** e **Wilcoxon signed-rank**, aproveitando o pareamento seed-a-seed.

Intervalos de ±1 std (descritivos, não são IC 95%):
- Random: [97.96%, 98.52%]
- DegMatched: [97.18%, 98.06%]
- FlyWire: [97.02%, 97.72%]

Random e DegMatched têm sobreposição marginal. Para as 3 comparações (FlyWire vs Random, FlyWire vs DegMatched, Random vs DegMatched), aplicar correção Holm para múltiplos testes.

**Não usar a expressão "confirmado estatisticamente" até executar esses testes.** Os resultados são *consistentes em 10 seeds*, mas isso ainda não é equivalente a um teste de significância formal.

### O que esta fase não responde

1. Se o gap de ~0.87 p.p. (Random vs FlyWire na época 5) **persiste ou fecha** com 10, 20, 30 épocas — necessita rodar mais épocas na RTX local.
2. A causa do cruzamento na época 1 — necessita análise de norma de gradiente por camada.
3. A causa da diferença de tempo de execução (~18%) entre Random e os outros dois — ainda hipótese.

---

## Próximos Passos Imediatos

1. **Fase 6.3 (RTX local):** Rodar 20–30 épocas para verificar se o gap fecha ou persiste na convergência total.
2. **Fase 6.3 — Profiling:** `torch.cuda.Event` por batch para isolar forward/backward. Adicionar FlyWire com IDs permutados para testar hipótese de localidade de índices CSR.
3. **Teste estatístico formal:** Aplicar t-test pareado entre as 10 acurácias finais de cada par de arquiteturas.
