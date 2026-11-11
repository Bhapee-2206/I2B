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

  // View Receipt Modal (Supports Single & Combined Multi-Profile Receipts)
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
    const isCombined = rData.is_combined || (rData.students && rData.students.length > 1);

    document.getElementById('receipt-view-number').textContent = r.receipt_number;
    document.getElementById('receipt-view-date').textContent = Utils.formatDate(r.issue_date);

    if (isCombined && rData.students && rData.students.length > 0) {
      const studentNames = rData.students.map(st => st.name).join(' & ');
      const studentIds = rData.students.map(st => st.student_id).join(', ');
      const parentName = rData.students[0]?.parent_name || s?.parent_name || '—';
      const phone = rData.students[0]?.whatsapp_number || s?.whatsapp_number || '—';

      document.getElementById('receipt-view-student-name').textContent = studentNames;
      document.getElementById('receipt-view-student-id').textContent = studentIds;
      document.getElementById('receipt-view-parent-name').textContent = parentName;
      document.getElementById('receipt-view-phone').textContent = phone;
    } else {
      document.getElementById('receipt-view-student-name').textContent = s?.name || rData.students?.[0]?.name || '—';
      document.getElementById('receipt-view-student-id').textContent = s?.student_id || rData.students?.[0]?.student_id || '—';
      document.getElementById('receipt-view-parent-name').textContent = s?.parent_name || '—';
      document.getElementById('receipt-view-phone').textContent = s?.whatsapp_number || '—';
    }

    document.getElementById('receipt-view-amount-paid').textContent = Utils.formatCurrency(r.amount_paid);
    document.getElementById('receipt-view-method').textContent = p?.payment_method || rData.payment_method || 'UPI';
    document.getElementById('receipt-view-ref').textContent = p?.transaction_reference || rData.transaction_reference || 'None';
    document.getElementById('receipt-view-balance').textContent = Utils.formatCurrency(r.remaining_balance);

    document.getElementById('receipt-institution-name').textContent = inst?.institution_name || 'I2B Educational Institution';
    document.getElementById('receipt-institution-address').textContent = inst?.address || 'Contact: +91 6385577966 / +91 9345999260 • i2btutioncentre@gmail.com';
    document.getElementById('receipt-footer-text').textContent = inst?.receipt_footer || 'Thank you for your prompt payment! This is an official computer-generated receipt.';

    // Render Itemized Breakdown Table
    const itemsContainer = document.getElementById('receipt-items-table-container');
    if (itemsContainer) {
      if (rData.students && rData.students.length > 0) {
        let rowsHtml = '';
        let rowIdx = 1;
        rData.students.forEach(st => {
          if (st.items && st.items.length > 0) {
            st.items.forEach(it => {
              rowsHtml += `
                <tr style="border-bottom: 1px solid var(--border-light);">
                  <td style="padding: 0.45rem 0.5rem; color: var(--text-muted); width: 25px;">${rowIdx++}</td>
                  <td style="padding: 0.45rem 0.5rem;">
                    <strong>${Utils.escapeHtml(st.name)}</strong>
                    <span style="font-size: 0.74rem; color: var(--text-muted); margin-left: 0.25rem;">(${Utils.escapeHtml(st.student_id)})</span>
                  </td>
                  <td style="padding: 0.45rem 0.5rem;">${Utils.escapeHtml(it.label)}</td>
                  <td style="padding: 0.45rem 0.5rem; text-align: right; font-weight: 700; color: var(--text-main);">${Utils.formatCurrency(it.amount)}</td>
                </tr>
              `;
            });
          } else {
            rowsHtml += `
              <tr style="border-bottom: 1px solid var(--border-light);">
                <td style="padding: 0.45rem 0.5rem; color: var(--text-muted); width: 25px;">${rowIdx++}</td>
                <td style="padding: 0.45rem 0.5rem;">
                  <strong>${Utils.escapeHtml(st.name)}</strong>
                  <span style="font-size: 0.74rem; color: var(--text-muted); margin-left: 0.25rem;">(${Utils.escapeHtml(st.student_id)})</span>
                </td>
                <td style="padding: 0.45rem 0.5rem;">Tuition Fee Settlement</td>
                <td style="padding: 0.45rem 0.5rem; text-align: right; font-weight: 700; color: var(--text-main);">${Utils.formatCurrency(st.amount_paid)}</td>
              </tr>
            `;
          }
        });

        itemsContainer.innerHTML = `
          <div style="margin-bottom: 1rem; border: 1px solid var(--border-light); border-radius: var(--radius-sm); overflow: hidden;">
            <div style="background: var(--surface-subtle); padding: 0.45rem 0.75rem; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Fee Settlement Details
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-light); background: rgba(0,0,0,0.02); text-align: left; font-size: 0.75rem; color: var(--text-muted);">
                  <th style="padding: 0.35rem 0.5rem;">#</th>
                  <th style="padding: 0.35rem 0.5rem;">Student Profile</th>
                  <th style="padding: 0.35rem 0.5rem;">Fee Category / Period</th>
                  <th style="padding: 0.35rem 0.5rem; text-align: right;">Amount</th>
                </tr>
              </thead>
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
    const isCombined = rData.is_combined || (rData.students && rData.students.length > 1);

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
    const studentDisplayName = (isCombined && rData.students)
      ? rData.students.map(st => st.name).join(' & ')
      : (s?.name || rData.students?.[0]?.name || '—');
    const studentDisplayId = (isCombined && rData.students)
      ? rData.students.map(st => st.student_id).join(', ')
      : (s?.student_id || rData.students?.[0]?.student_id || '—');
    const parentDisplayName = (isCombined && rData.students?.[0]?.parent_name)
      ? rData.students[0].parent_name
      : (s?.parent_name || '—');
    const phoneDisplay = (isCombined && rData.students?.[0]?.whatsapp_number)
      ? rData.students[0].whatsapp_number
      : (s?.whatsapp_number || '—');

    doc.setFontSize(9);
    doc.text("Student ID:", 14, 52);
    doc.setFont('helvetica', 'bold');
    doc.text(`${studentDisplayId}`, 42, 52);

    doc.setFont('helvetica', 'normal');
    doc.text("Student Name:", 14, 58);
    doc.setFont('helvetica', 'bold');
    doc.text(`${studentDisplayName}`, 42, 58);

    doc.setFont('helvetica', 'normal');
    doc.text("Parent Name:", 14, 64);
    doc.text(`${parentDisplayName}`, 42, 64);

    doc.text("WhatsApp Phone:", 14, 70);
    doc.text(`${phoneDisplay}`, 42, 70);

    // Line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 75, 134, 75);

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("Item / Description", 14, 81);
    doc.text("Payment Mode", 72, 81);
    doc.text("Amount Received", 106, 81);

    let curY = 88;
    doc.setFont('helvetica', 'normal');

    if (rData.students && rData.students.length > 0) {
      rData.students.forEach(st => {
        if (st.items && st.items.length > 0) {
          st.items.forEach(it => {
            if (curY > 120) return;
            doc.text(`${st.name}: ${it.label}`.substring(0, 36), 14, curY);
            doc.text(`${p?.payment_method || rData.payment_method || 'UPI'}`, 72, curY);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text(`INR ${(it.amount || 0).toLocaleString('en-IN')}`, 106, curY);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'normal');
            curY += 6;
          });
        } else {
          if (curY > 120) return;
          doc.text(`${st.name} (${st.student_id})`.substring(0, 36), 14, curY);
          doc.text(`${p?.payment_method || rData.payment_method || 'UPI'}`, 72, curY);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(16, 185, 129);
          doc.text(`INR ${(st.amount_paid || 0).toLocaleString('en-IN')}`, 106, curY);
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'normal');
          curY += 6;
        }
      });
    } else {
      doc.text("Tuition Fee Collection", 14, curY);
      doc.text(`${p?.payment_method || 'Cash'}${p?.transaction_reference ? ' (' + p.transaction_reference + ')' : ''}`, 72, curY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`INR ${(r.amount_paid || 0).toLocaleString('en-IN')}`, 106, curY);
      curY += 6;
    }

    // Line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, curY + 2, 134, curY + 2);

    // Financial Summary
    curY += 9;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text("Total Paid This Transaction:", 55, curY);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${(r.amount_paid || 0).toLocaleString('en-IN')}`, 110, curY);

    curY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text("Remaining Balance Pending:", 55, curY);
    doc.setFont('helvetica', 'bold');
    const bal = r.remaining_balance || 0;
    doc.setTextColor(bal > 0 ? 239 : 16, bal > 0 ? 68 : 185, bal > 0 ? 68 : 129);
    doc.text(`INR ${bal.toLocaleString('en-IN')}`, 110, curY);

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

  // Direct WhatsApp Receipt Sharing (Supports Multi-Profile & Single-Profile Format)
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
    const isCombined = rData.is_combined || (rData.students && rData.students.length > 1);

    const receiptNo = r.receipt_number || 'REC';
    const paymentNo = p?.payment_number || (receiptNo.startsWith('REC-') ? receiptNo.replace('REC-', 'PAY-') : 'PAY-' + receiptNo);
    const date = r.issue_date || new Date().toISOString().slice(0, 10);
    const amountVal = parseFloat(r.amount_paid) || 0;
    const amountPaid = amountVal.toFixed(2);
    const paymentMethod = (p?.payment_method || rData.payment_method || 'UPI').toUpperCase();

    let introAndStudentBlock = '';
    let targetPhone = (s?.whatsapp_number || '').trim();

    if (isCombined && rData.students && rData.students.length > 0) {
      const firstWithPhone = rData.students.find(st => (st.whatsapp_number || '').trim());
      if (firstWithPhone) targetPhone = firstWithPhone.whatsapp_number.trim();

      const studentLines = rData.students.map(st => {
        const itemDescs = (st.items && st.items.length > 0)
          ? st.items.map(it => `${it.label}: Rs. ${parseFloat(it.amount).toFixed(2)}`).join('\n   ')
          : `Tuition Fee: Rs. ${parseFloat(st.amount_paid).toFixed(2)}`;
        return `• *${st.name}* (ID: ${st.student_id})\n   ${itemDescs}`;
      }).join('\n');

      introAndStudentBlock = `Dear Parent,\nWe gratefully acknowledge receipt of tuition fee payment for:\n${studentLines}`;
    } else {
      const studentName = s?.name || rData.students?.[0]?.name || 'Student';
      const studentId = s?.student_id || rData.students?.[0]?.student_id || 'STU';
      introAndStudentBlock = `Dear Parent / Student,\nWe gratefully acknowledge receipt of fee payment for *${studentName}* (ID: ${studentId}).`;
    }

    const msg = `*${orgName}*
*Fee Payment Receipt Confirmation*

${introAndStudentBlock}

*Receipt No:* ${receiptNo}
*Payment No:* ${paymentNo}
*Date:* ${date}
*Total Amount Paid:* Rs. ${amountPaid}
*Payment Method:* ${paymentMethod}

Thank you!

For queries, contact: +91 6385577966  OR +91 9345999260
Email: i2btutioncentre@gmail.com
Thank you for your prompt payment! This is an official computer-generated receipt.`;

    // 1. Direct send if registered WhatsApp number exists
    if (targetPhone) {
      const waUrl = Utils.buildWhatsAppUrl(targetPhone, msg);
      window.open(waUrl, '_blank');
      Utils.showToast("WhatsApp Opened", `Sending receipt confirmation to ${targetPhone}`, "success", 4000);
      return;
    }

    // 2. Sharing sheet fallback
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Receipt - ${receiptNo}`,
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
