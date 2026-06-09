"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import { clsx } from "clsx";
import {
  LineAllocation, MasterItem, ShiftItem, Supervisor, AllocationBalance,
  apiGetAllocationBalance,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Props {
  allocation: LineAllocation | null;
  processes: MasterItem[];
  shifts: ShiftItem[];
  lines: MasterItem[];
  products: MasterItem[];
  customers: MasterItem[];
  supervisors: Supervisor[];
  onSave: (data: object, id?: number) => Promise<void>;
  onClose: () => void;
}

export default function LineAllocationFormModal({
  allocation, processes, shifts, lines, products, customers, supervisors, onSave, onClose,
}: Props) {
  const isEdit = !!allocation;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<AllocationBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftId: "", processId: "", lineId: "",
    productId: "", customerId: "",
    allocatedCount: "", supervisorId: "", notes: "",
  });

  useEffect(() => {
    if (allocation) {
      setForm({
        date: allocation.date.split('T')[0],
        shiftId: String(allocation.shiftId),
        processId: String(allocation.processId),
        lineId: String(allocation.lineId),
        productId: String(allocation.productId),
        customerId: String(allocation.customerId),
        allocatedCount: String(allocation.allocatedCount),
        supervisorId: allocation.supervisorId ? String(allocation.supervisorId) : "",
        notes: allocation.notes || "",
      });
    }
  }, [allocation]);

  // Load balance when date/shift/process changes
  useEffect(() => {
    if (!form.date || !form.shiftId || !form.processId) return;
    // Always load balance — needed for edit mode too
    const token = getToken();
    if (!token) return;
    setBalanceLoading(true);
    apiGetAllocationBalance(token, form.date, Number(form.shiftId), Number(form.processId))
      .then(setBalance)
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [form.date, form.shiftId, form.processId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        allocatedCount: Number(form.allocatedCount),
        supervisorId: form.supervisorId ? Number(form.supervisorId) : undefined,
        notes: form.notes || undefined,
      };
      if (!isEdit) {
        data.date = form.date;
        data.shiftId = Number(form.shiftId);
        data.processId = Number(form.processId);
        data.lineId = Number(form.lineId);
        data.productId = Number(form.productId);
        data.customerId = Number(form.customerId);
      }
      await onSave(data, allocation?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const availableBalance = isEdit && balance
    ? balance.balance + (allocation?.allocatedCount || 0)
    : balance?.balance || 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Allocation" : "Add Line Allocation"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Balance Banner */}
          {balance && (
            <div className={clsx(
              "rounded-lg px-4 py-3 text-sm",
              balance.hasMorningPlan
                ? balance.balance > 0
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
                : "bg-yellow-50 border border-yellow-200"
            )}>
              {balance.hasMorningPlan ? (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Morning Plan Total</span>
                  <span className="font-bold">{balance.morningPlanTotal}</span>
                </div>
              ) : (
                <p className="text-yellow-700">⚠️ No morning plan found. Create morning plan first.</p>
              )}
              {balance.hasMorningPlan && (
                <>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-600">Already Allocated</span>
                    <span className="font-bold text-orange-600">{balance.allocated}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 border-t border-gray-200 pt-1">
                    <span className="font-semibold">Available Balance</span>
                    <span className={clsx("font-bold text-lg", balance.balance > 0 ? "text-green-600" : "text-red-600")}>
                      {isEdit ? availableBalance : balance.balance}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          {balanceLoading && (
            <div className="text-center text-sm text-gray-400">Checking balance...</div>
          )}

          {/* Date + Shift */}
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

          {/* Process */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Process *</label>
            <select name="processId" value={form.processId} onChange={handleChange}
              required disabled={isEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
              <option value="">Select process</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Line + Product */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Line *</label>
              <select name="lineId" value={form.lineId} onChange={handleChange}
                required disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                <option value="">Select line</option>
                {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
              <select name="productId" value={form.productId} onChange={handleChange}
                required disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select name="customerId" value={form.customerId} onChange={handleChange}
              required disabled={isEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Allocated Count + Supervisor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allocated Manpower *
                {balance?.hasMorningPlan && (
                  <span className="text-xs text-gray-400 ml-1">(max: {isEdit ? availableBalance : balance?.balance})</span>
                )}
              </label>
              <input name="allocatedCount" type="number" min="1"
                max={isEdit ? availableBalance : balance?.balance || undefined}
                value={form.allocatedCount} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
              <select name="supervisorId" value={form.supervisorId} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select supervisor</option>
                {supervisors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading || (!isEdit && !balance?.hasMorningPlan)}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
