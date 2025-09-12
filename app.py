from flask import Flask, request, jsonify
from flask_cors import CORS
import supabase
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

app = Flask(__name__)
CORS(app)

# Configuração do Supabase com validação
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    raise ValueError("Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY são obrigatórias")

client = supabase.create_client(supabase_url, supabase_key)

# Constantes para evitar repetição
STATUS_VALIDOS = ['pendente', 'coletado', 'em_transito', 'entregue', 'cancelado']
VALOR_ENTREGA = 5.0  # R$ 5 por entrega

@app.route('/api/entregas/<entregador_id>', methods=['GET'])
def get_entregas(entregador_id: str) -> Any:
    """
    Busca todas as entregas de um entregador específico
    """
    try:
        response = client.table('entregas') \
            .select('*, pedidos(*, produtos(*), clientes(*))') \
            .eq('entregador_id', entregador_id) \
            .order('data_criacao', desc=True) \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        app.logger.error(f"Erro ao buscar entregas: {str(e)}")
        return jsonify({'error': 'Erro interno ao buscar entregas'}), 500

@app.route('/api/entregas/<entrega_id>/status', methods=['PUT'])
def update_entrega_status(entrega_id: str) -> Any:
    """
    Atualiza o status de uma entrega
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados JSON são necessários'}), 400
            
        novo_status = data.get('status')
        
        if novo_status not in STATUS_VALIDOS:
            return jsonify({'error': f'Status inválido. Deve ser um dos: {STATUS_VALIDOS}'}), 400
        
        # Preparar dados para atualização
        update_data = {'status': novo_status}
        
        # Se a entrega foi concluída, registrar data de entrega
        if novo_status == 'entregue':
            update_data['data_entrega'] = datetime.now().isoformat()
        
        # Fazer uma única operação de atualização
        response = client.table('entregas') \
            .update(update_data) \
            .eq('id', entrega_id) \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        app.logger.error(f"Erro ao atualizar status da entrega: {str(e)}")
        return jsonify({'error': 'Erro interno ao atualizar status'}), 500

@app.route('/api/pedidos/<vendedor_id>', methods=['GET'])
def get_pedidos(vendedor_id: str) -> Any:
    """
    Busca todos os pedidos de um vendedor específico
    """
    try:
        response = client.table('pedidos') \
            .select('*, produtos(*), clientes(*)') \
            .eq('vendedor_id', vendedor_id) \
            .order('data_criacao', desc=True) \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        app.logger.error(f"Erro ao buscar pedidos: {str(e)}")
        return jsonify({'error': 'Erro interno ao buscar pedidos'}), 500

@app.route('/api/produtos/<vendedor_id>', methods=['GET'])
def get_produtos(vendedor_id: str) -> Any:
    """
    Busca todos os produtos de um vendedor específico
    """
    try:
        response = client.table('produtos') \
            .select('*') \
            .eq('vendedor_id', vendedor_id) \
            .order('nome') \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        app.logger.error(f"Erro ao buscar produtos: {str(e)}")
        return jsonify({'error': 'Erro interno ao buscar produtos'}), 500

@app.route('/api/produtos', methods=['POST'])
def create_produto() -> Any:
    """
    Cria um novo produto
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados JSON são necessários'}), 400
        
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
        app.logger.error(f"Erro ao criar produto: {str(e)}")
        return jsonify({'error': 'Erro interno ao criar produto'}), 500

@app.route('/api/produtos/<produto_id>', methods=['PUT'])
def update_produto(produto_id: str) -> Any:
    """
    Atualiza um produto existente
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados JSON são necessários'}), 400
        
        # Verificar se o produto existe antes de atualizar
        existing_product = client.table('produtos') \
            .select('id') \
            .eq('id', produto_id) \
            .execute()
            
        if not existing_product.data:
            return jsonify({'error': 'Produto não encontrado'}), 404
        
        # Atualizar produto
        response = client.table('produtos') \
            .update(data) \
            .eq('id', produto_id) \
            .execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        app.logger.error(f"Erro ao atualizar produto: {str(e)}")
        return jsonify({'error': 'Erro interno ao atualizar produto'}), 500

@app.route('/api/produtos/<produto_id>', methods=['DELETE'])
def delete_produto(produto_id: str) -> Any:
    """
    Exclui um produto
    """
    try:
        # Verificar se o produto existe antes de excluir
        existing_product = client.table('produtos') \
            .select('id') \
            .eq('id', produto_id) \
            .execute()
            
        if not existing_product.data:
            return jsonify({'error': 'Produto não encontrado'}), 404
        
        # Excluir produto
        response = client.table('produtos') \
            .delete() \
            .eq('id', produto_id) \
            .execute()
        
        return jsonify({'message': 'Produto excluído com sucesso'}), 200
    except Exception as e:
        app.logger.error(f"Erro ao excluir produto: {str(e)}")
        return jsonify({'error': 'Erro interno ao excluir produto'}), 500

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
        app.logger.error(f"Erro ao buscar entregadores: {str(e)}")
        return jsonify({'error': 'Erro interno ao buscar entregadores'}), 500

@app.route('/api/estatisticas/entregador/<entregador_id>', methods=['GET'])
def get_estatisticas_entregador(entregador_id: str) -> Any:
    """
    Busca estatísticas de um entregador
    """
    try:
        hoje = datetime.now().strftime('%Y-%m-%d')
        
        # Buscar entregas do dia em uma única consulta
        response = client.table('entregas') \
            .select('*') \
            .eq('entregador_id', entregador_id) \
            .gte('data_criacao', hoje + 'T00:00:00') \
            .lte('data_criacao', hoje + 'T23:59:59') \
            .execute()
        
        entregas_hoje = response.data
        
        # Calcular estatísticas
        total_entregas = len(entregas_hoje)
        entregas_concluidas = sum(1 for e in entregas_hoje if e.get('status') == 'entregue')
        entregas_pendentes = total_entregas - entregas_concluidas
        ganhos_hoje = entregas_concluidas * VALOR_ENTREGA
        
        estatisticas = {
            'total_entregas': total_entregas,
            'entregas_concluidas': entregas_concluidas,
            'entregas_pendentes': entregas_pendentes,
            'ganhos_hoje': ganhos_hoje
        }
        
        return jsonify(estatisticas), 200
    except Exception as e:
        app.logger.error(f"Erro ao buscar estatísticas do entregador: {str(e)}")
        return jsonify({'error': 'Erro interno ao buscar estatísticas'}), 500

@app.route('/api/estatisticas/vendedor/<vendedor_id>', methods=['GET'])
def get_estatisticas_vendedor(vendedor_id: str) -> Any:
    """
    Busca estatísticas de um vendedor
    """
    try:
        hoje = datetime.now().strftime('%Y-%m-%d')
        semana_passada = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        
        # Buscar pedidos de hoje
        pedidos_hoje = client.table('pedidos') \
            .select('*') \
            .eq('vendedor_id', vendedor_id) \
            .gte('data_criacao', hoje + 'T00:00:00') \
            .lte('data_criacao', hoje + 'T23:59:59') \
            .execute()
        
        # Buscar pedidos da semana
        pedidos_semana = client.table('pedidos') \
            .select('*') \
            .eq('vendedor_id', vendedor_id) \
            .gte('data_criacao', semana_passada + 'T00:00:00') \
            .lte('data_criacao', hoje + 'T23:59:59') \
            .execute()
        
        # Buscar todos os pedidos
        todos_pedidos = client.table('pedidos') \
            .select('*') \
            .eq('vendedor_id', vendedor_id) \
            .execute()
        
        # Calcular estatísticas
        total_pedidos_hoje = len(pedidos_hoje.data)
        total_pedidos_semana = len(pedidos_semana.data)
        total_pedidos_geral = len(todos_pedidos.data)
        
        # Calcular faturamento
        faturamento_hoje = sum(pedido.get('valor_total', 0) for pedido in pedidos_hoje.data)
        faturamento_semana = sum(pedido.get('valor_total', 0) for pedido in pedidos_semana.data)
        faturamento_total = sum(pedido.get('valor_total', 0) for pedido in todos_pedidos.data)
        
        # Pedidos por status
        pedidos_pendentes = sum(1 for p in todos_pedidos.data if p.get('status') == 'pendente')
        pedidos_entregues = sum(1 for p in todos_pedidos.data if p.get('status') == 'entregue')
        pedidos_cancelados = sum(1 for p in todos_pedidos.data if p.get('status') == 'cancelado')
        
        estatisticas = {
            'pedidos_hoje': total_pedidos_hoje,
            'pedidos_semana': total_pedidos_semana,
            'pedidos_total': total_pedidos_geral,
            'faturamento_hoje': faturamento_hoje,
            'faturamento_semana': faturamento_semana,
            'faturamento_total': faturamento_total,
            'pedidos_pendentes': pedidos_pendentes,
            'pedidos_entregues': pedidos_entregues,
            'pedidos_cancelados': pedidos_cancelados
        }
        
        return jsonify(estatisticas), 200
    except Exception as e:
        app.logger.error(f"Erro ao buscar estatísticas do vendedor: {str(e)}")
        return jsonify({'error': 'Erro interno ao buscar estatísticas'}), 500

if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true', 
            host=os.environ.get('FLASK_HOST', '0.0.0.0'), 
            port=int(os.environ.get('FLASK_PORT', 5000)))