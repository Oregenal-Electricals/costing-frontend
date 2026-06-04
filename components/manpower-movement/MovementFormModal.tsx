"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { MasterItem, ShiftItem, LineStatus, apiGetLineStatus } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Props {
  processes: MasterItem[];
  shifts: ShiftItem[];
  lines: MasterItem[];
  products: MasterItem[];
  customers: MasterItem[];
  onSave: (data: object) => Promise<void>;
  onClose: () => void;
}

export default function MovementFormModal({
  processes, shifts, lines, products, customers, onSave, onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftId: "", processId: "",
    fromLineId: "", toLineId: "",
    productId: "", customerId: "",
    manpowerCount: "",
    movementTime: new Date().toTimeString().slice(0, 5),
    reason: "", notes: "",
  });

  useEffect(() => {
    if (!form.date || !form.shiftId || !form.processId) return;
    const token = getToken();
    if (!token) return;
    setStatusLoading(true);
    apiGetLineStatus(token, form.date, Number(form.shiftId), Number(form.processId))
      .then(setLineStatus)
      .catch(() => setLineStatus(null))
      .finally(() => setStatusLoading(false));
  }, [form.date, form.shiftId, form.processId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fromLineStatus = lineStatus?.lines.find((l) => l.line.id === Number(form.fromLineId));
  const toLineStatus = lineStatus?.lines.find((l) => l.line.id === Number(form.toLineId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.fromLineId === form.toLineId) {
      setError("Source and destination line cannot be the same");
      return;
    }
    setLoading(true);
    try {
      await onSave({
        date: form.date,
        shiftId: Number(form.shiftId),
        processId: Number(form.processId),
        fromLineId: Number(form.fromLineId),
        toLineId: Number(form.toLineId),
        productId: Number(form.productId),
        customerId: Number(form.customerId),
        manpowerCount: Number(form.manpowerCount),
        movementTime: form.movementTime,
        reason: form.reason || undefined,
        notes: form.notes || undefined,
      });
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
          <h2 className="text-lg font-semibold text-gray-900">Record Manpower Movement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input name="date" type="date" value={form.date} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Movement Time *</label>
              <input name="movementTime" type="time" value={form.movementTime} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Shift + Process */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift *</label>
              <select name="shiftId" value={form.shiftId} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select shift</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Process *</label>
              <select name="processId" value={form.processId} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select process</option>
                {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Line Status */}
          {statusLoading && <p className="text-xs text-gray-400 text-center">Loading line status...</p>}
          {lineStatus && lineStatus.lines.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-lg">
              ⚠️ No allocations found for this Date + Shift + Process
            </div>
          )}
          {lineStatus && lineStatus.lines.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-2">Current Line Status</p>
              <div className="space-y-1">
                {lineStatus.lines.map((l) => (
                  <div key={l.line.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{l.line.name}</span>
                    <span className={clsx("font-bold", l.current > 0 ? "text-green-600" : "text-red-600")}>
                      {l.current} available
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* From Line → To Line */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">From Line *</label>
              <select name="fromLineId" value={form.fromLineId} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {fromLineStatus && (
                <p className="text-xs text-gray-500 mt-1">Available: <span className="font-bold text-green-600">{fromLineStatus.current}</span></p>
              )}
            </div>
            <ArrowRight size={20} className="text-gray-400 flex-shrink-0 mt-4" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">To Line *</label>
              <select name="toLineId" value={form.toLineId} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                {lines.filter((l) => l.id !== Number(form.fromLineId)).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {toLineStatus && (
                <p className="text-xs text-gray-500 mt-1">Current: <span className="font-bold text-blue-600">{toLineStatus.current}</span></p>
              )}
            </div>
          </div>

          {/* Product + Customer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
              <select name="productId" value={form.productId} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select name="customerId" value={form.customerId} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Manpower Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manpower to Move *
              {fromLineStatus && (
                <span className="text-xs text-gray-400 ml-1">(max: {fromLineStatus.current})</span>
              )}
            </label>
            <input name="manpowerCount" type="number" min="1"
              max={fromLineStatus?.current || undefined}
              value={form.manpowerCount} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input name="reason" value={form.reason} onChange={handleChange}
              placeholder="e.g. Production requirement, Urgent order"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
              {loading ? 'Recording...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
