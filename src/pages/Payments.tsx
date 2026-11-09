import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Receipt as ReceiptIcon,
  Download,
  Printer,
  Share2,
  RotateCcw,
  Eye,
  AlertCircle,
  X
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Payment, Student, Invoice, Receipt, PaymentMethod } from '../types';
import {
  getPayments,
  getStudents,
  getInvoices,
  getReceipts,
  recordPayment,
  reversePayment
} from '../services/dbService';
import { useSettings } from '../context/SettingsContext';
import { downloadReceiptPdf, printReceiptPdf } from '../services/receiptPdfService';
import {
  buildReceiptWhatsAppMessage,
  launchManualWhatsAppShare,
  confirmWhatsAppSent
} from '../services/whatsappService';
import { toast } from 'sonner';

export const Payments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  // Record Payment Modal
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment Form fields
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [txRef, setTxRef] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<{ [invoiceId: string]: number }>({});

  // Receipt Share modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  // Reverse Payment modal
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] = useState<Payment | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const loadData = async () => {
    try {
      const [pays, stus, invs, recs] = await Promise.all([
        getPayments(),
        getStudents(),
        getInvoices(),
        getReceipts(),
      ]);
      setPayments(pays);
      setStudents(stus);
      setInvoices(invs);
      setReceipts(recs);

      // Check query params to prefill payment modal
      const qStudentId = searchParams.get('studentId');
      const qInvoiceId = searchParams.get('invoiceId');
      if (qStudentId) {
        openPaymentModalFor(qStudentId, qInvoiceId || undefined);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPaymentModalFor = (studentId?: string, invoiceId?: string) => {
    const sId = studentId || students[0]?.id || '';
    setSelectedStudentId(sId);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Cash');
    setTxRef('');
    setNotes('');

    // Pre-calculate allocations for student's unpaid invoices
    const studentUnpaid = invoices.filter(
      (i) => i.student_id === sId && i.status !== 'cancelled' && i.status !== 'paid'
    );

    const allocMap: { [id: string]: number } = {};
    let totalBal = 0;

    if (invoiceId) {
      const target = invoices.find((i) => i.id === invoiceId);
      if (target) {
        allocMap[target.id] = Number(target.balance_amount);
        totalBal = Number(target.balance_amount);
      }
    } else if (studentUnpaid.length > 0) {
      // Allocate to first unpaid invoice
      allocMap[studentUnpaid[0].id] = Number(studentUnpaid[0].balance_amount);
      totalBal = Number(studentUnpaid[0].balance_amount);
    }

    setAllocations(allocMap);
    setPaymentAmount(totalBal > 0 ? totalBal : 500);
    setRecordModalOpen(true);
  };

  const handleStudentChange = (sId: string) => {
    setSelectedStudentId(sId);
    const studentUnpaid = invoices.filter(
      (i) => i.student_id === sId && i.status !== 'cancelled' && i.status !== 'paid'
    );
    const allocMap: { [id: string]: number } = {};
    let sum = 0;
    if (studentUnpaid.length > 0) {
      allocMap[studentUnpaid[0].id] = Number(studentUnpaid[0].balance_amount);
      sum = Number(studentUnpaid[0].balance_amount);
    }
    setAllocations(allocMap);
    setPaymentAmount(sum > 0 ? sum : 500);
  };

  const handleAllocationChange = (invId: string, val: number) => {
    const updated = { ...allocations, [invId]: val };
    setAllocations(updated);
    const total = Object.values(updated).reduce((s, v) => s + (Number(v) || 0), 0);
    setPaymentAmount(total);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }
    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    const allocArray = Object.entries(allocations)
      .filter(([_, amt]) => Number(amt) > 0)
      .map(([invoice_id, allocated_amount]) => ({
        invoice_id,
        allocated_amount: Number(allocated_amount),
      }));

    if (allocArray.length === 0) {
      toast.error('Please allocate payment to at least one invoice');
      return;
    }

    setSubmitting(true);
    try {
      const { payment, receipt } = await recordPayment({
        student_id: selectedStudentId,
        payment_date: paymentDate,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        transaction_reference: txRef,
        notes,
        allocations: allocArray,
      });

      toast.success(`Payment ${payment.payment_number} recorded! Receipt ${receipt.receipt_number} issued.`);
      setRecordModalOpen(false);

      // Open sharing dialog immediately
      setActivePayment(payment);
      setActiveReceipt(receipt);
      setShareModalOpen(true);

      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = (rec: Receipt, pay: Payment) => {
    const stu = students.find((s) => s.id === pay.student_id);
    if (!stu) return;
    downloadReceiptPdf({
      receipt: rec,
      payment: pay,
      student: stu,
      settings,
    });
    toast.success('Downloaded PDF Receipt');
  };

  const handlePrintReceipt = (rec: Receipt, pay: Payment) => {
    const stu = students.find((s) => s.id === pay.student_id);
    if (!stu) return;
    printReceiptPdf({
      receipt: rec,
      payment: pay,
      student: stu,
      settings,
    });
  };

  const handleOpenShareModal = (rec: Receipt, pay: Payment) => {
    setActiveReceipt(rec);
    setActivePayment(pay);
    setShareModalOpen(true);
  };

  const handleTriggerWhatsApp = async () => {
    if (!activeReceipt || !activePayment) return;
    const stu = students.find((s) => s.id === activePayment.student_id);
    if (!stu) return;

    const payload = buildReceiptWhatsAppMessage(stu, activePayment, activeReceipt, settings);
    await launchManualWhatsAppShare(payload, activeReceipt.id);
    toast.success('WhatsApp opened with prepared confirmation message');
    await loadData();
  };

  const handleConfirmSent = async () => {
    if (!activeReceipt) return;
    await confirmWhatsAppSent(activeReceipt.id);
    toast.success('WhatsApp sharing status marked as confirmed!');
    setShareModalOpen(false);
    await loadData();
  };

  const handleConfirmReverse = async () => {
    if (!paymentToReverse) return;
    try {
      await reversePayment(paymentToReverse.id, reverseReason);
      toast.success(`Payment ${paymentToReverse.payment_number} reversed. Invoice balances adjusted.`);
      setReverseModalOpen(false);
      setPaymentToReverse(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Reversal failed');
    }
  };

  const filteredPayments = payments.filter((p) => {
    const stuName = p.student?.name || '';
    const stuId = p.student?.student_id || '';
    const payNum = p.payment_number;
    const ref = p.transaction_reference || '';

    const matchesSearch =
      stuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stuId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = methodFilter === 'all' || p.payment_method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const studentUnpaidInvoices = invoices.filter(
    (i) => i.student_id === selectedStudentId && i.status !== 'cancelled' && i.status !== 'paid'
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payment & Collections"
        subtitle="Record fee receipts, allocate across invoices, download PDF receipts and share via WhatsApp"
        action={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => openPaymentModalFor()}
          >
            Record Payment
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-8">
            <Input
              type="text"
              placeholder="Search by student name, payment # or transaction reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-4">
            <Select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Payment Methods' },
                { value: 'Cash', label: 'Cash' },
                { value: 'UPI', label: 'UPI' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>
        </div>

        {(searchQuery || methodFilter !== 'all') && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span>Filtered results ({filteredPayments.length})</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setMethodFilter('all');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Payments List */}
      {loading ? (
        <LoadingSkeleton rows={6} height="h-16" />
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-8 h-8" />}
          title="No payments found"
          description="Click 'Record Payment' above to log a fee transaction and issue an official receipt."
          actionLabel="Record Payment"
          onAction={() => openPaymentModalFor()}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile view: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredPayments.map((pay) => {
              const receipt = receipts.find((r) => r.payment_id === pay.id);

              return (
                <div
                  key={pay.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        {pay.payment_number}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                        {pay.student?.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono">{pay.student?.student_id}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-emerald-600 block">
                        +₹{Number(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium mt-1 inline-block">
                        {pay.payment_method}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      <span>Date: {pay.payment_date}</span>
                      {pay.transaction_reference && (
                        <span className="block text-[11px] font-mono text-slate-400">
                          Ref: {pay.transaction_reference}
                        </span>
                      )}
                    </div>
                    {receipt && (
                      <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        {receipt.receipt_number}
                      </span>
                    )}
                  </div>

                  {receipt && pay.status !== 'reversed' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Download className="w-3.5 h-3.5" />}
                        onClick={() => handleDownloadReceipt(receipt, pay)}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => handlePrintReceipt(receipt, pay)}
                      >
                        Print
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Share2 className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenShareModal(receipt, pay)}
                      >
                        WhatsApp
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop view: Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Payment #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount Received</th>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPayments.map((pay) => {
                    const receipt = receipts.find((r) => r.payment_id === pay.id);

                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {pay.payment_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div>
                            <span>{pay.student?.name}</span>
                            <span className="text-[11px] font-normal font-mono text-slate-400 ml-1.5">
                              ({pay.student?.student_id})
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {pay.payment_date}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                            {pay.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {pay.transaction_reference || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm whitespace-nowrap">
                          ₹{Number(pay.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          {receipt ? (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {receipt.receipt_number}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Badge variant={pay.status === 'completed' ? 'success' : 'danger'} size="sm">
                            {pay.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {receipt && pay.status !== 'reversed' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Download className="w-3.5 h-3.5" />}
                                onClick={() => handleDownloadReceipt(receipt, pay)}
                                title="Download PDF"
                              >
                                PDF
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Printer className="w-3.5 h-3.5" />}
                                onClick={() => handlePrintReceipt(receipt, pay)}
                                title="Print"
                              >
                                Print
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                icon={<Share2 className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenShareModal(receipt, pay)}
                                title="Share WhatsApp"
                              >
                                WhatsApp
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                icon={<RotateCcw className="w-3.5 h-3.5" />}
                                onClick={() => {
                                  setPaymentToReverse(pay);
                                  setReverseReason('');
                                  setReverseModalOpen(true);
                                }}
                                title="Reverse Transaction"
                              >
                                Reverse
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Reversed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* RECORD PAYMENT MODAL                                                  */}
      {/* ===================================================================== */}
      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title="Record Fee Payment & Issue Receipt"
        subtitle="Collect counter fees, UPI, or bank transfers with multi-invoice allocation"
        maxWidth="lg"
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 py-2">
          <Select
            label="Select Student"
            value={selectedStudentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            options={students.map((s) => ({ value: s.id, label: `${s.name} (${s.student_id})` }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={[
                { value: 'Cash', label: 'Cash at Counter' },
                { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
                { value: 'Bank Transfer', label: 'Bank Transfer (NEFT/IMPS)' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Other', label: 'Other Mode' },
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Transaction / Reference #"
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
              placeholder="e.g. UPI Ref, Cheque No, Bank UTR"
            />
            <Input
              label="Total Payment Amount (₹)"
              type="number"
              step="10"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          {/* Multi-Invoice Allocation Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 text-xs flex items-center justify-between">
              <span>Allocate Payment to Invoices</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {studentUnpaidInvoices.length} outstanding invoice(s)
              </span>
            </div>

            {studentUnpaidInvoices.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50/50">
                No unpaid invoices found for this student. Generate an invoice first or record advance.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 p-2 space-y-2">
                {studentUnpaidInvoices.map((inv) => (
                  <div key={inv.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold font-mono text-slate-900">{inv.invoice_number}</span>
                      <p className="text-[11px] text-slate-500">
                        Period: {inv.billing_month}/{inv.billing_year} • Due: {inv.due_date}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Total: ₹{inv.total_amount} | Balance: <strong className="text-rose-600">₹{inv.balance_amount}</strong>
                      </p>
                    </div>

                    <div className="w-32 shrink-0">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Allocate (₹)</label>
                      <input
                        type="number"
                        step="10"
                        max={inv.balance_amount}
                        value={allocations[inv.id] || 0}
                        onChange={(e) => handleAllocationChange(inv.id, parseFloat(e.target.value) || 0)}
                        className="w-full text-right font-bold text-xs p-1.5 border border-slate-300 rounded focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-left">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Administrative Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid in full at office"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRecordModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Issue Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* WHATSAPP MANUAL SHARING MODAL (Section 13 Mode A)                     */}
      {/* ===================================================================== */}
      {activeReceipt && activePayment && (
        <Modal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          title="Share Official Receipt on WhatsApp"
          subtitle={`Receipt: ${activeReceipt.receipt_number} • Student: ${activePayment.student?.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
              <Share2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Official Receipt Ready to Deliver</p>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Step 1: Download the receipt PDF below.<br />
                  Step 2: Click "Open WhatsApp" to launch chat with parent.<br />
                  Step 3: Attach the downloaded PDF and confirm below.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <strong className="text-slate-900">{activePayment.student?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">WhatsApp Phone:</span>
                <strong className="font-mono text-emerald-700">
                  {activePayment.student?.whatsapp_number || 'No phone saved'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <strong className="text-emerald-600 font-bold">
                  ₹{Number(activePayment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Balance:</span>
                <strong className="text-slate-900">
                  ₹{Number(activeReceipt.remaining_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Delivery Status:</span>
                <Badge
                  variant={activeReceipt.whatsapp_status === 'confirmed_sent' ? 'success' : 'warning'}
                  size="sm"
                >
                  {activeReceipt.whatsapp_status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={() => handleDownloadReceipt(activeReceipt, activePayment)}
              >
                1. Download PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Share2 className="w-4 h-4" />}
                onClick={handleTriggerWhatsApp}
              >
                2. Open WhatsApp
              </Button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleConfirmSent}
              >
                Mark as Confirmed Sent
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reverse Payment Modal */}
      {paymentToReverse && (
        <Modal
          isOpen={reverseModalOpen}
          onClose={() => setReverseModalOpen(false)}
          title="Reverse Financial Payment"
          subtitle={`Payment: ${paymentToReverse.payment_number}`}
          maxWidth="sm"
        >
          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Reversing payment will adjust invoice balances back to unpaid/partially paid. Financial records are never deleted; an audit reversal is logged.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex justify-between">
                <span>Amount to Reverse:</span>
                <strong className="text-rose-600">₹{paymentToReverse.amount}</strong>
              </div>
            </div>
            <Input
              label="Reversal Reason"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="e.g. Bounced cheque, payment recorded by mistake..."
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setReverseModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmReverse}>
                Confirm Reversal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

