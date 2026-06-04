"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RotateCcw, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import {
  ManpowerMovement, MasterItem, ShiftItem, LineStatus,
  apiGetMovements, apiCreateMovement, apiReverseMovement,
  apiGetLineStatus, apiGetActiveProcesses, apiGetActiveShifts,
  apiGetActiveLines, apiGetActiveProducts, apiGetActiveCustomers,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import RoleGuard from "@/components/auth/RoleGuard";
import MovementFormModal from "@/components/manpower-movement/MovementFormModal";

const LIMIT = 15;

export default function ManpowerMovementPage() {
  const [data, setData] = useState<ManpowerMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalMoved, setTotalMoved] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftId: "", processId: "",
  });
  const [processes, setProcesses] = useState<MasterItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [lines, setLines] = useState<MasterItem[]>([]);
  const [products, setProducts] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<MasterItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [reverseId, setReverseId] = useState<number | null>(null);
  const [reversalNotes, setReversalNotes] = useState("");
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
      const res = await apiGetMovements(token, {
        date: filters.date || undefined,
        shiftId: filters.shiftId ? Number(filters.shiftId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
        page, limit: LIMIT,
      });
      setData(res.data);
      setTotal(res.total);
      setTotalMoved(res.totalMoved);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const loadLineStatus = useCallback(async () => {
    const token = getToken();
    if (!token || !filters.date || !filters.shiftId || !filters.processId) {
      setLineStatus(null);
      return;
    }
    try {
      const status = await apiGetLineStatus(token, filters.date, Number(filters.shiftId), Number(filters.processId));
      setLineStatus(status);
    } catch {
      setLineStatus(null);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLineStatus(); }, [loadLineStatus]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiGetActiveProcesses(token),
      apiGetActiveShifts(token),
      apiGetActiveLines(token),
      apiGetActiveProducts(token),
      apiGetActiveCustomers(token),
    ]).then(([pr, sh, ln, pd, cu]) => {
      setProcesses(pr); setShifts(sh); setLines(ln);
      setProducts(pd); setCustomers(cu);
    }).catch(console.error);
  }, []);

  const handleSave = async (formData: object) => {
    const token = getToken();
    if (!token) return;
    await apiCreateMovement(token, formData);
    showToast('Movement recorded successfully');
    load();
    loadLineStatus();
    setShowForm(false);
  };

  const handleReverse = async () => {
    if (!reverseId || !reversalNotes.trim()) return;
    const token = getToken();
    if (!token) return;
    try {
      await apiReverseMovement(token, reverseId, reversalNotes);
      showToast('Movement reversed successfully');
      load();
      loadLineStatus();
      setReverseId(null);
      setReversalNotes("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reverse', 'error');
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
            <h2 className="text-xl font-bold text-gray-900">Manpower Movement</h2>
            <p className="text-sm text-gray-500 mt-1">{total} movements · {totalMoved} total moved today</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            Record Movement
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <option value="">All Shifts</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Process</label>
            <select value={filters.processId}
              onChange={(e) => { setFilters((f) => ({ ...f, processId: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Processes</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Line Status Cards */}
        {lineStatus && lineStatus.lines.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Line Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {lineStatus.lines.map((l) => (
                <div key={l.line.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 font-medium truncate">{l.line.name}</p>
                  <p className={clsx("text-2xl font-bold mt-1", l.current > 0 ? "text-green-600" : "text-red-500")}>
                    {l.current}
                  </p>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Alloc: {l.allocated}</span>
                    <span>Out: {l.movedOut}</span>
                    <span>In: {l.movedIn}</span>
                  </div>
                </div>
              ))}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <p className="text-xs text-blue-600 font-medium">Total Movements</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{lineStatus.movementCount}</p>
                <p className="text-xs text-blue-500 mt-1">MP moved: {lineStatus.totalMoved}</p>
              </div>
            </div>
          </div>
        )}

        {/* Movement History Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Movement History</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No movements found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Time", "Movement", "Process", "Product", "MP Count", "Before→After", "Reason", "By", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((item) => (
                    <tr key={item.id} className={clsx("hover:bg-gray-50 transition-colors", item.isReversed && "opacity-60")}>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <p className="font-medium">{item.movementTime}</p>
                        <p className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium">{item.fromLine.name}</span>
                          <ArrowRight size={12} className="text-gray-400" />
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">{item.toLine.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{item.process.name}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{item.product.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-700 text-base">{item.manpowerCount}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <p>From: {item.beforeFromLine}→{item.afterFromLine}</p>
                        <p>To: {item.beforeToLine}→{item.afterToLine}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-24 truncate">{item.reason || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{item.createdBy.name}</td>
                      <td className="px-4 py-3">
                        {item.isReversed ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">Reversed</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!item.isReversed && (
                          <button
                            onClick={() => setReverseId(item.id)}
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Reverse Movement"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
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

        {/* Movement Form Modal */}
        {showForm && (
          <MovementFormModal
            processes={processes}
            shifts={shifts}
            lines={lines}
            products={products}
            customers={customers}
            onSave={handleSave}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Reversal Modal */}
        {reverseId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reverse Movement</h2>
              <p className="text-sm text-gray-600 mb-4">
                This will create a reversal transaction moving manpower back to the original line.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reversal Reason *</label>
                <textarea
                  value={reversalNotes}
                  onChange={(e) => setReversalNotes(e.target.value)}
                  rows={3}
                  placeholder="Explain why this movement is being reversed..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setReverseId(null); setReversalNotes(""); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleReverse} disabled={!reversalNotes.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg text-sm font-medium">
                  Confirm Reversal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
