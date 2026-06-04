"use client";

import { clsx } from "clsx";
import { Pencil, ToggleLeft, ToggleRight } from "lucide-react";

export interface Column {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

interface Props {
  columns: Column[];
  data: Record<string, unknown>[];
  loading: boolean;
  onEdit: (row: Record<string, unknown>) => void;
  onToggle: (row: Record<string, unknown>) => void;
}

export default function MasterTable({ columns, data, loading, onEdit, onToggle }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row) => (
            <tr key={row.id as number} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-gray-700">
                  {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                </td>
              ))}
              <td className="px-4 py-3">
                <span className={clsx(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  row.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {row.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(row)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onToggle(row)}
                    className={clsx(
                      "p-1.5 rounded-lg transition-colors",
                      row.isActive
                        ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                        : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                    )}
                    title={row.isActive ? "Deactivate" : "Activate"}
                  >
                    {row.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
