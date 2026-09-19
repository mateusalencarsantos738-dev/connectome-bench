import torch
import torch.nn as nn
import scipy.sparse as sp
import numpy as np

class SparseMatMul(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x, indices, values, shape):
        ctx.save_for_backward(x, indices, values)
        ctx.shape = shape
        
        # x: (batch_size, in_features)
        # W_sparse: (in_features, out_features)
        W_sparse = torch.sparse_coo_tensor(indices, values, shape)
        
        # y = x @ W  <=> y.t() = W.t() @ x.t()
        out = torch.sparse.mm(W_sparse.t(), x.t()).t()
        return out

    @staticmethod
    def backward(ctx, grad_out):
        x, indices, values = ctx.saved_tensors
        shape = ctx.shape
        
        # d_x = grad_out @ W^T
        W_sparse = torch.sparse_coo_tensor(indices, values, shape)
        d_x = torch.sparse.mm(W_sparse, grad_out.t()).t()
        
        # d_W = x^T @ grad_out
        # d_values para as arestas (u, v) = sum_batch (x[batch, u] * grad_out[batch, v])
        row = indices[0, :]
        col = indices[1, :]
        
        # Memory safe dot product for sparse gradients
        # (batch_size, E) * (batch_size, E) -> sum over batch
        d_values = (x[:, row] * grad_out[:, col]).sum(dim=0)
        
        return d_x, None, d_values, None

class MaskedLinear(nn.Module):
    """
    Camada Linear Verdadeiramente Esparsa usando Autograd Customizado.
    Garante que gradientes densos (N x N) nunca sejam instanciados na memória.
    """
    def __init__(self, in_features: int, out_features: int, mask: sp.csr_matrix, bias: bool = True):
        super(MaskedLinear, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.shape = (in_features, out_features)
        
        if mask.shape == (in_features, out_features):
            coo = mask.tocoo()
        else:
            coo = mask.T.tocoo()
            
        indices = np.vstack((coo.row, coo.col))
        self.register_buffer('indices', torch.tensor(indices, dtype=torch.long))
        
        self.weight_values = nn.Parameter(torch.Tensor(coo.nnz))
        
        if bias:
            self.bias = nn.Parameter(torch.Tensor(out_features))
        else:
            self.register_parameter('bias', None)
            
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.normal_(self.weight_values, mean=0.0, std=1.0 / np.sqrt(self.in_features))
        if self.bias is not None:
            nn.init.zeros_(self.bias)

    def forward(self, x):
        out = SparseMatMul.apply(x, self.indices, self.weight_values, self.shape)
        if self.bias is not None:
            out = out + self.bias
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
