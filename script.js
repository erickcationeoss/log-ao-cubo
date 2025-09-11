// script.js
// Inicialização do Supabase
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
const btnEntregadores = document.getElementById('btnEntregadores');
const btnRelatorios = document.getElementById('btnRelatorios');
const btnNovaEntrega = document.getElementById('btnNovaEntrega');
const formEntrega = document.getElementById('formEntrega');
const entregaForm = document.getElementById('entregaForm');
const btnCancelar = document.getElementById('btnCancelar');
const entregasTableBody = document.getElementById('entregasTableBody');
const entregadorSelect = document.getElementById('entregadorSelect');
const statsToday = document.getElementById('statsToday');
const statsPending = document.getElementById('statsPending');
const statsCompleted = document.getElementById('statsCompleted');
const statsSuccessRate = document.getElementById('statsSuccessRate');
const entregasSection = document.getElementById('entregasSection');
const entregadoresSection = document.getElementById('entregadoresSection');

// Estado da aplicação
let currentUser = null;
let entregas = [];
let entregadores = [];

// Verificar se o usuário já está logado
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showDashboard();
        loadData();
    } else {
        showLogin();
    }
}

// Mostrar formulário de login
function showLogin() {
    loginSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

// Mostrar dashboard
function showDashboard() {
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    
    // Mostrar seções com animação
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.add('visible');
    });
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        showMessage(loginMessage, error.message, 'error');
    } else {
        currentUser = data.user;
        showDashboard();
        loadData();
    }
});

// Logout
btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    showLogin();
    resetForm(loginForm);
});

// Carregar dados iniciais
async function loadData() {
    await loadEntregadores();
    await loadEntregas();
    updateStats();
}

// Carregar entregadores
async function loadEntregadores() {
    const { data, error } = await supabase
        .from('entregadores')
        .select('*')
        .order('nome');
    
    if (error) {
        console.error('Erro ao carregar entregadores:', error);
        return;
    }
    
    entregadores = data;
    populateEntregadorSelect();
}

// Popular select de entregadores
function populateEntregadorSelect() {
    entregadorSelect.innerHTML = '<option value="">Selecione um entregador</option>';
    
    entregadores.forEach(entregador => {
        const option = document.createElement('option');
        option.value = entregador.id;
        option.textContent = entregador.nome;
        entregadorSelect.appendChild(option);
    });
}

// Carregar entregas
async function loadEntregas() {
    const { data, error } = await supabase
        .from('entregas')
        .select(`
            *,
            entregadores:nome
        `)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar entregas:', error);
        return;
    }
    
    entregas = data;
    renderEntregasTable();
}

// Renderizar tabela de entregas
function renderEntregasTable() {
    entregasTableBody.innerHTML = '';
    
    entregas.forEach(entrega => {
        const row = document.createElement('tr');
        
        // Formatar data
        const data = new Date(entrega.created_at).toLocaleDateString('pt-BR');
        
        // Encontrar nome do entregador
        const entregador = entregadores.find(e => e.id === entrega.entregador_id);
        const nomeEntregador = entregador ? entregador.nome : 'Não atribuído';
        
        row.innerHTML = `
            <td>${entrega.id}</td>
            <td>${entrega.destinatario}</td>
            <td>${entrega.endereco}</td>
            <td><span class="status-badge status-${entrega.status}">${formatStatus(entrega.status)}</span></td>
            <td>${nomeEntregador}</td>
            <td>
                <button class="action-btn" onclick="editEntrega(${entrega.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteEntrega(${entrega.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        entregasTableBody.appendChild(row);
    });
}

// Formatar status para exibição
function formatStatus(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'coletado': 'Coletado',
        'em_transito': 'Em Trânsito',
        'entregue': 'Entregue',
        'cancelado': 'Cancelado'
    };
    
    return statusMap[status] || status;
}

// Mostrar/ocultar formulário de nova entrega
btnNovaEntrega.addEventListener('click', () => {
    formEntrega.classList.toggle('hidden');
    resetForm(entregaForm);
});

// Cancelar criação/edição de entrega
btnCancelar.addEventListener('click', () => {
    formEntrega.classList.add('hidden');
    resetForm(entregaForm);
});

// Criar ou editar entrega
entregaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const destinatario = document.getElementById('destinatario').value;
    const endereco = document.getElementById('endereco').value;
    const contato = document.getElementById('contato').value;
    const entregadorId = document.getElementById('entregadorSelect').value;
    
    const entregaData = {
        destinatario,
        endereco,
        contato,
        entregador_id: entregadorId,
        status: 'pendente'
    };
    
    // Verificar se é uma edição ou criação
    const isEdit = entregaForm.dataset.editId;
    
    if (isEdit) {
        // Editar entrega existente
        const { error } = await supabase
            .from('entregas')
            .update(entregaData)
            .eq('id', isEdit);
            
        if (error) {
            console.error('Erro ao editar entrega:', error);
            alert('Erro ao editar entrega');
            return;
        }
        
        alert('Entrega atualizada com sucesso!');
    } else {
        // Criar nova entrega
        const { error } = await supabase
            .from('entregas')
            .insert([entregaData]);
            
        if (error) {
            console.error('Erro ao criar entrega:', error);
            alert('Erro ao criar entrega');
            return;
        }
        
        alert('Entrega criada com sucesso!');
    }
    
    // Recarregar dados e resetar formulário
    loadEntregas();
    formEntrega.classList.add('hidden');
    resetForm(entregaForm);
    updateStats();
});

// Editar entrega
async function editEntrega(id) {
    const entrega = entregas.find(e => e.id === id);
    
    if (!entrega) return;
    
    // Preencher formulário com dados da entrega
    document.getElementById('destinatario').value = entrega.destinatario;
    document.getElementById('endereco').value = entrega.endereco;
    document.getElementById('contato').value = entrega.contato;
    document.getElementById('entregadorSelect').value = entrega.entregador_id;
    
    // Marcar como edição
    entregaForm.dataset.editId = id;
    
    // Mostrar formulário
    formEntrega.classList.remove('hidden');
}

// Excluir entrega
async function deleteEntrega(id) {
    if (!confirm('Tem certeza que deseja excluir esta entrega?')) return;
    
    const { error } = await supabase
        .from('entregas')
        .delete()
        .eq('id', id);
        
    if (error) {
        console.error('Erro ao excluir entrega:', error);
        alert('Erro ao excluir entrega');
        return;
    }
    
    alert('Entrega excluída com sucesso!');
    loadEntregas();
    updateStats();
}

// Atualizar estatísticas
function updateStats() {
    // Entregas hoje
    const hoje = new Date().toLocaleDateString('pt-BR');
    const entregasHoje = entregas.filter(e => {
        const dataEntrega = new Date(e.created_at).toLocaleDateString('pt-BR');
        return dataEntrega === hoje;
    }).length;
    
    statsToday.textContent = entregasHoje;
    
    // Entregas pendentes
    const entregasPendentes = entregas.filter(e => e.status === 'pendente').length;
    statsPending.textContent = entregasPendentes;
    
    // Entregas concluídas
    const entregasConcluidas = entregas.filter(e => e.status === 'entregue').length;
    statsCompleted.textContent = entregasConcluidas;
    
    // Taxa de sucesso
    const totalEntregas = entregas.length;
    const taxaSucesso = totalEntregas > 0 ? Math.round((entregasConcluidas / totalEntregas) * 100) : 0;
    statsSuccessRate.textContent = `${taxaSucesso}%`;
}

// Navegação entre seções
btnEntregas.addEventListener('click', () => {
    entregasSection.classList.remove('hidden');
    entregadoresSection.classList.add('hidden');
});

btnEntregadores.addEventListener('click', () => {
    entregasSection.classList.add('hidden');
    entregadoresSection.classList.remove('hidden');
});

// Mostrar mensagens
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.classList.remove('hidden');
    
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

// Resetar formulário
function resetForm(form) {
    form.reset();
    delete form.dataset.editId;
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});