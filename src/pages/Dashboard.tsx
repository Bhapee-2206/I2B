import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Receipt as ReceiptIcon,
  CreditCard,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  Plus,
  FileText,
  Calendar,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { getDashboardMetrics, DashboardMetrics } from '../services/dbService';

const PROGRAMME_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <PageHeader title="Institution Overview" subtitle="Loading live statistics..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingSkeleton rows={3} height="h-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Action Shortcuts */}
      <PageHeader
        title="Institution Overview"
        subtitle="Live student enrolments, billing totals, and fee collections"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              icon={<FileText className="w-4 h-4 text-emerald-600" />}
              onClick={() => navigate('/invoices')}
            >
              Generate Invoices
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<CreditCard className="w-4 h-4" />}
              onClick={() => navigate('/payments')}
            >
              Record Payment
            </Button>
          </div>
        }
      />

      {/* Migration Notice Banner (Section 5G requirement) */}
      {metrics.migrationSummary.totalRecords > 0 && (
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">
                    Excel Migration Status: {metrics.migrationSummary.totalRecords} Enrolment Records Imported
                  </h3>
                  <Badge variant="brand" size="sm">
                    {metrics.migrationSummary.verifiedCount}/{metrics.migrationSummary.totalRecords} Verified
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Migrated from <code className="text-emerald-300 font-mono">I2B.xlsx</code> Sheet1. Total listed monthly enrolment fees: <span className="font-bold text-emerald-400">₹{metrics.migrationSummary.totalListedFee.toLocaleString('en-IN')}</span>. As per institutional policy, records require administrator verification before activating monthly billing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowUpRight className="w-4 h-4" />}
                onClick={() => navigate('/migration')}
                className="whitespace-nowrap"
              >
                Review & Verify Migration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Grid (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Active Students"
          value={metrics.totalActiveStudents}
          subtitle="Enrolled students"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
          onClick={() => navigate('/students')}
        />
        <StatCard
          title="Enrolments"
          value={metrics.totalActiveEnrollments}
          subtitle="Across 4 programmes"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-sky-50 text-sky-600"
          onClick={() => navigate('/enrollments')}
        />
        <StatCard
          title="Month Billed"
          value={`₹${metrics.currentMonthInvoiced.toLocaleString('en-IN')}`}
          subtitle="Current billing cycle"
          icon={<FileText className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600"
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          title="Collected"
          value={`₹${metrics.currentMonthCollected.toLocaleString('en-IN')}`}
          subtitle="Cash & Digital receipts"
          icon={<CreditCard className="w-5 h-5" />}
          iconBgColor="bg-teal-50 text-teal-600"
          onClick={() => navigate('/payments')}
        />
        <StatCard
          title="Outstanding"
          value={`₹${metrics.currentOutstanding.toLocaleString('en-IN')}`}
          subtitle="Unpaid balances"
          icon={<IndianRupee className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600"
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          title="Overdue"
          value={metrics.overdueInvoicesCount}
          subtitle="Action needed"
          icon={<AlertCircle className="w-5 h-5" />}
          iconBgColor="bg-rose-50 text-rose-600"
          onClick={() => navigate('/overdue')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Collection Trend (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Monthly Billing & Collection Trend"
            subtitle="Comparison of billed fees versus actual received receipts"
            action={
              <Badge variant="success" size="sm" icon={<TrendingUp className="w-3 h-3" />}>
                Last 6 Months
              </Badge>
            }
          />
          <CardBody className="pt-2">
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.monthlyCollectionTrend}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="billed" name="Billed (₹)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Programme Distribution (1 Col) */}
        <Card>
          <CardHeader
            title="Programme Enrolments"
            subtitle="Active student distribution by programme"
          />
          <CardBody className="pt-2 flex flex-col justify-between">
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.programmeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                  >
                    {metrics.programmeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PROGRAMME_COLORS[index % PROGRAMME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val} enrolments (₹${item.payload.feeTotal.toLocaleString('en-IN')})`,
                      name,
                    ]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-3">
              {metrics.programmeDistribution.map((prog, idx) => (
                <div key={prog.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PROGRAMME_COLORS[idx % PROGRAMME_COLORS.length] }}
                    />
                    <span className="font-medium text-slate-700 truncate">{prog.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{prog.count}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 font-mono">₹{prog.feeTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity: Payments & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader
            title="Recent Payments"
            subtitle="Latest received fee payments and issued receipts"
            action={
              <button
                onClick={() => navigate('/payments')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />
          <CardBody className="p-0">
            {metrics.recentPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No payments recorded yet. Click "Record Payment" to issue your first receipt.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.recentPayments.map((p) => (
                  <div key={p.id} className="p-3.5 sm:p-4 hover:bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                        ₹
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{p.student?.name || 'Student'}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {p.payment_number} • {p.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600">
                        +₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-400">{p.payment_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader
            title="Recent Invoices"
            subtitle="Latest generated monthly tuition charges"
            action={
              <button
                onClick={() => navigate('/invoices')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />
          <CardBody className="p-0">
            {metrics.recentInvoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No invoices generated for this period yet. Generate invoices from the Invoices tab.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-3.5 sm:p-4 hover:bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{inv.student?.name || 'Student'}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {inv.invoice_number} • Period: {inv.billing_month}/{inv.billing_year}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        ₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge
                        variant={inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'warning' : 'danger'}
                        size="sm"
                      >
                        {inv.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

