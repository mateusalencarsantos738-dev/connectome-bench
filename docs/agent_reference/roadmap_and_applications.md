# Referência detalhada — roadmap and applications

Este documento preserva integralmente as seções indicadas do antigo `AGENTS.md` (estado em 2026-10-08). Leia apenas quando a tarefa exigir o tema. Declarações de "estado atual", próximos passos e números devem ser conferidos nos arquivos e registros experimentais mais recentes; este texto não comprova execução.

## 6. Immediate objective

The project is currently **before model training**.

The next task is:

```text
DATASET AUDIT
    ↓
GRAPH DEFINITION
    ↓
TOPOLOGY ANALYSIS
    ↓
CONTROL BASELINES
    ↓
CONNECTOME-BASED MODELS
```

Do not jump directly to Minecraft, Guitar Hero, Doom, or large SNN simulations.

---

## 18. Game demonstrations

Games are **demonstrations**, not the core scientific benchmark.

Possible demos:

- Guitar Hero-like timing task
- Minecraft
- Doom-like control
- 2D navigation

Use games to demonstrate:

- sensory encoding
- temporal processing
- motor/readout mapping
- closed-loop control

Do not use game score alone as evidence that the architecture is computationally superior.

---

## 19. Guitar Hero demonstration

Possible pipeline:

```text
game
 ↓
note detector
 ↓
stimulus encoder
 ↓
connectome / SNN
 ↓
readout
 ↓
4-key action
```

Metrics:

- hit rate
- miss rate
- timing error
- reaction latency
- neural events per decision
- compute per decision

Important:
The connectome does not intrinsically understand:

- note color
- keyboard keys
- Guitar Hero rules

Those mappings are engineered by the project.

---

## 20. Minecraft / Doom demonstrations

General closed-loop structure:

```text
environment
 ↓
sensor/frame encoder
 ↓
neural state
 ↓
connectome
 ↓
motor/readout
 ↓
game action
 ↓
environment update
```

Different FlyWire datasets exist.

This project uses:

```text
FAFB v783
Female Adult Fly Brain
```

Other resources, such as male CNS datasets, are different datasets and must not be silently substituted.

If external game research uses a different FlyWire dataset, document the difference explicitly.

---

## 27. Research roadmap

### Phase 0 — Dataset audit

Output:

```text
notebooks/00_dataset_audit.ipynb
```

### Phase 1 — Graph construction

Output:

```text
notebooks/01_graph_construction.ipynb
```

### Phase 2 — Topology analysis

Measure:

- sparsity
- degree
- reciprocity
- hubs
- modularity
- motifs

Output:

```text
notebooks/02_connectome_topology.ipynb
```

### Phase 3 — Cell types

Output:

```text
notebooks/03_cell_type_mapping.ipynb
```

### Phase 4 — Baselines

Build:

- dense
- random sparse
- degree-matched sparse

Output:

```text
notebooks/04_baselines.ipynb
```

### Phase 5 — Connectome architecture

Output:

```text
notebooks/05_connectome_sparse.ipynb
```

### Phase 6 — Ablations

Output:

```text
notebooks/06_ablation.ipynb
```

### Phase 7 — SNN

Output:

```text
notebooks/07_snn.ipynb
```

### Phase 8 — Hardware

Output:

```text
notebooks/08_hardware_benchmark.ipynb
```

### Phase 9 — Game/control demos

Possible:

- Guitar Hero-like task
- Minecraft
- Doom
- navigation

### Phase 10 — Connectome-Inspired Architecture Search
After causal properties are isolated:
- generate topology variants that preserve the useful property
- benchmark variants against FlyWire and controls
- identify Pareto-optimal architectures

Prerequisite: at least one property must be causally validated in Phases 6–8.

### Phase 11 — Hardware-Aware Optimization
- optimize graph ordering, memory layout, and sparse format for target hardware
- compare hardware-optimized variants against unmodified FlyWire
- measure latency, throughput, memory, and energy

### Phase 12 — Cross-Task Validation
- test best variants on Fashion-MNIST, CIFAR-10, and temporal tasks
- determine whether discovered properties generalize or are task-specific

### Phase 13 — Application / Game Demonstrations
Use validated, optimized architectures in closed-loop demos.
This phase subsumes the earlier Phase 9 game concepts but uses architectures that have survived the full discovery-optimization pipeline.

---

## 31. Current starting instruction

Start here:

```text
Inspect project
    ↓
verify dataset access
    ↓
build 00_dataset_audit.ipynb
    ↓
produce reproducible topology statistics
```

Do NOT start with:

- game integration
- giant neural simulations
- massive downloads
- arbitrary cell-ID guesses
- model training before the dataset audit

The purpose of the first stage is to establish a trustworthy quantitative description of the real FlyWire data that will serve as the foundation for every later experiment.

---

## 32. Connectome-Inspired Architecture Search

The project does not require literally copying the FlyWire connectome into every model.

The FlyWire connectome may be used as:

- source of hypotheses;
- biological baseline;
- source of topological properties;
- structural constraint;
- discovery space;
- starting point for optimization.

Conceptual pipeline:

```text
BIOLOGY (FlyWire FAFB v783)
    ↓
observation of a structural property
    ↓
computational hypothesis
    ↓
controlled experiment / ablation
    ↓
isolation of the causal property
    ↓
computational abstraction
    ↓
variant generation and optimization
    ↓
hardware co-design
    ↓
validation on additional tasks
```

The final architecture may differ from the original connectome.

This does NOT mean abandoning the FlyWire baseline. FlyWire remains:
- the biological reference;
- the origin of every hypothesis;
- a mandatory comparison target.

It means the project acknowledges that biology solved its optimization problem under biological constraints (energy, volume, development, evolution). Engineering constraints (GPU utilization, memory bandwidth, kernel efficiency, structured sparsity) are different. The biological optimum and the engineering optimum may not coincide.

---

## 33. Architecture naming taxonomy

Three levels of architectures must be distinguished.

### Level A — Biological Baseline

The unmodified FlyWire topology.

Example:
```text
FlyWire
```

### Level B — Scientific Controls

Graphs used to isolate the effect of specific properties.

Examples:
```text
Random Sparse
Degree-Matched
Block Sparse
Reciprocity-Removed
Hub-Removed
```

### Level C — Engineered Variants

Topologies derived from FlyWire insights but intentionally modified.

Examples:
```text
FlyInspired-v1
FlyInspired-v2
HardwareOptimized-v1
```

Naming rule:

Once a topology has been intentionally modified from the original FlyWire graph, it MUST NOT continue to be called "FlyWire." It must receive a new name that identifies:

- parent architecture;
- modifications performed;
- constraints preserved;
- objective;
- seed;
- task;
- hardware;
- results.

Example lineage:

```text
FlyWire
  ↓
FlyInspired-v1  (preserved degree distribution, rewired long-range edges)
  ↓
FlyInspired-v2  (optimized hub placement for T4 GPU)
  ↓
HardwareOptimized-v1  (CSR-reordered for memory locality)
```

---

## 34. Optimizable properties

After a property of the connectome demonstrates experimental value, the project may attempt to find an improved version of that property.

Conceptual flow:

```text
FlyWire
   ↓
discover useful property
   ↓
model mathematically
   ↓
generate variants
   ↓
benchmark variants
   ↓
optimize
   ↓
compare with FlyWire original
```

If a variant outperforms the original FlyWire, this is NOT a failure. It means the connectome was successfully used as a source of discovery.

The following are candidate properties for future investigation. None of these are confirmed to be useful; each requires its own experimental validation.

### Degree Distribution

Investigate:
- mean degree
- degree variance
- heterogeneity
- maximum degree
- hub distribution

Generate artificial distributions and compare.

IMPORTANT: Do not automatically call the distribution "power-law." Use "heavy-tailed" or "highly heterogeneous" until a proper statistical fit (e.g., Clauset et al. methodology) confirms the functional form.

### Hubs / Rich-Club

Possibilities:
- number of hubs
- hub strength
- hub placement
- pruning low-degree nodes
- hub constraints

### Graph Ordering

Keep the exact same topology but test:
- node ordering
- edge ordering
- CSR index ordering
- community-based clustering
- memory locality optimization

Objective: determine whether the same mathematical graph can execute with lower cost when represented differently in memory.

### Topology Rewiring

Test:
- edge addition
- edge removal
- rewiring
- degree-preserving rewiring
- modularity-preserving rewiring
- motif-preserving rewiring

### Hardware-Aware Topology

Test constraints related to:
- block structure
- alignment
- sparse format compatibility
- memory access patterns
- GPU kernel behavior
- structured sparsity (e.g., 2:4)

---

## 37. Discovery vs Optimization

The project has two distinct stages. Do not conflate them.

### Stage: DISCOVERY

Question:
> "Which property of the connectome appears computationally useful?"

Methods:
- controlled comparison (FlyWire vs Random vs Degree-Matched vs ablated variants)
- profiling
- ablation

Output:
- identified candidate property
- causal evidence level

### Stage: OPTIMIZATION

Question:
> "What version of this property produces the best trade-off between task performance and hardware efficiency?"

Methods (future, not implemented now):
- random search
- grid search
- Bayesian optimization
- evolutionary search
- graph rewiring
- constrained optimization
- hardware-aware architecture search

Output:
- optimized variant
- comparison with FlyWire original
- Pareto analysis

IMPORTANT: The Optimization stage does NOT begin until at least one property has been validated in the Discovery stage. The current project is still in the Discovery stage.

The new research direction does NOT interrupt or replace:
- Phase 6.3 (causal investigation)
- profiling
- convergence analysis
- statistical testing
- index-ordering controls
- Block Sparse comparisons
- ongoing hardware benchmarks

These must be completed first.
