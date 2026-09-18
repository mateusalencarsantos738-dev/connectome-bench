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
├── docs/                   — Research notes and planning documents
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

## Experimental Roadmap

| Phase | Notebook | Status |
|---|---|---|
| 0 — Dataset Audit | `00_dataset_audit.ipynb` | 🔄 In progress (Kaggle) |
| 1 — Graph Construction | `01_graph_construction.ipynb` | ⏳ Pending |
| 2 — Topology Analysis | `02_connectome_topology.ipynb` | ⏳ Pending |
| 3 — Cell Type Mapping | `03_cell_type_mapping.ipynb` | ⏳ Pending |
| 4 — Baselines | `04_baselines.ipynb` | ⏳ Pending |
| 5 — Connectome Architecture | `05_connectome_sparse.ipynb` | ⏳ Pending |
| 6 — Ablation Studies | `06_ablation.ipynb` | ⏳ Pending |
| 7 — SNN / Event-Driven | `07_snn.ipynb` | ⏳ Pending |
| 8 — Hardware Benchmark | `08_hardware_benchmark.ipynb` | ⏳ Pending |

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
