import nbformat as nbf

nb = nbf.v4.new_notebook()

nb.cells.append(nbf.v4.new_markdown_cell("""# ConnectomeBench: Análise Topológica do Grafo

**Fase 2 do Projeto**

Este notebook carrega a representação esparsa da conectividade do FlyWire FAFB v783 e calcula as propriedades fundamentais de sua rede matemática. 
As métricas aqui calculadas formarão a base de comparação para nossos modelos de redes neurais artificiais (ANNs e SNNs).

**Métricas avaliadas:**
- Esparsidade global
- Distribuição de graus (In-degree e Out-degree)
- Identificação de Hubs de conectividade
- Reciprocidade da rede
- Componentes conectados
"""))

nb.cells.append(nbf.v4.new_code_cell("""import sys
import os

# Adiciona o diretório raiz ao path para importar pacotes locais
sys.path.append(os.path.abspath('..'))

import pandas as pd
import numpy as np
import scipy.sparse as sp
import scipy.sparse.csgraph as csgraph
import matplotlib.pyplot as plt
import seaborn as sns

# Nossas funções recém-criadas
from src.graph.builder import ConnectomeBuilder, NodeMapper
from src.topology.metrics import calculate_sparsity, get_degrees, find_hubs, calculate_reciprocity

# Configurações de plotagem
sns.set_theme(style="whitegrid")
plt.rcParams['figure.figsize'] = (10, 6)
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 1. Carregando os Dados como Grafo Esparso

Primeiro, reconstruiremos a matriz de adjacência (usando CSR para eficiência), aproveitando o `ConnectomeBuilder` da Fase 1.
"""))

nb.cells.append(nbf.v4.new_code_cell("""# Definindo caminhos
DATA_PATH = "../data/raw/connections_princeton.csv.gz"

# 1. Carregar mapeamento
print("Criando mapeamento de nodos...")
mapper = NodeMapper()
mapper.fit(DATA_PATH)
print(f"Total de nodos únicos: {mapper.n_nodes:,}")

# 2. Carregar grafo esparso (vamos usar 'syn_count' como peso, mas criar versão binária para algumas métricas)
print("\\nConstruindo matriz de adjacência CSR...")
builder = ConnectomeBuilder(mapper)
# adj_weighted_csr tem A[i, j] = número de sinapses
adj_weighted_csr = builder.build_csr(DATA_PATH, weight_col='syn_count')

# Matriz puramente estrutural (0 ou 1): arestas únicas
adj_binary_csr = adj_weighted_csr.copy()
adj_binary_csr.data = np.ones_like(adj_binary_csr.data)

print(f"Dimensões da Matriz: {adj_binary_csr.shape}")
print(f"Total de arestas direcionadas únicas: {adj_binary_csr.nnz:,}")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 2. Esparsidade e Reciprocidade Global

- **Esparsidade:** Quão "vazia" é a matriz em relação a um grafo totalmente conectado (denso).
- **Reciprocidade:** A fração das conexões A->B em que B->A também existe. Em ANNs normais feedforward isso é 0.
"""))

nb.cells.append(nbf.v4.new_code_cell("""sparsity = calculate_sparsity(adj_binary_csr)
reciprocity = calculate_reciprocity(adj_binary_csr)

print(f"Esparsidade da Rede: {sparsity:.6%} (Fração de não-conexões)")
print(f"Densidade da Rede:   {1.0 - sparsity:.6%} (Fração de conexões possíveis que existem)")
print(f"Reciprocidade:       {reciprocity:.4%} (Arestas com via de mão dupla)")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 3. Distribuição de Graus

Vamos olhar para a distribuição in-degree (neurônios que recebem sinal) e out-degree (neurônios que emitem sinal). Em um cérebro biológico, esperamos uma cauda longa (distribuição parecida com log-normal ou lei de potência), significando que a vasta maioria dos neurônios tem poucas conexões, mas alguns poucos (os hubs) têm milhares.
"""))

nb.cells.append(nbf.v4.new_code_cell("""# Calcular graus (usando matriz binária para contar conexões, não soma de sinapses)
in_deg, out_deg = get_degrees(adj_binary_csr)

fig, axes = plt.subplots(1, 2, figsize=(15, 6))

# Plot In-degree
sns.histplot(in_deg[in_deg > 0], bins=100, log_scale=(True, False), ax=axes[0], color='blue')
axes[0].set_title('Distribuição de In-Degree (Grau de Entrada)')
axes[0].set_xlabel('In-degree (escala log)')
axes[0].set_ylabel('Contagem de Neurônios')

# Plot Out-degree
sns.histplot(out_deg[out_deg > 0], bins=100, log_scale=(True, False), ax=axes[1], color='red')
axes[1].set_title('Distribuição de Out-Degree (Grau de Saída)')
axes[1].set_xlabel('Out-degree (escala log)')
axes[1].set_ylabel('Contagem de Neurônios')

plt.tight_layout()
plt.show()

# Estatísticas Resumidas
print("Estatísticas In-Degree:")
print(f"Média:  {np.mean(in_deg):.2f}")
print(f"Mediana: {np.median(in_deg):.2f}")
print(f"Máximo: {np.max(in_deg)}")

print("\\nEstatísticas Out-Degree:")
print(f"Média:  {np.mean(out_deg):.2f}")
print(f"Mediana: {np.median(out_deg):.2f}")
print(f"Máximo: {np.max(out_deg)}")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 4. Identificando os Hubs Globais

Quais são os neurônios mais influentes da rede estruturalmente falando?
"""))

nb.cells.append(nbf.v4.new_code_cell("""top_k = 10
in_hubs_idx, in_hubs_val = find_hubs(in_deg, top_k)
out_hubs_idx, out_hubs_val = find_hubs(out_deg, top_k)

print("Top 10 Hubs de Entrada (In-Degree) - Nodos Mais Conectados:")
for rank, (idx, val) in enumerate(zip(in_hubs_idx, in_hubs_val)):
    real_id = mapper.id_to_root(idx)
    print(f"  {rank+1}. ID: {real_id} | Entradas: {val:,}")

print("\\nTop 10 Hubs de Saída (Out-Degree) - Nodos de Maior Distribuição:")
for rank, (idx, val) in enumerate(zip(out_hubs_idx, out_hubs_val)):
    real_id = mapper.id_to_root(idx)
    print(f"  {rank+1}. ID: {real_id} | Saídas: {val:,}")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 5. Componentes Conectados (Modificadores Globais)

Um conectoma saudável deveria ser quase inteiramente um único componente gigante fortamente/fracamente conectado.
Isso valida que não há sub-ilhas de neurônios completamente isolados (ou se houver, são anomalias).
"""))

nb.cells.append(nbf.v4.new_code_cell("""# Componentes Fracamente Conectados (ignora a direção da aresta)
n_components_weak, labels_weak = csgraph.connected_components(adj_binary_csr, directed=False, return_labels=True)
print(f"Número de Componentes Fracamente Conectados: {n_components_weak}")

# Componentes Fortemente Conectados (requer caminho A -> B e B -> A)
n_components_strong, labels_strong = csgraph.connected_components(adj_binary_csr, directed=True, connection='strong', return_labels=True)
print(f"Número de Componentes Fortemente Conectados: {n_components_strong}")

# Encontrar o tamanho do componente gigante (Weak)
unique_labels, counts = np.unique(labels_weak, return_counts=True)
largest_weak_component_size = np.max(counts)
fraction_largest = largest_weak_component_size / mapper.n_nodes

print(f"\\nTamanho do Maior Componente Fraco (LCC): {largest_weak_component_size:,} nodos ({fraction_largest:.2%} do total)")
"""))

nbf.write(nb, 'notebooks/02_connectome_topology.ipynb')
print("Notebook 02_connectome_topology.ipynb criado com sucesso.")
