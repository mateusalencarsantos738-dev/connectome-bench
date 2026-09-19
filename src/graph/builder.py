import pandas as pd
import numpy as np
import scipy.sparse as sp
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class NodeMapper:
    """
    Mapeia os root_ids biológicos (64-bits) do Connectome para 
    índices contínuos matemáticos (0 a N-1) necessários para Matrizes Esparsas.
    """
    def __init__(self):
        self.root_to_idx = {}
        self.idx_to_root = {}
        self.num_nodes = 0
        
    def fit(self, root_ids):
        """
        Aprende o mapeamento a partir de um array ou Series de root_ids únicos.
        """
        unique_ids = np.unique(root_ids)
        self.num_nodes = len(unique_ids)
        
        # Cria os dicionários de tradução
        self.root_to_idx = {root_id: idx for idx, root_id in enumerate(unique_ids)}
        self.idx_to_root = {idx: root_id for idx, root_id in enumerate(unique_ids)}
        logger.info(f"NodeMapper inicializado com {self.num_nodes} neurônios únicos.")
        
    def get_idx(self, root_id):
        """Converte um root_id da mosca para um índice da matriz."""
        return self.root_to_idx.get(root_id, None)
    
    def get_root_id(self, idx):
        """Converte um índice da matriz de volta para o root_id da mosca."""
        return self.idx_to_root.get(idx, None)

class ConnectomeBuilder:
    """
    Constrói as estruturas matemáticas de rede (Matrizes Esparsas) a partir do CSV.
    """
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.mapper = NodeMapper()
        
    def _prepare_nodes(self):
        """Extrai todos os neurônios únicos (pre e post) para criar o mapeamento."""
        logger.info("Extraindo neurônios únicos...")
        all_neurons = pd.concat([self.df['pre_root_id'], self.df['post_root_id']]).unique()
        self.mapper.fit(all_neurons)
        
    def build_sparse_matrix(self, weight_col='syn_count') -> sp.csr_matrix:
        """
        Constrói a Matriz Esparsa (CSR) onde as linhas são a origem e as colunas o destino.
        Se weight_col for fornecido, os valores da matriz serão os pesos (ex: syn_count).
        """
        self._prepare_nodes()
        
        logger.info("Agrupando conexões para remover duplicatas e somar pesos...")
        # A tabela original pode ter a mesma conexão pre->post separada por neuropil.
        # Nós precisamos somar o número de sinapses globais entre o par.
        edges = self.df.groupby(['pre_root_id', 'post_root_id'])[weight_col].sum().reset_index()
        
        logger.info("Mapeando IDs para índices de matriz...")
        row_idx = edges['pre_root_id'].map(self.mapper.root_to_idx).values
        col_idx = edges['post_root_id'].map(self.mapper.root_to_idx).values
        data = edges[weight_col].values
        
        N = self.mapper.num_nodes
        
        logger.info(f"Construindo matriz esparsa CSR de tamanho ({N}, {N})...")
        adj_matrix = sp.csr_matrix((data, (row_idx, col_idx)), shape=(N, N))
        
        logger.info(f"Matriz construída! Elementos não-zero (arestas úteis): {adj_matrix.nnz}")
        return adj_matrix, self.mapper
