import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union

class CellTypeMapper:
    """
    Classe para carregar e mapear anotações biológicas (Tipos Celulares) 
    do ConnectomeBench aos IDs numéricos dos neurônios (root_ids).
    """
    
    def __init__(self):
        self.df_types = None
        self._type_dict = {}
        self.is_fitted = False
        
    def fit(self, csv_path: str):
        """
        Carrega o dataset de tipos celulares consolidado.
        Espera-se as colunas: root_id, primary_type, additional_type(s)
        
        Args:
            csv_path: Caminho para consolidated_cell_types.csv.gz
        """
        print(f"Carregando anotações celulares de {csv_path}...")
        self.df_types = pd.read_csv(csv_path)
        
        # Cria um dicionário rápido para buscas O(1)
        # Assumindo a existência das colunas 'root_id' e 'primary_type'
        if 'root_id' not in self.df_types.columns or 'primary_type' not in self.df_types.columns:
            raise ValueError("O dataset deve conter as colunas 'root_id' e 'primary_type'.")
            
        self._type_dict = dict(zip(self.df_types['root_id'], self.df_types['primary_type']))
        self.is_fitted = True
        
    def get_type(self, root_id: int) -> str:
        """
        Retorna o 'primary_type' biológico de um root_id.
        Se não for encontrado, retorna 'Unknown'.
        """
        if not self.is_fitted:
            raise RuntimeError("Chame .fit() antes de usar a classe.")
        
        return self._type_dict.get(root_id, "Unknown")
        
    def get_types_batch(self, root_ids: Union[List[int], np.ndarray]) -> List[str]:
        """
        Retorna os tipos celulares para uma lista ou array de root_ids.
        """
        if not self.is_fitted:
            raise RuntimeError("Chame .fit() antes de usar a classe.")
            
        return [self.get_type(int(r_id)) for r_id in root_ids]
        
    def get_summary(self) -> pd.DataFrame:
        """
        Retorna um DataFrame resumindo a contagem global de cada tipo celular.
        """
        if not self.is_fitted:
            raise RuntimeError("Chame .fit() antes de usar a classe.")
            
        summary = self.df_types['primary_type'].value_counts().reset_index()
        summary.columns = ['primary_type', 'count']
        return summary
