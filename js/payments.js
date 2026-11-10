/**
 * EDUTRACK FEE COLLECTION & PAYMENTS MODULE
 * Atomic Transaction Recording, Over-allocation Guards & Receipt Generation
 */

const PaymentsModule = {
  currentStudentPendingInvoices: [],
  isSubmittingPayment: false,

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

  // Open the Record Payment Modal
  openRecordPaymentModal: (studentId = null, preselectedInvoiceId = null) => {
    PaymentsModule.isSubmittingPayment = false;
    document.getElementById('payment-date-input').value = new Date().toISOString().slice(0, 10);
    document.getElementById('payment-amount-input').value = '';
    document.getElementById('payment-method-select').value = 'UPI';
    document.getElementById('payment-ref-input').value = '';
    document.getElementById('payment-notes-input').value = '';

    // Populate student select dropdown
    const studentSelect = document.getElementById('payment-student-select');
    studentSelect.innerHTML = '<option value="">-- Choose Student --</option>' + 
      (AppState.students || []).map(s => {
        const bal = StudentsModule.calculateOutstandingBalance(s);
        return `<option value="${s.id}" ${studentId === s.id ? 'selected' : ''}>
          ${Utils.escapeHtml(s.name)} (${Utils.escapeHtml(s.student_id)}) - Due: ${Utils.formatCurrency(bal)}
        </option>`;
      }).join('');

    if (studentId) {
      PaymentsModule.onStudentSelectChange(studentId, preselectedInvoiceId);
    } else {
      document.getElementById('payment-invoices-checklist').innerHTML = `
        <div class="text-muted" style="font-size: 0.82rem; padding: 0.5rem 0;">Please select a student to view outstanding invoices.</div>
      `;
    }

    Utils.openModal('modal-record-payment');
  },

  // When student is selected in Record Payment form
  onStudentSelectChange: (studentId, preselectedInvoiceId = null) => {
    const student = AppState.students.find(s => s.id === studentId);
    const container = document.getElementById('payment-invoices-checklist');
    const submitBtn = document.getElementById('btn-submit-payment') || document.querySelector('#modal-record-payment button[type="submit"]');
    const amountInput = document.getElementById('payment-amount-input');

    if (!student) {
      container.innerHTML = '<div class="text-muted">Please select a student.</div>';
      PaymentsModule.currentStudentPendingInvoices = [];
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="check" style="width: 15px; height: 15px;"></i> Confirm Payment & Issue Receipt';
      }
      return;
    }

    const pendingInvoices = (student.invoices || [])
      .filter(inv => inv.status !== 'cancelled' && (
        inv.status === 'unpaid' ||
        inv.status === 'partially_paid' ||
        (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) > 0
      ))
      .sort((a, b) => (a.billing_year * 100 + a.billing_month) - (b.billing_year * 100 + b.billing_month));

    PaymentsModule.currentStudentPendingInvoices = pendingInvoices;

    const outstandingDue = StudentsModule.calculateOutstandingBalance(student);
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    // Check if this student already has paid for the current month
    const paidThisMonthInv = (student.invoices || []).find(i => 
      i.billing_month === curMonth && i.billing_year === curYear && i.status === 'paid'
    );
    const alreadyPaidThisMonth = !!paidThisMonthInv || (outstandingDue <= 0 && pendingInvoices.length === 0);

    // RULE: Admin should not collect fee from student more than once in the same month
    if (alreadyPaidThisMonth && pendingInvoices.length === 0) {
      container.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem; border: 1px solid rgba(16, 185, 129, 0.35); text-align: center;">
          <div style="color: var(--status-paid); font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
            <i data-lucide="check-circle-2" style="width: 18px; height: 18px;"></i>
            Fee Already Collected
          </div>
          <div style="margin-top: 0.45rem; color: var(--text-main); font-size: 0.85rem;">
            <strong>${Utils.escapeHtml(student.name)}</strong> has already paid tuition fees for <strong>${Utils.formatMonthYear(curMonth, curYear)}</strong>.
          </div>
          <div style="margin-top: 0.35rem; font-size: 0.78rem; color: var(--text-muted);">
            Duplicate fee collection in the same month is not allowed. Outstanding balance: ₹0.
          </div>
        </div>
      `;
      if (amountInput) amountInput.value = '0';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="shield-check" style="width: 15px; height: 15px;"></i> Fee Already Collected (Once Per Month)';
      }
      Utils.renderIcons();
      return;
    }

    // Re-enable submit button if there are pending fees or unpaid invoices
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="check" style="width: 15px; height: 15px;"></i> Confirm Payment & Issue Receipt';
    }

    if (pendingInvoices.length === 0) {
      const monthlyFee = StudentsModule.calculateMonthlyFee(student);
      const feeToCollect = outstandingDue > 0 ? outstandingDue : monthlyFee;

      container.innerHTML = `
        <div style="background: var(--surface-subtle); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.85rem; border: 1px solid var(--border-light);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted);">Current Billing Cycle: ${Utils.formatMonthYear(curMonth, curYear)}</span>
            <span class="badge ${feeToCollect > 0 ? 'badge-unpaid' : 'badge-paid'}">${feeToCollect > 0 ? 'Pending Fee' : 'Settled'}</span>
          </div>
          <div style="margin-top: 0.45rem; color: var(--accent-blue); font-weight: 700; font-size: 1.05rem;">
            Tuition Fee: ${Utils.formatCurrency(feeToCollect)}
          </div>
          <div style="margin-top: 0.25rem; font-size: 0.74rem; color: var(--text-muted);">
            Payment will settle this month's tuition fee and generate an official computer-verified receipt.
          </div>
        </div>
      `;
      if (amountInput) amountInput.value = feeToCollect;
      Utils.renderIcons();
      return;
    }

    container.innerHTML = `
      <div style="font-size: 0.82rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">
        Select Invoices to Settle (${pendingInvoices.length} outstanding):
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.45rem;">
        ${pendingInvoices.map(inv => {
          const tot = parseFloat(inv.total_amount) || 0;
          const pd = parseFloat(inv.paid_amount) || 0;
          const bal = (inv.balance_amount !== undefined && inv.balance_amount !== null)
            ? parseFloat(inv.balance_amount)
            : Math.max(0, tot - pd);
          const currentDue = inv.status === 'paid' ? 0 : Math.max(0, Math.min(bal, tot - pd));

          return `
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; background: var(--surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-light); font-size: 0.85rem; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" class="payment-inv-checkbox" value="${inv.id}" data-balance="${currentDue}" ${preselectedInvoiceId === inv.id || !preselectedInvoiceId ? 'checked' : ''} onchange="PaymentsModule.calculateSelectedInvoiceTotal()">
              <span><strong>${Utils.escapeHtml(inv.invoice_number)}</strong> (${Utils.formatMonthYear(inv.billing_month, inv.billing_year)})</span>
            </div>
            <span style="font-weight: 700; color: ${currentDue > 0 ? 'var(--status-unpaid)' : 'var(--status-paid)'};">${Utils.formatCurrency(currentDue)}</span>
          </label>
        `;
        }).join('')}
      </div>
    `;

    PaymentsModule.calculateSelectedInvoiceTotal();
  },

  calculateSelectedInvoiceTotal: () => {
    const checkboxes = document.querySelectorAll('.payment-inv-checkbox:checked');
    let sum = 0;
    checkboxes.forEach(cb => {
      sum += parseFloat(cb.dataset.balance) || 0;
    });

    const amountInput = document.getElementById('payment-amount-input');
    if (sum > 0) {
      amountInput.value = sum;
    }
  },

  // RECORD PAYMENT (Prevents double clicks, handles over-allocation, and executes atomically)
  savePayment: async (e) => {
    e.preventDefault();

    if (PaymentsModule.isSubmittingPayment) return;

    const studentId = document.getElementById('payment-student-select').value;
    const payment_date = document.getElementById('payment-date-input').value;
    const amount = parseFloat(document.getElementById('payment-amount-input').value) || 0;
    const payment_method = document.getElementById('payment-method-select').value;
    const transaction_reference = document.getElementById('payment-ref-input').value.trim() || null;
    const notes = document.getElementById('payment-notes-input').value.trim() || null;

    if (!studentId || amount <= 0) {
      Utils.showToast("Required", "Please select a student and enter a valid amount", "warning");
      return;
    }

    const student = AppState.students.find(s => s.id === studentId);
    if (!student) {
      Utils.showToast("Error", "Student record not found", "error");
      return;
    }

    let pendingInvoices = (PaymentsModule.currentStudentPendingInvoices && PaymentsModule.currentStudentPendingInvoices.length > 0)
      ? [...PaymentsModule.currentStudentPendingInvoices]
      : (student?.invoices || [])
          .filter(inv => inv.status !== 'cancelled' && (
            inv.status === 'unpaid' ||
            inv.status === 'partially_paid' ||
            (parseFloat(inv.total_amount) - parseFloat(inv.paid_amount || 0)) > 0
          ))
          .sort((a, b) => (a.billing_year * 100 + a.billing_month) - (b.billing_year * 100 + b.billing_month));

    // RULE: Admin should not collect fee from student more than once in the same month
    const now = new Date();
    const pDate = payment_date ? new Date(payment_date) : now;
    const curMonth = pDate.getMonth() + 1;
    const curYear = pDate.getFullYear();
    const outstandingBalance = StudentsModule.calculateOutstandingBalance(student);
    const paidThisMonthInv = (student?.invoices || []).find(i => 
      i.billing_month === curMonth && i.billing_year === curYear && i.status === 'paid'
    );

    if ((paidThisMonthInv || outstandingBalance <= 0) && pendingInvoices.length === 0) {
      Utils.showToast("Fee Already Collected", `Tuition fee for ${Utils.formatMonthYear(curMonth, curYear)} has already been collected for ${student.name}. Duplicate fee collection in the same month is not allowed.`, "warning", 6000);
      return;
    }

    // Over-allocation check
    const totalOutstanding = pendingInvoices.reduce((sum, inv) => {
      const tot = parseFloat(inv.total_amount) || 0;
      const pd = parseFloat(inv.paid_amount) || 0;
      return sum + Math.max(0, tot - pd);
    }, 0);

    if (totalOutstanding > 0 && amount > totalOutstanding) {
      const proceed = confirm(
        `Amount received (₹${amount}) exceeds total selected outstanding dues (₹${totalOutstanding}).\n\n` +
        `Only ₹${totalOutstanding} will be allocated to invoices. Do you want to proceed?`
      );
      if (!proceed) return;
    }

    PaymentsModule.isSubmittingPayment = true;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing Transaction...";
    }

    try {
      // 1. Auto-create monthly invoice if student has no open invoices in DB yet
      if (pendingInvoices.length === 0 && supabaseClient) {
        const now = new Date();
        const pDate = payment_date ? new Date(payment_date) : now;
        const curMonth = pDate.getMonth() + 1;
        const curYear = pDate.getFullYear();
        const monthlyFee = StudentsModule.calculateMonthlyFee(student);
        const invTotal = Math.max(amount, monthlyFee);

        let existingCycleInv = (student?.invoices || []).find(i => 
          i.billing_month === curMonth && i.billing_year === curYear && i.status !== 'cancelled'
        );

        if (!existingCycleInv) {
          const invNumber = Utils.getNextInvoiceNumber(student.student_id, curMonth, curYear);
          const defaultDueDay = AppState.institution?.default_due_day || 10;
          const dueDate = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(Math.min(defaultDueDay, 28)).padStart(2, '0')}`;

          try {
            const { data: newInv, error: invErr } = await supabaseClient
              .from('invoices')
              .insert([{
                invoice_number: invNumber,
                student_id: studentId,
                billing_month: curMonth,
                billing_year: curYear,
                invoice_date: payment_date || now.toISOString().slice(0, 10),
                due_date: dueDate,
                total_amount: invTotal,
                paid_amount: 0,
                balance_amount: invTotal,
                status: 'unpaid',
                notes: `Tuition fee invoice for ${Utils.formatMonthYear(curMonth, curYear)}`
              }])
              .select();

            if (!invErr && newInv && newInv[0]) {
              existingCycleInv = newInv[0];
              const activeEnrollments = (student.enrollments || []).filter(e => e.status === 'active');
              if (activeEnrollments.length > 0) {
                const items = activeEnrollments.map(e => ({
                  invoice_id: existingCycleInv.id,
                  enrollment_id: e.id,
                  programme_id: e.programme_id,
                  class_or_grade: e.class_or_grade,
                  description: `${e.programmes?.name || 'Tuition'} (${e.class_or_grade})`,
                  amount: e.agreed_fee
                }));
                try { await supabaseClient.from('invoice_items').insert(items); } catch (_) {}
              }
              pendingInvoices.push(existingCycleInv);
            }
          } catch (createErr) {
            console.warn("Auto-invoice generation notice:", createErr);
          }
        } else {
          pendingInvoices.push(existingCycleInv);
        }
      }

      // Build invoice allocations payload
      let remainingToAllocate = amount;
      const allocations = [];

      for (const inv of pendingInvoices) {
        if (remainingToAllocate <= 0) break;
        const tot = parseFloat(inv.total_amount) || 0;
        const pd = parseFloat(inv.paid_amount) || 0;
        const bal = (inv.balance_amount !== undefined && inv.balance_amount !== null)
          ? parseFloat(inv.balance_amount)
          : Math.max(0, tot - pd);
        const due = Math.max(0, Math.min(bal, tot - pd));
        const alloc = due > 0 ? Math.min(due, remainingToAllocate) : remainingToAllocate;

        if (alloc > 0) {
          allocations.push({
            invoice_id: inv.id,
            amount: alloc
          });
          remainingToAllocate -= alloc;
        }
      }

      let receiptId = null;
      let rpcSucceeded = false;

      // 1. Try atomic RPC first
      if (allocations.length > 0) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabaseClient.rpc('record_payment_transaction', {
            p_student_id: studentId,
            p_payment_date: payment_date,
            p_amount: amount,
            p_payment_method: payment_method,
            p_transaction_reference: transaction_reference,
            p_notes: notes,
            p_invoice_allocations: allocations
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            rpcSucceeded = true;
            receiptId = rpcRes.receipt_id;
          }
        } catch (rpcEx) {
          rpcSucceeded = false;
        }
      }

      // 2. Fallback to client transactional execution
      if (!rpcSucceeded) {
        const paymentNumber = `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

        const { data: pmtData, error: pmtErr } = await supabaseClient
          .from('payments')
          .insert([{
            payment_number: paymentNumber,
            student_id: studentId,
            payment_date,
            amount,
            payment_method,
            transaction_reference,
            notes,
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();

        if (pmtErr) throw pmtErr;
        const paymentId = pmtData[0].id;

        // Apply allocations & update invoices
        for (const alloc of allocations) {
          const inv = pendingInvoices.find(i => i.id === alloc.invoice_id);
          if (inv) {
            const currentPaid = parseFloat(inv.paid_amount) || 0;
            const newPaid = currentPaid + alloc.amount;
            const total = parseFloat(inv.total_amount) || 0;
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
                .eq('id', inv.id);
            } catch (_) {
              await supabaseClient
                .from('invoices')
                .update({
                  paid_amount: newPaid,
                  status: newStatus,
                  updated_at: new Date().toISOString()
                })
                .eq('id', inv.id);
            }

            try {
              await supabaseClient
                .from('payment_allocations')
                .insert([{
                  payment_id: paymentId,
                  invoice_id: inv.id,
                  allocated_amount: alloc.amount,
                  created_at: new Date().toISOString()
                }]);
            } catch (pAllocErr) {
              console.warn("Payment allocation record error:", pAllocErr);
            }
          }
        }

        // Issue official receipt
        const receiptNumber = Utils.getNextReceiptNumber();
        const currentBal = StudentsModule.calculateOutstandingBalance(student);
        const newRemainingBalance = Math.max(0, currentBal - amount);

        const { data: recData, error: recErr } = await supabaseClient
          .from('receipts')
          .insert([{
            receipt_number: receiptNumber,
            payment_id: paymentId,
            student_id: studentId,
            issue_date: payment_date,
            amount_paid: amount,
            remaining_balance: newRemainingBalance,
            whatsapp_status: 'initiated',
            is_immutable: true,
            created_at: new Date().toISOString()
          }])
          .select();

        if (recErr) throw recErr;
        receiptId = recData[0].id;
      }

      await AuthModule.logAudit('record_payment', 'payments', studentId, { amount, payment_method });

      Utils.closeModal('modal-record-payment');
      Utils.showToast("Payment Recorded", `Payment of ₹${amount} recorded successfully.`, "success");

      // Reload state across all modules
      await PaymentsModule.loadPayments();
      await StudentsModule.loadStudents();
      await MonthlyFeesModule.loadInvoices();
      if (typeof ReceiptsModule !== 'undefined' && ReceiptsModule.loadReceipts) {
        await ReceiptsModule.loadReceipts();
      }

      // Re-render ALL views so balances, badges and tables update instantly
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

      // Immediately display receipt with one-click WhatsApp action
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
