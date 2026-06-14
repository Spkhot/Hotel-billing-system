// ==========================================================================
// REPORTS SCREEN SCRIPT
// ==========================================================================

const API_BASE = '/api';

// Cache elements
const reportTotalBills = document.getElementById('report-total-bills');
const reportTotalRevenue = document.getElementById('report-total-revenue');
const reportMostSoldThali = document.getElementById('report-most-sold-thali');
const reportMostSoldExtra = document.getElementById('report-most-sold-extra');
const reportItemsTableBody = document.getElementById('report-items-table-body');

let reportsData = null;
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchReports();
});

async function fetchReports() {
  try {
    const response = await fetch(`${API_BASE}/reports/today`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    reportsData = data;
    renderReportsDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderReportsDashboard() {
  if (!reportsData) return;

  // Render KPI values
  reportTotalBills.innerText = reportsData.totalBills;
  reportTotalRevenue.innerText = `₹${reportsData.totalRevenue.toFixed(0)}`;
  reportMostSoldThali.innerText = reportsData.mostSoldThali || 'N/A';
  reportMostSoldExtra.innerText = reportsData.mostSoldExtra || 'N/A';

  // Render item breakdown table
  reportItemsTableBody.innerHTML = '';
  
  if (reportsData.itemSalesDetails.length === 0) {
    reportItemsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No items sold today yet.</td></tr>';
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  reportsData.itemSalesDetails.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.name}</strong></td>
      <td><span class="badge ${item.category === 'Thali' ? 'badge-active' : 'badge-paid'}">${item.category}</span></td>
      <td class="text-center font-bold">${item.quantity}</td>
      <td class="text-right amount-cell">₹${item.revenue.toFixed(2)}</td>
    `;
    reportItemsTableBody.appendChild(tr);
  });

  // Render Chart.js Graphic
  const labels = reportsData.itemSalesDetails.map(item => item.name);
  const quantities = reportsData.itemSalesDetails.map(item => item.quantity);
  const backgroundColors = reportsData.itemSalesDetails.map(item => 
    item.category === 'Thali' ? 'rgba(249, 115, 22, 0.75)' : 'rgba(139, 92, 246, 0.75)'
  );
  const borderColors = reportsData.itemSalesDetails.map(item => 
    item.category === 'Thali' ? 'rgba(249, 115, 22, 1)' : 'rgba(139, 92, 246, 1)'
  );

  const ctx = document.getElementById('salesChart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantity Sold',
        data: quantities,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'rgba(255, 255, 255, 0.6)', stepSize: 1 }
        },
        y: {
          grid: { display: false },
          ticks: { color: 'rgba(255, 255, 255, 0.85)', font: { size: 11 } }
        }
      }
    }
  });
}
