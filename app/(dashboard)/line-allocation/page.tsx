"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, CheckCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import {
  LineAllocation, MasterItem, ShiftItem, Supervisor,
  apiGetLineAllocations, apiCreateLineAllocation, apiUpdateLineAllocation,
  apiFinalizeLineAllocation, apiGetActiveProcesses, apiGetActiveShifts,
  apiGetActiveLines, apiGetActiveProducts, apiGetActiveCustomers, apiGetSupervisors,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import RoleGuard from "@/components/auth/RoleGuard";
import LineAllocationFormModal from "@/components/line-allocation/LineAllocationFormModal";

const LIMIT = 15;

export default function LineAllocationPage() {
  const [data, setData] = useState<LineAllocation[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftId: "", processId: "", lineId: "", status: "",
  });
  const [processes, setProcesses] = useState<MasterItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [lines, setLines] = useState<MasterItem[]>([]);
  const [products, setProducts] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<MasterItem[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<LineAllocation | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetLineAllocations(token, {
        date: filters.date || undefined,
        shiftId: filters.shiftId ? Number(filters.shiftId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
        lineId: filters.lineId ? Number(filters.lineId) : undefined,
        status: filters.status || undefined,
        page, limit: LIMIT,
      });
      setData(res.data);
      setTotal(res.total);
      setTotalAllocated(res.totalAllocated);
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
      apiGetActiveProcesses(token),
      apiGetActiveShifts(token),
      apiGetActiveLines(token),
      apiGetActiveProducts(token),
      apiGetActiveCustomers(token),
      apiGetSupervisors(token),
    ]).then(([pr, sh, ln, pd, cu, sv]) => {
      setProcesses(pr); setShifts(sh); setLines(ln);
      setProducts(pd); setCustomers(cu); setSupervisors(sv);
    }).catch(console.error);
  }, []);

  const handleSave = async (formData: object, id?: number) => {
    const token = getToken();
    if (!token) return;
    if (id) {
      await apiUpdateLineAllocation(token, id, formData);
      showToast('Allocation updated');
    } else {
      await apiCreateLineAllocation(token, formData);
      showToast('Allocation created');
    }
    load();
    setShowForm(false);
    setEditItem(null);
  };

  const handleFinalize = async (item: LineAllocation) => {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Finalize allocation for ${item.line.name}? This cannot be undone.`)) return;
    try {
      await apiFinalizeLineAllocation(token, item.id);
      showToast('Allocation finalized');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER", "SUPERVISOR"]}>
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
            <h2 className="text-xl font-bold text-gray-900">Line Manpower Allocation</h2>
            <p className="text-sm text-gray-500 mt-1">{total} records · {totalAllocated} total allocated</p>
          </div>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Allocation
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input type="date" value={filters.date}
              onChange={(e) => { setFilters((f) => ({ ...f, date: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Shift</label>
            <select value={filters.shiftId}
              onChange={(e) => { setFilters((f) => ({ ...f, shiftId: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Process</label>
            <select value={filters.processId}
              onChange={(e) => { setFilters((f) => ({ ...f, processId: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Line</label>
            <select value={filters.lineId}
              onChange={(e) => { setFilters((f) => ({ ...f, lineId: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All</option>
              {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={filters.status}
              onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="FINAL">Final</option>
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
            <div className="text-center py-16 text-gray-400 text-sm">No allocations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Date", "Shift", "Process", "Line", "Product", "Customer", "Allocated", "Supervisor", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.shift.name}</td>
                      <td className="px-4 py-3 text-gray-700">{item.process.name}</td>
                      <td className="px-4 py-3 text-gray-700">{item.line.name}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <p>{item.product.name}</p>
                        <p className="text-xs text-gray-400">{item.product.code}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.customer.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-700 text-base">{item.allocatedCount}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {item.supervisor ? item.supervisor.name : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "text-xs px-2.5 py-1 rounded-full font-semibold",
                          item.status === 'FINAL'
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {item.status === 'DRAFT' && (
                            <>
                              <button onClick={() => { setEditItem(item); setShowForm(true); }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <Pencil size={15} />
                              </button>
                              <button onClick={() => handleFinalize(item)}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Finalize">
                                <CheckCircle size={15} />
                              </button>
                            </>
                          )}
                          {item.status === 'FINAL' && (
                            <span className="text-xs text-gray-400 px-2">Finalized</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 rounded-lg hover:bg-gray-100">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-600 px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 rounded-lg hover:bg-gray-100">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {showForm && (
          <LineAllocationFormModal
            allocation={editItem}
            processes={processes}
            shifts={shifts}
            lines={lines}
            products={products}
            customers={customers}
            supervisors={supervisors}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditItem(null); }}
          />
        )}
      </div>
    </RoleGuard>
  );
}
