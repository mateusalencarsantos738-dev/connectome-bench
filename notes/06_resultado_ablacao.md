# Resultados da Fase 6: Ablações Topológicas

**Data do Experimento:** 19 de Setembro de 2026
**Dataset:** MNIST Clássico (Subset de 2000 imagens, 5 Épocas)
**Objetivo:** Isolar o ganho da topologia biológica comparando o Cérebro Real contra Controles Matemáticos (Redes Falsas).

## Tabela de Ablação Final

| Arquitetura | Tempo Médio/Época | Acurácia Final | Loss Final |
|---|---|---|---|
| 1. FlyWire (Topologia Biológica) | 7.3s | 96.95% | 0.0907 |
| 2. Random Sparse (Erdős-Rényi) | 8.5s | **97.60%** | **0.0724** |
| 3. Degree-Matched (Preserva Hubs) | 7.4s | **97.55%** | **0.0675** |

## Análise Preliminar do Laboratório

Os dados apresentam diferenças mínimas de desempenho e apontam para fenômenos que requerem investigação estruturada.

1. **Acurácia Sem Vantagem Biológica Direta:**
   No experimento realizado, a topologia FlyWire não apresentou vantagem de acurácia sobre os controles Random Sparse e Degree-Matched no MNIST. Com 96.95% vs ~97.60%, os dados sugerem que (nessas condições específicas de apenas 2000 imagens) a evolução biológica não fornece vantagens para a classificação estática *feedforward* usando nossa implementação `MaskedLinear`.

2. **O Mistério do Tempo de Execução e a Pista do Degree-Matched:**
   O FlyWire e o Degree-Matched completaram cada época em ~7.3s, enquanto o Random Sparse levou 8.5s. A implementação FlyWire foi ~14% mais rápida que a Random Sparse neste benchmark inicial.
   Isso sugere uma hipótese valiosíssima: o ganho de velocidade **pode não vir da topologia biológica completa**, mas sim da preservação da *distribuição de graus* e de como isso afeta a estrutura de armazenamento esparso. O `Degree-Matched` tem a mesma quantidade de "super-hubs" e "nós isolados" que o FlyWire. 

3. **Restrições Anatômicas vs Estrutura Aleatória:**
   A topologia FlyWire possui restrições e organização espacial que podem produzir padrões de computação diferentes dos controles aleatórios. Como apontado pelos autores do mapeamento do FlyWire (Nature), o conectoma possui um rico "rich-club" e hubs inter-lobulares que afetam radicalmente o caminho das informações, diferente do que um modelo Erdős-Rényi faz de forma homogênea.

## Próximos Passos (Correção de Rota)
A conclusão anterior de "abandonar o MNIST" foi precipitada. Encontramos uma anomalia em que topologias diferentes geram acurácias parecidas, mas com tempos de computação distintos. 

Antes de mudar para redes temporais, executaremos a **Fase 6.1**:
- **Replicação:** Testar 3 a 10 seeds diferentes para descartar ruído em diferenças de 0.6%.
- **Volume:** Subir o subset de 2.000 para pelo menos 10.000 imagens do MNIST.
- **Topologia:** Calcular e reportar o max/avg degree antes de explicar os ganhos de tempo.
- **Profiling Cauteloso:** A causa do ganho de velocidade (se é localidade de cache, ordenação de índices, coalescência, etc.) precisará ser testada rigorosamente, não apenas assumida.
