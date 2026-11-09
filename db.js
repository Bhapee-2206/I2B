// ==============================================================================
// I2B - Standalone Database & Business Logic Layer (Pure JavaScript)
// Direct Supabase Integration with Instant LocalStorage Offline-First Fallback
// ==============================================================================

const SUPABASE_URL = 'https://bpowmzajdyvddnwrqupq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tOJHMzK7gIQWRpulr2lnpw_6relRYHP';

let supabaseClient = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase client initialization fallback to local storage:', e);
}

const STORAGE_KEYS = {
  SETTINGS: 'i2b_settings_v1',
  PROGRAMMES: 'i2b_programmes_v1',
  FEE_STRUCTURES: 'i2b_fee_structures_v1',
  STUDENTS: 'i2b_students_v1',
  ENROLLMENTS: 'i2b_enrollments_v1',
  INVOICES: 'i2b_invoices_v1',
  PAYMENTS: 'i2b_payments_v1',
  RECEIPTS: 'i2b_receipts_v1'
};

function getStorage(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('getStorage error for ' + key, err);
    return defaultVal;
  }
}

function setStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('setStorage error for ' + key, err);
  }
}

// Generate realistic invoices and receipts from enrollments if not already generated
function generateInitialInvoicesAndPayments(students, enrollments, feeStructures) {
  const invoices = [];
  const payments = [];
  const receipts = [];

  const now = new Date();
  const currentMonthYear = now.toLocaleString('en-US', { month: 'short', year: 'numeric' }); // e.g. "Nov 2026"
  const prevMonthYear = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });

  enrollments.forEach((enr, idx) => {
    const student = students.find(s => s.id === enr.student_id);
    if (!student) return;

    const baseFee = enr.agreed_fee || enr.base_fee || 1000;
    const invNumber = 'INV-2026-' + String(idx + 1).padStart(4, '0');
    const isPaid = (idx % 3 === 0);
    const isPartial = (idx % 3 === 1);
    const paidAmount = isPaid ? baseFee : (isPartial ? Math.round(baseFee / 2) : 0);
    const status = isPaid ? 'PAID' : (isPartial ? 'PARTIAL' : (idx % 5 === 0 ? 'OVERDUE' : 'UNPAID'));
    const dueDay = 10;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay).toISOString().split('T')[0];

    const invoice = {
      id: 'inv-' + (idx + 1),
      invoice_number: invNumber,
      student_id: student.id,
      student_name: student.name,
      enrollment_id: enr.id,
      programme_name: enr.programme_code || 'Tuition',
      class_or_grade: enr.class_or_grade,
      period_month: currentMonthYear,
      tuition_fee: baseFee,
      discount_amount: 0,
      total_amount: baseFee,
      paid_amount: paidAmount,
      balance_due: baseFee - paidAmount,
      due_date: dueDate,
      status: status,
      created_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    };
    invoices.push(invoice);

    if (paidAmount > 0) {
      const payNumber = 'PAY-2026-' + String(payments.length + 1).padStart(4, '0');
      const recNumber = 'REC-2026-' + String(receipts.length + 1).padStart(4, '0');
      const payDate = new Date(now.getFullYear(), now.getMonth(), 2 + (idx % 8)).toISOString().split('T')[0];
      const method = (idx % 2 === 0) ? 'UPI' : ((idx % 3 === 0) ? 'BANK_TRANSFER' : 'CASH');

      const payment = {
        id: 'pay-' + (payments.length + 1),
        payment_number: payNumber,
        receipt_number: recNumber,
        invoice_id: invoice.id,
        student_id: student.id,
        student_name: student.name,
        amount: paidAmount,
        payment_method: method,
        reference_number: method === 'CASH' ? 'CASH-COUNTER' : 'UPI/' + Math.floor(1000000000 + Math.random() * 9000000000),
        payment_date: payDate,
        notes: 'Monthly fee payment for ' + currentMonthYear,
        created_at: payDate + 'T10:00:00Z'
      };
      payments.push(payment);

      const receipt = {
        id: 'rec-' + (receipts.length + 1),
        receipt_number: recNumber,
        payment_id: payment.id,
        invoice_id: invoice.id,
        student_id: student.id,
        student_name: student.name,
        student_code: student.student_id,
        programme_name: invoice.programme_name,
        class_or_grade: invoice.class_or_grade,
        amount: paidAmount,
        payment_method: method,
        reference_number: payment.reference_number,
        period_month: currentMonthYear,
        remaining_balance: invoice.balance_due,
        receipt_date: payDate,
        phone: student.whatsapp_number || '+91 98765 43210'
      };
      receipts.push(receipt);
    }
  });

  return { invoices, payments, receipts };
}

// Global I2B Database Controller
window.I2B_DB = {
  supabase: supabaseClient,

  async init() {
    // 1. Seed fallback local storage if needed
    if (!localStorage.getItem(STORAGE_KEYS.PROGRAMMES)) {
      setStorage(STORAGE_KEYS.PROGRAMMES, window.DEFAULT_PROGRAMMES || []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.FEE_STRUCTURES)) {
      setStorage(STORAGE_KEYS.FEE_STRUCTURES, window.DEFAULT_FEE_STRUCTURES || []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      setStorage(STORAGE_KEYS.SETTINGS, window.DEFAULT_SETTINGS || {
        institution_name: 'I2B Educational Institution',
        subtitle: 'Student & Monthly Fee Management',
        currency_symbol: '₹',
        contact_phone: '+91 98765 43210',
        contact_email: 'admin@i2b-edu.com',
        address: 'Chennai, Tamil Nadu',
        default_due_day: 10
      });
    }
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS) || getStorage(STORAGE_KEYS.STUDENTS, []).length === 0) {
      setStorage(STORAGE_KEYS.STUDENTS, window.DEFAULT_STUDENTS || []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ENROLLMENTS) || getStorage(STORAGE_KEYS.ENROLLMENTS, []).length === 0) {
      setStorage(STORAGE_KEYS.ENROLLMENTS, window.DEFAULT_ENROLLMENTS || []);
    }

    // Generate starter invoices/payments if missing
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      const students = getStorage(STORAGE_KEYS.STUDENTS, []);
      const enrollments = getStorage(STORAGE_KEYS.ENROLLMENTS, []);
      const feeStructures = getStorage(STORAGE_KEYS.FEE_STRUCTURES, []);
      const generated = generateInitialInvoicesAndPayments(students, enrollments, feeStructures);
      setStorage(STORAGE_KEYS.INVOICES, generated.invoices);
      setStorage(STORAGE_KEYS.PAYMENTS, generated.payments);
      setStorage(STORAGE_KEYS.RECEIPTS, generated.receipts);
    }

    // Test Supabase connection silently
    this.checkSupabase();
  },

  async checkSupabase() {
    if (!this.supabase) return false;
    try {
      const { data, error } = await this.supabase.from('programmes').select('id').limit(1);
      const isOnline = !error;
      window.isSupabaseConnected = isOnline;
      const statusPill = document.getElementById('supabase-status-pill');
      if (statusPill) {
        if (isOnline) {
          statusPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span class="text-xs text-emerald-300 font-medium">Supabase Connected</span>';
        } else {
          statusPill.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> <span class="text-xs text-amber-300 font-medium">Offline / Local Store</span>';
        }
      }
      return isOnline;
    } catch {
      window.isSupabaseConnected = false;
      return false;
    }
  },

  // Settings
  getSettings() {
    return getStorage(STORAGE_KEYS.SETTINGS, {});
  },
  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    setStorage(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // Students
  getStudents() {
    return getStorage(STORAGE_KEYS.STUDENTS, []);
  },
  getStudentById(id) {
    const list = this.getStudents();
    return list.find(s => s.id === id || s.student_id === id) || null;
  },
  addStudent(studentData) {
    const students = this.getStudents();
    const newId = 'stu-' + Date.now();
    const count = students.length + 1;
    const studentCode = 'I2B-STU-' + String(count).padStart(3, '0');

    const newStudent = {
      id: newId,
      student_id: studentCode,
      name: studentData.name,
      parent_name: studentData.parent_name || '',
      whatsapp_number: studentData.whatsapp_number || '',
      alt_phone: studentData.alt_phone || '',
      address: studentData.address || 'Chennai, Tamil Nadu',
      admission_date: studentData.admission_date || new Date().toISOString().split('T')[0],
      status: studentData.status || 'active',
      notes: studentData.notes || '',
      created_at: new Date().toISOString()
    };

    students.unshift(newStudent);
    setStorage(STORAGE_KEYS.STUDENTS, students);

    // If enrollment data was provided during registration, auto-create enrollment & first invoice
    if (studentData.programme_id && studentData.class_or_grade) {
      this.addEnrollment({
        student_id: newId,
        programme_id: studentData.programme_id,
        class_or_grade: studentData.class_or_grade,
        board: studentData.board || 'CBSE',
        agreed_fee: Number(studentData.fee) || 1000
      });
    }

    return newStudent;
  },
  updateStudent(id, studentData) {
    const students = this.getStudents();
    const idx = students.findIndex(s => s.id === id || s.student_id === id);
    if (idx !== -1) {
      students[idx] = { ...students[idx], ...studentData, updated_at: new Date().toISOString() };
      setStorage(STORAGE_KEYS.STUDENTS, students);
      return students[idx];
    }
    return null;
  },

  // Enrollments
  getEnrollments() {
    return getStorage(STORAGE_KEYS.ENROLLMENTS, []);
  },
  getEnrollmentsByStudent(studentId) {
    const list = this.getEnrollments();
    return list.filter(e => e.student_id === studentId);
  },
  addEnrollment(enrData) {
    const enrollments = this.getEnrollments();
    const programmes = this.getProgrammes();
    const prog = programmes.find(p => p.id === enrData.programme_id || p.code === enrData.programme_code);

    const newEnrollment = {
      id: 'enr-' + Date.now(),
      student_id: enrData.student_id,
      programme_id: enrData.programme_id || (prog ? prog.id : 'b0000000-0000-0000-0000-000000000001'),
      programme_code: prog ? prog.code : (enrData.programme_code || 'SUBJECT'),
      class_or_grade: enrData.class_or_grade,
      board: enrData.board || 'CBSE',
      academic_year: enrData.academic_year || '2026-2027',
      start_date: enrData.start_date || new Date().toISOString().split('T')[0],
      agreed_fee: Number(enrData.agreed_fee) || 1000,
      status: 'active',
      created_at: new Date().toISOString()
    };

    enrollments.unshift(newEnrollment);
    setStorage(STORAGE_KEYS.ENROLLMENTS, enrollments);

    // Also auto-generate initial monthly invoice for this enrollment
    const student = this.getStudentById(enrData.student_id);
    if (student) {
      this.addInvoice({
        student_id: student.id,
        enrollment_id: newEnrollment.id,
        period_month: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        tuition_fee: newEnrollment.agreed_fee
      });
    }

    return newEnrollment;
  },

  // Programmes & Fee Structures
  getProgrammes() {
    return getStorage(STORAGE_KEYS.PROGRAMMES, window.DEFAULT_PROGRAMMES || []);
  },
  getFeeStructures() {
    return getStorage(STORAGE_KEYS.FEE_STRUCTURES, window.DEFAULT_FEE_STRUCTURES || []);
  },

  normalizeClass(c) {
    if (!c) return '';
    let s = c.toString().trim().toLowerCase();
    if (s.endsWith('.0')) s = s.slice(0, -2);
    if (s.endsWith('st') || s.endsWith('nd') || s.endsWith('rd') || s.endsWith('th')) {
      const prefix = s.slice(0, -2);
      if (!isNaN(Number(prefix)) && prefix.length > 0) s = prefix;
    }
    return s;
  },

  findFee(programmeIdOrCode, classOrGrade, board) {
    const list = this.getFeeStructures();
    const programmes = this.getProgrammes();
    const prog = programmes.find(p => p.id === programmeIdOrCode || p.code === programmeIdOrCode);
    const targetProgId = prog ? prog.id : programmeIdOrCode;

    const targetNorm = this.normalizeClass(classOrGrade);
    const targetBoard = (board || '').trim().toLowerCase();

    // 1. Exact match on class and board
    const match1 = list.find(f => {
      if (f.programme_id !== targetProgId) return false;
      if (this.normalizeClass(f.class_or_grade) !== targetNorm) return false;
      const fb = (f.board || '').trim().toLowerCase();
      return targetBoard && fb ? targetBoard === fb : true;
    });
    if (match1) return match1.monthly_fee;

    // 2. Fallback to class match
    const match2 = list.find(f => f.programme_id === targetProgId && this.normalizeClass(f.class_or_grade) === targetNorm);
    return match2 ? match2.monthly_fee : null;
  },

  getNextClass(currentClass, programmeCode) {
    const norm = this.normalizeClass(currentClass);
    const isSubject = !programmeCode || programmeCode.toUpperCase() === 'SUBJECT';

    if (isSubject) {
      if (norm === 'lkg') return 'UKG';
      if (norm === 'ukg') return '1st';
      const num = parseInt(norm, 10);
      if (!isNaN(num) && num >= 1 && num < 12) {
        const nextNum = num + 1;
        const suffix = nextNum === 2 ? 'nd' : nextNum === 3 ? 'rd' : 'th';
        return `${nextNum}${suffix}`;
      }
      return null;
    } else {
      if (norm === 'basic' || norm === 'school') return '1st';
      const num = parseInt(norm, 10);
      if (!isNaN(num) && num >= 1 && num < 9) {
        const nextNum = num + 1;
        const suffix = nextNum === 2 ? 'nd' : nextNum === 3 ? 'rd' : 'th';
        return `${nextNum}${suffix}`;
      }
      return null;
    }
  },

  promoteStudent(studentId) {
    const enrollments = this.getEnrollments();
    const studentEnrs = enrollments.filter(e => e.student_id === studentId && e.status === 'active');
    if (studentEnrs.length === 0) return { success: false, message: 'No active enrollment found to promote' };

    let promotedCount = 0;
    studentEnrs.forEach(enr => {
      const nextClass = this.getNextClass(enr.class_or_grade, enr.programme_code);
      if (nextClass) {
        enr.class_or_grade = nextClass;
        // Lookup auto fee for newly promoted class
        const autoFee = this.findFee(enr.programme_id, nextClass, enr.board);
        if (autoFee) enr.agreed_fee = autoFee;
        promotedCount++;
      }
    });

    if (promotedCount > 0) {
      setStorage(STORAGE_KEYS.ENROLLMENTS, enrollments);
      return { success: true, count: promotedCount };
    }
    return { success: false, message: 'Student is already at the highest grade level' };
  },

  // Invoices
  getInvoices() {
    return getStorage(STORAGE_KEYS.INVOICES, []);
  },
  getInvoicesByStudent(studentId) {
    return this.getInvoices().filter(inv => inv.student_id === studentId);
  },
  addInvoice(invData) {
    const invoices = this.getInvoices();
    const student = this.getStudentById(invData.student_id);
    const count = invoices.length + 1;
    const invNumber = 'INV-' + new Date().getFullYear() + '-' + String(count).padStart(4, '0');

    const tuition = Number(invData.tuition_fee) || 0;
    const discount = Number(invData.discount_amount) || 0;
    const total = Math.max(0, tuition - discount);
    const dueDate = invData.due_date || new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().split('T')[0];

    const newInvoice = {
      id: 'inv-' + Date.now(),
      invoice_number: invNumber,
      student_id: invData.student_id,
      student_name: student ? student.name : 'Unknown',
      enrollment_id: invData.enrollment_id || '',
      programme_name: invData.programme_name || 'Tuition',
      class_or_grade: invData.class_or_grade || '',
      period_month: invData.period_month || new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      tuition_fee: tuition,
      discount_amount: discount,
      total_amount: total,
      paid_amount: 0,
      balance_due: total,
      due_date: dueDate,
      status: 'UNPAID',
      created_at: new Date().toISOString()
    };

    invoices.unshift(newInvoice);
    setStorage(STORAGE_KEYS.INVOICES, invoices);
    return newInvoice;
  },

  // Payments & Receipts
  getPayments() {
    return getStorage(STORAGE_KEYS.PAYMENTS, []);
  },
  getPaymentsByStudent(studentId) {
    return this.getPayments().filter(p => p.student_id === studentId);
  },
  getReceipts() {
    return getStorage(STORAGE_KEYS.RECEIPTS, []);
  },
  getReceiptById(receiptId) {
    return this.getReceipts().find(r => r.id === receiptId || r.receipt_number === receiptId);
  },

  addPayment(payData) {
    const payments = this.getPayments();
    const invoices = this.getInvoices();
    const receipts = this.getReceipts();

    const invoice = invoices.find(inv => inv.id === payData.invoice_id);
    const student = this.getStudentById(payData.student_id || (invoice ? invoice.student_id : ''));
    if (!student) throw new Error('Student not found');

    const amount = Number(payData.amount) || 0;
    if (amount <= 0) throw new Error('Payment amount must be greater than 0');

    const payCount = payments.length + 1;
    const payNumber = 'PAY-' + new Date().getFullYear() + '-' + String(payCount).padStart(4, '0');
    const recNumber = 'REC-' + new Date().getFullYear() + '-' + String(payCount).padStart(4, '0');
    const payDate = payData.payment_date || new Date().toISOString().split('T')[0];
    const method = payData.payment_method || 'CASH';

    // 1. Update Invoice status & balance
    let remainingBalance = 0;
    if (invoice) {
      invoice.paid_amount = (invoice.paid_amount || 0) + amount;
      invoice.balance_due = Math.max(0, invoice.total_amount - invoice.paid_amount);
      remainingBalance = invoice.balance_due;
      if (invoice.balance_due === 0) {
        invoice.status = 'PAID';
      } else {
        invoice.status = 'PARTIAL';
      }
      setStorage(STORAGE_KEYS.INVOICES, invoices);
    }

    // 2. Create Payment Record
    const newPayment = {
      id: 'pay-' + Date.now(),
      payment_number: payNumber,
      receipt_number: recNumber,
      invoice_id: invoice ? invoice.id : '',
      student_id: student.id,
      student_name: student.name,
      amount: amount,
      payment_method: method,
      reference_number: payData.reference_number || (method === 'CASH' ? 'CASH-COUNTER' : 'REF-' + Date.now().toString().slice(-6)),
      payment_date: payDate,
      notes: payData.notes || 'Tuition fee payment',
      created_at: new Date().toISOString()
    };
    payments.unshift(newPayment);
    setStorage(STORAGE_KEYS.PAYMENTS, payments);

    // 3. Generate Formal Receipt
    const newReceipt = {
      id: 'rec-' + Date.now(),
      receipt_number: recNumber,
      payment_id: newPayment.id,
      invoice_id: invoice ? invoice.id : '',
      student_id: student.id,
      student_name: student.name,
      student_code: student.student_id,
      programme_name: invoice ? invoice.programme_name : 'Tuition Fee',
      class_or_grade: invoice ? invoice.class_or_grade : '',
      amount: amount,
      payment_method: method,
      reference_number: newPayment.reference_number,
      period_month: invoice ? invoice.period_month : new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      remaining_balance: remainingBalance,
      receipt_date: payDate,
      phone: student.whatsapp_number || ''
    };
    receipts.unshift(newReceipt);
    setStorage(STORAGE_KEYS.RECEIPTS, receipts);

    return { payment: newPayment, receipt: newReceipt };
  },

  // WhatsApp Integration
  generateWhatsAppURL(phone, message) {
    if (!phone) return null;
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  },

  sendWhatsAppReceipt(receiptId) {
    const receipt = this.getReceiptById(receiptId);
    if (!receipt) return false;
    const settings = this.getSettings();
    const curr = settings.currency_symbol || '₹';

    const msg = `*OFFICIAL FEE RECEIPT - ${settings.institution_name || 'I2B'}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Receipt No:* ${receipt.receipt_number}\n` +
      `*Student:* ${receipt.student_name} (${receipt.student_code || 'ID: STU'})\n` +
      `*Programme:* ${receipt.programme_name || 'Tuition'} - Class ${receipt.class_or_grade || ''}\n` +
      `*Period:* ${receipt.period_month}\n` +
      `*Amount Received:* ${curr}${receipt.amount.toLocaleString('en-IN')}\n` +
      `*Payment Method:* ${receipt.payment_method}\n` +
      `*Remaining Balance:* ${curr}${receipt.remaining_balance.toLocaleString('en-IN')}\n` +
      `*Date:* ${receipt.receipt_date}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Thank you for your payment! Please keep this message for your records.`;

    const url = this.generateWhatsAppURL(receipt.phone, msg);
    if (url) {
      window.open(url, '_blank');
      return true;
    } else {
      alert('Student does not have a valid WhatsApp/Phone number entered.');
      return false;
    }
  },

  sendWhatsAppReminder(studentId, invoiceId) {
    const student = this.getStudentById(studentId);
    const invoice = this.getInvoices().find(i => i.id === invoiceId);
    if (!student || !invoice) return false;
    const settings = this.getSettings();
    const curr = settings.currency_symbol || '₹';

    const msg = `*FEE PAYMENT REMINDER - ${settings.institution_name || 'I2B'}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear Parent / Student,\n` +
      `This is a gentle reminder that fee payment for *${student.name}* is pending:\n` +
      `*Invoice No:* ${invoice.invoice_number}\n` +
      `*Month:* ${invoice.period_month}\n` +
      `*Due Balance:* ${curr}${invoice.balance_due.toLocaleString('en-IN')}\n` +
      `*Due Date:* ${invoice.due_date}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Kindly arrange payment at your earliest convenience. Thank you!`;

    const url = this.generateWhatsAppURL(student.whatsapp_number, msg);
    if (url) {
      window.open(url, '_blank');
      return true;
    } else {
      alert('Student does not have a phone number entered.');
      return false;
    }
  },

  // PDF Generation using jsPDF
  downloadReceiptPDF(receiptId) {
    const receipt = this.getReceiptById(receiptId);
    if (!receipt) return;
    const settings = this.getSettings();

    if (!window.jspdf || !window.jspdf.jsPDF) {
      window.print();
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

    // Colors
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 148, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.institution_name || 'I2B EDUCATIONAL INSTITUTION', 74, 12, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(settings.subtitle || 'Student & Monthly Fee Management', 74, 18, { align: 'center' });
    doc.text(settings.contact_phone || '+91 98765 43210', 74, 23, { align: 'center' });

    // Receipt Badge
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.roundedRect(12, 34, 124, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('OFFICIAL FEE PAYMENT RECEIPT', 74, 40.5, { align: 'center' });

    // Details Grid
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);

    const rows = [
      ['Receipt Number:', receipt.receipt_number, 'Date:', receipt.receipt_date],
      ['Student Name:', receipt.student_name, 'Student ID:', receipt.student_code || '-'],
      ['Programme:', receipt.programme_name || 'Tuition', 'Class / Grade:', receipt.class_or_grade || '-'],
      ['Fee Period:', receipt.period_month, 'Payment Method:', receipt.payment_method],
      ['Reference ID:', receipt.reference_number || 'CASH', '', '']
    ];

    let y = 52;
    rows.forEach(r => {
      doc.setFont('helvetica', 'bold');
      doc.text(r[0], 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(r[1], 48, y);

      if (r[2]) {
        doc.setFont('helvetica', 'bold');
        doc.text(r[2], 90, y);
        doc.setFont('helvetica', 'normal');
        doc.text(r[3], 115, y);
      }
      y += 8;
    });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, 133, y);
    y += 10;

    // Amount Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, y, 118, 22, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Amount Received:', 22, y + 8);

    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`${settings.currency_symbol || 'INR'} ${receipt.amount.toLocaleString('en-IN')}`, 22, y + 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Remaining Balance:', 80, y + 8);

    doc.setFontSize(12);
    doc.setTextColor(receipt.remaining_balance > 0 ? 220 : 71, 38, 38);
    doc.text(`${settings.currency_symbol || 'INR'} ${receipt.remaining_balance.toLocaleString('en-IN')}`, 80, y + 16);

    y += 34;

    // Footer note & signature
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('This is a computer-generated receipt and requires no physical seal.', 74, y, { align: 'center' });
    doc.text('Thank you for choosing I2B for academic excellence!', 74, y + 5, { align: 'center' });

    doc.save(`${receipt.receipt_number}_${receipt.student_name}.pdf`);
  }
};
