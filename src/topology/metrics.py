import numpy as np
import scipy.sparse as sp

def calculate_sparsity(adj_matrix: sp.csr_matrix) -> float:
    """
    Calcula a esparsidade do grafo.
    Esparsidade = 1.0 - (arestas / (nodos * nodos))
    
    Args:
        adj_matrix: Matriz de adjacência esparsa (scipy.sparse)
    Returns:
        float: Taxa de esparsidade entre 0.0 e 1.0
    """
    nnz = adj_matrix.nnz
    n_nodes = adj_matrix.shape[0]
    total_possible = float(n_nodes) ** 2
    density = nnz / total_possible if total_possible > 0 else 0
    return 1.0 - density

def get_degrees(adj_matrix: sp.csr_matrix):
    """
    Calcula os graus de entrada (in-degree) e saída (out-degree).
    Na matriz de adjacência A, A[i, j] = 1 significa aresta de i -> j.
    - O grau de saída de i é a soma da linha i.
    - O grau de entrada de j é a soma da coluna j.
    
    Args:
        adj_matrix: Matriz de adjacência esparsa
    Returns:
        tuple: (in_degrees, out_degrees) como arrays numpy 1D
    """
    # Se for ponderada, calculará a soma dos pesos. Para grau puramente topológico,
    # certifique-se de que a matriz passada seja binária.
    out_degrees = np.array(adj_matrix.sum(axis=1)).flatten()
    in_degrees = np.array(adj_matrix.sum(axis=0)).flatten()
    return in_degrees, out_degrees

def find_hubs(degrees: np.ndarray, top_k: int = 10):
    """
    Retorna os índices dos K nodos com maiores graus.
    
    Args:
        degrees: Array de graus (ex: retornado por get_degrees)
        top_k: Quantidade de hubs a retornar
    Returns:
        tuple: (índices_hubs, graus_hubs)
    """
    # Argsort retorna do menor para o maior, então pegamos os últimos k e revertemos
    hub_indices = np.argsort(degrees)[-top_k:][::-1]
    hub_values = degrees[hub_indices]
    return hub_indices, hub_values

def calculate_reciprocity(adj_matrix: sp.csr_matrix) -> float:
    """
    Calcula a reciprocidade do grafo direcionado usando operações matriciais esparsas.
    Reciprocidade é a fração das arestas para as quais a aresta no sentido oposto também existe.
    
    Args:
        adj_matrix: Matriz de adjacência esparsa (idealmente binária/binarizada)
    Returns:
        float: Fração de arestas recíprocas (0.0 a 1.0)
    """
    # Garante que seja binária para contar intersecção adequadamente
    adj_bin = adj_matrix.copy()
    adj_bin.data = np.ones_like(adj_bin.data)
    
    # Arestas originais
    num_edges = adj_bin.nnz
    
    if num_edges == 0:
        return 0.0
        
    # Arestas mútuas: Intersecção de A com A transposta.
    # Como ambas são binárias, a multiplicação elemento-a-elemento A.multiply(A.T) 
    # terá 1 apenas onde ambas têm 1.
    mutual_edges = adj_bin.multiply(adj_bin.T)
    
    # Cada par A<->B é contado duas vezes (A->B e B->A), mas queremos 
    # a fração das arestas totais que participam de pares recíprocos.
    # Então, simplesmente dividimos o número de arestas mútuas por arestas totais.
    reciprocity = mutual_edges.nnz / num_edges
    
    return float(reciprocity)
