// ==============================================================================
// I2B - Financial & Operational Reports Service
// Excel (XLSX), CSV export and ledger generation
// ==============================================================================

import * as XLSX from 'xlsx';
import { Student, Enrollment, Invoice, Payment, Programme } from '../types';

/**
 * Downloads a worksheet as an Excel .xlsx workbook
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Downloads a worksheet as CSV
 */
export function exportToCsv(data: any[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats Monthly Collection Report
 */
export function generateMonthlyCollectionReportData(payments: Payment[]) {
  return payments.map(p => ({
    'Payment No': p.payment_number,
    'Payment Date': p.payment_date,
    'Student ID': p.student?.student_id || 'N/A',
    'Student Name': p.student?.name || 'N/A',
    'Payment Method': p.payment_method,
    'Amount (₹)': p.amount,
    'Reference': p.transaction_reference || 'N/A',
    'Status': p.status,
    'Receipt No': p.receipt?.receipt_number || 'N/A',
    'Notes': p.notes || ''
  }));
}

/**
 * Formats Outstanding / Overdue Fees Report
 */
export function generateOutstandingReportData(invoices: Invoice[]) {
  const unpaid = invoices.filter(i => i.status !== 'cancelled' && i.status !== 'paid');
  const today = new Date().toISOString().split('T')[0];

  return unpaid.map(i => {
    const isOverdue = i.due_date < today;
    const daysOverdue = isOverdue
      ? Math.floor((new Date(today).getTime() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      'Invoice No': i.invoice_number,
      'Student ID': i.student?.student_id || 'N/A',
      'Student Name': i.student?.name || 'N/A',
      'WhatsApp': i.student?.whatsapp_number || 'N/A',
      'Billing Period': `${i.billing_month}/${i.billing_year}`,
      'Invoice Date': i.invoice_date,
      'Due Date': i.due_date,
      'Total Amount (₹)': i.total_amount,
      'Paid Amount (₹)': i.paid_amount,
      'Outstanding (₹)': i.balance_amount,
      'Status': i.status,
      'Overdue': isOverdue ? 'Yes' : 'No',
      'Days Overdue': daysOverdue
    };
  });
}

/**
 * Formats Programme-wise Enrolments Report
 */
export function generateEnrollmentReportData(enrollments: Enrollment[], programmes: Programme[]) {
  const progMap = new Map(programmes.map(p => [p.id, p.name]));

  return enrollments.map(e => ({
    'Student ID': e.student?.student_id || 'N/A',
    'Student Name': e.student?.name || 'N/A',
    'Programme': progMap.get(e.programme_id) || 'N/A',
    'Class / Grade': e.class_or_grade,
    'Board': e.board || 'Regular',
    'Agreed Monthly Fee (₹)': e.agreed_fee,
    'Start Date': e.start_date,
    'Status': e.status,
    'Verified': e.is_verified ? 'Yes' : 'Pending Verification'
  }));
}

/**
 * Builds a Student Ledger (statement of all invoices and payments)
 */
export function buildStudentLedger(studentId: string, invoices: Invoice[], payments: Payment[]) {
  const studentInvoices = invoices.filter(i => i.student_id === studentId);
  const studentPayments = payments.filter(p => p.student_id === studentId);

  interface LedgerEntry {
    date: string;
    type: 'Invoice' | 'Payment';
    reference: string;
    description: string;
    debit: number;   // Invoiced (charges)
    credit: number;  // Paid (receipts)
    balance: number; // Running balance
  }

  const entries: LedgerEntry[] = [];

  studentInvoices.forEach(inv => {
    entries.push({
      date: inv.invoice_date,
      type: 'Invoice',
      reference: inv.invoice_number,
      description: `Monthly Fee - ${inv.billing_month}/${inv.billing_year}`,
      debit: Number(inv.total_amount),
      credit: 0,
      balance: 0
    });
  });

  studentPayments.forEach(pay => {
    if (pay.status !== 'reversed') {
      entries.push({
        date: pay.payment_date,
        type: 'Payment',
        reference: pay.payment_number,
        description: `Payment via ${pay.payment_method} ${pay.transaction_reference ? `(${pay.transaction_reference})` : ''}`,
        debit: 0,
        credit: Number(pay.amount),
        balance: 0
      });
    }
  });

  // Sort chronological
  entries.sort((a, b) => a.date.localeCompare(b.date));

  // Compute running balance
  let running = 0;
  entries.forEach(e => {
    running += e.debit - e.credit;
    e.balance = running;
  });

  return entries;
}
