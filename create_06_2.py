import nbformat as nbf

nb = nbf.v4.new_notebook()

nb.cells.append(nbf.v4.new_markdown_cell("""# ConnectomeBench: Fase 6.2 — Convergência e Robustez Estatística

**Objetivos:**
1. Determinar se o gap de ~0.84% entre Random Sparse e FlyWire/Degree-Matched é:
   - (A) Diferença de capacidade, ou
   - (B) Diferença de velocidade de convergência
2. Aumentar de 3 para **10 seeds** para robustez estatística.

A curva de acurácia por época é o principal artefato desta fase.
"""))

nb.cells.append(nbf.v4.new_code_cell("""import sys
import os
import time
import logging

sys.path.append(os.path.abspath('..'))

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

import numpy as np

from src.graph.builder import ConnectomeBuilder
from src.data.cell_mapper import CellTypeMapper
from src.models.sparse_layer import ConnectomeModel
from src.topology.metrics import get_degrees
from src.models.baselines import generate_random_sparse, generate_degree_matched

logging.basicConfig(level=logging.INFO)

import warnings
warnings.filterwarnings("ignore")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 1. Carregando Grafos"""))

nb.cells.append(nbf.v4.new_code_cell("""CONNECTIONS_PATH = "../data/raw/connections_princeton.csv.gz"
CELL_TYPES_PATH = "../data/raw/consolidated_cell_types.csv.gz"

import pandas as pd
df = pd.read_csv(CONNECTIONS_PATH)
builder = ConnectomeBuilder(df)
adj_real, mapper = builder.build_sparse_matrix(weight_col='syn_count')
adj_real.data = np.ones_like(adj_real.data)

N = mapper.num_nodes
E = adj_real.nnz
density = E / (N * N)
in_d, out_d = get_degrees(adj_real)

adj_random = generate_random_sparse(N, density, seed=42)
# O log abaixo mostrará self-loops e duplicatas colapsadas na conversão CSR
adj_degree = generate_degree_matched(in_d, out_d, seed=42)

print(f"FlyWire:       {adj_real.nnz:,} edges")
print(f"Random Sparse: {adj_random.nnz:,} edges")
print(f"Degree-Matched:{adj_degree.nnz:,} edges")
print(f"Discrepância Degree-Matched: {adj_real.nnz - adj_degree.nnz:,} edges perdidas por self-loops/duplicatas")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 2. Definindo Conexões Sensoriais e Motoras"""))

nb.cells.append(nbf.v4.new_code_cell("""cell_mapper = CellTypeMapper()
cell_mapper.fit(CELL_TYPES_PATH)

sensory_indices, motor_indices = [], []

for i in range(mapper.num_nodes):
    real_id = mapper.get_root_id(i)
    bio_type = cell_mapper.get_type(real_id).lower()
    if "sensory" in bio_type or "visual" in bio_type or "olfactory" in bio_type or "t4" in bio_type or "t5" in bio_type:
        sensory_indices.append(i)
    elif "motor" in bio_type or "descending" in bio_type or "dnon" in bio_type:
        motor_indices.append(i)

if len(sensory_indices) < 100:
    from src.topology.metrics import find_hubs
    sensory_indices = find_hubs(in_d, 1000)[0].tolist()
if len(motor_indices) < 10:
    from src.topology.metrics import find_hubs
    motor_indices = find_hubs(out_d, 1000)[0].tolist()

print(f"Sensoriais: {len(sensory_indices):,} | Motores: {len(motor_indices):,}")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 3. Preparando Dataset"""))

nb.cells.append(nbf.v4.new_code_cell("""device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Ambiente: {device}")

transform = transforms.Compose([transforms.ToTensor(), transforms.Lambda(lambda x: torch.flatten(x))])
train_dataset = datasets.MNIST('../data/external', train=True, download=True, transform=transform)

subset_indices = list(range(10000))
train_subset = torch.utils.data.Subset(train_dataset, subset_indices)
train_loader = DataLoader(train_subset, batch_size=128, shuffle=True)

INPUT_DIM = 784
OUTPUT_DIM = 10
EPOCHS = 5  # curva de convergência por época; rodar mais épocas na RTX local
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 4. Bateria de 10 Seeds — Curva de Convergência"""))

nb.cells.append(nbf.v4.new_code_cell("""def train_graph_curve(adj_matrix, seed, epochs=EPOCHS):
    torch.manual_seed(seed)
    
    model = ConnectomeModel(
        input_dim=INPUT_DIM,
        hidden_dim=N,
        output_dim=OUTPUT_DIM,
        adj_mask=adj_matrix,
        sensory_indices=sensory_indices,
        motor_indices=motor_indices
    ).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    model.train()
    
    epoch_acc = []
    epoch_loss = []
    
    for epoch in range(epochs):
        total_loss = 0
        correct = 0
        total = 0
        
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += batch_y.size(0)
            correct += predicted.eq(batch_y).sum().item()
        
        epoch_acc.append(100. * correct / total)
        epoch_loss.append(total_loss / len(train_loader))
    
    return epoch_acc, epoch_loss

SEEDS = list(range(10, 110, 10))  # 10 seeds: 10, 20, 30, ..., 100

competitors = {
    "FlyWire":    adj_real,
    "Random":     adj_random,
    "DegMatched": adj_degree
}

# Estrutura: results[name] = lista de (epoch_acc_list) por seed
curves = {name: [] for name in competitors}

print(f"Iniciando bateria: {len(SEEDS)} seeds × {len(competitors)} grafos × {EPOCHS} épocas")
print(f"Total de runs: {len(SEEDS) * len(competitors)}\\n")

for name, matrix in competitors.items():
    print(f"--- {name} ---")
    for s in SEEDS:
        acc_curve, _ = train_graph_curve(matrix, seed=s, epochs=EPOCHS)
        curves[name].append(acc_curve)
        print(f"  Seed {s:3d} -> Épocas: {[f'{a:.2f}%' for a in acc_curve]}")
    print()
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 5. Tabela Estatística e Curva de Convergência"""))

nb.cells.append(nbf.v4.new_code_cell("""print("\\n--- TABELA DE CONVERGÊNCIA MÉDIA (10 Seeds | 10k Imagens) ---")
print(f"{'Arquitetura':15s} | " + " | ".join([f"Época {e+1}" for e in range(EPOCHS)]))
print("-" * (15 + (EPOCHS * 13)))

for name, seed_curves in curves.items():
    arr = np.array(seed_curves)  # shape (n_seeds, n_epochs)
    means = arr.mean(axis=0)
    stds = arr.std(axis=0)
    row = f"{name:15s} | " + " | ".join([f"{m:.2f}±{s:.2f}" for m, s in zip(means, stds)])
    print(row)

print()
print("--- ACURÁCIA FINAL (Época {EPOCHS}) ---")
for name, seed_curves in curves.items():
    arr = np.array(seed_curves)
    final_accs = arr[:, -1]
    print(f"{name:15s} -> {final_accs.mean():.2f}% ± {final_accs.std():.2f}% (min={final_accs.min():.2f}%, max={final_accs.max():.2f}%)")
"""))

nbf.write(nb, 'notebooks/06_2_convergence.ipynb')
print("Notebook 06_2_convergence.ipynb criado com sucesso.")
