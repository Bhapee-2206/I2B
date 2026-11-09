import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Programme, Enrollment } from '../types';
import { getProgrammes, createProgramme, updateProgramme, getEnrollments } from '../services/dbService';
import { toast } from 'sonner';

export const Programmes: React.FC = () => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<Programme | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    fee_mode: 'standard',
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [progs, enrs] = await Promise.all([getProgrammes(), getEnrollments()]);
      setProgrammes(progs);
      setEnrollments(enrs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load programmes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProg(null);
    setFormData({
      code: `PROG_${programmes.length + 1}`,
      name: '',
      description: '',
      fee_mode: 'standard',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (prog: Programme) => {
    setEditingProg(prog);
    setFormData({
      code: prog.code,
      name: prog.name,
      description: prog.description || '',
      fee_mode: prog.fee_mode || 'standard',
      is_active: prog.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Programme name is required');
      return;
    }

    try {
      if (editingProg) {
        await updateProgramme(editingProg.id, formData);
        toast.success(`Updated programme: ${formData.name}`);
      } else {
        await createProgramme(formData);
        toast.success(`Added new programme: ${formData.name}`);
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programme Management"
        subtitle="Manage academic courses, tuition departments, and fee calculation modes"
        action={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
          >
            Add Programme
          </Button>
        }
      />

      {loading ? (
        <LoadingSkeleton rows={4} height="h-28" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programmes.map((prog) => {
            const progEnrols = enrollments.filter((e) => e.programme_id === prog.id && e.status === 'active');
            const totalMonthlyAgreed = progEnrols.reduce((s, e) => s + Number(e.agreed_fee), 0);

            return (
              <Card key={prog.id} className="flex flex-col justify-between">
                <CardHeader
                  title={prog.name}
                  subtitle={<span className="font-mono text-xs text-slate-400">Code: {prog.code}</span>}
                  action={
                    <div className="flex items-center gap-2">
                      <Badge variant={prog.is_active ? 'success' : 'neutral'} size="sm">
                        {prog.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit className="w-3.5 h-3.5" />}
                        onClick={() => openEditModal(prog)}
                      >
                        Edit
                      </Button>
                    </div>
                  }
                />
                <CardBody className="pt-3 pb-4">
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {prog.description || 'No description provided for this programme.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 bg-slate-50/60 p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Active Enrolments
                      </span>
                      <span className="text-base font-extrabold text-slate-900">
                        {progEnrols.length} students
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Monthly Fee Sum
                      </span>
                      <span className="text-base font-extrabold text-emerald-600">
                        ₹{totalMonthlyAgreed.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProg ? `Edit Programme: ${editingProg.name}` : 'Create New Programme'}
        subtitle="Configure institution offerings"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Input
            label="Programme Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            placeholder="e.g. SUBJECT, HINDI, MATHS"
            required
            helperText="Unique uppercase system identifier"
          />

          <Input
            label="Programme Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Weekend Hindi"
            required
          />

          <div className="text-left">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Course Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Curriculum overview and schedule..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Fee Calculation Mode"
              value={formData.fee_mode}
              onChange={(e) => setFormData({ ...formData, fee_mode: e.target.value })}
              options={[
                { value: 'matric_cbse', label: 'Matric & CBSE Matrix' },
                { value: 'virtual_online', label: 'Virtual & Online Matrix' },
                { value: 'standard', label: 'Fixed Standard' },
              ]}
            />
            <Select
              label="Status"
              value={formData.is_active ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              options={[
                { value: 'true', label: 'Active Course' },
                { value: 'false', label: 'Deactivated' },
              ]}
            />
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              {editingProg ? 'Save Changes' : 'Create Programme'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

