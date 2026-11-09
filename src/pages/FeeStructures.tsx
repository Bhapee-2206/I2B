import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Info,
  Calendar,
  IndianRupee
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
import { FeeStructure, Programme } from '../types';
import {
  getFeeStructures,
  getProgrammes,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure
} from '../services/dbService';
import { toast } from 'sonner';

export const FeeStructures: React.FC = () => {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'matric_cbse' | 'virtual_online' | 'all'
  const [activeTab, setActiveTab] = useState<'matric_cbse' | 'virtual_online'>('matric_cbse');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<FeeStructure | null>(null);

  const [formData, setFormData] = useState({
    programme_id: '',
    class_or_grade: '',
    board: 'Matric',
    monthly_fee: 600,
    effective_from: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [fees, progs] = await Promise.all([getFeeStructures(), getProgrammes()]);
      setFeeStructures(fees);
      setProgrammes(progs);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (defaultBoard: string = 'Matric') => {
    setEditingFee(null);
    setFormData({
      programme_id: programmes[0]?.id || '',
      class_or_grade: '1st',
      board: defaultBoard,
      monthly_fee: 600,
      effective_from: new Date().toISOString().split('T')[0],
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (fs: FeeStructure) => {
    setEditingFee(fs);
    setFormData({
      programme_id: fs.programme_id,
      class_or_grade: fs.class_or_grade,
      board: fs.board || 'Matric',
      monthly_fee: Number(fs.monthly_fee),
      effective_from: fs.effective_from || new Date().toISOString().split('T')[0],
      is_active: fs.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.programme_id || !formData.class_or_grade) {
      toast.error('Please specify class/grade and programme');
      return;
    }

    try {
      if (editingFee) {
        await updateFeeStructure(editingFee.id, formData);
        toast.success('Updated fee structure rule');
      } else {
        await createFeeStructure(formData);
        toast.success('Created new standard fee rule');
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!feeToDelete) return;
    try {
      await deleteFeeStructure(feeToDelete.id);
      toast.success('Deleted fee structure rule');
      setDeleteConfirmOpen(false);
      setFeeToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed');
    }
  };

  // Groupings
  const matricCbseFees = feeStructures.filter(
    (f) => f.board === 'Matric' || f.board === 'CBSE'
  );
  const virtualOnlineFees = feeStructures.filter(
    (f) => f.board === 'Virtual' || f.board === 'Online'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Structure Management"
        subtitle="Standard institutional fee matrices for Matric, CBSE, Virtual & Online enrolments"
        action={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => openAddModal(activeTab === 'matric_cbse' ? 'Matric' : 'Virtual')}
          >
            Add Fee Rule
          </Button>
        }
      />

      {/* Note about existing student agreed fees */}
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 text-sky-600 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold">Institutional Rule:</strong> Changing the standard fee structure below updates default proposals for future enrolments. In accordance with system policy, existing students' agreed enrolment fees are never automatically overwritten.
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('matric_cbse')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors min-h-[44px] flex items-center ${
            activeTab === 'matric_cbse'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Regular Tuition (Matric & CBSE)
        </button>
        <button
          onClick={() => setActiveTab('virtual_online')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors min-h-[44px] flex items-center ${
            activeTab === 'virtual_online'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Hindi (Virtual & Online)
        </button>
      </div>

      {/* Tab 1: Matric & CBSE Matrix */}
      {activeTab === 'matric_cbse' && (
        <Card>
          <CardHeader
            title="Matric & CBSE Regular Fee Matrix (LKG to 12th)"
            subtitle="Standard monthly tuition fee schedule by academic class"
          />
          <CardBody className="p-0">
            {loading ? (
              <LoadingSkeleton rows={8} height="h-10" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Curriculum Board</th>
                      <th className="py-3 px-4 text-right">Standard Monthly Fee</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {matricCbseFees.map((fs) => (
                      <tr key={fs.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">{fs.class_or_grade}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              fs.board === 'CBSE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {fs.board}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm">
                          ₹{Number(fs.monthly_fee).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={fs.is_active ? 'success' : 'neutral'} size="sm">
                            {fs.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Edit className="w-3.5 h-3.5" />}
                              onClick={() => openEditModal(fs)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setFeeToDelete(fs);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
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

      {/* Tab 2: Virtual & Online Matrix */}
      {activeTab === 'virtual_online' && (
        <Card>
          <CardHeader
            title="Hindi Virtual & Online Fee Matrix (Basic to 9th)"
            subtitle="Standard monthly tuition fee schedule for Hindi language courses"
          />
          <CardBody className="p-0">
            {loading ? (
              <LoadingSkeleton rows={8} height="h-10" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4">Delivery Mode</th>
                      <th className="py-3 px-4 text-right">Standard Monthly Fee</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {virtualOnlineFees.map((fs) => (
                      <tr key={fs.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">Grade {fs.class_or_grade}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              fs.board === 'Online'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}
                          >
                            {fs.board}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm">
                          ₹{Number(fs.monthly_fee).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={fs.is_active ? 'success' : 'neutral'} size="sm">
                            {fs.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Edit className="w-3.5 h-3.5" />}
                              onClick={() => openEditModal(fs)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setFeeToDelete(fs);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
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

      {/* Add / Edit Fee Rule Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFee ? 'Edit Standard Fee Rule' : 'Add Standard Fee Rule'}
        subtitle="Configure institution standard pricing matrix"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Select
            label="Programme"
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
              placeholder="e.g. 8th, Basic, 4th"
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
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Standard Monthly Fee (₹)"
              type="number"
              step="50"
              value={formData.monthly_fee}
              onChange={(e) => setFormData({ ...formData, monthly_fee: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Effective From"
              type="date"
              value={formData.effective_from}
              onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              required
            />
          </div>

          <Select
            label="Rule Status"
            value={formData.is_active ? 'true' : 'false'}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
            options={[
              { value: 'true', label: 'Active Standard Rule' },
              { value: 'false', label: 'Inactive / Deprecated' },
            ]}
          />

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
              {editingFee ? 'Update Rule' : 'Save Fee Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Standard Fee Rule"
        message={`Are you sure you want to remove the standard fee rule for ${feeToDelete?.class_or_grade} (${feeToDelete?.board})? This will not affect existing agreed enrolments.`}
        confirmLabel="Delete Rule"
      />
    </div>
  );
};

