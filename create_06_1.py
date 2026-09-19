import nbformat as nbf

nb = nbf.v4.new_notebook()

nb.cells.append(nbf.v4.new_markdown_cell("""# ConnectomeBench: Fase 6.1 - Rigor Estatístico e Profiling

**Objetivo:**
Corrigir falhas experimentais da ablação inicial, garantindo que qualquer vantagem (seja em acurácia ou tempo de execução) seja estatisticamente significativa e as propriedades estruturais que as causam sejam medidas antes do treino.

Esta fase introduz:
1. **Controle de Escala:** Treinamento em 10.000 imagens (em vez de 2.000).
2. **Replicação:** Múltiplas execuções com seeds diferentes para calcular Média ± Desvio Padrão.
3. **Métricas Topológicas Iniciais:** Calcularemos Max Degree, Average Degree e Variância para provar estruturalmente a diferença entre Random e Degree-Matched.
"""))

nb.cells.append(nbf.v4.new_code_cell("""import sys
import os
import time

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

import warnings
warnings.filterwarnings("ignore")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 1. Carregando Grafos e Medindo Topologia"""))

nb.cells.append(nbf.v4.new_code_cell("""CONNECTIONS_PATH = "../data/raw/connections_princeton.csv.gz"
CELL_TYPES_PATH = "../data/raw/consolidated_cell_types.csv.gz"

print("Carregando FlyWire...")
import pandas as pd
df = pd.read_csv(CONNECTIONS_PATH)
builder = ConnectomeBuilder(df)
adj_real, mapper = builder.build_sparse_matrix(weight_col='syn_count')
adj_real.data = np.ones_like(adj_real.data)

N = mapper.num_nodes
E = adj_real.nnz
density = E / (N * N)

in_d, out_d = get_degrees(adj_real)

print(f"Gerando Controles (Seed 42)...")
adj_random = generate_random_sparse(N, density, seed=42)
adj_degree = generate_degree_matched(in_d, out_d, seed=42)

def calculate_topological_metrics(name, adj, in_degrees_precalc=None):
    if in_degrees_precalc is None:
        ind, outd = get_degrees(adj)
    else:
        ind = in_degrees_precalc
        
    avg_deg = np.mean(ind)
    var_deg = np.var(ind)
    max_deg = np.max(ind)
    
    print(f"{name:20s} | Nodes: {adj.shape[0]:,} | Edges: {adj.nnz:,} | Avg Deg: {avg_deg:.2f} | Max Deg: {max_deg:,} | Var Deg: {var_deg:,.2f}")

print("\\n--- VERIFICAÇÃO TOPOLÓGICA ---")
calculate_topological_metrics("1. FlyWire", adj_real, in_d)
calculate_topological_metrics("2. Random Sparse", adj_random)
calculate_topological_metrics("3. Degree-Matched", adj_degree)

# O Random Sparse não possui Hubs (Max degree pequeno, baixa variância).
# O Degree Matched deve ter o Max Deg e Var Deg quase idênticos ao FlyWire.
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 2. Definindo Conexões Sensoriais e Motoras"""))

nb.cells.append(nbf.v4.new_code_cell("""print("Mapeando biologia (Sensores e Motores)...")
cell_mapper = CellTypeMapper()
cell_mapper.fit(CELL_TYPES_PATH)

sensory_indices = []
motor_indices = []

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
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 3. Preparando o Dataset Ampliado
Para diminuir ruído de mini-batch, usaremos **10.000 imagens**.
"""))

nb.cells.append(nbf.v4.new_code_cell("""device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Ambiente: {device}")

transform = transforms.Compose([transforms.ToTensor(), transforms.Lambda(lambda x: torch.flatten(x))])
train_dataset = datasets.MNIST('../data/external', train=True, download=True, transform=transform)

# Aumentamos o subset para 10.000 imagens
subset_indices = list(range(10000))
train_subset = torch.utils.data.Subset(train_dataset, subset_indices)
train_loader = DataLoader(train_subset, batch_size=128, shuffle=True)

INPUT_DIM = 784
OUTPUT_DIM = 10
"""))


nb.cells.append(nbf.v4.new_markdown_cell("""## 4. O Torneio Rigoroso (Múltiplas Seeds)
Testaremos 3 seeds fixas.
"""))

nb.cells.append(nbf.v4.new_code_cell("""def train_graph_with_seed(adj_matrix, seed, epochs=5):
    # Fixar a seed do torch para a inicialização dos pesos ser exata
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
    
    epoch_times = []
    
    for epoch in range(epochs):
        correct = 0
        total = 0
        
        start_time = time.time()
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            _, predicted = outputs.max(1)
            total += batch_y.size(0)
            correct += predicted.eq(batch_y).sum().item()
            
        epoch_times.append(time.time() - start_time)
        
    acc = 100. * correct / total
    avg_time = np.mean(epoch_times)
    return acc, avg_time

competitors = {
    "FlyWire": adj_real,
    "Random": adj_random,
    "DegMatched": adj_degree
}

SEEDS = [10, 20, 30]

final_results = {}

print("Iniciando bateria de treinos (10.000 imagens, 3 seeds, 5 épocas por seed)...\\n")

for name, matrix in competitors.items():
    print(f"Testando {name}...")
    acc_list = []
    time_list = []
    for s in SEEDS:
        acc, avg_t = train_graph_with_seed(matrix, seed=s, epochs=5)
        acc_list.append(acc)
        time_list.append(avg_t)
        print(f"   Seed {s:2d} -> Acc: {acc:.2f}% | Avg Tempo: {avg_t:.2f}s")
        
    final_results[name] = {
        "acc_mean": np.mean(acc_list),
        "acc_std": np.std(acc_list),
        "time_mean": np.mean(time_list),
        "time_std": np.std(time_list)
    }
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 5. Resultados Estatísticos"""))

nb.cells.append(nbf.v4.new_code_cell("""print("\\n--- TABELA ESTATÍSTICA FINAL (3 Seeds | 10k Imagens) ---")
for name, stats in final_results.items():
    print(f"{name:15s} -> Acurácia: {stats['acc_mean']:05.2f}% (±{stats['acc_std']:.2f}%) | Tempo Médio: {stats['time_mean']:.2f}s (±{stats['time_std']:.2f}s)")
"""))

nbf.write(nb, 'notebooks/06_1_rigor_statistical.ipynb')
print("Script create_06_1.py concluído. Notebook gerado.")
