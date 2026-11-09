import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  CreditCard,
  Plus,
  Phone,
  FileText,
  Calendar,
  IndianRupee,
  Receipt as ReceiptIcon,
  CheckCircle2,
  AlertCircle,
  Share2,
  Printer,
  Download,
  BookOpen,
  Edit,
  Clock
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Student, Enrollment, Invoice, Payment, Programme, Receipt, PaymentMethod, FeeStructure } from '../types';
import {
  getStudentById,
  getEnrollmentsByStudent,
  getInvoices,
  getPayments,
  getProgrammes,
  createEnrollment,
  updateEnrollment,
  getReceipts,
  getFeeStructures,
  recordPayment
} from '../services/dbService';
import { useSettings } from '../context/SettingsContext';
import { downloadReceiptPdf, printReceiptPdf } from '../services/receiptPdfService';
import { buildReceiptWhatsAppMessage, launchManualWhatsAppShare, confirmWhatsAppSent } from '../services/whatsappService';
import { buildStudentLedger } from '../services/reportService';
import { toast } from 'sonner';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab: 'enrolments' | 'invoices' | 'payments' | 'ledger'
  const [activeTab, setActiveTab] = useState<'enrolments' | 'invoices' | 'payments' | 'ledger'>('enrolments');

  // Enrolment Modal
  const [enrolModalOpen, setEnrolModalOpen] = useState(false);
  const [editingEnrol, setEditingEnrol] = useState<Enrollment | null>(null);
  const [enrolForm, setEnrolForm] = useState({
    programme_id: '',
    class_or_grade: '',
    board: 'Matric',
    agreed_fee: 0,
    start_date: new Date().toISOString().split('T')[0],
    status: 'active' as Enrollment['status'],
    notes: '',
  });

  // Inline Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payAllocations, setPayAllocations] = useState<{ [id: string]: number }>({});
  const [paySubmitting, setPaySubmitting] = useState(false);

  const loadStudentData = async () => {
    if (!id) return;
    try {
      const [stu, enrs, allInvs, allPays, allRecs, progs, fees] = await Promise.all([
        getStudentById(id),
        getEnrollmentsByStudent(id),
        getInvoices(),
        getPayments(),
        getReceipts(),
        getProgrammes(),
        getFeeStructures(),
      ]);

      setStudent(stu);
      setEnrollments(enrs);
      setInvoices(allInvs.filter((i) => i.student_id === id));
      setPayments(allPays.filter((p) => p.student_id === id));
      setReceipts(allRecs.filter((r) => r.student_id === id));
      setProgrammes(progs);
      setFeeStructures(fees);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} height="h-20" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-slate-800">Student not found</h3>
        <Button className="mt-4" onClick={() => navigate('/students')}>
          Back to Students
        </Button>
      </div>
    );
  }

  // Summary figures
  const totalBilled = invoices.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPaid = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0);
  const outstandingBalance = invoices.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + Number(i.balance_amount), 0);
  const totalMonthlyAgreed = enrollments.filter((e) => e.status === 'active').reduce((s, e) => s + Number(e.agreed_fee), 0);

  // Ledger
  const ledgerEntries = buildStudentLedger(student.id, invoices, payments);

  const SUBJECT_CLASSES = ['LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  const HINDI_GRADES = ['Basic', 'School', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

  const selectedProg = programmes.find(p => p.id === enrolForm.programme_id);
  const classOptions = selectedProg?.code === 'SUBJECT' ? SUBJECT_CLASSES : HINDI_GRADES;
  const boardOptions = selectedProg?.code === 'SUBJECT' ? ['Matric', 'CBSE'] : ['Virtual', 'Online', 'Standard'];

  const handleProgrammeChangeInEnrol = (progId: string) => {
    const prog = programmes.find(p => p.id === progId);
    const boards = prog?.code === 'SUBJECT' ? ['Matric', 'CBSE'] : ['Virtual', 'Online', 'Standard'];
    setEnrolForm(prev => ({
      ...prev,
      programme_id: progId,
      class_or_grade: '',
      board: boards[0] || 'Matric',
      agreed_fee: 0,
    }));
  };

  const handleClassChangeInEnrol = (cls: string) => {
    const match = feeStructures.find(
      (f) =>
        f.programme_id === enrolForm.programme_id &&
        f.class_or_grade.toLowerCase() === cls.toLowerCase() &&
        (f.board || '').toLowerCase() === (enrolForm.board || '').toLowerCase()
    );
    setEnrolForm(prev => ({
      ...prev,
      class_or_grade: cls,
      agreed_fee: match ? match.monthly_fee : prev.agreed_fee
    }));
  };

  const handleOpenAddEnrolment = () => {
    setEditingEnrol(null);
    const firstProg = programmes[0];
    setEnrolForm({
      programme_id: firstProg?.id || '',
      class_or_grade: '',
      board: firstProg?.code === 'SUBJECT' ? 'Matric' : 'Virtual',
      agreed_fee: 0,
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: '',
    });
    setEnrolModalOpen(true);
  };

  const openInlinePaymentModal = () => {
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('Cash');
    setPayRef('');
    setPayNotes('');

    const studentUnpaid = invoices.filter(
      (i) => i.status !== 'cancelled' && i.status !== 'paid'
    );
    const allocMap: { [id: string]: number } = {};
    let totalBal = 0;
    if (studentUnpaid.length > 0) {
      allocMap[studentUnpaid[0].id] = Number(studentUnpaid[0].balance_amount);
      totalBal = Number(studentUnpaid[0].balance_amount);
    } else {
      totalBal = totalMonthlyAgreed > 0 ? totalMonthlyAgreed : 500;
    }
    setPayAllocations(allocMap);
    setPayAmount(totalBal > 0 ? totalBal : 500);
    setPaymentModalOpen(true);
  };

  const handleInlinePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    const allocArray = Object.entries(payAllocations)
      .filter(([_, amt]) => Number(amt) > 0)
      .map(([invoice_id, allocated_amount]) => ({
        invoice_id,
        allocated_amount: Number(allocated_amount),
      }));

    const unpaidInvs = invoices.filter(i => i.status !== 'cancelled' && i.status !== 'paid');
    const isDirect = unpaidInvs.length === 0 || allocArray.length === 0;

    setPaySubmitting(true);
    try {
      const { payment, receipt } = await recordPayment({
        student_id: student.id,
        payment_date: payDate,
        amount: Number(payAmount),
        payment_method: payMethod,
        transaction_reference: payRef,
        notes: payNotes,
        allocations: isDirect ? [] : allocArray,
      });

      toast.success(`Payment ${payment.payment_number} recorded! Receipt ${receipt.receipt_number} issued.`);
      setPaymentModalOpen(false);
      await loadStudentData();
    } catch (err: any) {
      toast.error(err.message || 'Payment recording failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleOpenEditEnrolment = (enr: Enrollment) => {
    setEditingEnrol(enr);
    setEnrolForm({
      programme_id: enr.programme_id,
      class_or_grade: enr.class_or_grade,
      board: enr.board || 'Matric',
      agreed_fee: Number(enr.agreed_fee),
      start_date: enr.start_date,
      status: enr.status,
      notes: enr.notes || '',
    });
    setEnrolModalOpen(true);
  };

  const handleSaveEnrolment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrolForm.programme_id || !enrolForm.class_or_grade) {
      toast.error('Please select programme and class/grade');
      return;
    }

    try {
      if (editingEnrol) {
        await updateEnrollment(editingEnrol.id, enrolForm);
        toast.success('Enrolment updated successfully');
      } else {
        await createEnrollment({
          student_id: student.id,
          ...enrolForm,
          is_verified: true,
        });
        toast.success('Enrolled student in new programme');
      }
      setEnrolModalOpen(false);
      await loadStudentData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleShareReceiptWhatsApp = async (rec: Receipt, pay: Payment) => {
    const payload = buildReceiptWhatsAppMessage(student, pay, rec, settings);
    await launchManualWhatsAppShare(payload, rec.id);
    await loadStudentData();
  };

  const handlePrintReceipt = (rec: Receipt, pay: Payment) => {
    const enrSummary = enrollments.map((e) => `${e.programme?.name} (${e.class_or_grade})`).join(', ');
    printReceiptPdf({
      receipt: rec,
      payment: pay,
      student,
      settings,
      enrolmentInfo: enrSummary,
    });
  };

  const handleDownloadReceipt = (rec: Receipt, pay: Payment) => {
    const enrSummary = enrollments.map((e) => `${e.programme?.name} (${e.class_or_grade})`).join(', ');
    downloadReceiptPdf({
      receipt: rec,
      payment: pay,
      student,
      settings,
      enrolmentInfo: enrSummary,
    });
    toast.success('Downloaded PDF Receipt');
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div>
        <button
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3 min-h-[38px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students List</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/20">
              {student.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {student.name}
                </h1>
                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {student.student_id}
                </span>
                <Badge variant={student.status === 'active' ? 'success' : 'neutral'}>
                  {student.status}
                </Badge>
              </div>

              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                {student.parent_name && <span>Parent: <strong className="text-slate-700">{student.parent_name}</strong></span>}
                {student.whatsapp_number && (
                  <span className="flex items-center gap-1 font-mono text-emerald-700 font-medium">
                    <Phone className="w-3 h-3" />
                    {student.whatsapp_number}
                  </span>
                )}
                <span>Joined: {student.admission_date}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              icon={<CreditCard className="w-4 h-4" />}
              onClick={openInlinePaymentModal}
            >
              Record Payment
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Overview Metrics (4 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Monthly Fee</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">₹{totalMonthlyAgreed.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-400">{enrollments.length} programme(s)</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Invoiced</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">₹{totalBilled.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-400">{invoices.length} invoice(s)</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Collected</span>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">₹{totalPaid.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-600 font-medium">{payments.length} payment(s)</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Outstanding Balance</span>
          <p className={`text-xl font-extrabold mt-1 ${outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            ₹{outstandingBalance.toLocaleString('en-IN')}
          </p>
          <span className={`text-[10px] font-medium ${outstandingBalance > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            {outstandingBalance > 0 ? 'Payment pending' : 'Zero balance'}
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'enrolments', label: `Enrolments (${enrollments.length})` },
          { id: 'invoices', label: `Invoices (${invoices.length})` },
          { id: 'payments', label: `Payments & Receipts (${payments.length})` },
          { id: 'ledger', label: 'Student Ledger' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors min-h-[44px] flex items-center px-1 ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: ENROLMENTS                                                     */}
      {/* ===================================================================== */}
      {activeTab === 'enrolments' && (
        <Card>
          <CardHeader
            title="Programme Enrolments"
            subtitle="Central record with multiple course enrolments"
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleOpenAddEnrolment}
              >
                Add Enrolment
              </Button>
            }
          />
          <CardBody className="p-0">
            {enrollments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active enrolments found for this student. Click "Add Enrolment" above.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrollments.map((enr) => (
                  <div key={enr.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {enr.programme?.name || 'Programme'}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {enr.class_or_grade}
                        </span>
                        {enr.board && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {enr.board}
                          </span>
                        )}
                        <Badge variant={enr.status === 'active' ? 'success' : 'neutral'} size="sm">
                          {enr.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Started: {enr.start_date} {enr.notes && `• ${enr.notes}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block">Agreed Monthly Fee</span>
                        <span className="text-base font-extrabold text-emerald-600">
                          ₹{Number(enr.agreed_fee).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Edit className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEditEnrolment(enr)}
                      >
                        Edit Fee
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: INVOICES                                                       */}
      {/* ===================================================================== */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader
            title="Billing & Invoice History"
            subtitle="Consolidated monthly invoices generated by administrator"
          />
          <CardBody className="p-0">
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No invoices generated for this student yet. Use the monthly generator in Invoices tab.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {inv.invoice_number}
                        </span>
                        <Badge
                          variant={inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {inv.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Billing Period: <strong>{inv.billing_month}/{inv.billing_year}</strong> • Due: {inv.due_date}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block">Total / Paid</span>
                        <span className="text-xs font-medium text-slate-700">
                          ₹{inv.total_amount} / <strong className="text-emerald-600">₹{inv.paid_amount}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Balance</span>
                        <span className={`text-sm font-extrabold ${inv.balance_amount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          ₹{inv.balance_amount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PAYMENTS & RECEIPTS                                            */}
      {/* ===================================================================== */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader
            title="Payments & Official Receipts"
            subtitle="Completed collections, downloadable PDF receipts and WhatsApp sharing"
          />
          <CardBody className="p-0">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No payments recorded yet for this student.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const receipt = receipts.find((r) => r.payment_id === p.id);
                  return (
                    <div key={p.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {p.payment_number}
                          </span>
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {p.payment_method}
                          </span>
                          {receipt && (
                            <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {receipt.receipt_number}
                            </span>
                          )}
                          <Badge variant={p.status === 'completed' ? 'success' : 'danger'} size="sm">
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Date: {p.payment_date} {p.transaction_reference && `• Ref: ${p.transaction_reference}`}
                        </p>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-left md:text-right mr-2">
                          <span className="text-[10px] text-slate-400 block">Amount Received</span>
                          <span className="text-base font-extrabold text-emerald-600">
                            ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {receipt && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Download className="w-3.5 h-3.5" />}
                              onClick={() => handleDownloadReceipt(receipt, p)}
                              title="Download PDF"
                            >
                              PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Printer className="w-3.5 h-3.5" />}
                              onClick={() => handlePrintReceipt(receipt, p)}
                              title="Print Receipt"
                            >
                              Print
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Share2 className="w-3.5 h-3.5" />}
                              onClick={() => handleShareReceiptWhatsApp(receipt, p)}
                              title="Share via WhatsApp"
                            >
                              WhatsApp
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: STUDENT LEDGER                                                 */}
      {/* ===================================================================== */}
      {activeTab === 'ledger' && (
        <Card>
          <CardHeader
            title="Student Financial Ledger"
            subtitle="Chronological statement of debits (invoices) and credits (payments)"
          />
          <CardBody className="p-0">
            {ledgerEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No financial activity on this account yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Reference</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-right">Debit (+)</th>
                      <th className="py-2.5 px-4 text-right">Credit (-)</th>
                      <th className="py-2.5 px-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {ledgerEntries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 whitespace-nowrap">{row.date}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              row.type === 'Invoice'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono whitespace-nowrap">{row.reference}</td>
                        <td className="py-2.5 px-4">{row.description}</td>
                        <td className="py-2.5 px-4 text-right font-medium">
                          {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-emerald-600">
                          {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold whitespace-nowrap">
                          ₹{row.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Add / Edit Enrolment Modal */}
      <Modal
        isOpen={enrolModalOpen}
        onClose={() => setEnrolModalOpen(false)}
        title={editingEnrol ? 'Modify Enrolment & Fee' : 'Enrol in Programme'}
        subtitle={`Student: ${student.name} (${student.student_id})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEnrolment} className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Programme <span className="text-rose-500">*</span>
            </label>
            <select
              value={enrolForm.programme_id}
              onChange={(e) => handleProgrammeChangeInEnrol(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
            >
              <option value="">— Select programme —</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Class / Grade <span className="text-rose-500">*</span>
              </label>
              <select
                value={enrolForm.class_or_grade}
                onChange={(e) => handleClassChangeInEnrol(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
              >
                <option value="">— Select class —</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Curriculum Board / Category
              </label>
              <select
                value={enrolForm.board}
                onChange={(e) => setEnrolForm({ ...enrolForm, board: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
              >
                {boardOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Agreed Monthly Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={enrolForm.agreed_fee || ''}
                  onChange={(e) => setEnrolForm({ ...enrolForm, agreed_fee: parseFloat(e.target.value) || 0 })}
                  placeholder="Auto-populated from fee structure"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              </div>
              {enrolForm.agreed_fee > 0 && !editingEnrol && (
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                  ✓ Auto-populated from fee structure
                </p>
              )}
            </div>

            <Input
              label="Start Date"
              type="date"
              value={enrolForm.start_date}
              onChange={(e) => setEnrolForm({ ...enrolForm, start_date: e.target.value })}
              required
            />
          </div>

          <Select
            label="Enrolment Status"
            value={enrolForm.status}
            onChange={(e) => setEnrolForm({ ...enrolForm, status: e.target.value as any })}
            options={[
              { value: 'active', label: 'Active Enrolment' },
              { value: 'completed', label: 'Completed' },
              { value: 'paused', label: 'Paused' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEnrolModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              {editingEnrol ? 'Update Enrolment' : 'Save Enrolment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inline Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment — ${student.name}`}
        subtitle={`Student ID: ${student.student_id}`}
        maxWidth="md"
      >
        <form onSubmit={handleInlinePaymentSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
            <Select
              label="Payment Method"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              options={[
                { value: 'Cash', label: 'Cash at Counter' },
                { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Other', label: 'Other Mode' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Transaction / Reference #"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. UPI Ref, Bank UTR"
            />
            <Input
              label="Payment Amount (₹)"
              type="number"
              step="10"
              value={payAmount}
              onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          {/* Allocation or Direct Mode */}
          {invoices.filter(i => i.status !== 'cancelled' && i.status !== 'paid').length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800">
                Allocate to Invoices
              </div>
              <div className="divide-y divide-slate-100 p-2 space-y-2">
                {invoices
                  .filter(i => i.status !== 'cancelled' && i.status !== 'paid')
                  .map((inv) => (
                    <div key={inv.id} className="p-2 bg-slate-50 rounded flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold font-mono text-slate-900">{inv.invoice_number}</span>
                        <p className="text-[11px] text-slate-500">Balance: ₹{inv.balance_amount}</p>
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          max={inv.balance_amount}
                          value={payAllocations[inv.id] || 0}
                          onChange={(e) => {
                            const updated = { ...payAllocations, [inv.id]: parseFloat(e.target.value) || 0 };
                            setPayAllocations(updated);
                            setPayAmount(Object.values(updated).reduce((s, v) => s + v, 0));
                          }}
                          className="w-full text-right font-bold text-xs p-1 border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800 border border-emerald-200">
              <span className="font-bold block mb-0.5">✓ Direct Fee Receipt</span>
              Recording will generate an instant official receipt of ₹{payAmount} for {student.name}.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Notes</label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="e.g. Paid in full at desk"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={paySubmitting}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Issue Receipt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

