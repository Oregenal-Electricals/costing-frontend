"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { MorningPlan, MasterItem, ShiftItem, Supervisor } from "@/lib/api";

interface Props {
  plan: MorningPlan | null;
  processes: MasterItem[];
  shifts: ShiftItem[];
  supervisors: Supervisor[];
  onSave: (data: object, id?: number) => Promise<void>;
  onClose: () => void;
}

export default function MorningPlanFormModal({ plan, processes, shifts, supervisors, onSave, onClose }: Props) {
  const isEdit = !!plan;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftId: "",
    processId: "",
    department: "",
    totalManpower: "",
    supervisorId: "",
    notes: "",
  });

  useEffect(() => {
    if (plan) {
      setForm({
        date: plan.date.split('T')[0],
        shiftId: String(plan.shiftId),
        processId: String(plan.processId),
        department: plan.department || "",
        totalManpower: String(plan.totalManpower),
        supervisorId: plan.supervisorId ? String(plan.supervisorId) : "",
        notes: plan.notes || "",
      });
    }
  }, [plan]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (Number(form.totalManpower) < 0) {
      setError("Total manpower cannot be negative");
      return;
    }
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        department: form.department || undefined,
        totalManpower: Number(form.totalManpower),
        supervisorId: form.supervisorId ? Number(form.supervisorId) : undefined,
        notes: form.notes || undefined,
      };
      if (!isEdit) {
        data.date = form.date;
        data.shiftId = Number(form.shiftId);
        data.processId = Number(form.processId);
      }
      await onSave(data, plan?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Morning Plan" : "Add Morning Plan"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input name="date" type="date" value={form.date} onChange={handleChange}
                required disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift *</label>
              <select name="shiftId" value={form.shiftId} onChange={handleChange}
                required disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                <option value="">Select shift</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Process *</label>
            <select name="processId" value={form.processId} onChange={handleChange}
              required disabled={isEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
              <option value="">Select process</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input name="department" value={form.department} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Manpower *</label>
              <input name="totalManpower" type="number" min="0" value={form.totalManpower} onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
            <select name="supervisorId" value={form.supervisorId} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select supervisor</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.employeeCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
              {loading ? 'Saving...' : isEdit ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
