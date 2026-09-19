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

**Achado imediato:** O Random tem `Max Degree = 51` e `Var Degree = 26.99`. Isso é quase uma distribuição Poisson, sem hubs. O FlyWire e o Degree-Matched possuem `Max Degree > 5.000` e variância de grau ~3.500, indicando uma distribuição *power-law* — poucos neurônios com milhares de conexões, muitos com poucas. Esse é o dado estrutural que precisávamos para começar a explicar os tempos.

---

## Tabela Estatística Final

| Arquitetura | Acurácia (±std) | Tempo Médio/Época (±std) |
|---|---|---|
| FlyWire | 97.52% ± 0.35% | 33.67s ± 0.02s |
| Random Sparse | **98.36% ± 0.21%** | 39.90s ± 0.00s |
| Degree-Matched | 97.57% ± 0.16% | 33.77s ± 0.01s |

---

## Análise Científica Controlada

### Achado 1: A diferença de acurácia é real
Com 10.000 imagens e 3 seeds, o Random Sparse tem 98.36% ± 0.21% enquanto FlyWire e DegMatched ficam em ~97.5% ± 0.35%. As faixas de erro **não se sobrepõem**, confirmando que o ganho de ~0.8 p.p. para o Random não é ruído experimental.

**Hipótese defensável:** Para classificação *feedforward* estática no MNIST, redes com distribuição de grau uniforme (tipo Poisson) aprendem levemente melhor do que redes com distribuição *power-law*, nessas condições de treinamento.

### Achado 2: FlyWire e Degree-Matched têm tempo idêntico — o Random é o outlier
Os tempos por época:
- FlyWire: **33.67s ± 0.02s**
- DegMatched: **33.77s ± 0.01s** → Praticamente idêntico ao FlyWire
- Random: **39.90s ± 0.00s** → ~18.5% mais lento, com desvio padrão zero (extremamente estável)

O dado crítico: FlyWire e DegMatched emparam em tempo apesar de não preservar a mesma topologia biológica. O que os dois têm em comum? A distribuição de grau *power-law* (Max Degree > 5.000, Var > 3.500). O Random tem distribuição Poisson (Max Degree = 51, Var ≈ 27) e é o único mais lento.

**Hipótese operacional para Fase 8:** A distribuição de grau *power-law* (e não a biologia específica) gera um padrão de esparsidade que é favorável ao hardware nessa implementação. Isso pode ser devido à ordenação dos índices CSR, coalescência de memória, ocupação do kernel, ou outra causa — exige profiling para confirmar.

### O que ainda não provamos
- A causa exata do ganho de tempo (~18%) não foi isolada (não fizemos profiling de kernel CUDA).
- Não testamos Block Sparse ou formatos estruturados para referência.
- Com apenas 5 épocas, as redes podem não ter convergido completamente; o gap poderia diminuir com mais épocas.

---

## Próximos Passos
1. **Fase 8 na RTX local:** Medir com `torch.cuda.Event` a latência real por batch e não por época. Investigar se o kernel do CSR se comporta diferente com distribuição Poisson vs *power-law*.
2. **Controle de convergência:** Rodar até convergência completa (ex: 20+ épocas) para verificar se o gap de 0.8% persiste ou é apenas velocidade de convergência.
3. **Block Sparse como baseline de hardware:** Adicionar o experimento E sugerido anteriormente.
