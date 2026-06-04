"use client";

import CorrectionRequestModal from "@/components/corrections/CorrectionRequestModal";
import { useEffect, useState, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, FileEdit } from "lucide-react";
import { clsx } from "clsx";
import {
  ProductionEntry, MasterItem, ShiftItem, Supervisor,
  apiGetProductionEntries, apiGetActiveProcesses, apiGetActiveShifts,
  apiGetActiveLines, apiGetActiveProducts, apiGetActiveCustomers, apiGetSupervisors,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import RoleGuard from "@/components/auth/RoleGuard";
import ProductionEntryForm from "@/components/production-entry/ProductionEntryForm";

const LIMIT = 15;

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold",
      status === 'PROFIT' ? "bg-green-100 text-green-700" :
      status === 'LOSS' ? "bg-red-100 text-red-700" :
      "bg-gray-100 text-gray-600"
    )}>
      {status === 'PROFIT' ? <TrendingUp size={11} /> :
       status === 'LOSS' ? <TrendingDown size={11} /> :
       <Minus size={11} />}
      {status}
    </span>
  );
}

export default function ProductionEntryPage() {
  const [data, setData] = useState<ProductionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalEntries: 0, profit: 0, loss: 0, neutral: 0, totalOutput: 0, totalGainLoss: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftId: "", processId: "", lineId: "", productId: "", customerId: "", status: "",
  });
  const [processes, setProcesses] = useState<MasterItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [lines, setLines] = useState<MasterItem[]>([]);
  const [products, setProducts] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<MasterItem[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [correctionEntry, setCorrectionEntry] = useState<ProductionEntry | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetProductionEntries(token, {
        date: filters.date || undefined,
        shiftId: filters.shiftId ? Number(filters.shiftId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
        lineId: filters.lineId ? Number(filters.lineId) : undefined,
        productId: filters.productId ? Number(filters.productId) : undefined,
        customerId: filters.customerId ? Number(filters.customerId) : undefined,
        status: filters.status || undefined,
        page, limit: LIMIT,
      });
      setData(res.data);
      setTotal(res.total);
      setSummary(res.summary);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiGetActiveProcesses(token), apiGetActiveShifts(token),
      apiGetActiveLines(token), apiGetActiveProducts(token),
      apiGetActiveCustomers(token), apiGetSupervisors(token),
    ]).then(([pr, sh, ln, pd, cu, sv]) => {
      setProcesses(pr); setShifts(sh); setLines(ln);
      setProducts(pd); setCustomers(cu); setSupervisors(sv);
    }).catch(console.error);
  }, []);

  const totalPages = Math.ceil(total / LIMIT);

  const fmt = (n: number | string, d = 2) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR"]}>
      <div className="space-y-5">
        {toast && (
          <div className={clsx(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium",
            toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
          )}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Production Entry</h2>
            <p className="text-sm text-gray-500 mt-1">{total} entries</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Entry
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Entries", value: summary.totalEntries, color: "text-blue-600" },
            { label: "Profit", value: summary.profit, color: "text-green-600" },
            { label: "Loss", value: summary.loss, color: "text-red-600" },
            { label: "Neutral", value: summary.neutral, color: "text-gray-600" },
            { label: "Total Output", value: fmt(summary.totalOutput, 0), color: "text-purple-600" },
            {
              label: "Net Gain/Loss",
              value: `₹${fmt(Math.abs(summary.totalGainLoss))}`,
              color: summary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
            },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={clsx("text-lg font-bold mt-1", card.color)}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input type="date" value={filters.date}
              onChange={(e) => { setFilters((f) => ({ ...f, date: e.target.value })); setPage(1); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {[
            { key: 'shiftId', label: 'Shift', options: shifts, nameKey: 'name' },
            { key: 'processId', label: 'Process', options: processes, nameKey: 'name' },
            { key: 'lineId', label: 'Line', options: lines, nameKey: 'name' },
            { key: 'productId', label: 'Product', options: products, nameKey: 'name' },
            { key: 'customerId', label: 'Customer', options: customers, nameKey: 'name' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
              <select value={filters[f.key as keyof typeof filters]}
                onChange={(e) => { setFilters((prev) => ({ ...prev, [f.key]: e.target.value })); setPage(1); }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All</option>
                {f.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={filters.status}
              onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All</option>
              <option value="PROFIT">Profit</option>
              <option value="LOSS">Loss</option>
              <option value="NEUTRAL">Neutral</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No production entries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Date", "Shift/Slot", "Process/Line", "Product", "Customer", "MP", "Hrs", "Target", "Actual", "Ach%", "Labour Cost", "Gain/Loss", "Status", ""].map((h) => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap text-xs font-medium">
                        {new Date(entry.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <p className="text-gray-700">{entry.shift.name}</p>
                        <p className="text-gray-400">{entry.timeSlot.label}</p>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <p className="text-gray-700">{entry.process.name}</p>
                        <p className="text-gray-400">{entry.line.name}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700">{entry.product.name}</td>
                      <td className="px-3 py-3 text-xs text-gray-700">{entry.customer.name}</td>
                      <td className="px-3 py-3 text-xs font-bold text-blue-700">{entry.manpowerCount}</td>
                      <td className="px-3 py-3 text-xs text-gray-600">{entry.shiftHours}</td>
                      <td className="px-3 py-3 text-xs text-gray-700">{fmt(entry.targetOutput, 0)}</td>
                      <td className="px-3 py-3 text-xs font-bold text-gray-900">{fmt(entry.actualOutput, 0)}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className={clsx("font-bold",
                          Number(entry.achievementPct) >= 100 ? "text-green-600" : "text-red-600"
                        )}>
                          {fmt(entry.achievementPct)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-700">₹{fmt(entry.labourCost)}</td>
                      <td className="px-3 py-3 text-xs">
                        <span className={clsx("font-bold",
                          Number(entry.labourGainLoss) > 0 ? "text-green-600" :
                          Number(entry.labourGainLoss) < 0 ? "text-red-600" : "text-gray-500"
                        )}>
                          {Number(entry.labourGainLoss) >= 0 ? '+' : ''}₹{fmt(entry.labourGainLoss)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setCorrectionEntry(entry)}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Request Correction"
                        >
                          <FileEdit size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} of {total}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 rounded-lg hover:bg-gray-100">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-600 px-2">{page}/{totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 rounded-lg hover:bg-gray-100">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {showForm && (
          <ProductionEntryForm
            processes={processes} shifts={shifts} lines={lines}
            products={products} customers={customers} supervisors={supervisors}
            onSaved={() => { load(); setShowForm(false); showToast('Production entry saved'); }}
            onClose={() => setShowForm(false)}
          />
        )}
      {correctionEntry && (
        <CorrectionRequestModal
          entry={correctionEntry}
          onClose={() => setCorrectionEntry(null)}
          onSaved={() => { setCorrectionEntry(null); showToast("Correction request submitted"); }}
        />
      )}
      </div>
    </RoleGuard>
  );
}
