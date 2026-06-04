"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { ProductionEntry, CorrectableField, apiGetCorrectableFields, apiCreateCorrection } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Props {
  entry: ProductionEntry;
  onClose: () => void;
  onSaved: () => void;
}

export default function CorrectionRequestModal({ entry, onClose, onSaved }: Props) {
  const [fields, setFields] = useState<CorrectableField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fieldName: "", newValue: "", reason: "" });

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGetCorrectableFields(token).then(setFields).catch(console.error);
  }, []);

  const selectedField = fields.find((f) => f.field === form.fieldName);
  const oldValue = form.fieldName ? String((entry as unknown as Record<string, unknown>)[form.fieldName] ?? '') : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiCreateCorrection(getToken()!, {
        productionEntryId: entry.id,
        fieldName: form.fieldName,
        oldValue,
        newValue: form.newValue,
        reason: form.reason,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Request Correction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Entry Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <p><span className="font-medium">Entry #</span>{entry.id}</p>
            <p><span className="font-medium">Product:</span> {entry.product.name}</p>
            <p><span className="font-medium">Date:</span> {new Date(entry.date).toLocaleDateString('en-IN')}</p>
            <p><span className="font-medium">Line:</span> {entry.line.name}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field to Correct *</label>
            <select value={form.fieldName}
              onChange={(e) => setForm((f) => ({ ...f, fieldName: e.target.value, newValue: '' }))}
              required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select field</option>
              {fields.map((f) => <option key={f.field} value={f.field}>{f.label}</option>)}
            </select>
          </div>

          {form.fieldName && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                <input value={oldValue} readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Value *</label>
                <input value={form.newValue}
                  onChange={(e) => setForm((f) => ({ ...f, newValue: e.target.value }))}
                  required placeholder={`Enter new ${selectedField?.label}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              required rows={3} placeholder="Explain why this correction is needed..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.fieldName}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
