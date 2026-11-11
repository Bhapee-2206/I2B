/**
 * EDUTRACK RECEIPTS & WHATSAPP INTEGRATION MODULE
 * jsPDF Client-Side Receipt Generator, Print & WhatsApp Click-to-Chat
 */

const ReceiptsModule = {
  currentReceipt: null,

  init: async () => {
    await ReceiptsModule.loadReceipts();
  },

  // Load all receipts
  loadReceipts: async () => {
    try {
      if (!supabaseClient) return [];
      const { data, error } = await supabaseClient
        .from('receipts')
        .select(`
          *,
          students (*),
          payments (
            *,
            payment_allocations (
              *,
              invoices (*)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      AppState.receipts = data || [];
      return AppState.receipts;
    } catch (err) {
      console.error("Error loading receipts:", err);
      Utils.showToast("Error", "Failed to load receipts", "error");
      return [];
    }
  },

  // Render Receipts (Desktop Table & Mobile Cards)
  renderReceiptsTable: () => {
    const tbody = document.getElementById('receipts-table-body');
    const mobileContainer = document.getElementById('receipts-mobile-cards-list');
    if (!tbody && !mobileContainer) return;

    const searchTerm = (document.getElementById('receipt-search-input')?.value || '').trim().toLowerCase();
    let list = AppState.receipts || [];

    if (searchTerm) {
      list = list.filter(r => 
        (r.receipt_number && r.receipt_number.toLowerCase().includes(searchTerm)) ||
        (r.students?.name && r.students.name.toLowerCase().includes(searchTerm)) ||
        (r.students?.student_id && r.students.student_id.toLowerCase().includes(searchTerm))
      );
    }

    if (list.length === 0) {
      const emptyHtml = `
        <div class="empty-state">
          <i data-lucide="file-check" class="empty-state-icon"></i>
          <div class="empty-state-title">No receipts found</div>
          <div class="empty-state-text">Receipts are generated automatically whenever you record a tuition payment.</div>
        </div>`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center">${emptyHtml}</td></tr>`;
      if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
      Utils.renderIcons();
      return;
    }

    // 1. Desktop Table
    if (tbody) {
      tbody.innerHTML = list.map(r => {
        const student = r.students;
        const payment = r.payments;

        return `
          <tr>
            <td><strong>${Utils.escapeHtml(r.receipt_number)}</strong></td>
            <td>${Utils.formatDate(r.issue_date)}</td>
            <td>
              <div style="font-weight: 600;">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${Utils.escapeHtml(student?.student_id || '')}</div>
            </td>
            <td><strong style="color: var(--status-paid); font-size: 0.95rem;">${Utils.formatCurrency(r.amount_paid)}</strong></td>
            <td><span class="badge badge-neutral">${Utils.escapeHtml(payment?.payment_method || 'Cash')}</span></td>
            <td>
              <span style="font-weight: 600; color: ${r.remaining_balance > 0 ? 'var(--status-unpaid)' : 'var(--status-paid)'};">
                ${Utils.formatCurrency(r.remaining_balance)}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn btn-secondary btn-sm" onclick="ReceiptsModule.viewReceipt('${r.id}')" title="View & Download">
                <i data-lucide="eye" style="width: 14px; height: 14px;"></i> View
              </button>
              <button class="btn btn-success btn-sm" onclick="ReceiptsModule.shareViaWhatsApp('${r.id}')" title="Share via WhatsApp">
                <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Mobile Cards
    if (mobileContainer) {
      mobileContainer.innerHTML = list.map(r => {
        const student = r.students;
        const payment = r.payments;

        return `
          <div class="student-mobile-card">
            <div class="student-card-top">
              <div>
                <div class="student-card-name">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
                <div class="student-card-parent">${Utils.escapeHtml(r.receipt_number)} • ${Utils.formatDate(r.issue_date)}</div>
              </div>
              <strong style="color: var(--status-paid); font-size: 1.1rem;">${Utils.formatCurrency(r.amount_paid)}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
              <span>Mode: <strong>${Utils.escapeHtml(payment?.payment_method || 'Cash')}</strong></span>
              <span>Pending: <strong style="color: ${r.remaining_balance > 0 ? 'var(--status-unpaid)' : 'var(--status-paid)'};">${Utils.formatCurrency(r.remaining_balance)}</strong></span>
            </div>

            <div class="student-card-actions">
              <button class="btn btn-secondary btn-sm" onclick="ReceiptsModule.viewReceipt('${r.id}')">
                <i data-lucide="eye" style="width: 14px; height: 14px;"></i> View Receipt
              </button>
              <button class="btn btn-success btn-sm" onclick="ReceiptsModule.shareViaWhatsApp('${r.id}')">
                <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    Utils.renderIcons();
  },

  // View Receipt Modal
  viewReceipt: async (receiptId, isNewPayment = false) => {
    let r = (AppState.receipts || []).find(item => item.id === receiptId);
    if (!r) {
      await ReceiptsModule.loadReceipts();
      r = (AppState.receipts || []).find(item => item.id === receiptId);
    }
    if (!r && supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('receipts')
          .select(`*, students (*), payments (*, payment_allocations (*, invoices (*)))`)
          .eq('id', receiptId)
          .single();
        r = data;
      } catch (_) {}
    }
    if (!r) return;

    ReceiptsModule.currentReceipt = r;
    const s = r.students;
    const p = r.payments;
    const inst = AppState.institution;
    const rData = r.receipt_data || {};

    document.getElementById('receipt-view-number').textContent = r.receipt_number;
    document.getElementById('receipt-view-date').textContent = Utils.formatDate(r.issue_date);
    document.getElementById('receipt-view-student-name').textContent = s?.name || rData.student_name || '—';
    document.getElementById('receipt-view-student-id').textContent = s?.student_id || rData.student_code || '—';
    document.getElementById('receipt-view-parent-name').textContent = s?.parent_name || '—';
    document.getElementById('receipt-view-phone').textContent = s?.whatsapp_number || '—';

    document.getElementById('receipt-view-amount-paid').textContent = Utils.formatCurrency(r.amount_paid);
    document.getElementById('receipt-view-method').textContent = p?.payment_method || rData.payment_method || 'UPI';
    document.getElementById('receipt-view-ref').textContent = p?.transaction_reference || rData.transaction_reference || 'None';
    document.getElementById('receipt-view-balance').textContent = Utils.formatCurrency(r.remaining_balance);

    document.getElementById('receipt-institution-name').textContent = inst?.institution_name || 'I2B Educational Institution';
    document.getElementById('receipt-institution-address').textContent = inst?.address || 'Contact: +91 6385577966 / +91 9345999260 • i2btutioncentre@gmail.com';
    document.getElementById('receipt-footer-text').textContent = inst?.receipt_footer || 'Thank you for your prompt payment! This is an official computer-generated receipt.';

    // Render Itemized Breakdown if items exist
    const itemsContainer = document.getElementById('receipt-items-table-container');
    if (itemsContainer) {
      if (rData.items && rData.items.length > 0) {
        const rowsHtml = rData.items.map((it, idx) => `
          <tr style="border-bottom: 1px solid var(--border-light);">
            <td style="padding: 0.45rem 0.5rem; color: var(--text-muted); width: 25px;">${idx + 1}</td>
            <td style="padding: 0.45rem 0.5rem;">${Utils.escapeHtml(it.label)}</td>
            <td style="padding: 0.45rem 0.5rem; text-align: right; font-weight: 700; color: var(--text-main);">${Utils.formatCurrency(it.amount)}</td>
          </tr>
        `).join('');

        itemsContainer.innerHTML = `
          <div style="margin-bottom: 1rem; border: 1px solid var(--border-light); border-radius: var(--radius-sm); overflow: hidden;">
            <div style="background: var(--surface-subtle); padding: 0.45rem 0.75rem; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Fee Settlement Details
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      } else {
        itemsContainer.innerHTML = '';
      }
    }

    const banner = document.getElementById('receipt-success-banner');
    if (banner) {
      banner.style.display = isNewPayment ? 'flex' : 'none';
    }

    Utils.openModal('modal-view-receipt');
    Utils.renderIcons();
  },

  // Generate jsPDF instance and File object for a receipt
  createReceiptPDF: (r) => {
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
    const s = r.students;
    const p = r.payments;
    const rData = r.receipt_data || {};

    // Header Banner (Navy #0f172a)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 148, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(inst?.institution_name || "I2B EDUCATIONAL INSTITUTION", 14, 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(inst?.subtitle || "Student & Monthly Fee Management", 14, 17);
    const phone = inst?.contact_phone || '+91 6385577966 / +91 9345999260';
    const email = inst?.contact_email || 'i2btutioncentre@gmail.com';
    doc.text(`Phone: ${phone} | Email: ${email}`, 14, 22);

    // Receipt Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 32, 120, 13, 2, 2, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text("OFFICIAL PAYMENT RECEIPT", 18, 40);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${r.receipt_number}`, 78, 38);
    doc.text(`Date: ${Utils.formatDate(r.issue_date)}`, 78, 43);

    // Student Info
    doc.setFontSize(9);
    doc.text("Student ID:", 14, 53);
    doc.setFont('helvetica', 'bold');
    doc.text(`${s?.student_id || rData.student_code || '—'}`, 40, 53);

    doc.setFont('helvetica', 'normal');
    doc.text("Student Name:", 14, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(`${s?.name || rData.student_name || '—'}`, 40, 60);

    doc.setFont('helvetica', 'normal');
    doc.text("Parent Name:", 14, 67);
    doc.text(`${s?.parent_name || '—'}`, 40, 67);

    doc.text("WhatsApp Phone:", 14, 74);
    doc.text(`${s?.whatsapp_number || '—'}`, 40, 74);

    // Line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 80, 134, 80);

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("Description", 14, 88);
    doc.text("Payment Mode", 70, 88);
    doc.text("Amount Received", 106, 88);

    doc.setFont('helvetica', 'normal');
    const descText = (rData.items && rData.items.length > 0)
      ? rData.items.map(it => it.label).join(', ')
      : "Tuition Fee Collection";
    doc.text(descText.substring(0, 32), 14, 96);
    doc.text(`${p?.payment_method || rData.payment_method || 'Cash'}${p?.transaction_reference ? ' (' + p.transaction_reference + ')' : ''}`, 70, 96);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`INR ${(r.amount_paid || 0).toLocaleString('en-IN')}`, 106, 96);

    // Line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 104, 134, 104);

    // Financial Summary
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text("Total Paid This Transaction:", 55, 113);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${(r.amount_paid || 0).toLocaleString('en-IN')}`, 110, 113);

    doc.setFont('helvetica', 'normal');
    doc.text("Remaining Balance Pending:", 55, 120);
    doc.setFont('helvetica', 'bold');
    const bal = r.remaining_balance || 0;
    doc.setTextColor(bal > 0 ? 239 : 16, bal > 0 ? 68 : 185, bal > 0 ? 68 : 129);
    doc.text(`INR ${bal.toLocaleString('en-IN')}`, 110, 120);

    // Footer
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.text(inst?.receipt_footer || "This is an official computer generated receipt. Thank you for your payment!", 14, 138);

    // Signatory
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text("Authorized Signatory", 100, 153);
    doc.line(95, 148, 134, 148);

    const filename = `Receipt_${r.receipt_number}.pdf`;
    const blob = doc.output('blob');
    let file = null;
    try {
      file = new File([blob], filename, { type: 'application/pdf' });
    } catch (_) {}

    return { doc, blob, file, filename };
  },

  // Download PDF using jsPDF
  downloadPDF: () => {
    const r = ReceiptsModule.currentReceipt;
    if (!r) return;

    try {
      const pdfData = ReceiptsModule.createReceiptPDF(r);
      pdfData.doc.save(pdfData.filename);
      Utils.showToast("Receipt Downloaded", `Receipt ${r.receipt_number} saved as PDF`, "success");
    } catch (e) {
      console.error("PDF generation error:", e);
      Utils.showToast("Notice", "Failed to generate PDF. You can use Print instead.", "warning");
    }
  },

  // Print Receipt directly
  printReceipt: () => {
    window.print();
  },

  // Direct WhatsApp Receipt Sharing
  shareViaWhatsApp: async (receiptId = null) => {
    let r = ReceiptsModule.currentReceipt;
    if (receiptId && (!r || r.id !== receiptId)) {
      r = (AppState.receipts || []).find(item => item.id === receiptId);
      if (!r && supabaseClient) {
        try {
          const { data } = await supabaseClient
            .from('receipts')
            .select(`*, students (*), payments (*, payment_allocations (*, invoices (*)))`)
            .eq('id', receiptId)
            .single();
          r = data;
        } catch (_) {}
      }
    }

    if (!r) {
      Utils.showToast("Notice", "Receipt record not found", "warning");
      return;
    }

    ReceiptsModule.currentReceipt = r;
    const s = r.students;
    const p = r.payments;
    const inst = AppState.institution;
    const orgName = inst?.institution_name || "I2B Educational Institution";
    const rData = r.receipt_data || {};

    const studentName = s?.name || rData.student_name || 'Student';
    const studentId = s?.student_id || rData.student_code || 'STU';
    const receiptNo = r.receipt_number || 'REC';
    const paymentNo = p?.payment_number || (receiptNo.startsWith('REC-') ? receiptNo.replace('REC-', 'PAY-') : 'PAY-' + receiptNo);
    const date = r.issue_date || new Date().toISOString().slice(0, 10);
    const amountVal = parseFloat(r.amount_paid) || 0;
    const amountPaid = amountVal.toFixed(2);
    const paymentMethod = (p?.payment_method || rData.payment_method || 'UPI').toUpperCase();

    // Exact receipt text format matching institutional guidelines
    const msg = `*${orgName}*
*Fee Payment Receipt Confirmation*

Dear Parent / Student,
We gratefully acknowledge receipt of fee payment for *${studentName}* (ID: ${studentId}).

*Receipt No:* ${receiptNo}
*Payment No:* ${paymentNo}
*Date:* ${date}
*Amount Paid:* Rs. ${amountPaid}
*Payment Method:* ${paymentMethod}

Thank you!

For queries, contact: +91 6385577966  OR +91 9345999260
Email: i2btutioncentre@gmail.com
Thank you for your prompt payment! This is an official computer-generated receipt.`;

    const rawPhone = (s?.whatsapp_number || '').trim();

    // 1. Direct send if registered WhatsApp number exists
    if (rawPhone) {
      const waUrl = Utils.buildWhatsAppUrl(rawPhone, msg);
      window.open(waUrl, '_blank');
      Utils.showToast("WhatsApp Opened", `Sending receipt confirmation directly to ${studentName} (${rawPhone})`, "success", 4000);
      return;
    }

    // 2. Sharing sheet fallback
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Receipt - ${studentName} (${receiptNo})`,
          text: msg
        });
        Utils.showToast("Sharing Sheet Opened", "Select parent contact to send.", "info", 5000);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // 3. Desktop / Web fallback for unrecorded phone number
    const waUrlManual = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrlManual, '_blank');
    Utils.showToast("WhatsApp Opened", "No WhatsApp number registered on profile. Please select parent chat manually.", "warning", 5000);
  }

};

window.ReceiptsModule = ReceiptsModule;
