// ==========================================================================
// ADMIN PANEL SCRIPT
// ==========================================================================

const API_BASE = '/api';

// Cache elements
const adminLoginContainer = document.getElementById('admin-login-container');
const formAdminLogin = document.getElementById('form-admin-login');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');

const adminPanelContainer = document.getElementById('admin-panel-container');
const btnAdminAddItem = document.getElementById('btn-admin-add-item');
const adminThaliList = document.getElementById('admin-thali-list');
const adminExtrasList = document.getElementById('admin-extras-list');

// Menu Item Modal Elements
const modalMenuItem = document.getElementById('modal-menu-item');
const formMenuItem = document.getElementById('form-menu-item');
const menuItemId = document.getElementById('menu-item-id');
const menuItemName = document.getElementById('menu-item-name');
const menuItemPrice = document.getElementById('menu-item-price');
const menuItemCategory = document.getElementById('menu-item-category');
const menuItemModalTitle = document.getElementById('menu-item-modal-title');
const btnMenuItemSave = document.getElementById('btn-menu-item-save');

let adminToken = localStorage.getItem('darshan_admin_token') || null;

document.addEventListener('DOMContentLoaded', () => {
  checkAdminLoginState();
  initAdminEvents();
});

function initAdminEvents() {
  // Login Form Submit
  if (formAdminLogin) {
    formAdminLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = loginUsername.value.trim();
      const password = loginPassword.value;

      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        adminToken = data.token;
        localStorage.setItem('darshan_admin_token', data.token);
        
        loginUsername.value = '';
        loginPassword.value = '';
        showToast('Logged in as Admin successfully.');
        
        // Refresh dynamic UI elements
        checkAdminLoginState();
        
        // Trigger shared header status display refresh
        if (typeof checkAdminStatus === 'function') {
          checkAdminStatus();
        } else {
          // Fallback if shared.js hasn't binded yet
          const userInfo = document.getElementById('admin-user-info');
          const adminName = document.getElementById('admin-name');
          if (userInfo && adminName) {
            userInfo.style.display = 'flex';
            adminName.innerText = data.username;
          }
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Add Item Modal trigger
  if (btnAdminAddItem) {
    btnAdminAddItem.addEventListener('click', () => {
      formMenuItem.reset();
      menuItemId.value = '';
      menuItemModalTitle.innerText = 'Add New Menu Item';
      btnMenuItemSave.innerText = 'Save Item';
      modalMenuItem.classList.remove('hidden');
    });
  }

  // Close modals
  document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-backdrop');
      if (modal) modal.classList.add('hidden');
    });
  });

  // Add / Edit Item Form Submit
  if (formMenuItem) {
    formMenuItem.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = menuItemId.value;
      const name = menuItemName.value.trim();
      const price = Number(menuItemPrice.value);
      const category = menuItemCategory.value;

      const endpoint = id ? `${API_BASE}/items/${id}` : `${API_BASE}/items`;
      const method = id ? 'PUT' : 'POST';

      try {
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ name, price, category })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save item');
        }

        showToast(`Item "${name}" saved successfully.`);
        modalMenuItem.classList.add('hidden');
        fetchAdminItems();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

function checkAdminLoginState() {
  if (adminToken) {
    adminLoginContainer.classList.add('hidden');
    adminPanelContainer.classList.remove('hidden');
    fetchAdminItems();
  } else {
    adminLoginContainer.classList.remove('hidden');
    adminPanelContainer.classList.add('hidden');
  }
}

async function fetchAdminItems() {
  try {
    const response = await fetch(`${API_BASE}/items`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    renderAdminItemsList(data);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAdminItemsList(items) {
  adminThaliList.innerHTML = '';
  adminExtrasList.innerHTML = '';

  const thalis = items.filter(i => i.category === 'Thali');
  const extras = items.filter(i => i.category === 'Extra Items');

  const buildAdminRow = (item) => {
    const row = document.createElement('div');
    row.className = 'admin-item-row';
    row.innerHTML = `
      <div class="admin-item-info">
        <h4>${item.name}</h4>
        <span>₹${item.price.toFixed(2)}</span>
      </div>
      <div class="admin-item-actions">
        <button class="btn-icon btn-icon-edit" title="Edit Item"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-icon btn-icon-delete" title="Delete Item"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    row.querySelector('.btn-icon-edit').addEventListener('click', () => {
      openEditItemModal(item);
    });

    row.querySelector('.btn-icon-delete').addEventListener('click', () => {
      deleteMenuItem(item._id, item.name);
    });

    return row;
  };

  if (thalis.length === 0) {
    adminThaliList.innerHTML = '<p class="text-muted text-sm text-center py-4">No Thali items configured.</p>';
  } else {
    thalis.forEach(t => adminThaliList.appendChild(buildAdminRow(t)));
  }

  if (extras.length === 0) {
    adminExtrasList.innerHTML = '<p class="text-muted text-sm text-center py-4">No Extra items configured.</p>';
  } else {
    extras.forEach(e => adminExtrasList.appendChild(buildAdminRow(e)));
  }
}

function openEditItemModal(item) {
  menuItemId.value = item._id;
  menuItemName.value = item.name;
  menuItemPrice.value = item.price;
  menuItemCategory.value = item.category;
  menuItemModalTitle.innerText = 'Edit Menu Item';
  btnMenuItemSave.innerText = 'Update Item';
  modalMenuItem.classList.remove('hidden');
}

async function deleteMenuItem(itemId, name) {
  if (!confirm(`Are you sure you want to permanently delete "${name}" from the menu?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete item');
    }

    showToast(`Deleted item "${name}" from the menu.`);
    fetchAdminItems();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
