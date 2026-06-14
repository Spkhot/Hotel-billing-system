// ==========================================================================
// SHARED UTILITIES & DYNAMIC LAYOUT INJECTOR
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  injectSidebar();
  initClock();
  checkAdminStatus();
});

// 1. DYNAMIC SIDEBAR INJECTION
function injectSidebar() {
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  // Determine current active page
  const path = window.location.pathname;
  let activePage = 'dashboard';
  
  if (path.includes('history.html')) {
    activePage = 'history';
  } else if (path.includes('reports.html')) {
    activePage = 'reports';
  } else if (path.includes('admin.html')) {
    activePage = 'admin';
  } else if (path.includes('billing.html')) {
    activePage = 'dashboard'; // Highlight dashboard when inside billing screen
  }

  // Sidebar HTML structure
  container.innerHTML = `
    <aside class="sidebar no-print">
      <div class="sidebar-header">
        <div class="logo-icon">
          <i class="fa-solid fa-utensils"></i>
        </div>
        <div class="logo-text">
          <h1>Darshan</h1>
          <span>Hotel POS</span>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <a href="index.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" id="nav-dashboard">
          <i class="fa-solid fa-table-cells"></i>
          <span>Tables Dashboard</span>
        </a>
        <a href="history.html" class="nav-item ${activePage === 'history' ? 'active' : ''}" id="nav-history">
          <i class="fa-solid fa-receipt"></i>
          <span>Bill History</span>
        </a>
        <a href="reports.html" class="nav-item ${activePage === 'reports' ? 'active' : ''}" id="nav-reports">
          <i class="fa-solid fa-chart-line"></i>
          <span>Sales Reports</span>
        </a>
        <a href="admin.html" class="nav-item ${activePage === 'admin' ? 'active' : ''}" id="nav-admin">
          <i class="fa-solid fa-user-gear"></i>
          <span>Admin Panel</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info" id="admin-user-info" style="display: none;">
          <i class="fa-solid fa-circle-user"></i>
          <span id="admin-name">Admin</span>
          <button id="btn-logout" title="Logout"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
        </div>
        <div class="system-time">
          <i class="fa-regular fa-clock"></i>
          <span id="clock-display">12:00:00 PM</span>
        </div>
      </div>
    </aside>

    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-nav no-print">
      <a href="index.html" class="mobile-nav-item ${activePage === 'dashboard' ? 'active' : ''}">
        <i class="fa-solid fa-table-cells"></i>
        <span>Tables</span>
      </a>
      <a href="history.html" class="mobile-nav-item ${activePage === 'history' ? 'active' : ''}">
        <i class="fa-solid fa-receipt"></i>
        <span>History</span>
      </a>
      <a href="reports.html" class="mobile-nav-item ${activePage === 'reports' ? 'active' : ''}">
        <i class="fa-solid fa-chart-line"></i>
        <span>Reports</span>
      </a>
      <a href="admin.html" class="mobile-nav-item ${activePage === 'admin' ? 'active' : ''}">
        <i class="fa-solid fa-user-gear"></i>
        <span>Admin</span>
      </a>
    </nav>
  `;

  // Bind logout listener dynamically
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('darshan_admin_token');
      showToast('Logged out from Admin panel.');
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 800);
    });
  }
}

// 2. SHARED CLOCK
function initClock() {
  const updateClock = () => {
    const clockDisplay = document.getElementById('clock-display');
    if (clockDisplay) {
      const now = new Date();
      clockDisplay.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// 3. ADMIN SESSION STATUS DISPLAY
async function checkAdminStatus() {
  const token = localStorage.getItem('darshan_admin_token');
  const userInfo = document.getElementById('admin-user-info');
  const adminName = document.getElementById('admin-name');
  
  if (!token) {
    if (userInfo) userInfo.style.display = 'none';
    return;
  }

  try {
    const response = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (response.ok && userInfo && adminName) {
      userInfo.style.display = 'flex';
      adminName.innerText = data.username;
    } else {
      localStorage.removeItem('darshan_admin_token');
      if (userInfo) userInfo.style.display = 'none';
    }
  } catch (err) {
    console.error('Auth verification error:', err);
  }
}

// 4. DYNAMIC TOAST SYSTEM
window.showToast = function(message, type = 'success') {
  // Check if toast element exists, if not, create it
  let toast = document.getElementById('toast');
  let toastMessage = document.getElementById('toast-message');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast hidden';
    toast.innerHTML = '<span id="toast-message"></span>';
    document.body.appendChild(toast);
    toastMessage = document.getElementById('toast-message');
  }

  toastMessage.innerText = message;
  toast.classList.remove('hidden');

  if (type === 'error') {
    toast.style.borderLeftColor = 'var(--accent-red)';
  } else {
    toast.style.borderLeftColor = 'var(--accent-orange)';
  }

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
};
