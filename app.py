from flask import Flask, request, jsonify
from flask_cors import CORS
import supabase
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

app = Flask(__name__)
CORS(app)

# Configuração do Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
client = supabase.create_client(supabase_url, supabase_key)

@app.route('/api/entregas/<entregador_id>', methods=['GET'])
def get_entregas(entregador_id: str) -> Any:
    """
    Busca todas as entregas de um entregador específico
    """
    try:
        # Buscar entregas do entregador
        response = client.table('entregas') \
            .select('*, pedidos(*, produtos(*), clientes(*))') \
            .eq('entregador_id', entregador_id) \
            .order('data_criacao', desc=True) \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/entregas/<entrega_id>/status', methods=['PUT'])
def update_entrega_status(entrega_id: str) -> Any:
    """
    Atualiza o status de uma entrega
    """
    try:
        data = request.get_json()
        novo_status = data.get('status')
        
        if novo_status not in ['pendente', 'coletado', 'em_transito', 'entregue', 'cancelado']:
            return jsonify({'error': 'Status inválido'}), 400
        
        # Atualizar status da entrega
        response = client.table('entregas') \
            .update({'status': novo_status}) \
            .eq('id', entrega_id) \
            .execute()
        
        # Se a entrega foi concluída, registrar data de entrega
        if novo_status == 'entregue':
            client.table('entregas') \
                .update({'data_entrega': datetime.now().isoformat()}) \
                .eq('id', entrega_id) \
                .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pedidos/<vendedor_id>', methods=['GET'])
def get_pedidos(vendedor_id: str) -> Any:
    """
    Busca todos os pedidos de um vendedor específico
    """
    try:
        # Buscar pedidos do vendedor
        response = client.table('pedidos') \
            .select('*, produtos(*), clientes(*)') \
            .eq('vendedor_id', vendedor_id) \
            .order('data_criacao', desc=True) \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos/<vendedor_id>', methods=['GET'])
def get_produtos(vendedor_id: str) -> Any:
    """
    Busca todos os produtos de um vendedor específico
    """
    try:
        # Buscar produtos do vendedor
        response = client.table('produtos') \
            .select('*') \
            .eq('vendedor_id', vendedor_id) \
            .order('nome') \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos', methods=['POST'])
def create_produto() -> Any:
    """
    Cria um novo produto
    """
    try:
        data = request.get_json()
        
        # Validar dados obrigatórios
        required_fields = ['vendedor_id', 'nome', 'preco']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400
        
        # Criar novo produto
        response = client.table('produtos') \
            .insert([{
                'vendedor_id': data['vendedor_id'],
                'nome': data['nome'],
                'descricao': data.get('descricao', ''),
                'preco': data['preco'],
                'peso': data.get('peso', 0),
                'estoque': data.get('estoque', 0)
            }]) \
            .execute()
        
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos/<produto_id>', methods=['PUT'])
def update_produto(produto_id: str) -> Any:
    """
    Atualiza um produto existente
    """
    try:
        data = request.get_json()
        
        # Atualizar produto
        response = client.table('produtos') \
            .update(data) \
            .eq('id', produto_id) \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos/<produto_id>', methods=['DELETE'])
def delete_produto(produto_id: str) -> Any:
    """
    Exclui um produto
    """
    try:
        # Excluir produto
        response = client.table('produtos') \
            .delete() \
            .eq('id', produto_id) \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/entregadores', methods=['GET'])
def get_entregadores() -> Any:
    """
    Busca todos os entregadores ativos
    """
    try:
        response = client.table('entregadores') \
            .select('*') \
            .eq('status', 'ativo') \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/estatisticas/entregador/<entregador_id>', methods=['GET'])
def get_estatisticas_entregador(entregador_id: str) -> Any:
    """
    Busca estatísticas de um entregador
    """
    try:
        hoje = datetime.now().strftime('%Y-%m-%d')
        
        # Entregas hoje
        entregas_hoje = client.table('entregas') \
            .select('*') \
            .eq('entregador_id', entregador_id) \
            .gte('data_criacao', hoje + 'T00:00:00') \
            .lte('data_criacao', hoje + 'T23:59:59') \
            .execute()
        
        # Calcular estatísticas
        total_entregas = len(entregas_hoje.data)
        entregas_concluidas = len([e for e in entregas_hoje.data if e.get('status') == 'entregue'])
        entregas_pendentes = total_entregas - entregas_concluidas
        ganhos_hoje = entregas_concluidas * 5  # R$ 5 por entrega
        
        estatisticas = {
            'total_entregas': total_entregas,
            'entregas_concluidas': entregas_concluidas,
            'entregas_pendentes': entregas_pendentes,
            'ganhos_hoje': ganhos_hoje
        }
        
        return jsonify(estatisticas), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/estatisticas/vendedor/<vendedor_id>', methods=['GET'])
def get_estatisticas_vendedor(vendedor_id: str) -> Any:
    """
    Busca estatísticas de um vendedor
    """
    try:
        hoje = datetime.now().strftime('%Y-%m-%d')
        
        # Pedidos hoje
        pedidos_hoje = client.table('pedidos') \
            .select('*') \
            .eq('vendedor_id', vendedor_id) \
            .gte('data_criacao', hoje + 'T00:00:00') \
            .lte('data_criacao', hoje + 'T23:59:59')