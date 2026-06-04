"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { RateTarget, MasterItem } from "@/lib/api";

interface Props {
  item: RateTarget | null;
  products: MasterItem[];
  customers: MasterItem[];
  processes: MasterItem[];
  onSave: (data: object, id?: number) => Promise<void>;
  onClose: () => void;
}

export default function RateTargetFormModal({ item, products, customers, processes, onSave, onClose }: Props) {
  const isEdit = !!item;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    productId: "", customerId: "", processId: "",
    hourlyRate: "", targetPerHour: "", ratePerPiece: "",
    effectiveFrom: "", effectiveTo: "", remarks: "",
  });

  useEffect(() => {
    if (item) {
      setForm({
        productId: String(item.productId),
        customerId: String(item.customerId),
        processId: String(item.processId),
        hourlyRate: String(item.hourlyRate),
        targetPerHour: String(item.targetPerHour),
        ratePerPiece: String(item.ratePerPiece),
        effectiveFrom: item.effectiveFrom.split('T')[0],
        effectiveTo: item.effectiveTo ? item.effectiveTo.split('T')[0] : "",
        remarks: item.remarks || "",
      });
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-calculate rate per piece
      if (name === 'hourlyRate' || name === 'targetPerHour') {
        const hourly = parseFloat(name === 'hourlyRate' ? value : prev.hourlyRate);
        const target = parseFloat(name === 'targetPerHour' ? value : prev.targetPerHour);
        if (!isNaN(hourly) && !isNaN(target) && target > 0) {
          updated.ratePerPiece = (hourly / target).toFixed(4);
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        hourlyRate: Number(form.hourlyRate),
        targetPerHour: Number(form.targetPerHour),
        ratePerPiece: Number(form.ratePerPiece),
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || undefined,
        remarks: form.remarks || undefined,
      };
      if (!isEdit) {
        data.productId = Number(form.productId);
        data.customerId = Number(form.customerId);
        data.processId = Number(form.processId);
      }
      await onSave(data, item?.id);
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
            {isEdit ? "Edit Rate Target" : "Add Rate Target"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* Product / Customer / Process — read only on edit */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
              <select name="productId" value={form.productId} onChange={handleChange}
                required disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select name="customerId" value={form.customerId} onChange={handleChange}
                required disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Process *</label>
              <select name="processId" value={form.processId} onChange={handleChange}
                required disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                <option value="">Select process</option>
                {processes.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₹) *</label>
              <input name="hourlyRate" type="number" step="0.01" min="0"
                value={form.hourlyRate} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target/Hour *</label>
              <input name="targetPerHour" type="number" step="1" min="0"
                value={form.targetPerHour} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate/Piece (₹)</label>
              <input name="ratePerPiece" type="number" step="0.0001" min="0"
                value={form.ratePerPiece} readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-0.5">Auto = Hourly Rate ÷ Target/Hr</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective From *</label>
              <input name="effectiveFrom" type="date"
                value={form.effectiveFrom} onChange={handleChange} required
                disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective To</label>
              <input name="effectiveTo" type="date"
                value={form.effectiveTo} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
