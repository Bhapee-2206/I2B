import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Search,
  Filter,
  Phone,
  MessageSquare,
  CreditCard,
  Calendar,
  IndianRupee,
  Share2,
  Clock,
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
import { Invoice, Student } from '../types';
import { getInvoices, getStudents } from '../services/dbService';
import { useSettings } from '../context/SettingsContext';
import {
  buildOverdueReminderWhatsAppMessage,
  launchManualWhatsAppShare
} from '../services/whatsappService';
import { toast } from 'sonner';

export const Overdue: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'current' | 'previous'>('all');
  const [minDaysOverdue, setMinDaysOverdue] = useState<number>(0);

  // Reminder Modal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  const loadData = async () => {
    try {
      const [invs, stus] = await Promise.all([getInvoices(), getStudents()]);
      setInvoices(invs);
      setStudents(stus);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load overdue invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  // All overdue invoices
  const allOverdue = invoices.filter((i) => {
    return i.status !== 'cancelled' && i.status !== 'paid' && i.due_date < todayStr;
  });

  const getDaysOverdue = (dueDate: string) => {
    const diff = Math.floor((new Date(todayStr).getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  };

  const filteredOverdue = allOverdue.filter((inv) => {
    const stuName = inv.student?.name || '';
    const stuId = inv.student?.student_id || '';
    const invNum = inv.invoice_number;

    const matchesSearch =
      stuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stuId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invNum.toLowerCase().includes(searchQuery.toLowerCase());

    const days = getDaysOverdue(inv.due_date);
    const matchesDays = days >= minDaysOverdue;

    let matchesPeriod = true;
    if (periodFilter === 'current') {
      matchesPeriod = inv.billing_month === curMonth && inv.billing_year === curYear;
    } else if (periodFilter === 'previous') {
      matchesPeriod = inv.billing_month !== curMonth || inv.billing_year !== curYear;
    }

    return matchesSearch && matchesDays && matchesPeriod;
  });

  const totalOverdueBalance = filteredOverdue.reduce((s, i) => s + Number(i.balance_amount), 0);

  const handleOpenReminder = (inv: Invoice) => {
    setActiveInvoice(inv);
    setReminderModalOpen(true);
  };

  const handleSendReminderWhatsApp = async () => {
    if (!activeInvoice) return;
    const stu = students.find((s) => s.id === activeInvoice.student_id);
    if (!stu) return;

    const payload = buildOverdueReminderWhatsAppMessage(stu, activeInvoice, settings);
    await launchManualWhatsAppShare(payload);
    toast.success('WhatsApp opened with prepared reminder message!');
    setReminderModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overdue Fee Management"
        subtitle={`Total overdue invoices: ${allOverdue.length} • Outstanding balance: ₹${totalOverdueBalance.toLocaleString('en-IN')}`}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6">
            <Input
              type="text"
              placeholder="Search by student name or invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Overdue Periods' },
                { value: 'current', label: 'Current Month' },
                { value: 'previous', label: 'Previous Months' },
              ]}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={String(minDaysOverdue)}
              onChange={(e) => setMinDaysOverdue(parseInt(e.target.value))}
              options={[
                { value: '0', label: 'Any Days Overdue' },
                { value: '7', label: '7+ Days Overdue' },
                { value: '15', label: '15+ Days Overdue' },
                { value: '30', label: '30+ Days Overdue' },
              ]}
            />
          </div>
        </div>

        {(searchQuery || periodFilter !== 'all' || minDaysOverdue > 0) && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span>Filtered overdue ({filteredOverdue.length})</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setPeriodFilter('all');
                setMinDaysOverdue(0);
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Overdue List */}
      {loading ? (
        <LoadingSkeleton rows={6} height="h-16" />
      ) : filteredOverdue.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="w-8 h-8 text-emerald-600" />}
          title="No overdue accounts!"
          description="All active student fees are settled up to date. Outstanding balances will appear here when due dates pass."
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile view: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredOverdue.map((inv) => {
              const days = getDaysOverdue(inv.due_date);

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl border border-rose-200 p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        {inv.invoice_number}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                        {inv.student?.name}
                      </h3>
                      {inv.student?.parent_name && (
                        <p className="text-[11px] text-slate-500">Parent: {inv.student.parent_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-rose-600 block">
                        ₹{Number(inv.balance_amount).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block mt-0.5">
                        {days} days overdue
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Due Date: {inv.due_date}</span>
                    <span className="font-mono text-emerald-700 font-medium">
                      {inv.student?.whatsapp_number || 'No phone'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<CreditCard className="w-3.5 h-3.5 text-emerald-600" />}
                      onClick={() => navigate(`/payments?invoiceId=${inv.id}&studentId=${inv.student_id}`)}
                    >
                      Collect Pay
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Share2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenReminder(inv)}
                    >
                      Send Reminder
                    </Button>
                  </div>
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
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">WhatsApp Contact</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Days Overdue</th>
                    <th className="py-3 px-4 text-right">Invoice Amount</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredOverdue.map((inv) => {
                    const days = getDaysOverdue(inv.due_date);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div>
                            <span>{inv.student?.name}</span>
                            {inv.student?.parent_name && (
                              <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                                ({inv.student.parent_name})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-600">
                          {inv.student?.whatsapp_number || '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {inv.billing_month}/{inv.billing_year}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                          {inv.due_date}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {days} days
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-slate-800">
                          ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-rose-600 whitespace-nowrap text-sm">
                          ₹{Number(inv.balance_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<CreditCard className="w-3.5 h-3.5 text-emerald-600" />}
                              onClick={() => navigate(`/payments?invoiceId=${inv.id}&studentId=${inv.student_id}`)}
                            >
                              Collect
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Share2 className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenReminder(inv)}
                            >
                              Reminder
                            </Button>
                          </div>
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

      {/* WhatsApp Reminder Modal */}
      {activeInvoice && (
        <Modal
          isOpen={reminderModalOpen}
          onClose={() => setReminderModalOpen(false)}
          title="Send Polite Overdue Fee Reminder"
          subtitle={`Student: ${activeInvoice.student?.name} • Invoice: ${activeInvoice.invoice_number}`}
          maxWidth="md"
        >
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient Phone:</span>
                <strong className="font-mono text-emerald-700">
                  {activeInvoice.student?.whatsapp_number || 'No phone recorded'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Overdue Balance:</span>
                <strong className="text-rose-600 font-extrabold text-sm">
                  ₹{Number(activeInvoice.balance_amount).toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <strong className="text-slate-800">{activeInvoice.due_date}</strong>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <strong>Preview Reminder Message:</strong><br />
              "Dear Parent of {activeInvoice.student?.name}, courteous reminder from {settings.institution_name} regarding tuition fee of ₹{activeInvoice.balance_amount} for {activeInvoice.billing_month}/{activeInvoice.billing_year}..."
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setReminderModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Share2 className="w-4 h-4" />}
                onClick={handleSendReminderWhatsApp}
              >
                Launch WhatsApp Chat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
