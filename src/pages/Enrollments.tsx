import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Search,
  Plus,
  ChevronRight,
  Edit,
  X,
  GraduationCap,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Enrollment, Programme, Student, FeeStructure } from '../types';
import {
  getEnrollments,
  getProgrammes,
  getStudents,
  getFeeStructures,
  createEnrollment,
  updateEnrollment,
  promoteEnrollment,
} from '../services/dbService';
import {
  SUBJECT_CLASSES,
  HINDI_GRADES,
  findMatchingFee,
  getNextPromotedClass
} from '../utils/feeLookup';
import { toast } from 'sonner';

function getClassOptions(prog?: Programme): string[] {
  if (!prog) return SUBJECT_CLASSES;
  if (prog.code === 'SUBJECT') return SUBJECT_CLASSES;
  return HINDI_GRADES;
}

function getBoardOptions(prog?: Programme): string[] {
  if (!prog) return ['Matric', 'CBSE', 'Virtual', 'Online', 'Standard'];
  if (prog.code === 'SUBJECT') return ['Matric', 'CBSE'];
  return ['Virtual', 'Online', 'Standard'];
}

export const Enrollments: React.FC = () => {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Enrol Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnrol, setEditingEnrol] = useState<Enrollment | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    programme_id: '',
    class_or_grade: '',
    board: 'Matric',
    agreed_fee: 0,
    start_date: new Date().toISOString().split('T')[0],
    status: 'active' as Enrollment['status'],
    notes: '',
  });

  // Student search within modal
  const [studentSearch, setStudentSearch] = useState('');

  // Promote Modal state
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [enrolToPromote, setEnrolToPromote] = useState<Enrollment | null>(null);
  const [promoteNextClass, setPromoteNextClass] = useState('');
  const [promoteNewFee, setPromoteNewFee] = useState<number>(0);
  const [promoteNotes, setPromoteNotes] = useState('');
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [enrs, progs, stus, fees] = await Promise.all([
        getEnrollments(),
        getProgrammes(),
        getStudents(),
        getFeeStructures(),
      ]);
      setEnrollments(enrs);
      setProgrammes(progs);
      setStudents(stus);
      setFeeStructures(fees);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load enrolments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-lookup fee when programme/class/board changes
  useEffect(() => {
    if (editingEnrol) return; // Don't override when editing
    if (!formData.programme_id || !formData.class_or_grade) return;
    const fee = findMatchingFee(
      feeStructures,
      formData.programme_id,
      formData.class_or_grade,
      formData.board
    );
    if (fee !== null && fee > 0) {
      setFormData((prev) => ({ ...prev, agreed_fee: fee }));
    }
  }, [formData.programme_id, formData.class_or_grade, formData.board, feeStructures]);

  const openAddModal = () => {
    setEditingEnrol(null);
    setStudentSearch('');
    const firstProg = programmes[0];
    setFormData({
      student_id: '',
      programme_id: firstProg?.id || '',
      class_or_grade: '',
      board: firstProg?.code === 'SUBJECT' ? 'Matric' : 'Virtual',
      agreed_fee: 0,
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openPromoteModal = (enr: Enrollment) => {
    setEnrolToPromote(enr);
    const prog = programmes.find(p => p.id === enr.programme_id);
    const nextClass = getNextPromotedClass(enr.class_or_grade, prog) || enr.class_or_grade;
    setPromoteNextClass(nextClass);

    // Auto-fetch fee for the next class
    const fee = findMatchingFee(feeStructures, enr.programme_id, nextClass, enr.board);
    setPromoteNewFee(fee !== null && fee > 0 ? fee : Number(enr.agreed_fee));
    setPromoteNotes('');
    setPromoteModalOpen(true);
  };

  const handlePromoteClassChange = (selectedClass: string) => {
    setPromoteNextClass(selectedClass);
    if (!enrolToPromote) return;
    const fee = findMatchingFee(feeStructures, enrolToPromote.programme_id, selectedClass, enrolToPromote.board);
    if (fee !== null && fee > 0) {
      setPromoteNewFee(fee);
    }
  };

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrolToPromote) return;
    if (!promoteNextClass) {
      toast.error('Please select the promoted class');
      return;
    }
    if (promoteNewFee <= 0) {
      toast.error('Fee must be greater than zero');
      return;
    }

    setPromoteSubmitting(true);
    try {
      await promoteEnrollment(enrolToPromote.id, promoteNextClass, promoteNewFee, promoteNotes);
      toast.success(
        `🎉 Successfully promoted ${enrolToPromote.student?.name} to ${promoteNextClass}! New fee: ₹${promoteNewFee}`
      );
      setPromoteModalOpen(false);
      setEnrolToPromote(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Promotion failed');
    } finally {
      setPromoteSubmitting(false);
    }
  };

  const openEditModal = (enr: Enrollment) => {
    setEditingEnrol(enr);
    setFormData({
      student_id: enr.student_id,
      programme_id: enr.programme_id,
      class_or_grade: enr.class_or_grade,
      board: enr.board || 'Matric',
      agreed_fee: Number(enr.agreed_fee),
      start_date: enr.start_date,
      status: enr.status,
      notes: enr.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleProgrammeChange = (progId: string) => {
    const prog = programmes.find((p) => p.id === progId);
    const boards = getBoardOptions(prog);
    setFormData((prev) => ({
      ...prev,
      programme_id: progId,
      class_or_grade: '',
      board: boards[0] || 'Matric',
      agreed_fee: 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.programme_id || !formData.class_or_grade) {
      toast.error('Please complete all required fields');
      return;
    }
    if (!editingEnrol && !formData.student_id) {
      toast.error('Please select a student');
      return;
    }

    try {
      if (editingEnrol) {
        await updateEnrollment(editingEnrol.id, formData);
        toast.success('Enrolment updated successfully');
      } else {
        await createEnrollment({ ...formData, is_verified: true });
        toast.success('New enrolment created successfully');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const filteredEnrollments = enrollments.filter((enr) => {
    const stuName = enr.student?.name || '';
    const stuId = enr.student?.student_id || '';
    const matchesSearch =
      stuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stuId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enr.class_or_grade.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProg = !programmeFilter || enr.programme_id === programmeFilter;
    const matchesStatus = statusFilter === 'all' || enr.status === statusFilter;

    return matchesSearch && matchesProg && matchesStatus;
  });

  // Students filtered in modal search
  const modalStudents = studentSearch
    ? students.filter((s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.student_id.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : students;

  const totalFeeSum = filteredEnrollments.reduce((sum, e) => sum + Number(e.agreed_fee), 0);
  const selectedProg = programmes.find((p) => p.id === formData.programme_id);
  const classOptions = getClassOptions(selectedProg);
  const boardOptions = getBoardOptions(selectedProg);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Programme Enrolments"
        subtitle={`Total active enrolments: ${enrollments.filter((e) => e.status === 'active').length} • Filtered Sum: ₹${totalFeeSum.toLocaleString('en-IN')}`}
        action={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
          >
            New Enrolment
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6">
            <Input
              type="text"
              placeholder="Search by student name or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              placeholder="All Programmes"
              options={programmes.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'active', label: 'Active Enrolments' },
                { value: 'completed', label: 'Completed' },
                { value: 'paused', label: 'Paused' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'all', label: 'All Statuses' },
              ]}
            />
          </div>
        </div>

        {(searchQuery || programmeFilter || statusFilter !== 'active') && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <span>Filtered results</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setProgrammeFilter('');
                setStatusFilter('active');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Enrolment list */}
      {loading ? (
        <LoadingSkeleton rows={6} height="h-16" />
      ) : filteredEnrollments.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-8 h-8" />}
          title="No enrolments found"
          description="Try modifying search keywords or clearing active filters."
          actionLabel="Create Enrolment"
          onAction={openAddModal}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile view: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredEnrollments.map((enr) => (
              <div
                key={enr.id}
                className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3
                      onClick={() => navigate(`/students/${enr.student_id}`)}
                      className="text-sm font-bold text-slate-900 hover:text-emerald-600 cursor-pointer"
                    >
                      {enr.student?.name || 'Student'}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500">{enr.student?.student_id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Agreed Fee</span>
                    <span className="text-sm font-extrabold text-emerald-600">
                      ₹{Number(enr.agreed_fee).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold">
                    {enr.programme?.name}
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {enr.class_or_grade}
                  </span>
                  {enr.board && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {enr.board}
                    </span>
                  )}
                  <Badge variant={enr.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {enr.status}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Start: {enr.start_date}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      icon={<GraduationCap className="w-3.5 h-3.5 text-emerald-600" />}
                      onClick={() => openPromoteModal(enr)}
                    >
                      Promote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit className="w-3.5 h-3.5" />}
                      onClick={() => openEditModal(enr)}
                    >
                      Edit
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
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Programme</th>
                    <th className="py-3 px-4">Class / Grade</th>
                    <th className="py-3 px-4">Board</th>
                    <th className="py-3 px-4 text-right">Agreed Monthly Fee</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredEnrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/students/${enr.student_id}`)}
                          className="text-left font-bold text-slate-900 hover:text-emerald-600 flex items-center gap-1.5"
                        >
                          <span>{enr.student?.name}</span>
                          <span className="text-[11px] font-mono text-slate-400">({enr.student?.student_id})</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                        {enr.programme?.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700">
                        {enr.class_or_grade}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {enr.board || '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-emerald-600 text-sm">
                        ₹{Number(enr.agreed_fee).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {enr.start_date}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge variant={enr.status === 'active' ? 'success' : 'neutral'} size="sm">
                          {enr.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                            icon={<GraduationCap className="w-3.5 h-3.5 text-emerald-600" />}
                            onClick={() => openPromoteModal(enr)}
                            title="Promote to Next Class"
                          >
                            Promote
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit className="w-3.5 h-3.5" />}
                            onClick={() => openEditModal(enr)}
                          >
                            Edit
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

      {/* Add / Edit Enrolment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEnrol ? 'Edit Enrolment' : 'Create Enrolment'}
        subtitle={editingEnrol ? 'Update agreed monthly fee or status' : 'Enrol an existing student in a programme'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Student selector (new only) */}
          {!editingEnrol && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Student <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Type to search student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-1.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
              />
              <select
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                required
                size={5}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
              >
                <option value="">— Select student —</option>
                {modalStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.student_id})
                  </option>
                ))}
              </select>
              {formData.student_id && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  ✓ Selected: {students.find((s) => s.id === formData.student_id)?.name}
                </p>
              )}
            </div>
          )}

          {/* Programme */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Programme <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.programme_id}
              onChange={(e) => editingEnrol
                ? setFormData({ ...formData, programme_id: e.target.value })
                : handleProgrammeChange(e.target.value)
              }
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
            {/* Class / Grade — smart dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Class / Grade <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.class_or_grade}
                onChange={(e) => setFormData({ ...formData, class_or_grade: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
              >
                <option value="">— Select class —</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Board */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Board / Mode
              </label>
              <select
                value={formData.board}
                onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
              >
                {boardOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Agreed Fee — auto-populated */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Agreed Monthly Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={formData.agreed_fee || ''}
                  onChange={(e) => setFormData({ ...formData, agreed_fee: parseFloat(e.target.value) || 0 })}
                  placeholder="Auto-populated from fee structure"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              </div>
              {formData.agreed_fee > 0 && !editingEnrol && (
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                  ✓ Auto-populated from fee structure
                </p>
              )}
            </div>

            {/* Start Date */}
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
          </div>

          <Select
            label="Enrolment Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingEnrol ? 'Update Enrolment' : 'Save Enrolment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* PROMOTE STUDENT MODAL                                                 */}
      {/* ===================================================================== */}
      {enrolToPromote && (
        <Modal
          isOpen={promoteModalOpen}
          onClose={() => setPromoteModalOpen(false)}
          title={`Promote Student: ${enrolToPromote.student?.name}`}
          subtitle={`Current Class: ${enrolToPromote.class_or_grade} • Programme: ${enrolToPromote.programme?.name}`}
          maxWidth="md"
        >
          <form onSubmit={handlePromoteSubmit} className="space-y-4 py-2">
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Next Academic Class Progression</span>
              </div>
              <p className="text-emerald-800/90 leading-relaxed">
                Promote <strong>{enrolToPromote.student?.name}</strong> to the next standard. The standard monthly tuition fee for the new class is auto-calculated below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block">Current Class:</span>
                <strong className="text-slate-800 text-sm">{enrolToPromote.class_or_grade}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Current Agreed Fee:</span>
                <strong className="text-slate-800 text-sm">₹{enrolToPromote.agreed_fee}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Promote to Next Class / Grade <span className="text-rose-500">*</span>
              </label>
              <select
                value={promoteNextClass}
                onChange={(e) => handlePromoteClassChange(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
              >
                <option value="">— Select Next Class —</option>
                {getClassOptions(programmes.find(p => p.id === enrolToPromote.programme_id)).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Agreed Monthly Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={promoteNewFee || ''}
                  onChange={(e) => setPromoteNewFee(parseFloat(e.target.value) || 0)}
                  placeholder="Auto-calculated from fee matrix"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              </div>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                ✓ Auto-fetched from institutional fee structure
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Promotion Notes / Reason</label>
              <input
                type="text"
                value={promoteNotes}
                onChange={(e) => setPromoteNotes(e.target.value)}
                placeholder="e.g. Annual academic promotion to next grade"
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPromoteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={promoteSubmitting}
                icon={<GraduationCap className="w-4 h-4" />}
              >
                Confirm Promotion
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
