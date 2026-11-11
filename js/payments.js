/**
 * EDUTRACK FEE COLLECTION & PAYMENTS MODULE
 * Atomic Transaction Recording, Over-allocation Guards & Receipt Generation
 */

const PaymentsModule = {
  currentStudentPendingInvoices: [],
  selectedStudentIds: [],
  isSubmittingPayment: false,
  preselectedInvoiceId: null,

  init: async () => {
    await PaymentsModule.loadPayments();
  },

  // Load all payments with student and receipt references
  loadPayments: async () => {
    try {
      if (!supabaseClient) return [];
      const { data, error } = await supabaseClient
        .from('payments')
        .select(`
          *,
          students (*),
          receipts (*),
          payment_allocations (
            *,
            invoices (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      AppState.payments = data || [];
      return AppState.payments;
    } catch (err) {
      console.error("Error loading payments:", err);
      Utils.showToast("Error", "Failed to load payment records", "error");
      return [];
    }
  },

  // Render Payments (Desktop Table & Mobile Cards)
  renderPaymentsTable: () => {
    const tbody = document.getElementById('payments-table-body');
    const mobileContainer = document.getElementById('payments-mobile-cards-list');
    if (!tbody && !mobileContainer) return;

    const searchTerm = (document.getElementById('payment-search-input')?.value || '').trim().toLowerCase();
    const filterMethod = document.getElementById('payment-filter-method')?.value || '';

    let list = AppState.payments || [];

    if (searchTerm) {
      list = list.filter(p => 
        (p.payment_number && p.payment_number.toLowerCase().includes(searchTerm)) ||
        (p.students?.name && p.students.name.toLowerCase().includes(searchTerm)) ||
        (p.students?.student_id && p.students.student_id.toLowerCase().includes(searchTerm)) ||
        (p.transaction_reference && p.transaction_reference.toLowerCase().includes(searchTerm))
      );
    }

    if (filterMethod) {
      list = list.filter(p => p.payment_method === filterMethod);
    }

    if (list.length === 0) {
      const emptyHtml = `
        <div class="empty-state">
          <i data-lucide="receipt" class="empty-state-icon"></i>
          <div class="empty-state-title">No payments found</div>
          <div class="empty-state-text">Record tuition fees received to populate payment ledgers and receipts.</div>
        </div>`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center">${emptyHtml}</td></tr>`;
      if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
      Utils.renderIcons();
      return;
    }

    // 1. Desktop Table
    if (tbody) {
      tbody.innerHTML = list.map(p => {
        const student = p.students;
        const receipt = p.receipts && p.receipts.length > 0 ? p.receipts[0] : null;

        return `
          <tr>
            <td><strong>${Utils.escapeHtml(p.payment_number)}</strong></td>
            <td>
              <div style="font-weight: 600;">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${Utils.escapeHtml(student?.student_id || '')}</div>
            </td>
            <td>${Utils.formatDate(p.payment_date)}</td>
            <td><strong style="color: var(--status-paid); font-size: 1rem;">${Utils.formatCurrency(p.amount)}</strong></td>
            <td>
              <span class="badge badge-neutral">${Utils.escapeHtml(p.payment_method)}</span>
              ${p.transaction_reference ? `<div style="font-size: 0.72rem; color: var(--text-muted);">Ref: ${Utils.escapeHtml(p.transaction_reference)}</div>` : ''}
            </td>
            <td>${receipt ? `<span class="badge badge-info">${Utils.escapeHtml(receipt.receipt_number)}</span>` : '<span class="text-muted">—</span>'}</td>
            <td class="actions-cell">
              ${receipt ? `
                <button class="btn btn-secondary btn-sm" onclick="ReceiptsModule.viewReceipt('${receipt.id}')" title="View & Print">
                  <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Receipt
                </button>
                <button class="btn btn-success btn-sm" onclick="ReceiptsModule.shareViaWhatsApp('${receipt.id}')" title="Share via WhatsApp">
                  <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-sm" onclick="PaymentsModule.reversePayment('${p.id}')" title="Reverse Payment" style="color: var(--status-unpaid); padding: 0.25rem 0.45rem;">
                <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> Reverse
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Mobile Cards
    if (mobileContainer) {
      mobileContainer.innerHTML = list.map(p => {
        const student = p.students;
        const receipt = p.receipts && p.receipts.length > 0 ? p.receipts[0] : null;

        return `
          <div class="student-mobile-card">
            <div class="student-card-top">
              <div>
                <div class="student-card-name">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
                <div class="student-card-parent">${Utils.escapeHtml(p.payment_number)} • ${Utils.formatDate(p.payment_date)}</div>
              </div>
              <strong style="color: var(--status-paid); font-size: 1.1rem;">${Utils.formatCurrency(p.amount)}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
              <span>Mode: <strong>${Utils.escapeHtml(p.payment_method)}</strong></span>
              <span>Receipt: <strong>${receipt ? Utils.escapeHtml(receipt.receipt_number) : '—'}</strong></span>
            </div>

            <div class="student-card-actions">
              ${receipt ? `
                <button class="btn btn-secondary btn-sm" onclick="ReceiptsModule.viewReceipt('${receipt.id}')">
                  <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Receipt
                </button>
                <button class="btn btn-success btn-sm" onclick="ReceiptsModule.shareViaWhatsApp('${receipt.id}')">
                  <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-sm" onclick="PaymentsModule.reversePayment('${p.id}')" style="color: var(--status-unpaid);">
                <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> Reverse
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    Utils.renderIcons();
  },

  // Populate student dropdown with Smart Related Profiles grouped at the TOP, followed by other students
  populateStudentDropdown: (filterQuery = '') => {
    const studentSelect = document.getElementById('payment-student-select');
    if (!studentSelect) return;

    const students = AppState.students || [];
    const selectedIds = PaymentsModule.selectedStudentIds || [];
    const selectedStudents = students.filter(s => selectedIds.includes(s.id));

    const formatOptionText = (s) => {
      const bal = StudentsModule.calculateOutstandingBalance(s);
      const activeEnrollments = (s.enrollments || []).filter(e => e.status === 'active');
      let progDesc = '';
      if (activeEnrollments.length > 0) {
        progDesc = activeEnrollments.map(e => {
          const pName = e.programmes?.name || 'Tuition';
          const lvl = e.class_or_grade ? ` (${e.class_or_grade})` : '';
          return `${pName}${lvl}`;
        }).join(', ');
      } else if (s.grade) {
        progDesc = s.grade;
      }
      const progBadge = progDesc ? ` • [${progDesc}]` : '';
      return `${s.name} (${s.student_id})${progBadge} - Due: ${Utils.formatCurrency(bal)}`;
    };

    const defaultLabel = selectedIds.length > 0
      ? '+ Add Another Student / Profile to Receipt...'
      : '-- Choose Student --';

    const availableStudents = students.filter(s => !selectedIds.includes(s.id));
    const cleanQuery = (filterQuery || '').trim().toLowerCase();

    // Partition into related profiles (same phone, name, or parent) vs other students
    const relatedStudents = [];
    const otherStudents = [];

    availableStudents.forEach(s => {
      // Filter check if query is provided
      if (cleanQuery) {
        const activeEnrs = (s.enrollments || []).filter(e => e.status === 'active');
        const progStr = activeEnrs.map(e => e.programmes?.name || '').join(' ').toLowerCase();
        const matches = (s.name || '').toLowerCase().includes(cleanQuery) ||
          (s.student_id || '').toLowerCase().includes(cleanQuery) ||
          (s.parent_name || '').toLowerCase().includes(cleanQuery) ||
          (s.whatsapp_number || '').includes(cleanQuery) ||
          progStr.includes(cleanQuery) ||
          (s.grade || '').toLowerCase().includes(cleanQuery);
        if (!matches) return;
      }

      // Check if related to any currently selected student
      if (selectedStudents.length > 0) {
        const sPhone = (s.whatsapp_number || '').replace(/\D/g, '').slice(-10);
        const sParent = (s.parent_name || '').trim().toLowerCase();
        const sName = (s.name || '').trim().toLowerCase();

        let isRelated = false;
        for (const cur of selectedStudents) {
          const curPhone = (cur.whatsapp_number || '').replace(/\D/g, '').slice(-10);
          const curParent = (cur.parent_name || '').trim().toLowerCase();
          const curName = (cur.name || '').trim().toLowerCase();

          const phoneMatch = curPhone.length >= 8 && sPhone.length >= 8 && curPhone === sPhone;
          const nameMatch = curName.length >= 3 && curName === sName;
          const parentMatch = curParent.length >= 3 && curParent === sParent;

          if (phoneMatch || nameMatch || parentMatch) {
            isRelated = true;
            break;
          }
        }

        if (isRelated) {
          relatedStudents.push(s);
        } else {
          otherStudents.push(s);
        }
      } else {
        otherStudents.push(s);
      }
    });

    let optionsHtml = `<option value="">${defaultLabel}</option>`;

    // Place related profiles (same phone/name/parent) at the VERY TOP
    if (relatedStudents.length > 0) {
      optionsHtml += `<optgroup label="⭐ Related Profiles / Same Family (1-Click)">` + 
        relatedStudents.map(s => `
          <option value="${s.id}">
            ⭐ ${Utils.escapeHtml(formatOptionText(s))}
          </option>
        `).join('') + 
        `</optgroup>`;

      if (otherStudents.length > 0) {
        optionsHtml += `<optgroup label="All Other Students">` + 
          otherStudents.map(s => `
            <option value="${s.id}">
              ${Utils.escapeHtml(formatOptionText(s))}
            </option>
          `).join('') + 
          `</optgroup>`;
      }
    } else {
      optionsHtml += otherStudents.map(s => `
        <option value="${s.id}">
          ${Utils.escapeHtml(formatOptionText(s))}
        </option>
      `).join('');
    }

    studentSelect.innerHTML = optionsHtml;
    studentSelect.value = '';
  },

  // Instant filter for the student dropdown
  filterStudentDropdown: (query) => {
    PaymentsModule.populateStudentDropdown(query);
  },

  // Update selected student pill tags
  updateSelectedStudentTags: () => {
    const tagsContainer = document.getElementById('payment-selected-students-tags');
    const countBadge = document.getElementById('payment-profile-count-badge');
    const selectedIds = PaymentsModule.selectedStudentIds || [];

    if (!tagsContainer) return;

    if (selectedIds.length > 0) {
      tagsContainer.style.display = 'flex';
      tagsContainer.innerHTML = selectedIds.map(sId => {
        const s = (AppState.students || []).find(st => st.id === sId);
        if (!s) return '';
        const activeEnr = (s.enrollments || []).filter(e => e.status === 'active');
        const progName = activeEnr.map(e => e.programmes?.name || 'Tuition').join(', ') || s.grade || '';
        const progBadge = progName ? ` • ${progName}` : '';
        return `
          <span style="display: inline-flex; align-items: center; gap: 0.35rem; background: var(--accent-light); color: var(--accent-blue); padding: 0.25rem 0.6rem; border-radius: var(--radius-full); font-size: 0.78rem; font-weight: 600;">
            <span>${Utils.escapeHtml(s.name)} (${Utils.escapeHtml(s.student_id)}${Utils.escapeHtml(progBadge)})</span>
            <button type="button" onclick="PaymentsModule.removeStudent('${s.id}')" title="Remove" style="background: none; border: none; padding: 0; margin-left: 2px; cursor: pointer; color: var(--accent-blue); font-size: 1rem; line-height: 1; font-weight: bold;">&times;</button>
          </span>
        `;
      }).join('');

      if (countBadge) {
        countBadge.innerHTML = selectedIds.length > 1
          ? `<strong style="color: var(--status-paid);">${selectedIds.length} Profiles Selected</strong> (Combined Receipt)`
          : ``;
      }
    } else {
      tagsContainer.style.display = 'none';
      tagsContainer.innerHTML = '';
      if (countBadge) countBadge.textContent = '';
    }
  },

  // Open the Record Payment Modal
  openRecordPaymentModal: (studentId = null, preselectedInvoiceId = null) => {
    PaymentsModule.isSubmittingPayment = false;
    PaymentsModule.preselectedInvoiceId = preselectedInvoiceId;
    PaymentsModule.selectedStudentIds = studentId ? [studentId] : [];

    const dateInput = document.getElementById('payment-date-input');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    const amountInput = document.getElementById('payment-amount-input');
    if (amountInput) amountInput.value = '';
    const methodSelect = document.getElementById('payment-method-select');
    if (methodSelect) methodSelect.value = 'UPI';
    const refInput = document.getElementById('payment-ref-input');
    if (refInput) refInput.value = '';
    const notesInput = document.getElementById('payment-notes-input');
    if (notesInput) notesInput.value = '';
    const filterInput = document.getElementById('payment-student-filter-input');
    if (filterInput) filterInput.value = '';

    PaymentsModule.updateSelectedStudentTags();
    PaymentsModule.populateStudentDropdown();
    PaymentsModule.renderPaymentChecklist();

    Utils.openModal('modal-record-payment');
    Utils.renderIcons();
  },

  // When student is selected in dropdown
  onStudentSelectChange: (studentId) => {
    if (!studentId) return;
    if (!PaymentsModule.selectedStudentIds.includes(studentId)) {
      PaymentsModule.selectedStudentIds.push(studentId);
    }
    const filterInput = document.getElementById('payment-student-filter-input');
    if (filterInput) filterInput.value = '';

    PaymentsModule.updateSelectedStudentTags();
    PaymentsModule.populateStudentDropdown();
    PaymentsModule.renderPaymentChecklist();
  },

  // Remove a student from selection
  removeStudent: (studentId) => {
    PaymentsModule.selectedStudentIds = PaymentsModule.selectedStudentIds.filter(id => id !== studentId);
    const filterInput = document.getElementById('payment-student-filter-input');
    if (filterInput) filterInput.value = '';

    PaymentsModule.updateSelectedStudentTags();
    PaymentsModule.populateStudentDropdown();
    PaymentsModule.renderPaymentChecklist();
  },
  // Render the category and invoice payment checklist for all selected profiles
  renderPaymentChecklist: () => {
    const container = document.getElementById('payment-invoices-checklist');
    if (!container) return;

    const studentIds = PaymentsModule.selectedStudentIds || [];

    if (studentIds.length === 0) {
      container.innerHTML = '<div class="text-muted" style="font-size: 0.82rem; padding: 0.5rem 0;">Please select a student profile above to view outstanding fees.</div>';
      PaymentsModule.calculateSelectedInvoiceTotal();
      Utils.renderIcons();
      return;
    }

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    let checklistHtml = '';
    let totalPayableCount = 0;

    studentIds.forEach((sId, index) => {
      const student = (AppState.students || []).find(s => s.id === sId);
      if (!student) return;

      const activeEnrollments = (student.enrollments || []).filter(e => e.status === 'active');
      const pendingInvoices = (student.invoices || [])
        .filter(inv => inv.status !== 'cancelled' && (
          inv.status === 'unpaid' ||
          inv.status === 'partially_paid' ||
          (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) > 0
        ))
        .sort((a, b) => (a.billing_year * 100 + a.billing_month) - (b.billing_year * 100 + b.billing_month));

      const outstandingDue = StudentsModule.calculateOutstandingBalance(student);

      const studentCardHeader = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: ${index > 0 ? '1rem' : '0.25rem'}; margin-bottom: 0.45rem; padding-bottom: 0.35rem; border-bottom: 1px solid var(--border-light);">
          <div>
            <strong style="color: var(--text-main); font-size: 0.88rem;">${Utils.escapeHtml(student.name)}</strong>
            <span style="font-size: 0.76rem; color: var(--text-muted); margin-left: 0.35rem;">(${Utils.escapeHtml(student.student_id)})</span>
          </div>
          <span style="font-size: 0.78rem; color: ${outstandingDue > 0 ? 'var(--status-unpaid)' : 'var(--status-paid)'}; font-weight: 700;">
            Due: ${Utils.formatCurrency(outstandingDue)}
          </span>
        </div>
      `;

      checklistHtml += studentCardHeader;

      // 1. Pending Invoices (Already generated in DB)
      if (pendingInvoices.length > 0) {
        pendingInvoices.forEach(inv => {
          const tot = parseFloat(inv.total_amount) || 0;
          const pd = parseFloat(inv.paid_amount) || 0;
          const bal = (inv.balance_amount !== undefined && inv.balance_amount !== null)
            ? parseFloat(inv.balance_amount)
            : Math.max(0, tot - pd);
          const currentDue = inv.status === 'paid' ? 0 : Math.max(0, Math.min(bal, tot - pd));

          if (currentDue > 0) {
            totalPayableCount++;
            const isPreselected = PaymentsModule.preselectedInvoiceId === inv.id || !PaymentsModule.preselectedInvoiceId;
            const invLabel = `${inv.invoice_number} (${Utils.formatMonthYear(inv.billing_month, inv.billing_year)})`;
            const noteDesc = inv.notes || `Tuition fee for ${Utils.formatMonthYear(inv.billing_month, inv.billing_year)}`;

            checklistHtml += `
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; background: var(--surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-light); font-size: 0.84rem; cursor: pointer; margin-bottom: 0.35rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <input type="checkbox" class="payment-item-checkbox"
                    data-student-id="${student.id}"
                    data-student-name="${Utils.escapeHtml(student.name)}"
                    data-student-code="${Utils.escapeHtml(student.student_id)}"
                    data-type="invoice"
                    data-id="${inv.id}"
                    data-amount="${currentDue}"
                    data-label="${Utils.escapeHtml(invLabel)}"
                    data-month="${inv.billing_month}"
                    data-year="${inv.billing_year}"
                    ${isPreselected ? 'checked' : ''}
                    onchange="PaymentsModule.calculateSelectedInvoiceTotal()">
                  <div>
                    <div style="font-weight: 600;">${Utils.escapeHtml(invLabel)}</div>
                    <div style="font-size: 0.73rem; color: var(--text-muted);">${Utils.escapeHtml(noteDesc)}</div>
                  </div>
                </div>
                <span style="font-weight: 700; color: var(--status-unpaid); font-size: 0.95rem;">${Utils.formatCurrency(currentDue)}</span>
              </label>
            `;
          }
        });
      } else if (activeEnrollments.length > 0) {
        // 2. Active Enrolments for this month (Enables selective category payment: e.g. pay Subject now, pay Hindi later)
        activeEnrollments.forEach(enr => {
          const fee = parseFloat(enr.agreed_fee) || 0;
          if (fee > 0) {
            totalPayableCount++;
            const progName = enr.programmes?.name || 'Tuition';
            const gradeText = enr.class_or_grade ? ` (${enr.class_or_grade})` : '';
            const itemLabel = `${progName}${gradeText} - ${Utils.formatMonthYear(curMonth, curYear)}`;

            checklistHtml += `
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; background: var(--surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-light); font-size: 0.84rem; cursor: pointer; margin-bottom: 0.35rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <input type="checkbox" class="payment-item-checkbox"
                    data-student-id="${student.id}"
                    data-student-name="${Utils.escapeHtml(student.name)}"
                    data-student-code="${Utils.escapeHtml(student.student_id)}"
                    data-type="enrollment"
                    data-id="${enr.id}"
                    data-programme-id="${enr.programme_id}"
                    data-grade="${Utils.escapeHtml(enr.class_or_grade || '')}"
                    data-amount="${fee}"
                    data-label="${Utils.escapeHtml(itemLabel)}"
                    data-month="${curMonth}"
                    data-year="${curYear}"
                    checked
                    onchange="PaymentsModule.calculateSelectedInvoiceTotal()">
                  <div>
                    <div style="font-weight: 600;">${Utils.escapeHtml(itemLabel)}</div>
                    <div style="font-size: 0.73rem; color: var(--text-muted);">Current month tuition category</div>
                  </div>
                </div>
                <span style="font-weight: 700; color: var(--status-unpaid); font-size: 0.95rem;">${Utils.formatCurrency(fee)}</span>
              </label>
            `;
          }
        });
      } else {
        // 3. Fallback to flat monthly fee
        const monthlyFee = StudentsModule.calculateMonthlyFee(student);
        const feeToCollect = outstandingDue > 0 ? outstandingDue : monthlyFee;
        if (feeToCollect > 0) {
          totalPayableCount++;
          const itemLabel = `Tuition Fee - ${Utils.formatMonthYear(curMonth, curYear)}`;
          checklistHtml += `
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; background: var(--surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-light); font-size: 0.84rem; cursor: pointer; margin-bottom: 0.35rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" class="payment-item-checkbox"
                  data-student-id="${student.id}"
                  data-student-name="${Utils.escapeHtml(student.name)}"
                  data-student-code="${Utils.escapeHtml(student.student_id)}"
                  data-type="general"
                  data-id="fee-${student.id}"
                  data-amount="${feeToCollect}"
                  data-label="${Utils.escapeHtml(itemLabel)}"
                  data-month="${curMonth}"
                  data-year="${curYear}"
                  checked
                  onchange="PaymentsModule.calculateSelectedInvoiceTotal()">
                <div>
                  <div style="font-weight: 600;">${Utils.escapeHtml(itemLabel)}</div>
                  <div style="font-size: 0.73rem; color: var(--text-muted);">Monthly tuition due</div>
                </div>
              </div>
              <span style="font-weight: 700; color: var(--status-unpaid); font-size: 0.95rem;">${Utils.formatCurrency(feeToCollect)}</span>
            </label>
          `;
        }
      }

      if (outstandingDue <= 0 && pendingInvoices.length === 0 && totalPayableCount === 0) {
        checklistHtml += `
          <div style="background: rgba(16, 185, 129, 0.08); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3); color: var(--status-paid); font-weight: 600; display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem;">
            <i data-lucide="check-circle" style="width: 15px; height: 15px;"></i>
            Fees for ${Utils.escapeHtml(student.name)} are fully settled for ${Utils.formatMonthYear(curMonth, curYear)} (₹0 Due).
          </div>
        `;
      }
    });

    container.innerHTML = checklistHtml || '<div class="text-muted" style="font-size:0.82rem; padding:0.5rem 0;">No pending fees for selected profile(s).</div>';

    PaymentsModule.calculateSelectedInvoiceTotal();
    Utils.renderIcons();
  },

  // Calculate sum of checked checkboxes and update amount input
  calculateSelectedInvoiceTotal: () => {
    const checkboxes = document.querySelectorAll('.payment-item-checkbox:checked');
    let sum = 0;
    checkboxes.forEach(cb => {
      sum += parseFloat(cb.dataset.amount) || 0;
    });

    const amountInput = document.getElementById('payment-amount-input');
    if (amountInput) {
      amountInput.value = sum > 0 ? sum : '';
    }

    const submitBtn = document.getElementById('btn-submit-payment') || document.querySelector('#modal-record-payment button[type="submit"]');
    if (submitBtn) {
      if (sum > 0) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="check" style="width: 15px; height: 15px;"></i> Confirm Payment & Issue Receipt (${Utils.formatCurrency(sum)})`;
      } else {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="shield-alert" style="width: 15px; height: 15px;"></i> Select at least one fee item to pay`;
      }
      Utils.renderIcons();
    }
  },

  // RECORD PAYMENT (Supports Multi-Profile Combining & Category-wise Selective Allocation)
  savePayment: async (e) => {
    e.preventDefault();

    if (PaymentsModule.isSubmittingPayment) return;

    const checkedBoxes = Array.from(document.querySelectorAll('.payment-item-checkbox:checked'));
    const payment_date = document.getElementById('payment-date-input').value;
    const amount = parseFloat(document.getElementById('payment-amount-input').value) || 0;
    const payment_method = document.getElementById('payment-method-select').value;
    const transaction_reference = document.getElementById('payment-ref-input').value.trim() || null;
    const notes = document.getElementById('payment-notes-input').value.trim() || null;

    if (checkedBoxes.length === 0 || amount <= 0) {
      Utils.showToast("Selection Required", "Please select at least one fee category or invoice to settle.", "warning");
      return;
    }

    const itemsByStudent = {};
    checkedBoxes.forEach(cb => {
      const sId = cb.dataset.studentId;
      if (!itemsByStudent[sId]) itemsByStudent[sId] = [];
      itemsByStudent[sId].push({
        studentId: sId,
        studentName: cb.dataset.studentName,
        studentCode: cb.dataset.studentCode,
        type: cb.dataset.type,
        id: cb.dataset.id,
        programmeId: cb.dataset.programmeId,
        grade: cb.dataset.grade,
        amount: parseFloat(cb.dataset.amount) || 0,
        label: cb.dataset.label,
        month: parseInt(cb.dataset.month, 10),
        year: parseInt(cb.dataset.year, 10)
      });
    });

    const studentIds = Object.keys(itemsByStudent);
    if (studentIds.length === 0) {
      Utils.showToast("Error", "No students selected for payment.", "error");
      return;
    }

    PaymentsModule.isSubmittingPayment = true;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing Transaction...";
    }

    try {
      const primaryStudentId = studentIds[0];
      const primaryStudent = (AppState.students || []).find(s => s.id === primaryStudentId);
      const isCombined = studentIds.length > 1;

      const createdPaymentIds = [];
      const consolidatedStudentSummaries = [];

      for (const sId of studentIds) {
        const student = (AppState.students || []).find(s => s.id === sId);
        const sItems = itemsByStudent[sId];
        const studentAmount = sItems.reduce((acc, it) => acc + it.amount, 0);

        if (studentAmount <= 0) continue;

        // Resolve or create invoice for enrollment items
        for (const item of sItems) {
          if (item.type === 'enrollment' || item.type === 'general') {
            const curMonth = item.month;
            const curYear = item.year;
            let existingCycleInv = (student?.invoices || []).find(i => 
              i.billing_month === curMonth && i.billing_year === curYear && i.status !== 'cancelled'
            );

            if (!existingCycleInv && supabaseClient) {
              const invNumber = Utils.getNextInvoiceNumber(student.student_id, curMonth, curYear);
              const defaultDueDay = AppState.institution?.default_due_day || 10;
              const dueDate = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(Math.min(defaultDueDay, 28)).padStart(2, '0')}`;

              try {
                const { data: newInv, error: invErr } = await supabaseClient
                  .from('invoices')
                  .insert([{
                    invoice_number: invNumber,
                    student_id: sId,
                    billing_month: curMonth,
                    billing_year: curYear,
                    invoice_date: payment_date || new Date().toISOString().slice(0, 10),
                    due_date: dueDate,
                    total_amount: item.amount,
                    paid_amount: 0,
                    balance_amount: item.amount,
                    status: 'unpaid',
                    notes: item.label
                  }])
                  .select();

                if (!invErr && newInv && newInv[0]) {
                  existingCycleInv = newInv[0];
                  item.type = 'invoice';
                  item.id = existingCycleInv.id;
                  student.invoices = student.invoices || [];
                  student.invoices.push(existingCycleInv);
                }
              } catch (createErr) {
                console.warn("Auto-invoice generation notice:", createErr);
              }
            } else if (existingCycleInv) {
              item.type = 'invoice';
              item.id = existingCycleInv.id;
            }
          }
        }

        // Insert payment record
        const paymentNumber = `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        let studentPaymentId = null;

        if (supabaseClient) {
          const itemLabels = sItems.map(it => it.label).join('; ');
          const finalNotes = notes ? `${notes} (${itemLabels})` : itemLabels;

          const { data: pmtData, error: pmtErr } = await supabaseClient
            .from('payments')
            .insert([{
              payment_number: paymentNumber,
              student_id: sId,
              payment_date,
              amount: studentAmount,
              payment_method,
              transaction_reference,
              notes: finalNotes,
              status: 'completed',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select();

          if (pmtErr) throw pmtErr;
          studentPaymentId = pmtData[0].id;
          createdPaymentIds.push(studentPaymentId);

          // Update invoices & allocations
          for (const item of sItems) {
            if (item.type === 'invoice' && item.id) {
              const inv = (student.invoices || []).find(i => i.id === item.id);
              const currentPaid = inv ? (parseFloat(inv.paid_amount) || 0) : 0;
              const newPaid = currentPaid + item.amount;
              const total = inv ? (parseFloat(inv.total_amount) || 0) : item.amount;
              const newBalance = Math.max(0, total - newPaid);
              const newStatus = newBalance <= 0 ? 'paid' : (newPaid > 0 ? 'partially_paid' : 'unpaid');

              try {
                await supabaseClient
                  .from('invoices')
                  .update({
                    paid_amount: newPaid,
                    balance_amount: newBalance,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', item.id);
              } catch (_) {}

              try {
                await supabaseClient
                  .from('payment_allocations')
                  .insert([{
                    payment_id: studentPaymentId,
                    invoice_id: item.id,
                    allocated_amount: item.amount,
                    created_at: new Date().toISOString()
                  }]);
              } catch (_) {
                try {
                  await supabaseClient
                    .from('invoice_allocations')
                    .insert([{
                      payment_id: studentPaymentId,
                      invoice_id: item.id,
                      amount: item.amount,
                      created_at: new Date().toISOString()
                    }]);
                } catch (_) {}
              }
            }
          }
        }

        const balAfter = Math.max(0, StudentsModule.calculateOutstandingBalance(student) - studentAmount);
        consolidatedStudentSummaries.push({
          id: sId,
          name: student?.name || sItems[0].studentName,
          student_id: student?.student_id || sItems[0].studentCode,
          parent_name: student?.parent_name || '',
          whatsapp_number: student?.whatsapp_number || '',
          amount_paid: studentAmount,
          remaining_balance: balAfter,
          payment_id: studentPaymentId,
          items: sItems.map(it => ({
            label: it.label,
            amount: it.amount
          }))
        });
      }

      // Generate Single Official Receipt (Consolidated if multiple profiles, or single)
      const receiptNumber = Utils.getNextReceiptNumber();
      const primaryPaymentId = createdPaymentIds[0] || null;
      const totalRemainingBalance = consolidatedStudentSummaries.reduce((sum, s) => sum + s.remaining_balance, 0);

      const receiptPayload = {
        is_combined: isCombined,
        receipt_number: receiptNumber,
        total_amount: amount,
        issue_date: payment_date,
        payment_method: payment_method,
        transaction_reference: transaction_reference,
        primary_student_id: primaryStudentId,
        students: consolidatedStudentSummaries,
        notes: notes
      };

      let receiptId = null;

      if (supabaseClient && primaryPaymentId) {
        try {
          const { data: recData, error: recErr } = await supabaseClient
            .from('receipts')
            .insert([{
              receipt_number: receiptNumber,
              payment_id: primaryPaymentId,
              student_id: primaryStudentId,
              issue_date: payment_date,
              amount_paid: amount,
              remaining_balance: totalRemainingBalance,
              whatsapp_status: 'initiated',
              is_immutable: true,
              receipt_data: receiptPayload,
              created_at: new Date().toISOString()
            }])
            .select();

          if (!recErr && recData && recData[0]) {
            receiptId = recData[0].id;
          }
        } catch (_) {}

        if (!receiptId) {
          try {
            const { data: precData } = await supabaseClient
              .from('payment_receipts')
              .insert([{
                receipt_number: receiptNumber,
                payment_id: primaryPaymentId,
                student_id: primaryStudentId,
                issue_date: payment_date,
                receipt_data: receiptPayload,
                created_at: new Date().toISOString()
              }])
              .select();

            if (precData && precData[0]) {
              receiptId = precData[0].id;
            }
          } catch (_) {}
        }
      }

      await AuthModule.logAudit('record_payment', 'payments', primaryStudentId, {
        amount,
        payment_method,
        is_combined: isCombined,
        profiles_count: studentIds.length
      });

      Utils.closeModal('modal-record-payment');
      Utils.showToast("Payment Recorded", `Payment of ${Utils.formatCurrency(amount)} recorded successfully.`, "success");

      // Reload state across all modules
      await PaymentsModule.loadPayments();
      await StudentsModule.loadStudents();
      await MonthlyFeesModule.loadInvoices();
      if (typeof ReceiptsModule !== 'undefined' && ReceiptsModule.loadReceipts) {
        await ReceiptsModule.loadReceipts();
      }

      PaymentsModule.renderPaymentsTable();
      StudentsModule.renderStudentsTable();
      MonthlyFeesModule.renderMonthlyFeesTable();
      if (typeof ReceiptsModule !== 'undefined' && ReceiptsModule.renderReceiptsTable) {
        ReceiptsModule.renderReceiptsTable();
      }
      if (typeof DashboardModule !== 'undefined' && DashboardModule.updateMetrics) {
        DashboardModule.updateMetrics();
        DashboardModule.renderOutstandingStudentsList();
      }
      if (StudentsModule.currentProfileStudentId) {
        await StudentsModule.viewProfile(StudentsModule.currentProfileStudentId);
      }

      if (receiptId) {
        ReceiptsModule.viewReceipt(receiptId, true);
      }

    } catch (err) {
      console.error("Save payment error:", err);
      Utils.showToast("Error", err.message || "Failed to record payment transaction", "error");
    } finally {
      PaymentsModule.isSubmittingPayment = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Payment & Issue Receipt";
      }
    }
  },
  // Reverse / Void an accidental or incorrect payment
  reversePayment: async (paymentId) => {
    if (!paymentId) return;
    const payment = (AppState.payments || []).find(p => p.id === paymentId);
    const pmtNum = payment ? payment.payment_number : 'this payment';
    const pmtAmount = payment ? Utils.formatCurrency(payment.amount) : '';
    const studentName = payment?.students?.name || 'the student';

    const confirmMsg = `Are you sure you want to REVERSE payment ${pmtNum} (${pmtAmount}) for ${studentName}?\n\n` +
      `This will void the payment, delete the issued receipt, and restore the unpaid balance on the student's account.\n` +
      `Use this if the payment was recorded by mistake.`;

    if (!confirm(confirmMsg)) return;

    try {
      // 1. Fetch allocations for this payment
      const { data: allocations, error: allocErr } = await supabaseClient
        .from('payment_allocations')
        .select('*')
        .eq('payment_id', paymentId);

      if (allocErr) throw allocErr;

      // 2. Restore invoice paid_amount and status for each allocation
      for (const alloc of (allocations || [])) {
        if (!alloc.invoice_id) continue;

        const { data: invData } = await supabaseClient
          .from('invoices')
          .select('*')
          .eq('id', alloc.invoice_id)
          .single();

        if (invData) {
          const currentPaid = parseFloat(invData.paid_amount) || 0;
          const allocAmount = parseFloat(alloc.allocated_amount) || 0;
          const restoredPaid = Math.max(0, currentPaid - allocAmount);
          const totalAmount = parseFloat(invData.total_amount) || 0;
          const restoredStatus = restoredPaid <= 0 ? 'unpaid' : (restoredPaid < totalAmount ? 'partially_paid' : 'paid');

          // Note: PostgreSQL recalculates balance_amount automatically
          await supabaseClient
            .from('invoices')
            .update({
              paid_amount: restoredPaid,
              status: restoredStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', alloc.invoice_id);
        }
      }

      // 3. Delete receipts associated with this payment
      await supabaseClient
        .from('receipts')
        .delete()
        .eq('payment_id', paymentId);

      // 4. Delete payment allocations
      await supabaseClient
        .from('payment_allocations')
        .delete()
        .eq('payment_id', paymentId);

      // 5. Delete payment record
      const { error: pmtDelErr } = await supabaseClient
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (pmtDelErr) throw pmtDelErr;

      // 6. Audit log
      try {
        await AuthModule.logAudit('reverse_payment', 'payments', paymentId, {
          payment_number: pmtNum,
          amount: payment?.amount,
          student_id: payment?.student_id
        });
      } catch (_) {}

      Utils.closeModal('modal-view-receipt');
      Utils.showToast("Payment Reversed", `Payment ${pmtNum} (${pmtAmount}) has been reversed. Invoice balance restored.`, "success");

      // 7. Reload all data
      await PaymentsModule.loadPayments();
      await MonthlyFeesModule.loadInvoices();
      await StudentsModule.loadStudents();
      await ReceiptsModule.loadReceipts();

      // 8. Re-render all views
      PaymentsModule.renderPaymentsTable();
      if (typeof ReceiptsModule !== 'undefined' && ReceiptsModule.renderReceiptsTable) {
        ReceiptsModule.renderReceiptsTable();
      }
      StudentsModule.renderStudentsTable();
      MonthlyFeesModule.renderMonthlyFeesTable();
      if (typeof DashboardModule !== 'undefined' && DashboardModule.updateMetrics) {
        DashboardModule.updateMetrics();
        DashboardModule.renderOutstandingStudentsList();
      }

      // If viewing student profile, re-render it
      if (StudentsModule.currentProfileStudentId) {
        await StudentsModule.viewProfile(StudentsModule.currentProfileStudentId);
      }
    } catch (err) {
      console.error("Payment reversal error:", err);
      Utils.showToast("Error", err.message || "Failed to reverse payment", "error");
    }
  },

  reversePaymentFromReceiptModal: () => {
    const r = ReceiptsModule.currentReceipt;
    const pId = r?.payment_id || r?.payments?.id;
    if (pId) {
      PaymentsModule.reversePayment(pId);
    } else {
      Utils.showToast("Notice", "Payment record not found for this receipt", "warning");
    }
  }
};

window.PaymentsModule = PaymentsModule;
