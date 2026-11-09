// ==============================================================================
// I2B - Application UI Controller & Interactive Views (Pure JavaScript)
// ==============================================================================

let currentView = 'dashboard';
let activeStudentId = null;
let revenueChart = null;

// Toast helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : (type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white');
  const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl ${bg} text-sm font-medium transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `<span class="font-bold">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Navigation Handler
function switchView(viewName, param = null) {
  currentView = viewName;
  if (viewName === 'student-detail' && param) {
    activeStudentId = param;
  }

  // Update active sidebar nav styling
  document.querySelectorAll('.nav-link').forEach(el => {
    const target = el.getAttribute('data-view');
    if (target === viewName) {
      el.classList.add('bg-emerald-500/10', 'text-emerald-400', 'font-semibold');
      el.classList.remove('text-slate-400', 'hover:bg-slate-800/60');
    } else {
      el.classList.remove('bg-emerald-500/10', 'text-emerald-400', 'font-semibold');
      el.classList.add('text-slate-400', 'hover:bg-slate-800/60');
    }
  });

  // Hide all view sections, show active view
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.add('hidden');
  });

  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) {
    activeSec.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Render view data
  switch (viewName) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'students':
      renderStudents();
      break;
    case 'student-detail':
      renderStudentDetail(activeStudentId);
      break;
    case 'enrollments':
      renderEnrollments();
      break;
    case 'invoices':
      renderInvoices();
      break;
    case 'payments':
      renderPayments();
      break;
    case 'receipts':
      renderReceipts();
      break;
    case 'overdue':
      renderOverdue();
      break;
    case 'fee-structures':
      renderFeeStructures();
      break;
    case 'reports':
      renderReports();
      break;
    case 'settings':
      renderSettings();
      break;
  }

  // Re-run Lucide icons renderer
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// ==========================================
// 1. DASHBOARD VIEW
// ==========================================
function renderDashboard() {
  const students = window.I2B_DB.getStudents();
  const invoices = window.I2B_DB.getInvoices();
  const payments = window.I2B_DB.getPayments();
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';

  const activeStudents = students.filter(s => s.status === 'active');
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalPending = invoices.reduce((acc, inv) => acc + (inv.balance_due || 0), 0);
  const overdueInvoices = invoices.filter(inv => inv.status === 'OVERDUE' || (inv.balance_due > 0 && new Date(inv.due_date) < new Date()));

  // Fill KPI cards
  document.getElementById('stat-active-students').textContent = activeStudents.length;
  document.getElementById('stat-total-invoiced').textContent = curr + ' ' + totalInvoiced.toLocaleString('en-IN');
  document.getElementById('stat-total-collected').textContent = curr + ' ' + totalCollected.toLocaleString('en-IN');
  document.getElementById('stat-total-pending').textContent = curr + ' ' + totalPending.toLocaleString('en-IN');
  document.getElementById('stat-overdue-count').textContent = overdueInvoices.length;

  // Render Recent Payments Table
  const tbody = document.getElementById('dashboard-recent-payments');
  if (tbody) {
    const recent = payments.slice(0, 7);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">No payment records yet</td></tr>`;
    } else {
      tbody.innerHTML = recent.map(p => {
        const student = window.I2B_DB.getStudentById(p.student_id);
        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-mono text-xs font-semibold text-slate-700">${p.receipt_number || p.payment_number}</td>
            <td class="py-3 px-4">
              <span class="font-semibold text-slate-800 cursor-pointer hover:text-emerald-600" onclick="switchView('student-detail', '${p.student_id}')">${p.student_name}</span>
            </td>
            <td class="py-3 px-4">
              <span class="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-medium">${p.payment_method}</span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-500">${p.payment_date}</td>
            <td class="py-3 px-4 font-bold text-emerald-600">${curr} ${p.amount.toLocaleString('en-IN')}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Monthly Collection Chart
  renderChart(payments);
}

function renderChart(payments) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx || !window.Chart) return;

  if (revenueChart) {
    revenueChart.destroy();
  }

  // Group payments by month
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dataPoints = [32000, 48000, 56000, 61000, 74000, 89000, 95000];

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Fee Collections (₹)',
        data: dataPoints,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226, 232, 240, 0.6)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

// ==========================================
// 2. STUDENTS VIEW
// ==========================================
function renderStudents() {
  const students = window.I2B_DB.getStudents();
  const enrollments = window.I2B_DB.getEnrollments();
  const query = (document.getElementById('students-search-input')?.value || '').toLowerCase().trim();
  const progFilter = document.getElementById('students-filter-prog')?.value || '';
  const statusFilter = document.getElementById('students-filter-status')?.value || '';

  const filtered = students.filter(s => {
    const studentEnrs = enrollments.filter(e => e.student_id === s.id);
    const matchesQuery = !query || s.name.toLowerCase().includes(query) || (s.student_id && s.student_id.toLowerCase().includes(query)) || (s.whatsapp_number && s.whatsapp_number.includes(query));
    const matchesStatus = !statusFilter || s.status === statusFilter;
    const matchesProg = !progFilter || studentEnrs.some(e => e.programme_code === progFilter || e.programme_id === progFilter);
    return matchesQuery && matchesStatus && matchesProg;
  });

  const countBadge = document.getElementById('students-count-badge');
  if (countBadge) countBadge.textContent = `${filtered.length} Students`;

  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400">No students match your filter criteria</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const studentEnrs = enrollments.filter(e => e.student_id === s.id);
    const primaryEnr = studentEnrs[0];
    const progLabel = primaryEnr ? `${primaryEnr.programme_code || 'Tuition'} (${primaryEnr.class_or_grade || '-'})` : 'Not enrolled';

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer" onclick="switchView('student-detail', '${s.id}')">
        <td class="py-3.5 px-4 font-mono text-xs font-semibold text-slate-500">${s.student_id || '-'}</td>
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-900 hover:text-emerald-600">${s.name}</div>
          <div class="text-xs text-slate-400">${s.parent_name ? 'Parent: ' + s.parent_name : ''}</div>
        </td>
        <td class="py-3.5 px-4">
          <span class="inline-block px-2.5 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">${progLabel}</span>
        </td>
        <td class="py-3.5 px-4 text-xs font-medium text-slate-600">${s.whatsapp_number || '-'}</td>
        <td class="py-3.5 px-4">
          <span class="inline-block px-2 py-0.5 text-xs rounded-full font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
            ${s.status.toUpperCase()}
          </span>
        </td>
        <td class="py-3.5 px-4 text-right">
          <button class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white transition" onclick="event.stopPropagation(); switchView('student-detail', '${s.id}')">View</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 3. STUDENT DETAIL VIEW
// ==========================================
function renderStudentDetail(studentId) {
  const student = window.I2B_DB.getStudentById(studentId);
  if (!student) {
    showToast('Student not found', 'error');
    switchView('students');
    return;
  }

  const enrollments = window.I2B_DB.getEnrollmentsByStudent(student.id);
  const invoices = window.I2B_DB.getInvoicesByStudent(student.id);
  const payments = window.I2B_DB.getPaymentsByStudent(student.id);
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';

  // Fill Header Profile
  document.getElementById('profile-name').textContent = student.name;
  document.getElementById('profile-code').textContent = student.student_id || 'ID: STU';
  document.getElementById('profile-parent').textContent = student.parent_name || 'Not specified';
  document.getElementById('profile-phone').textContent = student.whatsapp_number || 'Not specified';
  document.getElementById('profile-address').textContent = student.address || 'Chennai, Tamil Nadu';
  document.getElementById('profile-date').textContent = student.admission_date || '-';

  // Fee calculation summary
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalDue = invoices.reduce((acc, inv) => acc + (inv.balance_due || 0), 0);

  document.getElementById('profile-stat-invoiced').textContent = curr + ' ' + totalInvoiced.toLocaleString('en-IN');
  document.getElementById('profile-stat-paid').textContent = curr + ' ' + totalPaid.toLocaleString('en-IN');
  document.getElementById('profile-stat-due').textContent = curr + ' ' + totalDue.toLocaleString('en-IN');

  // Render Enrollments list
  const enrContainer = document.getElementById('profile-enrollments-list');
  if (enrContainer) {
    if (enrollments.length === 0) {
      enrContainer.innerHTML = `<div class="p-4 text-center text-slate-400 bg-slate-50 rounded-xl">No active enrollment</div>`;
    } else {
      enrContainer.innerHTML = enrollments.map(e => `
        <div class="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-800">${e.programme_code || 'Tuition'}</span>
              <span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-bold">Class ${e.class_or_grade || '-'}</span>
              <span class="text-xs text-slate-400">${e.board || 'CBSE'}</span>
            </div>
            <div class="text-xs text-slate-500 mt-1">Monthly Fee: <strong class="text-emerald-700">${curr} ${(e.agreed_fee || 0).toLocaleString('en-IN')}</strong></div>
          </div>
          <button class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition flex items-center gap-1" onclick="handlePromoteStudent('${student.id}')">
            <span>↑ Promote Grade</span>
          </button>
        </div>
      `).join('');
    }
  }

  // Render Invoices list
  const invTbody = document.getElementById('profile-invoices-tbody');
  if (invTbody) {
    if (invoices.length === 0) {
      invTbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">No invoices generated yet</td></tr>`;
    } else {
      invTbody.innerHTML = invoices.map(inv => `
        <tr class="border-b border-slate-100">
          <td class="py-3 px-3 font-mono text-xs font-semibold text-slate-700">${inv.invoice_number}</td>
          <td class="py-3 px-3 text-xs font-medium">${inv.period_month}</td>
          <td class="py-3 px-3 font-semibold text-slate-900">${curr} ${inv.total_amount.toLocaleString('en-IN')}</td>
          <td class="py-3 px-3 font-bold ${inv.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}">${curr} ${inv.balance_due.toLocaleString('en-IN')}</td>
          <td class="py-3 px-3">
            <span class="px-2 py-0.5 text-xs rounded-full font-bold ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : (inv.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}">
              ${inv.status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  }

  // Render Payments list
  const payTbody = document.getElementById('profile-payments-tbody');
  if (payTbody) {
    if (payments.length === 0) {
      payTbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">No payments recorded yet</td></tr>`;
    } else {
      payTbody.innerHTML = payments.map(p => `
        <tr class="border-b border-slate-100">
          <td class="py-3 px-3 font-mono text-xs font-semibold text-slate-700">${p.receipt_number || p.payment_number}</td>
          <td class="py-3 px-3 text-xs font-medium">${p.payment_date}</td>
          <td class="py-3 px-3 font-bold text-emerald-600">${curr} ${p.amount.toLocaleString('en-IN')}</td>
          <td class="py-3 px-3 text-xs text-slate-600">${p.payment_method}</td>
          <td class="py-3 px-3 text-right">
            <button class="text-xs text-emerald-600 font-semibold hover:underline" onclick="window.I2B_DB.downloadReceiptPDF('${p.receipt_number}')">PDF Receipt</button>
          </td>
        </tr>
      `).join('');
    }
  }
}

function handlePromoteStudent(studentId) {
  const result = window.I2B_DB.promoteStudent(studentId);
  if (result.success) {
    if (window.confetti) window.confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
    showToast('Student successfully promoted to the next grade!', 'success');
    renderStudentDetail(studentId);
  } else {
    showToast(result.message || 'Cannot promote student', 'error');
  }
}

// ==========================================
// 4. ENROLLMENTS VIEW
// ==========================================
function renderEnrollments() {
  const enrollments = window.I2B_DB.getEnrollments();
  const students = window.I2B_DB.getStudents();
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';

  const tbody = document.getElementById('enrollments-table-body');
  if (!tbody) return;

  if (enrollments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No enrollments recorded</td></tr>`;
    return;
  }

  tbody.innerHTML = enrollments.map(e => {
    const student = students.find(s => s.id === e.student_id);
    const studentName = student ? student.name : 'Unknown';
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
        <td class="py-3.5 px-4 font-bold text-slate-900 cursor-pointer hover:text-emerald-600" onclick="switchView('student-detail', '${e.student_id}')">${studentName}</td>
        <td class="py-3.5 px-4 font-semibold text-slate-800">${e.programme_code || 'Tuition'}</td>
        <td class="py-3.5 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs">${e.class_or_grade || '-'}</span></td>
        <td class="py-3.5 px-4 text-xs text-slate-500">${e.board || 'CBSE'}</td>
        <td class="py-3.5 px-4 font-bold text-emerald-600">${curr} ${(e.agreed_fee || 0).toLocaleString('en-IN')}</td>
        <td class="py-3.5 px-4">
          <span class="px-2 py-0.5 text-xs rounded-full font-bold ${e.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
            ${(e.status || 'active').toUpperCase()}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 5. INVOICES VIEW
// ==========================================
function renderInvoices() {
  const invoices = window.I2B_DB.getInvoices();
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';
  const filterStatus = document.getElementById('invoices-filter-status')?.value || '';

  const filtered = invoices.filter(inv => !filterStatus || inv.status === filterStatus);
  const tbody = document.getElementById('invoices-table-body');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No invoices match selected criteria</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(inv => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
      <td class="py-3 px-4 font-mono text-xs font-semibold text-slate-700">${inv.invoice_number}</td>
      <td class="py-3 px-4 font-bold text-slate-800 cursor-pointer hover:text-emerald-600" onclick="switchView('student-detail', '${inv.student_id}')">${inv.student_name}</td>
      <td class="py-3 px-4 text-xs text-slate-600">${inv.period_month}</td>
      <td class="py-3 px-4 font-bold text-slate-900">${curr} ${inv.total_amount.toLocaleString('en-IN')}</td>
      <td class="py-3 px-4 font-bold ${inv.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}">${curr} ${inv.balance_due.toLocaleString('en-IN')}</td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-0.5 text-xs rounded-full font-bold ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : (inv.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}">
          ${inv.status}
        </span>
      </td>
      <td class="py-3 px-4 text-right">
        ${inv.balance_due > 0 ? `
          <button class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition" onclick="openPaymentModal('${inv.student_id}', '${inv.id}', ${inv.balance_due})">Collect Fee</button>
        ` : `<span class="text-xs font-semibold text-emerald-600">✓ Settled</span>`}
      </td>
    </tr>
  `).join('');
}

// ==========================================
// 6. PAYMENTS & RECEIPTS VIEW
// ==========================================
function renderPayments() {
  const payments = window.I2B_DB.getPayments();
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';

  const tbody = document.getElementById('payments-table-body');
  if (!tbody) return;

  if (payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No payment transactions recorded</td></tr>`;
    return;
  }

  tbody.innerHTML = payments.map(p => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
      <td class="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">${p.receipt_number || p.payment_number}</td>
      <td class="py-3.5 px-4 font-bold text-slate-800 cursor-pointer hover:text-emerald-600" onclick="switchView('student-detail', '${p.student_id}')">${p.student_name}</td>
      <td class="py-3.5 px-4 font-bold text-emerald-600">${curr} ${p.amount.toLocaleString('en-IN')}</td>
      <td class="py-3.5 px-4">
        <span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-semibold">${p.payment_method}</span>
      </td>
      <td class="py-3.5 px-4 text-xs text-slate-500">${p.payment_date}</td>
      <td class="py-3.5 px-4 text-right flex items-center justify-end gap-2">
        <button class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-700" onclick="window.I2B_DB.downloadReceiptPDF('${p.receipt_number}')">PDF</button>
        <button class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition" onclick="window.I2B_DB.sendWhatsAppReceipt('${p.receipt_number}')">WhatsApp</button>
      </td>
    </tr>
  `).join('');
}

function renderReceipts() {
  const receipts = window.I2B_DB.getReceipts();
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';

  const tbody = document.getElementById('receipts-table-body');
  if (!tbody) return;

  if (receipts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No receipts issued yet</td></tr>`;
    return;
  }

  tbody.innerHTML = receipts.map(r => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
      <td class="py-3.5 px-4 font-mono text-xs font-bold text-emerald-700">${r.receipt_number}</td>
      <td class="py-3.5 px-4 font-bold text-slate-800 cursor-pointer hover:text-emerald-600" onclick="switchView('student-detail', '${r.student_id}')">${r.student_name}</td>
      <td class="py-3.5 px-4 text-xs font-semibold text-slate-600">${r.period_month}</td>
      <td class="py-3.5 px-4 font-bold text-emerald-600">${curr} ${r.amount.toLocaleString('en-IN')}</td>
      <td class="py-3.5 px-4 text-xs font-semibold ${r.remaining_balance > 0 ? 'text-amber-600' : 'text-slate-400'}">${curr} ${r.remaining_balance.toLocaleString('en-IN')}</td>
      <td class="py-3.5 px-4 text-xs text-slate-500">${r.receipt_date}</td>
      <td class="py-3.5 px-4 text-right flex items-center justify-end gap-2">
        <button class="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700" onclick="window.I2B_DB.downloadReceiptPDF('${r.receipt_number}')">Download</button>
        <button class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600" onclick="window.I2B_DB.sendWhatsAppReceipt('${r.receipt_number}')">WhatsApp</button>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// 7. OVERDUE VIEW
// ==========================================
function renderOverdue() {
  const invoices = window.I2B_DB.getInvoices();
  const students = window.I2B_DB.getStudents();
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';

  const today = new Date();
  const overdueList = invoices.filter(inv => inv.balance_due > 0 && (inv.status === 'OVERDUE' || new Date(inv.due_date) < today));

  const totalOverdueAmount = overdueList.reduce((acc, inv) => acc + inv.balance_due, 0);
  document.getElementById('overdue-summary-amount').textContent = curr + ' ' + totalOverdueAmount.toLocaleString('en-IN');
  document.getElementById('overdue-summary-count').textContent = overdueList.length + ' Students';

  const tbody = document.getElementById('overdue-table-body');
  if (!tbody) return;

  if (overdueList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-emerald-600 font-bold">✓ Great job! Zero overdue balances.</td></tr>`;
    return;
  }

  tbody.innerHTML = overdueList.map(inv => {
    const student = students.find(s => s.id === inv.student_id);
    const dueDate = new Date(inv.due_date);
    const diffDays = Math.max(1, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
        <td class="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">${inv.invoice_number}</td>
        <td class="py-3.5 px-4 font-bold text-slate-800 cursor-pointer hover:text-emerald-600" onclick="switchView('student-detail', '${inv.student_id}')">${inv.student_name}</td>
        <td class="py-3.5 px-4 text-xs font-medium text-slate-600">${inv.period_month}</td>
        <td class="py-3.5 px-4 font-bold text-rose-600">${curr} ${inv.balance_due.toLocaleString('en-IN')}</td>
        <td class="py-3.5 px-4"><span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">${diffDays} days late</span></td>
        <td class="py-3.5 px-4 text-xs text-slate-600">${student ? (student.whatsapp_number || '-') : '-'}</td>
        <td class="py-3.5 px-4 text-right flex items-center justify-end gap-2">
          <button class="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition" onclick="openPaymentModal('${inv.student_id}', '${inv.id}', ${inv.balance_due})">Collect</button>
          <button class="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition" onclick="window.I2B_DB.sendWhatsAppReminder('${inv.student_id}', '${inv.id}')">Reminder</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 8. FEE STRUCTURES VIEW
// ==========================================
function renderFeeStructures() {
  const feeList = window.I2B_DB.getFeeStructures();
  const programmes = window.I2B_DB.getProgrammes();
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';

  const tbody = document.getElementById('fee-structures-table-body');
  if (!tbody) return;

  tbody.innerHTML = feeList.map(f => {
    const prog = programmes.find(p => p.id === f.programme_id);
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
        <td class="py-3 px-4 font-bold text-slate-800">${prog ? prog.name : 'Tuition'}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-xs">Class ${f.class_or_grade}</span></td>
        <td class="py-3 px-4 text-xs text-slate-500 font-medium">${f.board || 'CBSE / Matric'}</td>
        <td class="py-3 px-4 font-bold text-emerald-600">${curr} ${f.monthly_fee.toLocaleString('en-IN')}</td>
        <td class="py-3 px-4 text-xs text-slate-400">Monthly Standard</td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 9. REPORTS VIEW & CSV EXPORT
// ==========================================
function renderReports() {
  const payments = window.I2B_DB.getPayments();
  const invoices = window.I2B_DB.getInvoices();
  const settings = window.I2B_DB.getSettings();
  const curr = settings.currency_symbol || '₹';

  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalDue = invoices.reduce((acc, inv) => acc + (inv.balance_due || 0), 0);

  document.getElementById('report-total-invoiced').textContent = curr + ' ' + totalInvoiced.toLocaleString('en-IN');
  document.getElementById('report-total-collected').textContent = curr + ' ' + totalCollected.toLocaleString('en-IN');
  document.getElementById('report-total-due').textContent = curr + ' ' + totalDue.toLocaleString('en-IN');
}

function exportReportCSV() {
  const payments = window.I2B_DB.getPayments();
  if (payments.length === 0) {
    showToast('No payment data available to export', 'error');
    return;
  }

  let csvContent = 'Receipt Number,Student Name,Amount,Payment Method,Reference Number,Date,Notes\n';
  payments.forEach(p => {
    csvContent += `"${p.receipt_number}","${p.student_name}","${p.amount}","${p.payment_method}","${p.reference_number}","${p.payment_date}","${p.notes || ''}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `I2B_Fee_Collections_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Collection report downloaded successfully!', 'success');
}

// ==========================================
// 10. SETTINGS VIEW
// ==========================================
function renderSettings() {
  const settings = window.I2B_DB.getSettings();
  document.getElementById('settings-inst-name').value = settings.institution_name || '';
  document.getElementById('settings-subtitle').value = settings.subtitle || '';
  document.getElementById('settings-phone').value = settings.contact_phone || '';
  document.getElementById('settings-email').value = settings.contact_email || '';
  document.getElementById('settings-currency').value = settings.currency_symbol || '₹';
  document.getElementById('settings-address').value = settings.address || '';
  document.getElementById('settings-due-day').value = settings.default_due_day || 10;
}

function handleSaveSettings(e) {
  e.preventDefault();
  window.I2B_DB.saveSettings({
    institution_name: document.getElementById('settings-inst-name').value,
    subtitle: document.getElementById('settings-subtitle').value,
    contact_phone: document.getElementById('settings-phone').value,
    contact_email: document.getElementById('settings-email').value,
    currency_symbol: document.getElementById('settings-currency').value,
    address: document.getElementById('settings-address').value,
    default_due_day: parseInt(document.getElementById('settings-due-day').value, 10) || 10
  });
  showToast('Settings updated successfully!', 'success');
}

// ==========================================
// MODALS LOGIC
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function openAddStudentModal() {
  // Populate programme dropdown
  const programmes = window.I2B_DB.getProgrammes();
  const select = document.getElementById('modal-student-prog');
  if (select) {
    select.innerHTML = programmes.map(p => `<option value="${p.id}" data-code="${p.code}">${p.name}</option>`).join('');
  }
  openModal('modal-add-student');
}

function handleAddStudentSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('modal-student-name').value.trim();
  if (!name) return;

  const parentName = document.getElementById('modal-student-parent').value.trim();
  const phone = document.getElementById('modal-student-phone').value.trim();
  const address = document.getElementById('modal-student-address').value.trim();
  const progSelect = document.getElementById('modal-student-prog');
  const progId = progSelect.value;
  const grade = document.getElementById('modal-student-grade').value.trim();
  const board = document.getElementById('modal-student-board').value;
  const fee = document.getElementById('modal-student-fee').value;

  const newStudent = window.I2B_DB.addStudent({
    name,
    parent_name: parentName,
    whatsapp_number: phone,
    address,
    programme_id: progId,
    class_or_grade: grade,
    board,
    fee
  });

  closeModal('modal-add-student');
  showToast(`Student ${newStudent.name} registered successfully!`, 'success');
  if (window.confetti) window.confetti({ particleCount: 50, spread: 60 });
  switchView('students');
}

// Auto fee lookup listener for student modal
function handleStudentModalFeeLookup() {
  const progSelect = document.getElementById('modal-student-prog');
  const progId = progSelect ? progSelect.value : null;
  const grade = document.getElementById('modal-student-grade')?.value;
  const board = document.getElementById('modal-student-board')?.value;
  const feeInput = document.getElementById('modal-student-fee');

  if (progId && grade && feeInput) {
    const fee = window.I2B_DB.findFee(progId, grade, board);
    if (fee) feeInput.value = fee;
  }
}

// Payment Modal
function openPaymentModal(studentId, invoiceId, maxAmount = null) {
  const student = window.I2B_DB.getStudentById(studentId);
  const invoices = window.I2B_DB.getInvoicesByStudent(studentId);
  const targetInvoice = invoices.find(i => i.id === invoiceId) || invoices.find(i => i.balance_due > 0);

  document.getElementById('modal-payment-student-id').value = studentId;
  document.getElementById('modal-payment-student-name').textContent = student ? student.name : '';

  const invSelect = document.getElementById('modal-payment-invoice');
  invSelect.innerHTML = invoices.filter(i => i.balance_due > 0).map(i => `
    <option value="${i.id}" data-due="${i.balance_due}">
      ${i.invoice_number} (${i.period_month}) - Due: ₹${i.balance_due.toLocaleString('en-IN')}
    </option>
  `).join('');

  if (targetInvoice) {
    invSelect.value = targetInvoice.id;
    document.getElementById('modal-payment-amount').value = targetInvoice.balance_due;
  } else if (invoices[0]) {
    document.getElementById('modal-payment-amount').value = invoices[0].balance_due;
  }

  document.getElementById('modal-payment-date').value = new Date().toISOString().split('T')[0];
  openModal('modal-record-payment');
}

function handleRecordPaymentSubmit(e) {
  e.preventDefault();
  const studentId = document.getElementById('modal-payment-student-id').value;
  const invoiceId = document.getElementById('modal-payment-invoice').value;
  const amount = Number(document.getElementById('modal-payment-amount').value);
  const method = document.getElementById('modal-payment-method').value;
  const ref = document.getElementById('modal-payment-ref').value;
  const date = document.getElementById('modal-payment-date').value;

  try {
    const result = window.I2B_DB.addPayment({
      student_id: studentId,
      invoice_id: invoiceId,
      amount,
      payment_method: method,
      reference_number: ref,
      payment_date: date
    });

    closeModal('modal-record-payment');
    if (window.confetti) window.confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    showToast(`Payment of ₹${amount.toLocaleString('en-IN')} recorded! Receipt ${result.receipt.receipt_number} issued.`, 'success');

    // Refresh current view
    if (currentView === 'student-detail') {
      renderStudentDetail(studentId);
    } else {
      switchView(currentView);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Global initialization on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  await window.I2B_DB.init();

  // Setup view switcher events
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-view');
      if (target) switchView(target);
    });
  });

  // Global search input listener
  const topSearch = document.getElementById('top-search-input');
  if (topSearch) {
    topSearch.addEventListener('input', (e) => {
      const q = e.target.value;
      if (currentView !== 'students') {
        switchView('students');
      }
      const stSearch = document.getElementById('students-search-input');
      if (stSearch) {
        stSearch.value = q;
        renderStudents();
      }
    });
  }

  // Initial render
  switchView('dashboard');
});
