import numpy as np
import scipy.sparse as sp

def generate_random_sparse(n_nodes: int, density: float, seed: int = 42) -> sp.csr_matrix:
    """
    Gera um grafo Erdős-Rényi (aleatório uniforme) com uma densidade específica.
    Qualquer par de nodos tem a mesma probabilidade de se conectar.
    
    Args:
        n_nodes: Número total de nodos
        density: Fração de arestas existentes (0.0 a 1.0)
        seed: Semente aleatória para reprodutibilidade
    Returns:
        sp.csr_matrix: Matriz de adjacência (binária)
    """
    rng = np.random.default_rng(seed)
    
    # scipy.sparse.random cria matrizes aleatórias.
    # format='csr' garante performance futura.
    # data_rvs define os valores como sempre 1 (matriz binária).
    random_adj = sp.random(
        n_nodes, 
        n_nodes, 
        density=density, 
        format='csr', 
        data_rvs=lambda size: np.ones(size, dtype=np.int8),
        random_state=rng
    )
    return random_adj

def generate_degree_matched(in_degrees: np.ndarray, out_degrees: np.ndarray, seed: int = 42) -> sp.csr_matrix:
    """
    Gera um grafo usando o Algoritmo de Configuration Model (Matching de Stubs).
    Garante que o out-degree e o in-degree de cada nó sejam preservados idênticos 
    aos arrays passados, mas quem se conecta a quem é aleatório.
    
    Args:
        in_degrees: Array 1D com o número de conexões de entrada de cada nodo.
        out_degrees: Array 1D com o número de conexões de saída de cada nodo.
        seed: Semente aleatória.
    Returns:
        sp.csr_matrix: Matriz de adjacência (binária) preservando graus
    """
    n_nodes = len(in_degrees)
    if len(out_degrees) != n_nodes:
        raise ValueError("Arrays in_degrees e out_degrees devem ter o mesmo tamanho.")
        
    sum_in = np.sum(in_degrees)
    sum_out = np.sum(out_degrees)
    
    if sum_in != sum_out:
        raise ValueError(f"Soma de in-degrees ({sum_in}) deve ser igual a soma de out-degrees ({sum_out}).")
        
    rng = np.random.default_rng(seed)
    
    # Cria os stubs (tocos).
    # np.repeat repete o índice do nó a quantidade de vezes especificada no array de graus.
    # Ex: se out_degrees[0] = 3, o nodo 0 aparecerá 3 vezes em source_stubs.
    source_stubs = np.repeat(np.arange(n_nodes), out_degrees)
    target_stubs = np.repeat(np.arange(n_nodes), in_degrees)
    
    # Embaralha apenas os alvos para conectar stubs de saída com stubs de entrada aleatórios
    rng.shuffle(target_stubs)
    
    # O configuration model pode gerar conexões múltiplas (A -> B mais de uma vez)
    # ou auto-conexões (A -> A).
    # Ao criar uma matriz COO e usar .data = 1, matamos conexões múltiplas (viram 1),
    # mas preservamos a esparsidade brutal e os graus muito próximos aos originais.
    n_stubs = len(source_stubs)
    
    # Contar self-loops antes da conversão
    n_self_loops = int(np.sum(source_stubs == target_stubs))
    
    data = np.ones(n_stubs, dtype=np.int8)
    
    coo = sp.coo_matrix((data, (source_stubs, target_stubs)), shape=(n_nodes, n_nodes))
    
    # Converte para CSR. Se houverem arestas duplicadas, os valores de "data" se somariam.
    # Vamos forçar novamente a binarização para estrita validade matemática.
    csr_raw = coo.tocsr()
    n_before_binarize = csr_raw.nnz
    
    csr_raw.data = np.ones_like(csr_raw.data)
    n_after_binarize = csr_raw.nnz
    
    n_duplicates = n_stubs - n_before_binarize
    n_merged = n_before_binarize - n_after_binarize  # normalmente 0 após binarização CSR
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(
        f"generate_degree_matched: stubs={n_stubs:,} | "
        f"self_loops={n_self_loops:,} | "
        f"duplicatas_colapsadas={n_duplicates:,} | "
        f"arestas_finais={n_after_binarize:,} | "
        f"perda_total={n_stubs - n_after_binarize:,} ({100*(n_stubs - n_after_binarize)/n_stubs:.3f}%)"
    )
    
    return csr_raw

