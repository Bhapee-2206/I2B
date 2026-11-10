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

  // Render Receipts Table
  renderReceiptsTable: () => {
    const tbody = document.getElementById('receipts-table-body');
    if (!tbody) return;

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
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding: 3rem 1rem;">
            <div class="empty-state">
              <i data-lucide="file-check" class="empty-state-icon"></i>
              <div class="empty-state-title">No receipts found</div>
              <div class="empty-state-text">Receipts are automatically created whenever you record a tuition payment.</div>
            </div>
          </td>
        </tr>`;
      Utils.renderIcons();
      return;
    }

    tbody.innerHTML = list.map(r => {
      const student = r.students;
      const payment = r.payments;

      return `
        <tr>
          <td>
            <strong>${Utils.escapeHtml(r.receipt_number)}</strong>
          </td>
          <td>
            ${Utils.formatDate(r.issue_date)}
          </td>
          <td>
            <div style="font-weight: 600;">${Utils.escapeHtml(student?.name || 'Unknown')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${Utils.escapeHtml(student?.student_id || '')}</div>
          </td>
          <td>
            <strong style="color: var(--success); font-size: 0.95rem;">${Utils.formatCurrency(r.amount_paid)}</strong>
          </td>
          <td>
            <span class="badge badge-neutral">${Utils.escapeHtml(payment?.payment_method || 'Cash')}</span>
          </td>
          <td>
            <span style="font-weight: 600; color: ${r.remaining_balance > 0 ? 'var(--danger)' : 'var(--success)'};">
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

    document.getElementById('receipt-institution-name').textContent = inst?.institution_name || 'I2B Educational Institution';
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

      // Header Banner
      doc.setFillColor(15, 23, 42); // Navy #0f172a
      doc.rect(0, 0, 148, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(inst?.institution_name || "I2B EDUCATIONAL INSTITUTION", 14, 12);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(inst?.subtitle || "Student, Tuition & Fee Management", 14, 18);
      doc.text(inst?.contact_phone ? `Phone: ${inst.contact_phone} | Email: ${inst.contact_email || ''}` : '', 14, 23);

      // Receipt Title Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 33, 120, 14, 2, 2, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("OFFICIAL PAYMENT RECEIPT", 18, 41);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Receipt #: ${r.receipt_number}`, 78, 39);
      doc.text(`Date: ${Utils.formatDate(r.issue_date)}`, 78, 44);

      // Student Info
      doc.setFontSize(9);
      doc.text("Student ID:", 14, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s?.student_id || '—'}`, 40, 55);

      doc.setFont('helvetica', 'normal');
      doc.text("Student Name:", 14, 62);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s?.name || '—'}`, 40, 62);

      doc.setFont('helvetica', 'normal');
      doc.text("Parent Name:", 14, 69);
      doc.text(`${s?.parent_name || '—'}`, 40, 69);

      doc.text("Phone / WA:", 14, 76);
      doc.text(`${s?.whatsapp_number || '—'}`, 40, 76);

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 82, 134, 82);

      // Payment Details Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Description", 14, 90);
      doc.text("Payment Mode", 70, 90);
      doc.text("Amount (INR)", 110, 90);

      doc.setFont('helvetica', 'normal');
      doc.text("Tuition Fee Collection", 14, 98);
      doc.text(`${p?.payment_method || 'Cash'}${p?.transaction_reference ? ' (' + p.transaction_reference + ')' : ''}`, 70, 98);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`INR ${r.amount_paid.toLocaleString('en-IN')}`, 110, 98);

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 106, 134, 106);

      // Financial Summary Box
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text("Total Amount Received:", 65, 115);
      doc.setFont('helvetica', 'bold');
      doc.text(`INR ${r.amount_paid.toLocaleString('en-IN')}`, 110, 115);

      doc.setFont('helvetica', 'normal');
      doc.text("Remaining Balance Pending:", 65, 122);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(r.remaining_balance > 0 ? 239 : 16, r.remaining_balance > 0 ? 68 : 185, r.remaining_balance > 0 ? 68 : 129);
      doc.text(`INR ${r.remaining_balance.toLocaleString('en-IN')}`, 110, 122);

      // Footer
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.text(inst?.receipt_footer || "This is a computer generated receipt. Thank you for your payment!", 14, 140);

      // Authorized Signatory
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Authorized Signatory", 100, 155);
      doc.line(95, 150, 134, 150);

      doc.save(`Receipt_${r.receipt_number}.pdf`);
      Utils.showToast("Receipt Downloaded", `Receipt ${r.receipt_number} saved as PDF`, "success");

    } catch (e) {
      console.error("PDF generation error:", e);
      Utils.showToast("PDF Error", "Failed to generate PDF. You can use Print instead.", "warning");
    }
  },

  // Print Receipt directly
  printReceipt: () => {
    window.print();
  },

  // Share Receipt through WhatsApp (Part 14)
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

    const orgName = inst?.institution_name || "I2B Educational Institution";
    const msg = `Dear Parent,

We have received your payment.

Student: ${s.name}
Amount Received: ₹${r.amount_paid.toLocaleString('en-IN')}
Receipt Number: ${r.receipt_number}
Pending Balance: ₹${r.remaining_balance.toLocaleString('en-IN')}

Thank you.

Regards,
${orgName}`;

    // Prompt user about attaching the PDF manually
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
