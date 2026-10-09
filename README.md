# ConnectomeBench

> Which structural properties of the Drosophila connectome can be translated into mechanisms that reduce compute, memory traffic, latency, or energy without unacceptable loss of task performance, and on which hardware do those advantages actually materialize?

## Project Overview

ConnectomeBench is a research/engineering benchmark that experimentally tests whether structural properties of the FlyWire FAFB v783 connectome (139,255 neurons, ~54.5 million synapses) can be used to inform neural network architectures with measurable efficiency benefits.

**This project measures. It does not assume.**

## Dataset

**FlyWire FAFB v783 — Female Adult Fly Brain**

- Source: [Codex FlyWire](https://codex.flywire.ai/)
- Primary paper: [Nature 2024](https://www.nature.com/articles/s41586-024-07558-y)
- Network statistics: [Nature 2024](https://www.nature.com/articles/s41586-024-07968-y)
- Cell typing: [Nature 2024](https://www.nature.com/articles/s41586-024-07686-5)

Connection table columns: `pre_root_id`, `post_root_id`, `neuropil`, `syn_count`, `nt_type`

## Repository Structure

```
connectome-bench/
├── AGENTS.md               — Agent context and project rules
├── README.md
├── LICENSE
├── requirements.txt
├── .gitignore
├── docs/                   — Documentation index, methods and planning documents
├── data/
│   ├── raw/                — Raw FlyWire downloads (not committed to Git)
│   ├── processed/          — Processed representations
│   └── metadata/           — Cell type tables, annotations
├── notebooks/              — Experimental notebooks (Kaggle/Jupyter)
├── src/                    — Reusable source code
│   ├── data/
│   ├── graph/
│   ├── topology/
│   ├── models/
│   ├── snn/
│   ├── benchmarks/
│   └── utils/
├── configs/                — Experiment configurations
├── results/                — Generated outputs (not committed to Git)
│   ├── tables/
│   ├── figures/
│   └── logs/
└── tests/
```

## Research artifacts

The table records **versioned artifacts**, not independently verified execution status. The notebooks listed here have no saved cell outputs in Git. Use the linked result notes, experiment configuration and original logs before citing a measurement. For methods, hypotheses, Skills and further sources, see the [documentation index](docs/index.md).

| Phase | Versioned notebook | Result note in Git |
|---|---|---|
| 0 — Dataset Audit | [00_dataset_audit.ipynb](notebooks/00_dataset_audit.ipynb) | — |
| 1 — Graph Construction | [01_graph_construction.ipynb](notebooks/01_graph_construction.ipynb) | — |
| 2 — Topology Analysis | [02_connectome_topology.ipynb](notebooks/02_connectome_topology.ipynb) | — |
| 3 — Cell Type Mapping | [03_cell_type_mapping.ipynb](notebooks/03_cell_type_mapping.ipynb) | — |
| 4 — Baselines | [04_baselines.ipynb](notebooks/04_baselines.ipynb) | — |
| 5 — Connectome Architecture | [05_connectome_sparse.ipynb](notebooks/05_connectome_sparse.ipynb) | [05_resultado_poc.md](notes/05_resultado_poc.md) |
| 6 — Ablation Studies | [06_ablation.ipynb](notebooks/06_ablation.ipynb) | [06_resultado_ablacao.md](notes/06_resultado_ablacao.md) |
| 6.1 — Statistical rigor | [06_1_rigor_statistical.ipynb](notebooks/06_1_rigor_statistical.ipynb) | [06_1_resultado_rigor.md](notes/06_1_resultado_rigor.md) |
| 6.2 — Convergence | [06_2_convergence.ipynb](notebooks/06_2_convergence.ipynb) | [06_2_resultado_convergencia.md](notes/06_2_resultado_convergencia.md) |
| 7 — SNN / Event-Driven | No notebook versioned | — |
| 8 — Hardware Benchmark | No notebook versioned | — |

## Core Principles

1. Measure; do not assume.
2. Use controlled baselines (Dense → Random Sparse → Degree-Matched → FlyWire).
3. Lower FLOPs ≠ faster execution.
4. Biological plausibility ≠ computational efficiency.
5. Negative results are valid results.

## References

- FlyWire Codex: https://codex.flywire.ai/
- NVIDIA cuSPARSE: https://developer.nvidia.com/cusparse
- Intel Neuromorphic: https://www.intel.com/content/www/us/en/research/neuromorphic-computing.html
