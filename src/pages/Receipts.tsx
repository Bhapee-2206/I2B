import React, { useState, useEffect } from 'react';
import {
  Receipt as ReceiptIcon,
  Search,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  ExternalLink,
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
import { Receipt, Payment, Student, Enrollment } from '../types';
import { getReceipts, getPayments, getStudents, getEnrollments } from '../services/dbService';
import { useSettings } from '../context/SettingsContext';
import { downloadReceiptPdf, printReceiptPdf } from '../services/receiptPdfService';
import {
  buildReceiptWhatsAppMessage,
  launchManualWhatsAppShare,
  confirmWhatsAppSent
} from '../services/whatsappService';
import { toast } from 'sonner';

export const Receipts: React.FC = () => {
  const { settings } = useSettings();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sharing Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);

  const loadData = async () => {
    try {
      const [recs, pays, stus, enrs] = await Promise.all([
        getReceipts(),
        getPayments(),
        getStudents(),
        getEnrollments(),
      ]);
      setReceipts(recs);
      setPayments(pays);
      setStudents(stus);
      setEnrollments(enrs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const getStudentEnrolmentSummary = (studentId: string) => {
    const studentEnrs = enrollments.filter(e => e.student_id === studentId && e.status === 'active');
    if (studentEnrs.length === 0) return 'Tuition / Programme Fee';
    return studentEnrs.map(e => `${e.programme?.name || 'Programme'} (${e.class_or_grade})`).join(', ');
  };

  const handleDownload = (rec: Receipt) => {
    const pay = payments.find((p) => p.id === rec.payment_id);
    const stu = students.find((s) => s.id === rec.student_id);
    if (!pay || !stu) return;

    downloadReceiptPdf({
      receipt: rec,
      payment: pay,
      student: stu,
      settings,
      enrolmentInfo: getStudentEnrolmentSummary(stu.id),
    });
    toast.success('Downloaded PDF Receipt');
  };

  const handlePrint = (rec: Receipt) => {
    const pay = payments.find((p) => p.id === rec.payment_id);
    const stu = students.find((s) => s.id === rec.student_id);
    if (!pay || !stu) return;

    printReceiptPdf({
      receipt: rec,
      payment: pay,
      student: stu,
      settings,
      enrolmentInfo: getStudentEnrolmentSummary(stu.id),
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openShareModal = (rec: Receipt) => {
    setActiveReceipt(rec);
    setShareModalOpen(true);
  };

  const handleTriggerWhatsApp = async () => {
    if (!activeReceipt) return;
    const pay = payments.find((p) => p.id === activeReceipt.payment_id);
    const stu = students.find((s) => s.id === activeReceipt.student_id);
    if (!pay || !stu) return;

    const payload = buildReceiptWhatsAppMessage(stu, pay, activeReceipt, settings);
    await launchManualWhatsAppShare(payload, activeReceipt.id);
    toast.success('WhatsApp chat opened with prefilled receipt summary');
    await loadData();
  };

  const handleConfirmSent = async () => {
    if (!activeReceipt) return;
    await confirmWhatsAppSent(activeReceipt.id);
    toast.success('Receipt WhatsApp status confirmed as delivered!');
    setShareModalOpen(false);
    await loadData();
  };

  const filteredReceipts = receipts.filter((rec) => {
    const stuName = rec.student?.name || '';
    const stuId = rec.student?.student_id || '';
    const recNum = rec.receipt_number;

    const matchesSearch =
      stuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stuId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recNum.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || rec.whatsapp_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Official Receipts Registry"
        subtitle="Sequential, immutable payment receipts with instant PDF download and parent WhatsApp delivery tracking"
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-8">
            <Input
              type="text"
              placeholder="Search by student name or receipt #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All WhatsApp Statuses' },
                { value: 'not_shared', label: 'Not Shared' },
                { value: 'initiated', label: 'Sharing Initiated' },
                { value: 'confirmed_sent', label: 'Confirmed Sent' },
              ]}
            />
          </div>
        </div>

        {(searchQuery || statusFilter !== 'all') && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span>Filtered receipts ({filteredReceipts.length})</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Receipts list */}
      {loading ? (
        <LoadingSkeleton rows={6} height="h-16" />
      ) : filteredReceipts.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon className="w-8 h-8" />}
          title="No receipts issued yet"
          description="Receipts are automatically generated when recording payments in the Payments tab."
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile view: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredReceipts.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 block">
                      {rec.receipt_number}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 mt-0.5">{rec.student?.name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">{rec.student?.student_id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-emerald-600 block">
                      ₹{Number(rec.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <Badge
                      variant={
                        rec.whatsapp_status === 'confirmed_sent'
                          ? 'success'
                          : rec.whatsapp_status === 'initiated'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {rec.whatsapp_status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Issue Date: {rec.issue_date}</span>
                  <span>Balance: ₹{Number(rec.remaining_balance).toLocaleString('en-IN')}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => handleDownload(rec)}
                  >
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Printer className="w-3.5 h-3.5" />}
                    onClick={() => handlePrint(rec)}
                  >
                    Print
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Share2 className="w-3.5 h-3.5" />}
                    onClick={() => openShareModal(rec)}
                  >
                    WhatsApp
                  </Button>
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
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Remaining Balance</th>
                    <th className="py-3 px-4 text-center">WhatsApp Delivery</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReceipts.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {rec.receipt_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div>
                          <span>{rec.student?.name}</span>
                          <span className="text-[11px] font-normal font-mono text-slate-400 ml-1.5">
                            ({rec.student?.student_id})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {rec.issue_date}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm whitespace-nowrap">
                        ₹{Number(rec.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                        <span className={rec.remaining_balance > 0 ? 'text-rose-600' : 'text-slate-700'}>
                          ₹{Number(rec.remaining_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            rec.whatsapp_status === 'confirmed_sent'
                              ? 'success'
                              : rec.whatsapp_status === 'initiated'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {rec.whatsapp_status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Download className="w-3.5 h-3.5" />}
                            onClick={() => handleDownload(rec)}
                            title="Download PDF"
                          >
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Printer className="w-3.5 h-3.5" />}
                            onClick={() => handlePrint(rec)}
                            title="Print Receipt"
                          >
                            Print
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Share2 className="w-3.5 h-3.5" />}
                            onClick={() => openShareModal(rec)}
                            title="Share on WhatsApp"
                          >
                            WhatsApp
                          </Button>
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

      {/* WhatsApp Sharing Modal */}
      {activeReceipt && (
        <Modal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          title={`WhatsApp Receipt: ${activeReceipt.receipt_number}`}
          subtitle={`Student: ${activeReceipt.student?.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Parent WhatsApp Phone:</span>
                <strong className="font-mono text-emerald-700 font-bold">
                  {activeReceipt.student?.whatsapp_number || 'No phone saved'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Acknowledged:</span>
                <strong className="text-emerald-600 font-bold">
                  ₹{Number(activeReceipt.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Balance:</span>
                <strong className="text-slate-900">
                  ₹{Number(activeReceipt.remaining_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={() => handleDownload(activeReceipt)}
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
              <Button variant="outline" size="sm" onClick={() => setShareModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleConfirmSent}
              >
                Mark Confirmed Sent
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

