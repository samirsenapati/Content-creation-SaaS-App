// ==========================================
// Todo App - Frontend JavaScript
// ==========================================

const API_URL = window.location.origin;

// State
let currentUser = null;
let todos = [];
let currentFilter = 'all';

// DOM Elements
const loginPage = document.getElementById('login-page');
const registerPage = document.getElementById('register-page');
const todoPage = document.getElementById('todo-page');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const loadingOverlay = document.getElementById('loading-overlay');
const toastContainer = document.getElementById('toast-container');
const apiStatus = document.getElementById('api-status');

// ==========================================
// Utility Functions
// ==========================================

function showLoading() {
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(elementId, message) {
  const errorEl = document.getElementById(elementId);
  if (errorEl) {
    errorEl.textContent = message;
  }
}

function clearErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });
}

// ==========================================
// API Functions
// ==========================================

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...options
  };
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

async function checkApiStatus() {
  try {
    await fetch(`${API_URL}/api/health`);
    apiStatus.classList.add('online');
    apiStatus.classList.remove('offline');
    apiStatus.querySelector('.status-text').textContent = 'API Connected';
  } catch (error) {
    apiStatus.classList.add('offline');
    apiStatus.classList.remove('online');
    apiStatus.querySelector('.status-text').textContent = 'API Offline - Demo Mode';
  }
}

// ==========================================
// Authentication Functions
// ==========================================

async function login(email, password) {
  showLoading();
  clearErrors();
  
  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    showTodoPage();
    showToast('Welcome back!', 'success');
    await loadTodos();
  } catch (error) {
    showError('login-error', error.message);
  } finally {
    hideLoading();
  }
}

async function register(name, email, password) {
  showLoading();
  clearErrors();
  
  try {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    showTodoPage();
    showToast('Account created successfully!', 'success');
  } catch (error) {
    showError('register-error', error.message);
  } finally {
    hideLoading();
  }
}

async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const data = await apiRequest('/api/auth/me');
    currentUser = data.user;
    return true;
  } catch (error) {
    localStorage.removeItem('token');
    return false;
  }
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  todos = [];
  showLoginPage();
  showToast('Logged out successfully', 'info');
}

// ==========================================
// Todo Functions
// ==========================================

async function loadTodos() {
  try {
    const data = await apiRequest('/api/todos');
    todos = data.todos || [];
    renderTodos();
  } catch (error) {
    showToast('Failed to load todos', 'error');
  }
}

async function addTodo(text) {
  try {
    const data = await apiRequest('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    
    todos.unshift(data.todo);
    renderTodos();
    showToast('Todo added!', 'success');
  } catch (error) {
    showToast('Failed to add todo', 'error');
  }
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  
  try {
    await apiRequest(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: !todo.completed })
    });
    
    todo.completed = !todo.completed;
    renderTodos();
  } catch (error) {
    showToast('Failed to update todo', 'error');
  }
}

async function deleteTodo(id) {
  try {
    await apiRequest(`/api/todos/${id}`, {
      method: 'DELETE'
    });
    
    todos = todos.filter(t => t.id !== id);
    renderTodos();
    showToast('Todo deleted', 'info');
  } catch (error) {
    showToast('Failed to delete todo', 'error');
  }
}

async function clearCompleted() {
  const completedIds = todos.filter(t => t.completed).map(t => t.id);
  
  for (const id of completedIds) {
    await deleteTodo(id);
  }
}

// ==========================================
// Render Functions
// ==========================================

function renderTodos() {
  const filteredTodos = todos.filter(todo => {
    if (currentFilter === 'active') return !todo.completed;
    if (currentFilter === 'completed') return todo.completed;
    return true;
  });
  
  todoList.innerHTML = '';
  
  if (filteredTodos.length === 0) {
    emptyState.classList.remove('hidden');
    todoList.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    todoList.classList.remove('hidden');
    
    filteredTodos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div class="todo-checkbox" onclick="toggleTodo(${todo.id})"></div>
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <button class="todo-delete" onclick="deleteTodo(${todo.id})">🗑️</button>
      `;
      todoList.appendChild(li);
    });
  }
  
  updateStats();
}

function updateStats() {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const active = total - completed;
  
  document.getElementById('total-count').textContent = total;
  document.getElementById('active-count').textContent = active;
  document.getElementById('completed-count').textContent = completed;
  
  const clearBtn = document.getElementById('clear-btn');
  clearBtn.style.display = completed > 0 ? 'block' : 'none';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// Page Navigation
// ==========================================

function showLoginPage() {
  loginPage.classList.remove('hidden');
  registerPage.classList.add('hidden');
  todoPage.classList.add('hidden');
}

function showRegisterPage() {
  loginPage.classList.add('hidden');
  registerPage.classList.remove('hidden');
  todoPage.classList.add('hidden');
}

function showTodoPage() {
  loginPage.classList.add('hidden');
  registerPage.classList.add('hidden');
  todoPage.classList.remove('hidden');
  
  if (currentUser) {
    document.getElementById('user-name').textContent = currentUser.name || 'User';
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('user-avatar').textContent = (currentUser.name || currentUser.email)[0].toUpperCase();
  }
}

// Navigation helpers (called from HTML)
function showLogin(e) {
  e.preventDefault();
  showLoginPage();
}

function showRegister(e) {
  e.preventDefault();
  showRegisterPage();
}

function showForgotPassword(e) {
  e.preventDefault();
  showToast('Password reset coming soon!', 'info');
}

function socialLogin(provider) {
  showToast(`${provider} login coming soon!`, 'info');
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const userMenu = document.querySelector('.user-menu');
  const dropdown = document.getElementById('user-dropdown');
  if (userMenu && !userMenu.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

// ==========================================
// Event Listeners
// ==========================================

// Login form
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  await login(email, password);
});

// Register form
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  
  if (password !== confirm) {
    showError('register-error', 'Passwords do not match');
    return;
  }
  
  await register(name, email, password);
});

// Password strength indicator
document.getElementById('register-password').addEventListener('input', (e) => {
  const password = e.target.value;
  const strengthEl = document.getElementById('password-strength');
  const strengthText = strengthEl.querySelector('.strength-text');
  
  strengthEl.classList.remove('weak', 'medium', 'strong');
  
  if (password.length === 0) {
    strengthText.textContent = '';
  } else if (password.length < 6) {
    strengthEl.classList.add('weak');
    strengthText.textContent = 'Weak';
  } else if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    strengthEl.classList.add('medium');
    strengthText.textContent = 'Medium';
  } else {
    strengthEl.classList.add('strong');
    strengthText.textContent = 'Strong';
  }
});

// Todo form
todoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (text) {
    await addTodo(text);
    todoInput.value = '';
  }
});

// Filter tabs
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// Clear completed
document.getElementById('clear-btn').addEventListener('click', clearCompleted);

// ==========================================
// Initialize App
// ==========================================

async function init() {
  showLoading();
  await checkApiStatus();
  
  const isAuthenticated = await checkAuth();
  
  if (isAuthenticated) {
    showTodoPage();
    await loadTodos();
  } else {
    showLoginPage();
  }
  
  hideLoading();
}

// Start the app
init();