import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  IndianRupee,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Users,
  Layers,
  History,
  CheckSquare,
  Square,
  PauseCircle,
  HelpCircle
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
import {
  Student,
  Enrollment,
  Programme,
  FeeStructure,
  AcademicYear,
  ClassPromotionRecord
} from '../types';
import {
  getStudents,
  getEnrollments,
  getProgrammes,
  getFeeStructures,
  getAcademicYears,
  getClassPromotions,
  recordClassPromotion,
  bulkPromoteEnrollments
} from '../services/dbService';
import {
  SUBJECT_CLASSES,
  HINDI_GRADES,
  findMatchingFee,
  getNextPromotedClass
} from '../utils/feeLookup';
import { toast } from 'sonner';

export const Promotions: React.FC = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [history, setHistory] = useState<ClassPromotionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab: 'eligible' | 'history'
  const [activeTab, setActiveTab] = useState<'eligible' | 'history'>('eligible');

  // Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  // Bulk selection
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());

  // Single promotion modal
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [activeEnrollment, setActiveEnrollment] = useState<Enrollment | null>(null);
  const [promoType, setPromoType] = useState<ClassPromotionRecord['promotion_type']>('promoted');
  const [targetClass, setTargetClass] = useState('');
  const [targetBoard, setTargetBoard] = useState('');
  const [targetFee, setTargetFee] = useState<number>(0);
  const [feeOverride, setFeeOverride] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [promoNotes, setPromoNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk promotion review modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkEffectiveDate, setBulkEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkNotes, setBulkNotes] = useState('Annual batch academic promotion');

  const loadData = async () => {
    try {
      const [stus, enrs, progs, fees, years, hist] = await Promise.all([
        getStudents(),
        getEnrollments(),
        getProgrammes(),
        getFeeStructures(),
        getAcademicYears(),
        getClassPromotions()
      ]);

      setStudents(stus);
      setEnrollments(enrs.filter(e => e.status === 'active'));
      setProgrammes(progs);
      setFeeStructures(fees);
      setAcademicYears(years);
      setHistory(hist);

      const activeYear = years.find(y => y.is_active) || years[0];
      if (activeYear) {
        setSelectedAcademicYear(activeYear.year_name);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load promotions data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered active enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(enr => {
      const stu = enr.student;
      if (!stu || stu.status !== 'active') return false;

      const matchesSearch =
        stu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stu.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        enr.class_or_grade.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProg = programmeFilter === 'all' || enr.programme_id === programmeFilter;
      const matchesClass = classFilter === 'all' || enr.class_or_grade === classFilter;

      return matchesSearch && matchesProg && matchesClass;
    });
  }, [enrollments, searchQuery, programmeFilter, classFilter]);

  // Open single promotion modal
  const handleOpenSinglePromotion = (enr: Enrollment) => {
    setActiveEnrollment(enr);
    const nextCls = getNextPromotedClass(enr.class_or_grade, enr.programme) || enr.class_or_grade;
    setTargetClass(nextCls);
    const board = enr.board || 'Matric';
    setTargetBoard(board);
    setPromoType('promoted');
    setFeeOverride(false);
    setPromoNotes('');
    setEffectiveDate(new Date().toISOString().split('T')[0]);

    // Lookup fee for next class
    const feeMatch = findMatchingFee(feeStructures, enr.programme_id, nextCls, board);
    setTargetFee(feeMatch !== null ? feeMatch : enr.agreed_fee);
    setSingleModalOpen(true);
  };

  // Re-calculate target fee when target class or board changes
  const handleClassOrBoardChange = (newClass: string, newBoard: string, type: ClassPromotionRecord['promotion_type']) => {
    setTargetClass(newClass);
    setTargetBoard(newBoard);
    setPromoType(type);

    if (type === 'repeated') {
      if (activeEnrollment) {
        setTargetFee(activeEnrollment.agreed_fee);
      }
      return;
    }

    if (activeEnrollment && !feeOverride) {
      const match = findMatchingFee(feeStructures, activeEnrollment.programme_id, newClass, newBoard);
      if (match !== null) {
        setTargetFee(match);
      } else {
        setTargetFee(activeEnrollment.agreed_fee);
      }
    }
  };

  // Handle single promotion submission
  const handleConfirmSinglePromotion = async () => {
    if (!activeEnrollment || !activeEnrollment.student) return;

    setSubmitting(true);
    try {
      await recordClassPromotion({
        student_id: activeEnrollment.student_id,
        enrollment_id: activeEnrollment.id,
        programme_id: activeEnrollment.programme_id,
        academic_year: selectedAcademicYear,
        old_class: activeEnrollment.class_or_grade,
        new_class: targetClass,
        old_board: activeEnrollment.board,
        new_board: targetBoard,
        old_fee: activeEnrollment.agreed_fee,
        new_fee: targetFee,
        effective_date: effectiveDate,
        promotion_type: promoType,
        notes: promoNotes || undefined,
        performed_by: 'Administrator'
      });

      toast.success(
        `Promoted ${activeEnrollment.student.name}: ${activeEnrollment.class_or_grade} → ${targetClass} (₹${targetFee}/mo)`
      );
      setSingleModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to record promotion');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle selection
  const toggleSelectEnrollment = (id: string) => {
    const next = new Set(selectedEnrollmentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEnrollmentIds(next);
  };

  const handleSelectAllVisible = () => {
    if (selectedEnrollmentIds.size === filteredEnrollments.length && filteredEnrollments.length > 0) {
      setSelectedEnrollmentIds(new Set());
    } else {
      setSelectedEnrollmentIds(new Set(filteredEnrollments.map(e => e.id)));
    }
  };

  // Bulk candidates preparation for review screen
  const bulkCandidates = useMemo(() => {
    return Array.from(selectedEnrollmentIds).map(id => {
      const enr = enrollments.find(e => e.id === id);
      if (!enr) return null;
      const nextCls = getNextPromotedClass(enr.class_or_grade, enr.programme) || enr.class_or_grade;
      const board = enr.board || 'Matric';
      const feeMatch = findMatchingFee(feeStructures, enr.programme_id, nextCls, board);
      const newFee = feeMatch !== null ? feeMatch : enr.agreed_fee;

      return {
        enrollment: enr,
        student: enr.student,
        programme: enr.programme,
        oldClass: enr.class_or_grade,
        nextClass: nextCls,
        oldFee: enr.agreed_fee,
        newFee,
        board,
        hasExactFee: feeMatch !== null
      };
    }).filter(Boolean) as Array<{
      enrollment: Enrollment;
      student?: Student;
      programme?: Programme;
      oldClass: string;
      nextClass: string;
      oldFee: number;
      newFee: number;
      board: string;
      hasExactFee: boolean;
    }>;
  }, [selectedEnrollmentIds, enrollments, feeStructures]);

  // Execute bulk promotion
  const handleConfirmBulkPromotion = async () => {
    if (bulkCandidates.length === 0) return;
    setSubmitting(true);

    try {
      const recordsToCreate = bulkCandidates.map(c => ({
        student_id: c.enrollment.student_id,
        enrollment_id: c.enrollment.id,
        programme_id: c.enrollment.programme_id,
        academic_year: selectedAcademicYear,
        old_class: c.oldClass,
        new_class: c.nextClass,
        old_board: c.enrollment.board,
        new_board: c.board,
        old_fee: c.oldFee,
        new_fee: c.newFee,
        effective_date: bulkEffectiveDate,
        promotion_type: 'promoted' as const,
        notes: bulkNotes,
        performed_by: 'Administrator'
      }));

      await bulkPromoteEnrollments(recordsToCreate);

      toast.success(`Successfully promoted ${recordsToCreate.length} students to their next school class!`);
      setSelectedEnrollmentIds(new Set());
      setBulkModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Bulk promotion failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Student Promotions"
        subtitle="Review and manually advance students to their next school grade with auditable fee snapshots"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Target Academic Year:</span>
              <select
                value={selectedAcademicYear}
                onChange={e => setSelectedAcademicYear(e.target.value)}
                className="bg-transparent font-bold text-emerald-700 outline-none cursor-pointer"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.year_name}>
                    {y.year_name} {y.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedEnrollmentIds.size > 0 && (
              <Button
                variant="primary"
                onClick={() => setBulkModalOpen(true)}
                icon={<GraduationCap className="w-4 h-4" />}
              >
                Review Bulk Promotion ({selectedEnrollmentIds.size})
              </Button>
            )}
          </div>
        }
      />

      {/* Alert Card explaining business rule */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Manual Class Promotion Policy</p>
          <p className="text-amber-800 leading-relaxed">
            In accordance with institutional business rules, student class advancement is <strong>strictly manual</strong>.
            EduTrack never auto-increments grades on calendar dates. Each promotion explicitly records previous and new fee snapshots,
            preserving historical monthly invoices and receipts without silent rewrites.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('eligible')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'eligible'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Active Students for Promotion ({filteredEnrollments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Promotion History & Log ({history.length})</span>
        </button>
      </div>

      {activeTab === 'eligible' ? (
        <Card>
          <CardHeader
            title="Eligible Students for Class Promotion"
            subtitle="Select individual students or batch promote"
          />
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student name, ID or current class..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Programme filter */}
                <select
                  value={programmeFilter}
                  onChange={e => setProgrammeFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700"
                >
                  <option value="all">All Programmes</option>
                  {programmes.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Class filter */}
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700"
                >
                  <option value="all">All Classes</option>
                  {[...SUBJECT_CLASSES, ...HINDI_GRADES].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllVisible}
                  icon={
                    selectedEnrollmentIds.size === filteredEnrollments.length && filteredEnrollments.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )
                  }
                >
                  {selectedEnrollmentIds.size === filteredEnrollments.length && filteredEnrollments.length > 0
                    ? 'Deselect All'
                    : 'Select All Visible'}
                </Button>
              </div>
            </div>
          </div>

          <CardBody className="p-0">
            {loading ? (
              <LoadingSkeleton rows={5} />
            ) : filteredEnrollments.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="w-12 h-12 text-slate-300" />}
                title="No eligible students found"
                description="Try adjusting your search criteria or programme filter."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedEnrollmentIds.size === filteredEnrollments.length && filteredEnrollments.length > 0}
                          onChange={handleSelectAllVisible}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Programme</th>
                      <th className="py-3 px-4">Current Grade</th>
                      <th className="py-3 px-4">Board / Mode</th>
                      <th className="py-3 px-4">Current Fee</th>
                      <th className="py-3 px-4">Suggested Next Grade</th>
                      <th className="py-3 px-4 text-right">Promotion Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEnrollments.map(enr => {
                      const stu = enr.student;
                      if (!stu) return null;
                      const isSelected = selectedEnrollmentIds.has(enr.id);
                      const nextCls = getNextPromotedClass(enr.class_or_grade, enr.programme) || enr.class_or_grade;
                      const feeMatch = findMatchingFee(feeStructures, enr.programme_id, nextCls, enr.board || 'Matric');

                      return (
                        <tr
                          key={enr.id}
                          className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-emerald-50/40' : ''}`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectEnrollment(enr.id)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{stu.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{stu.student_id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-700">{enr.programme?.name || 'Programme'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="neutral">{enr.class_or_grade}</Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {enr.board || '—'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            ₹{enr.agreed_fee.toLocaleString('en-IN')}/mo
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                              <span>{nextCls}</span>
                              {feeMatch !== null ? (
                                <span className="text-[11px] text-slate-400 font-normal">
                                  (₹{feeMatch.toLocaleString('en-IN')})
                                </span>
                              ) : (
                                <span className="text-[11px] text-amber-600">(fee lookup pending)</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSinglePromotion(enr)}
                              icon={<GraduationCap className="w-3.5 h-3.5 text-emerald-600" />}
                            >
                              Promote Student
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        /* History Tab */
        <Card>
          <CardHeader
            title="Class Promotion Audit Trail"
            subtitle="All historical class promotions preserved permanently"
          />
          <CardBody className="p-0">
            {history.length === 0 ? (
              <EmptyState
                icon={<History className="w-12 h-12 text-slate-300" />}
                title="No class promotions recorded yet"
                description="When students are promoted, complete auditable records will be archived here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Programme</th>
                      <th className="py-3 px-4">Academic Year</th>
                      <th className="py-3 px-4">Class Progression</th>
                      <th className="py-3 px-4">Fee Adjustment</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {item.effective_date || item.created_at?.split('T')[0]}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.student?.name || 'Student'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.student?.student_id}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.programme?.name || 'Programme'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {item.academic_year}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-slate-500">{item.old_class}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-700">{item.new_class}</span>
                          </div>
                          {item.new_board && (
                            <span className="text-[10px] text-slate-400">({item.new_board})</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            <span className="text-slate-400 line-through mr-1">₹{item.old_fee}</span>
                            <span className="text-emerald-700 font-bold">₹{item.new_fee}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              item.promotion_type === 'promoted'
                                ? 'success'
                                : item.promotion_type === 'repeated'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {item.promotion_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {item.notes || '—'}
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

      {/* ========================================================================= */}
      {/* MODAL: SINGLE STUDENT PROMOTION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={singleModalOpen}
        onClose={() => setSingleModalOpen(false)}
        title="Promote Student"
        maxWidth="lg"
      >
        {activeEnrollment && (
          <div className="space-y-5 text-xs">
            {/* Student & Programme Snapshot */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-extrabold text-sm text-slate-900">{activeEnrollment.student?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  ID: {activeEnrollment.student?.student_id} • Programme: {activeEnrollment.programme?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Current Monthly Fee</p>
                <p className="font-bold text-slate-800 text-sm">₹{activeEnrollment.agreed_fee.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Promotion Type Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Promotion Action</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: 'promoted', label: 'Promote to Next', desc: 'Advance grade' },
                  { id: 'repeated', label: 'Repeat Class', desc: 'Keep current grade' },
                  { id: 'custom', label: 'Custom Class', desc: 'Select grade' },
                  { id: 'held', label: 'Hold / Pause', desc: 'Hold promotion' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (opt.id === 'promoted') {
                        const nxt = getNextPromotedClass(activeEnrollment.class_or_grade, activeEnrollment.programme) || activeEnrollment.class_or_grade;
                        handleClassOrBoardChange(nxt, targetBoard, 'promoted');
                      } else if (opt.id === 'repeated') {
                        handleClassOrBoardChange(activeEnrollment.class_or_grade, targetBoard, 'repeated');
                      } else {
                        setPromoType(opt.id as any);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      promoType === opt.id
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <p className="font-bold">{opt.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* New Class & Board Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target School Class / Grade *</label>
                <select
                  value={targetClass}
                  onChange={e => handleClassOrBoardChange(e.target.value, targetBoard, promoType)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {(activeEnrollment.programme?.code === 'SUBJECT' ? SUBJECT_CLASSES : HINDI_GRADES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Board / Study Category</label>
                <select
                  value={targetBoard}
                  onChange={e => handleClassOrBoardChange(targetClass, e.target.value, promoType)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="Matric">Matric</option>
                  <option value="CBSE">CBSE</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Online">Online</option>
                  <option value="Standard">Standard</option>
                </select>
              </div>
            </div>

            {/* Side-by-side comparison box */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 border-b border-emerald-200/60 pb-2">
                <span>Before Promotion</span>
                <span>After Promotion (Effective Future Invoices)</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1 text-slate-600">
                  <p>Class: <strong className="text-slate-800">{activeEnrollment.class_or_grade}</strong></p>
                  <p>Board: <strong>{activeEnrollment.board || '—'}</strong></p>
                  <p>Fee: <strong className="text-slate-800">₹{activeEnrollment.agreed_fee}/mo</strong></p>
                </div>
                <div className="space-y-1 text-emerald-900">
                  <p>Class: <strong className="text-emerald-700 text-sm">{targetClass}</strong></p>
                  <p>Board: <strong>{targetBoard || '—'}</strong></p>
                  <div className="flex items-center gap-2">
                    <span>Fee:</span>
                    <input
                      type="number"
                      value={targetFee}
                      onChange={e => {
                        setTargetFee(Number(e.target.value));
                        setFeeOverride(true);
                      }}
                      className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-700 text-sm outline-none"
                    />
                    <span className="text-[10px] text-slate-400">/mo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Effective date & Academic Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  readOnly
                  value={selectedAcademicYear}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Audit Notes / Reason</label>
              <input
                type="text"
                placeholder="e.g. Annual exam cleared, promoted to standard 6th"
                value={promoNotes}
                onChange={e => setPromoNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSingleModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSinglePromotion}
                loading={submitting}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm Promotion
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: BULK PROMOTION REVIEW SCREEN */}
      {/* ========================================================================= */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Review Bulk Class Promotion (${bulkCandidates.length} Selected)`}
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Please carefully review the candidates below. Each student will be advanced to their standard next class with applicable fee structure.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
              <input
                type="date"
                value={bulkEffectiveDate}
                onChange={e => setBulkEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch Reason / Notes</label>
              <input
                type="text"
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Programme</th>
                  <th className="py-2.5 px-3">Current Grade & Fee</th>
                  <th className="py-2.5 px-3">New Grade & Fee</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bulkCandidates.map(c => (
                  <tr key={c.enrollment.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {c.student?.name}
                      <span className="block text-[10px] text-slate-400 font-mono">{c.student?.student_id}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{c.programme?.name}</td>
                    <td className="py-2 px-3 text-slate-500">
                      {c.oldClass} (₹{c.oldFee})
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-700">
                      {c.nextClass} (₹{c.newFee})
                    </td>
                    <td className="py-2 px-3">
                      {c.hasExactFee ? (
                        <Badge variant="success">Fee Matched</Badge>
                      ) : (
                        <Badge variant="warning">Preserved Fee</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-slate-500">
              Total to promote: <strong className="text-slate-900">{bulkCandidates.length} students</strong> for academic year <strong className="text-slate-900">{selectedAcademicYear}</strong>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmBulkPromotion}
                loading={submitting}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm Bulk Promotion
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Promotions;
