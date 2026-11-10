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
  viewReceipt: (receiptId) => {
    const r = AppState.receipts.find(item => item.id === receiptId);
    if (!r) return;

    ReceiptsModule.currentReceipt = r;
    const s = r.students;
    const p = r.payments;
    const inst = AppState.institution;

    document.getElementById('receipt-view-number').textContent = r.receipt_number;
    document.getElementById('receipt-view-date').textContent = Utils.formatDate(r.issue_date);
    document.getElementById('receipt-view-student-name').textContent = s?.name || '—';
    document.getElementById('receipt-view-student-id').textContent = s?.student_id || '—';
    document.getElementById('receipt-view-parent-name').textContent = s?.parent_name || '—';
    document.getElementById('receipt-view-phone').textContent = s?.whatsapp_number || '—';

    document.getElementById('receipt-view-amount-paid').textContent = Utils.formatCurrency(r.amount_paid);
    document.getElementById('receipt-view-method').textContent = p?.payment_method || 'Cash';
    document.getElementById('receipt-view-ref').textContent = p?.transaction_reference || 'None';
    document.getElementById('receipt-view-balance').textContent = Utils.formatCurrency(r.remaining_balance);

    document.getElementById('receipt-institution-name').textContent = inst?.institution_name || 'EduTrack Institution';
    document.getElementById('receipt-institution-address').textContent = inst?.address || '';
    document.getElementById('receipt-footer-text').textContent = inst?.receipt_footer || 'Thank you for your payment!';

    Utils.openModal('modal-view-receipt');
  },

  // Download PDF using jsPDF
  downloadPDF: () => {
    const r = ReceiptsModule.currentReceipt;
    if (!r) return;

    try {
      if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
        alert("PDF generator is initializing. Please try again in a moment.");
        return;
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

      // Header Banner (Navy #0f172a)
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 148, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(inst?.institution_name || "EDUTRACK INSTITUTION", 14, 11);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(inst?.subtitle || "Student & Monthly Fee Management", 14, 17);
      doc.text(inst?.contact_phone ? `Phone: ${inst.contact_phone} | Email: ${inst.contact_email || ''}` : '', 14, 22);

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
      doc.text(`${s?.student_id || '—'}`, 40, 53);

      doc.setFont('helvetica', 'normal');
      doc.text("Student Name:", 14, 60);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s?.name || '—'}`, 40, 60);

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
      doc.text("Tuition Fee Collection", 14, 96);
      doc.text(`${p?.payment_method || 'Cash'}${p?.transaction_reference ? ' (' + p.transaction_reference + ')' : ''}`, 70, 96);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`INR ${r.amount_paid.toLocaleString('en-IN')}`, 106, 96);

      // Line
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 104, 134, 104);

      // Financial Summary
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text("Total Paid This Transaction:", 55, 113);
      doc.setFont('helvetica', 'bold');
      doc.text(`INR ${r.amount_paid.toLocaleString('en-IN')}`, 110, 113);

      doc.setFont('helvetica', 'normal');
      doc.text("Remaining Balance Pending:", 55, 120);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(r.remaining_balance > 0 ? 239 : 16, r.remaining_balance > 0 ? 68 : 185, r.remaining_balance > 0 ? 68 : 129);
      doc.text(`INR ${r.remaining_balance.toLocaleString('en-IN')}`, 110, 120);

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

      doc.save(`Receipt_${r.receipt_number}.pdf`);
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

  // Share Receipt through WhatsApp (Section 12)
  shareViaWhatsApp: (receiptId) => {
    const r = AppState.receipts.find(item => item.id === receiptId);
    if (!r) return;

    ReceiptsModule.currentReceipt = r;
    const s = r.students;
    const inst = AppState.institution;

    if (!s?.whatsapp_number) {
      Utils.showToast("WhatsApp Notice", "Student does not have a registered WhatsApp number.", "warning");
      return;
    }

    const orgName = inst?.institution_name || "EduTrack Tuition Centre";
    const msg = `Dear Parent,

We have received your tuition fee payment.

Student: ${s.name}
Amount Received: ₹${r.amount_paid.toLocaleString('en-IN')}
Receipt Number: ${r.receipt_number}
Pending Balance: ₹${r.remaining_balance.toLocaleString('en-IN')}

Thank you.

Regards,
${orgName}`;

    // Prompt admin about attaching downloaded PDF
    const downloadFirst = confirm(
      `WhatsApp will now open for ${s.name} (${s.whatsapp_number}).\n\n` +
      `Important Notice:\nClick-to-chat cannot automatically attach a PDF.\n\n` +
      `Click OK to download the PDF receipt first so you can attach it in WhatsApp.`
    );

    if (downloadFirst) {
      ReceiptsModule.downloadPDF();
    }

    const waUrl = Utils.buildWhatsAppUrl(s.whatsapp_number, msg);
    window.open(waUrl, '_blank');
  }
};

window.ReceiptsModule = ReceiptsModule;
