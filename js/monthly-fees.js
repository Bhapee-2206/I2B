/**
 * EDUTRACK MONTHLY FEES MODULE
 * Monthly Billing, Batch Invoice Generator, PDF Generation & WhatsApp Billing
 */

const MonthlyFeesModule = {
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  currentInvoice: null,

  init: async () => {
    await MonthlyFeesModule.loadInvoices();
    MonthlyFeesModule.populateYearFilters();
  },

  // Load invoices from Supabase with joined students and invoice items (with resilient fallback)
  loadInvoices: async () => {
    try {
      if (!supabaseClient) return [];
      let data = null;
      let error = null;

      // 1. Try comprehensive joined query with invoice_items
      try {
        const res = await supabaseClient
          .from('invoices')
          .select(`
            *,
            students (*),
            invoice_items (*)
          `)
          .order('created_at', { ascending: false });
        data = res.data;
        error = res.error;
      } catch (joinedEx) {
        error = joinedEx;
      }

      // 2. Resilient fallback if joined table query fails
      if (error || !data) {
        console.warn("Retrying invoice load without joined items:", error);
        const fallbackRes = await supabaseClient
          .from('invoices')
          .select(`
            *,
            students (*)
          `)
          .order('created_at', { ascending: false });
        data = fallbackRes.data;
      }

      // 3. Synthesize fallback items from active student enrolments if invoice_items is empty
      if (data) {
        data.forEach(inv => {
          if (!inv.invoice_items || inv.invoice_items.length === 0) {
            const stu = (AppState.students || []).find(s => s.id === inv.student_id) || inv.students;
            const activeEn = (stu?.enrollments || []).filter(e => e.status === 'active');
            if (activeEn.length > 0) {
              inv.invoice_items = activeEn.map(e => ({
                id: e.id,
                description: `${e.programmes?.name || 'Tuition'} (${e.class_or_grade}${e.board ? ' · ' + e.board : ''})`,
                amount: e.agreed_fee
              }));
            }
          }
        });
      }

      AppState.invoices = data || [];
      return AppState.invoices;
    } catch (err) {
      console.error("Error loading invoices:", err);
      Utils.showToast("Notice", "Failed to load invoices from database", "warning");
      return [];
    }
  },

  // Dynamically populate year & month filters for decade-long calendar support
  populateYearFilters: () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

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

    // 5. Update dynamic cycle text
    const cycleEls = document.querySelectorAll('.dynamic-current-cycle-text');
    cycleEls.forEach(el => {
      el.textContent = Utils.formatMonthYear(curMonth, curYear);
    });
  },

  // Render Monthly Fees (Desktop Table & Mobile Cards)
  renderMonthlyFeesTable: () => {
    const tbody = document.getElementById('monthly-fees-table-body');
    const mobileContainer = document.getElementById('monthly-fees-mobile-cards-list');
    if (!tbody && !mobileContainer) return;

    const month = parseInt(document.getElementById('monthly-fee-filter-month')?.value || MonthlyFeesModule.selectedMonth, 10);
    const year = parseInt(document.getElementById('monthly-fee-filter-year')?.value || MonthlyFeesModule.selectedYear, 10);
    const statusFilter = document.getElementById('monthly-fee-filter-status')?.value || '';

    let list = (AppState.invoices || []).filter(inv => inv.billing_month === month && inv.billing_year === year && inv.status !== 'cancelled');
    if (statusFilter) {
      list = list.filter(inv => inv.status === statusFilter);
    }

    // Financial summary calculations
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
          <div class="empty-state-text">Click "Generate Monthly Invoices" to create fee records for all active students.</div>
          <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="MonthlyFeesModule.openGenerateModal()">
            <i data-lucide="zap" style="width: 14px; height: 14px;"></i> Generate Invoices Now
          </button>
        </div>`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">${emptyHtml}</td></tr>`;
      if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
      Utils.renderIcons();
      return;
    }

    // 1. Desktop Table
    if (tbody) {
      tbody.innerHTML = list.map(inv => {
        const student = (AppState.students || []).find(s => s.id === inv.student_id) || inv.students;
        const items = inv.invoice_items && inv.invoice_items.length > 0
          ? inv.invoice_items
          : ((student?.enrollments || []).filter(e => e.status === 'active').map(e => ({
              description: `${e.programmes?.name || 'Tuition'} (${e.class_or_grade})`,
              amount: e.agreed_fee
            })));

        const progNames = items.map(item => item.description).join(', ') || 'Tuition Fee';
        const total = parseFloat(inv.total_amount) || 0;
        const paid = parseFloat(inv.paid_amount) || 0;
        const isPaid = inv.status === 'paid' || (total - paid) <= 0;
        const balanceDue = isPaid ? 0 : Math.max(0, total - paid);

        return `
          <tr>
            <td><strong>${Utils.escapeHtml(inv.invoice_number)}</strong></td>
            <td>
              <div style="font-weight: 600;">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${Utils.escapeHtml(student?.student_id || '')}</div>
            </td>
            <td><span style="font-size: 0.8rem; color: var(--text-muted);">${Utils.escapeHtml(progNames)}</span></td>
            <td><strong>${Utils.formatCurrency(total)}</strong></td>
            <td><span style="color: var(--status-paid); font-weight: 600;">${Utils.formatCurrency(paid)}</span></td>
            <td>
              <strong style="color: ${isPaid ? 'var(--status-paid)' : 'var(--status-unpaid)'};">
                ${Utils.formatCurrency(balanceDue)}
              </strong>
            </td>
            <td>
              <span class="badge ${isPaid ? 'badge-paid' : (paid > 0 ? 'badge-partial' : 'badge-unpaid')}">
                <span class="badge-dot"></span>
                ${isPaid ? 'paid' : (paid > 0 ? 'partially_paid' : 'unpaid')}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn btn-secondary btn-sm" onclick="MonthlyFeesModule.viewInvoice('${inv.id}')" title="View & Print Invoice">
                <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Invoice
              </button>
              <button class="btn btn-success btn-sm" onclick="MonthlyFeesModule.shareInvoiceViaWhatsApp('${inv.id}')" title="Send Invoice via WhatsApp">
                <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
              </button>
              ${!isPaid ? `
                <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${inv.student_id}', '${inv.id}')" title="Collect Fee">
                  <i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> Collect
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Mobile Cards
    if (mobileContainer) {
      mobileContainer.innerHTML = list.map(inv => {
        const student = (AppState.students || []).find(s => s.id === inv.student_id) || inv.students;
        const total = parseFloat(inv.total_amount) || 0;
        const paid = parseFloat(inv.paid_amount) || 0;
        const isPaid = inv.status === 'paid' || (total - paid) <= 0;
        const balanceDue = isPaid ? 0 : Math.max(0, total - paid);

        return `
          <div class="student-mobile-card">
            <div class="student-card-top">
              <div>
                <div class="student-card-name">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
                <div class="student-card-parent">${Utils.escapeHtml(inv.invoice_number)} • Due: ${Utils.formatDate(inv.due_date)}</div>
              </div>
              <span class="badge ${isPaid ? 'badge-paid' : (paid > 0 ? 'badge-partial' : 'badge-unpaid')}">
                ${isPaid ? 'paid' : (paid > 0 ? 'partially_paid' : 'unpaid')}
              </span>
            </div>

            <div class="student-card-financials">
              <div>Total: <strong>${Utils.formatCurrency(total)}</strong></div>
              <div>Pending: <strong style="color: ${isPaid ? 'var(--status-paid)' : 'var(--status-unpaid)'};">${Utils.formatCurrency(balanceDue)}</strong></div>
            </div>

            <div class="student-card-actions" style="margin-top: 0.75rem;">
              <button class="btn btn-secondary btn-sm" onclick="MonthlyFeesModule.viewInvoice('${inv.id}')">
                <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Invoice
              </button>
              <button class="btn btn-success btn-sm" onclick="MonthlyFeesModule.shareInvoiceViaWhatsApp('${inv.id}')">
                <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
              </button>
              ${!isPaid ? `
                <button class="btn btn-primary btn-sm" onclick="PaymentsModule.openRecordPaymentModal('${inv.student_id}', '${inv.id}')">
                  <i data-lucide="credit-card" style="width: 14px; height: 14px;"></i> Collect Due (${Utils.formatCurrency(balanceDue)})
                </button>
              ` : ''}
            </div>
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

    const activeStudents = (AppState.students || []).filter(s => (s.status || 'active').toLowerCase() === 'active');
    
    // Check existing invoices for this month/year (duplicate prevention)
    const existingStudentIds = new Set(
      (AppState.invoices || [])
        .filter(inv => inv.billing_month === month && inv.billing_year === year && inv.status !== 'cancelled')
        .map(inv => inv.student_id)
    );

    const eligibleStudents = activeStudents.filter(s => !existingStudentIds.has(s.id));
    const estimatedTotal = eligibleStudents.reduce((sum, s) => sum + StudentsModule.calculateMonthlyFee(s), 0);

    const elCount = document.getElementById('gen-preview-eligible-count');
    const exCount = document.getElementById('gen-preview-existing-count');
    const totAmount = document.getElementById('gen-preview-total-amount');

    if (elCount) elCount.textContent = eligibleStudents.length;
    if (exCount) exCount.textContent = existingStudentIds.size;
    if (totAmount) totAmount.textContent = Utils.formatCurrency(estimatedTotal);
  },

  // Execute Batch Invoice Generation (Fast, Atomic & Resilient)
  generateInvoices: async () => {
    const month = parseInt(document.getElementById('gen-month-select').value, 10);
    const year = parseInt(document.getElementById('gen-year-select').value, 10);

    const genBtn = document.querySelector('#modal-generate-invoices button.btn-primary');
    const originalBtnHtml = genBtn ? genBtn.innerHTML : '';

    if (genBtn) {
      genBtn.disabled = true;
      genBtn.innerHTML = '<span class="spinner-sm" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; vertical-align:middle; margin-right:6px;"></span> Generating Invoices...';
    }

    try {
      const activeStudents = (AppState.students || []).filter(s => (s.status || 'active').toLowerCase() === 'active');

      // 1. Fetch definitive existing invoices from Supabase to guarantee no constraint violations
      const existingStudentIds = new Set(
        (AppState.invoices || [])
          .filter(inv => inv.billing_month === month && inv.billing_year === year && inv.status !== 'cancelled')
          .map(inv => inv.student_id)
      );

      if (supabaseClient) {
        try {
          const { data: dbInvs } = await supabaseClient
            .from('invoices')
            .select('student_id')
            .eq('billing_month', month)
            .eq('billing_year', year)
            .neq('status', 'cancelled');
          if (dbInvs && dbInvs.length > 0) {
            dbInvs.forEach(i => existingStudentIds.add(i.student_id));
          }
        } catch (_) {}
      }

      const eligibleStudents = activeStudents.filter(s => !existingStudentIds.has(s.id));

      if (eligibleStudents.length === 0) {
        Utils.showToast("All Invoices Present", `All active students already have invoices for ${Utils.formatMonthYear(month, year)}.`, "info");
        Utils.closeModal('modal-generate-invoices');
        return;
      }

      const now = new Date();
      const defaultDueDay = AppState.institution?.default_due_day || 10;
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(defaultDueDay, 28)).padStart(2, '0')}`;

      // 2. Prepare all invoice payloads
      const invoicePayloads = [];
      const invoiceStudents = [];

      eligibleStudents.forEach((student, idx) => {
        const activeEnrollments = (student.enrollments || []).filter(e => (!e.status || e.status.toLowerCase() === 'active'));
        if (activeEnrollments.length === 0) return;

        let totalFee = activeEnrollments.reduce((sum, e) => {
          const fee = parseFloat(e.agreed_fee) || (typeof FeesModule !== 'undefined' ? FeesModule.getStandardFee(e.programme_id, e.class_or_grade, e.board) : 0) || 0;
          return sum + fee;
        }, 0);

        if (totalFee <= 0) totalFee = 500; // Baseline fallback

        const invNumber = Utils.getNextInvoiceNumber(student.student_id, month, year, idx + 1);

        invoicePayloads.push({
          invoice_number: invNumber,
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
        });
        invoiceStudents.push(student);
      });

      if (invoicePayloads.length === 0) {
        Utils.showToast("Notice", "No eligible students found with active programme enrolments.", "info");
        Utils.closeModal('modal-generate-invoices');
        return;
      }

      // 3. Batch Insert Invoices (Ultra fast single network roundtrip with individual fallback)
      let createdInvoices = [];

      if (supabaseClient) {
        try {
          const { data: inserted, error: batchErr } = await supabaseClient
            .from('invoices')
            .insert(invoicePayloads)
            .select();

          if (!batchErr && inserted && inserted.length > 0) {
            createdInvoices = inserted;
          } else {
            throw batchErr || new Error("Batch insert returned empty");
          }
        } catch (batchEx) {
          console.warn("Batch invoice insert fallback to individual inserts:", batchEx);
          for (let i = 0; i < invoicePayloads.length; i++) {
            try {
              const { data: singleInv } = await supabaseClient
                .from('invoices')
                .insert([invoicePayloads[i]])
                .select();
              if (singleInv && singleInv[0]) createdInvoices.push(singleInv[0]);
            } catch (_) {}
          }
        }
      }

      // 4. Batch Insert Invoice Line Items
      if (createdInvoices.length > 0 && supabaseClient) {
        const allItems = [];
        createdInvoices.forEach(inv => {
          const student = invoiceStudents.find(s => s.id === inv.student_id);
          if (!student) return;
          const activeEnrollments = (student.enrollments || []).filter(e => (!e.status || e.status.toLowerCase() === 'active'));
          activeEnrollments.forEach(e => {
            const fee = parseFloat(e.agreed_fee) || (typeof FeesModule !== 'undefined' ? FeesModule.getStandardFee(e.programme_id, e.class_or_grade, e.board) : 0) || 0;
            allItems.push({
              invoice_id: inv.id,
              enrollment_id: e.id,
              programme_id: e.programme_id,
              class_or_grade: e.class_or_grade,
              description: `${e.programmes?.name || 'Tuition'} (${e.class_or_grade}${e.board ? ' · ' + e.board : ''})`,
              amount: fee
            });
          });
        });

        if (allItems.length > 0) {
          try {
            await supabaseClient.from('invoice_items').insert(allItems);
          } catch (_) {}
        }
      }

      const createdCount = createdInvoices.length;
      await AuthModule.logAudit('generate_monthly_invoices', 'invoices', `${month}-${year}`, { count: createdCount });
      Utils.closeModal('modal-generate-invoices');
      Utils.showToast("Invoices Generated", `Successfully generated ${createdCount} monthly invoices with UNPAID status.`, "success");

      // Auto-set filter to target billing month/year so user sees new invoices immediately
      const filterMonthEl = document.getElementById('monthly-fee-filter-month');
      const filterYearEl = document.getElementById('monthly-fee-filter-year');
      if (filterMonthEl) filterMonthEl.value = month;
      if (filterYearEl) filterYearEl.value = year;

      await MonthlyFeesModule.loadInvoices();
      await StudentsModule.loadStudents();
      MonthlyFeesModule.renderMonthlyFeesTable();

      if (typeof DashboardModule !== 'undefined' && DashboardModule.updateMetrics) {
        DashboardModule.updateMetrics();
        DashboardModule.renderOutstandingStudentsList();
      }

    } catch (err) {
      console.error("Generate invoices error:", err);
      Utils.showToast("Error", err.message || "Failed to generate monthly fee invoices", "error");
    } finally {
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.innerHTML = originalBtnHtml;
        Utils.renderIcons();
      }
    }
  },

  // View Comprehensive Fee Invoice in Modal
  viewInvoice: async (invoiceId) => {
    let inv = (AppState.invoices || []).find(i => i.id === invoiceId);
    if (!inv && supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('invoices')
          .select(`*, students (*), invoice_items (*)`)
          .eq('id', invoiceId)
          .single();
        inv = data;
      } catch (_) {}
    }

    if (!inv) {
      Utils.showToast("Notice", "Invoice record not found", "warning");
      return;
    }

    MonthlyFeesModule.currentInvoice = inv;
    const student = (AppState.students || []).find(s => s.id === inv.student_id) || inv.students;
    const inst = AppState.institution;

    document.getElementById('invoice-view-number').textContent = inv.invoice_number;
    document.getElementById('invoice-institution-name').textContent = inst?.institution_name || 'I2B Educational Institution';
    document.getElementById('invoice-institution-address').textContent = `Contact: ${inst?.contact_phone || '+91 6385577966 / +91 9345999260'} • ${inst?.contact_email || 'i2btutioncentre@gmail.com'}`;

    document.getElementById('invoice-detail-no').textContent = inv.invoice_number;
    document.getElementById('invoice-detail-cycle').textContent = Utils.formatMonthYear(inv.billing_month, inv.billing_year);
    document.getElementById('invoice-detail-student').textContent = student?.name || '—';
    document.getElementById('invoice-detail-id').textContent = student?.student_id || '—';
    document.getElementById('invoice-detail-phone').textContent = student?.whatsapp_number || 'Not provided';
    document.getElementById('invoice-detail-due').textContent = Utils.formatDate(inv.due_date);

    // Items table
    const items = inv.invoice_items && inv.invoice_items.length > 0
      ? inv.invoice_items
      : ((student?.enrollments || []).filter(e => e.status === 'active').map(e => ({
          description: `${e.programmes?.name || 'Tuition'} (${e.class_or_grade}${e.board ? ' · ' + e.board : ''})`,
          amount: e.agreed_fee
        })));

    const itemsTbody = document.getElementById('invoice-items-table-body');
    if (itemsTbody) {
      if (items.length === 0) {
        itemsTbody.innerHTML = `<tr><td>Tuition Fee (${inv.billing_month}/${inv.billing_year})</td><td style="text-align: right; font-weight: 600;">${Utils.formatCurrency(inv.total_amount)}</td></tr>`;
      } else {
        itemsTbody.innerHTML = items.map(it => `
          <tr>
            <td><strong>${Utils.escapeHtml(it.description)}</strong></td>
            <td style="text-align: right; font-weight: 600;">${Utils.formatCurrency(it.amount)}</td>
          </tr>
        `).join('');
      }
    }

    const total = parseFloat(inv.total_amount) || 0;
    const paid = parseFloat(inv.paid_amount) || 0;
    const isPaid = inv.status === 'paid' || (total - paid) <= 0;
    const balanceDue = isPaid ? 0 : Math.max(0, total - paid);

    document.getElementById('invoice-total-display').textContent = Utils.formatCurrency(total);
    document.getElementById('invoice-paid-display').textContent = Utils.formatCurrency(paid);
    document.getElementById('invoice-balance-display').textContent = Utils.formatCurrency(balanceDue);

    const badge = document.getElementById('invoice-status-badge');
    if (badge) {
      badge.className = `badge ${isPaid ? 'badge-paid' : (paid > 0 ? 'badge-partial' : 'badge-unpaid')}`;
      badge.textContent = isPaid ? 'PAID' : (paid > 0 ? 'PARTIALLY PAID' : 'UNPAID');
    }

    const collectBtn = document.getElementById('btn-invoice-modal-collect');
    if (collectBtn) {
      collectBtn.style.display = isPaid ? 'none' : 'inline-flex';
    }

    Utils.openModal('modal-view-invoice');
  },

  // Collect fee directly from invoice modal
  collectFromInvoiceModal: () => {
    const inv = MonthlyFeesModule.currentInvoice;
    if (inv) {
      Utils.closeModal('modal-view-invoice');
      PaymentsModule.openRecordPaymentModal(inv.student_id, inv.id);
    }
  },

  // Generate jsPDF instance for an invoice
  createInvoicePDF: (inv) => {
    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
      throw new Error("jsPDF library is not loaded");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const inst = AppState.institution;
    const student = (AppState.students || []).find(s => s.id === inv.student_id) || inv.students;

    // Header Banner
    doc.setFillColor(15, 23, 42); // Navy
    doc.rect(0, 0, 148, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(inst?.institution_name || "I2B EDUCATIONAL INSTITUTION", 14, 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(inst?.subtitle || "Student & Monthly Tuition Fee Management", 14, 17);
    const phone = inst?.contact_phone || '+91 6385577966 / +91 9345999260';
    const email = inst?.contact_email || 'i2btutioncentre@gmail.com';
    doc.text(`Phone: ${phone} | Email: ${email}`, 14, 22);

    // Invoice Subheader Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 32, 120, 13, 2, 2, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text("TUITION FEE INVOICE", 18, 40);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${inv.invoice_number}`, 75, 38);
    doc.text(`Billing: ${Utils.formatMonthYear(inv.billing_month, inv.billing_year)}`, 75, 43);

    // Student & Due Details
    doc.setFontSize(8.5);
    doc.text("Student ID:", 14, 53);
    doc.setFont('helvetica', 'bold');
    doc.text(`${student?.student_id || '—'}`, 38, 53);

    doc.setFont('helvetica', 'normal');
    doc.text("Student Name:", 14, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(`${student?.name || '—'}`, 38, 59);

    doc.setFont('helvetica', 'normal');
    doc.text("Parent / Phone:", 75, 53);
    doc.text(`${student?.whatsapp_number || '—'}`, 98, 53);

    doc.text("Due Date:", 75, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(`${Utils.formatDate(inv.due_date)}`, 98, 59);

    doc.line(14, 64, 134, 64);

    // Items Table Header
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text("Fee Particulars", 14, 71);
    doc.text("Amount (INR)", 110, 71);
    doc.line(14, 73, 134, 73);

    // Items list
    const items = inv.invoice_items && inv.invoice_items.length > 0
      ? inv.invoice_items
      : ((student?.enrollments || []).filter(e => e.status === 'active').map(e => ({
          description: `${e.programmes?.name || 'Tuition'} (${e.class_or_grade}${e.board ? ' · ' + e.board : ''})`,
          amount: e.agreed_fee
        })));

    let curY = 80;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    if (items.length === 0) {
      doc.text(`Monthly Tuition Fee (${inv.billing_month}/${inv.billing_year})`, 14, curY);
      doc.text(`Rs. ${(parseFloat(inv.total_amount) || 0).toFixed(2)}`, 112, curY);
      curY += 7;
    } else {
      items.forEach(it => {
        doc.text(it.description || 'Tuition', 14, curY);
        doc.text(`Rs. ${(parseFloat(it.amount) || 0).toFixed(2)}`, 112, curY);
        curY += 7;
      });
    }

    doc.line(14, curY, 134, curY);
    curY += 6;

    // Financial Totals Box
    const total = parseFloat(inv.total_amount) || 0;
    const paid = parseFloat(inv.paid_amount) || 0;
    const isPaid = inv.status === 'paid' || (total - paid) <= 0;
    const balanceDue = isPaid ? 0 : Math.max(0, total - paid);

    doc.setFontSize(8.5);
    doc.text("Total Amount:", 75, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${total.toFixed(2)}`, 110, curY);
    curY += 6;

    doc.setFont('helvetica', 'normal');
    doc.text("Amount Paid:", 75, curY);
    doc.text(`Rs. ${paid.toFixed(2)}`, 110, curY);
    curY += 6;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isPaid ? 16 : 220, isPaid ? 185 : 38, isPaid ? 129 : 38);
    doc.text("Balance Due:", 75, curY);
    doc.text(`Rs. ${balanceDue.toFixed(2)}`, 110, curY);
    doc.setTextColor(15, 23, 42);
    curY += 12;

    // Footer info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text("Accepted Modes: UPI / Cash. Please quote invoice number when paying.", 14, curY);
    doc.text("This is an official computer-generated fee invoice.", 14, curY + 5);

    // Signatory
    doc.text("Authorized Signatory", 100, curY + 14);
    doc.line(95, curY + 10, 134, curY + 10);

    const filename = `Invoice_${inv.invoice_number}.pdf`;
    return { doc, filename };
  },

  // Download Invoice as PDF
  downloadInvoicePDF: () => {
    const inv = MonthlyFeesModule.currentInvoice;
    if (!inv) return;

    try {
      const { doc, filename } = MonthlyFeesModule.createInvoicePDF(inv);
      doc.save(filename);
      Utils.showToast("Invoice Downloaded", `Invoice ${inv.invoice_number} saved as PDF`, "success");
    } catch (e) {
      console.error("Invoice PDF generation error:", e);
      Utils.showToast("Notice", "Failed to generate PDF. Use Print instead.", "warning");
    }
  },

  // Print Invoice directly
  printInvoice: () => {
    window.print();
  },

  // Share Invoice via WhatsApp
  shareInvoiceViaWhatsApp: async (invoiceId = null) => {
    let inv = MonthlyFeesModule.currentInvoice;
    if (invoiceId && (!inv || inv.id !== invoiceId)) {
      inv = (AppState.invoices || []).find(i => i.id === invoiceId);
    }
    if (!inv) {
      Utils.showToast("Notice", "Invoice not found", "warning");
      return;
    }

    MonthlyFeesModule.currentInvoice = inv;
    const student = (AppState.students || []).find(s => s.id === inv.student_id) || inv.students;
    const inst = AppState.institution;
    const orgName = inst?.institution_name || "I2B Educational Institution";

    const studentName = student?.name || 'Student';
    const studentId = student?.student_id || 'STU';
    const invNo = inv.invoice_number;
    const cycle = Utils.formatMonthYear(inv.billing_month, inv.billing_year);
    const dueDate = Utils.formatDate(inv.due_date);
    const total = (parseFloat(inv.total_amount) || 0).toFixed(2);
    const paid = (parseFloat(inv.paid_amount) || 0).toFixed(2);
    const isPaid = inv.status === 'paid' || (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) <= 0;
    const due = isPaid ? '0.00' : Math.max(0, parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)).toFixed(2);
    const statusText = isPaid ? 'PAID' : (parseFloat(paid) > 0 ? 'PARTIALLY PAID' : 'UNPAID');

    const msg = `*${orgName}*
*Tuition Fee Invoice Confirmation*

Dear Parent / Student,
Please find fee invoice details for *${studentName}* (ID: ${studentId}) for *${cycle}*.

*Invoice No:* ${invNo}
*Billing Cycle:* ${cycle}
*Due Date:* ${dueDate}
*Total Amount:* Rs. ${total}
*Amount Paid:* Rs. ${paid}
*Outstanding Due:* Rs. ${due}
*Payment Status:* ${statusText}

Payment can be made via UPI or Cash at the tuition centre.
For queries, contact: +91 6385577966  OR +91 9345999260
Email: i2btutioncentre@gmail.com

Thank you! This is an official computer-generated fee invoice.`;

    const rawPhone = (student?.whatsapp_number || '').trim();

    // 1. Direct send if student has registered WhatsApp number
    if (rawPhone) {
      const waUrl = Utils.buildWhatsAppUrl(rawPhone, msg);
      window.open(waUrl, '_blank');
      Utils.showToast("WhatsApp Opened", `Sending invoice directly to ${studentName} (${rawPhone})`, "success", 4000);
      return;
    }

    // 2. Web Share API fallback if supported
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Invoice - ${studentName} (${invNo})`,
          text: msg
        });
        Utils.showToast("Sharing Menu Opened", "Select parent contact to send invoice", "info", 5000);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // 3. Desktop manual fallback
    const waUrlManual = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrlManual, '_blank');
    Utils.showToast("WhatsApp Opened", "No phone number on profile. Please select parent chat manually.", "warning", 5000);
  }
};

window.MonthlyFeesModule = MonthlyFeesModule;
