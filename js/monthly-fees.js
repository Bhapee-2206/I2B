/**
 * EDUTRACK MONTHLY FEES MODULE
 * Monthly Billing, Batch Invoice Generator & Status Tracking
 */

const MonthlyFeesModule = {
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),

  init: async () => {
    await MonthlyFeesModule.loadInvoices();
    MonthlyFeesModule.populateYearFilters();
  },

  // Dynamically populate year & month filters for decade-long calendar support
  populateYearFilters: () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    // Collect all unique years from invoices, academic years, and current year +- 5
    const yearSet = new Set([curYear - 2, curYear - 1, curYear, curYear + 1, curYear + 2, curYear + 3, curYear + 4, curYear + 5]);
    (AppState.invoices || []).forEach(inv => {
      if (inv.billing_year) yearSet.add(inv.billing_year);
    });
    (AppState.academicYears || []).forEach(ay => {
      if (ay.start_date) yearSet.add(new Date(ay.start_date).getFullYear());
      if (ay.end_date) yearSet.add(new Date(ay.end_date).getFullYear());
    });

    const sortedYears = Array.from(yearSet).sort((a, b) => b - a);

    // 1. Monthly fee filter year
    const filterYear = document.getElementById('monthly-fee-filter-year');
    if (filterYear) {
      const selected = filterYear.value ? parseInt(filterYear.value, 10) : curYear;
      filterYear.innerHTML = sortedYears.map(y => `<option value="${y}" ${y === selected ? 'selected' : ''}>${y}</option>`).join('');
    }

    // 2. Monthly fee filter month
    const filterMonth = document.getElementById('monthly-fee-filter-month');
    if (filterMonth && !filterMonth.dataset.initialized) {
      filterMonth.value = String(curMonth);
      filterMonth.dataset.initialized = "true";
    }

    // 3. Batch generate modal year
    const genYear = document.getElementById('gen-year-select');
    if (genYear) {
      genYear.innerHTML = sortedYears.map(y => `<option value="${y}" ${y === curYear ? 'selected' : ''}>${y}</option>`).join('');
    }

    // 4. Batch generate modal month
    const genMonth = document.getElementById('gen-month-select');
    if (genMonth) {
      genMonth.value = String(curMonth);
    }

    // 5. Update header current cycle text
    const cycleEls = document.querySelectorAll('.dynamic-current-cycle-text');
    cycleEls.forEach(el => {
      el.textContent = Utils.formatMonthYear(curMonth, curYear);
    });
  },

  // Load invoices from Supabase
  loadInvoices: async () => {
    try {
      if (!supabaseClient) return [];
      const { data, error } = await supabaseClient
        .from('invoices')
        .select(`
          *,
          students (*),
          invoice_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      AppState.invoices = data || [];
      return AppState.invoices;
    } catch (err) {
      console.error("Error loading invoices:", err);
      Utils.showToast("Error", "Failed to load monthly fee invoices", "error");
      return [];
    }
  },

  // Render Monthly Fees (Desktop Table & Mobile Cards)
  renderMonthlyFeesTable: () => {
    const tbody = document.getElementById('monthly-fees-table-body');
    const mobileContainer = document.getElementById('monthly-fees-mobile-cards-list');
    if (!tbody && !mobileContainer) return;

    const month = parseInt(document.getElementById('monthly-fee-filter-month')?.value || MonthlyFeesModule.selectedMonth, 10);
    const year = parseInt(document.getElementById('monthly-fee-filter-year')?.value || MonthlyFeesModule.selectedYear, 10);
    const statusFilter = document.getElementById('monthly-fee-filter-status')?.value || '';

    let list = AppState.invoices.filter(inv => inv.billing_month === month && inv.billing_year === year);
    if (statusFilter) {
      list = list.filter(inv => inv.status === statusFilter);
    }

    // Calculations
    const expected = list.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
    const collected = list.reduce((sum, inv) => sum + (parseFloat(inv.paid_amount) || 0), 0);
    const pending = list.reduce((sum, inv) => {
      if (inv.status === 'paid') return sum;
      const t = parseFloat(inv.total_amount) || 0;
      const p = parseFloat(inv.paid_amount) || 0;
      return sum + Math.max(0, t - p);
    }, 0);

    const expEl = document.getElementById('month-summary-expected');
    const colEl = document.getElementById('month-summary-collected');
    const penEl = document.getElementById('month-summary-pending');

    if (expEl) expEl.textContent = Utils.formatCurrency(expected);
    if (colEl) colEl.textContent = Utils.formatCurrency(collected);
    if (penEl) penEl.textContent = Utils.formatCurrency(pending);

    if (list.length === 0) {
      const emptyHtml = `
        <div class="empty-state">
          <i data-lucide="calendar" class="empty-state-icon"></i>
          <div class="empty-state-title">No invoices generated for ${Utils.formatMonthYear(month, year)}</div>
          <div class="empty-state-text">Click "Generate Monthly Fees" to create fee records for all active students.</div>
          <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="MonthlyFeesModule.openGenerateModal()">
            <i data-lucide="zap" style="width: 14px; height: 14px;"></i> Generate Invoices Now
          </button>
        </div>`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center">${emptyHtml}</td></tr>`;
      if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
      Utils.renderIcons();
      return;
    }

    // 1. Desktop Table
    if (tbody) {
      tbody.innerHTML = list.map(inv => {
        const student = inv.students;
        const progNames = (inv.invoice_items || []).map(item => item.description).join(', ') || 'Tuition Fee';

        return `
          <tr>
            <td><strong>${Utils.escapeHtml(inv.invoice_number)}</strong></td>
            <td>
              <div style="font-weight: 600;">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${Utils.escapeHtml(student?.student_id || '')}</div>
            </td>
            <td><span style="font-size: 0.8rem; color: var(--text-muted);">${Utils.escapeHtml(progNames)}</span></td>
            <td><strong>${Utils.formatCurrency(inv.total_amount)}</strong></td>
            <td><span style="color: var(--status-paid); font-weight: 600;">${Utils.formatCurrency(inv.paid_amount)}</span></td>
            <td>
              <strong style="color: ${(inv.status === 'paid' || (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) <= 0) ? 'var(--status-paid)' : 'var(--status-unpaid)'};">
                ${Utils.formatCurrency(inv.status === 'paid' ? 0 : Math.max(0, (parseFloat(inv.total_amount) || 0) - (parseFloat(inv.paid_amount) || 0)))}
              </strong>
            </td>
            <td>
              <span class="badge ${inv.status === 'paid' ? 'badge-paid' : (inv.status === 'partially_paid' ? 'badge-partial' : 'badge-unpaid')}">
                <span class="badge-dot"></span>
                ${inv.status}
              </span>
            </td>
            <td class="actions-cell">
              ${(inv.status !== 'paid' && (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) > 0) ? `
                <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${inv.student_id}', '${inv.id}')">
                  <i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> Collect
                </button>
              ` : `
                <span style="font-size: 0.78rem; color: var(--status-paid); font-weight: 600;">Settled</span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Mobile Cards
    if (mobileContainer) {
      mobileContainer.innerHTML = list.map(inv => {
        const student = inv.students;
        return `
          <div class="student-mobile-card">
            <div class="student-card-top">
              <div>
                <div class="student-card-name">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
                <div class="student-card-parent">${Utils.escapeHtml(inv.invoice_number)} • Due: ${Utils.formatDate(inv.due_date)}</div>
              </div>
              <span class="badge ${inv.status === 'paid' ? 'badge-paid' : (inv.status === 'partially_paid' ? 'badge-partial' : 'badge-unpaid')}">
                ${inv.status}
              </span>
            </div>

            <div class="student-card-financials">
              <div>Total: <strong>${Utils.formatCurrency(inv.total_amount)}</strong></div>
              <div>Pending: <strong style="color: ${(inv.status === 'paid' || (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) <= 0) ? 'var(--status-paid)' : 'var(--status-unpaid)'};">${Utils.formatCurrency(inv.status === 'paid' ? 0 : Math.max(0, (parseFloat(inv.total_amount) || 0) - (parseFloat(inv.paid_amount) || 0)))}</strong></div>
            </div>

            ${(inv.status !== 'paid' && (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) > 0) ? `
              <div class="student-card-actions">
                <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${inv.student_id}', '${inv.id}')">
                  <i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> Collect Due (${Utils.formatCurrency(Math.max(0, (parseFloat(inv.total_amount) || 0) - (parseFloat(inv.paid_amount) || 0)))})
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    Utils.renderIcons();
  },

  // Open the Generate Monthly Fees modal
  openGenerateModal: () => {
    MonthlyFeesModule.populateYearFilters();
    const now = new Date();
    const curMonthEl = document.getElementById('gen-month-select');
    const curYearEl = document.getElementById('gen-year-select');
    if (curMonthEl) curMonthEl.value = now.getMonth() + 1;
    if (curYearEl) curYearEl.value = now.getFullYear();

    MonthlyFeesModule.updateGeneratePreview();
    Utils.openModal('modal-generate-invoices');
  },

  // Calculate preview count of students to be invoiced
  updateGeneratePreview: () => {
    const month = parseInt(document.getElementById('gen-month-select').value, 10);
    const year = parseInt(document.getElementById('gen-year-select').value, 10);

    const activeStudents = AppState.students.filter(s => s.status === 'active');
    
    // Check existing invoices for this month/year (duplicate prevention)
    const existingStudentIds = new Set(
      AppState.invoices
        .filter(inv => inv.billing_month === month && inv.billing_year === year && inv.status !== 'cancelled')
        .map(inv => inv.student_id)
    );

    const eligibleStudents = activeStudents.filter(s => !existingStudentIds.has(s.id));
    const estimatedTotal = eligibleStudents.reduce((sum, s) => sum + StudentsModule.calculateMonthlyFee(s), 0);

    document.getElementById('gen-preview-eligible-count').textContent = eligibleStudents.length;
    document.getElementById('gen-preview-existing-count').textContent = existingStudentIds.size;
    document.getElementById('gen-preview-total-amount').textContent = Utils.formatCurrency(estimatedTotal);
  },

  // Execute Batch Invoice Generation
  generateInvoices: async () => {
    const month = parseInt(document.getElementById('gen-month-select').value, 10);
    const year = parseInt(document.getElementById('gen-year-select').value, 10);

    const activeStudents = AppState.students.filter(s => s.status === 'active');
    const existingStudentIds = new Set(
      AppState.invoices
        .filter(inv => inv.billing_month === month && inv.billing_year === year && inv.status !== 'cancelled')
        .map(inv => inv.student_id)
    );

    const eligibleStudents = activeStudents.filter(s => !existingStudentIds.has(s.id));

    if (eligibleStudents.length === 0) {
      Utils.showToast("All Invoices Present", "All eligible active students already have invoices for this billing period.", "info");
      Utils.closeModal('modal-generate-invoices');
      return;
    }

    try {
      const now = new Date();
      const defaultDueDay = AppState.institution?.default_due_day || 10;
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(defaultDueDay, 28)).padStart(2, '0')}`;

      let createdCount = 0;

      for (const student of eligibleStudents) {
        const activeEnrollments = (student.enrollments || []).filter(e => e.status === 'active');
        if (activeEnrollments.length === 0) continue;

        const totalFee = activeEnrollments.reduce((sum, e) => sum + (parseFloat(e.agreed_fee) || 0), 0);
        if (totalFee <= 0) continue;

        const invPayload = {
          invoice_number: Utils.getNextInvoiceNumber(student.student_id, month, year),
          student_id: student.id,
          billing_month: month,
          billing_year: year,
          invoice_date: now.toISOString().slice(0, 10),
          due_date: dueDate,
          total_amount: totalFee,
          paid_amount: 0,
          balance_amount: totalFee,
          status: 'unpaid',
          notes: `Batch monthly invoice for ${Utils.formatMonthYear(month, year)}`
        };

        const { data: inv, error: invErr } = await supabaseClient
          .from('invoices')
          .insert([invPayload])
          .select();

        if (invErr) {
          console.error("Error creating invoice for", student.name, invErr);
          continue;
        }

        if (inv && inv[0]) {
          const items = activeEnrollments.map(e => ({
            invoice_id: inv[0].id,
            enrollment_id: e.id,
            programme_id: e.programme_id,
            class_or_grade: e.class_or_grade,
            description: `${e.programmes?.name || 'Tuition'} (${e.class_or_grade})`,
            amount: e.agreed_fee
          }));

          await supabaseClient.from('invoice_items').insert(items);
          createdCount++;
        }
      }

      await AuthModule.logAudit('generate_monthly_invoices', 'invoices', `${month}-${year}`, { count: createdCount });
      Utils.closeModal('modal-generate-invoices');
      Utils.showToast("Invoices Generated", `Successfully generated ${createdCount} monthly invoices with UNPAID status.`, "success");

      await MonthlyFeesModule.loadInvoices();
      await StudentsModule.loadStudents();
      MonthlyFeesModule.renderMonthlyFeesTable();

    } catch (err) {
      console.error("Generate invoices error:", err);
      Utils.showToast("Error", "Failed to generate monthly fee invoices", "error");
    }
  }
};

window.MonthlyFeesModule = MonthlyFeesModule;
