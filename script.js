// Inicialização do Supabase
// SEU_SUPABASE_URL e SEU_SUPABASE_ANON_KEY devem ser substituídos pelos valores reais
const supabaseUrl = 'SEU_SUPABASE_URL';
const supabaseAnonKey = 'SEU_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Elementos da DOM
const loginSection = document.getElementById('loginSection');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const btnLogout = document.getElementById('btnLogout');
const btnEntregas = document.getElementById('btnEntregas');
const btnNovaEntrega = document.getElementById('btnNovaEntrega');
const formEntrega = document.getElementById('formEntrega');
const entregaForm = document.getElementById('entregaForm');
const entregasTableBody = document.getElementById('entregasTableBody');
const entregadorSelect = document.getElementById('entregadorSelect');
const statsToday = document.getElementById('statsToday');
const statsPending = document.getElementById('statsPending');
const statsCompleted = document.getElementById('statsCompleted');

// Verificar se o usuário já está logado ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const user = supabase.auth.user();
    if (user) {
        showDashboard();
        loadEntregas();
        loadEntregadores();
        loadStats();
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { user, error } = await supabase.auth.signIn({
        email,
        password
    });
    
    if (error) {
        showMessage(error.message, 'error');
    } else {
        showDashboard();
        loadEntregas();
        loadEntregadores();
        loadStats();
    }
});

// Logout
btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showLogin();
});

// Mostrar formulário de nova entrega
btnNovaEntrega.addEventListener('click', () => {
    formEntrega.classList.remove('hidden');
});

// Cancelar nova entrega
document.getElementById('btnCancelar').addEventListener('click', () => {
    formEntrega.classList.add('hidden');
    entregaForm.reset();
});

// Adicionar nova entrega
entregaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const destinatario = document.getElementById('destinatario').value;
    const endereco = document.getElementById('endereco').value;
    const contato = document.getElementById('contato').value;
    const entregador_id = document.getElementById('entregadorSelect').value;
    
    const { data, error } = await supabase
        .from('entregas')
        .insert([
            { 
                destinatario, 
                endereco, 
                contato, 
                entregador_id,
                status: 'pendente'
            }
        ]);
    
    if (error) {
        showMessage(error.message, 'error');
    } else {
        showMessage('Entrega criada com sucesso!', 'success');
        formEntrega.classList.add('hidden');
        entregaForm.reset();
        loadEntregas();
        loadStats();
    }
});

// Função para carregar entregas
async function loadEntregas() {
    const { data: entregas, error } = await supabase
        .from('entregas')
        .select(`
            id,
            destinatario,
            endereco,
            status,
            created_at,
            entregadores (nome)
        `)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar entregas:', error);
        return;
    }
    
    entregasTableBody.innerHTML = '';
    
    entregas.forEach(entrega => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${entrega.id.substring(0, 8)}</td>
            <td>${entrega.destinatario}</td>
            <td>${entrega.endereco}</td>
            <td>
                <select class="status-select" data-id="${entrega.id}">
                    <option value="pendente" ${entrega.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="coletado" ${entrega.status === 'coletado' ? 'selected' : ''}>Coletado</option>
                    <option value="em_transito" ${entrega.status === 'em_transito' ? 'selected' : ''}>Em Trânsito</option>
                    <option value="entregue" ${entrega.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                    <option value="cancelado" ${entrega.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
            <td>${entrega.entregadores ? entrega.entregadores.nome : 'Não atribuído'}</td>
            <td>
                <button class="btn-delete" data-id="${entrega.id}">Excluir</button>
            </td>
        `;
        
        entregasTableBody.appendChild(row);
    });
    
    // Adicionar event listeners para mudança de status
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const entregaId = e.target.getAttribute('data-id');
            const novoStatus = e.target.value;
            
            const { error } = await supabase
                .from('entregas')
                .update({ status: novoStatus })
                .eq('id', entregaId);
            
            if (error) {
                console.error('Erro ao atualizar status:', error);
                showMessage('Erro ao atualizar status', 'error');
            } else {
                showMessage('Status atualizado com sucesso', 'success');
                loadStats();
            }
        });
    });
    
    // Adicionar event listeners para exclusão
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const entregaId = e.target.getAttribute('data-id');
            
            if (confirm('Tem certeza que deseja excluir esta entrega?')) {
                const { error } = await supabase
                    .from('entregas')
                    .delete()
                    .eq('id', entregaId);
                
                if (error) {
                    console.error('Erro ao excluir entrega:', error);
                    showMessage('Erro ao excluir entrega', 'error');
                } else {
                    showMessage('Entrega excluída com sucesso', 'success');
                    loadEntregas();
                    loadStats();
                }
            }
        });
    });
}

// Função para carregar entregadores no select
async function loadEntregadores() {
    const { data: entregadores, error } = await supabase
        .from('entregadores')
        .select('id, nome')
        .order('nome');
    
    if (error) {
        console.error('Erro ao carregar entregadores:', error);
        return;
    }
    
    entregadorSelect.innerHTML = '<option value="">Selecione um entregador</option>';
    
    entregadores.forEach(entregador => {
        const option = document.createElement('option');
        option.value = entregador.id;
        option.textContent = entregador.nome;
        entregadorSelect.appendChild(option);
    });
}

// Função para carregar estatísticas
async function loadStats() {
    // Entregas de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayCount, error: todayError } = await supabase
        .from('entregas')
        .select('*', { count: 'exact' })
        .gte('created_at', today.toISOString())
        .lte('created_at', new Date().toISOString());
    
    // Entregas pendentes
    const { count: pendingCount, error: pendingError } = await supabase
        .from('entregas')
        .select('*', { count: 'exact' })
        .eq('status', 'pendente');
    
    // Entregas concluídas
    const { count: completedCount, error: completedError } = await supabase
        .from('entregas')
        .select('*', { count: 'exact' })
        .eq('status', 'entregue');
    
    if (!todayError) statsToday.textContent = todayCount;
    if (!pendingError) statsPending.textContent = pendingCount;
    if (!completedError) statsCompleted.textContent = completedCount;
}

// Funções auxiliares de UI
function showMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = type;
    setTimeout(() => {
        loginMessage.textContent = '';
        loginMessage.className = '';
    }, 3000);
}

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
}

function showLogin() {
    dashboard.classList.add('hidden');
    loginSection.classList.remove('hidden');
}