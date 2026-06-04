"use client";

import { MasterItem, ShiftItem } from "@/lib/api";

interface ReportQuery {
  dateFrom: string;
  dateTo: string;
  shiftId: string;
  processId: string;
  lineId: string;
  productId: string;
  customerId: string;
}

interface Props {
  filters: ReportQuery;
  onChange: (filters: ReportQuery) => void;
  shifts: ShiftItem[];
  processes: MasterItem[];
  lines: MasterItem[];
  products: MasterItem[];
  customers: MasterItem[];
}

export default function ReportFilters({ filters, onChange, shifts, processes, lines, products, customers }: Props) {
  const set = (key: keyof ReportQuery, value: string) =>
    onChange({ ...filters, [key]: value });

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
          <input type="date" value={filters.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
          <input type="date" value={filters.dateTo}
            onChange={(e) => set('dateTo', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Shift</label>
          <select value={filters.shiftId} onChange={(e) => set('shiftId', e.target.value)} className={inputCls}>
            <option value="">All</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Process</label>
          <select value={filters.processId} onChange={(e) => set('processId', e.target.value)} className={inputCls}>
            <option value="">All</option>
            {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Line</label>
          <select value={filters.lineId} onChange={(e) => set('lineId', e.target.value)} className={inputCls}>
            <option value="">All</option>
            {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
          <select value={filters.productId} onChange={(e) => set('productId', e.target.value)} className={inputCls}>
            <option value="">All</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
          <select value={filters.customerId} onChange={(e) => set('customerId', e.target.value)} className={inputCls}>
            <option value="">All</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <button onClick={() => onChange({ dateFrom: '', dateTo: '', shiftId: '', processId: '', lineId: '', productId: '', customerId: '' })}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors">
          Clear Filters
        </button>
      </div>
    </div>
  );
}
