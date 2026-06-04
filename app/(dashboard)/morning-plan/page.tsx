"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight, Pencil, CheckCircle, Users } from "lucide-react";
import { clsx } from "clsx";
import {
  MorningPlan, MasterItem, ShiftItem, Supervisor,
  apiGetMorningPlans, apiCreateMorningPlan, apiUpdateMorningPlan, apiFinalizeMorningPlan,
  apiGetActiveProcesses, apiGetActiveShifts, apiGetSupervisors,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import MorningPlanFormModal from "@/components/morning-plan/MorningPlanFormModal";

const LIMIT = 15;

export default function MorningPlanPage() {
  const [data, setData] = useState<MorningPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, totalManpower: 0, draft: 0, final: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    shiftId: "",
    processId: "",
    status: "",
  });
  const [processes, setProcesses] = useState<MasterItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<MorningPlan | null>(null);
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
      const res = await apiGetMorningPlans(token, {
        date: filters.date || undefined,
        shiftId: filters.shiftId ? Number(filters.shiftId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
        status: filters.status || undefined,
        page,
        limit: LIMIT,
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
      apiGetActiveProcesses(token),
      apiGetActiveShifts(token),
      apiGetSupervisors(token),
    ]).then(([p, s, sv]) => {
      setProcesses(p);
      setShifts(s);
      setSupervisors(sv);
    }).catch(console.error);
  }, []);

  const handleSave = async (formData: object, id?: number) => {
    const token = getToken();
    if (!token) return;
    if (id) {
      await apiUpdateMorningPlan(token, id, formData);
      showToast('Plan updated successfully');
    } else {
      await apiCreateMorningPlan(token, formData);
      showToast('Plan created successfully');
    }
    load();
    setShowForm(false);
    setEditPlan(null);
  };

  const handleFinalize = async (plan: MorningPlan) => {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Finalize plan for ${plan.process.name} on ${new Date(plan.date).toLocaleDateString('en-IN')}? This cannot be undone.`)) return;
    try {
      await apiFinalizeMorningPlan(token, plan.id);
      showToast('Plan finalized successfully');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to finalize', 'error');
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
          <h2 className="text-xl font-bold text-gray-900">Morning Manpower Plan</h2>
          <p className="text-sm text-gray-500 mt-1">{total} records</p>
        </div>
        <button
          onClick={() => { setEditPlan(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Plan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Plans", value: summary.total, color: "text-blue-600 bg-blue-50" },
          { label: "Total Manpower", value: summary.totalManpower, color: "text-green-600 bg-green-50", icon: <Users size={16} /> },
          { label: "Draft", value: summary.draft, color: "text-yellow-600 bg-yellow-50" },
          { label: "Finalized", value: summary.final, color: "text-purple-600 bg-purple-50" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
            <p className={clsx("text-2xl font-bold mt-1", card.color.split(' ')[0])}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={filters.status}
            onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
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
          <div className="text-center py-16 text-gray-400 text-sm">No plans found for selected filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Date", "Shift", "Process", "Department", "Manpower", "Supervisor", "Status", "Created By", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {new Date(plan.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{plan.shift.name}</td>
                    <td className="px-4 py-3 text-gray-700">{plan.process.name}</td>
                    <td className="px-4 py-3 text-gray-600">{plan.department || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-blue-700 text-base">{plan.totalManpower}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {plan.supervisor ? plan.supervisor.name : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "text-xs px-2.5 py-1 rounded-full font-semibold",
                        plan.status === 'FINAL'
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      )}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{plan.createdBy.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {plan.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => { setEditPlan(plan); setShowForm(true); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleFinalize(plan)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Finalize"
                            >
                              <CheckCircle size={15} />
                            </button>
                          </>
                        )}
                        {plan.status === 'FINAL' && (
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

        {/* Pagination */}
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
        <MorningPlanFormModal
          plan={editPlan}
          processes={processes}
          shifts={shifts}
          supervisors={supervisors}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditPlan(null); }}
        />
      )}
    </div>
    </RoleGuard>
  );
}
