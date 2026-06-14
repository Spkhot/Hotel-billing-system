// ==========================================================================
// BILLING SCREEN SCRIPT
// ==========================================================================

const API_BASE = '/api';

// Cache DOM Elements
const btnBillingBack = document.getElementById('btn-billing-back');
const billingTableName = document.getElementById('billing-current-table-name');
const thaliContainer = document.getElementById('thali-items-container');
const extrasContainer = document.getElementById('extras-items-container');
const categoryTabs = document.querySelectorAll('.category-tab');
const liveReceiptTable = document.getElementById('live-receipt-table');
const liveReceiptItems = document.getElementById('live-receipt-items-container');
const liveReceiptGrandTotal = document.getElementById('live-receipt-grand-total');
const btnGenerateBill = document.getElementById('btn-generate-bill');
const btnMarkPaid = document.getElementById('btn-mark-paid');

// Invoice Modal Elements
const modalGenerateBill = document.getElementById('modal-generate-bill');
const receiptInvoiceId = document.getElementById('receipt-invoice-id');
const receiptTableName = document.getElementById('receipt-table-name');
const receiptDate = document.getElementById('receipt-date');
const receiptTime = document.getElementById('receipt-time');
const receiptItemsBody = document.getElementById('receipt-items-body');
const receiptGrandTotal = document.getElementById('receipt-grand-total');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnPrintReceipt = document.getElementById('btn-print-receipt');

// Get Table ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const currentTableId = urlParams.get('tableId');

let menuItems = [];
let currentTable = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!currentTableId) {
    showToast('No Table selected. Redirecting...', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    return;
  }

  initBillingEvents();
  await fetchMenuItems();
  await loadTableDetails();
});

function initBillingEvents() {
  // Back to Dashboard
  if (btnBillingBack) {
    btnBillingBack.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // Category Filtering
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      categoryTabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const cat = e.target.dataset.category;
      
      const thaliGroup = document.getElementById('group-thali');
      const extrasGroup = document.getElementById('group-extras');

      if (cat === 'all') {
        thaliGroup.style.display = 'block';
        extrasGroup.style.display = 'block';
      } else if (cat === 'Thali') {
        thaliGroup.style.display = 'block';
        extrasGroup.style.display = 'none';
      } else if (cat === 'Extra Items') {
        thaliGroup.style.display = 'none';
        extrasGroup.style.display = 'block';
      }
    });
  });

  // Modal actions
  document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-backdrop');
      if (modal) modal.classList.add('hidden');
    });
  });

  // Generate Invoice Modal trigger
  if (btnGenerateBill) {
    btnGenerateBill.addEventListener('click', () => {
      if (!currentTable) return;
      openReceiptModal(currentTable);
    });
  }

  // Mark table as Paid trigger
  if (btnMarkPaid) {
    btnMarkPaid.addEventListener('click', async () => {
      if (!currentTableId || !currentTable) return;
      
      const activeItems = currentTable.items.filter(i => i.quantity > 0);
      if (activeItems.length === 0) {
        showToast('Cannot checkout an empty table.', 'error');
        return;
      }

      if (!confirm('Are you sure you want to mark this table as PAID? This will clear the table and save the transaction.')) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/tables/${currentTableId}/pay`, {
          method: 'POST'
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Payment failed');
        }

        showToast('Bill marked as paid and sales archived.');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Thermal Printing
  if (btnPrintReceipt) {
    btnPrintReceipt.addEventListener('click', () => {
      window.print();
    });
  }

  // PDF Export
  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener('click', () => {
      const receiptContainer = document.getElementById('receipt-print-area');
      const invoiceNo = receiptInvoiceId.innerText;
      const tableName = receiptTableName.innerText;

      const opt = {
        margin:       10,
        filename:     `Invoice_${tableName.replace(/\s+/g, '_')}_${invoiceNo}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().from(receiptContainer).set(opt).save();
    });
  }
}

async function fetchMenuItems() {
  try {
    const response = await fetch(`${API_BASE}/items`);
    const data = await response.json();
    if (response.ok) {
      menuItems = data;
    }
  } catch (err) {
    console.error('Error fetching menu items:', err);
  }
}

async function loadTableDetails() {
  try {
    const response = await fetch(`${API_BASE}/tables/${currentTableId}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    currentTable = data;
    
    billingTableName.innerText = data.name;
    liveReceiptTable.innerText = data.name;

    renderBillingMenuGrid();
    renderLiveReceipt();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderBillingMenuGrid() {
  thaliContainer.innerHTML = '';
  extrasContainer.innerHTML = '';

  const thalis = menuItems.filter(item => item.category === 'Thali');
  const extras = menuItems.filter(item => item.category === 'Extra Items');

  const buildItemCard = (item) => {
    // Check if table order already has this item
    const orderItem = currentTable.items.find(ti => ti.itemId === item._id);
    const quantity = orderItem ? orderItem.quantity : 0;

    const card = document.createElement('div');
    card.className = 'item-control-card';
    card.innerHTML = `
      <div class="item-details">
        <h4>${item.name}</h4>
        <span class="price">₹${item.price.toFixed(2)}</span>
      </div>
      <div class="qty-controls">
        <button class="btn-qty btn-minus" data-id="${item._id}"><i class="fa-solid fa-minus"></i></button>
        <span class="qty-display" id="qty-display-${item._id}">${quantity}</span>
        <button class="btn-qty btn-plus" data-id="${item._id}"><i class="fa-solid fa-plus"></i></button>
      </div>
    `;

    // Add click listeners to quantity modify buttons
    card.querySelector('.btn-plus').addEventListener('click', () => {
      modifyItemQuantity(item._id, quantity + 1);
    });

    card.querySelector('.btn-minus').addEventListener('click', () => {
      if (quantity > 0) {
        modifyItemQuantity(item._id, quantity - 1);
      }
    });

    return card;
  };

  // Populate Thalis
  if (thalis.length === 0) {
    thaliContainer.innerHTML = '<p class="text-muted text-sm">No Thalis available.</p>';
  } else {
    thalis.forEach(t => thaliContainer.appendChild(buildItemCard(t)));
  }

  // Populate Extras
  if (extras.length === 0) {
    extrasContainer.innerHTML = '<p class="text-muted text-sm">No Extras available.</p>';
  } else {
    extras.forEach(e => extrasContainer.appendChild(buildItemCard(e)));
  }
}

async function modifyItemQuantity(itemId, quantity) {
  if (!currentTableId) return;

  try {
    const response = await fetch(`${API_BASE}/tables/${currentTableId}/item`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    currentTable = data;
    
    // Update quantity text in DOM immediately for fast UI response
    const qtyDisplay = document.getElementById(`qty-display-${itemId}`);
    if (qtyDisplay) qtyDisplay.innerText = quantity;

    // Refresh menu cards context in RAM so that next increment calculations are precise
    renderBillingMenuGrid();
    
    // Re-render live receipt column
    renderLiveReceipt();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderLiveReceipt() {
  liveReceiptItems.innerHTML = '';
  
  const activeItems = currentTable.items.filter(item => item.quantity > 0);
  let totalSum = 0;

  if (activeItems.length === 0) {
    liveReceiptItems.innerHTML = `
      <div class="empty-receipt-msg">
        <i class="fa-solid fa-basket-shopping"></i>
        <p>No items added yet. Click + to add items.</p>
      </div>
    `;
    liveReceiptGrandTotal.innerText = '₹0.00';
    return;
  }

  activeItems.forEach(item => {
    const rowTotal = item.price * item.quantity;
    totalSum += rowTotal;

    const row = document.createElement('div');
    row.className = 'receipt-item-row';
    row.innerHTML = `
      <span>${item.name}</span>
      <span class="text-center">${item.quantity}</span>
      <span class="text-right">₹${item.price.toFixed(0)}</span>
      <span class="text-right font-bold">₹${rowTotal.toFixed(0)}</span>
    `;

    liveReceiptItems.appendChild(row);
  });

  liveReceiptGrandTotal.innerText = `₹${totalSum.toFixed(2)}`;
}

function openReceiptModal(table) {
  receiptItemsBody.innerHTML = '';

  const total = table.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const items = table.items.filter(i => i.quantity > 0);
  
  // Dynamic temporary invoice reference
  const idStr = 'TEMP-' + Math.floor(Math.random() * 9000 + 1000);
  receiptInvoiceId.innerText = `#DH-${idStr}`;
  receiptTableName.innerText = table.name;

  // Invoice timestamps
  const dateObj = new Date();
  receiptDate.innerText = dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  receiptTime.innerText = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Render items rows
  items.forEach(item => {
    const rowTotal = item.price * item.quantity;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">₹${item.price.toFixed(0)}</td>
      <td class="text-right">₹${rowTotal.toFixed(0)}</td>
    `;
    receiptItemsBody.appendChild(tr);
  });

  receiptGrandTotal.innerText = `₹${total.toFixed(2)}`;
  modalGenerateBill.classList.remove('hidden');
}
