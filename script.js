// Configuração do Supabase (valores devem ser preenchidos)
const SUPABASE_CONFIG = {
    url: 'SUA_SUPABASE_URL',
    anonKey: 'SUA_SUPABASE_ANON_KEY'
};

// Verificar se Supabase está disponível
if (typeof supabase === 'undefined') {
    console.error('Supabase não foi carregado. Verifique se o script do Supabase foi incluído.');
}

// Inicialização do Supabase
const supabaseClient = window.supabase ? supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey) : null;

// Estado da aplicação
const AppState = {
    currentUser: null,
    userType: null,
    entregas: [],
    produtos: [],
    pedidos: [],
    deliveryMap: null,
    deliveryMarkers: []
};

// Cache de elementos DOM
const DOM = {
    sections: {},
    buttons: {},
    forms: {},
    stats: {}
};

// Constantes para reutilização
const MAP_DEFAULT_CENTER = { lat: -23.5505, lng: -46.6333 }; // São Paulo
const STATUS_MAP = {
    'pendente': 'Pendente',
    'coletado': 'Coletado',
    'em_transito': 'Em Trânsito',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado'
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Inicialização principal da aplicação
 */
async function initApp() {
    try {
        initializeParticles();
        cacheDomElements();
        initializeNavigation();
        initializeAuthForms();
        initializeEventListeners();
        setupConnectionMonitoring();
        
        // Verificar autenticação
        await checkAuthState();
        
        // Inicialização do mapa (apenas visualização inicial)
        initializeMap();
    } catch (error) {
        console.error('Erro na inicialização da aplicação:', error);
        showNotification('Erro ao inicializar a aplicação', 'error');
    }
}

/**
 * Cache de elementos DOM para melhor performance
 */
function cacheDomElements() {
    // Seções
    const sections = ['hero', 'login', 'entregadorDashboard', 'vendedorDashboard'];
    sections.forEach(section => {
        DOM.sections[section] = document.getElementById(section + 'Section') || 
                               document.getElementById(section);
    });
    
    // Botões de navegação
    const buttonIds = [
        'home', 'entregas', 'entregadores', 'produtos', 'login',
        'entregadorHero', 'vendedorHero', 'logoutEntregador', 
        'logoutVendedor', 'novoProduto', 'updateLocation'
    ];
    
    buttonIds.forEach(btnId => {
        const element = document.getElementById('btn' + btnId.charAt(0).toUpperCase() + btnId.slice(1));
        if (element) {
            DOM.buttons[btnId] = element;
        }
    });
    
    // Formulários
    const formTypes = ['Entregador', 'Vendedor'];
    const formActions = ['login', 'registro'];
    
    formTypes.forEach(type => {
        formActions.forEach(action => {
            const formId = `${action}${type}Form`;
            const element = document.getElementById(formId);
            if (element) {
                DOM.forms[formId] = element;
            }
        });
    });
    
    // Elementos de estatísticas
    const statIds = [
        'entregasHoje', 'entregasPendentes', 'entregasConcluidas',
        'ganhosHoje', 'pedidosHoje', 'paraEnviar', 'emTransito', 'vendasMensais'
    ];
    
    statIds.forEach(statId => {
        const element = document.getElementById('stats' + statId.charAt(0).toUpperCase() + statId.slice(1));
        if (element) {
            DOM.stats[statId] = element;
        }
    });
    
    // Adicionar máscaras aos campos de formulário
    initializeFormMasks();
}

/**
 * Inicializar máscaras para campos de formulário
 */
function initializeFormMasks() {
    // Máscara de CNPJ
    const cnpjInput = document.getElementById('regVendedorCNPJ');
    if (cnpjInput) {
        cnpjInput.addEventListener('input', (e) => {
            e.target.value = formatCNPJ(e.target.value);
        });
    }
    
    // Máscara de telefone
    document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = formatPhone(e.target.value);
        });
    });
}

/**
 * Inicializar partículas de fundo
 */
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

/**
 * Inicializar mapa
 */
function initializeMap() {
    const mapPreview = document.getElementById('mapPreview');
    if (mapPreview) {
        mapPreview.innerHTML = '<div style="padding: 20px; text-align: center; color: #ccc;">Mapa de visualização será carregado aqui</div>';
    }
}

/**
 * Inicializar navegação e eventos
 */
function initializeNavigation() {
    // Mapeamento de navegação
    const navigationMap = {
        home: 'hero',
        entregas: 'entregadorDashboard',
        entregadores: 'entregadorDashboard',
        produtos: 'vendedorDashboard',
        login: 'login',
        entregadorHero: { section: 'login', tab: 'entregador' },
        vendedorHero: { section: 'login', tab: 'vendedor' }
    };
    
    // Configurar eventos de navegação
    Object.entries(navigationMap).forEach(([buttonKey, target]) => {
        if (DOM.buttons[buttonKey]) {
            DOM.buttons[buttonKey].addEventListener('click', () => {
                if (typeof target === 'string') {
                    showSection(target);
                } else {
                    showSection(target.section);
                    switchToTab(target.tab);
                }
            });
        }
    });
    
    // Tabs de login/registro
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (tab) {
                switchToTab(tab);
            }
        });
    });
    
    // Alternância entre login e registro
    const authToggles = {
        'showRegistroEntregador': { type: 'entregador', action: 'registro' },
        'showLoginEntregador': { type: 'entregador', action: 'login' },
        'showRegistroVendedor': { type: 'vendedor', action: 'registro' },
        'showLoginVendedor': { type: 'vendedor', action: 'login' }
    };
    
    Object.entries(authToggles).forEach(([elementId, config]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                toggleAuthForms(config.type, config.action);
            });
        }
    });
}

/**
 * Alternar entre abas
 */
function switchToTab(tab) {
    // Ativar tab clicada e desativar outras
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeTab = document.querySelector(`[data-tab="${tab}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    // Mostrar conteúdo da tab e esconder outros
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    const tabContent = document.getElementById(`${tab}Tab`);
    if (tabContent) tabContent.classList.remove('hidden');
    
    // Mostrar formulário de login por padrão
    toggleAuthForms(tab, 'login');
}

/**
 * Alternar entre formulários de login e registro
 */
function toggleAuthForms(tab, formType) {
    const capitalizedTab = tab.charAt(0).toUpperCase() + tab.slice(1);
    const loginForm = document.getElementById(`login${capitalizedTab}Form`);
    const registroForm = document.getElementById(`registro${capitalizedTab}Form`);
    
    if (loginForm && registroForm) {
        if (formType === 'login') {
            loginForm.classList.remove('hidden');
            registroForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registroForm.classList.remove('hidden');
        }
    }
}

/**
 * Inicializar formulários de autenticação
 */
function initializeAuthForms() {
    // Configuração dos formulários
    const formConfigs = [
        { form: 'loginEntregador', type: 'entregador', handler: handleLogin },
        { form: 'registroEntregador', type: 'entregador', handler: handleRegister },
        { form: 'loginVendedor', type: 'vendedor', handler: handleLogin },
        { form: 'registroVendedor', type: 'vendedor', handler: handleRegister }
    ];
    
    // Adicionar event listeners
    formConfigs.forEach(config => {
        if (DOM.forms[config.form]) {
            DOM.forms[config.form].addEventListener('submit', (e) => {
                e.preventDefault();
                config.handler(e, config.type);
            });
        }
    });
}

/**
 * Manipular login
 */
async function handleLogin(e, type) {
    const formData = new FormData(e.target);
    const email = formData.get('email') || formData.get(`${type}Email`);
    const password = formData.get('password') || formData.get(`${type}Password`);
    
    await loginUser(email, password, type);
}

/**
 * Manipular registro
 */
async function handleRegister(e, type) {
    const formData = new FormData(e.target);
    let userData;
    
    if (type === 'entregador') {
        userData = {
            nome: formData.get('nome') || formData.get('regEntregadorNome'),
            email: formData.get('email') || formData.get('regEntregadorEmail'),
            telefone: formData.get('telefone') || formData.get('regEntregadorTelefone'),
            veiculo: formData.get('veiculo') || formData.get('regEntregadorVeiculo'),
            password: formData.get('password') || formData.get('regEntregadorPassword')
        };
    } else {
        userData = {
            empresa: formData.get('empresa') || formData.get('regVendedorEmpresa'),
            email: formData.get('email') || formData.get('regVendedorEmail'),
            telefone: formData.get('telefone') || formData.get('regVendedorTelefone'),
            cnpj: formData.get('cnpj') || formData.get('regVendedorCNPJ'),
            password: formData.get('password') || formData.get('regVendedorPassword')
        };
    }
    
    await registerUser(userData, type);
}

/**
 * Inicializar event listeners adicionais
 */
function initializeEventListeners() {
    // Logout
    if (DOM.buttons.logoutEntregador) {
        DOM.buttons.logoutEntregador.addEventListener('click', logout);
    }
    if (DOM.buttons.logoutVendedor) {
        DOM.buttons.logoutVendedor.addEventListener('click', logout);
    }
    
    // Novo produto
    if (DOM.buttons.novoProduto) {
        DOM.buttons.novoProduto.addEventListener('click', showNovoProdutoModal);
    }
    
    // Atualizar localização
    if (DOM.buttons.updateLocation) {
        DOM.buttons.updateLocation.addEventListener('click', updateDeliveryLocation);
    }
}

/**
 * Mostrar seção específica
 */
function showSection(sectionKey) {
    // Esconder todas as seções
    Object.values(DOM.sections).forEach(section => {
        if (section) {
            section.classList.remove('active');
            section.classList.add('hidden');
        }
    });
    
    // Mostrar a seção solicitada
    if (DOM.sections[sectionKey]) {
        DOM.sections[sectionKey].classList.add('active');
        DOM.sections[sectionKey].classList.remove('hidden');
    }
    
    // Atualizar UI baseada na seção atual
    if (sectionKey === 'entregadorDashboard' && AppState.currentUser && AppState.userType === 'entregador') {
        loadEntregadorData();
    } else if (sectionKey === 'vendedorDashboard' && AppState.currentUser && AppState.userType === 'vendedor') {
        loadVendedorData();
    }
}

/**
 * Verificar estado de autenticação
 */
async function checkAuthState() {
    try {
        if (!supabaseClient) {
            console.error('Supabase não inicializado');
            return;
        }
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            AppState.currentUser = session.user;
            
            // Verificar tipo de usuário
            const userTypes = ['entregador', 'vendedor'];
            
            for (const type of userTypes) {
                const { data, error } = await supabaseClient
                    .from(`${type}s`)
                    .select('*')
                    .eq('user_id', AppState.currentUser.id)
                    .single();
                    
                if (!error && data) {
                    AppState.userType = type;
                    showSection(`${type}Dashboard`);
                    await loadUserData(type, data);
                    return;
                }
            }
            
            // Se não encontrou em nenhuma tabela, fazer logout
            await logout();
        }
    } catch (error) {
        console.error('Erro ao verificar estado de autenticação:', error);
    }
}

/**
 * Carregar dados do usuário baseado no tipo
 */
async function loadUserData(type, userData) {
    if (type === 'entregador') {
        await loadEntregadorData(userData);
    } else if (type === 'vendedor') {
        await loadVendedorData(userData);
    }
}

/**
 * Login de usuário
 */
async function loginUser(email, password, type) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase não inicializado');
        }
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        
        if (error) throw error;
        
        AppState.currentUser = data.user;
        AppState.userType = type;
        
        // Buscar dados específicos do tipo de usuário
        const { data: userData, error: userError } = await supabaseClient
            .from(`${type}s`)
            .select('*')
            .eq('user_id', AppState.currentUser.id)
            .single();
            
        if (userError) throw new Error(`Perfil de ${type} não encontrado`);
        
        showSection(`${type}Dashboard`);
        await loadUserData(type, userData);
        
        showNotification('Login realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification('Erro ao fazer login: ' + error.message, 'error');
    }
}

/**
 * Registrar novo usuário
 */
async function registerUser(userData, type) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase não inicializado');
        }
        
        // Primeiro criar usuário no Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: userData.email,
            password: userData.password,
        });
        
        if (authError) throw authError;
        
        // Preparar dados para a tabela específica
        let dbData = {
            user_id: authData.user.id,
            email: userData.email,
            telefone: userData.telefone,
            status: 'ativo'
        };
        
        // Adicionar campos específicos
        if (type === 'entregador') {
            dbData.nome = userData.nome;
            dbData.veiculo = userData.veiculo;
        } else {
            dbData.empresa = userData.empresa;
            dbData.cnpj = userData.cnpj;
        }
        // ... (código anterior fornecido)

// Inserir na tabela específica
const { error: dbError } = await supabaseClient
    .from(`${type}s`)
    .insert([dbData]);

if (dbError) throw dbError;

showNotification('Cadastro realizado com sucesso! Verifique seu email para confirmação.', 'success');

// Voltar para o formulário de login
setTimeout(() => {
    toggleAuthForms(type, 'login');
}, 2000);
} catch (error) {
    console.error('Erro no registro:', error);
    showNotification('Erro ao cadastrar: ' + error.message, 'error');
}
}

/**
 * Logout do usuário
 */
async function logout() {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase não inicializado');
        }
        
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        AppState.currentUser = null;
        AppState.userType = null;
        AppState.entregas = [];
        AppState.produtos = [];
        AppState.pedidos = [];
        
        // Limpar mapa e marcadores
        if (AppState.deliveryMap) {
            AppState.deliveryMarkers.forEach(marker => marker.remove());
            AppState.deliveryMarkers = [];
        }
        
        showSection('hero');
        showNotification('Logout realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro no logout:', error);
        showNotification('Erro ao fazer logout: ' + error.message, 'error');
    }
}

/**
 * Carregar dados do entregador
 */
async function loadEntregadorData(entregadorData) {
    try {
        if (!supabaseClient || !AppState.currentUser) return;
        
        // Buscar entregas atribuídas ao entregador
        const { data: entregas, error } = await supabaseClient
            .from('entregas')
            .select('*, pedidos(*, produtos(*))')
            .eq('entregador_id', AppState.currentUser.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        AppState.entregas = entregas || [];
        
        // Atualizar estatísticas
        updateEntregadorStats();
        
        // Renderizar lista de entregas
        renderEntregasList();
        
        // Inicializar mapa de entregas se necessário
        if (!AppState.deliveryMap && document.getElementById('deliveryMap')) {
            initializeDeliveryMap();
        } else if (AppState.deliveryMap) {
            updateDeliveryMap();
        }
    } catch (error) {
        console.error('Erro ao carregar dados do entregador:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

/**
 * Atualizar estatísticas do entregador
 */
function updateEntregadorStats() {
    if (!DOM.stats.entregasHoje) return;
    
    const hoje = new Date().toISOString().split('T')[0];
    const entregasHoje = AppState.entregas.filter(e => 
        e.created_at.split('T')[0] === hoje
    ).length;
    
    const entregasPendentes = AppState.entregas.filter(e => 
        e.status === 'pendente' || e.status === 'em_transito'
    ).length;
    
    const entregasConcluidas = AppState.entregas.filter(e => 
        e.status === 'entregue'
    ).length;
    
    // Calcular ganhos do dia (exemplo: R$ 10 por entrega)
    const ganhosHoje = entregasHoje * 10;
    
    // Atualizar DOM
    DOM.stats.entregasHoje.textContent = entregasHoje;
    DOM.stats.entregasPendentes.textContent = entregasPendentes;
    DOM.stats.entregasConcluidas.textContent = entregasConcluidas;
    DOM.stats.ganhosHoje.textContent = `R$ ${ganhosHoje.toFixed(2)}`;
}

/**
 * Renderizar lista de entregas
 */
function renderEntregasList() {
    const entregasList = document.getElementById('entregasList');
    if (!entregasList) return;
    
    if (AppState.entregas.length === 0) {
        entregasList.innerHTML = '<div class="empty-state">Nenhuma entrega atribuída</div>';
        return;
    }
    
    entregasList.innerHTML = AppState.entregas.map(entrega => {
        const pedido = entrega.pedidos;
        const produtos = pedido.produtos || {};
        
        return `
            <div class="entrega-card" data-id="${entrega.id}">
                <div class="entrega-header">
                    <h3>Entrega #${entrega.id}</h3>
                    <span class="status-badge ${entrega.status}">${STATUS_MAP[entrega.status] || entrega.status}</span>
                </div>
                <div class="entrega-body">
                    <p><strong>Cliente:</strong> ${pedido.nome_cliente || 'N/A'}</p>
                    <p><strong>Endereço:</strong> ${pedido.endereco_entrega || 'N/A'}</p>
                    <p><strong>Produto:</strong> ${produtos.nome || 'N/A'}</p>
                    <p><strong>Telefone:</strong> ${pedido.telefone_cliente || 'N/A'}</p>
                </div>
                <div class="entrega-actions">
                    ${entrega.status === 'pendente' ? 
                        `<button class="btn-action coletar" onclick="updateEntregaStatus(${entrega.id}, 'coletado')">Coletar</button>` : ''}
                    ${entrega.status === 'coletado' ? 
                        `<button class="btn-action em-transito" onclick="updateEntregaStatus(${entrega.id}, 'em_transito')">Saiu para Entrega</button>` : ''}
                    ${entrega.status === 'em_transito' ? 
                        `<button class="btn-action entregue" onclick="updateEntregaStatus(${entrega.id}, 'entregue')">Entregue</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Atualizar status da entrega
 */
async function updateEntregaStatus(entregaId, novoStatus) {
    try {
        if (!supabaseClient) return;
        
        const { error } = await supabaseClient
            .from('entregas')
            .update({ 
                status: novoStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', entregaId);
            
        if (error) throw error;
        
        // Atualizar localmente
        const entregaIndex = AppState.entregas.findIndex(e => e.id === entregaId);
        if (entregaIndex !== -1) {
            AppState.entregas[entregaIndex].status = novoStatus;
            AppState.entregas[entregaIndex].updated_at = new Date().toISOString();
        }
        
        // Atualizar UI
        updateEntregadorStats();
        renderEntregasList();
        
        showNotification('Status atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showNotification('Erro ao atualizar status', 'error');
    }
}

/**
 * Inicializar mapa de entregas
 */
function initializeDeliveryMap() {
    const mapElement = document.getElementById('deliveryMap');
    if (!mapElement) return;
    
    // Simulação de inicialização do mapa (substituir por API real como Leaflet ou Google Maps)
    mapElement.innerHTML = `
        <div class="map-placeholder">
            <h3>Mapa de Entregas</h3>
            <p>Visualize suas rotas de entrega aqui</p>
            <div class="map-actions">
                <button onclick="updateDeliveryLocation()" class="btn-primary">
                    Atualizar Minha Localização
                </button>
            </div>
        </div>
    `;
    
    AppState.deliveryMap = { initialized: true }; // Marcador simulado
}

/**
 * Atualizar mapa de entregas
 */
function updateDeliveryMap() {
    // Em uma implementação real, aqui atualizariamos os marcadores no mapa
    console.log('Mapa atualizado com', AppState.entregas.length, 'entregas');
}

/**
 * Atualizar localização do entregador
 */
async function updateDeliveryLocation() {
    try {
        if (!navigator.geolocation) {
            showNotification('Geolocalização não suportada pelo navegador', 'error');
            return;
        }
        
        showNotification('Obtendo localização...', 'info');
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Em uma implementação real, salvaríamos no banco
                console.log('Localização atual:', latitude, longitude);
                
                showNotification('Localização atualizada com sucesso!', 'success');
                
                // Simular atualização no mapa
                if (AppState.deliveryMap) {
                    // Adicionar marcador da localização atual
                    console.log('Marcador adicionado em:', latitude, longitude);
                }
            },
            (error) => {
                console.error('Erro ao obter localização:', error);
                showNotification('Erro ao obter localização: ' + error.message, 'error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    } catch (error) {
        console.error('Erro ao atualizar localização:', error);
        showNotification('Erro ao atualizar localização', 'error');
    }
}

/**
 * Carregar dados do vendedor
 */
async function loadVendedorData(vendedorData) {
    try {
        if (!supabaseClient || !AppState.currentUser) return;
        
        // Buscar produtos do vendedor
        const { data: produtos, error: produtosError } = await supabaseClient
            .from('produtos')
            .select('*')
            .eq('vendedor_id', AppState.currentUser.id)
            .order('created_at', { ascending: false });
            
        if (produtosError) throw produtosError;
        
        AppState.produtos = produtos || [];
        
        // Buscar pedidos do vendedor
        const { data: pedidos, error: pedidosError } = await supabaseClient
            .from('pedidos')
            .select('*, produtos(*), entregas(*)')
            .eq('vendedor_id', AppState.currentUser.id)
            .order('created_at', { ascending: false });
            
        if (pedidosError) throw pedidosError;
        
        AppState.pedidos = pedidos || [];
        
        // Atualizar estatísticas
        updateVendedorStats();
        
        // Renderizar lista de produtos
        renderProdutosList();
        
        // Renderizar lista de pedidos
        renderPedidosList();
    } catch (error) {
        console.error('Erro ao carregar dados do vendedor:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

/**
 * Atualizar estatísticas do vendedor
 */
function updateVendedorStats() {
    if (!DOM.stats.pedidosHoje) return;
    
    const hoje = new Date().toISOString().split('T')[0];
    const pedidosHoje = AppState.pedidos.filter(p => 
        p.created_at.split('T')[0] === hoje
    ).length;
    
    const paraEnviar = AppState.pedidos.filter(p => 
        !p.entregas || p.entregas.status === 'pendente'
    ).length;
    
    const emTransito = AppState.pedidos.filter(p => 
        p.entregas && p.entregas.status === 'em_transito'
    ).length;
    
    // Calcular vendas mensais (exemplo simplificado)
    const vendasMensais = AppState.pedidos.length * 50; // R$ 50 por pedido em média
    
    // Atualizar DOM
    DOM.stats.pedidosHoje.textContent = pedidosHoje;
    DOM.stats.paraEnviar.textContent = paraEnviar;
    DOM.stats.emTransito.textContent = emTransito;
    DOM.stats.vendasMensais.textContent = `R$ ${vendasMensais.toFixed(2)}`;
}

/**
 * Renderizar lista de produtos
 */
function renderProdutosList() {
    const produtosList = document.getElementById('produtosList');
    if (!produtosList) return;
    
    if (AppState.produtos.length === 0) {
        produtosList.innerHTML = '<div class="empty-state">Nenhum produto cadastrado</div>';
        return;
    }
    
    produtosList.innerHTML = AppState.produtos.map(produto => `
        <div class="produto-card">
            <div class="produto-image">
                ${produto.imagem_url ? 
                    `<img src="${produto.imagem_url}" alt="${produto.nome}">` : 
                    '<div class="image-placeholder">Sem imagem</div>'
                }
            </div>
            <div class="produto-info">
                <h3>${produto.nome}</h3>
                <p class="produto-descricao">${produto.descricao || 'Sem descrição'}</p>
                <p class="produto-preco">R$ ${produto.preco?.toFixed(2) || '0,00'}</p>
                <p class="produto-estoque">Estoque: ${produto.estoque || 0}</p>
            </div>
            <div class="produto-actions">
                <button class="btn-action edit" onclick="editProduto(${produto.id})">Editar</button>
                <button class="btn-action delete" onclick="deleteProduto(${produto.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

/**
 * Renderizar lista de pedidos
 */
function renderPedidosList() {
    const pedidosList = document.getElementById('pedidosList');
    if (!pedidosList) return;
    
    if (AppState.pedidos.length === 0) {
        pedidosList.innerHTML = '<div class="empty-state">Nenhum pedido realizado</div>';
        return;
    }
    
    pedidosList.innerHTML = AppState.pedidos.map(pedido => {
        const entregaStatus = pedido.entregas ? 
            STATUS_MAP[pedido.entregas.status] || pedido.entregas.status : 
            'Pendente';
            
        return `
            <div class="pedido-card">
                <div class="pedido-header">
                    <h3>Pedido #${pedido.id}</h3>
                    <span class="status-badge ${pedido.entregas?.status || 'pendente'}">${entregaStatus}</span>
                </div>
                <div class="pedido-body">
                    <p><strong>Cliente:</strong> ${pedido.nome_cliente}</p>
                    <p><strong>Produto:</strong> ${pedido.produtos?.nome || 'N/A'}</p>
                    <p><strong>Quantidade:</strong> ${pedido.quantidade}</p>
                    <p><strong>Total:</strong> R$ ${pedido.valor_total?.toFixed(2) || '0,00'}</p>
                    <p><strong>Endereço:</strong> ${pedido.endereco_entrega}</p>
                </div>
                <div class="pedido-actions">
                    ${!pedido.entregas ? 
                        `<button class="btn-action" onclick="solicitarEntrega(${pedido.id})">Solicitar Entrega</button>` : 
                        `<button class="btn-action" onclick="verRastreio(${pedido.id})">Ver Rastreio</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Mostrar modal de novo produto
 */
function showNovoProdutoModal() {
    const modal = document.getElementById('novoProdutoModal');
    if (!modal) return;
    
    // Limpar formulário
    const form = modal.querySelector('form');
    if (form) form.reset();
    
    // Mostrar modal
    modal.classList.remove('hidden');
}

/**
 * Fechar modal de novo produto
 */
function closeNovoProdutoModal() {
    const modal = document.getElementById('novoProdutoModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Salvar novo produto
 */
async function saveNovoProduto(e) {
    e.preventDefault();
    
    try {
        if (!supabaseClient || !AppState.currentUser) return;
        
        const formData = new FormData(e.target);
        const produtoData = {
            nome: formData.get('produtoNome'),
            descricao: formData.get('produtoDescricao'),
            preco: parseFloat(formData.get('produtoPreco')),
            estoque: parseInt(formData.get('produtoEstoque')),
            vendedor_id: AppState.currentUser.id,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('produtos')
            .insert([produtoData]);
            
        if (error) throw error;
        
        // Atualizar lista local
        AppState.produtos.unshift({ ...produtoData, id: Math.random().toString(36).substr(2, 9) });
        
        // Atualizar UI
        renderProdutosList();
        closeNovoProdutoModal();
        
        showNotification('Produto cadastrado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        showNotification('Erro ao salvar produto: ' + error.message, 'error');
    }
}

/**
 * Editar produto
 */
function editProduto(produtoId) {
    const produto = AppState.produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const modal = document.getElementById('novoProdutoModal');
    if (!modal) return;
    
    // Preencher formulário com dados do produto
    const form = modal.querySelector('form');
    if (form) {
        form.querySelector('[name="produtoNome"]').value = produto.nome || '';
        form.querySelector('[name="produtoDescricao"]').value = produto.descricao || '';
        form.querySelector('[name="produtoPreco"]').value = produto.preco || '';
        form.querySelector('[name="produtoEstoque"]').value = produto.estoque || '';
        
        // Alterar o botão para "Atualizar"
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Atualizar Produto';
            submitBtn.onclick = (e) => updateProduto(e, produtoId);
        }
    }
    
    // Mostrar modal
    modal.classList.remove('hidden');
}

/**
 * Atualizar produto
 */
async function updateProduto(e, produtoId) {
    e.preventDefault();
    
    try {
        if (!supabaseClient) return;
        
        const formData = new FormData(e.target);
        const produtoData = {
            nome: formData.get('produtoNome'),
            descricao: formData.get('produtoDescricao'),
            preco: parseFloat(formData.get('produtoPreco')),
            estoque: parseInt(formData.get('produtoEstoque')),
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('produtos')
            .update(produtoData)
            .eq('id', produtoId);
            
        if (error) throw error;
        
        // Atualizar localmente
        const index = AppState.produtos.findIndex(p => p.id === produtoId);
        if (index !== -1) {
            AppState.produtos[index] = { ...AppState.produtos[index], ...produtoData };
        }
        
        // Atualizar UI
        renderProdutosList();
        closeNovoProdutoModal();
        
        showNotification('Produto atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        showNotification('Erro ao atualizar produto: ' + error.message, 'error');
    }
}

/**
 * Excluir produto
 */
async function deleteProduto(produtoId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
        if (!supabaseClient) return;
        
        const { error } = await supabaseClient
            .from('produtos')
            .delete()
            .eq('id', produtoId);
            
        if (error) throw error;
        
        // Remover localmente
        AppState.produtos = AppState.produtos.filter(p => p.id !== produtoId);
        
        // Atualizar UI
        renderProdutosList();
        
        showNotification('Produto excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showNotification('Erro ao excluir produto: ' + error.message, 'error');
    }
}

/**
 * Solicitar entrega para um pedido
 */
async function solicitarEntrega(pedidoId) {
    try {
        if (!supabaseClient) return;
        
        const pedido = AppState.pedidos.find(p => p.id === pedidoId);
        if (!pedido) return;
        
        // Em uma implementação real, buscaríamos um entregador disponível
        // Aqui estamos simulando a criação de uma entrega
        const entregaData = {
            pedido_id: pedidoId,
            status: 'pendente',
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient
            .from('entregas')
            .insert([entregaData]);
            
        if (error) throw error;
        
        // Atualizar localmente
        const index = AppState.pedidos.findIndex(p => p.id === pedidoId);
        if (index !== -1) {
            AppState.pedidos[index].entregas = { ...entregaData, id: Math.random().toString(36).substr(2, 9) };
        }
        
        // Atualizar UI
        renderPedidosList();
        
        showNotification('Entrega solicitada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao solicitar entrega:', error);
        showNotification('Erro ao solicitar entrega: ' + error.message, 'error');
    }
}

/**
 * Ver rastreio de entrega
 */
function verRastreio(pedidoId) {
    const pedido = AppState.pedidos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.entregas) return;
    
    alert(`Status do rastreio: ${STATUS_MAP[pedido.entregas.status] || pedido.entregas.status}`);
}

/**
 * Monitorar conexão
 */
function setupConnectionMonitoring() {
    // Verificar conexão periodicamente
    setInterval(() => {
        const online = navigator.onLine;
        const statusElement = document.getElementById('connectionStatus');
        
        if (statusElement) {
            if (online) {
                statusElement.classList.remove('offline');
                statusElement.textContent = 'Online';
            } else {
                statusElement.classList.add('offline');
                statusElement.textContent = 'Offline';
            }
        }
    }, 5000);
}

/**
 * Mostrar notificação
 */
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Adicionar ao container de notificações
    const container = document.getElementById('notifications');
    if (container) {
        container.appendChild(notification);
        
        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

/**
 * Formatar CNPJ
 */
function formatCNPJ(value) {
    if (!value) return '';
    
    const cnpj = value.replace(/\D/g, '');
    
    if (cnpj.length <= 2) {
        return cnpj;
    } else if (cnpj.length <= 5) {
        return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
    } else if (cnpj.length <= 8) {
        return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
    } else if (cnpj.length <= 12) {
        return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
    } else {
        return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
    }
}

/**
 * Formatar telefone
 */
function formatPhone(value) {
    if (!value) return '';
    
    const phone = value.replace(/\D/g, '');
    
    if (phone.length <= 2) {
        return phone;
    } else if (phone.length <= 6) {
        return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
    } else if (phone.length <= 10) {
        return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    } else {
        return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`;
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', initApp);