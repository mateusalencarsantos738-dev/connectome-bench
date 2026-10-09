# Referência detalhada — experiment protocols

Este documento preserva integralmente as seções indicadas do antigo `AGENTS.md` (estado em 2026-10-08). Leia apenas quando a tarefa exigir o tema. Declarações de "estado atual", próximos passos e números devem ser conferidos nos arquivos e registros experimentais mais recentes; este texto não comprova execução.

## 9. Main experimental hypotheses

### H1 — Sparsity

Question:

> Can sparse topology reduce parameters and arithmetic work without unacceptable accuracy loss?

Compare:

```text
Dense
Random Sparse
Degree-Matched Sparse
FlyWire Sparse
```

Measure:

- accuracy
- parameter count
- estimated FLOPs/MACs
- latency
- throughput
- peak RAM
- peak VRAM

Important:
Lower FLOPs do not guarantee lower latency.

---

### H2 — Connectome topology vs random sparsity

Never compare only:

```text
Dense vs FlyWire
```

Use controls:

```text
A = Dense

B = Random Sparse
    same approximate density

C = Degree-Matched Sparse
    approximately preserves in/out degree statistics,
    but randomizes who connects to whom

D = FlyWire Sparse
    preserves the real connectome topology
```

Interpretation:

- If D beats B but not C, the advantage may largely be degree structure.
- If D beats C, specific topology becomes more interesting.

This is a key experimental design requirement.

---

### H3 — Modularity

Question:

> Can modular organization reduce unnecessary computation?

Compare:

- globally dense routing
- generic modular routing
- FlyWire-derived modules
- randomized modules with matched sizes

Potential tasks:

- multitask classification
- conditional computation
- routing
- mixture-of-experts-like workloads

Measure:

- active modules
- operations per sample
- latency
- accuracy
- memory traffic when measurable

---

### H4 — Hubs / rich-club

Question:

> Can a relatively small set of highly connected nodes support global integration efficiently?

Important:
Rich-club is an observed structural property, not proof of a computational advantage.

Compare:

- full topology
- topology with high-degree hubs removed
- randomized hub placement
- degree-matched controls

Measure:

- path lengths
- active edges
- task accuracy
- compute
- latency

---

### H5 — Recurrence / reciprocal connectivity

Question:

> Does connectome-like recurrence help temporal memory?

Compare:

- feed-forward sparse
- generic recurrent
- FlyWire-derived recurrence
- randomized recurrence with matched edge counts

Potential tasks:

- sequence classification
- temporal prediction
- short-term memory
- control

Measure:

- sequence accuracy
- latency
- active states
- recurrent activity
- memory footprint

---

### H6 — Event-driven computation / SNN

Later stage:

Implement a simple LIF-style model.

Concept:

```text
input
  ↓
membrane state
  ↓
threshold
  ↓
spike
  ↓
connected targets updated
```

Question:

> Does event-driven sparse activity reduce actual computational work enough to outperform conventional dense computation on the target hardware?

Potential platforms:

- CPU
- NVIDIA GPU
- later, neuromorphic hardware if accessible

Intel Loihi 2 is an example of hardware designed around sparse/event-driven neuromorphic computation.

Reference:
https://www.intel.com/content/www/us/en/research/neuromorphic-computing.html

---

## 10. Model benchmark progression

Start small.

### Stage A

MNIST

Purpose:

- fast iteration
- debugging
- clean ablations

### Stage B

Fashion-MNIST

Purpose:

- harder classification

### Stage C

CIFAR-10

Purpose:

- test whether findings survive richer inputs

Do not start with:

- LLMs
- giant Transformers
- huge datasets

First isolate architecture effects.

---

## 11. Proposed architecture

A useful abstraction:

```text
Input
  ↓
Encoder
  ↓
Sparse / Connectome layer
  ↓
Readout
  ↓
Output
```

Conceptually:

```text
input
  ↓
projection
  ↓
N internal nodes
  ↓
connectivity mask
  ↓
internal dynamics
  ↓
readout
  ↓
class/action
```

The connectivity mask may be:

- dense
- random sparse
- degree-matched
- FlyWire-derived

---

## 12. Separate topology from weights

Important experiment:

### A

FlyWire topology + trainable weights

### B

FlyWire topology + fixed/random weights

### C

Random topology + trainable weights

### D

Degree-matched topology + trainable weights

This helps distinguish:

- topology effects
- sparsity effects
- learned-weight effects

Do not attribute a gain to "connectome structure" without appropriate controls.

---

## 13. Hardware research track

The project explicitly studies the difference between mathematical complexity and physical execution.

Important principle:

```text
Lower FLOPs
≠
automatically faster
```

Sparse irregularity can introduce:

- index overhead
- non-contiguous memory access
- poor hardware utilization
- kernel overhead
- insufficient batching
- weak sparse-kernel support

Therefore report both:

- theoretical cost
- measured performance

---

## 14. Hardware benchmark matrix

Initial benchmark:

```text
                         CPU        NVIDIA GPU
Dense                      ✓             ✓
Random Sparse              ✓             ✓
Degree-Matched Sparse      ✓             ✓
FlyWire Sparse             ✓             ✓
SNN                        ✓             ✓
```

Later:

```text
                         Conventional   Neuromorphic
Event-driven SNN               ✓              ✓
Dense ANN                      ✓              -
Sparse ANN                     ✓              ✓/depends
```

Record for each benchmark:

- exact hardware
- software versions
- precision
- batch size
- graph size
- sparsity
- warmup policy
- number of repetitions
- timing method

Never fabricate hardware-performance numbers.

---

## 15. Structured sparsity track

Compare:

```text
Dense
Random Sparse
FlyWire Sparse
Block Sparse
2:4 Structured Sparse
```

Question:

> Is biologically inspired irregular sparsity useful on current GPUs, or does hardware-friendly structured sparsity win because it is easier for the accelerator to exploit?

NVIDIA documents 2:4 structured sparsity through cuSPARSELt on supported architectures.

Reference:
https://developer.nvidia.com/cusparse

---

## 16. Memory movement is a first-class metric

Try to measure or estimate:

- parameter bytes
- activation bytes
- sparse index bytes
- memory bandwidth
- peak VRAM
- host/device transfers
- cache behavior when tooling permits
- kernel time

Reason:

```text
data movement can dominate arithmetic
```

Sparse representations can reduce arithmetic while adding index/memory overhead.

---

## 22. Reproducibility

Every important experiment must record:

```text
dataset/version
random seed
Python version
framework version
hardware
precision
batch size
epochs/steps
learning rate
model configuration
sparsity
graph threshold
training time
inference timing methodology
```

Prefer config files for experiment definitions.

---

## 23. Benchmark methodology

For latency:

1. warm up the model;
2. synchronize the GPU when applicable;
3. run multiple repetitions;
4. report median and dispersion;
5. keep batch size explicit.

For training:

- fixed dataset split
- fixed budget
- fixed optimizer where comparison requires it
- multiple seeds for important results

For topology comparisons:

- match node count where reasonable
- match target sparsity when testing topology
- match degree statistics when testing specific topology effects
- change one major variable at a time

---

## 24. Ablation strategy

Core ablations:

```text
Full FlyWire topology
        ↓
remove rich-club structure
        ↓
remove reciprocity
        ↓
remove modularity
        ↓
remove selected motif structure
        ↓
remove long-range edges
```

Also compare:

```text
FlyWire
vs
Degree-Matched Random
vs
Uniform Random
```

Goal:
determine whether an observed result comes from:

- generic sparsity
- degree distribution
- hubs
- modularity
- reciprocity
- motifs
- specific connectivity structure

---

## 26. What a strong result looks like

Strong:

> At matched sparsity and node count, the FlyWire-derived topology improved task accuracy by X while changing measured compute by Y and GPU latency by Z.

Also strong:

> FlyWire sparsity reduced theoretical operations but increased GPU latency because the irregular sparse pattern caused memory/access overhead.

Weak:

> The brain is efficient, therefore the model is efficient.

Weak:

> The model has fewer FLOPs, therefore it is faster.

All final claims must state:

- task
- model
- controls
- hardware
- measurement method
- limitations

---

## 35. Causal evidence rules for properties

If a property of the FlyWire connectome is associated with better performance, this does NOT automatically mean that property caused the improvement.

Required evidence chain:

```text
observation
    ↓
hypothesis
    ↓
controlled experiment
    ↓
profiling / ablation
    ↓
causal evidence
    ↓
optimization
```

Language rules:

Do NOT write:
> "The degree distribution improves GPU performance."

Write initially:
> "The degree distribution is associated with the observed performance pattern."

Only after profiling and controls:
> "The analysis suggests that property X contributes causally to outcome Y, based on [specific evidence]."

Connection to existing results:

The Phase 6–6.2 experiments (FlyWire vs Random Sparse vs Degree-Matched) are an example of why this framework exists. The observed differences in convergence dynamics and execution time motivate the question: "Which specific property is responsible?" The answer requires the causal chain above, not assumption.

When a property appears relevant, the next questions are:
1. Can we reproduce this property independently of the full connectome?
2. Can we modify it?
3. Can we find a version better suited to the target hardware?

Do not alter the numerical results already documented in the notes/ directory.

---

## 36. Multi-objective evaluation

Engineered variants may be evaluated simultaneously on:

- task performance (accuracy, loss)
- latency
- memory (peak RAM, peak VRAM)
- compute (FLOPs/MACs)
- throughput (samples/second)
- energy (when measurable)

A composite score function may be used internally:

```text
score =
    task_performance
    − λ × latency
    − β × memory
    − γ × compute
    − δ × energy
```

Rules:

1. NEVER hide individual metrics behind a composite score.
2. Always report each metric separately.
3. When possible, analyze the Pareto frontier across objectives.
4. Document the weights (λ, β, γ, δ) used if a composite score is reported.

---

