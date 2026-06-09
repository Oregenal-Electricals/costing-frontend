"use client";

import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import {
  MasterItem, ShiftItem, Supervisor, TimeSlotOption,
  ProductionPreview, PreloadData,
  apiGetTimeSlots, apiGetPreloadData, apiPreviewProductionEntry,
  apiCreateProductionEntry,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import CalculationPreview from "./CalculationPreview";

interface Props {
  processes: MasterItem[];
  shifts: ShiftItem[];
  lines: MasterItem[];
  products: MasterItem[];
  customers: MasterItem[];
  supervisors: Supervisor[];
  onSaved: () => void;
  onClose: () => void;
}

export default function ProductionEntryForm({
  processes, shifts, lines, products, customers, supervisors, onSaved, onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlotOption[]>([]);
  const [preload, setPreload] = useState<PreloadData | null>(null);
  const [takenSlots, setTakenSlots] = useState<number[]>([]);
  const [preview, setPreview] = useState<ProductionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftId: "", timeSlotId: "", processId: "", lineId: "",
    productId: "", customerId: "",
    supervisorId: "", manpowerCount: "", shiftHours: "1",
    actualOutput: "", rejectedQty: "0", remarks: "", notes: "",
  });

  // Load time slots when shift changes
  useEffect(() => {
    if (!form.shiftId) return;
    const token = getToken();
    if (!token) return;
    apiGetTimeSlots(token, Number(form.shiftId))
      .then(setTimeSlots)
      .catch(console.error);
  }, [form.shiftId]);

  // Load taken time slots for this date+shift+process+line
  useEffect(() => {
    if (!form.date || !form.shiftId || !form.processId || !form.lineId) return;
    const token = getToken();
    if (!token) return;
    // Fetch existing entries to find taken slots
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/production-entries?date=${form.date}&shiftId=${form.shiftId}&processId=${form.processId}&lineId=${form.lineId}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const taken = (data.data || []).map((e: any) => e.timeSlotId);
        setTakenSlots(taken);
        // Reset time slot if it was taken
        setForm(prev => ({ ...prev, timeSlotId: taken.includes(Number(prev.timeSlotId)) ? '' : prev.timeSlotId }));
      })
      .catch(console.error);
  }, [form.date, form.shiftId, form.processId, form.lineId]);

  // Load preload data when date/shift/process/line changes
  useEffect(() => {
    if (!form.date || !form.shiftId || !form.processId || !form.lineId) return;
    const token = getToken();
    if (!token) return;
    apiGetPreloadData(token, form.date, Number(form.shiftId), Number(form.processId), Number(form.lineId))
      .then((data) => {
        setPreload(data);
        setForm((prev) => ({
          ...prev,
          manpowerCount: String(data.manpowerCount),
          supervisorId: data.supervisorId ? String(data.supervisorId) : prev.supervisorId,
        }));
      })
      .catch(console.error);
  }, [form.date, form.shiftId, form.processId, form.lineId]);

  // Live preview when relevant fields change
  const loadPreview = useCallback(async () => {
    if (!form.productId || !form.customerId || !form.processId ||
        !form.manpowerCount || !form.shiftHours || !form.actualOutput) {
      setPreview(null);
      return;
    }
    const token = getToken();
    if (!token) return;
    setPreviewLoading(true);
    try {
      const result = await apiPreviewProductionEntry(token, {
        productId: Number(form.productId),
        customerId: Number(form.customerId),
        processId: Number(form.processId),
        date: form.date,
        manpowerCount: Number(form.manpowerCount),
        shiftHours: Number(form.shiftHours),
        actualOutput: Number(form.actualOutput),
      });
      setPreview(result);
      setError("");
    } catch (err) {
      setPreview(null);
      if (err instanceof Error && err.message.includes('rate target')) {
        setError(err.message);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [form.productId, form.customerId, form.processId, form.date, form.manpowerCount, form.shiftHours, form.actualOutput]);

  useEffect(() => {
    const timer = setTimeout(loadPreview, 500);
    return () => clearTimeout(timer);
  }, [loadPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) { setError("Please fill all required fields to see calculation preview"); return; }
    setError("");
    setLoading(true);
    try {
      await apiCreateProductionEntry(getToken()!, {
        date: form.date,
        shiftId: Number(form.shiftId),
        timeSlotId: Number(form.timeSlotId),
        processId: Number(form.processId),
        lineId: Number(form.lineId),
        productId: Number(form.productId),
        customerId: Number(form.customerId),
        supervisorId: form.supervisorId ? Number(form.supervisorId) : undefined,
        manpowerCount: Number(form.manpowerCount),
        shiftHours: Number(form.shiftHours),
        actualOutput: Number(form.actualOutput),
        rejectedQty: Number(form.rejectedQty),
        remarks: form.remarks || undefined,
        notes: form.notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Production Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Left — Form */}
          <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 border-r border-gray-100">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            {/* Row 1: Date + Shift */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input name="date" type="date" value={form.date} onChange={handleChange} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Shift *</label>
                <select name="shiftId" value={form.shiftId} onChange={handleChange} required className={inputCls}>
                  <option value="">Select shift</option>
                  {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Process + Line */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Process *</label>
                <select name="processId" value={form.processId} onChange={handleChange} required className={inputCls}>
                  <option value="">Select process</option>
                  {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Line *</label>
                <select name="lineId" value={form.lineId} onChange={handleChange} required className={inputCls}>
                  <option value="">Select line</option>
                  {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Time Slot — after line selected, shows available slots only */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Time Slot *
                {takenSlots.length > 0 && (
                  <span className="text-xs text-orange-500 ml-2">({takenSlots.length} slot(s) already entered)</span>
                )}
              </label>
              <select name="timeSlotId" value={form.timeSlotId} onChange={handleChange} required className={inputCls}
                disabled={!form.shiftId || !form.lineId}>
                <option value="">Select time slot</option>
                {timeSlots.map((t) => (
                  <option key={t.id} value={t.id} disabled={takenSlots.includes(t.id)}>
                    {t.label} ({t.startTime}–{t.endTime})
                    {takenSlots.includes(t.id) ? ' ✓ Done' : ''}
                  </option>
                ))}
              </select>
              {form.shiftId && timeSlots.length === 0 && (
                <p className="text-xs text-yellow-600 mt-1">⚠️ No time slots found. Add them in Master Data → Time Slots.</p>
              )}
              {!form.lineId && form.shiftId && (
                <p className="text-xs text-gray-400 mt-1">Select a line first to see available time slots</p>
              )}
            </div>

            {/* Row 4: Product + Customer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
                <select name="productId" value={form.productId} onChange={handleChange} required className={inputCls}>
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                <select name="customerId" value={form.customerId} onChange={handleChange} required className={inputCls}>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Preload status */}
            {preload && (
              <div className={clsx("text-xs px-3 py-2 rounded-lg",
                preload.hasAllocation ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
              )}>
                {preload.hasAllocation
                  ? `✅ Allocation found — ${preload.manpowerCount} manpower loaded`
                  : "⚠️ No final allocation found for this selection"}
              </div>
            )}

            {/* Row 5: Manpower + Shift Hours */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Manpower *</label>
                <input name="manpowerCount" type="number" min="1" value={form.manpowerCount}
                  onChange={handleChange} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Shift Hours *</label>
                <input name="shiftHours" type="number" min="0" step="0.5" value={form.shiftHours}
                  onChange={handleChange} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rejected Qty</label>
                <input name="rejectedQty" type="number" min="0" value={form.rejectedQty}
                  onChange={handleChange} className={inputCls} />
              </div>
            </div>

            {/* Actual Output */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Actual Output *</label>
              <input name="actualOutput" type="number" min="0" step="1" value={form.actualOutput}
                onChange={handleChange} required
                className="w-full px-3 py-3 border-2 border-blue-300 rounded-lg text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
            </div>

            {/* Supervisor */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Supervisor</label>
              <select name="supervisorId" value={form.supervisorId} onChange={handleChange} className={inputCls}>
                <option value="">Select supervisor</option>
                {supervisors.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.employeeCode})</option>)}
              </select>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input name="remarks" value={form.remarks} onChange={handleChange} className={inputCls} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading || !preview}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
                {loading ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </form>

          {/* Right — Calculation Preview */}
          <div className="lg:w-96 p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Live Calculation Preview</h3>
              {previewLoading && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
            </div>
            {preview ? (
              <CalculationPreview preview={preview} />
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">Fill in Date, Process, Product, Customer,</p>
                <p className="text-sm">Manpower, Hours and Actual Output</p>
                <p className="text-sm mt-1">to see calculations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
