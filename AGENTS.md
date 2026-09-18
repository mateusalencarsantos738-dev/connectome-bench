# AGENTS.md — ConnectomeBench

## 0. Purpose

This is the persistent context for coding agents working on **ConnectomeBench**.

Read this file before changing code, notebooks, datasets, experiments, or documentation.

ConnectomeBench is a research/engineering project. Its purpose is **not** to assume that a fruit-fly brain is automatically more efficient than modern AI. The project experimentally tests whether structural properties of a real biological connectome can be translated into useful computational mechanisms for artificial neural networks, and whether any gains appear on real hardware.

---

## 1. Project identity

**Project:** ConnectomeBench

**Themes**
- connectomics
- computational neuroscience
- sparse neural networks
- spiking neural networks (SNNs)
- conditional computation
- graph-based neural architectures
- memory locality and data movement
- CPU/GPU performance
- neuromorphic computing

**Main research question**

> Which structural properties of the Drosophila connectome can be translated into mechanisms that reduce compute, memory traffic, latency, or energy without unacceptable loss of task performance, and on which hardware do those advantages actually materialize?

The answer must be established experimentally.

Do not assume the answer.

---

## 2. Core principles

1. Measure; do not assume.
2. Separate biological facts from engineering hypotheses.
3. Use controlled baselines.
4. Do not equate fewer FLOPs with faster execution.
5. Do not equate biological plausibility with computational efficiency.
6. Do not claim general superiority from a single benchmark.
7. Keep dataset versions explicit.
8. Keep raw data separate from processed data.
9. Make experiments reproducible.
10. Prefer small, testable experiments before large simulations.
11. Negative results are valid results.

Examples of legitimate negative findings:
- lower FLOPs but higher latency because of irregular memory access;
- good temporal performance but poor image-classification performance;
- sparse mathematics without real hardware speedup;
- connectome topology helping only selected task classes.

---

## 3. What a connectome is

A connectome is a wiring diagram of a nervous system: neurons are nodes and synaptic connections form directed edges.

Conceptually:

    A ──► B
           └──► C

The current connection table contains:

    pre_root_id
    post_root_id
    neuropil
    syn_count
    nt_type

Meaning:
- `pre_root_id`: presynaptic/source neuron
- `post_root_id`: postsynaptic/destination neuron
- `neuropil`: anatomical region associated with the connection record
- `syn_count`: number of synapses represented by the record
- `nt_type`: neurotransmitter label/prediction associated with the record

`pre_root_id -> post_root_id` is a directed connection.

Do not describe `syn_count` as "signals that occurred." It is a structural synapse count.

Do not treat predicted `nt_type` values as direct experimental ground truth unless the source explicitly supports that interpretation.

---

## 4. Primary biological dataset

Primary dataset:

**FlyWire FAFB v783 — Female Adult Fly Brain**

Official Codex currently lists:
- 139,255 neurons
- 3,732,460 connections

The original FlyWire whole-brain paper reports:
- 139,255 reconstructed neurons
- approximately 54.5 million chemical synapses

A separate network-statistics paper discusses the v783 snapshot and thresholding of connections.

### Critical distinction

Never confuse:

- neurons
- synapses
- unique neuron-to-neuron pairs
- raw download rows
- thresholded graph edges

The current downloaded connection table has been observed to contain:

- 5,342,446 rows
- 5 columns

Columns:

    pre_root_id
    post_root_id
    neuropil
    syn_count
    nt_type

The 5,342,446 figure is a **download row count**, not automatically the number of unique graph edges.

The first audit must compute separately:
- unique neurons
- unique `(pre_root_id, post_root_id)` pairs
- total rows
- total `syn_count`
- thresholded unique pairs
- repeated pairs across attributes such as neuropil
- synaptic-weight distribution

Any graph-size statement must define which of these quantities it refers to.

### Official references

FlyWire/Codex:
https://codex.flywire.ai/

FlyWire connectome paper:
https://www.nature.com/articles/s41586-024-07558-y

FlyWire network statistics:
https://www.nature.com/articles/s41586-024-07968-y

FlyWire cell typing:
https://www.nature.com/articles/s41586-024-07686-5

---

## 5. Current state of the project

### Environment

Main analysis environment:

**Kaggle Notebook**

Reason:
- the developer's local machine has limited RAM;
- graph/data processing can run remotely;
- CPU is sufficient for early analysis;
- GPU should only be enabled when an experiment genuinely benefits from it.

Do not enable GPU by default.

### Internet

Kaggle internet access was successfully tested using:

```python
import requests
r = requests.get("https://codex.flywire.ai", timeout=20)
print(r.status_code)
```

The test returned:

```text
200
```

### Current dataframe

The FlyWire connection product has been successfully downloaded and loaded as:

```python
df
```

Observed:

```text
df.shape == (5342446, 5)
```

Observed columns:

```python
[
    "pre_root_id",
    "post_root_id",
    "neuropil",
    "syn_count",
    "nt_type"
]
```

Use the actual dataframe/schema as the source of truth in code. Never invent column names.

### Current exploratory neuron

A first exploratory neuron was selected:

```text
720575940625363947
```

Exploratory results for that neuron:

```text
Incoming partners: 173
Incoming synapses: 3437

Outgoing partners: 303
Outgoing synapses: 2788
```

These are exploratory values for that neuron and must not be presented as global statistics.

---

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

## 7. First notebook: dataset audit

Create:

```text
notebooks/00_dataset_audit.ipynb
```

It must calculate:

### Basic
- row count
- columns
- dtypes
- missing values
- duplicate rows

### Graph structure
- unique presynaptic neurons
- unique postsynaptic neurons
- unique neurons overall
- unique `(pre, post)` pairs
- connection counts at several synapse thresholds

### Weights
- sum
- mean
- median
- standard deviation
- min/max
- percentiles
- histogram

### Degree
- in-degree
- out-degree
- weighted in-degree
- weighted out-degree

### Directionality
- reciprocal pair count
- reciprocal fraction
- self-loop count

### Metadata
- neuropil counts
- neurotransmitter counts

Every metric must explicitly document whether it is based on:
- raw rows;
- unique neuron pairs; or
- thresholded graph edges.

---

## 8. Graph representation

Use two levels.

### Exploratory analysis

Allowed:
- pandas
- NumPy
- NetworkX

NetworkX is suitable for small/medium subgraphs and graph exploration.

### Large graph / simulation

Do not use a huge NetworkX object as the main million-edge simulation engine.

Prefer:
- SciPy sparse matrices
- CSR/CSC
- COO for construction when appropriate
- PyTorch sparse tensors when appropriate
- CUDA sparse libraries for NVIDIA-specific benchmarks

The representation is part of the performance problem.

NVIDIA documents:
- cuSPARSE for unstructured sparse operations;
- cuSPARSELt for structured sparsity such as 2:4 on supported NVIDIA architectures.

Reference:
https://developer.nvidia.com/cusparse

---

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

## 17. Cell-type integration

After the initial graph audit, download and integrate:

```text
Consolidated Cell Types
```

Use it to map neuron IDs to official biological annotations.

Purpose:
- identify sensory populations
- identify motor/descending populations where available
- associate IDs with biological categories
- define meaningful input/output subsets

Never infer cell function from a numeric ID.

Use official annotation fields.

Reference:
https://www.nature.com/articles/s41586-024-07686-5

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

## 21. Repository structure

Preferred structure:

```text
connectome-bench/
│
├── AGENTS.md
├── README.md
├── LICENSE
├── requirements.txt
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── metadata/
│
├── notebooks/
│   ├── 00_dataset_audit.ipynb
│   ├── 01_graph_construction.ipynb
│   ├── 02_connectome_topology.ipynb
│   ├── 03_cell_type_mapping.ipynb
│   ├── 04_baselines.ipynb
│   ├── 05_connectome_sparse.ipynb
│   ├── 06_ablation.ipynb
│   ├── 07_snn.ipynb
│   └── 08_hardware_benchmark.ipynb
│
├── src/
│   ├── data/
│   ├── graph/
│   ├── topology/
│   ├── models/
│   ├── snn/
│   ├── benchmarks/
│   └── utils/
│
├── configs/
│
├── results/
│   ├── tables/
│   ├── figures/
│   └── logs/
│
└── tests/
```

The exact structure can evolve, but preserve logical separation between:
- raw data
- preprocessing
- graph/topology
- models
- benchmarks
- results

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

## 25. Three project layers

Keep these separate.

### Layer A — Biological data

Real/reconstructed data:
- FlyWire connectome
- synapses
- neuron IDs
- anatomical regions
- cell annotations
- neurotransmitter predictions/labels

### Layer B — Computational abstraction

Engineering choices:
- sparse matrices
- graph representations
- SNNs
- modules
- hubs
- routing
- readouts

### Layer C — Engineering benchmark

Measured implementation:
- CPU
- GPU
- memory
- latency
- throughput
- FLOPs
- energy

Never present Layer B or C as biological fact.

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

---

## 28. Immediate milestone / definition of done

Do not train a model before this is complete:

```text
[ ] raw row count verified
[ ] unique neuron count calculated
[ ] unique pre->post pair count calculated
[ ] thresholded pair counts calculated
[ ] in/out degree distributions calculated
[ ] reciprocal connections calculated
[ ] self-loops checked
[ ] neuropil distribution calculated
[ ] nt_type distribution calculated
[ ] syn_count distribution calculated
[ ] raw vs unique vs thresholded definitions documented
```

After that:
1. define graph representation;
2. run topology analysis;
3. create fair sparse controls;
4. only then begin model training.

---

## 29. Agent operating rules

### Scope
Modify only files necessary for the current task.

### Preservation
Do not rewrite working modules wholesale when a focused change is enough.

### Data safety
Never overwrite raw datasets.

### Dataset integrity
Never silently change dataset versions.

### Scientific integrity
Never turn a hypothesis into a conclusion without measurement.

### Schema integrity
Inspect actual data columns before writing processing code.

### API integrity
Verify current FlyWire/Codex documentation before depending on API endpoints.

### Performance
Profile before optimizing.

### Benchmark integrity
Use identical conditions for compared models unless the experiment explicitly tests a changed condition.

### Error handling
If schema, dataset version, or API behavior differs from expectations, stop and inspect rather than guessing.

### Reproducibility
Save configurations and results.

### Minimal privilege / minimal scope
An agent should not download massive data, alter infrastructure, or modify unrelated modules unless explicitly required by the current experiment.

---

## 30. Canonical references

FlyWire/Codex:
https://codex.flywire.ai/

Primary connectome paper:
https://www.nature.com/articles/s41586-024-07558-y

Network statistics:
https://www.nature.com/articles/s41586-024-07968-y

Cell typing:
https://www.nature.com/articles/s41586-024-07686-5

FlyWire programmatic resources:
https://github.com/seung-lab/FlyConnectome

NVIDIA cuSPARSE / cuSPARSELt:
https://developer.nvidia.com/cusparse

Intel neuromorphic computing:
https://www.intel.com/content/www/us/en/research/neuromorphic-computing.html

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
