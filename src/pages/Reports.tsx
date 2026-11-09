import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Filter,
  Calendar,
  IndianRupee,
  Users,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Select } from '../components/common/Select';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Payment, Invoice, Enrollment, Programme, Student } from '../types';
import {
  getPayments,
  getInvoices,
  getEnrollments,
  getProgrammes,
  getStudents
} from '../services/dbService';
import {
  exportToExcel,
  exportToCsv,
  generateMonthlyCollectionReportData,
  generateOutstandingReportData,
  generateEnrollmentReportData
} from '../services/reportService';
import { toast } from 'sonner';

export const Reports: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Active report tab
  const [activeReport, setActiveReport] = useState<
    'collection' | 'outstanding' | 'enrollments' | 'payment_methods'
  >('collection');

  const loadData = async () => {
    try {
      const [pays, invs, enrs, progs, stus] = await Promise.all([
        getPayments(),
        getInvoices(),
        getEnrollments(),
        getProgrammes(),
        getStudents(),
      ]);
      setPayments(pays);
      setInvoices(invs);
      setEnrollments(enrs);
      setProgrammes(progs);
      setStudents(stus);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportXlsx = () => {
    if (activeReport === 'collection') {
      const data = generateMonthlyCollectionReportData(payments);
      exportToExcel(data, 'I2B_Monthly_Collection_Report', 'Collections');
    } else if (activeReport === 'outstanding') {
      const data = generateOutstandingReportData(invoices);
      exportToExcel(data, 'I2B_Outstanding_Overdue_Report', 'Outstanding');
    } else if (activeReport === 'enrollments') {
      const data = generateEnrollmentReportData(enrollments, programmes);
      exportToExcel(data, 'I2B_Enrolments_Report', 'Enrolments');
    }
    toast.success('Downloaded Excel Workbook (.xlsx)');
  };

  const handleExportCsv = () => {
    if (activeReport === 'collection') {
      const data = generateMonthlyCollectionReportData(payments);
      exportToCsv(data, 'I2B_Monthly_Collection_Report');
    } else if (activeReport === 'outstanding') {
      const data = generateOutstandingReportData(invoices);
      exportToCsv(data, 'I2B_Outstanding_Overdue_Report');
    } else if (activeReport === 'enrollments') {
      const data = generateEnrollmentReportData(enrollments, programmes);
      exportToCsv(data, 'I2B_Enrolments_Report');
    }
    toast.success('Downloaded CSV data file');
  };

  const handlePrint = () => {
    window.print();
  };

  // Payment methods breakdown
  const methodStats = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'].map((method) => {
    const list = payments.filter((p) => p.payment_method === method && p.status === 'completed');
    const total = list.reduce((s, p) => s + Number(p.amount), 0);
    return { method, count: list.length, total };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Financial Reports"
        subtitle="Operational reports, collection statements, outstanding fee tracking, and Excel/CSV data exports"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={handleExportXlsx}
            >
              Export Excel (.xlsx)
            </Button>
          </div>
        }
      />

      {/* Report Selection Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'collection', label: 'Monthly Collection Statement' },
          { id: 'outstanding', label: 'Outstanding & Overdue Balances' },
          { id: 'enrollments', label: 'Programme Enrolment Roster' },
          { id: 'payment_methods', label: 'Payment Method Breakdown' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as any)}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors min-h-[44px] flex items-center px-1 ${
              activeReport === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={8} height="h-14" />
      ) : (
        <div>
          {/* TAB 1: COLLECTION REPORT */}
          {activeReport === 'collection' && (
            <Card>
              <CardHeader
                title="Fee Collection Report"
                subtitle={`Total Transactions: ${payments.length} • Total Receipts: ₹${payments
                  .filter((p) => p.status === 'completed')
                  .reduce((s, p) => s + Number(p.amount), 0)
                  .toLocaleString('en-IN')}`}
              />
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Payment #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.payment_number}</td>
                          <td className="py-3 px-4">{p.payment_date}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{p.student?.name}</td>
                          <td className="py-3 px-4">{p.payment_method}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                            ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{p.transaction_reference || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={p.status === 'completed' ? 'success' : 'danger'} size="sm">
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          {/* TAB 2: OUTSTANDING REPORT */}
          {activeReport === 'outstanding' && (
            <Card>
              <CardHeader
                title="Outstanding & Overdue Balances Report"
                subtitle={`Unsettled Invoices: ${invoices.filter((i) => i.balance_amount > 0).length}`}
              />
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4 text-right">Billed (₹)</th>
                        <th className="py-3 px-4 text-right">Paid (₹)</th>
                        <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {invoices
                        .filter((i) => i.balance_amount > 0)
                        .map((i) => (
                          <tr key={i.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{i.invoice_number}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{i.student?.name}</td>
                            <td className="py-3 px-4">{i.billing_month}/{i.billing_year}</td>
                            <td className="py-3 px-4">{i.due_date}</td>
                            <td className="py-3 px-4 text-right">₹{i.total_amount}</td>
                            <td className="py-3 px-4 text-right text-emerald-600 font-semibold">₹{i.paid_amount}</td>
                            <td className="py-3 px-4 text-right font-extrabold text-rose-600">₹{i.balance_amount}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={i.status === 'unpaid' ? 'danger' : 'warning'} size="sm">
                                {i.status.replace('_', ' ')}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          {/* TAB 3: ENROLMENTS REPORT */}
          {activeReport === 'enrollments' && (
            <Card>
              <CardHeader
                title="Active Programme Enrolment Roster"
                subtitle={`Total Enrolment Seats: ${enrollments.length}`}
              />
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Programme</th>
                        <th className="py-3 px-4">Class / Grade</th>
                        <th className="py-3 px-4 text-right">Agreed Monthly Fee</th>
                        <th className="py-3 px-4">Start Date</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {enrollments.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-500">{e.student?.student_id}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{e.student?.name}</td>
                          <td className="py-3 px-4">{e.programme?.name}</td>
                          <td className="py-3 px-4 font-semibold">{e.class_or_grade}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                            ₹{Number(e.agreed_fee).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{e.start_date}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={e.status === 'active' ? 'success' : 'neutral'} size="sm">
                              {e.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          {/* TAB 4: PAYMENT METHOD STATS */}
          {activeReport === 'payment_methods' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {methodStats.map((ms) => (
                <Card key={ms.method}>
                  <CardHeader
                    title={ms.method}
                    subtitle={`${ms.count} transactions recorded`}
                  />
                  <CardBody>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Collected</span>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                      ₹{ms.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

