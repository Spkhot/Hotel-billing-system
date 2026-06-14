// ==========================================================================
// DASHBOARD VIEW SCRIPT
// ==========================================================================

const API_BASE = '/api';

// Cache elements
const tablesContainer = document.getElementById('tables-container');
const btnAddTable = document.getElementById('btn-add-table');
const modalAddTable = document.getElementById('modal-add-table');
const formAddTable = document.getElementById('form-add-table');
const newTableName = document.getElementById('new-table-name');

let activeTables = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchTables();
  initDashboardEvents();
});

function initDashboardEvents() {
  // Add Table Modal triggers
  if (btnAddTable) {
    btnAddTable.addEventListener('click', () => {
      newTableName.value = '';
      modalAddTable.classList.remove('hidden');
    });
  }

  // Close modals
  document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-backdrop');
      if (modal) modal.classList.add('hidden');
    });
  });

  // Create table form submit
  if (formAddTable) {
    formAddTable.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = newTableName.value.trim();
      if (!name) return;

      try {
        const response = await fetch(`${API_BASE}/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create table');
        }

        showToast(`Table "${data.name}" added successfully.`);
        modalAddTable.classList.add('hidden');
        fetchTables();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

async function fetchTables() {
  try {
    const response = await fetch(`${API_BASE}/tables`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    activeTables = data;
    renderTableCards();
  } catch (err) {
    console.error('Error fetching tables:', err);
    tablesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Could not connect to database. Make sure the backend server is running.</p>
      </div>
    `;
  }
}

function renderTableCards() {
  tablesContainer.innerHTML = '';
  
  if (activeTables.length === 0) {
    tablesContainer.innerHTML = `
      <div class="table-card-empty-state">
        <i class="fa-solid fa-utensils"></i>
        <p class="font-bold">No active tables at the moment.</p>
        <p class="text-sm">Click "Add New Table" to start taking orders.</p>
      </div>
    `;
    return;
  }

  activeTables.forEach(table => {
    // Calculate total bill for this table card
    const billTotal = table.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const card = document.createElement('div');
    card.className = 'table-card glass-card';
    card.innerHTML = `
      <div class="table-card-header">
        <h3>${table.name}</h3>
        <span class="badge badge-active">Active</span>
      </div>
      <div class="table-card-body">
        <div class="bill-amount-label">Current Bill</div>
        <div class="bill-amount-value">₹${billTotal.toFixed(2)}</div>
      </div>
    `;

    // Click on card navigates to separate billing page
    card.addEventListener('click', () => {
      window.location.href = `billing.html?tableId=${table._id}`;
    });

    tablesContainer.appendChild(card);
  });
}
