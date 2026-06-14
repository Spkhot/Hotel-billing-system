// ==========================================================================
// HISTORY SCREEN SCRIPT
// ==========================================================================

const API_BASE = '/api';

// Cache elements
const historySearch = document.getElementById('history-search');
const historyStartDate = document.getElementById('history-start-date');
const historyEndDate = document.getElementById('history-end-date');
const btnClearFilters = document.getElementById('btn-clear-filters');
const historyTableBody = document.getElementById('history-table-body');
const historyEmptyState = document.getElementById('history-empty-state');

// Modal Elements
const modalGenerateBill = document.getElementById('modal-generate-bill');
const receiptInvoiceId = document.getElementById('receipt-invoice-id');
const receiptTableName = document.getElementById('receipt-table-name');
const receiptDate = document.getElementById('receipt-date');
const receiptTime = document.getElementById('receipt-time');
const receiptItemsBody = document.getElementById('receipt-items-body');
const receiptGrandTotal = document.getElementById('receipt-grand-total');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnPrintReceipt = document.getElementById('btn-print-receipt');

document.addEventListener('DOMContentLoaded', () => {
  fetchBills();
  initHistoryEvents();
});

function initHistoryEvents() {
  // Input filters listeners
  if (historySearch) historySearch.addEventListener('input', fetchBills);
  if (historyStartDate) historyStartDate.addEventListener('change', fetchBills);
  if (historyEndDate) historyEndDate.addEventListener('change', fetchBills);

  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
      historySearch.value = '';
      historyStartDate.value = '';
      historyEndDate.value = '';
      fetchBills();
    });
  }

  // Close modals
  document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-backdrop');
      if (modal) modal.classList.add('hidden');
    });
  });

  // Printer logic
  if (btnPrintReceipt) {
    btnPrintReceipt.addEventListener('click', () => {
      window.print();
    });
  }

  // PDF download logic
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

async function fetchBills() {
  const search = historySearch.value.trim();
  const startDate = historyStartDate.value;
  const endDate = historyEndDate.value;

  let url = `${API_BASE}/bills?`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (startDate) url += `startDate=${startDate}&`;
  if (endDate) url += `endDate=${endDate}&`;

  try {
    const response = await fetch(url);
    const bills = await response.json();

    if (!response.ok) throw new Error(bills.error);

    renderHistoryTable(bills);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderHistoryTable(bills) {
  historyTableBody.innerHTML = '';
  
  if (bills.length === 0) {
    historyEmptyState.classList.remove('hidden');
    return;
  }
  
  historyEmptyState.classList.add('hidden');

  bills.forEach(bill => {
    const dateObj = new Date(bill.createdAt);
    const dateStr = dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Summary line
    const itemsSummary = bill.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${dateStr}</strong> <span class="text-muted text-sm">${timeStr}</span></td>
      <td><strong>${bill.tableName}</strong></td>
      <td class="summary-cell" title="${itemsSummary}">${itemsSummary}</td>
      <td class="text-right amount-cell">₹${bill.totalAmount.toFixed(2)}</td>
      <td class="text-center no-print">
        <button class="btn btn-secondary btn-sm-action btn-view-receipt" data-id="${bill._id}">
          <i class="fa-solid fa-eye"></i> View
        </button>
        <button class="btn btn-danger btn-sm-action btn-delete-bill" data-id="${bill._id}" style="margin-left: 5px;">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </td>
    `;

    // View button trigger
    tr.querySelector('.btn-view-receipt').addEventListener('click', () => {
      openReceiptModal(bill);
    });

    // Delete button trigger
    tr.querySelector('.btn-delete-bill').addEventListener('click', () => {
      deleteBill(bill._id, bill.tableName, dateStr, timeStr);
    });

    historyTableBody.appendChild(tr);
  });
}

function openReceiptModal(bill) {
  receiptItemsBody.innerHTML = '';

  const idStr = bill._id.slice(-6).toUpperCase();
  receiptInvoiceId.innerText = `#DH-${idStr}`;
  receiptTableName.innerText = bill.tableName;

  const dateObj = new Date(bill.createdAt);
  receiptDate.innerText = dateObj.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  receiptTime.innerText = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  bill.items.forEach(item => {
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

  receiptGrandTotal.innerText = `₹${bill.totalAmount.toFixed(2)}`;
  modalGenerateBill.classList.remove('hidden');
}

async function deleteBill(billId, tableName, dateStr, timeStr) {
  const shortId = billId.slice(-6).toUpperCase();
  if (!confirm(`Are you sure you want to permanently delete bill #DH-${shortId} for "${tableName}" (${dateStr} ${timeStr})?`)) {
    return;
  }

  const token = localStorage.getItem('darshan_admin_token');
  if (!token) {
    showToast('Admin login required to delete bill history.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/bills/${billId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete bill');
    }

    showToast('Bill deleted successfully from history.');
    fetchBills();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

