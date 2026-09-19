import nbformat as nbf

nb = nbf.v4.new_notebook()

nb.cells.append(nbf.v4.new_markdown_cell("""# ConnectomeBench: Ablações Topológicas

**Fase 6 do Projeto**

O objetivo principal desta fase é isolar matematicamente as vantagens estruturais da topologia evolutiva do conectoma da mosca. Para isso, criamos "Cérebros Falsos" (Controles) e os colocamos para treinar lado a lado na mesma tarefa:

1. **FlyWire (Real):** O grafo biológico inalterado.
2. **Random (Aleatório):** O mesmo número de nós e arestas, mas as arestas são atiradas de forma 100% aleatória (Modelo Erdős-Rényi).
3. **Degree-Matched (Preservador de Hubs):** Embaralha quem se conecta com quem, mas garante que os neurônios "famosos" continuem tendo a exata mesma quantidade de entradas e saídas (Configuration Model).

*Se o cérebro real vencer todos, provamos cientificamente que existe valor computacional intrínseco nos módulos e caminhos de longa distância da biologia.*
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

# Nossos módulos nativos
from src.graph.builder import ConnectomeBuilder
from src.data.cell_mapper import CellTypeMapper
from src.models.sparse_layer import ConnectomeModel
from src.topology.metrics import get_degrees
from src.models.baselines import generate_random_sparse, generate_degree_matched
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 1. Carregando e Gerando os 3 Cérebros"""))

nb.cells.append(nbf.v4.new_code_cell("""CONNECTIONS_PATH = "../data/raw/connections_princeton.csv.gz"
CELL_TYPES_PATH = "../data/raw/consolidated_cell_types.csv.gz"

print("1. Carregando Cérebro Biológico (FlyWire)...")
import pandas as pd
df = pd.read_csv(CONNECTIONS_PATH)
builder = ConnectomeBuilder(df)

adj_real, mapper = builder.build_sparse_matrix(weight_col='syn_count')
adj_real.data = np.ones_like(adj_real.data) # Força binarização

N = mapper.num_nodes
E = adj_real.nnz
density = E / (N * N)

print(f"   Nodes: {N:,} | Edges: {E:,} | Density: {density:.6f}")

print("\\n2. Extraindo In/Out Degrees para o Modelo de Configuração...")
in_d, out_d = get_degrees(adj_real)

print("\\n3. Gerando Cérebro Aleatório (Erdős-Rényi)...")
# Usaremos uma seed fixa para reprodutibilidade
adj_random = generate_random_sparse(N, density, seed=42)
print(f"   Arestas geradas aleatoriamente: {adj_random.nnz:,}")

print("\\n4. Gerando Cérebro Preservador de Hubs (Degree-Matched)...")
adj_degree = generate_degree_matched(in_d, out_d, seed=42)
print(f"   Arestas geradas (Configuration Model): {adj_degree.nnz:,}")
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

# Safety net para POC
if len(sensory_indices) < 100:
    from src.topology.metrics import find_hubs
    sensory_indices = find_hubs(in_d, 1000)[0].tolist()
    
if len(motor_indices) < 10:
    from src.topology.metrics import find_hubs
    motor_indices = find_hubs(out_d, 1000)[0].tolist()

print(f"Neurônios alocados como SENSORIAIS: {len(sensory_indices):,}")
print(f"Neurônios alocados como MOTORES: {len(motor_indices):,}")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 3. Preparando o Dataset (MNIST) e o Ambiente
Voltaremos ao MNIST em P&B porque ele provou convergir facilmente. Em ablações científicas, queremos o ambiente de aprendizado mais limpo possível para isolar apenas o efeito da topologia da rede.
"""))

nb.cells.append(nbf.v4.new_code_cell("""device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Ambiente: {device}")

# MNIST Clássico
transform = transforms.Compose([transforms.ToTensor(), transforms.Lambda(lambda x: torch.flatten(x))])
train_dataset = datasets.MNIST('../data/external', train=True, download=True, transform=transform)

# Subset rápido (Ablação de Prova de Conceito)
# Aumentamos para 2000 imagens para dar um pouco mais de desafio nas curvas comparativas
subset_indices = list(range(2000))
train_subset = torch.utils.data.Subset(train_dataset, subset_indices)
train_loader = DataLoader(train_subset, batch_size=64, shuffle=True)

INPUT_DIM = 784
OUTPUT_DIM = 10
"""))


nb.cells.append(nbf.v4.new_markdown_cell("""## 4. O Torneio de Ablação
Definimos um Loop genérico e passamos os 3 cérebros falsos e verdadeiros pelo exato mesmo rigor de treinamento.
"""))

nb.cells.append(nbf.v4.new_code_cell("""def train_graph(name, adj_matrix, epochs=5):
    print(f"\\n{'='*50}")
    print(f"Iniciando treinamento da rede: {name}")
    print(f"{'='*50}")
    
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
    
    history = []
    
    for epoch in range(epochs):
        total_loss = 0
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
            
            total_loss += loss.item()
            
            _, predicted = outputs.max(1)
            total += batch_y.size(0)
            correct += predicted.eq(batch_y).sum().item()
            
        acc = 100. * correct / total
        avg_loss = total_loss / len(train_loader)
        duration = time.time() - start_time
        
        print(f"Época {epoch+1}/{epochs} | Tempo: {duration:.1f}s | Loss: {avg_loss:.4f} | Acc: {acc:.2f}%")
        history.append((avg_loss, acc))
        
    return history

# Dicionário com os competidores
competitors = {
    "1. FlyWire (Topologia Biológica Real)": adj_real,
    "2. Random Sparse (Erdős-Rényi)": adj_random,
    "3. Degree-Matched (Preserva Hubs)": adj_degree
}

results = {}

for name, matrix in competitors.items():
    history = train_graph(name, matrix, epochs=5)
    results[name] = history
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 5. Resultados do Laboratório"""))

nb.cells.append(nbf.v4.new_code_cell("""print("\\n--- TABELA DE ABLAÇÃO FINAL (5 Épocas) ---")
for name, history in results.items():
    final_loss, final_acc = history[-1]
    print(f"{name:40s} -> Acurácia: {final_acc:05.2f}% | Loss: {final_loss:.4f}")
"""))

nbf.write(nb, 'notebooks/06_ablation.ipynb')
print("Notebook 06_ablation.ipynb criado com sucesso.")
