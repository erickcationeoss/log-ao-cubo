// Inicialização do Supabase
const supabaseUrl = 'SUA_SUPABASE_URL';
const supabaseAnonKey = 'SUA_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Variáveis globais
let currentUser = null;
let userType = null;
let entregas = [];
let produtos = [];
let pedidos = [];
let deliveryMap = null;
let deliveryMarkers = [];

// Cache de elementos DOM
const domElements = {
    sections: {},
    buttons: {},
    forms: {},
    stats: {}
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initializeParticles();
    cacheDomElements();
    initializeNavigation();
    initializeAuthForms();
    initializeEventListeners();
    checkAuthState();
    
    // Inicialização do mapa (apenas visualização inicial)
    initializeMap();
});

// Cache de elementos DOM para melhor performance
function cacheDomElements() {
    // Seções
    domElements.sections = {
        hero: document.getElementById('heroSection'),
        login: document.getElementById('loginSection'),
        entregadorDashboard: document.getElementById('entregadorDashboard'),
        vendedorDashboard: document.getElementById('vendedorDashboard')
    };
    
    // Botões de navegação
    domElements.buttons = {
        home: document.getElementById('btnHome'),
        entregas: document.getElementById('btnEntregas'),
        entregadores: document.getElementById('btnEntregadores'),
        produtos: document.getElementById('btnProdutos'),
        login: document.getElementById('btnLogin'),
        entregadorHero: document.getElementById('btnEntregadorHero'),
        vendedorHero: document.getElementById('btnVendedorHero'),
        logoutEntregador: document.getElementById('btnLogoutEntregador'),
        logoutVendedor: document.getElementById('btnLogoutVendedor'),
        novoProduto: document.getElementById('btnNovoProduto')
    };
    
    // Formulários
    domElements.forms = {
        loginEntregador: document.getElementById('loginEntregadorForm'),
        registroEntregador: document.getElementById('registroEntregadorForm'),
        loginVendedor: document.getElementById('loginVendedorForm'),
        registroVendedor: document.getElementById('registroVendedorForm')
    };
    
    // Elementos de estatísticas
    domElements.stats = {
        entregasHoje: document.getElementById('statsEntregasHoje'),
        entregasPendentes: document.getElementById('statsEntregasPendentes'),
        entregasConcluidas: document.getElementById('statsEntregasConcluidas'),
        ganhosHoje: document.getElementById('statsGanhosHoje'),
        pedidosHoje: document.getElementById('statsPedidosHoje'),
        paraEnviar: document.getElementById('statsParaEnviar'),
        emTransito: document.getElementById('statsEmTransito'),
        vendasMensais: document.getElementById('statsVendasMensais')
    };
}

// Inicializar partículas de fundo
function initializeParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: "#ff7a00" },
                shape: { type: "circle" },
                opacity: { value: 0.5, random: true },
                size: { value: 3, random: true },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: "#ff7a00",
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: "none",
                    random: true,
                    straight: false,
                    out_mode: "out",
                    bounce: false
                }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: { enable: true, mode: "grab" },
                    onclick: { enable: true, mode: "push" },
                    resize: true
                }
            },
            retina_detect: true
        });
    }
}

// Inicializar mapa
function initializeMap() {
    const mapPreview = document.getElementById('mapPreview');
    if (mapPreview && typeof google !== 'undefined') {
        // Mapa simplificado para visualização inicial
        mapPreview.innerHTML = '<div style="padding: 20px; text-align: center; color: #ccc;">Mapa de visualização será carregado aqui</div>';
    }
}

// Navegação entre seções
function initializeNavigation() {
    // Botões de navegação principal
    domElements.buttons.home.addEventListener('click', () => showSection('hero'));
    domElements.buttons.entregas.addEventListener('click', () => {
        if (currentUser && userType === 'entregador') {
            showSection('entregadorDashboard');
        } else {
            showSection('login');
            switchToTab('entregador');
        }
    });
    domElements.buttons.entregadores.addEventListener('click', () => {
        if (currentUser && userType === 'entregador') {
            showSection('entregadorDashboard');
        } else {
            showSection('login');
            switchToTab('entregador');
        }
    });
    domElements.buttons.produtos.addEventListener('click', () => {
        if (currentUser && userType === 'vendedor') {
            showSection('vendedorDashboard');
        } else {
            showSection('login');
            switchToTab('vendedor');
        }
    });
    domElements.buttons.login.addEventListener('click', () => showSection('login'));
    
    // Botões do hero
    domElements.buttons.entregadorHero.addEventListener('click', () => {
        showSection('login');
        switchToTab('entregador');
    });
    domElements.buttons.vendedorHero.addEventListener('click', () => {
        showSection('login');
        switchToTab('vendedor');
    });
    
    // Tabs de login/registro
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchToTab(tab);
        });
    });
    
    // Alternância entre login e registro
    document.getElementById('showRegistroEntregador').addEventListener('click', function(e) {
        e.preventDefault();
        toggleAuthForms('entregador', 'registro');
    });
    
    document.getElementById('showLoginEntregador').addEventListener('click', function(e) {
        e.preventDefault();
        toggleAuthForms('entregador', 'login');
    });
    
    document.getElementById('showRegistroVendedor').addEventListener('click', function(e) {
        e.preventDefault();
        toggleAuthForms('vendedor', 'registro');
    });
    
    document.getElementById('showLoginVendedor').addEventListener('click', function(e) {
        e.preventDefault();
        toggleAuthForms('vendedor', 'login');
    });
}

// Alternar entre abas
function switchToTab(tab) {
    // Ativar tab clicada e desativar outras
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // Mostrar conteúdo da tab e esconder outros
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`${tab}Tab`).classList.remove('hidden');
    
    // Mostrar formulário de login por padrão
    toggleAuthForms(tab, 'login');
}

// Alternar entre formulários de login e registro
function toggleAuthForms(tab, formType) {
    const loginForm = document.getElementById(`login${tab.charAt(0).toUpperCase() + tab.slice(1)}Form`);
    const registroForm = document.getElementById(`registro${tab.charAt(0).toUpperCase() + tab.slice(1)}Form`);
    
    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        registroForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registroForm.classList.remove('hidden');
    }
}

// Inicializar formulários de autenticação
function initializeAuthForms() {
    // Login entregador
    domElements.forms.loginEntregador.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('entregadorEmail').value;
        const password = document.getElementById('entregadorPassword').value;
        await loginUser(email, password, 'entregador');
    });
    
    // Registro entregador
    domElements.forms.registroEntregador.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nome = document.getElementById('regEntregadorNome').value;
        const email = document.getElementById('regEntregadorEmail').value;
        const telefone = document.getElementById('regEntregadorTelefone').value;
        const veiculo = document.getElementById('regEntregadorVeiculo').value;
        const password = document.getElementById('regEntregadorPassword').value;
        await registerUser(nome, email, telefone, veiculo, password, 'entregador');
    });
    
    // Login vendedor
    domElements.forms.loginVendedor.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('vendedorEmail').value;
        const password = document.getElementById('vendedorPassword').value;
        await loginUser(email, password, 'vendedor');
    });
    
    // Registro vendedor
    domElements.forms.registroVendedor.addEventListener('submit', async function(e) {
        e.preventDefault();
        const empresa = document.getElementById('regVendedorEmpresa').value;
        const cnpj = document.getElementById('regVendedorCNPJ').value;
        const email = document.getElementById('regVendedorEmail').value;
        const telefone = document.getElementById('regVendedorTelefone').value;
        const password = document.getElementById('regVendedorPassword').value;
        await registerUser(empresa, email, telefone, cnpj, password, 'vendedor');
    });
}

// Inicializar event listeners adicionais
function initializeEventListeners() {
    // Logout
    domElements.buttons.logoutEntregador.addEventListener('click', logout);
    domElements.buttons.logoutVendedor.addEventListener('click', logout);
    
    // Novo produto
    domElements.buttons.novoProduto.addEventListener('click', showNovoProdutoModal);
}

// Mostrar seção específica
function showSection(sectionKey) {
    // Esconder todas as seções
    Object.values(domElements.sections).forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    
    // Mostrar a seção solicitada
    if (domElements.sections[sectionKey]) {
        domElements.sections[sectionKey].classList.add('active');
        domElements.sections[sectionKey].classList.remove('hidden');
    }
    
    // Atualizar botões de navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Atualizar UI baseada na seção atual
    if (sectionKey === 'entregadorDashboard' && currentUser && userType === 'entregador') {
        loadEntregadorData();
    } else if (sectionKey === 'vendedorDashboard' && currentUser && userType === 'vendedor') {
        loadVendedorData();
    }
}

// Verificar estado de autenticação
async function checkAuthState() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            
            // Verificar tipo de usuário (buscar na tabela específica)
            const { data: entregador, error: entregadorError } = await supabase
                .from('entregadores')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
                
            if (!entregadorError && entregador) {
                userType = 'entregador';
                showSection('entregadorDashboard');
                loadEntregadorData(entregador);
                return;
            }
            
            const { data: vendedor, error: vendedorError } = await supabase
                .from('vendedores')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
                
            if (!vendedorError && vendedor) {
                userType = 'vendedor';
                showSection('vendedorDashboard');
                loadVendedorData(vendedor);
                return;
            }
            
            // Se não encontrou em nenhuma tabela, fazer logout
            await logout();
        }
    } catch (error) {
        console.error('Erro ao verificar estado de autenticação:', error);
    }
}

// Login de usuário
async function loginUser(email, password, type) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        userType = type;
        
        // Buscar dados específicos do tipo de usuário
        if (type === 'entregador') {
            const { data: entregador, error: entregadorError } = await supabase
                .from('entregadores')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
                
            if (!entregadorError && entregador) {
                showSection('entregadorDashboard');
                loadEntregadorData(entregador);
            } else {
                throw new Error('Perfil de entregador não encontrado');
            }
        } else if (type === 'vendedor') {
            const { data: vendedor, error: vendedorError } = await supabase
                .from('vendedores')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
                
            if (!vendedorError && vendedor) {
                showSection('vendedorDashboard');
                loadVendedorData(vendedor);
            } else {
                throw new Error('Perfil de vendedor não encontrado');
            }
        }
        
        showNotification('Login realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification('Erro ao fazer login: ' + error.message, 'error');
    }
}

// Registrar novo usuário
async function registerUser(nome, email, telefone, extraInfo, password, type) {
    try {
        // Primeiro criar usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });
        
        if (authError) throw authError;
        
        // Depois adicionar à tabela específica
        if (type === 'entregador') {
            const { data, error } = await supabase
                .from('entregadores')
                .insert([
                    {
                        user_id: authData.user.id,
                        nome: nome,
                        email: email,
                        telefone: telefone,
                        veiculo: extraInfo,
                        status: 'ativo'
                    }
                ])
                .select();
                
            if (error) throw error;
            
            showNotification('Entregador registrado com sucesso! Faça login para continuar.', 'success');
            // Voltar para o formulário de login
            toggleAuthForms('entregador', 'login');
            
        } else if (type === 'vendedor') {
            const { data, error } = await supabase
                .from('vendedores')
                .insert([
                    {
                        user_id: authData.user.id,
                        empresa: nome,
                        cnpj: extraInfo,
                        email: email,
                        telefone: telefone,
                        status: 'ativo'
                    }
                ])
                .select();
                
            if (error) throw error;
            
            showNotification('Vendedor registrado com sucesso! Faça login para continuar.', 'success');
            // Voltar para o formulário de login
            toggleAuthForms('vendedor', 'login');
        }
    } catch (error) {
        console.error('Erro no registro:', error);
        showNotification('Erro ao registrar: ' + error.message, 'error');
    }
}

// Logout
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        userType = null;
        entregas = [];
        produtos = [];
        pedidos = [];
        
        // Limpar mapa
        if (deliveryMarkers.length > 0) {
            deliveryMarkers.forEach(marker => marker.setMap(null));
            deliveryMarkers = [];
        }
        
        showSection('hero');
        showNotification('Logout realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro no logout:', error);
        showNotification('Erro ao fazer logout: ' + error.message, 'error');
    }
}

// Carregar dados do entregador
async function loadEntregadorData(entregador) {
    try {
        // Atualizar interface com dados do entregador
        document.getElementById('entregadorNome').textContent = entregador.nome;
        
        // Carregar estatísticas
        await loadEntregadorStats(entregador.id);
        
        // Carregar entregas
        await loadEntregas(entregador.id);
        
        // Inicializar mapa de entregas
        initializeDeliveryMap();
    } catch (error) {
        console.error('Erro ao carregar dados do entregador:', error);
        showNotification('Erro ao carregar dados: ' + error.message, 'error');
    }
}

// Carregar estatísticas do entregador
async function loadEntregadorStats(entregadorId) {
    try {
        // Buscar dados das entregas (exemplo simplificado)
        const hoje = new Date().toISOString().split('T')[0];
                const { data: entregasHoje, error: errorHoje } = await supabase
            .from('entregas')
            .select('*')
            .eq('entregador_id', entregadorId)
            .gte('data_criacao', hoje + 'T00:00:00')
            .lte('data_criacao', hoje + 'T23:59:59');
            
        if (!errorHoje) {
            domElements.stats.entregasHoje.textContent = entregasHoje.length;
            
            const entregasConcluidas = entregasHoje.filter(e => e.status === 'entregue').length;
            domElements.stats.entregasConcluidas.textContent = entregasConcluidas;
            
            const entregasPendentes = entregasHoje.filter(e => e.status !== 'entregue').length;
            domElements.stats.entregasPendentes.textContent = entregasPendentes;
            
            // Calcular ganhos (exemplo: R$ 5 por entrega concluída)
            const ganhos = entregasConcluidas * 5;
            domElements.stats.ganhosHoje.textContent = `R$ ${ganhos.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Carregar entregas do entregador
async function loadEntregas(entregadorId) {
    try {
        const { data, error } = await supabase
            .from('entregas')
            .select(`
                *,
                produtos:produto_id (nome, peso),
                clientes:cliente_id (nome, endereco)
            `)
            .eq('entregador_id', entregadorId)
            .order('data_entrega_prevista', { ascending: true })
            .limit(10);
            
        if (error) throw error;
        
        entregas = data;
        renderEntregasList(data);
    } catch (error) {
        console.error('Erro ao carregar entregas:', error);
        showNotification('Erro ao carregar entregas: ' + error.message, 'error');
    }
}

// Renderizar lista de entregas
function renderEntregasList(entregas) {
    const lista = document.getElementById('listaEntregas');
    lista.innerHTML = '';
    
    if (entregas.length === 0) {
        lista.innerHTML = '<div class="entrega-item"><p>Nenhuma entrega encontrada</p></div>';
        return;
    }
    
    entregas.forEach(entrega => {
        const item = document.createElement('div');
        item.className = 'entrega-item';
        
        let statusClass = 'status-pendente';
        if (entrega.status === 'em_transito') statusClass = 'status-andamento';
        if (entrega.status === 'entregue') statusClass = 'status-entregue';
        
        item.innerHTML = `
            <div class="entrega-info">
                <h4>${entrega.clientes?.nome || 'Cliente'}</h4>
                <p>${entrega.produtos?.nome || 'Produto'} - ${entrega.endereco_entrega}</p>
            </div>
            <div class="entrega-status ${statusClass}">
                ${getStatusText(entrega.status)}
            </div>
        `;
        
        lista.appendChild(item);
    });
}

// Obter texto do status
function getStatusText(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'coletado': 'Coletado',
        'em_transito': 'Em Trânsito',
        'entregue': 'Entregue',
        'cancelado': 'Cancelado'
    };
    
    return statusMap[status] || status;
}

// Inicializar mapa de entregas
function initializeDeliveryMap() {
    // Verificar se a API do Google Maps está disponível
    if (typeof google === 'undefined') {
        console.error('Google Maps API não carregada');
        return;
    }
    
    // Verificar se o mapa já foi inicializado
    if (deliveryMap) {
        deliveryMap.setCenter({ lat: -23.5505, lng: -46.6333 }); // Recentralizar em SP
        return;
    }
    
    // Inicializar mapa
    const mapElement = document.getElementById('entregadorMap');
    if (!mapElement) return;
    
    deliveryMap = new google.maps.Map(mapElement, {
        center: { lat: -23.5505, lng: -46.6333 }, // São Paulo
        zoom: 12,
        styles: [
            {
                "elementType": "geometry",
                "stylers": [{ "color": "#242f3e" }]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#746855" }]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{ "color": "#242f3e" }]
            }
        ]
    });
    
    // Adicionar marcadores para as entregas
    addDeliveryMarkers();
}

// Adicionar marcadores de entrega ao mapa
function addDeliveryMarkers() {
    // Limpar marcadores existentes
    if (deliveryMarkers.length > 0) {
        deliveryMarkers.forEach(marker => marker.setMap(null));
        deliveryMarkers = [];
    }
    
    // Adicionar marcadores para cada entrega
    entregas.forEach(entrega => {
        // Simular coordenadas (em uma aplicação real, você usaria geocoding)
        const lat = -23.5505 + (Math.random() - 0.5) * 0.1;
        const lng = -46.6333 + (Math.random() - 0.5) * 0.1;
        
        const marker = new google.maps.Marker({
            position: { lat, lng },
            map: deliveryMap,
            title: `Entrega para ${entrega.clientes?.nome || 'Cliente'}`,
            icon: {
                url: getMarkerIcon(entrega.status),
                scaledSize: new google.maps.Size(30, 30)
            }
        });
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="color: black;">
                    <h3>${entrega.clientes?.nome || 'Cliente'}</h3>
                    <p>${entrega.produtos?.nome || 'Produto'}</p>
                    <p>Status: ${getStatusText(entrega.status)}</p>
                </div>
            `
        });
        
        marker.addListener('click', () => {
            infoWindow.open(deliveryMap, marker);
        });
        
        deliveryMarkers.push(marker);
    });
}

// Obter ícone do marcador baseado no status
function getMarkerIcon(status) {
    const iconBase = 'https://maps.google.com/mapfiles/ms/icons/';
    
    const statusIcons = {
        'pendente': `${iconBase}red-dot.png`,
        'coletado': `${iconBase}orange-dot.png`,
        'em_transito': `${iconBase}blue-dot.png`,
        'entregue': `${iconBase}green-dot.png`,
        'cancelado': `${iconBase}purple-dot.png`
    };
    
    return statusIcons[status] || `${iconBase}red-dot.png`;
}

// Carregar dados do vendedor
async function loadVendedorData(vendedor) {
    try {
        // Atualizar interface com dados do vendedor
        document.getElementById('vendedorEmpresa').textContent = vendedor.empresa;
        
        // Carregar estatísticas
        await loadVendedorStats(vendedor.id);
        
        // Carregar produtos
        await loadProdutos(vendedor.id);
        
        // Carregar pedidos
        await loadPedidos(vendedor.id);
    } catch (error) {
        console.error('Erro ao carregar dados do vendedor:', error);
        showNotification('Erro ao carregar dados: ' + error.message, 'error');
    }
}

// Carregar estatísticas do vendedor
async function loadVendedorStats(vendedorId) {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        
        // Pedidos hoje
        const { data: pedidosHoje, error: errorPedidos } = await supabase
            .from('pedidos')
            .select('*')
            .eq('vendedor_id', vendedorId)
            .gte('data_criacao', hoje + 'T00:00:00')
            .lte('data_criacao', hoje + 'T23:59:59');
            
        if (!errorPedidos) {
            domElements.stats.pedidosHoje.textContent = pedidosHoje.length;
            
            // Para enviar (pedidos com status 'processando')
            const paraEnviar = pedidosHoje.filter(p => p.status === 'processando').length;
            domElements.stats.paraEnviar.textContent = paraEnviar;
            
            // Em trânsito (pedidos com status 'enviado')
            const emTransito = pedidosHoje.filter(p => p.status === 'enviado').length;
            domElements.stats.emTransito.textContent = emTransito;
        }
        
        // Vendas mensais (exemplo simplificado)
        const primeiroDiaMes = new Date();
        primeiroDiaMes.setDate(1);
        primeiroDiaMes.setHours(0, 0, 0, 0);
        
        const { data: vendasMes, error: errorVendas } = await supabase
            .from('pedidos')
            .select('valor_total')
            .eq('vendedor_id', vendedorId)
            .eq('status', 'entregue')
            .gte('data_criacao', primeiroDiaMes.toISOString());
            
        if (!errorVendas) {
            const total = vendasMes.reduce((sum, venda) => sum + (venda.valor_total || 0), 0);
            domElements.stats.vendasMensais.textContent = `R$ ${total.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas do vendedor:', error);
    }
}

// Carregar produtos do vendedor
async function loadProdutos(vendedorId) {
    try {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('vendedor_id', vendedorId)
            .order('nome', { ascending: true });
            
        if (error) throw error;
        
        produtos = data;
        renderProdutosList(data);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showNotification('Erro ao carregar produtos: ' + error.message, 'error');
    }
}

// Renderizar lista de produtos
function renderProdutosList(produtos) {
    const container = document.querySelector('.products-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (produtos.length === 0) {
        container.innerHTML = '<p>Nenhum produto cadastrado</p>';
        return;
    }
    
    produtos.forEach(produto => {
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `
            <h4>${produto.nome}</h4>
            <p>R$ ${produto.preco?.toFixed(2) || '0,00'} - Estoque: ${produto.estoque || 0}</p>
            <div class="product-actions">
                <button class="edit-product" data-id="${produto.id}">Editar</button>
                <button class="delete-product" data-id="${produto.id}">Excluir</button>
            </div>
        `;
        
        container.appendChild(item);
    });
    
    // Adicionar event listeners para os botões
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-id');
            editProduct(productId);
        });
    });
    
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

// Editar produto
function editProduct(productId) {
    const produto = produtos.find(p => p.id === productId);
    if (!produto) return;
    
    showNotification(`Editando produto: ${produto.nome}`, 'info');
    // Em uma implementação completa, abriria um modal de edição
}

// Excluir produto
async function deleteProduct(productId) {
    try {
        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', productId);
            
        if (error) throw error;
        
        // Recarregar a lista de produtos
        if (currentUser && userType === 'vendedor') {
            await loadProdutos(currentUser.id);
        }
        
        showNotification('Produto excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showNotification('Erro ao excluir produto: ' + error.message, 'error');
    }
}

// Carregar pedidos do vendedor
async function loadPedidos(vendedorId) {
    try {
        const { data, error } = await supabase
            .from('pedidos')
            .select(`
                *,
                produtos:produto_id (nome),
                clientes:cliente_id (nome)
            `)
            .eq('vendedor_id', vendedorId)
            .order('data_criacao', { ascending: false })
            .limit(5);
            
        if (error) throw error;
        
        pedidos = data;
        renderPedidosList(data);
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        showNotification('Erro ao carregar pedidos: ' + error.message, 'error');
    }
}

// Renderizar lista de pedidos
function renderPedidosList(pedidos) {
    const container = document.querySelector('.orders-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (pedidos.length === 0) {
        container.innerHTML = '<p>Nenhum pedido encontrado</p>';
        return;
    }
    
    pedidos.forEach(pedido => {
        const item = document.createElement('div');
        item.className = 'order-item';
        
        let statusClass = 'status-pendente';
        if (pedido.status === 'processando') statusClass = 'status-andamento';
        if (pedido.status === 'enviado') statusClass = 'status-entregue';
        
        item.innerHTML = `
            <div class="order-info">
                <h4>Pedido #${pedido.id}</h4>
                <p>${pedido.produtos?.nome || 'Produto'} - ${pedido.clientes?.nome || 'Cliente'}</p>
                <p>Valor: R$ ${pedido.valor_total?.toFixed(2) || '0,00'}</p>
            </div>
            <div class="order-status ${statusClass}">
                ${getStatusText(pedido.status)}
            </div>
        `;
        
        container.appendChild(item);
    });
}

// Mostrar modal de novo produto
function showNovoProdutoModal() {
    showNotification('Funcionalidade de novo produto em desenvolvimento', 'info');
    // Em uma implementação completa, abriria um modal para adicionar novo produto
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Remover notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Adicionar evento de fechar
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Função auxiliar para formatar CNPJ
function formatCNPJ(cnpj) {
    if (!cnpj) return '';
    
    cnpj = cnpj.replace(/\D/g, '');
    
    if (cnpj.length === 14) {
        return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return cnpj;
}

// Adicionar máscara de CNPJ ao campo
const cnpjInput = document.getElementById('regVendedorCNPJ');
if (cnpjInput) {
    cnpjInput.addEventListener('input', function(e) {
        e.target.value = formatCNPJ(e.target.value);
    });
}

// Função auxiliar para formatar telefone
function formatPhone(phone) {
    if (!phone) return '';
    
    phone = phone.replace(/\D/g, '');
    
    if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (phone.length === 10) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
}
// Adicionar máscara de telefone aos campos
const phoneInputs = document.querySelectorAll('input[type="tel"]');
phoneInputs.forEach(input => {
    input.addEventListener('input', function(e) {
        e.target.value = formatPhone(e.target.value);
    });
});

// Inicializar funcionalidades específicas de cada dashboard
function initializeDashboardFeatures() {
    // Botão para atualizar localização (entregador)
    const updateLocationBtn = document.getElementById('btnUpdateLocation');
    if (updateLocationBtn) {
        updateLocationBtn.addEventListener('click', updateDeliveryLocation);
    }
    
    // Botão para adicionar novo produto (vendedor)
    const addProductBtn = document.getElementById('btnAddProduct');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
    }
}

// Atualizar localização do entregador
async function updateDeliveryLocation() {
    if (!navigator.geolocation) {
        showNotification('Geolocalização não é suportada pelo seu navegador', 'error');
        return;
    }
    
    showNotification('Obtendo localização...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                // Atualizar localização no banco de dados
                const { error } = await supabase
                    .from('entregadores')
                    .update({
                        ultima_latitude: latitude,
                        ultima_longitude: longitude,
                        ultima_atualizacao: new Date().toISOString()
                    })
                    .eq('user_id', currentUser.id);
                
                if (error) throw error;
                
                showNotification('Localização atualizada com sucesso!', 'success');
                
                // Atualizar marcador no mapa se estiver visível
                if (deliveryMap && userType === 'entregador') {
                    updateUserLocationMarker(latitude, longitude);
                }
            } catch (error) {
                console.error('Erro ao atualizar localização:', error);
                showNotification('Erro ao atualizar localização', 'error');
            }
        },
        (error) => {
            console.error('Erro na geolocalização:', error);
            showNotification('Não foi possível obter a localização', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Atualizar marcador de localização do usuário
function updateUserLocationMarker(lat, lng) {
    // Remover marcador anterior se existir
    if (window.userLocationMarker) {
        window.userLocationMarker.setMap(null);
    }
    
    // Criar novo marcador
    window.userLocationMarker = new google.maps.Marker({
        position: { lat, lng },
        map: deliveryMap,
        title: 'Sua localização atual',
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new google.maps.Size(40, 40)
        }
    });
    
    // Centralizar mapa na nova localização
    deliveryMap.setCenter({ lat, lng });
}

// Mostrar modal para adicionar produto
function showAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Configurar submit do formulário
        const form = modal.querySelector('form');
        if (form) {
            form.onsubmit = handleAddProductSubmit;
        }
        
        // Configurar botão de fechar
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.add('hidden');
        }
    }
}

// Manipular envio do formulário de adicionar produto
async function handleAddProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        nome: formData.get('productName'),
        descricao: formData.get('productDescription'),
        preco: parseFloat(formData.get('productPrice')),
        estoque: parseInt(formData.get('productStock')),
        categoria: formData.get('productCategory'),
        vendedor_id: currentUser.id
    };
    
    try {
        const { data, error } = await supabase
            .from('produtos')
            .insert([productData])
            .select();
        
        if (error) throw error;
        
        showNotification('Produto adicionado com sucesso!', 'success');
        
        // Fechar modal e limpar formulário
        document.getElementById('addProductModal').classList.add('hidden');
        e.target.reset();
        
        // Recarregar lista de produtos
        await loadProdutos(currentUser.id);
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        showNotification('Erro ao adicionar produto: ' + error.message, 'error');
    }
}

// Gerenciar estado de conexão
function setupConnectionMonitoring() {
    // Verificar conexão online/offline
    window.addEventListener('online', () => {
        showNotification('Conexão restaurada', 'success');
    });
    
    window.addEventListener('offline', () => {
        showNotification('Conexão perdida. Algumas funcionalidades podem não funcionar.', 'warning');
    });
}

// Inicializar todas as funcionalidades quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initializeParticles();
    cacheDomElements();
    initializeNavigation();
    initializeAuthForms();
    initializeEventListeners();
    initializeDashboardFeatures();
    setupConnectionMonitoring();
    checkAuthState();
    
    // Inicialização do mapa (apenas visualização inicial)
    initializeMap();
});

// Funções utilitárias adicionais
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

// Exportar funções para uso global (se necessário)
window.app = {
    supabase,
    currentUser,
    userType,
    showNotification,
    formatCurrency,
    formatDate
};