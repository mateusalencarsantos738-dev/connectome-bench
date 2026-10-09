# Referência detalhada — principles and operations

Este documento preserva integralmente as seções indicadas do antigo `AGENTS.md` (estado em 2026-10-08). Leia apenas quando a tarefa exigir o tema. Declarações de "estado atual", próximos passos e números devem ser conferidos nos arquivos e registros experimentais mais recentes; este texto não comprova execução.

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
12. The connectome is a source of hypotheses, not necessarily the final architecture. Discovered properties may be abstracted, modified, and optimized beyond the original biological topology.

Examples of legitimate negative findings:

- lower FLOPs but higher latency because of irregular memory access;
- good temporal performance but poor image-classification performance;
- sparse mathematics without real hardware speedup;
- connectome topology helping only selected task classes.

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

