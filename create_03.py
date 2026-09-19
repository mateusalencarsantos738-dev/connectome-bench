import nbformat as nbf

nb = nbf.v4.new_notebook()

nb.cells.append(nbf.v4.new_markdown_cell("""# ConnectomeBench: Mapeamento de Tipos Celulares

**Fase 3 do Projeto**

Nas fases anteriores tratamos os neurônios apenas como números (IDs) em uma matriz gigantesca. 
A genialidade da natureza não está apenas no formato do grafo, mas no **propósito** de cada nodo. 

Neste caderno, nós cruzamos a rede (Topologia da Fase 2) com a biologia estrutural, integrando o arquivo `consolidated_cell_types.csv.gz`. O objetivo é descobrir:
1. Qual a proporção global de cada tipo de neurônio?
2. Quantos neurônios do nosso grafo ficaram de fora (sem mapeamento)?
3. **Quais são as identidades biológicas dos maiores Hubs do cérebro?**
"""))

nb.cells.append(nbf.v4.new_code_cell("""import sys
import os

# Adiciona o diretório raiz ao path
sys.path.append(os.path.abspath('..'))

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Componentes do ConnectomeBench
from src.graph.builder import ConnectomeBuilder, NodeMapper
from src.topology.metrics import get_degrees, find_hubs
from src.data.cell_mapper import CellTypeMapper

# Configurações de plotagem
sns.set_theme(style="whitegrid")
plt.rcParams['figure.figsize'] = (10, 6)
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 1. Carregando as Anotações Biológicas
"""))

nb.cells.append(nbf.v4.new_code_cell("""CELL_TYPES_PATH = "../data/raw/consolidated_cell_types.csv.gz"

print("Inicializando Mapeador de Células...")
cell_mapper = CellTypeMapper()
cell_mapper.fit(CELL_TYPES_PATH)

# Exibindo os 10 tipos celulares mais comuns no cérebro
summary_df = cell_mapper.get_summary()

plt.figure(figsize=(12, 6))
sns.barplot(data=summary_df.head(20), x='primary_type', y='count', palette='viridis')
plt.title("Top 20 Tipos Celulares mais Frequentes no FAFB")
plt.xlabel("Tipo Primário")
plt.ylabel("Contagem")
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.show()

print("Top 10 Tipos:")
display(summary_df.head(10))
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 2. Reconstruindo o Grafo (Fase 1 e 2)
Vamos reconstruir rapidamente a matriz CSR e recalcular os Hubs para descobrir quem eles são de verdade.
"""))

nb.cells.append(nbf.v4.new_code_cell("""CONNECTIONS_PATH = "../data/raw/connections_princeton.csv.gz"

print("Reconstruindo Grafo Esparso...")
import pandas as pd
df = pd.read_csv(CONNECTIONS_PATH)
builder = ConnectomeBuilder(df)



adj_csr, mapper = builder.build_sparse_matrix(weight_col='syn_count')

# Criando matriz binarizada para contagem de conexões únicas (degree puro)
adj_bin_csr = adj_csr.copy()
adj_bin_csr.data = np.ones_like(adj_bin_csr.data)

print(f"Nodos no grafo: {mapper.num_nodes:,}")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 3. Cobertura do Mapeamento Biológico
Quantos dos nossos neurônios do Grafo (Fase 1) realmente possuem um nome na tabela da biologia?
"""))

nb.cells.append(nbf.v4.new_code_cell("""# Lista de todos os IDs reais usados no grafo
all_real_ids = [mapper.get_root_id(i) for i in range(mapper.num_nodes)]

# Buscando os tipos para todos
all_types = cell_mapper.get_types_batch(all_real_ids)

# Contando quantos ficaram 'Unknown'
n_unknown = all_types.count("Unknown")
n_mapped = mapper.num_nodes - n_unknown

print(f"Neurônios mapeados: {n_mapped:,} ({n_mapped/mapper.num_nodes:.2%})")
print(f"Neurônios desconhecidos (Unknown): {n_unknown:,} ({n_unknown/mapper.num_nodes:.2%})")

# Nota: Muitos neurônios podem ser pequenos fragmentos na reconstrução 3D que não ganharam classificação.
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## 4. Revelando a Identidade dos Grandes Hubs
Os "influenciadores" da rede matemática são neurônios visuais? Olfativos? Motores?
"""))

nb.cells.append(nbf.v4.new_code_cell("""in_deg, out_deg = get_degrees(adj_bin_csr)

top_k = 15
in_hubs_idx, in_hubs_val = find_hubs(in_deg, top_k)
out_hubs_idx, out_hubs_val = find_hubs(out_deg, top_k)

print("### TOP 15 HUBS DE RECEPÇÃO (In-Degree) ###")
for rank, (idx, val) in enumerate(zip(in_hubs_idx, in_hubs_val)):
    real_id = mapper.get_root_id(idx)
    bio_type = cell_mapper.get_type(real_id)
    print(f"{rank+1:02d}. [Entradas: {val:>5,}] Tipo: {bio_type:<15} (ID: {real_id})")

print("\\n### TOP 15 HUBS DE TRANSMISSÃO (Out-Degree) ###")
for rank, (idx, val) in enumerate(zip(out_hubs_idx, out_hubs_val)):
    real_id = mapper.get_root_id(idx)
    bio_type = cell_mapper.get_type(real_id)
    print(f"{rank+1:02d}. [Saídas: {val:>5,}] Tipo: {bio_type:<15} (ID: {real_id})")
"""))

nb.cells.append(nbf.v4.new_markdown_cell("""## Conclusão
Com isso, temos uma ponte entre `Nó Matemático -> Nome Biológico`. 
Isso será vital para criarmos as Camadas de Entrada (Input Layer) usando neurônios sensoriais, e Camadas de Saída (Output Layer) usando neurônios motores em nossas futuras Redes Neurais baseadas neste conectoma.
"""))

nbf.write(nb, 'notebooks/03_cell_type_mapping.ipynb')
print("Notebook 03_cell_type_mapping.ipynb criado com sucesso.")
