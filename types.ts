// Tipos para o sistema de logística

export interface User {
    id: string;
    email: string;
    created_at: string;
}

export interface Entregador {
    id: number;
    user_id: string;
    nome: string;
    email: string;
    telefone: string;
    veiculo: string;
    status: 'ativo' | 'inativo';
    created_at: string;
}

export interface Vendedor {
    id: number;
    user_id: string;
    empresa: string;
    cnpj: string;
    email: string;
    telefone: string;
    status: 'ativo' | 'inativo';
    created_at: string;
}

export interface Produto {
    id: number;
    vendedor_id: number;
    nome: string;
    descricao: string;
    preco: number;
    peso: number;
    estoque: number;
    created_at: string;
}

export interface Cliente {
    id: number;
    nome: string;
    email: string;
    telefone: string;
    endereco: string;
    created_at: string;
}

export interface Pedido {
    id: number;
    vendedor_id: number;
    cliente_id: number;
    produto_id: number;
    quantidade: number;
    valor_total: number;
    status: 'pendente' | 'processando' | 'enviado' | 'entregue' | 'cancelado';
    data_criacao: string;
    data_entrega_prevista: string;
}

export interface Entrega {
    id: number;
    pedido_id: number;
    entregador_id: number;
    endereco_entrega: string;
    status: 'pendente' | 'coletado' | 'em_transito' | 'entregue' | 'cancelado';
    data_criacao: string;
    data_entrega: string | null;
}

export interface AuthResponse {
    data: {
        user: User | null;
        session: any | null;
    };
    error: any | null;
}

export interface NotificationOptions {
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    message: string;
}