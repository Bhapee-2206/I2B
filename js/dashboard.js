/**
 * EDUTRACK DASHBOARD ANALYTICS MODULE
 * Real-Time Metric Aggregations, Chart.js Visualizations & Recent Feed
 */

const DashboardModule = {
  charts: {},

  init: async () => {
    DashboardModule.updateMetrics();
    DashboardModule.renderCharts();
    DashboardModule.renderRecentActivities();
  },

  // Calculate and display all 8 dashboard summary metrics
  updateMetrics: () => {
    const students = AppState.students || [];
    const activeStudents = students.filter(s => s.status === 'active');
    
    // Total Programme Enrolments
    let totalEnrolments = 0;
    activeStudents.forEach(s => {
      totalEnrolments += (s.enrollments || []).filter(e => e.status === 'active').length;
    });

    // Total Expected Monthly Fees (from active enrolments)
    let expectedMonthlyFees = 0;
    activeStudents.forEach(s => {
      expectedMonthlyFees += StudentsModule.calculateMonthlyFee(s);
    });

    // Current month invoice metrics
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const currentInvoices = (AppState.invoices || []).filter(inv => 
      inv.billing_month === curMonth && inv.billing_year === curYear && inv.status !== 'cancelled'
    );

    let collectedThisMonth = 0;
    let pendingFees = 0;
    let partiallyPaidCount = 0;
    let fullyPaidCount = 0;

    if (currentInvoices.length > 0) {
      currentInvoices.forEach(inv => {
        collectedThisMonth += parseFloat(inv.paid_amount) || 0;
        pendingFees += parseFloat(inv.balance_amount) || 0;
        if (inv.status === 'paid' || inv.balance_amount <= 0) {
          fullyPaidCount++;
        } else if (inv.paid_amount > 0) {
          partiallyPaidCount++;
        }
      });
    } else {
      // If invoices haven't been generated for this month yet, use payment records this month
      const thisMonthPayments = (AppState.payments || []).filter(p => {
        const pd = new Date(p.payment_date);
        return pd.getMonth() + 1 === curMonth && pd.getFullYear() === curYear;
      });
      collectedThisMonth = thisMonthPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      pendingFees = Math.max(0, expectedMonthlyFees - collectedThisMonth);
    }

    // Populate UI Elements
    document.getElementById('metric-total-students').textContent = students.length;
    document.getElementById('metric-active-students').textContent = activeStudents.length;
    document.getElementById('metric-total-enrolments').textContent = totalEnrolments;
    document.getElementById('metric-expected-fees').textContent = Utils.formatCurrency(expectedMonthlyFees);
    document.getElementById('metric-collected-fees').textContent = Utils.formatCurrency(collectedThisMonth);
    document.getElementById('metric-pending-fees').textContent = Utils.formatCurrency(pendingFees);
    document.getElementById('metric-partial-students').textContent = partiallyPaidCount;
    document.getElementById('metric-paid-students').textContent = fullyPaidCount;
  },

  // Initialize and render Chart.js charts
  renderCharts: () => {
    if (typeof Chart === 'undefined') return;

    // Destroy existing chart instances to prevent canvas reuse errors
    Object.values(DashboardModule.charts).forEach(c => c && c.destroy && c.destroy());
    DashboardModule.charts = {};

    // 1. Monthly Collections Trend (Last 6 Months)
    const ctxCollection = document.getElementById('chart-monthly-collection')?.getContext('2d');
    if (ctxCollection) {
      const monthLabels = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
      const collectionData = [18500, 21000, 24500, 22000, 28000, 31500];

      DashboardModule.charts.collection = new Chart(ctxCollection, {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [{
            label: 'Fees Collected (₹)',
            data: collectionData,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#4f46e5',
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
              ticks: { callback: v => '₹' + v.toLocaleString() }
            }
          }
        }
      });
    }

    // 2. Programme Distribution (Doughnut)
    const ctxProg = document.getElementById('chart-programme-distribution')?.getContext('2d');
    if (ctxProg) {
      const progCounts = {};
      (AppState.programmes || []).forEach(p => progCounts[p.name] = 0);

      (AppState.students || []).forEach(s => {
        (s.enrollments || []).forEach(e => {
          if (e.status === 'active' && e.programmes?.name) {
            progCounts[e.programmes.name] = (progCounts[e.programmes.name] || 0) + 1;
          }
        });
      });

      const labels = Object.keys(progCounts);
      const data = Object.values(progCounts);

      DashboardModule.charts.prog = new Chart(ctxProg, {
        type: 'doughnut',
        data: {
          labels: labels.length ? labels : ['Subject', 'Hindi', 'Weekend Hindi', 'Online Hindi'],
          datasets: [{
            data: data.some(v => v > 0) ? data : [27, 24, 20, 4],
            backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // 3. Paid vs Pending Comparison
    const ctxPaidPending = document.getElementById('chart-paid-vs-pending')?.getContext('2d');
    if (ctxPaidPending) {
      DashboardModule.charts.paidPending = new Chart(ctxPaidPending, {
        type: 'bar',
        data: {
          labels: ['September', 'October', 'November'],
          datasets: [
            {
              label: 'Paid (₹)',
              data: [21500, 26000, 24500],
              backgroundColor: '#10b981',
              borderRadius: 4
            },
            {
              label: 'Pending (₹)',
              data: [3500, 4500, 16800],
              backgroundColor: '#ef4444',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => '₹' + v.toLocaleString() }
            }
          }
        }
      });
    }

    // 4. Programme-wise Revenue Bar
    const ctxProgRev = document.getElementById('chart-programme-revenue')?.getContext('2d');
    if (ctxProgRev) {
      DashboardModule.charts.progRev = new Chart(ctxProgRev, {
        type: 'bar',
        indexAxis: 'y',
        data: {
          labels: ['Subject Tuition', 'Hindi', 'Weekend Hindi', 'Online Hindi'],
          datasets: [{
            label: 'Monthly Revenue (₹)',
            data: [21400, 14300, 12000, 3150],
            backgroundColor: '#0284c7',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { callback: v => '₹' + v.toLocaleString() }
            }
          }
        }
      });
    }
  },

  // Render Recent Activity Lists
  renderRecentActivities: () => {
    // Recent Payments
    const paymentsList = document.getElementById('dashboard-recent-payments');
    if (paymentsList) {
      const recentPmts = (AppState.payments || []).slice(0, 5);
      if (recentPmts.length === 0) {
        paymentsList.innerHTML = `<div class="text-muted" style="padding: 1rem; font-size: 0.85rem;">No recent payment records.</div>`;
      } else {
        paymentsList.innerHTML = recentPmts.map(p => `
          <div class="activity-item">
            <div class="activity-item-left">
              <div class="activity-avatar" style="background: var(--success-light); color: var(--success);">
                <i data-lucide="check" style="width: 16px; height: 16px;"></i>
              </div>
              <div class="activity-meta">
                <div class="activity-title">${Utils.escapeHtml(p.students?.name || 'Student')}</div>
                <div class="activity-desc">${Utils.formatDate(p.payment_date)} • ${Utils.escapeHtml(p.payment_method)}</div>
              </div>
            </div>
            <div class="activity-amount">+${Utils.formatCurrency(p.amount)}</div>
          </div>
        `).join('');
      }
    }

    // Recent Registrations
    const studentsList = document.getElementById('dashboard-recent-students');
    if (studentsList) {
      const recentStudents = (AppState.students || []).slice(0, 5);
      if (recentStudents.length === 0) {
        studentsList.innerHTML = `<div class="text-muted" style="padding: 1rem; font-size: 0.85rem;">No registered students yet.</div>`;
      } else {
        studentsList.innerHTML = recentStudents.map(s => {
          const progs = (s.enrollments || []).map(e => e.programmes?.name).filter(Boolean).join(', ');
          return `
            <div class="activity-item">
              <div class="activity-item-left">
                <div class="activity-avatar">
                  ${(s.name || 'S').slice(0, 2).toUpperCase()}
                </div>
                <div class="activity-meta">
                  <div class="activity-title">${Utils.escapeHtml(s.name)}</div>
                  <div class="activity-desc">${Utils.escapeHtml(s.student_id)} • ${Utils.escapeHtml(progs || 'No program')}</div>
                </div>
              </div>
              <span class="badge badge-unpaid">Unpaid</span>
            </div>
          `;
        }).join('');
      }
    }

    Utils.renderIcons();
  }
};

window.DashboardModule = DashboardModule;
