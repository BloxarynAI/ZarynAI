// ========== CONFIG ==========
const API_KEYS = {
  'gemini-flash': 'AIzaSyC06c5Z2J2jLTFKFsLLsdlBMCS35DagoDc',
  'gemini-pro': 'YOUR_GEMINI_PRO_KEY',
  'gpt-3': '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'
};

const API_URLS = {
  'gemini-flash': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  'gemini-pro': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
  'gpt-3': 'https://api.openai.com/v1/chat/completions'
};

const MODEL_NAMES = {
  'gemini-flash': 'Gemini 2.0 Flash',
  'gemini-pro': 'Gemini 1.5 Pro',
  'gpt-3': 'GPT-3.5'
};

// ========== STATE ==========
let users = JSON.parse(localStorage.getItem('users')) || [
  {
    name: "Admin User",
    email: "bloxaryn@gmail.com",
    password: "ratohjaroe",
    isAdmin: true,
    joinDate: new Date().toLocaleDateString(),
    loginHistory: [],
    chatHistory: [],
    totalRequests: 0
  }
];

let currentUser = null;
let aiRequests = parseInt(localStorage.getItem('aiRequests')) || 0;
let currentModel = localStorage.getItem('currentModel') || 'gemini-flash';
let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];

// ========== DOM ==========
const $ = (id) => document.getElementById(id);

// ========== INIT ==========
window.addEventListener('DOMContentLoaded', () => {
  const loggedIn = localStorage.getItem('currentUser');
  if (loggedIn) {
    currentUser = JSON.parse(loggedIn);
    showAIInterface();
  } else {
    $('auth-container').style.display = 'block';
    $('ai-container').style.display = 'none';
  }

  setupEventListeners();
});

function setupEventListeners() {
  $('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('login-email').value;
    const password = $('login-password').value;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return alert('Invalid credentials');
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    showAIInterface();
  });

  $('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('register-name').value;
    const email = $('register-email').value;
    const password = $('register-password').value;
    const confirm = $('register-confirm-password').value;
    if (password !== confirm) return alert('Passwords do not match');
    if (users.some(u => u.email === email)) return alert('Email already registered');
    const newUser = { name, email, password, isAdmin: false, joinDate: new Date().toLocaleDateString(), loginHistory: [], chatHistory: [], totalRequests: 0 };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    showAIInterface();
  });

  $('show-register').addEventListener('click', () => toggleAuthForms(true));
  $('show-login').addEventListener('click', () => toggleAuthForms(false));
  $('theme-toggle').addEventListener('change', (e) => {
    document.body.className = e.target.checked ? 'dark-mode' : 'light-mode';
    localStorage.setItem('theme', document.body.className);
  });

  $('hamburger-btn').addEventListener('click', () => $('sidebar').classList.add('open'));
  $('close-sidebar').addEventListener('click', () => $('sidebar').classList.remove('open'));
  $('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    location.reload();
  });

  $('send-btn').addEventListener('click', sendMessage);
  $('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  $('model-select').addEventListener('change', (e) => {
    currentModel = e.target.value;
    localStorage.setItem('currentModel', currentModel);
    $('current-model-name').textContent = `AI Assistant (${MODEL_NAMES[currentModel]})`;
  });

  document.querySelectorAll('.select-model').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentModel = e.target.dataset.model;
      localStorage.setItem('currentModel', currentModel);
      $('model-select').value = currentModel;
      $('current-model-name').textContent = `AI Assistant (${MODEL_NAMES[currentModel]})`;
      showScreen('chat');
    });
  });

  $('clear-history').addEventListener('click', () => {
    if (confirm('Clear history?')) {
      conversationHistory = [];
      localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
      if (currentUser) {
        currentUser.chatHistory = [];
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
      renderHistory();
    }
  });

  $('admin-panel-link').addEventListener('click', () => {
    $('ai-container').style.display = 'none';
    $('admin-panel').classList.remove('hidden');
    $('total-users').textContent = users.length;
    $('total-requests').textContent = aiRequests;
  });

  $('back-to-ai').addEventListener('click', () => {
    $('admin-panel').classList.add('hidden');
    $('ai-container').style.display = 'block';
  });
}

function toggleAuthForms(show = true) {
  $('login-form').classList.toggle('active', !show);
  $('register-form').classList.toggle('active', show);
}

function showAIInterface() {
  $('auth-container').style.display = 'none';
  $('ai-container').style.display = 'block';
  $('current-model-name').textContent = `AI Assistant (${MODEL_NAMES[currentModel]})`;
  if (currentUser.isAdmin) document.body.classList.add('is-admin');
  renderHistory();
}

function showScreen(name) {
  ['home-screen', 'chat-screen', 'models-screen', 'history-screen', 'account-screen'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById(`${name}-screen`).classList.add('active');
  if (name === 'history') renderHistory();
  if (name === 'account') {
    $('account-name').value = currentUser.name;
    $('account-email').value = currentUser.email;
  }
  $('sidebar').classList.remove('open');
}

async function sendMessage() {
  const message = $('user-input').value.trim();
  if (!message) return;
  addMessage(message, 'user');
  $('user-input').value = '';
  const loadingId = 'loading-' + Date.now();
  addMessage('<div class="spinner"></div>', 'ai', loadingId);
  try {
    const res = await fetch(`${API_URLS[currentModel]}?key=${API_KEYS[currentModel]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] })
    });
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    document.getElementById(loadingId)?.remove();
    addMessage(reply, 'ai');
    const ts = new Date().toLocaleString();
    conversationHistory.push({ from: 'user', text: message, time: ts, model: currentModel });
    conversationHistory.push({ from: 'ai', text: reply, time: ts, model: currentModel });
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
    if (currentUser) {
      currentUser.chatHistory.push({ question: message, answer: reply, time: ts, model: currentModel });
      currentUser.totalRequests++;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    aiRequests++;
    localStorage.setItem('aiRequests', aiRequests);
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    addMessage("Error contacting AI.", 'ai');
  }
}

function addMessage(text, sender, id = null) {
  const div = document.createElement('div');
  div.className = `message ${sender}-message`;
  if (id) div.id = id;
  div.innerHTML = text;
  $('chat-messages').appendChild(div);
  $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
}

function renderHistory() {
  const container = $('history-content');
  container.innerHTML = '';
  if (conversationHistory.length === 0) {
    container.innerHTML = '<p>No history.</p>';
    return;
  }
  conversationHistory.forEach(msg => {
    const div = document.createElement('div');
    div.className = `message ${msg.from}-message`;
    div.textContent = msg.text;
    container.appendChild(div);
  });
}
