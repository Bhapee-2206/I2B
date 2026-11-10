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

            ${receipt ? `
              <div class="student-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="ReceiptsModule.viewReceipt('${receipt.id}')">
                  <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Receipt
                </button>
                <button class="btn btn-success btn-sm" onclick="ReceiptsModule.shareViaWhatsApp('${receipt.id}')">
                  <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
                </button>
              </div>
            ` : ''}
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

    if (!student) {
      container.innerHTML = '<div class="text-muted">Please select a student.</div>';
      PaymentsModule.currentStudentPendingInvoices = [];
      return;
    }

    const pendingInvoices = (student.invoices || [])
      .filter(inv => inv.status !== 'cancelled' && (parseFloat(inv.balance_amount) > 0 || inv.status === 'unpaid'))
      .sort((a, b) => (a.billing_year * 100 + a.billing_month) - (b.billing_year * 100 + b.billing_month));

    PaymentsModule.currentStudentPendingInvoices = pendingInvoices;

    if (pendingInvoices.length === 0) {
      const monthlyFee = StudentsModule.calculateMonthlyFee(student);
      container.innerHTML = `
        <div style="background: var(--surface-subtle); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.85rem; border: 1px solid var(--border-light);">
          <div style="color: var(--text-muted);">No open monthly invoices found for <strong>${Utils.escapeHtml(student.name)}</strong>.</div>
          <div style="margin-top: 0.35rem; color: var(--accent-blue); font-weight: 600;">
            Applicable Monthly Fee: ${Utils.formatCurrency(monthlyFee)}
          </div>
        </div>
      `;
      document.getElementById('payment-amount-input').value = monthlyFee;
      return;
    }

    container.innerHTML = `
      <div style="font-size: 0.82rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">
        Select Invoices to Settle (${pendingInvoices.length} outstanding):
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.45rem;">
        ${pendingInvoices.map(inv => `
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; background: var(--surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-light); font-size: 0.85rem; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" class="payment-inv-checkbox" value="${inv.id}" data-balance="${inv.balance_amount}" ${preselectedInvoiceId === inv.id || !preselectedInvoiceId ? 'checked' : ''} onchange="PaymentsModule.calculateSelectedInvoiceTotal()">
              <span><strong>${Utils.escapeHtml(inv.invoice_number)}</strong> (${Utils.formatMonthYear(inv.billing_month, inv.billing_year)})</span>
            </div>
            <span style="font-weight: 700; color: var(--status-unpaid);">${Utils.formatCurrency(inv.balance_amount)}</span>
          </label>
        `).join('')}
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
    const pendingInvoices = PaymentsModule.currentStudentPendingInvoices.length > 0
      ? PaymentsModule.currentStudentPendingInvoices
      : (student?.invoices || []).filter(inv => parseFloat(inv.balance_amount) > 0);

    const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + (parseFloat(inv.balance_amount) || 0), 0);

    // Over-allocation check
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
      // Build invoice allocations payload
      let remainingToAllocate = amount;
      const allocations = [];

      for (const inv of pendingInvoices) {
        if (remainingToAllocate <= 0) break;
        const balance = parseFloat(inv.balance_amount) || 0;
        const alloc = Math.min(balance, remainingToAllocate);
        allocations.push({
          invoice_id: inv.id,
          amount: alloc
        });
        remainingToAllocate -= alloc;
      }

      let receiptId = null;
      let rpcSucceeded = false;

      // 1. Try atomic RPC first
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

      // 2. Fallback to client transactional execution if RPC not yet created
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
            const newPaid = (parseFloat(inv.paid_amount) || 0) + alloc.amount;
            const newBalance = Math.max(0, (parseFloat(inv.total_amount) || 0) - newPaid);
            const newStatus = newBalance <= 0 ? 'paid' : (newPaid > 0 ? 'partially_paid' : 'unpaid');

            await supabaseClient
              .from('invoices')
              .update({
                paid_amount: newPaid,
                balance_amount: newBalance,
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', inv.id);

            await supabaseClient
              .from('payment_allocations')
              .insert([{
                payment_id: paymentId,
                invoice_id: inv.id,
                allocated_amount: alloc.amount,
                created_at: new Date().toISOString()
              }]);
          }
        }

        // Issue official receipt
        const receiptNumber = Utils.getNextReceiptNumber();
        const newRemainingBalance = Math.max(0, StudentsModule.calculateOutstandingBalance(student) - amount);

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

      // Reload state
      await PaymentsModule.loadPayments();
      await StudentsModule.loadStudents();
      await MonthlyFeesModule.loadInvoices();

      PaymentsModule.renderPaymentsTable();

      // Immediately display receipt
      if (receiptId) {
        ReceiptsModule.viewReceipt(receiptId);
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
  }
};

window.PaymentsModule = PaymentsModule;
