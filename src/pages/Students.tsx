import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  BookOpen,
  ChevronRight,
  Filter,
  Edit,
  CheckCircle2,
  Calendar,
  X,
  UserPlus
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { Card, CardBody } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Student, Enrollment, Programme, FeeStructure } from '../types';
import {
  getStudents,
  getEnrollments,
  getProgrammes,
  getFeeStructures,
  createStudent,
  updateStudent,
  createEnrollment,
} from '../services/dbService';
import {
  SUBJECT_CLASSES,
  HINDI_GRADES,
  findMatchingFee,
  normalizeClassOrGrade
} from '../utils/feeLookup';
import { toast } from 'sonner';

const BOARD_OPTIONS_SUBJECT = ['Matric', 'CBSE'];
const BOARD_OPTIONS_HINDI = ['Virtual', 'Online', 'Standard'];

function getClassOptions(programme: Programme | undefined): string[] {
  if (!programme) return SUBJECT_CLASSES;
  if (programme.code === 'SUBJECT') return SUBJECT_CLASSES;
  return HINDI_GRADES;
}

function getBoardOptions(programme: Programme | undefined): string[] {
  if (!programme) return [...BOARD_OPTIONS_SUBJECT, ...BOARD_OPTIONS_HINDI];
  if (programme.code === 'SUBJECT') return BOARD_OPTIONS_SUBJECT;
  return BOARD_OPTIONS_HINDI;
}

export const Students: React.FC = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [includeEnrolment, setIncludeEnrolment] = useState(true);

  // Student form fields
  const [formData, setFormData] = useState({
    name: '',
    parent_name: '',
    whatsapp_number: '',
    alt_phone: '',
    address: '',
    admission_date: new Date().toISOString().split('T')[0],
    status: 'active' as Student['status'],
    notes: '',
  });

  // Enrolment fields (for new student only)
  const [enrolData, setEnrolData] = useState({
    programme_id: '',
    class_or_grade: '',
    board: 'Matric',
    agreed_fee: 0,
  });

  const loadData = async () => {
    try {
      const [stus, enrs, progs, fees] = await Promise.all([
        getStudents(),
        getEnrollments(),
        getProgrammes(),
        getFeeStructures(),
      ]);
      setStudents(stus);
      setEnrollments(enrs);
      setProgrammes(progs);
      setFeeStructures(fees);

      // Set default enrolment programme
      if (progs.length > 0 && !enrolData.programme_id) {
        setEnrolData(prev => ({ ...prev, programme_id: progs[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-lookup fee when programme/class/board changes
  useEffect(() => {
    if (!enrolData.programme_id || !enrolData.class_or_grade) return;
    const fee = findMatchingFee(
      feeStructures,
      enrolData.programme_id,
      enrolData.class_or_grade,
      enrolData.board
    );
    if (fee !== null && fee > 0) {
      setEnrolData((prev) => ({ ...prev, agreed_fee: fee }));
    }
  }, [enrolData.programme_id, enrolData.class_or_grade, enrolData.board, feeStructures]);

  const openAddModal = () => {
    setEditingStudent(null);
    setIncludeEnrolment(true);
    setFormData({
      name: '',
      parent_name: '',
      whatsapp_number: '',
      alt_phone: '',
      address: '',
      admission_date: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: '',
    });
    setEnrolData({
      programme_id: programmes[0]?.id || '',
      class_or_grade: '',
      board: 'Matric',
      agreed_fee: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (stu: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingStudent(stu);
    setIncludeEnrolment(false);
    setFormData({
      name: stu.name,
      parent_name: stu.parent_name || '',
      whatsapp_number: stu.whatsapp_number || '',
      alt_phone: stu.alt_phone || '',
      address: stu.address || '',
      admission_date: stu.admission_date,
      status: stu.status,
      notes: stu.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleProgrammeChange = (progId: string) => {
    const prog = programmes.find((p) => p.id === progId);
    const boards = getBoardOptions(prog);
    setEnrolData((prev) => ({
      ...prev,
      programme_id: progId,
      class_or_grade: '',
      board: boards[0] || 'Matric',
      agreed_fee: 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Student name is required');
      return;
    }
    if (!editingStudent && includeEnrolment) {
      if (!enrolData.programme_id || !enrolData.class_or_grade) {
        toast.error('Please select programme and class/grade for enrolment');
        return;
      }
      if (enrolData.agreed_fee <= 0) {
        toast.error('Agreed monthly fee must be greater than zero');
        return;
      }
    }

    setFormSubmitting(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, formData);
        toast.success(`Updated details for ${formData.name}`);
      } else {
        const created = await createStudent(formData);
        if (includeEnrolment) {
          await createEnrollment({
            student_id: created.id,
            programme_id: enrolData.programme_id,
            class_or_grade: enrolData.class_or_grade,
            board: enrolData.board,
            agreed_fee: enrolData.agreed_fee,
            start_date: formData.admission_date,
            status: 'active',
            is_verified: true,
          });
          toast.success(`${created.name} registered & enrolled! (ID: ${created.student_id})`);
        } else {
          toast.success(`Student ${created.name} created! (ID: ${created.student_id})`);
        }
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Compute student enrolment map
  const studentEnrollmentMap = new Map<string, Enrollment[]>();
  enrollments.forEach((e) => {
    const list = studentEnrollmentMap.get(e.student_id) || [];
    list.push(e);
    studentEnrollmentMap.set(e.student_id, list);
  });

  // Filter students
  const filteredStudents = students.filter((stu) => {
    const matchesQuery =
      stu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stu.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stu.parent_name && stu.parent_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (stu.whatsapp_number && stu.whatsapp_number.includes(searchQuery));

    const matchesStatus = statusFilter === 'all' || stu.status === statusFilter;

    if (!programmeFilter) return matchesQuery && matchesStatus;

    const stuEnrols = studentEnrollmentMap.get(stu.id) || [];
    const matchesProg = stuEnrols.some((e) => e.programme_id === programmeFilter && e.status === 'active');

    return matchesQuery && matchesStatus && matchesProg;
  });

  const selectedProg = programmes.find((p) => p.id === enrolData.programme_id);
  const classOptions = getClassOptions(selectedProg);
  const boardOptions = getBoardOptions(selectedProg);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Student Management"
        subtitle={`Total registered students: ${students.length} • Filtered: ${filteredStudents.length}`}
        action={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
          >
            Add Student
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-6">
            <Input
              type="text"
              placeholder="Search by student name, ID or WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Programme Filter */}
          <div className="sm:col-span-3">
            <Select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
              placeholder="All Programmes"
              options={programmes.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'active', label: 'Active Students' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'archived', label: 'Archived' },
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

      {/* Main List / Table */}
      {loading ? (
        <LoadingSkeleton rows={6} height="h-16" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No students match criteria"
          description="Try modifying search keywords or clearing active filters."
          actionLabel="Add New Student"
          onAction={openAddModal}
        />
      ) : (
        <div className="space-y-4">
          {/* MOBILE VIEW */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredStudents.map((stu) => {
              const stuEnrols = studentEnrollmentMap.get(stu.id) || [];
              const totalAgreed = stuEnrols.reduce((s, e) => s + Number(e.agreed_fee), 0);

              return (
                <div
                  key={stu.id}
                  onClick={() => navigate(`/students/${stu.id}`)}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm active:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {stu.student_id}
                        </span>
                        <Badge
                          variant={stu.status === 'active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {stu.status}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1 truncate">
                        {stu.name}
                      </h3>
                      {stu.parent_name && (
                        <p className="text-xs text-slate-500 truncate">Parent: {stu.parent_name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 block">Monthly Fee</span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        ₹{totalAgreed.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {stuEnrols.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">No active enrolments</span>
                      ) : (
                        stuEnrols.map((enr) => (
                          <span
                            key={enr.id}
                            className="inline-flex items-center text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                          >
                            {enr.programme?.name || 'Programme'} ({enr.class_or_grade})
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => openEditModal(stu, e)}
                        className="p-2 text-slate-400 hover:text-slate-700 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Enrolment Programmes</th>
                    <th className="py-3 px-4">WhatsApp / Contact</th>
                    <th className="py-3 px-4 text-right">Agreed Monthly Fee</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStudents.map((stu) => {
                    const stuEnrols = studentEnrollmentMap.get(stu.id) || [];
                    const totalAgreed = stuEnrols.reduce((s, e) => s + Number(e.agreed_fee), 0);

                    return (
                      <tr
                        key={stu.id}
                        onClick={() => navigate(`/students/${stu.id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap">
                          {stu.student_id}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{stu.name}</span>
                            {stu.parent_name && (
                              <span className="text-[11px] font-normal text-slate-400">
                                ({stu.parent_name})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {stuEnrols.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">None</span>
                            ) : (
                              stuEnrols.map((enr) => (
                                <span
                                  key={enr.id}
                                  className="inline-flex items-center text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium"
                                >
                                  {enr.programme?.name || 'Tuition'} ({enr.class_or_grade})
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          {stu.whatsapp_number ? (
                            <span className="text-slate-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {stu.whatsapp_number}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹{totalAgreed.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Badge
                            variant={stu.status === 'active' ? 'success' : 'neutral'}
                            size="sm"
                          >
                            {stu.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Edit className="w-3.5 h-3.5" />}
                              onClick={(e) => openEditModal(stu, e)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/students/${stu.id}`)}
                            >
                              Profile
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

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.name}` : 'Register New Student'}
        subtitle={editingStudent ? 'Update personal & contact information' : 'Register student and enrol in programme in one step'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* ── SECTION 1: STUDENT DETAILS ── */}
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-100">
            Student Information
          </div>

          <Input
            label="Student Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Aryan"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Parent / Guardian Name"
              value={formData.parent_name}
              onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
            />
            <Input
              label="Primary WhatsApp Number"
              type="tel"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              placeholder="+91 98765 43210"
              helperText="For manual & automated receipt sharing"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Alternate Contact Number"
              type="tel"
              value={formData.alt_phone}
              onChange={(e) => setFormData({ ...formData, alt_phone: e.target.value })}
              placeholder="Optional secondary phone"
            />
            <Input
              label="Admission Date"
              type="date"
              value={formData.admission_date}
              onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Account Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'active', label: 'Active Enrolment' },
                { value: 'inactive', label: 'Inactive / On Leave' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <Input
              label="Residential Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Chennai, Tamil Nadu"
            />
          </div>

          {/* ── SECTION 2: ENROLMENT (new student only) ── */}
          {!editingStudent && (
            <>
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Programme Enrolment
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-slate-500">Include enrolment</span>
                  <div
                    onClick={() => setIncludeEnrolment(!includeEnrolment)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      includeEnrolment ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        includeEnrolment ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {includeEnrolment && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-3">
                  <Select
                    label="Programme"
                    value={enrolData.programme_id}
                    onChange={(e) => handleProgrammeChange(e.target.value)}
                    options={programmes.map((p) => ({ value: p.id, label: p.name }))}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Class / Grade <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={enrolData.class_or_grade}
                        onChange={(e) => setEnrolData({ ...enrolData, class_or_grade: e.target.value })}
                        required={includeEnrolment}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
                      >
                        <option value="">— Select class —</option>
                        {classOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Board / Mode
                      </label>
                      <select
                        value={enrolData.board}
                        onChange={(e) => setEnrolData({ ...enrolData, board: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
                      >
                        {boardOptions.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Agreed Monthly Fee (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="50"
                        min="0"
                        value={enrolData.agreed_fee || ''}
                        onChange={(e) =>
                          setEnrolData({ ...enrolData, agreed_fee: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="Auto-filled from fee structure"
                        required={includeEnrolment}
                        className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-sm font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 focus:outline-none"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    </div>
                    {enrolData.agreed_fee > 0 && (
                      <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                        ✓ Fee auto-populated from fee structure
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={formSubmitting}
              icon={!editingStudent ? <UserPlus className="w-4 h-4" /> : undefined}
            >
              {editingStudent ? 'Save Changes' : 'Register & Enrol'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
