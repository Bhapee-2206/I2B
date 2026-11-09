import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Search,
  Plus,
  Filter,
  ChevronRight,
  Edit,
  CheckCircle2,
  AlertCircle,
  X,
  BookOpen
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Enrollment, Programme, Student } from '../types';
import {
  getEnrollments,
  getProgrammes,
  getStudents,
  createEnrollment,
  updateEnrollment
} from '../services/dbService';
import { toast } from 'sonner';

export const Enrollments: React.FC = () => {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
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
    agreed_fee: 600,
    start_date: new Date().toISOString().split('T')[0],
    status: 'active' as Enrollment['status'],
    notes: '',
  });

  const loadData = async () => {
    try {
      const [enrs, progs, stus] = await Promise.all([
        getEnrollments(),
        getProgrammes(),
        getStudents(),
      ]);
      setEnrollments(enrs);
      setProgrammes(progs);
      setStudents(stus);
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

  const openAddModal = () => {
    setEditingEnrol(null);
    setFormData({
      student_id: students[0]?.id || '',
      programme_id: programmes[0]?.id || '',
      class_or_grade: '1st',
      board: 'Matric',
      agreed_fee: 600,
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: '',
    });
    setIsModalOpen(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id || !formData.programme_id || !formData.class_or_grade) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      if (editingEnrol) {
        await updateEnrollment(editingEnrol.id, formData);
        toast.success('Updated agreed enrolment fee');
      } else {
        await createEnrollment({
          ...formData,
          is_verified: true,
        });
        toast.success('New enrolment record created');
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

  const totalFeeSum = filteredEnrollments.reduce((sum, e) => sum + Number(e.agreed_fee), 0);

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
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit className="w-3.5 h-3.5" />}
                          onClick={() => openEditModal(enr)}
                        >
                          Edit Fee
                        </Button>
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
        title={editingEnrol ? 'Edit Enrolment Fee' : 'Create Enrolment'}
        subtitle="Agreed monthly tuition charge"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {!editingEnrol && (
            <Select
              label="Select Student"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              options={students.map((s) => ({ value: s.id, label: `${s.name} (${s.student_id})` }))}
              required
            />
          )}

          <Select
            label="Select Programme"
            value={formData.programme_id}
            onChange={(e) => setFormData({ ...formData, programme_id: e.target.value })}
            options={programmes.map((p) => ({ value: p.id, label: p.name }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Class / Grade"
              value={formData.class_or_grade}
              onChange={(e) => setFormData({ ...formData, class_or_grade: e.target.value })}
              placeholder="e.g. 7th, Basic, 2nd"
              required
            />
            <Select
              label="Board / Mode"
              value={formData.board}
              onChange={(e) => setFormData({ ...formData, board: e.target.value })}
              options={[
                { value: 'Matric', label: 'Matric' },
                { value: 'CBSE', label: 'CBSE' },
                { value: 'Virtual', label: 'Virtual' },
                { value: 'Online', label: 'Online' },
                { value: 'Standard', label: 'Standard' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Agreed Monthly Fee (₹)"
              type="number"
              step="50"
              value={formData.agreed_fee}
              onChange={(e) => setFormData({ ...formData, agreed_fee: parseFloat(e.target.value) || 0 })}
              required
            />
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
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              {editingEnrol ? 'Update Fee' : 'Save Enrolment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

