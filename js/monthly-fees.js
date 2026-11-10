/**
 * EDUTRACK MONTHLY FEES MODULE
 * Monthly Billing, Batch Invoice Generator & Status Tracking
 */

const MonthlyFeesModule = {
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),

  init: async () => {
    await MonthlyFeesModule.loadInvoices();
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

  // Render Monthly Fees Table
  renderMonthlyFeesTable: () => {
    const tbody = document.getElementById('monthly-fees-table-body');
    if (!tbody) return;

    const month = parseInt(document.getElementById('monthly-fee-filter-month')?.value || MonthlyFeesModule.selectedMonth, 10);
    const year = parseInt(document.getElementById('monthly-fee-filter-year')?.value || MonthlyFeesModule.selectedYear, 10);
    const statusFilter = document.getElementById('monthly-fee-filter-status')?.value || '';

    let list = AppState.invoices.filter(inv => inv.billing_month === month && inv.billing_year === year);
    if (statusFilter) {
      list = list.filter(inv => inv.status === statusFilter);
    }

    // Summary calculations
    const expected = list.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
    const collected = list.reduce((sum, inv) => sum + (parseFloat(inv.paid_amount) || 0), 0);
    const pending = list.reduce((sum, inv) => sum + (parseFloat(inv.balance_amount) || 0), 0);

    const expEl = document.getElementById('month-summary-expected');
    const colEl = document.getElementById('month-summary-collected');
    const penEl = document.getElementById('month-summary-pending');

    if (expEl) expEl.textContent = Utils.formatCurrency(expected);
    if (colEl) colEl.textContent = Utils.formatCurrency(collected);
    if (penEl) penEl.textContent = Utils.formatCurrency(pending);

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 3rem 1rem;">
            <div class="empty-state">
              <i data-lucide="calendar" class="empty-state-icon"></i>
              <div class="empty-state-title">No invoices generated for ${Utils.formatMonthYear(month, year)}</div>
              <div class="empty-state-text">Click "Generate Monthly Fees" to create fee records for all active students.</div>
              <button class="btn btn-primary" onclick="MonthlyFeesModule.openGenerateModal()">
                <i data-lucide="zap" style="width: 16px; height: 16px;"></i> Generate Invoices Now
              </button>
            </div>
          </td>
        </tr>`;
      Utils.renderIcons();
      return;
    }

    tbody.innerHTML = list.map(inv => {
      const student = inv.students;
      const progNames = (inv.invoice_items || []).map(item => item.description).join(', ') || 'Tuition Fee';

      return `
        <tr>
          <td>
            <strong>${Utils.escapeHtml(inv.invoice_number)}</strong>
          </td>
          <td>
            <div style="font-weight: 600;">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${Utils.escapeHtml(student?.student_id || '')}</div>
          </td>
          <td>
            <span style="font-size: 0.82rem; color: var(--text-muted);">${Utils.escapeHtml(progNames)}</span>
          </td>
          <td>
            <strong>${Utils.formatCurrency(inv.total_amount)}</strong>
          </td>
          <td>
            <span style="color: var(--success); font-weight: 600;">${Utils.formatCurrency(inv.paid_amount)}</span>
          </td>
          <td>
            <strong style="color: ${inv.balance_amount > 0 ? 'var(--danger)' : 'var(--success)'};">
              ${Utils.formatCurrency(inv.balance_amount)}
            </strong>
          </td>
          <td>
            <span class="badge ${inv.status === 'paid' ? 'badge-paid' : (inv.status === 'partially_paid' ? 'badge-partial' : 'badge-unpaid')}">
              <span class="badge-dot"></span>
              ${inv.status}
            </span>
          </td>
          <td class="actions-cell">
            ${inv.balance_amount > 0 ? `
              <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${inv.student_id}', '${inv.id}')">
                <i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> Collect
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.5;">
                <i data-lucide="check" style="width: 14px; height: 14px;"></i> Settled
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    Utils.renderIcons();
  },

  // Open the Generate Monthly Fees modal
  openGenerateModal: () => {
    const now = new Date();
    document.getElementById('gen-month-select').value = now.getMonth() + 1;
    document.getElementById('gen-year-select').value = now.getFullYear();

    MonthlyFeesModule.updateGeneratePreview();
    Utils.openModal('modal-generate-invoices');
  },

  // Calculate preview count of students to be invoiced
  updateGeneratePreview: () => {
    const month = parseInt(document.getElementById('gen-month-select').value, 10);
    const year = parseInt(document.getElementById('gen-year-select').value, 10);

    // Active students
    const activeStudents = AppState.students.filter(s => s.status === 'active');
    
    // Check existing invoices for this month/year
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
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(defaultDueDay).padStart(2, '0')}`;

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
