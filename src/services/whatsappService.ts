// ==============================================================================
// I2B - WhatsApp Integration Service
// Mode A: Manual WhatsApp sharing via wa.me URL scheme with parent verification
// Mode B: Architecture ready for Meta WhatsApp Cloud API via Supabase Edge Functions
// ==============================================================================

import { Receipt, Payment, Student, InstitutionSettings, Invoice } from '../types';
import { updateReceiptWhatsAppStatus, logAudit } from './dbService';

export interface WhatsAppMessagePayload {
  phoneNumber: string;
  messageText: string;
  waUrl: string;
  studentName: string;
  type: 'receipt' | 'overdue_reminder';
}

/**
 * Cleans phone number by removing spaces, dashes, parentheses and ensuring country code
 */
export function formatWhatsAppPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  // Remove non-digit characters
  let digits = phone.replace(/\D/g, '');
  // Default to India (+91) if 10 digits
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return digits;
}

/**
 * Builds the prepared receipt message for WhatsApp sharing
 */
export function buildReceiptWhatsAppMessage(
  student: Student,
  payment: Payment,
  receipt: Receipt,
  settings: InstitutionSettings
): WhatsAppMessagePayload {
  const cleanPhone = formatWhatsAppPhoneNumber(student.whatsapp_number);
  const formattedAmount = `Rs. ${Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formattedBalance = `Rs. ${Number(receipt.remaining_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const messageText = 
`*${settings.institution_name}*
*Fee Payment Receipt Confirmation*

Dear Parent / Student,
We gratefully acknowledge receipt of fee payment for *${student.name}* (ID: ${student.student_id}).

*Receipt No:* ${receipt.receipt_number}
*Payment No:* ${payment.payment_number}
*Date:* ${receipt.issue_date || payment.payment_date}
*Amount Paid:* ${formattedAmount}
*Payment Method:* ${payment.payment_method}
${payment.transaction_reference ? `*Reference:* ${payment.transaction_reference}\n` : ''}*Remaining Balance:* ${formattedBalance}

${Number(receipt.remaining_balance) === 0 ? '✓ Your account has no outstanding balance. Thank you!' : 'Please find the official PDF receipt attached.'}

For queries, contact: ${settings.contact_phone}
${settings.receipt_footer || 'Thank you!'}`;

  const encodedText = encodeURIComponent(messageText);
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  return {
    phoneNumber: cleanPhone,
    messageText,
    waUrl,
    studentName: student.name,
    type: 'receipt',
  };
}

/**
 * Builds an overdue fee reminder message for WhatsApp
 */
export function buildOverdueReminderWhatsAppMessage(
  student: Student,
  invoice: Invoice,
  settings: InstitutionSettings
): WhatsAppMessagePayload {
  const cleanPhone = formatWhatsAppPhoneNumber(student.whatsapp_number);
  const formattedTotal = `Rs. ${Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formattedPaid = `Rs. ${Number(invoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formattedBalance = `Rs. ${Number(invoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const messageText = 
`*${settings.institution_name}*
*Gentle Reminder: Tuition Fee Payment*

Dear Parent / Guardian of *${student.name}* (ID: ${student.student_id}),

This is a courteous reminder regarding the outstanding monthly tuition fee for *${invoice.billing_month}/${invoice.billing_year}*.

*Invoice No:* ${invoice.invoice_number}
*Due Date:* ${invoice.due_date}
*Invoice Amount:* ${formattedTotal}
*Amount Received:* ${formattedPaid}
*Outstanding Balance:* *${formattedBalance}*

Kindly arrange for the payment at your earliest convenience to maintain continuous enrolment.

Payment Modes Available:
- Cash at institution counter
- UPI / Google Pay / PhonePe to: ${settings.whatsapp_number}
- Bank Transfer

If already paid, please ignore this notice or reply with transaction screenshot.
Contact Office: ${settings.contact_phone}`;

  const encodedText = encodeURIComponent(messageText);
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  return {
    phoneNumber: cleanPhone,
    messageText,
    waUrl,
    studentName: student.name,
    type: 'overdue_reminder',
  };
}

/**
 * Initiates WhatsApp manual sharing window and updates tracking status
 */
export async function launchManualWhatsAppShare(
  payload: WhatsAppMessagePayload,
  receiptId?: string
): Promise<void> {
  // Open WhatsApp in new tab / application
  window.open(payload.waUrl, '_blank', 'noopener,noreferrer');

  if (receiptId) {
    await updateReceiptWhatsAppStatus(receiptId, 'initiated');
    await logAudit('whatsapp_share_initiated', 'receipts', receiptId, {
      phone: payload.phoneNumber,
      student: payload.studentName
    });
  }
}

/**
 * Confirms that admin sent the message on WhatsApp
 */
export async function confirmWhatsAppSent(receiptId: string): Promise<void> {
  await updateReceiptWhatsAppStatus(receiptId, 'confirmed_sent');
  await logAudit('whatsapp_share_confirmed', 'receipts', receiptId, { status: 'confirmed_sent' });
}

// ==============================================================================
// Mode B: Meta WhatsApp Cloud API Architecture Skeleton
// (Supabase Edge Function invoker for future automated sending)
// ==============================================================================

export interface CloudApiConfig {
  phoneNumberId: string;
  wabaId: string;
  templateName: string;
}

export async function sendAutomaticCloudApiMessage(
  payload: WhatsAppMessagePayload,
  config: CloudApiConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Production-ready Meta Cloud API integration placeholder
  // In production, this invokes Supabase Edge Function: `supabase.functions.invoke('send-whatsapp-receipt', ...)`
  console.log('[Meta WhatsApp Cloud API] Dispatched to Edge Function with payload:', { payload, config });
  
  return {
    success: false,
    error: 'Meta WhatsApp Cloud API is configured for server-side Edge Function release. Please use Mode A: Manual WhatsApp sharing in current release.'
  };
}
