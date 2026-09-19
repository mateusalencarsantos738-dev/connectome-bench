import torch
import torch.nn as nn
import scipy.sparse as sp
import numpy as np

class MaskedLinear(nn.Module):
    """
    Camada Linear Verdadeiramente Esparsa.
    Usa apenas O(E) de memória ao armazenar os pesos apenas para as arestas existentes.
    """
    def __init__(self, in_features: int, out_features: int, mask: sp.csr_matrix, bias: bool = True):
        super(MaskedLinear, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        
        # A máscara do connectome geralmente é (Origem -> Destino).
        # Para (input -> output), queremos multiplicar x (batch, in_features) 
        # pela matriz de pesos (in_features, out_features).
        # Vamos usar o formato COO para fácil construção no PyTorch.
        if mask.shape == (in_features, out_features):
            # Formato já esperado: linha é in_features, coluna é out_features
            coo = mask.tocoo()
        else:
            coo = mask.T.tocoo()
            
        # O Pytorch precisa dos índices no formato [2, num_edges]
        indices = np.vstack((coo.row, coo.col))
        self.register_buffer('indices', torch.tensor(indices, dtype=torch.long))
        
        # Treinamos APENAS os valores não-nulos (as arestas da biologia)
        self.weight_values = nn.Parameter(torch.Tensor(coo.nnz))
        
        if bias:
            self.bias = nn.Parameter(torch.Tensor(out_features))
        else:
            self.register_parameter('bias', None)
            
        self.reset_parameters()

    def reset_parameters(self):
        # Inicialização simples aproximada
        nn.init.normal_(self.weight_values, mean=0.0, std=1.0 / np.sqrt(self.in_features))
        if self.bias is not None:
            nn.init.zeros_(self.bias)

    def forward(self, x):
        # x tem dimensão (batch_size, in_features)
        # Queremos y = x @ W + b
        # Onde W é a matriz esparsa (in_features, out_features)
        
        batch_size = x.size(0)
        
        # Constrói o tensor esparso no momento da passagem para aceitar gradientes no weight_values
        # (Isso é muito rápido porque os índices estão pré-alocados e na GPU)
        W_sparse = torch.sparse_coo_tensor(
            self.indices, 
            self.weight_values, 
            (self.in_features, self.out_features)
        )
        
        # Pytorch suporta mm entre densa e esparsa se a esparsa estiver na direita? 
        # Na verdade, torch.sparse.mm funciona melhor se a esparsa estiver na esquerda: W_sparse @ x
        # Para y = x @ W, podemos fazer y.T = W.T @ x.T
        # Mas existe uma forma direta usando mm ou matmul dependendo da versão do PyTorch.
        # Vamos usar o fato de que W_sparse.t() tem (out_features, in_features).
        W_sparse_t = W_sparse.t()
        
        # out = W_sparse_t @ x.t() -> shape: (out_features, batch_size)
        out = torch.sparse.mm(W_sparse_t, x.t())
        
        # Retorna ao shape original (batch_size, out_features)
        out = out.t()
        
        if self.bias is not None:
            out += self.bias
            
        return out

class ConnectomeModel(nn.Module):
    """
    Rede Neural baseada na topologia real/artificial do ConnectomeBench.
    """
    def __init__(self, 
                 input_dim: int, 
                 hidden_dim: int, 
                 output_dim: int, 
                 adj_mask: sp.csr_matrix, 
                 sensory_indices: list, 
                 motor_indices: list):
        """
        Args:
            input_dim: Tamanho do input (ex: 784 para MNIST)
            hidden_dim: Número de neurônios da rede (ex: 138k)
            output_dim: Tamanho do output (ex: 10 classes MNIST)
            adj_mask: Máscara esparsa com a conectividade
            sensory_indices: Índices dos nodos na rede escondida que receberão as entradas reais
            motor_indices: Índices dos nodos na rede escondida que projetarão as saídas reais
        """
        super(ConnectomeModel, self).__init__()
        
        # 1. ENCODER (Apenas dos inputs reais -> Nodos sensoriais)
        # Ao invés de uma matriz densa de 784 x 138000, teremos 784 x (len(sensory_indices)).
        self.encoder = nn.Linear(input_dim, len(sensory_indices))
        self.sensory_indices = sensory_indices
        
        # 2. CONNECTOME LAYER (Nodos internos interagem usando a biologia)
        # Nota: Por ser experimental, MaskedLinear usa máscara densa internamente por enquanto.
        # Em produção agressiva (Fase 8), mudaríamos para multiplicadores puramente esparsos de CUDA.
        self.connectome = MaskedLinear(hidden_dim, hidden_dim, adj_mask)
        
        # 3. READOUT (Nodos motores -> Saída)
        self.readout = nn.Linear(len(motor_indices), output_dim)
        self.motor_indices = motor_indices
        
    def forward(self, x):
        batch_size = x.size(0)
        
        # Inicia a camada oculta inteira (o cérebro) com Zeros
        hidden_state = torch.zeros((batch_size, self.connectome.in_features), device=x.device)
        
        # 1. Codifica os pixels na população sensorial
        sensory_activations = torch.relu(self.encoder(x))
        hidden_state[:, self.sensory_indices] = sensory_activations
        
        # 2. O sinal flui pela rede topológica (1 "salto temporal" por enquanto)
        # Um SNN real usaria recorrência. Aqui simulamos 1 forward pass profundo.
        hidden_state = torch.relu(self.connectome(hidden_state))
        
        # 3. Extrai apenas a visão dos neurônios motores
        motor_activations = hidden_state[:, self.motor_indices]
        
        # 4. Decodifica para as 10 classes
        out = self.readout(motor_activations)
        
        return out
