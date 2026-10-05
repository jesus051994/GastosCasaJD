// ---------- Estado y persistencia ----------

const STORAGE_KEY = 'gastos-casa:v1';

/** @type {{id:string, desc:string, amount:number, date:string, category:string}[]} */
let expenses = loadExpenses();

let currentMonth = new Date(); // ancla para el mes mostrado en el resumen/lista

function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('No se pudo leer el almacenamiento local:', e);
    return [];
  }
}

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error('No se pudo guardar en el almacenamiento local:', e);
  }
}

// ---------- Utilidades ----------

const CRC_FORMATTER = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
});

function formatAmount(n) {
  return CRC_FORMATTER.format(n);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function monthLabel(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function expensesForCurrentMonth() {
  const key = monthKey(currentMonth);
  return expenses.filter((e) => e.date.startsWith(key));
}

// ---------- Render ----------

function render() {
  const monthExpenses = expensesForCurrentMonth();
  const searchTerm = document.getElementById('search').value.trim().toLowerCase();
  const visible = searchTerm
    ? monthExpenses.filter((e) => e.desc.toLowerCase().includes(searchTerm))
    : monthExpenses;

  document.getElementById('current-month-label').textContent = monthLabel(currentMonth);

  // Total del mes
  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  document.getElementById('month-total').textContent = formatAmount(total);

  // Desglose por categoría
  const byCategory = {};
  for (const e of monthExpenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }
  const breakdownEl = document.getElementById('category-breakdown');
  breakdownEl.innerHTML = '';
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amount]) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="cat-name">${escapeHtml(cat)}</span><span class="cat-amount">${formatAmount(amount)}</span>`;
      breakdownEl.appendChild(li);
    });

  // Tabla de movimientos (más reciente primero)
  const rowsEl = document.getElementById('expense-rows');
  const emptyEl = document.getElementById('empty-state');
  rowsEl.innerHTML = '';

  const sorted = [...visible].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    emptyEl.style.display = 'block';
  } else {
    emptyEl.style.display = 'none';
    for (const e of sorted) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDateShort(e.date)}</td>
        <td>${escapeHtml(e.desc)}</td>
        <td><span class="cat-pill">${escapeHtml(e.category)}</span></td>
        <td class="num">${formatAmount(e.amount)}</td>
        <td><button class="delete-btn" data-id="${e.id}">Eliminar</button></td>
      `;
      rowsEl.appendChild(tr);
    }
  }
}

function formatDateShort(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Eventos ----------

document.getElementById('expense-form').addEventListener('submit', (ev) => {
  ev.preventDefault();

  const desc = document.getElementById('desc').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const date = document.getElementById('date').value;
  const category = document.getElementById('category').value;

  if (!desc || !date || isNaN(amount) || amount <= 0) return;

  expenses.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    desc,
    amount,
    date,
    category,
  });
  saveExpenses();

  // Mostrar el mes del gasto recién agregado
  currentMonth = new Date(date + 'T00:00:00');

  ev.target.reset();
  document.getElementById('date').value = date; // conserva la fecha por comodidad
  render();
});

document.getElementById('expense-rows').addEventListener('click', (ev) => {
  const btn = ev.target.closest('.delete-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  expenses = expenses.filter((e) => e.id !== id);
  saveExpenses();
  render();
});

document.getElementById('search').addEventListener('input', render);

document.getElementById('prev-month').addEventListener('click', () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  render();
});

document.getElementById('next-month').addEventListener('click', () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  render();
});

// ---------- Inicialización ----------

(function init() {
  const todayIso = new Date().toISOString().slice(0, 10);
  document.getElementById('date').value = todayIso;
  render();
})();
