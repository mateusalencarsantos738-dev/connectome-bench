# Referência detalhada — data and graph

Este documento preserva integralmente as seções indicadas do antigo `AGENTS.md` (estado em 2026-10-08). Leia apenas quando a tarefa exigir o tema. Declarações de "estado atual", próximos passos e números devem ser conferidos nos arquivos e registros experimentais mais recentes; este texto não comprova execução.

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

