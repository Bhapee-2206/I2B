import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  FileText,
  CreditCard,
  MessageSquare,
  Database,
  Download,
  Upload,
  Save,
  CheckCircle2,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { exportFullDatabase, isSupabaseSchemaAvailable } from '../services/dbService';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const { settings, saveSettings, refreshSettings } = useSettings();
  const { user } = useAuth();

  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [supabaseOnline, setSupabaseOnline] = useState<boolean | null>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'whatsapp' | 'database'>('profile');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    setFormData(settings);
    isSupabaseSchemaAvailable().then(setSupabaseOnline);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(formData);
      toast.success('Institution settings saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportFullDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `I2B_Full_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Downloaded complete JSON database backup!');
    } catch {
      toast.error('Backup generation failed');
    }
  };

  const handleCopySql = async () => {
    try {
      const response = await fetch('/supabase/schema_and_seed_all_in_one.sql');
      const text = response.ok ? await response.text() : '-- SQL schema file';
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      toast.success('Copied full SQL migration script to clipboard!');
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      toast.error('Copy failed. Access supabase/schema_and_seed_all_in_one.sql directly.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution Settings"
        subtitle="Manage branding, numbering sequences, WhatsApp modes, and database configurations"
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'profile', label: 'Institution Profile & Branding' },
          { id: 'billing', label: 'Receipt & Invoice Prefixes' },
          { id: 'whatsapp', label: 'WhatsApp Delivery Settings' },
          { id: 'database', label: 'Database & Cloud Backups' },
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =================================================================== */}
        {/* TAB 1: PROFILE & BRANDING                                           */}
        {/* =================================================================== */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader
              title="Official Institutional Profile"
              subtitle="Displayed on student receipts, invoice headers, and parent statements"
            />
            <CardBody className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={formData.logo_url || '/logo.jpg'}
                  alt="I2B Logo"
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-emerald-500/40 shrink-0"
                />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">Institution Logo</p>
                  <p className="text-xs text-slate-500">
                    High-resolution official I2B logo used in PDF generation.
                  </p>
                  <input
                    type="text"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="text-xs p-1.5 border border-slate-300 rounded w-full max-w-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Institution Legal Name"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  required
                />
                <Input
                  label="Subtitle / Department"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                />
              </div>

              <Input
                label="Full Campus Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Education Lane, Chennai, Tamil Nadu"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Office Phone Number"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  required
                />
                <Input
                  label="Institution WhatsApp Contact"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  required
                />
                <Input
                  label="Administrative Email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  required
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" loading={saving} icon={<Save className="w-4 h-4" />}>
                  Save Profile Settings
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* =================================================================== */}
        {/* TAB 2: BILLING & NUMBERING SEQUENCES                                */}
        {/* =================================================================== */}
        {activeTab === 'billing' && (
          <Card>
            <CardHeader
              title="Numbering Prefixes & Financial Rules"
              subtitle="Configure sequence codes for automatic document generation"
            />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="Receipt Prefix"
                  value={formData.receipt_prefix}
                  onChange={(e) => setFormData({ ...formData, receipt_prefix: e.target.value.toUpperCase() })}
                  helperText="e.g. REC-202611-001"
                  required
                />
                <Input
                  label="Invoice Prefix"
                  value={formData.invoice_prefix}
                  onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                  helperText="e.g. INV-202611-001"
                  required
                />
                <Input
                  label="Payment Prefix"
                  value={formData.payment_prefix}
                  onChange={(e) => setFormData({ ...formData, payment_prefix: e.target.value.toUpperCase() })}
                  helperText="e.g. PAY-202611-001"
                  required
                />
                <Input
                  label="Student Prefix"
                  value={formData.student_prefix}
                  onChange={(e) => setFormData({ ...formData, student_prefix: e.target.value.toUpperCase() })}
                  helperText="e.g. I2B-STU-001"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Default Invoice Due Day (of month)"
                  type="number"
                  min="1"
                  max="28"
                  value={formData.default_due_day}
                  onChange={(e) => setFormData({ ...formData, default_due_day: parseInt(e.target.value) || 10 })}
                  helperText="e.g. 10th of every month"
                  required
                />
                <Input
                  label="Currency Symbol"
                  value={formData.currency_symbol}
                  onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                  helperText="Default: ₹ (Indian Rupee)"
                  required
                />
              </div>

              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Receipt Footer Disclaimer
                </label>
                <textarea
                  rows={2}
                  value={formData.receipt_footer}
                  onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" loading={saving} icon={<Save className="w-4 h-4" />}>
                  Save Billing Settings
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* =================================================================== */}
        {/* TAB 3: WHATSAPP SETTINGS (Modes A & B)                              */}
        {/* =================================================================== */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="WhatsApp Integration Architecture"
                subtitle="Supports Mode A (Instant manual sharing) and Mode B (Meta Cloud API)"
              />
              <CardBody className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">Mode A: Active Initial Release</Badge>
                    <span className="font-bold text-slate-900">Direct WhatsApp Link Scheme</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Zero external API key dependencies. Generates instant 1-click WhatsApp links (<code className="bg-slate-200 px-1 py-0.5 rounded font-mono">wa.me/phone?text=...</code>) formatted with the student name, receipt number, amount received, and remaining balance. The administrator attaches the downloaded PDF and verifies delivery.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">Mode B: Future Enterprise Release</Badge>
                    <span className="font-bold text-slate-900">Meta WhatsApp Cloud API</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Designed for automated server-side message dispatching through Supabase Edge Functions with Meta Business verification.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Input
                      label="WhatsApp Business Account ID (WABA)"
                      placeholder="Optional WABA ID"
                      disabled
                    />
                    <Input
                      label="Phone Number ID"
                      placeholder="Optional Phone Number ID"
                      disabled
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: DATABASE & BACKUPS                                           */}
        {/* =================================================================== */}
        {activeTab === 'database' && (
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Supabase PostgreSQL & Cloud Schema"
                subtitle="Live status, database migrations, and disaster recovery"
              />
              <CardBody className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">PostgreSQL Schema Status</span>
                      <Badge variant={supabaseOnline ? 'success' : 'warning'}>
                        {supabaseOnline ? 'Synchronized' : 'Active Local Store'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      https://bpowmzajdyvddnwrqupq.supabase.co
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={<Copy className="w-4 h-4" />}
                      onClick={handleCopySql}
                    >
                      {copiedSql ? 'Copied SQL!' : 'Copy Migration SQL'}
                    </Button>
                    <a
                      href="https://supabase.com/dashboard/project/bpowmzajdyvddnwrqupq/sql/new"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button type="button" variant="primary" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                        SQL Editor
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <h4 className="font-bold text-slate-900">Database Backup & Portability</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Export a full JSON snapshot of all institutional data: settings, programmes, fee matrices, students, enrolments, invoices, payments, and receipts.
                  </p>
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Download className="w-4 h-4" />}
                      onClick={handleExportBackup}
                    >
                      Download Complete JSON Backup
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </form>
    </div>
  );
};
