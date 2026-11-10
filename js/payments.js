/**
 * EDUTRACK FEE COLLECTION & PAYMENTS MODULE
 * Record Money Received, Payment Allocation, Ledger Updating & Receipt Triggering
 */

const PaymentsModule = {
  currentStudentPendingInvoices: [],

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

  // Render Payments Table on Fee Collection Page
  renderPaymentsTable: () => {
    const tbody = document.getElementById('payments-table-body');
    if (!tbody) return;

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
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 3rem 1rem;">
            <div class="empty-state">
              <i data-lucide="receipt" class="empty-state-icon"></i>
              <div class="empty-state-title">No payments found</div>
              <div class="empty-state-text">Click "Record Payment" to record tuition fees received.</div>
            </div>
          </td>
        </tr>`;
      Utils.renderIcons();
      return;
    }

    tbody.innerHTML = list.map(p => {
      const student = p.students;
      const receipt = p.receipts && p.receipts.length > 0 ? p.receipts[0] : null;

      return `
        <tr>
          <td>
            <strong>${Utils.escapeHtml(p.payment_number)}</strong>
          </td>
          <td>
            <div style="font-weight: 600;">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${Utils.escapeHtml(student?.student_id || '')}</div>
          </td>
          <td>
            ${Utils.formatDate(p.payment_date)}
          </td>
          <td>
            <strong style="color: var(--success); font-size: 1rem;">
              ${Utils.formatCurrency(p.amount)}
            </strong>
          </td>
          <td>
            <span class="badge badge-neutral">${Utils.escapeHtml(p.payment_method)}</span>
            ${p.transaction_reference ? `<div style="font-size: 0.72rem; color: var(--text-muted);">Ref: ${Utils.escapeHtml(p.transaction_reference)}</div>` : ''}
          </td>
          <td>
            ${receipt ? `
              <span class="badge badge-info">
                ${Utils.escapeHtml(receipt.receipt_number)}
              </span>
            ` : '—'}
          </td>
          <td class="actions-cell">
            ${receipt ? `
              <button class="btn btn-secondary btn-sm" onclick="ReceiptsModule.viewReceipt('${receipt.id}')" title="View & Print Receipt">
                <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Receipt
              </button>
              <button class="btn btn-success btn-sm" onclick="ReceiptsModule.shareViaWhatsApp('${receipt.id}')" title="Share Receipt on WhatsApp">
                <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    Utils.renderIcons();
  },

  // Open the Record Payment Modal
  openRecordPaymentModal: (studentId = null, preselectedInvoiceId = null) => {
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
          ${Utils.escapeHtml(s.name)} (${Utils.escapeHtml(s.student_id)}) - Outstanding: ${Utils.formatCurrency(bal)}
        </option>`;
      }).join('');

    if (studentId) {
      PaymentsModule.onStudentSelectChange(studentId, preselectedInvoiceId);
    } else {
      document.getElementById('payment-invoices-checklist').innerHTML = `
        <div class="text-muted" style="font-size: 0.85rem; padding: 0.5rem 0;">Please select a student to see outstanding invoices.</div>
      `;
    }

    Utils.openModal('modal-record-payment');
  },

  // Triggered when student is selected in Record Payment modal
  onStudentSelectChange: (studentId, preselectedInvoiceId = null) => {
    const student = AppState.students.find(s => s.id === studentId);
    const container = document.getElementById('payment-invoices-checklist');

    if (!student) {
      container.innerHTML = '<div class="text-muted">Please select a student.</div>';
      PaymentsModule.currentStudentPendingInvoices = [];
      return;
    }

    // Filter unpaid or partially paid invoices
    const pendingInvoices = (student.invoices || [])
      .filter(inv => inv.status !== 'cancelled' && (parseFloat(inv.balance_amount) > 0 || inv.status === 'unpaid'))
      .sort((a, b) => (a.billing_year * 100 + a.billing_month) - (b.billing_year * 100 + b.billing_month));

    PaymentsModule.currentStudentPendingInvoices = pendingInvoices;

    if (pendingInvoices.length === 0) {
      const monthlyFee = StudentsModule.calculateMonthlyFee(student);
      container.innerHTML = `
        <div style="background: var(--surface-alt); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.85rem;">
          <div style="color: var(--text-muted);">No open monthly invoices found for ${Utils.escapeHtml(student.name)}.</div>
          <div style="margin-top: 0.35rem; color: var(--accent); font-weight: 600;">
            Combined Monthly Fee: ${Utils.formatCurrency(monthlyFee)}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
            An invoice will be generated automatically for this payment if recorded now.
          </div>
        </div>
      `;
      // Pre-fill monthly fee as default payment amount
      document.getElementById('payment-amount-input').value = monthlyFee;
      return;
    }

    container.innerHTML = `
      <div style="font-size: 0.82rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">
        Outstanding Invoices (${pendingInvoices.length}):
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.45rem;">
        ${pendingInvoices.map(inv => `
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--surface-alt); border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" class="payment-inv-checkbox" value="${inv.id}" data-balance="${inv.balance_amount}" ${preselectedInvoiceId === inv.id || !preselectedInvoiceId ? 'checked' : ''} onchange="PaymentsModule.calculateSelectedInvoiceTotal()">
              <span><strong>${Utils.escapeHtml(inv.invoice_number)}</strong> (${Utils.formatMonthYear(inv.billing_month, inv.billing_year)})</span>
            </div>
            <span style="font-weight: 700; color: var(--danger);">${Utils.formatCurrency(inv.balance_amount)}</span>
          </label>
        `).join('')}
      </div>
    `;

    PaymentsModule.calculateSelectedInvoiceTotal();
  },

  // Calculate total from checked invoices to prefill payment amount
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

  // Record Payment Transactionally
  savePayment: async (e) => {
    e.preventDefault();

    const studentId = document.getElementById('payment-student-select').value;
    const payment_date = document.getElementById('payment-date-input').value;
    const amount = parseFloat(document.getElementById('payment-amount-input').value) || 0;
    const payment_method = document.getElementById('payment-method-select').value;
    const transaction_reference = document.getElementById('payment-ref-input').value.trim() || null;
    const notes = document.getElementById('payment-notes-input').value.trim() || null;

    if (!studentId || amount <= 0) {
      Utils.showToast("Validation Error", "Please select a student and enter a valid payment amount", "warning");
      return;
    }

    try {
      const student = AppState.students.find(s => s.id === studentId);
      const paymentNumber = `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Insert Payment Record
      const paymentPayload = {
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
      };

      const { data: pmtData, error: pmtErr } = await supabaseClient
        .from('payments')
        .insert([paymentPayload])
        .select();

      if (pmtErr) throw pmtErr;
      const paymentId = pmtData[0].id;

      // 2. Allocate payment across pending invoices
      let remainingToAllocate = amount;
      const pendingInvoices = PaymentsModule.currentStudentPendingInvoices.length > 0
        ? PaymentsModule.currentStudentPendingInvoices
        : (student?.invoices || []).filter(inv => inv.balance_amount > 0);

      // If no open invoice, create one for current month
      if (pendingInvoices.length === 0) {
        const now = new Date();
        const curMonth = now.getMonth() + 1;
        const curYear = now.getFullYear();
        const monthlyFee = StudentsModule.calculateMonthlyFee(student) || amount;

        const invPayload = {
          invoice_number: Utils.getNextInvoiceNumber(student?.student_id, curMonth, curYear),
          student_id: studentId,
          billing_month: curMonth,
          billing_year: curYear,
          invoice_date: payment_date,
          due_date: `${curYear}-${String(curMonth).padStart(2, '0')}-10`,
          total_amount: monthlyFee,
          paid_amount: 0,
          balance_amount: monthlyFee,
          status: 'unpaid'
        };

        const { data: newInv } = await supabaseClient.from('invoices').insert([invPayload]).select();
        if (newInv && newInv[0]) {
          pendingInvoices.push(newInv[0]);
        }
      }

      for (const inv of pendingInvoices) {
        if (remainingToAllocate <= 0) break;

        const balance = parseFloat(inv.balance_amount) || 0;
        const alloc = Math.min(balance, remainingToAllocate);

        const newPaid = (parseFloat(inv.paid_amount) || 0) + alloc;
        const newBalance = Math.max(0, (parseFloat(inv.total_amount) || 0) - newPaid);
        const newStatus = newBalance <= 0 ? 'paid' : (newPaid > 0 ? 'partially_paid' : 'unpaid');

        // Update invoice balance
        await supabaseClient
          .from('invoices')
          .update({
            paid_amount: newPaid,
            balance_amount: newBalance,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', inv.id);

        // Record allocation
        await supabaseClient
          .from('payment_allocations')
          .insert([{
            payment_id: paymentId,
            invoice_id: inv.id,
            allocated_amount: alloc,
            created_at: new Date().toISOString()
          }]);

        remainingToAllocate -= alloc;
      }

      // 3. Generate Receipt record
      const receiptNumber = Utils.getNextReceiptNumber();
      const newRemainingBalance = Math.max(0, StudentsModule.calculateOutstandingBalance(student) - amount);

      const receiptPayload = {
        receipt_number: receiptNumber,
        payment_id: paymentId,
        student_id: studentId,
        issue_date: payment_date,
        amount_paid: amount,
        remaining_balance: newRemainingBalance,
        whatsapp_status: 'initiated',
        is_immutable: true,
        created_at: new Date().toISOString()
      };

      const { data: recData, error: recErr } = await supabaseClient
        .from('receipts')
        .insert([receiptPayload])
        .select();

      if (recErr) throw recErr;
      const receiptId = recData[0].id;

      await AuthModule.logAudit('record_payment', 'payments', paymentId, { amount, receiptNumber });

      Utils.closeModal('modal-record-payment');
      Utils.showToast("Payment Recorded", `Payment of ₹${amount} recorded. Receipt #${receiptNumber} generated.`, "success");

      // Reload state
      await PaymentsModule.loadPayments();
      await StudentsModule.loadStudents();
      await MonthlyFeesModule.loadInvoices();

      PaymentsModule.renderPaymentsTable();

      // Immediately open receipt view modal
      ReceiptsModule.viewReceipt(receiptId);

    } catch (err) {
      console.error("Save payment error:", err);
      Utils.showToast("Error", err.message || "Failed to record payment", "error");
    }
  }
};

window.PaymentsModule = PaymentsModule;
