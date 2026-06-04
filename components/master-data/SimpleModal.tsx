"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getToken } from "@/lib/auth";
import { apiCreateMaster, apiUpdateMaster } from "@/lib/api";

export interface FieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'time';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  readOnlyOnEdit?: boolean;
}

interface Props {
  title: string;
  entity: 'products' | 'customers' | 'processes' | 'lines' | 'shifts' | 'time-slots';
  fields: FieldConfig[];
  item: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SimpleModal({ title, entity, fields, item, onClose, onSaved }: Props) {
  const isEdit = !!item;
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      initial[f.name] = item ? String(item[f.name] ?? '') : '';
    });
    setForm(initial);
  }, [item, fields]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const token = getToken();
    if (!token) return;
    try {
      const data: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (isEdit && f.readOnlyOnEdit) return;
        const val = form[f.name];
        if (val !== '') data[f.name] = f.type === 'number' ? Number(val) : val;
      });
      if (isEdit) {
        await apiUpdateMaster(token, entity, item!.id as number, data);
      } else {
        await apiCreateMaster(token, entity, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? `Edit ${title}` : `Add ${title}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              {f.type === 'select' ? (
                <select
                  name={f.name}
                  value={form[f.name] || ''}
                  onChange={handleChange}
                  required={f.required}
                  disabled={isEdit && f.readOnlyOnEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select {f.label}</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.name}
                  type={f.type || 'text'}
                  value={form[f.name] || ''}
                  onChange={handleChange}
                  required={f.required}
                  disabled={isEdit && f.readOnlyOnEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              )}
            </div>
          ))}
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
