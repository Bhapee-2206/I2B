/**
 * EDUTRACK DASHBOARD ANALYTICS MODULE
 * 4 Primary Metric Cards, Secondary Chips, 100% Real Database Calculations (No Fake Charts)
 */

const DashboardModule = {
  charts: {},

  init: async () => {
    DashboardModule.updateMetrics();
    DashboardModule.renderCharts();
    DashboardModule.renderRecentActivities();
    DashboardModule.renderOutstandingStudentsList();
  },

  // Calculate and display primary and secondary metrics
  updateMetrics: () => {
    const students = AppState.students || [];
    const activeStudents = students.filter(s => s.status === 'active');
    
    // Total Active Programme Enrolments
    let totalEnrolments = 0;
    activeStudents.forEach(s => {
      totalEnrolments += (s.enrollments || []).filter(e => e.status === 'active').length;
    });

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    // Invoices for current billing month
    const currentInvoices = (AppState.invoices || []).filter(inv => 
      inv.billing_month === curMonth && inv.billing_year === curYear && inv.status !== 'cancelled'
    );

    let expectedFeesThisMonth = 0;
    let collectedThisMonth = 0;
    let outstandingThisMonth = 0;

    let unpaidCount = 0;
    let partiallyPaidCount = 0;
    let fullyPaidCount = 0;

    if (currentInvoices.length > 0) {
      currentInvoices.forEach(inv => {
        expectedFeesThisMonth += parseFloat(inv.total_amount) || 0;
        collectedThisMonth += parseFloat(inv.paid_amount) || 0;
        outstandingThisMonth += parseFloat(inv.balance_amount) || 0;

        if (inv.status === 'paid' || parseFloat(inv.balance_amount) <= 0) {
          fullyPaidCount++;
        } else if (parseFloat(inv.paid_amount) > 0) {
          partiallyPaidCount++;
        } else {
          unpaidCount++;
        }
      });
    } else {
      // If invoices not generated yet for this month, calculate expected from active enrolments
      activeStudents.forEach(s => {
        expectedFeesThisMonth += StudentsModule.calculateMonthlyFee(s);
      });

      // Payments actually collected in this calendar month
      const thisMonthPayments = (AppState.payments || []).filter(p => {
        const pd = new Date(p.payment_date);
        return pd.getMonth() + 1 === curMonth && pd.getFullYear() === curYear;
      });
      collectedThisMonth = thisMonthPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      outstandingThisMonth = Math.max(0, expectedFeesThisMonth - collectedThisMonth);
      unpaidCount = activeStudents.length;
    }

    // 1. Primary 4 Metric Cards
    document.getElementById('metric-active-students').textContent = activeStudents.length;
    document.getElementById('metric-expected-fees').textContent = Utils.formatCurrency(expectedFeesThisMonth);
    document.getElementById('metric-collected-fees').textContent = Utils.formatCurrency(collectedThisMonth);
    document.getElementById('metric-pending-fees').textContent = Utils.formatCurrency(outstandingThisMonth);

    // 2. Secondary Stat Chips
    document.getElementById('chip-total-enrolments').textContent = totalEnrolments;
    document.getElementById('chip-unpaid-invoices').textContent = unpaidCount;
    document.getElementById('chip-partial-invoices').textContent = partiallyPaidCount;
    document.getElementById('chip-paid-invoices').textContent = fullyPaidCount;

    // Status summary counts in middle section
    document.getElementById('summary-paid-count').textContent = fullyPaidCount;
    document.getElementById('summary-partial-count').textContent = partiallyPaidCount;
    document.getElementById('summary-unpaid-count').textContent = unpaidCount;
  },

  // Render Charts USING ACTUAL SUPABASE DATA ONLY (No fake or hardcoded amounts!)
  renderCharts: () => {
    if (typeof Chart === 'undefined') return;

    Object.values(DashboardModule.charts).forEach(c => c && c.destroy && c.destroy());
    DashboardModule.charts = {};

    const ctx = document.getElementById('chart-monthly-collection')?.getContext('2d');
    const emptyNotice = document.getElementById('chart-empty-notice');
    if (!ctx) return;

    const payments = AppState.payments || [];
    
    if (payments.length === 0) {
      if (emptyNotice) emptyNotice.style.display = 'flex';
      return;
    } else {
      if (emptyNotice) emptyNotice.style.display = 'none';
    }

    // Aggregate real payments by month
    const monthsMap = {};
    const now = new Date();
    // Build last 6 months keys
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      monthsMap[key] = { label, amount: 0 };
    }

    payments.forEach(p => {
      const pd = new Date(p.payment_date);
      const key = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`;
      if (monthsMap[key]) {
        monthsMap[key].amount += parseFloat(p.amount) || 0;
      }
    });

    const labels = Object.values(monthsMap).map(m => m.label);
    const data = Object.values(monthsMap).map(m => m.amount);

    DashboardModule.charts.collection = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Fees Collected (₹)',
          data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#2563eb',
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
            ticks: { callback: v => '₹' + v.toLocaleString('en-IN') }
          }
        }
      }
    });
  },

  // Render Recent Activity Lists
  renderRecentActivities: () => {
    // Recent Payments
    const paymentsList = document.getElementById('dashboard-recent-payments');
    if (paymentsList) {
      const recentPmts = (AppState.payments || []).slice(0, 5);
      if (recentPmts.length === 0) {
        paymentsList.innerHTML = `<div class="text-muted" style="padding: 1.25rem; font-size: 0.82rem; text-align: center;">No payment records available for this period.</div>`;
      } else {
        paymentsList.innerHTML = recentPmts.map(p => `
          <div class="feed-item">
            <div class="feed-left">
              <div class="feed-avatar" style="background: var(--status-paid-bg); color: var(--status-paid);">
                <i data-lucide="check" style="width: 15px; height: 15px;"></i>
              </div>
              <div class="feed-meta">
                <div class="feed-title">${Utils.escapeHtml(p.students?.name || 'Student')}</div>
                <div class="feed-sub">${Utils.formatDate(p.payment_date)} • ${Utils.escapeHtml(p.payment_method)}</div>
              </div>
            </div>
            <strong style="color: var(--status-paid); font-size: 0.9rem;">+${Utils.formatCurrency(p.amount)}</strong>
          </div>
        `).join('');
      }
    }

    // Recently Registered Students
    const studentsList = document.getElementById('dashboard-recent-students');
    if (studentsList) {
      const recentStudents = (AppState.students || []).slice(0, 5);
      if (recentStudents.length === 0) {
        studentsList.innerHTML = `<div class="text-muted" style="padding: 1.25rem; font-size: 0.82rem; text-align: center;">No registered students yet.</div>`;
      } else {
        studentsList.innerHTML = recentStudents.map(s => {
          const progs = (s.enrollments || []).map(e => e.programmes?.name).filter(Boolean).join(', ');
          return `
            <div class="feed-item">
              <div class="feed-left">
                <div class="feed-avatar">
                  ${(s.name || 'S').slice(0, 2).toUpperCase()}
                </div>
                <div class="feed-meta">
                  <div class="feed-title">${Utils.escapeHtml(s.name)}</div>
                  <div class="feed-sub">${Utils.escapeHtml(s.student_id)} • ${Utils.escapeHtml(progs || 'Tuition')}</div>
                </div>
              </div>
              <span class="badge badge-unpaid">UNPAID</span>
            </div>
          `;
        }).join('');
      }
    }

    Utils.renderIcons();
  },

  // Render Students with Outstanding Dues Feed
  renderOutstandingStudentsList: () => {
    const listEl = document.getElementById('dashboard-outstanding-students');
    if (!listEl) return;

    const outstanding = (AppState.students || [])
      .map(s => ({
        student: s,
        due: StudentsModule.calculateOutstandingBalance(s)
      }))
      .filter(item => item.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 5);

    if (outstanding.length === 0) {
      listEl.innerHTML = `<div class="text-muted" style="padding: 1.25rem; font-size: 0.82rem; text-align: center;">No students have outstanding dues.</div>`;
    } else {
      listEl.innerHTML = outstanding.map(item => `
        <div class="feed-item">
          <div class="feed-left">
            <div class="feed-avatar" style="background: var(--status-unpaid-bg); color: var(--status-unpaid);">
              <i data-lucide="alert-circle" style="width: 15px; height: 15px;"></i>
            </div>
            <div class="feed-meta">
              <div class="feed-title">${Utils.escapeHtml(item.student.name)}</div>
              <div class="feed-sub">ID: ${Utils.escapeHtml(item.student.student_id)}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <strong style="color: var(--status-unpaid); font-size: 0.9rem;">${Utils.formatCurrency(item.due)}</strong>
            <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${item.student.id}')" style="padding: 0.2rem 0.5rem; min-height: 28px;">
              Collect
            </button>
          </div>
        </div>
      `).join('');
    }

    Utils.renderIcons();
  }
};

window.DashboardModule = DashboardModule;
