// ==============================================================================
// I2B - Universal Database Service
// Connects with Supabase PostgreSQL and falls back gracefully to local persistence
// ==============================================================================

import { supabase } from './supabaseClient';
import {
  Student,
  Programme,
  FeeStructure,
  Enrollment,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentAllocation,
  Receipt,
  MigrationRecord,
  InstitutionSettings,
  AuditLog,
  MessageLog
} from '../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_PROGRAMMES,
  DEFAULT_FEE_STRUCTURES,
  DEFAULT_STUDENTS,
  DEFAULT_ENROLLMENTS,
  DEFAULT_MIGRATION_RECORDS
} from './seedData';

const LOCAL_STORAGE_KEYS = {
  SETTINGS: 'i2b_settings_v1',
  PROGRAMMES: 'i2b_programmes_v1',
  FEE_STRUCTURES: 'i2b_fee_structures_v1',
  STUDENTS: 'i2b_students_v1',
  ENROLLMENTS: 'i2b_enrollments_v1',
  INVOICES: 'i2b_invoices_v1',
  INVOICE_ITEMS: 'i2b_invoice_items_v1',
  PAYMENTS: 'i2b_payments_v1',
  PAYMENT_ALLOCATIONS: 'i2b_payment_allocations_v1',
  RECEIPTS: 'i2b_receipts_v1',
  MIGRATION_RECORDS: 'i2b_migration_records_v1',
  AUDIT_LOGS: 'i2b_audit_logs_v1',
  MESSAGE_LOGS: 'i2b_message_logs_v1',
  IS_SUPABASE_ONLINE: 'i2b_supabase_online',
};

// State flag to track whether Supabase schema is ready in PostgreSQL
let supabaseSchemaReady: boolean | null = null;

export async function isSupabaseSchemaAvailable(): Promise<boolean> {
  if (supabaseSchemaReady !== null) return supabaseSchemaReady;
  try {
    const { error } = await supabase.from('programmes').select('id').limit(1);
    supabaseSchemaReady = !error;
    return supabaseSchemaReady;
  } catch {
    supabaseSchemaReady = false;
    return false;
  }
}

// Local storage helpers
function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) {
      setLocal(key, defaultVal);
      return defaultVal;
    }
    return JSON.parse(val);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

// Initialize LocalStorage with seed data if empty
export function initLocalDatabase() {
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS)) {
    setLocal(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.PROGRAMMES)) {
    setLocal(LOCAL_STORAGE_KEYS.PROGRAMMES, DEFAULT_PROGRAMMES);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.FEE_STRUCTURES)) {
    setLocal(LOCAL_STORAGE_KEYS.FEE_STRUCTURES, DEFAULT_FEE_STRUCTURES);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS)) {
    setLocal(LOCAL_STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.ENROLLMENTS)) {
    setLocal(LOCAL_STORAGE_KEYS.ENROLLMENTS, DEFAULT_ENROLLMENTS);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.MIGRATION_RECORDS)) {
    setLocal(LOCAL_STORAGE_KEYS.MIGRATION_RECORDS, DEFAULT_MIGRATION_RECORDS);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.INVOICES)) {
    setLocal(LOCAL_STORAGE_KEYS.INVOICES, []);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.INVOICE_ITEMS)) {
    setLocal(LOCAL_STORAGE_KEYS.INVOICE_ITEMS, []);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.PAYMENTS)) {
    setLocal(LOCAL_STORAGE_KEYS.PAYMENTS, []);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.PAYMENT_ALLOCATIONS)) {
    setLocal(LOCAL_STORAGE_KEYS.PAYMENT_ALLOCATIONS, []);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.RECEIPTS)) {
    setLocal(LOCAL_STORAGE_KEYS.RECEIPTS, []);
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS)) {
    setLocal(LOCAL_STORAGE_KEYS.AUDIT_LOGS, [
      {
        id: 'aud-001',
        action: 'system_initialized',
        entity_type: 'system',
        details: { message: 'I2B initialized with 75 Excel enrolment records from Sheet1' },
        actor_email: 'admin@i2b-edu.com',
        created_at: new Date().toISOString()
      }
    ]);
  }
}

initLocalDatabase();

// ==============================================================================
// 1. SETTINGS SERVICE
// ==============================================================================

export async function getSettings(): Promise<InstitutionSettings> {
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    const { data, error } = await supabase.from('institution_settings').select('*').limit(1).single();
    if (!error && data) return data as InstitutionSettings;
  }
  return getLocal<InstitutionSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export async function updateSettings(settings: Partial<InstitutionSettings>): Promise<InstitutionSettings> {
  const current = await getSettings();
  const updated: InstitutionSettings = { ...current, ...settings, updated_at: new Date().toISOString() };
  
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('institution_settings').upsert(updated);
  }
  setLocal(LOCAL_STORAGE_KEYS.SETTINGS, updated);
  await logAudit('update_settings', 'institution_settings', updated.id, settings);
  return updated;
}

// ==============================================================================
// 2. PROGRAMMES SERVICE
// ==============================================================================

export async function getProgrammes(): Promise<Programme[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    const { data, error } = await supabase.from('programmes').select('*').order('sort_order', { ascending: true });
    if (!error && data && data.length > 0) return data as Programme[];
  }
  return getLocal<Programme[]>(LOCAL_STORAGE_KEYS.PROGRAMMES, DEFAULT_PROGRAMMES);
}

export async function createProgramme(prog: Omit<Programme, 'id' | 'created_at'>): Promise<Programme> {
  const newProg: Programme = {
    ...prog,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('programmes').insert(newProg);
  }
  const all = getLocal<Programme[]>(LOCAL_STORAGE_KEYS.PROGRAMMES, DEFAULT_PROGRAMMES);
  all.push(newProg);
  setLocal(LOCAL_STORAGE_KEYS.PROGRAMMES, all);
  await logAudit('create_programme', 'programmes', newProg.id, newProg);
  return newProg;
}

export async function updateProgramme(id: string, updates: Partial<Programme>): Promise<Programme> {
  const all = await getProgrammes();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Programme not found');
  const updated = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
  all[idx] = updated;

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('programmes').update(updates).eq('id', id);
  }
  setLocal(LOCAL_STORAGE_KEYS.PROGRAMMES, all);
  await logAudit('update_programme', 'programmes', id, updates);
  return updated;
}

// ==============================================================================
// 3. FEE STRUCTURES SERVICE
// ==============================================================================

export async function getFeeStructures(): Promise<FeeStructure[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    const { data, error } = await supabase.from('fee_structures').select('*');
    if (!error && data && data.length > 0) return data as FeeStructure[];
  }
  return getLocal<FeeStructure[]>(LOCAL_STORAGE_KEYS.FEE_STRUCTURES, DEFAULT_FEE_STRUCTURES);
}

export async function createFeeStructure(fs: Omit<FeeStructure, 'id'>): Promise<FeeStructure> {
  const newFs: FeeStructure = {
    ...fs,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  };
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('fee_structures').insert(newFs);
  }
  const all = getLocal<FeeStructure[]>(LOCAL_STORAGE_KEYS.FEE_STRUCTURES, DEFAULT_FEE_STRUCTURES);
  all.push(newFs);
  setLocal(LOCAL_STORAGE_KEYS.FEE_STRUCTURES, all);
  await logAudit('create_fee_structure', 'fee_structures', newFs.id, newFs);
  return newFs;
}

export async function updateFeeStructure(id: string, updates: Partial<FeeStructure>): Promise<FeeStructure> {
  const all = await getFeeStructures();
  const idx = all.findIndex(f => f.id === id);
  if (idx === -1) throw new Error('Fee structure not found');
  const updated = { ...all[idx], ...updates };
  all[idx] = updated;

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('fee_structures').update(updates).eq('id', id);
  }
  setLocal(LOCAL_STORAGE_KEYS.FEE_STRUCTURES, all);
  await logAudit('update_fee_structure', 'fee_structures', id, updates);
  return updated;
}

export async function deleteFeeStructure(id: string): Promise<void> {
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('fee_structures').delete().eq('id', id);
  }
  const all = getLocal<FeeStructure[]>(LOCAL_STORAGE_KEYS.FEE_STRUCTURES, DEFAULT_FEE_STRUCTURES);
  setLocal(LOCAL_STORAGE_KEYS.FEE_STRUCTURES, all.filter(f => f.id !== id));
  await logAudit('delete_fee_structure', 'fee_structures', id, {});
}

// ==============================================================================
// 4. STUDENTS SERVICE
// ==============================================================================

export async function getStudents(): Promise<Student[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    const { data, error } = await supabase.from('students').select('*').order('name', { ascending: true });
    if (!error && data && data.length > 0) return data as Student[];
  }
  return getLocal<Student[]>(LOCAL_STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS);
}

export async function getStudentById(id: string): Promise<Student | null> {
  const students = await getStudents();
  return students.find(s => s.id === id || s.student_id === id) || null;
}

export async function createStudent(stu: Omit<Student, 'id' | 'student_id' | 'created_at'>): Promise<Student> {
  const students = await getStudents();
  const settings = await getSettings();
  const prefix = settings.student_prefix || 'STU';
  const nextNum = students.length + 1;
  const studentCode = `I2B-${prefix}-${String(nextNum).padStart(3, '0')}`;

  const newStudent: Student = {
    ...stu,
    id: crypto.randomUUID(),
    student_id: studentCode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('students').insert(newStudent);
  }
  students.push(newStudent);
  setLocal(LOCAL_STORAGE_KEYS.STUDENTS, students);
  await logAudit('create_student', 'students', newStudent.id, newStudent);
  return newStudent;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  const students = await getStudents();
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Student not found');
  const updated = { ...students[idx], ...updates, updated_at: new Date().toISOString() };
  students[idx] = updated;

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('students').update(updates).eq('id', id);
  }
  setLocal(LOCAL_STORAGE_KEYS.STUDENTS, students);
  await logAudit('update_student', 'students', id, updates);
  return updated;
}

// ==============================================================================
// 5. ENROLLMENTS SERVICE
// ==============================================================================

export async function getEnrollments(): Promise<Enrollment[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  let enrols: Enrollment[] = [];
  if (isOnline) {
    const { data, error } = await supabase.from('enrollments').select('*, student:students(*), programme:programmes(*)');
    if (!error && data && data.length > 0) {
      enrols = data as Enrollment[];
    }
  }
  if (enrols.length === 0) {
    enrols = getLocal<Enrollment[]>(LOCAL_STORAGE_KEYS.ENROLLMENTS, DEFAULT_ENROLLMENTS);
  }

  // Populate student and programme references
  const students = await getStudents();
  const programmes = await getProgrammes();
  const stuMap = new Map(students.map(s => [s.id, s]));
  const progMap = new Map(programmes.map(p => [p.id, p]));

  return enrols.map(e => ({
    ...e,
    student: e.student || stuMap.get(e.student_id),
    programme: e.programme || progMap.get(e.programme_id)
  }));
}

export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  const all = await getEnrollments();
  return all.filter(e => e.student_id === studentId);
}

export async function createEnrollment(enr: Omit<Enrollment, 'id' | 'created_at' | 'student' | 'programme'>): Promise<Enrollment> {
  const newEnr: Enrollment = {
    ...enr,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('enrollments').insert(newEnr);
  }
  const all = getLocal<Enrollment[]>(LOCAL_STORAGE_KEYS.ENROLLMENTS, DEFAULT_ENROLLMENTS);
  all.push(newEnr);
  setLocal(LOCAL_STORAGE_KEYS.ENROLLMENTS, all);
  await logAudit('create_enrollment', 'enrollments', newEnr.id, newEnr);
  return newEnr;
}

export async function updateEnrollment(id: string, updates: Partial<Enrollment>): Promise<Enrollment> {
  const all = await getEnrollments();
  const idx = all.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Enrollment not found');
  const updated = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
  all[idx] = updated;

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('enrollments').update(updates).eq('id', id);
  }
  setLocal(LOCAL_STORAGE_KEYS.ENROLLMENTS, all);
  await logAudit('update_enrollment', 'enrollments', id, updates);
  return updated;
}

// ==============================================================================
// 6. INVOICE GENERATION SERVICE
// ==============================================================================

export interface InvoicePreviewCandidate {
  student: Student;
  enrollments: Enrollment[];
  totalAmount: number;
  isSelected: boolean;
  alreadyInvoiced: boolean;
}

export async function getEligibleBillingPreview(month: number, year: number): Promise<InvoicePreviewCandidate[]> {
  const students = await getStudents();
  const enrollments = await getEnrollments();
  const invoices = await getInvoices();

  const activeStudents = students.filter(s => s.status === 'active');
  const activeEnrols = enrollments.filter(e => e.status === 'active');

  const candidates: InvoicePreviewCandidate[] = [];

  for (const student of activeStudents) {
    const studentEnrols = activeEnrols.filter(e => e.student_id === student.id);
    if (studentEnrols.length === 0) continue;

    // Check if duplicate invoice exists for this student & billing period
    const existing = invoices.find(inv => inv.student_id === student.id && inv.billing_month === month && inv.billing_year === year && inv.status !== 'cancelled');

    const totalAmount = studentEnrols.reduce((sum, e) => sum + Number(e.agreed_fee), 0);

    candidates.push({
      student,
      enrollments: studentEnrols,
      totalAmount,
      isSelected: !existing,
      alreadyInvoiced: !!existing
    });
  }

  return candidates;
}

export async function getInvoices(): Promise<Invoice[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  let invoices: Invoice[] = [];
  if (isOnline) {
    const { data, error } = await supabase.from('invoices').select('*, student:students(*), items:invoice_items(*, programme:programmes(*))').order('invoice_date', { ascending: false });
    if (!error && data) {
      invoices = data as Invoice[];
    }
  }
  if (invoices.length === 0) {
    invoices = getLocal<Invoice[]>(LOCAL_STORAGE_KEYS.INVOICES, []);
  }

  // Populate relations
  const students = await getStudents();
  const stuMap = new Map(students.map(s => [s.id, s]));
  const items = getLocal<InvoiceItem[]>(LOCAL_STORAGE_KEYS.INVOICE_ITEMS, []);

  return invoices.map(inv => ({
    ...inv,
    student: inv.student || stuMap.get(inv.student_id),
    items: inv.items || items.filter(it => it.invoice_id === inv.id)
  }));
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoices = await getInvoices();
  return invoices.find(inv => inv.id === id || inv.invoice_number === id) || null;
}

export async function generateMonthlyInvoices(
  month: number,
  year: number,
  dueDate: string,
  selectedCandidates: { studentId: string; enrollmentIds: string[] }[]
): Promise<Invoice[]> {
  const settings = await getSettings();
  const prefix = settings.invoice_prefix || 'INV';
  const existingInvoices = await getInvoices();
  const allEnrollments = await getEnrollments();
  const enrolMap = new Map(allEnrollments.map(e => [e.id, e]));

  const monthStr = String(month).padStart(2, '0');
  const createdInvoices: Invoice[] = [];
  const createdItems: InvoiceItem[] = [];

  let count = existingInvoices.length + 1;

  for (const cand of selectedCandidates) {
    // Prevent duplicate check
    const duplicate = existingInvoices.find(i => i.student_id === cand.studentId && i.billing_month === month && i.billing_year === year && i.status !== 'cancelled');
    if (duplicate) continue;

    const invoiceId = crypto.randomUUID();
    const invoiceNumber = `${prefix}-${year}${monthStr}-${String(count).padStart(3, '0')}`;
    count++;

    const studentEnrols = cand.enrollmentIds.map(eid => enrolMap.get(eid)).filter(Boolean) as Enrollment[];
    const totalAmount = studentEnrols.reduce((sum, e) => sum + Number(e.agreed_fee), 0);

    const invItems: InvoiceItem[] = studentEnrols.map(e => ({
      id: crypto.randomUUID(),
      invoice_id: invoiceId,
      enrollment_id: e.id,
      programme_id: e.programme_id,
      description: `${e.programme?.name || 'Tuition'} Fee - ${e.class_or_grade} (${e.board || 'Regular'})`,
      class_or_grade: e.class_or_grade,
      amount: Number(e.agreed_fee),
      created_at: new Date().toISOString()
    }));

    const newInvoice: Invoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      student_id: cand.studentId,
      billing_month: month,
      billing_year: year,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      total_amount: totalAmount,
      paid_amount: 0,
      balance_amount: totalAmount,
      status: 'unpaid',
      notes: `Consolidated monthly invoice for ${month}/${year}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: invItems
    };

    createdInvoices.push(newInvoice);
    createdItems.push(...invItems);
  }

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    for (const inv of createdInvoices) {
      const { items, student, ...dbInv } = inv;
      await supabase.from('invoices').insert(dbInv);
    }
    if (createdItems.length > 0) {
      await supabase.from('invoice_items').insert(createdItems);
    }
  }

  const allInvs = getLocal<Invoice[]>(LOCAL_STORAGE_KEYS.INVOICES, []);
  allInvs.unshift(...createdInvoices);
  setLocal(LOCAL_STORAGE_KEYS.INVOICES, allInvs);

  const allItems = getLocal<InvoiceItem[]>(LOCAL_STORAGE_KEYS.INVOICE_ITEMS, []);
  allItems.push(...createdItems);
  setLocal(LOCAL_STORAGE_KEYS.INVOICE_ITEMS, allItems);

  await logAudit('generate_monthly_invoices', 'invoices', `${month}-${year}`, {
    invoicesCount: createdInvoices.length,
    totalBilled: createdInvoices.reduce((s, i) => s + i.total_amount, 0)
  });

  return createdInvoices;
}

export async function cancelInvoice(id: string, reason?: string): Promise<Invoice> {
  const invoices = await getInvoices();
  const idx = invoices.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Invoice not found');
  if (invoices[idx].paid_amount > 0) {
    throw new Error('Cannot cancel an invoice with payments applied. Reverse payments first.');
  }

  const updated: Invoice = {
    ...invoices[idx],
    status: 'cancelled',
    notes: reason ? `${invoices[idx].notes || ''} [Cancelled: ${reason}]` : invoices[idx].notes,
    updated_at: new Date().toISOString()
  };
  invoices[idx] = updated;

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('invoices').update({ status: 'cancelled', notes: updated.notes }).eq('id', id);
  }
  setLocal(LOCAL_STORAGE_KEYS.INVOICES, invoices);
  await logAudit('cancel_invoice', 'invoices', id, { reason });
  return updated;
}

// ==============================================================================
// 7. PAYMENTS & RECEIPT ISSUANCE SERVICE
// ==============================================================================

export interface RecordPaymentPayload {
  student_id: string;
  payment_date: string;
  amount: number;
  payment_method: Payment['payment_method'];
  transaction_reference?: string;
  notes?: string;
  allocations: {
    invoice_id: string;
    allocated_amount: number;
  }[];
}

export async function getPayments(): Promise<Payment[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  let payments: Payment[] = [];
  if (isOnline) {
    const { data, error } = await supabase.from('payments').select('*, student:students(*), allocations:payment_allocations(*), receipt:receipts(*)').order('payment_date', { ascending: false });
    if (!error && data) {
      payments = data as Payment[];
    }
  }
  if (payments.length === 0) {
    payments = getLocal<Payment[]>(LOCAL_STORAGE_KEYS.PAYMENTS, []);
  }

  const students = await getStudents();
  const stuMap = new Map(students.map(s => [s.id, s]));
  const allocs = getLocal<PaymentAllocation[]>(LOCAL_STORAGE_KEYS.PAYMENT_ALLOCATIONS, []);
  const receipts = getLocal<Receipt[]>(LOCAL_STORAGE_KEYS.RECEIPTS, []);
  const recMap = new Map(receipts.map(r => [r.payment_id, r]));

  return payments.map(p => ({
    ...p,
    student: p.student || stuMap.get(p.student_id),
    allocations: p.allocations || allocs.filter(a => a.payment_id === p.id),
    receipt: p.receipt || recMap.get(p.id)
  }));
}

export async function recordPayment(payload: RecordPaymentPayload): Promise<{ payment: Payment; receipt: Receipt }> {
  const settings = await getSettings();
  const payPrefix = settings.payment_prefix || 'PAY';
  const recPrefix = settings.receipt_prefix || 'REC';

  const existingPayments = await getPayments();
  const existingReceipts = await getReceipts();
  const invoices = await getInvoices();

  const payCount = existingPayments.length + 1;
  const recCount = existingReceipts.length + 1;

  const todayStr = payload.payment_date.replace(/-/g, '').substring(0, 6);
  const paymentNumber = `${payPrefix}-${todayStr}-${String(payCount).padStart(3, '0')}`;
  const receiptNumber = `${recPrefix}-${todayStr}-${String(recCount).padStart(3, '0')}`;

  const paymentId = crypto.randomUUID();
  const receiptId = crypto.randomUUID();

  // Validate allocations
  const totalAllocated = payload.allocations.reduce((sum, a) => sum + Number(a.allocated_amount), 0);
  if (Math.abs(totalAllocated - payload.amount) > 0.01) {
    throw new Error(`Total allocated amount (₹${totalAllocated}) must equal payment amount (₹${payload.amount})`);
  }

  const paymentAllocations: PaymentAllocation[] = [];

  // Update invoices
  for (const alloc of payload.allocations) {
    const invIdx = invoices.findIndex(i => i.id === alloc.invoice_id);
    if (invIdx === -1) throw new Error(`Invoice ${alloc.invoice_id} not found`);

    const inv = invoices[invIdx];
    const newPaid = Number(inv.paid_amount) + Number(alloc.allocated_amount);
    if (newPaid > Number(inv.total_amount) + 0.01) {
      throw new Error(`Allocation of ₹${alloc.allocated_amount} exceeds invoice ${inv.invoice_number} balance of ₹${inv.balance_amount}`);
    }

    const newBalance = Number(inv.total_amount) - newPaid;
    const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : inv.status;

    invoices[invIdx] = {
      ...inv,
      paid_amount: newPaid,
      balance_amount: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    paymentAllocations.push({
      id: crypto.randomUUID(),
      payment_id: paymentId,
      invoice_id: alloc.invoice_id,
      allocated_amount: Number(alloc.allocated_amount),
      created_at: new Date().toISOString()
    });
  }

  // Calculate remaining student balance across all invoices
  const studentInvoices = invoices.filter(i => i.student_id === payload.student_id && i.status !== 'cancelled');
  const remainingStudentBalance = studentInvoices.reduce((sum, i) => sum + Number(i.balance_amount), 0);

  const payment: Payment = {
    id: paymentId,
    payment_number: paymentNumber,
    student_id: payload.student_id,
    payment_date: payload.payment_date,
    amount: payload.amount,
    payment_method: payload.payment_method,
    transaction_reference: payload.transaction_reference || null,
    notes: payload.notes || null,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    allocations: paymentAllocations
  };

  const receipt: Receipt = {
    id: receiptId,
    receipt_number: receiptNumber,
    payment_id: paymentId,
    student_id: payload.student_id,
    issue_date: payload.payment_date,
    amount_paid: payload.amount,
    remaining_balance: remainingStudentBalance,
    whatsapp_status: 'not_shared',
    is_immutable: true,
    created_at: new Date().toISOString()
  };

  payment.receipt = receipt;

  // Supabase persist if online
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    const { allocations, receipt: r, student, ...dbPayment } = payment;
    await supabase.from('payments').insert(dbPayment);
    await supabase.from('payment_allocations').insert(paymentAllocations);
    await supabase.from('receipts').insert(receipt);

    for (const alloc of payload.allocations) {
      const inv = invoices.find(i => i.id === alloc.invoice_id);
      if (inv) {
        await supabase.from('invoices').update({
          paid_amount: inv.paid_amount,
          status: inv.status
        }).eq('id', inv.id);
      }
    }
  }

  // Local storage save
  existingPayments.unshift(payment);
  setLocal(LOCAL_STORAGE_KEYS.PAYMENTS, existingPayments);

  const allAllocs = getLocal<PaymentAllocation[]>(LOCAL_STORAGE_KEYS.PAYMENT_ALLOCATIONS, []);
  allAllocs.push(...paymentAllocations);
  setLocal(LOCAL_STORAGE_KEYS.PAYMENT_ALLOCATIONS, allAllocs);

  existingReceipts.unshift(receipt);
  setLocal(LOCAL_STORAGE_KEYS.RECEIPTS, existingReceipts);
  setLocal(LOCAL_STORAGE_KEYS.INVOICES, invoices);

  await logAudit('record_payment', 'payments', paymentId, {
    paymentNumber,
    amount: payload.amount,
    method: payload.payment_method
  });

  return { payment, receipt };
}

export async function reversePayment(paymentId: string, reason: string): Promise<Payment> {
  const payments = await getPayments();
  const idx = payments.findIndex(p => p.id === paymentId);
  if (idx === -1) throw new Error('Payment not found');
  const payment = payments[idx];
  if (payment.status === 'reversed') throw new Error('Payment already reversed');

  const invoices = await getInvoices();
  const allocs = payment.allocations || [];

  // Reverse invoice amounts
  for (const alloc of allocs) {
    const invIdx = invoices.findIndex(i => i.id === alloc.invoice_id);
    if (invIdx !== -1) {
      const inv = invoices[invIdx];
      const newPaid = Math.max(0, Number(inv.paid_amount) - Number(alloc.allocated_amount));
      const newBal = Number(inv.total_amount) - newPaid;
      const newStatus = newBal === Number(inv.total_amount) ? 'unpaid' : newPaid > 0 ? 'partially_paid' : 'unpaid';

      invoices[invIdx] = {
        ...inv,
        paid_amount: newPaid,
        balance_amount: newBal,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
    }
  }

  const updated: Payment = {
    ...payment,
    status: 'reversed',
    notes: `${payment.notes || ''} [Reversed: ${reason}]`,
    updated_at: new Date().toISOString()
  };
  payments[idx] = updated;

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('payments').update({ status: 'reversed', notes: updated.notes }).eq('id', paymentId);
    for (const alloc of allocs) {
      const inv = invoices.find(i => i.id === alloc.invoice_id);
      if (inv) {
        await supabase.from('invoices').update({ paid_amount: inv.paid_amount, status: inv.status }).eq('id', inv.id);
      }
    }
  }

  setLocal(LOCAL_STORAGE_KEYS.PAYMENTS, payments);
  setLocal(LOCAL_STORAGE_KEYS.INVOICES, invoices);

  await logAudit('reverse_payment', 'payments', paymentId, { reason, amount: payment.amount });
  return updated;
}

// ==============================================================================
// 8. RECEIPTS & WHATSAPP SHARING
// ==============================================================================

export async function getReceipts(): Promise<Receipt[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  let receipts: Receipt[] = [];
  if (isOnline) {
    const { data, error } = await supabase.from('receipts').select('*, student:students(*), payment:payments(*)').order('created_at', { ascending: false });
    if (!error && data) {
      receipts = data as Receipt[];
    }
  }
  if (receipts.length === 0) {
    receipts = getLocal<Receipt[]>(LOCAL_STORAGE_KEYS.RECEIPTS, []);
  }

  const students = await getStudents();
  const stuMap = new Map(students.map(s => [s.id, s]));
  const payments = await getPayments();
  const payMap = new Map(payments.map(p => [p.id, p]));

  return receipts.map(r => ({
    ...r,
    student: r.student || stuMap.get(r.student_id),
    payment: r.payment || payMap.get(r.payment_id)
  }));
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const receipts = await getReceipts();
  return receipts.find(r => r.id === id || r.receipt_number === id || r.payment_id === id) || null;
}

export async function updateReceiptWhatsAppStatus(id: string, status: Receipt['whatsapp_status']): Promise<Receipt> {
  const receipts = await getReceipts();
  const idx = receipts.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Receipt not found');

  const updated: Receipt = {
    ...receipts[idx],
    whatsapp_status: status,
    whatsapp_sent_at: status === 'confirmed_sent' ? new Date().toISOString() : receipts[idx].whatsapp_sent_at
  };
  receipts[idx] = updated;

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('receipts').update({
      whatsapp_status: status,
      whatsapp_sent_at: updated.whatsapp_sent_at
    }).eq('id', id);
  }
  setLocal(LOCAL_STORAGE_KEYS.RECEIPTS, receipts);
  return updated;
}

// ==============================================================================
// 9. EXCEL MIGRATION RECORDS SERVICE
// ==============================================================================

export async function getMigrationRecords(): Promise<MigrationRecord[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    const { data, error } = await supabase.from('migration_records').select('*').order('source_programme', { ascending: true });
    if (!error && data && data.length > 0) return data as MigrationRecord[];
  }
  return getLocal<MigrationRecord[]>(LOCAL_STORAGE_KEYS.MIGRATION_RECORDS, DEFAULT_MIGRATION_RECORDS);
}

export async function updateMigrationRecord(id: string, updates: Partial<MigrationRecord>): Promise<MigrationRecord> {
  const records = await getMigrationRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Migration record not found');

  const updated = { ...records[idx], ...updates, updated_at: new Date().toISOString() };
  records[idx] = updated;

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    await supabase.from('migration_records').update(updates).eq('id', id);
  }
  setLocal(LOCAL_STORAGE_KEYS.MIGRATION_RECORDS, records);

  // If status is verified, mark matching enrollment as verified
  if (updates.verification_status === 'verified' && updated.matched_enrollment_id) {
    await updateEnrollment(updated.matched_enrollment_id, { is_verified: true });
  }

  return updated;
}

export async function batchVerifyMigrationRecords(ids: string[]): Promise<void> {
  for (const id of ids) {
    await updateMigrationRecord(id, { verification_status: 'verified' });
  }
}

// ==============================================================================
// 10. DASHBOARD & OVERDUE ANALYTICS SERVICE
// ==============================================================================

export interface DashboardMetrics {
  totalActiveStudents: number;
  totalActiveEnrollments: number;
  currentMonthInvoiced: number;
  currentMonthCollected: number;
  currentOutstanding: number;
  overdueInvoicesCount: number;
  programmeDistribution: { name: string; count: number; feeTotal: number }[];
  monthlyCollectionTrend: { month: string; billed: number; collected: number }[];
  recentPayments: Payment[];
  recentInvoices: Invoice[];
  migrationSummary: {
    totalRecords: number;
    verifiedCount: number;
    pendingCount: number;
    flaggedCount: number;
    totalListedFee: number;
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const students = await getStudents();
  const enrollments = await getEnrollments();
  const invoices = await getInvoices();
  const payments = await getPayments();
  const programmes = await getProgrammes();
  const migrationRecords = await getMigrationRecords();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const activeStudents = students.filter(s => s.status === 'active');
  const activeEnrollments = enrollments.filter(e => e.status === 'active');

  // Current month metrics
  const currentMonthInvoices = invoices.filter(i => i.billing_month === currentMonth && i.billing_year === currentYear && i.status !== 'cancelled');
  const currentMonthInvoiced = currentMonthInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);

  // Payments made in current month
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const currentMonthPayments = payments.filter(p => p.status === 'completed' && p.payment_date.startsWith(currentMonthStr));
  const currentMonthCollected = currentMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Total Outstanding across all active invoices
  const allActiveInvoices = invoices.filter(i => i.status !== 'cancelled' && i.status !== 'paid');
  const currentOutstanding = allActiveInvoices.reduce((sum, i) => sum + Number(i.balance_amount), 0);

  // Overdue count (due date passed and balance > 0)
  const todayStr = now.toISOString().split('T')[0];
  const overdueInvoices = invoices.filter(i => i.status !== 'cancelled' && i.status !== 'paid' && i.due_date < todayStr);

  // Programme distribution
  const programmeDistribution = programmes.map(p => {
    const pEnrols = activeEnrollments.filter(e => e.programme_id === p.id);
    const feeTotal = pEnrols.reduce((sum, e) => sum + Number(e.agreed_fee), 0);
    return {
      name: p.name,
      count: pEnrols.length,
      feeTotal
    };
  });

  // Monthly collection trend for last 6 months
  const monthlyCollectionTrend: { month: string; billed: number; collected: number }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const label = `${monthNames[m - 1]} ${y}`;

    const mInvs = invoices.filter(inv => inv.billing_month === m && inv.billing_year === y && inv.status !== 'cancelled');
    const billed = mInvs.reduce((s, inv) => s + Number(inv.total_amount), 0);

    const mPrefix = `${y}-${String(m).padStart(2, '0')}`;
    const mPays = payments.filter(p => p.status === 'completed' && p.payment_date.startsWith(mPrefix));
    const collected = mPays.reduce((s, p) => s + Number(p.amount), 0);

    monthlyCollectionTrend.push({
      month: label,
      billed,
      collected
    });
  }

  // Migration summary
  const verifiedCount = migrationRecords.filter(m => m.verification_status === 'verified').length;
  const flaggedCount = migrationRecords.filter(m => m.verification_status === 'flagged').length;
  const pendingCount = migrationRecords.filter(m => m.verification_status === 'pending').length;
  const totalListedFee = migrationRecords.reduce((s, m) => s + Number(m.original_fee), 0);

  return {
    totalActiveStudents: activeStudents.length,
    totalActiveEnrollments: activeEnrollments.length,
    currentMonthInvoiced,
    currentMonthCollected,
    currentOutstanding,
    overdueInvoicesCount: overdueInvoices.length,
    programmeDistribution,
    monthlyCollectionTrend,
    recentPayments: payments.slice(0, 5),
    recentInvoices: invoices.slice(0, 5),
    migrationSummary: {
      totalRecords: migrationRecords.length,
      verifiedCount,
      pendingCount,
      flaggedCount,
      totalListedFee
    }
  };
}

export async function getOverdueInvoices(): Promise<Invoice[]> {
  const invoices = await getInvoices();
  const todayStr = new Date().toISOString().split('T')[0];
  return invoices
    .filter(i => i.status !== 'cancelled' && i.status !== 'paid' && i.due_date < todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

// ==============================================================================
// 11. AUDIT LOGS & BACKUP SERVICE
// ==============================================================================

export async function logAudit(action: string, entity_type: string, entity_id?: string, details?: any) {
  const log: AuditLog = {
    id: crypto.randomUUID(),
    action,
    entity_type,
    entity_id: entity_id || null,
    details: details || {},
    actor_email: 'admin@i2b-edu.com',
    created_at: new Date().toISOString()
  };

  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    try {
      await supabase.from('audit_logs').insert(log);
    } catch {}
  }
  const all = getLocal<AuditLog[]>(LOCAL_STORAGE_KEYS.AUDIT_LOGS, []);
  all.unshift(log);
  if (all.length > 500) all.pop(); // keep last 500
  setLocal(LOCAL_STORAGE_KEYS.AUDIT_LOGS, all);
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const isOnline = await isSupabaseSchemaAvailable();
  if (isOnline) {
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (data && data.length > 0) return data as AuditLog[];
  }
  return getLocal<AuditLog[]>(LOCAL_STORAGE_KEYS.AUDIT_LOGS, []);
}

export async function exportFullDatabase(): Promise<string> {
  const dump = {
    exportDate: new Date().toISOString(),
    settings: await getSettings(),
    programmes: await getProgrammes(),
    feeStructures: await getFeeStructures(),
    students: await getStudents(),
    enrollments: await getEnrollments(),
    invoices: await getInvoices(),
    payments: await getPayments(),
    receipts: await getReceipts(),
    migrationRecords: await getMigrationRecords(),
    auditLogs: await getAuditLogs()
  };
  return JSON.stringify(dump, null, 2);
}

export async function resetToExcelDefaults(): Promise<void> {
  setLocal(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  setLocal(LOCAL_STORAGE_KEYS.PROGRAMMES, DEFAULT_PROGRAMMES);
  setLocal(LOCAL_STORAGE_KEYS.FEE_STRUCTURES, DEFAULT_FEE_STRUCTURES);
  setLocal(LOCAL_STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS);
  setLocal(LOCAL_STORAGE_KEYS.ENROLLMENTS, DEFAULT_ENROLLMENTS);
  setLocal(LOCAL_STORAGE_KEYS.MIGRATION_RECORDS, DEFAULT_MIGRATION_RECORDS);
  setLocal(LOCAL_STORAGE_KEYS.INVOICES, []);
  setLocal(LOCAL_STORAGE_KEYS.INVOICE_ITEMS, []);
  setLocal(LOCAL_STORAGE_KEYS.PAYMENTS, []);
  setLocal(LOCAL_STORAGE_KEYS.PAYMENT_ALLOCATIONS, []);
  setLocal(LOCAL_STORAGE_KEYS.RECEIPTS, []);
  await logAudit('reset_to_excel_defaults', 'system', 'all', { message: 'Restored original Excel seed state' });
}
