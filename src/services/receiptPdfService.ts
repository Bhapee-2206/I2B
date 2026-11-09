// ==============================================================================
// I2B - Professional PDF Receipt Generator
// Uses jsPDF for crisp vector rendering, official institution branding & formatting
// ==============================================================================

import jsPDF from 'jspdf';
import { Receipt, Payment, Student, InstitutionSettings } from '../types';

/**
 * Converts a number into Indian Rupee words (e.g., 1250 -> "One Thousand Two Hundred Fifty Rupees Only")
 */
export function numberToIndianRupeesWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num: number): string {
    if (num === 0) return '';
    if (num < 20) return units[num];
    const unit = num % 10;
    return tens[Math.floor(num / 10)] + (unit !== 0 ? ' ' + units[unit] : '');
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let str = '';
    if (hundred > 0) {
      str += units[hundred] + ' Hundred';
      if (rest > 0) str += ' and ';
    }
    str += convertTwoDigits(rest);
    return str.trim();
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let result = '';

  const crores = Math.floor(integerPart / 10000000);
  const lakhs = Math.floor((integerPart % 10000000) / 100000);
  const thousands = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  if (crores > 0) result += convertThreeDigits(crores) + ' Crore ';
  if (lakhs > 0) result += convertThreeDigits(lakhs) + ' Lakh ';
  if (thousands > 0) result += convertThreeDigits(thousands) + ' Thousand ';
  if (remainder > 0) result += convertThreeDigits(remainder) + ' ';

  result = result.trim() + ' Rupees';

  if (decimalPart > 0) {
    result += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
  }

  return result + ' Only';
}

export interface GenerateReceiptParams {
  receipt: Receipt;
  payment: Payment;
  student: Student;
  settings: InstitutionSettings;
  enrolmentInfo?: string;
  billingPeriod?: string;
}

/**
 * Builds a vector jsPDF instance formatted for A5/A4 printable receipts.
 */
export function buildReceiptPdf(params: GenerateReceiptParams): jsPDF {
  const { receipt, payment, student, settings, enrolmentInfo, billingPeriod } = params;

  // Create A5 document in portrait (148 x 210 mm) - ideal for institutional tuition receipts
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Outer Border Box
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, pageHeight - margin * 2, 'S');

  // Header Background Accent Bar
  doc.setFillColor(15, 23, 42); // slate-900 (Navy)
  doc.rect(margin, margin, contentWidth, 24, 'F');

  // Institution Title in Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(settings.institution_name || 'I2B Educational Institution', pageWidth / 2, margin + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(209, 250, 229); // emerald-100
  doc.text(settings.subtitle || 'Student & Monthly Fee Management', pageWidth / 2, margin + 13, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(`${settings.address} | Contact: ${settings.contact_phone}`, pageWidth / 2, margin + 18, { align: 'center' });

  // Receipt Badge / Title
  let y = margin + 30;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + 4, y, contentWidth - 8, 8, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL PAYMENT RECEIPT', pageWidth / 2, y + 5.5, { align: 'center' });

  // Metadata Grid: Receipt No, Date, Payment No, Method
  y += 12;
  doc.setFontSize(7.5);

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Receipt No:', margin + 6, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.receipt_number, margin + 26, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Payment No:', margin + 6, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(payment.payment_number, margin + 26, y + 5);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Issue Date:', pageWidth - margin - 35, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.issue_date || payment.payment_date, pageWidth - margin - 6, y, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Method:', pageWidth - margin - 35, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(payment.payment_method, pageWidth - margin - 6, y + 5, { align: 'right' });

  // Divider Line
  y += 9;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 4, y, pageWidth - margin - 4, y);

  // Student Information Box
  y += 5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + 4, y, contentWidth - 8, 24, 1.5, 1.5, 'F');

  doc.setFontSize(7.5);
  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Student Name:', margin + 8, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(student.name, margin + 30, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Student ID:', pageWidth - margin - 45, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.student_id, pageWidth - margin - 8, y + 6, { align: 'right' });

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Parent/Guardian:', margin + 8, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.parent_name || 'N/A', margin + 30, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('WhatsApp:', pageWidth - margin - 45, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.whatsapp_number || 'N/A', pageWidth - margin - 8, y + 12, { align: 'right' });

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Programme(s):', margin + 8, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(enrolmentInfo || 'Institutional Tuition Programme', margin + 30, y + 18);

  if (billingPeriod) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Period:', pageWidth - margin - 45, y + 18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(billingPeriod, pageWidth - margin - 8, y + 18, { align: 'right' });
  }

  // Payment Breakdown Table
  y += 28;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin + 4, y, contentWidth - 8, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', margin + 8, y + 4.2);
  doc.text('REFERENCE', margin + 65, y + 4.2);
  doc.text('AMOUNT (INR)', pageWidth - margin - 8, y + 4.2, { align: 'right' });

  // Table Content Row
  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + 4, y, contentWidth - 8, 14, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Tuition / Programme Fee Payment', margin + 8, y + 6);
  if (billingPeriod) {
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Billing period: ${billingPeriod}`, margin + 8, y + 10);
  }

  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(payment.transaction_reference || 'Counter Payment', margin + 65, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin - 8, y + 6, { align: 'right' });

  // Amount in Words Bar
  y += 18;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(margin + 4, y, contentWidth - 8, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('AMOUNT IN WORDS:', margin + 8, y + 4);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text(numberToIndianRupeesWords(Number(payment.amount)), margin + 8, y + 7.5);

  // Financial Summary Cards: Total Paid & Remaining Balance
  y += 13;
  const colW = (contentWidth - 10) / 2;

  // Paid Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + 4, y, colW, 14, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL AMOUNT RECEIVED', margin + 8, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`Rs. ${Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + 8, y + 11);

  // Balance Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + 6 + colW, y, colW, 14, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('OUTSTANDING BALANCE', margin + 10 + colW, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(receipt.remaining_balance > 0 ? 225 : 71, receipt.remaining_balance > 0 ? 29 : 85, receipt.remaining_balance > 0 ? 72 : 105); // red if > 0
  doc.text(`Rs. ${Number(receipt.remaining_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + 10 + colW, y + 11);

  // Signature & Verification section
  y += 22;
  doc.setDrawColor(203, 213, 225);
  doc.line(pageWidth - margin - 45, y + 12, pageWidth - margin - 8, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', pageWidth - margin - 26, y + 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('I2B Administrative Office', pageWidth - margin - 26, y + 19, { align: 'center' });

  // Security Seal / Note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('COMPUTER GENERATED RECEIPT', margin + 8, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('No physical signature required for electronic verification.', margin + 8, y + 16);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, margin + 8, y + 19);

  // Footer bar
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, pageHeight - margin - 10, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.receipt_footer || 'Thank you for your prompt payment!', pageWidth / 2, pageHeight - margin - 4, { align: 'center' });

  return doc;
}

/**
 * Downloads the receipt PDF to client browser.
 */
export function downloadReceiptPdf(params: GenerateReceiptParams): void {
  const doc = buildReceiptPdf(params);
  const filename = `${params.receipt.receipt_number}_${params.student.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Opens PDF in browser print preview dialog.
 */
export function printReceiptPdf(params: GenerateReceiptParams): void {
  const doc = buildReceiptPdf(params);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
  }
}

/**
 * Returns a base64 data URI of the generated receipt PDF.
 */
export function getReceiptDataUri(params: GenerateReceiptParams): string {
  const doc = buildReceiptPdf(params);
  return doc.output('datauristring');
}
