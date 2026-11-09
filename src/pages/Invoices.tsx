import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  IndianRupee,
  ChevronRight,
  Eye,
  Ban,
  Download,
  Printer,
  X,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Invoice, InvoiceItem } from '../types';
import {
  getInvoices,
  getEligibleBillingPreview,
  generateMonthlyInvoices,
  cancelInvoice,
  InvoicePreviewCandidate
} from '../services/dbService';
import { useSettings } from '../context/SettingsContext';
import { toast } from 'sonner';

export const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'all'>('all');

  // Generator Wizard Modal
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [genMonth, setGenMonth] = useState<number>(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState<number>(new Date().getFullYear());
  const [genDueDate, setGenDueDate] = useState<string>('');
  const [candidates, setCandidates] = useState<InvoicePreviewCandidate[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadData = async () => {
    try {
      const invs = await getInvoices();
      setInvoices(invs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Default due date: e.g. 10th of next month
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth() + 1, settings.default_due_day || 10);
    setGenDueDate(d.toISOString().split('T')[0]);
  }, [settings.default_due_day]);

  // Open Generation Wizard
  const handleOpenGenerator = async () => {
    setGeneratorOpen(true);
    await loadBillingPreview(genMonth, genYear);
  };

  const loadBillingPreview = async (month: number, year: number) => {
    setPreviewLoading(true);
    try {
      const candList = await getEligibleBillingPreview(month, year);
      setCandidates(candList);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleCandidate = (index: number) => {
    setCandidates((prev) => {
      const updated = [...prev];
      if (!updated[index].alreadyInvoiced) {
        updated[index].isSelected = !updated[index].isSelected;
      }
      return updated;
    });
  };

  const toggleSelectAll = (select: boolean) => {
    setCandidates((prev) =>
      prev.map((c) => ({
        ...c,
        isSelected: c.alreadyInvoiced ? false : select,
      }))
    );
  };

  const handleConfirmGeneration = async () => {
    const selected = candidates
      .filter((c) => c.isSelected && !c.alreadyInvoiced)
      .map((c) => ({
        studentId: c.student.id,
        enrollmentIds: c.enrollments.map((e) => e.id),
      }));

    if (selected.length === 0) {
      toast.error('No students selected for invoice generation');
      return;
    }

    setGenerating(true);
    try {
      const generated = await generateMonthlyInvoices(genMonth, genYear, genDueDate, selected);
      toast.success(`Successfully generated ${generated.length} monthly consolidated invoices!`);
      setGeneratorOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Invoice generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenCancel = (inv: Invoice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (inv.paid_amount > 0) {
      toast.error('Cannot cancel invoice with paid amounts. Reverse payment first.');
      return;
    }
    setInvoiceToCancel(inv);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!invoiceToCancel) return;
    try {
      await cancelInvoice(invoiceToCancel.id, cancelReason);
      toast.success(`Invoice ${invoiceToCancel.invoice_number} cancelled`);
      setCancelModalOpen(false);
      setInvoiceToCancel(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Cancellation failed');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const stuName = inv.student?.name || '';
    const stuId = inv.student?.student_id || '';
    const invNum = inv.invoice_number;

    const matchesSearch =
      stuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stuId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invNum.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesMonth = selectedMonthFilter === 'all' || inv.billing_month === selectedMonthFilter;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const selectedCandidatesCount = candidates.filter((c) => c.isSelected && !c.alreadyInvoiced).length;
  const selectedCandidatesTotal = candidates
    .filter((c) => c.isSelected && !c.alreadyInvoiced)
    .reduce((s, c) => s + c.totalAmount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monthly Invoices"
        subtitle="Consolidated billing management, preview verification, and payment tracking"
        action={
          <Button
            variant="primary"
            size="md"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={handleOpenGenerator}
          >
            Generate Monthly Invoices
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6">
            <Input
              type="text"
              placeholder="Search by student name, ID or invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Invoices' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'partially_paid', label: 'Partially Paid' },
                { value: 'paid', label: 'Paid' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={String(selectedMonthFilter)}
              onChange={(e) => setSelectedMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              options={[
                { value: 'all', label: 'All Months' },
                { value: '1', label: 'January' },
                { value: '2', label: 'February' },
                { value: '3', label: 'March' },
                { value: '4', label: 'April' },
                { value: '5', label: 'May' },
                { value: '6', label: 'June' },
                { value: '7', label: 'July' },
                { value: '8', label: 'August' },
                { value: '9', label: 'September' },
                { value: '10', label: 'October' },
                { value: '11', label: 'November' },
                { value: '12', label: 'December' },
              ]}
            />
          </div>
        </div>

        {(searchQuery || statusFilter !== 'all' || selectedMonthFilter !== 'all') && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span>Filtered results ({filteredInvoices.length})</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedMonthFilter('all');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Invoice list */}
      {loading ? (
        <LoadingSkeleton rows={6} height="h-16" />
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No invoices found"
          description="Click 'Generate Monthly Invoices' above to create consolidated billing for your enrolled students."
          actionLabel="Generate Invoices Now"
          onAction={handleOpenGenerator}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile view: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => {
                  setSelectedInvoice(inv);
                  setDetailsModalOpen(true);
                }}
                className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm active:bg-slate-50 cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 block">
                      {inv.invoice_number}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                      {inv.student?.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">{inv.student?.student_id}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        inv.status === 'paid'
                          ? 'success'
                          : inv.status === 'partially_paid'
                          ? 'warning'
                          : inv.status === 'cancelled'
                          ? 'neutral'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {inv.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Period: {inv.billing_month}/{inv.billing_year}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total / Paid</span>
                    <span className="font-semibold text-slate-700">
                      ₹{inv.total_amount} / <strong className="text-emerald-600">₹{inv.paid_amount}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Balance Due</span>
                    <span className={`font-extrabold text-sm ${inv.balance_amount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      ₹{inv.balance_amount}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Due: {inv.due_date}</span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CreditCard className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/payments?invoiceId=${inv.id}&studentId=${inv.student_id}`)}
                      >
                        Pay
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setDetailsModalOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view: Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Paid Amount</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setDetailsModalOpen(true);
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div>
                          <span>{inv.student?.name}</span>
                          <span className="text-[11px] font-normal font-mono text-slate-400 ml-1.5">
                            ({inv.student?.student_id})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {inv.billing_month}/{inv.billing_year}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {inv.due_date}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                        ₹{Number(inv.paid_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold whitespace-nowrap">
                        <span className={inv.balance_amount > 0 ? 'text-rose-600' : 'text-slate-800'}>
                          ₹{Number(inv.balance_amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'partially_paid'
                              ? 'warning'
                              : inv.status === 'cancelled'
                              ? 'neutral'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {inv.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<CreditCard className="w-3.5 h-3.5" />}
                              onClick={() => navigate(`/payments?invoiceId=${inv.id}&studentId=${inv.student_id}`)}
                            >
                              Pay
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setDetailsModalOpen(true);
                            }}
                          >
                            Details
                          </Button>
                          {inv.paid_amount === 0 && inv.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              icon={<Ban className="w-3.5 h-3.5" />}
                              onClick={(e) => handleOpenCancel(inv, e)}
                              title="Cancel Invoice"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MANUAL INVOICE GENERATION WIZARD MODAL                                */}
      {/* ===================================================================== */}
      <Modal
        isOpen={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        title="Manual Monthly Invoice Generator"
        subtitle="Review active student enrolments and confirm consolidated billing"
        maxWidth="2xl"
      >
        <div className="space-y-4 py-2">
          {/* Billing Period Selector */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Billing Month"
              value={genMonth}
              onChange={(e) => {
                const m = parseInt(e.target.value);
                setGenMonth(m);
                loadBillingPreview(m, genYear);
              }}
              options={[
                { value: 1, label: 'January' },
                { value: 2, label: 'February' },
                { value: 3, label: 'March' },
                { value: 4, label: 'April' },
                { value: 5, label: 'May' },
                { value: 6, label: 'June' },
                { value: 7, label: 'July' },
                { value: 8, label: 'August' },
                { value: 9, label: 'September' },
                { value: 10, label: 'October' },
                { value: 11, label: 'November' },
                { value: 12, label: 'December' },
              ]}
            />

            <Input
              label="Billing Year"
              type="number"
              value={genYear}
              onChange={(e) => {
                const y = parseInt(e.target.value) || new Date().getFullYear();
                setGenYear(y);
                loadBillingPreview(genMonth, y);
              }}
            />

            <Input
              label="Payment Due Date"
              type="date"
              value={genDueDate}
              onChange={(e) => setGenDueDate(e.target.value)}
              required
            />
          </div>

          {/* Candidate Selection Header */}
          <div className="flex items-center justify-between text-xs">
            <div className="font-semibold text-slate-700">
              Eligible Students: <strong className="text-emerald-600">{selectedCandidatesCount}</strong> / {candidates.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleSelectAll(true)}
                className="text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => toggleSelectAll(false)}
                className="text-slate-500 hover:text-slate-700 underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Candidates Scroll List */}
          {previewLoading ? (
            <LoadingSkeleton rows={5} height="h-12" />
          ) : candidates.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No active students found with eligible enrolments.
            </div>
          ) : (
            <div className="max-h-64 sm:max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {candidates.map((cand, idx) => (
                <div
                  key={cand.student.id}
                  onClick={() => toggleCandidate(idx)}
                  className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                    cand.alreadyInvoiced
                      ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                      : cand.isSelected
                      ? 'bg-emerald-50/50 hover:bg-emerald-50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={cand.isSelected}
                      disabled={cand.alreadyInvoiced}
                      onChange={() => toggleCandidate(idx)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{cand.student.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">({cand.student.student_id})</span>
                        {cand.alreadyInvoiced && (
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                            Already Invoiced
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {cand.enrollments.map((e) => `${e.programme?.name} (${e.class_or_grade})`).join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-sm text-slate-900 block">
                      ₹{cand.totalAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400">{cand.enrollments.length} programme(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generator Footer Total Bar */}
          <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL TO BE INVOICED</span>
              <span className="font-bold">{selectedCandidatesCount} Student(s)</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-emerald-400">
                ₹{selectedCandidatesTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGeneratorOpen(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={generating}
              disabled={selectedCandidatesCount === 0}
              onClick={handleConfirmGeneration}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Confirm & Generate ({selectedCandidatesCount})
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={`Invoice: ${selectedInvoice.invoice_number}`}
          subtitle={`Billing Period: ${selectedInvoice.billing_month}/${selectedInvoice.billing_year}`}
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{selectedInvoice.student?.name}</p>
                <p className="font-mono text-xs text-slate-500">{selectedInvoice.student?.student_id}</p>
              </div>
              <Badge
                variant={
                  selectedInvoice.status === 'paid'
                    ? 'success'
                    : selectedInvoice.status === 'partially_paid'
                    ? 'warning'
                    : 'danger'
                }
              >
                {selectedInvoice.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-xs">
                Line Items
              </div>
              <div className="divide-y divide-slate-100">
                {(selectedInvoice.items || []).map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{it.description}</p>
                      <p className="text-[11px] text-slate-500">Class: {it.class_or_grade || 'Standard'}</p>
                    </div>
                    <span className="font-bold text-slate-900">₹{it.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Invoice Total:</span>
                <strong className="text-slate-900">₹{selectedInvoice.total_amount}</strong>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Amount Paid:</span>
                <strong className="font-bold">₹{selectedInvoice.paid_amount}</strong>
              </div>
              <div className="flex justify-between text-rose-600 font-bold text-sm pt-1 border-t border-slate-200">
                <span>Balance Due:</span>
                <span>₹{selectedInvoice.balance_amount}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setDetailsModalOpen(false);
                    navigate(`/payments?invoiceId=${selectedInvoice.id}&studentId=${selectedInvoice.student_id}`);
                  }}
                >
                  Record Payment
                </Button>
              ) : <div />}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailsModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Invoice Confirmation */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Monthly Invoice"
        subtitle={`Invoice: ${invoiceToCancel?.invoice_number}`}
        maxWidth="sm"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to cancel this invoice? This will remove the billed charge of{' '}
            <strong className="text-slate-900">₹{invoiceToCancel?.total_amount}</strong> for student{' '}
            <strong className="text-slate-900">{invoiceToCancel?.student?.name}</strong>.
          </p>

          <Input
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Student withdrew, Duplicate, Incorrect class..."
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
              Keep Active
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmCancel}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

