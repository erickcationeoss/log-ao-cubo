// Configuração do Supabase
const SUPABASE_URL = 'https://lrderyzjbznmyyjnonyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyZGVyeXpqYnpubXl5am5vbnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzk4OTQsImV4cCI6MjA3MjY1NTg5NH0.cU2R8mR2e-1Ui10R3TKWu1Ux2654taRCSg9bEsZpIhQ';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos da DOM
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authForm = document.getElementById('auth-form');
const authButton = document.getElementById('auth-button');
const buttonText = document.querySelector('.button-text');
const buttonLoader = document.querySelector('.button-loader');
const switchAuthMode = document.getElementById('switch-auth-mode');
const logoutBtn = document.getElementById('logout-btn');
const addProductBtn = document.getElementById('add-product-btn');
const productModal = document.getElementById('product-modal');
const closeModal = document.getElementById('close-modal');
const productForm = document.getElementById('product-form');
const criticalItemsList = document.getElementById('critical-items');
const productsList = document.getElementById('products-list');
const criticalCount = document.getElementById('critical-count');

// Estado da aplicação
let isLoginMode = true;

// Inicialização
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    // Verifica se usuário já está logado
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showAppScreen();
        loadProducts();
    } else {
        showAuthScreen();
    }

    // Setup de event listeners
    setupEventListeners();
    
    // Observa mudanças na autenticação
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            showAppScreen();
            loadProducts();
        } else if (event === 'SIGNED_OUT') {
            showAuthScreen();
        }
    });
}

function setupEventListeners() {
    // Autenticação
    authForm.addEventListener('submit', handleAuth);
    switchAuthMode.addEventListener('click', toggleAuthMode);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Produtos
    addProductBtn.addEventListener('click', () => showModal(true));
    closeModal.addEventListener('click', () => showModal(false));
    productForm.addEventListener('submit', handleAddProduct);
    
    // Fechar modal clicando fora
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) showModal(false);
    });
}

// Funções de Autenticação
async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    setLoading(true);
    
    try {
        if (isLoginMode) {
            await signIn(email, password);
        } else {
            await signUp(email, password);
        }
    } catch (error) {
        alert('Erro: ' + error.message);
    } finally {
        setLoading(false);
    }
}

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    
    if (error) throw error;
    return data;
}

async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                company_name: email.split('@')[0] // Nome padrão da empresa
            }
        }
    });
    
    if (error) throw error;
    alert('Conta criada! Verifique seu email para confirmação.');
    toggleAuthMode(); // Volta para o modo de login
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert('Erro ao sair: ' + error.message);
}

// Funções de UI
function showAuthScreen() {
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    productModal.classList.add('hidden');
}

function showAppScreen() {
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    appScreen.classList.add('fade-in');
}

function showModal(show) {
    productModal.classList.toggle('hidden', !show);
    if (show) {
        productModal.classList.add('fade-in');
        productForm.reset();
    }
}

function setLoading(loading) {
    buttonText.classList.toggle('hidden', loading);
    buttonLoader.classList.toggle('hidden', !loading);
    authButton.disabled = loading;
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    authButton.textContent = isLoginMode ? 'Entrar' : 'Cadastrar';
    switchAuthMode.textContent = isLoginMode ? 'Cadastre-se' : 'Fazer Login';
    document.querySelector('.auth-switch p').textContent = 
        isLoginMode ? 'Não tem conta? ' : 'Já tem conta? ';
}

// Funções de Produtos
async function loadProducts() {
    try {
        // Busca produtos do usuário atual
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('name');
        
        if (error) throw error;
        
        displayProducts(products || []);
        updateCriticalItems(products || []);
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        alert('Erro ao carregar produtos: ' + error.message);
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    
    const name = document.getElementById('product-name').value;
    const currentStock = parseInt(document.getElementById('initial-stock').value);
    const replenishmentTime = parseInt(document.getElementById('replenishment-time').value);
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Calcula ponto de pedido inicial (0 vendas = 0 consumo médio)
        const minStockCalculated = 0;
        
        const { error } = await supabase
            .from('products')
            .insert([{
                name: name,
                current_stock: currentStock,
                replenishment_time: replenishmentTime,
                min_stock_calculated: minStockCalculated,
                user_id: user.id
            }]);
        
        if (error) throw error;
        
        showModal(false);
        loadProducts(); // Recarrega a lista
    } catch (error) {
        alert('Erro ao adicionar produto: ' + error.message);
    }
}

function displayProducts(products) {
    if (products.length === 0) {
        productsList.innerHTML = '<div class="empty-state"><p>Nenhum produto cadastrado</p></div>';
        return;
    }
    
    productsList.innerHTML = products.map(product => `
        <div class="item-card">
            <div class="item-info">
                <h4>${product.name}</h4>
                <p>Tempo de reposição: ${product.replenishment_time} dias</p>
            </div>
            <div class="item-stock ${product.current_stock < product.min_stock_calculated ? 'stock-critical' : ''}">
                <div>${product.current_stock} unidades</div>
                ${product.current_stock < product.min_stock_calculated ? 
                  '<small>ESTOQUE BAIXO</small>' : ''}
            </div>
        </div>
    `).join('');
}

function updateCriticalItems(products) {
    const criticalProducts = products.filter(p => p.current_stock < p.min_stock_calculated);
    
    criticalCount.textContent = criticalProducts.length;
    
    if (criticalProducts.length === 0) {
        criticalItemsList.innerHTML = '<div class="empty-state"><p>Nenhum item crítico no momento</p></div>';
        return;
    }
    
    criticalItemsList.innerHTML = criticalProducts.map(product => `
        <div class="item-card">
            <div class="item-info">
                <h4>${product.name}</h4>
                <p>Estoque: ${product.current_stock} (mínimo: ${product.min_stock_calculated})</p>
            </div>
            <div class="item-stock stock-critical">
                <div>REPOR</div>
            </div>
        </div>
    `).join('');
}

// Função para calcular ponto de pedido (será chamada quando houver vendas)
async function calculateReorderPoint(productId) {
    // Busca vendas dos últimos 30 dias
    const { data: sales, error } = await supabase
        .from('sales')
        .select('quantity')
        .eq('product_id', productId)
        .gte('sold_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const dailyAverage = totalSales / 30;
    
    // Busca tempo de reposição do produto
    const { data: product } = await supabase
        .from('products')
        .select('replenishment_time')
        .eq('id', productId)
        .single();
    
    const reorderPoint = Math.ceil(dailyAverage * product.replenishment_time);
    
    // Atualiza o ponto de pedido
    const { error: updateError } = await supabase
        .from('products')
        .update({ min_stock_calculated: reorderPoint })
        .eq('id', productId);
    
    if (updateError) throw updateError;
}