import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Filter,
  Search,
  Check,
  ChevronRight,
  UserCheck,
  Info,
  RotateCcw,
  Sparkles,
  Phone,
  Edit,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { MigrationRecord, Student } from '../types';
import {
  getMigrationRecords,
  updateMigrationRecord,
  batchVerifyMigrationRecords,
  getStudents,
  updateStudent,
  resetToExcelDefaults
} from '../services/dbService';
import { toast } from 'sonner';

export const Migration: React.FC = () => {
  const navigate = useNavigate();

  const [records, setRecords] = useState<MigrationRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [programmeFilter, setProgrammeFilter] = useState<'all' | 'Subject' | 'Hindi' | 'Weekend Hindi' | 'Online Hindi'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'flagged' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit / Verify Record Modal
  const [activeRecord, setActiveRecord] = useState<MigrationRecord | null>(null);
  const [matchingStudent, setMatchingStudent] = useState<Student | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [parentName, setParentName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Reset confirmation
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const loadData = async () => {
    try {
      const [recs, stus] = await Promise.all([getMigrationRecords(), getStudents()]);
      setRecords(recs);
      setStudents(stus);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load migration audit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Totals
  const totalListedFee = records.reduce((s, r) => s + Number(r.original_fee), 0);
  const verifiedCount = records.filter((r) => r.verification_status === 'verified').length;
  const flaggedCount = records.filter((r) => r.verification_status === 'flagged').length;
  const pendingCount = records.filter((r) => r.verification_status === 'pending').length;

  // Breakdown by programme
  const subjectRecords = records.filter((r) => r.source_programme === 'Subject');
  const hindiRecords = records.filter((r) => r.source_programme === 'Hindi');
  const wkHindiRecords = records.filter((r) => r.source_programme === 'Weekend Hindi');
  const onlHindiRecords = records.filter((r) => r.source_programme === 'Online Hindi');

  const filteredRecords = records.filter((rec) => {
    const matchesProg = programmeFilter === 'all' || rec.source_programme === programmeFilter;
    const matchesStatus = statusFilter === 'all' || rec.verification_status === statusFilter;
    const matchesSearch =
      rec.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.original_class_or_grade.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesProg && matchesStatus && matchesSearch;
  });

  const handleOpenReview = (rec: MigrationRecord) => {
    setActiveRecord(rec);
    const stu = students.find((s) => s.id === rec.matched_student_id);
    setMatchingStudent(stu || null);
    setParentName(stu?.parent_name || '');
    setWhatsappNumber(stu?.whatsapp_number || '');
    setReviewModalOpen(true);
  };

  const handleVerifySingle = async (recId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateMigrationRecord(recId, { verification_status: 'verified' });
      toast.success('Record verified and approved for billing activation!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
  };

  const handleSaveAndVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;

    try {
      if (matchingStudent) {
        await updateStudent(matchingStudent.id, {
          parent_name: parentName,
          whatsapp_number: whatsappNumber,
        });
      }
      await updateMigrationRecord(activeRecord.id, {
        verification_status: 'verified',
      });
      toast.success(`Verified enrolment for ${activeRecord.original_name}`);
      setReviewModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  const handleBatchVerifyAll = async () => {
    const pendingIds = filteredRecords
      .filter((r) => r.verification_status !== 'verified')
      .map((r) => r.id);

    if (pendingIds.length === 0) {
      toast.info('All displayed records are already verified');
      return;
    }

    try {
      await batchVerifyMigrationRecords(pendingIds);
      toast.success(`Batch verified ${pendingIds.length} enrolment records!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Batch verification failed');
    }
  };

  const handleResetToExcel = async () => {
    try {
      await resetToExcelDefaults();
      toast.success('Reset database to clean Excel migration state');
      setResetConfirmOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Reset failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excel Migration Review Workspace"
        subtitle="Verification and duplicate audit for the 75 enrolment records migrated from I2B.xlsx Sheet1"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-4 h-4 text-slate-500" />}
              onClick={() => setResetConfirmOpen(true)}
            >
              Reset to Original
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleBatchVerifyAll}
            >
              Verify Filtered ({filteredRecords.filter((r) => r.verification_status !== 'verified').length})
            </Button>
          </div>
        }
      />

      {/* Verification Policy Alert (Section 5G mandate) */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 sm:p-5 text-amber-950 text-xs leading-relaxed space-y-2 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Migration Compliance & Billing Verification Rule</span>
        </div>
        <p>
          The <span className="font-bold">₹50,850</span> total represents the sum of the original listed monthly enrolment fees across the 75 records in <code className="font-mono bg-amber-100/80 px-1 rounded text-amber-900">I2B.xlsx</code> Sheet1. In accordance with institutional guidelines:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-amber-900">
          <li>This amount is <strong>NOT</strong> treated as money collected or as an outstanding historical debt.</li>
          <li>No historical invoices or phantom payment receipts were auto-generated.</li>
          <li>Potential duplicate names (e.g. <em>Monish, Maha sri, Nikitha, Nishitha</em>) are explicitly flagged below for administrator review and are kept as separate records until verified.</li>
        </ul>
      </div>

      {/* Migration Progress Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Subject */}
        <div
          onClick={() => setProgrammeFilter(programmeFilter === 'Subject' ? 'all' : 'Subject')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            programmeFilter === 'Subject'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Subject</span>
            <span className="font-mono text-emerald-600 font-bold">{subjectRecords.length} records</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">₹21,400</p>
          <span className="text-[10px] text-slate-400">Classes: LKG to 12th</span>
        </div>

        {/* Regular Hindi */}
        <div
          onClick={() => setProgrammeFilter(programmeFilter === 'Hindi' ? 'all' : 'Hindi')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            programmeFilter === 'Hindi'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Regular Hindi</span>
            <span className="font-mono text-emerald-600 font-bold">{hindiRecords.length} records</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">₹14,300</p>
          <span className="text-[10px] text-slate-400">Grades: Basic to 8th</span>
        </div>

        {/* Weekend Hindi */}
        <div
          onClick={() => setProgrammeFilter(programmeFilter === 'Weekend Hindi' ? 'all' : 'Weekend Hindi')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            programmeFilter === 'Weekend Hindi'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Weekend Hindi</span>
            <span className="font-mono text-emerald-600 font-bold">{wkHindiRecords.length} records</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">₹12,000</p>
          <span className="text-[10px] text-slate-400">Grades: Basic to 6th</span>
        </div>

        {/* Online Hindi */}
        <div
          onClick={() => setProgrammeFilter(programmeFilter === 'Online Hindi' ? 'all' : 'Online Hindi')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            programmeFilter === 'Online Hindi'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Online Hindi</span>
            <span className="font-mono text-emerald-600 font-bold">{onlHindiRecords.length} records</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-2">₹3,150</p>
          <span className="text-[10px] text-slate-400">Grades: 1st, 2nd, 10th</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6">
            <Input
              type="text"
              placeholder="Search original student name or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All 4 Programmes (75 Records)' },
                { value: 'Subject', label: 'Subject (27 records - ₹21,400)' },
                { value: 'Hindi', label: 'Regular Hindi (24 records - ₹14,300)' },
                { value: 'Weekend Hindi', label: 'Weekend Hindi (20 records - ₹12,000)' },
                { value: 'Online Hindi', label: 'Online Hindi (4 records - ₹3,150)' },
              ]}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Verification Statuses' },
                { value: 'pending', label: 'Pending Verification' },
                { value: 'flagged', label: 'Flagged / Possible Duplicates' },
                { value: 'verified', label: 'Verified Records' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Records Listing */}
      {loading ? (
        <LoadingSkeleton rows={8} height="h-16" />
      ) : (
        <div className="space-y-4">
          {/* Mobile view: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                onClick={() => handleOpenReview(rec)}
                className={`bg-white rounded-xl border p-4 shadow-sm space-y-2.5 cursor-pointer transition-colors ${
                  rec.potential_duplicate_note
                    ? 'border-amber-300 bg-amber-50/20'
                    : rec.verification_status === 'verified'
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                        #{rec.source_sno}
                      </span>
                      <span className="text-xs bg-slate-100 font-semibold text-slate-700 px-2 py-0.5 rounded">
                        {rec.source_programme}
                      </span>
                      <Badge
                        variant={
                          rec.verification_status === 'verified'
                            ? 'success'
                            : rec.verification_status === 'flagged'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {rec.verification_status}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {rec.original_name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Class/Grade: <strong className="text-slate-700">{rec.original_class_or_grade}</strong>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">Existing Fee</span>
                    <span className="text-sm font-extrabold text-emerald-600">
                      ₹{Number(rec.original_fee).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {rec.potential_duplicate_note && (
                  <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700 mt-0.5" />
                    <span className="leading-snug">{rec.potential_duplicate_note}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Source: Sheet1</span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {rec.verification_status !== 'verified' && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check className="w-3.5 h-3.5" />}
                        onClick={(e) => handleVerifySingle(rec.id, e)}
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReview(rec)}
                    >
                      Review
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
                    <th className="py-3 px-4">S.No</th>
                    <th className="py-3 px-4">Source Programme</th>
                    <th className="py-3 px-4">Original Student Name</th>
                    <th className="py-3 px-4">Class / Grade</th>
                    <th className="py-3 px-4 text-right">Existing Fee</th>
                    <th className="py-3 px-4">Duplicate / Spelling Review Note</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      onClick={() => handleOpenReview(rec)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        rec.potential_duplicate_note ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-500 whitespace-nowrap">
                        #{rec.source_sno}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {rec.source_programme}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap text-sm">
                        {rec.original_name}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {rec.original_class_or_grade}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm whitespace-nowrap">
                        ₹{Number(rec.original_fee).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        {rec.potential_duplicate_note ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded font-medium truncate max-w-full">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span className="truncate">{rec.potential_duplicate_note}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unique entry</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            rec.verification_status === 'verified'
                              ? 'success'
                              : rec.verification_status === 'flagged'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {rec.verification_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {rec.verification_status !== 'verified' && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Check className="w-3.5 h-3.5" />}
                              onClick={(e) => handleVerifySingle(rec.id, e)}
                            >
                              Verify
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReview(rec)}
                          >
                            Review
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

      {/* Review & Edit Modal */}
      {activeRecord && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title={`Verify Enrolment: ${activeRecord.original_name}`}
          subtitle={`Source: ${activeRecord.source_programme} • Class/Grade: ${activeRecord.original_class_or_grade} • Fee: ₹${activeRecord.original_fee}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveAndVerify} className="space-y-4 py-2">
            {activeRecord.potential_duplicate_note && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Duplicate / Spelling Review Alert</strong>
                  <span className="leading-relaxed">{activeRecord.potential_duplicate_note}</span>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Original Source Sheet:</span>
                <span className="font-mono text-slate-800">Sheet1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Original Row #:</span>
                <span className="font-mono text-slate-800">S.No {activeRecord.source_sno}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agreed Enrolment Monthly Fee:</span>
                <strong className="text-emerald-600 font-bold">₹{activeRecord.original_fee}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                label="Parent / Guardian Name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Add parent name if verified"
              />
              <Input
                label="Primary WhatsApp Number"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98765 43210"
                helperText="Required for manual & automated receipt sharing"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReviewModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Save & Verify Enrolment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetToExcel}
        title="Reset to Original Excel State"
        message="This will re-initialize the database with the exact 75 records from I2B.xlsx Sheet1 and clear test invoices and payments. Use this if you need to restart the migration review from scratch."
        confirmLabel="Reset All Data"
      />
    </div>
  );
};

