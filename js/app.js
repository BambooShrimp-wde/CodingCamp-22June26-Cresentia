/* =====================
   Budget & Expense Visualizer
   Vanilla JS · LocalStorage · Chart.js
   ===================== */

// ── Category colours ──────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Food':             '#2dd4bf',
  'Transport':        '#f87171',
  'Fun':              '#a78bfa',
  'Shopping':         '#fbbf24',
  'Bills & Utilities':'#60a5fa',
};

function getCategoryColor(cat) {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  // Generate a deterministic colour for custom categories
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 65%, 55%)`;
}

// ── State ─────────────────────────────────────────────────────────
let state = {
  transactions: [],
  budget: 2000,
  spendLimit: 0,
  customCategories: [],
  theme: 'light',
  sortMode: 'date',
};

function loadState() {
  const saved = localStorage.getItem('budgetAppState');
  if (saved) {
    try { state = { ...state, ...JSON.parse(saved) }; } catch (e) {}
  }
}

function saveState() {
  localStorage.setItem('budgetAppState', JSON.stringify(state));
}

// ── DOM refs ──────────────────────────────────────────────────────
const themeToggle       = document.getElementById('themeToggle');
const openModalBtn      = document.getElementById('openModalBtn');
const closeModalBtn     = document.getElementById('closeModalBtn');
const cancelBtn         = document.getElementById('cancelBtn');
const modalOverlay      = document.getElementById('modalOverlay');
const settingsBtn       = document.getElementById('settingsBtn');
const settingsOverlay   = document.getElementById('settingsOverlay');
const closeSettingsBtn  = document.getElementById('closeSettingsBtn');
const saveSettingsBtn   = document.getElementById('saveSettingsBtn');
const expenseForm       = document.getElementById('expenseForm');
const transactionList   = document.getElementById('transactionList');
const emptyState        = document.getElementById('emptyState');
const budgetDisplay     = document.getElementById('budgetDisplay');
const spentDisplay      = document.getElementById('spentDisplay');
const remainingDisplay  = document.getElementById('remainingDisplay');
const budgetBarFill     = document.getElementById('budgetBarFill');
const budgetBarPercent  = document.getElementById('budgetBarPercent');
const chartLegend       = document.getElementById('chartLegend');
const chartEmpty        = document.getElementById('chartEmpty');
const limitWarning      = document.getElementById('limitWarning');
const limitDisplay      = document.getElementById('limitDisplay');
const budgetInput       = document.getElementById('budgetInput');
const spendLimitInput   = document.getElementById('spendLimitInput');
const customCategoryInput = document.getElementById('customCategoryInput');
const addCategoryBtn    = document.getElementById('addCategoryBtn');
const customCatList     = document.getElementById('customCatList');
const itemAmountInput   = document.getElementById('itemAmount');

// ── Chart setup ───────────────────────────────────────────────────
let spendingChart = null;

function initChart() {
  const ctx = document.getElementById('spendingChart').getContext('2d');
  spendingChart = new Chart(ctx, {
    type: 'pie',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 2, borderColor: 'transparent' }] },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: $${ctx.parsed.toFixed(2)}`
          }
        }
      },
      animation: { duration: 400 },
    }
  });
}

// ── Render helpers ────────────────────────────────────────────────
function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTotals() {
  const spent = state.transactions.reduce((s, t) => s + t.amount, 0);
  const remaining = state.budget - spent;
  const pct = state.budget > 0 ? Math.min((spent / state.budget) * 100, 100) : 0;
  return { spent, remaining, pct };
}

function getCategoryTotals() {
  const totals = {};
  state.transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return totals;
}

function getSortedTransactions() {
  const list = [...state.transactions];
  switch (state.sortMode) {
    case 'date': return list.sort((a, b) => new Date(b.date) - new Date(a.date));
    case 'high': return list.sort((a, b) => b.amount - a.amount);
    case 'low':  return list.sort((a, b) => a.amount - b.amount);
    case 'az':   return list.sort((a, b) => a.name.localeCompare(b.name));
    default:     return list;
  }
}

// ── Render: Summary ───────────────────────────────────────────────
function renderSummary() {
  const { spent, remaining, pct } = getTotals();
  budgetDisplay.textContent    = fmt(state.budget);
  spentDisplay.textContent     = fmt(spent);
  remainingDisplay.textContent = fmt(remaining);
  budgetBarFill.style.width    = pct + '%';
  budgetBarPercent.textContent = pct.toFixed(1) + '%';

  // Turn bar red when over budget
  budgetBarFill.style.background = pct >= 100 ? 'var(--spent-color)' : 'var(--bar-fill)';
  remainingDisplay.style.color   = remaining < 0 ? 'var(--spent-color)' : 'var(--remaining-color)';
}

// ── Render: Chart ─────────────────────────────────────────────────
function renderChart() {
  const totals = getCategoryTotals();
  const labels = Object.keys(totals);

  if (labels.length === 0) {
    chartEmpty.style.display = 'flex';
    spendingChart.data.labels = [];
    spendingChart.data.datasets[0].data = [];
    spendingChart.data.datasets[0].backgroundColor = [];
    spendingChart.update();
    chartLegend.innerHTML = '';
    return;
  }

  chartEmpty.style.display = 'none';
  spendingChart.data.labels = labels;
  spendingChart.data.datasets[0].data = labels.map(l => totals[l]);
  spendingChart.data.datasets[0].backgroundColor = labels.map(l => getCategoryColor(l));
  spendingChart.update();

  chartLegend.innerHTML = labels.map(l => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${getCategoryColor(l)}"></span>
      ${l}
    </div>
  `).join('');
}

// ── Render: Transaction List ──────────────────────────────────────
function renderTransactions() {
  const sorted = getSortedTransactions();

  if (sorted.length === 0) {
    transactionList.innerHTML = '<li class="empty-state">No transactions yet. Add one above!</li>';
    return;
  }

  transactionList.innerHTML = sorted.map(t => {
    const overLimit = state.spendLimit > 0 && t.amount > state.spendLimit;
    return `
      <li class="transaction-item ${overLimit ? 'over-limit' : ''}" data-id="${t.id}">
        <div class="transaction-info">
          <span class="transaction-name">
            ${escapeHtml(t.name)}
            <span class="category-tag">${escapeHtml(t.category)}</span>
            ${overLimit ? '<span class="category-tag" style="background:#fecdd3;color:#9f1239">⚠️ Over limit</span>' : ''}
          </span>
          <span class="transaction-date">${fmtDate(t.date)}</span>
        </div>
        <span class="transaction-amount">${fmt(t.amount)}</span>
        <button class="delete-btn" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.name)}">✕</button>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Render: All ───────────────────────────────────────────────────
function renderAll() {
  renderSummary();
  renderChart();
  renderTransactions();
}

// ── Render: Category Dropdown ─────────────────────────────────────
function renderCategoryOptions() {
  const select = document.getElementById('itemCategory');
  const allCats = ['Food', 'Transport', 'Fun', 'Shopping', 'Bills & Utilities', ...state.customCategories];
  const currentVal = select.value;
  select.innerHTML = '<option value="">Select a category</option>' +
    allCats.map(c => `<option value="${escapeHtml(c)}" ${currentVal === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

// ── Render: Custom Categories (settings) ─────────────────────────
function renderCustomCatList() {
  customCatList.innerHTML = state.customCategories.map(c => `
    <li>
      ${escapeHtml(c)}
      <button data-cat="${escapeHtml(c)}" aria-label="Remove ${escapeHtml(c)}">✕</button>
    </li>
  `).join('');
}

// ── Theme ─────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Form validation ───────────────────────────────────────────────
function validateForm() {
  let valid = true;
  const nameVal     = document.getElementById('itemName').value.trim();
  const amountVal   = document.getElementById('itemAmount').value.trim();
  const categoryVal = document.getElementById('itemCategory').value;

  const nameErr     = document.getElementById('nameError');
  const amountErr   = document.getElementById('amountError');
  const categoryErr = document.getElementById('categoryError');
  const nameInput   = document.getElementById('itemName');
  const amountInput = document.getElementById('itemAmount');
  const catInput    = document.getElementById('itemCategory');

  nameErr.textContent = '';
  amountErr.textContent = '';
  categoryErr.textContent = '';
  nameInput.classList.remove('error');
  amountInput.classList.remove('error');
  catInput.classList.remove('error');

  if (!nameVal) {
    nameErr.textContent = 'Item name is required.';
    nameInput.classList.add('error');
    valid = false;
  }
  if (!amountVal || isNaN(amountVal) || Number(amountVal) <= 0) {
    amountErr.textContent = 'Enter a valid amount greater than 0.';
    amountInput.classList.add('error');
    valid = false;
  }
  if (!categoryVal) {
    categoryErr.textContent = 'Please select a category.';
    catInput.classList.add('error');
    valid = false;
  }

  return valid;
}

// ── Add Transaction ───────────────────────────────────────────────
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const name     = document.getElementById('itemName').value.trim();
  const amount   = parseFloat(document.getElementById('itemAmount').value);
  const category = document.getElementById('itemCategory').value;

  state.transactions.push({
    id: Date.now().toString(),
    name,
    amount,
    category,
    date: new Date().toISOString(),
  });

  saveState();
  renderAll();
  closeModal();
  expenseForm.reset();
  limitWarning.style.display = 'none';
});

// ── Delete Transaction ────────────────────────────────────────────
transactionList.addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  renderAll();
});

// ── Sort buttons ──────────────────────────────────────────────────
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sortMode = btn.dataset.sort;
    saveState();
    renderTransactions();
  });
});

// ── Spending limit live warning in form ───────────────────────────
itemAmountInput.addEventListener('input', () => {
  const val = parseFloat(itemAmountInput.value);
  if (state.spendLimit > 0 && val > state.spendLimit) {
    limitDisplay.textContent = fmt(state.spendLimit);
    limitWarning.style.display = 'block';
  } else {
    limitWarning.style.display = 'none';
  }
});

// ── Modal open/close ──────────────────────────────────────────────
function openModal() {
  renderCategoryOptions();
  expenseForm.reset();
  limitWarning.style.display = 'none';
  ['nameError','amountError','categoryError'].forEach(id => document.getElementById(id).textContent = '');
  ['itemName','itemAmount','itemCategory'].forEach(id => document.getElementById(id).classList.remove('error'));
  modalOverlay.classList.add('open');
  document.getElementById('itemName').focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

// ── Settings open/close ───────────────────────────────────────────
function openSettings() {
  budgetInput.value     = state.budget;
  spendLimitInput.value = state.spendLimit;
  renderCustomCatList();
  settingsOverlay.classList.add('open');
}

function closeSettings() {
  settingsOverlay.classList.remove('open');
}

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettings(); });

saveSettingsBtn.addEventListener('click', () => {
  const b = parseFloat(budgetInput.value);
  const l = parseFloat(spendLimitInput.value);
  if (!isNaN(b) && b > 0) state.budget = b;
  state.spendLimit = (!isNaN(l) && l >= 0) ? l : 0;
  saveState();
  renderAll();
  closeSettings();
});

// ── Custom categories ─────────────────────────────────────────────
addCategoryBtn.addEventListener('click', () => {
  const val = customCategoryInput.value.trim();
  if (!val) return;
  const allCats = ['Food', 'Transport', 'Fun', 'Shopping', 'Bills & Utilities', ...state.customCategories];
  if (allCats.map(c => c.toLowerCase()).includes(val.toLowerCase())) {
    customCategoryInput.value = '';
    return;
  }
  state.customCategories.push(val);
  customCategoryInput.value = '';
  saveState();
  renderCustomCatList();
});

customCatList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-cat]');
  if (!btn) return;
  const cat = btn.dataset.cat;
  state.customCategories = state.customCategories.filter(c => c !== cat);
  saveState();
  renderCustomCatList();
});

// ── Theme toggle ──────────────────────────────────────────────────
themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  saveState();
  if (state.theme === 'dark') startStars();
  if (state.theme === 'light') startClouds();
});

// ── Keyboard: close modals with Escape ────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeSettings();
  }
});

// ── Cloud field (light mode) ──────────────────────────────────────
const cloudCanvas = document.getElementById('cloudCanvas');
const cloudCtx    = cloudCanvas.getContext('2d');

// Each cloud is made of several overlapping radial gradient circles
// giving a soft, cotton-like puffball appearance
const CLOUD_PALETTE = [
  { r: 255, g: 255, b: 255 },  // pure white core
  { r: 219, g: 234, b: 254 },  // blue-100
  { r: 191, g: 219, b: 254 },  // blue-200
  { r: 224, g: 242, b: 300 },  // sky-100
  { r: 186, g: 230, b: 253 },  // sky-200
];

function randomCloudColor() {
  return CLOUD_PALETTE[Math.floor(Math.random() * CLOUD_PALETTE.length)];
}

function makeCloud(xFraction) {
  const puffs = [];
  const count = 5 + Math.floor(Math.random() * 5); // 5–9 puffs per cloud
  const baseY = 0.05 + Math.random() * 0.35;        // top 40% of screen
  const spread = 0.12 + Math.random() * 0.14;

  for (let i = 0; i < count; i++) {
    const c = randomCloudColor();
    puffs.push({
      // offsets stored as fractions of canvas width / height
      ox: (Math.random() - 0.5) * spread,
      oy: (Math.random() - 0.5) * spread * 0.4,
      r:  0.04 + Math.random() * 0.055,
      color: c,
    });
  }

  return {
    x:      xFraction,           // leading edge, fraction of canvas width
    y:      baseY,
    puffs,
    speed:  0.00018 + Math.random() * 0.00052, // very slow drift
    alpha:  0.55 + Math.random() * 0.3,
  };
}

function initClouds() {
  const clouds = [];
  // Spread initial clouds across the full width so screen isn't empty at start
  for (let i = 0; i < 7; i++) {
    clouds.push(makeCloud(Math.random()));
  }
  return clouds;
}

let clouds = initClouds();

function drawPuff(ctx, x, y, r, color, masterAlpha) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0,   `rgba(${color.r},${color.g},${color.b},${masterAlpha})`);
  grad.addColorStop(0.5, `rgba(${color.r},${color.g},${color.b},${masterAlpha * 0.6})`);
  grad.addColorStop(1,   `rgba(${color.r},${color.g},${color.b},0)`);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawClouds(timestamp) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  cloudCanvas.width  = W;
  cloudCanvas.height = H;
  cloudCtx.clearRect(0, 0, W, H);

  if (state.theme !== 'light') return;

  clouds.forEach((cloud, i) => {
    // Drift rightward; wrap around when fully off-screen right
    cloud.x += cloud.speed;
    if (cloud.x > 1.25) {
      // Re-enter from the left with a fresh random y
      clouds[i] = makeCloud(-0.25);
      return;
    }

    const cx = cloud.x * W;
    const cy = cloud.y * H;

    // Draw puffs back-to-front (larger ones first for depth)
    const sorted = [...cloud.puffs].sort((a, b) => b.r - a.r);
    sorted.forEach(p => {
      drawPuff(
        cloudCtx,
        cx + p.ox * W,
        cy + p.oy * H,
        p.r * W,
        p.color,
        cloud.alpha
      );
    });
  });

  requestAnimationFrame(drawClouds);
}

let cloudAnimRunning = false;
function startClouds() {
  if (cloudAnimRunning) return;
  cloudAnimRunning = true;
  requestAnimationFrame(drawClouds);
}

// ── Star field (dark mode) ────────────────────────────────────────
const starCanvas = document.getElementById('starCanvas');
const starCtx    = starCanvas.getContext('2d');
let stars        = [];

function generateStars(count) {
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x:       Math.random(),          // stored as fraction of canvas size
      y:       Math.random(),
      r:       Math.random() * 1.2 + 0.2,   // radius 0.2–1.4 px
      alpha:   Math.random() * 0.6 + 0.2,   // base opacity
      twinkle: Math.random() * Math.PI * 2, // phase offset for twinkle
      speed:   Math.random() * 0.002 + 0.0008,
    });
  }
}

function drawStars(timestamp) {
  starCanvas.width  = window.innerWidth;
  starCanvas.height = window.innerHeight;
  starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);

  if (state.theme !== 'dark') return;

  stars.forEach(s => {
    // gentle twinkle by shifting alpha over time
    const twinkledAlpha = s.alpha + Math.sin(timestamp * s.speed + s.twinkle) * 0.5;
    starCtx.beginPath();
    starCtx.arc(
      s.x * starCanvas.width,
      s.y * starCanvas.height,
      s.r, 0, Math.PI * 2
    );
    starCtx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, twinkledAlpha))})`;
    starCtx.fill();
  });

  requestAnimationFrame(drawStars);
}

let starAnimRunning = false;
function startStars() {
  if (starAnimRunning) return;
  starAnimRunning = true;
  requestAnimationFrame((ts) => { drawStars(ts); });
}

generateStars(280);
window.addEventListener('resize', () => {
  starCanvas.width  = window.innerWidth;
  starCanvas.height = window.innerHeight;
});

// ── Init ──────────────────────────────────────────────────────────
loadState();
applyTheme(state.theme);
initChart();
renderAll();
if (state.theme === 'dark') startStars();
if (state.theme === 'light') startClouds();

// Restore active sort button
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.classList.toggle('active', btn.dataset.sort === state.sortMode);
});
