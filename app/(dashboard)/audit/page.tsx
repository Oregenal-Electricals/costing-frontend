"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Shield, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { AuditLog, AuditStats, apiGetAuditLogs, apiGetAuditStats } from "@/lib/api";
import { getToken } from "@/lib/auth";
import RoleGuard from "@/components/auth/RoleGuard";

const LIMIT = 30;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  APPROVE: 'bg-purple-100 text-purple-700',
  REJECT: 'bg-orange-100 text-orange-700',
  LOGIN: 'bg-gray-100 text-gray-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
};

export default function AuditPage() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterActions, setFilterActions] = useState<string[]>([]);
  const [filterTables, setFilterTables] = useState<{ value: string; label: string }[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    action: '', tableName: '',
  });

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetAuditLogs(token, {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        action: filters.action || undefined,
        tableName: filters.tableName || undefined,
        page, limit: LIMIT,
      });
      setData(res.data);
      setTotal(res.total);
      setFilterActions(res.filters.actions);
      setFilterTables(res.filters.tables);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const loadStats = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const s = await apiGetAuditStats(token);
      setStats(s);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const totalPages = Math.ceil(total / LIMIT);

  const formatData = (d: unknown) => {
    if (!d) return '—';
    try {
      const str = typeof d === 'string' ? d : JSON.stringify(d, null, 2);
      return str.length > 80 ? str.slice(0, 80) + '...' : str;
    } catch { return '—'; }
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
              <p className="text-sm text-gray-500">{total} records · Read-only</p>
            </div>
          </div>
          <button onClick={() => { load(); loadStats(); }}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Today's Activity</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.todayCount}</p>
            </div>
            {stats.byAction.slice(0, 2).map((a) => (
              <div key={a.action} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{a.action}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{a.count}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
            <input type="date" value={filters.dateFrom}
              onChange={(e) => { setFilters((f) => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
            <input type="date" value={filters.dateTo}
              onChange={(e) => { setFilters((f) => ({ ...f, dateTo: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <select value={filters.action}
              onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Actions</option>
              {filterActions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Module</label>
            <select value={filters.tableName}
              onChange={(e) => { setFilters((f) => ({ ...f, tableName: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Modules</option>
              {filterTables.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
            <div className="text-center py-16 text-gray-400 text-sm">No audit records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Timestamp", "User", "Role", "Action", "Module", "Record ID", "Changes", "IP"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        <p>{new Date(log.createdAt).toLocaleDateString('en-IN')}</p>
                        <p className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString('en-IN')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-900">{log.user.name}</p>
                        <p className="text-xs text-gray-400">{log.user.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {log.user.role.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-xs px-2 py-1 rounded-full font-semibold",
                          ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'
                        )}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{log.moduleLabel}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.recordId || '—'}</td>
                      <td className="px-4 py-3 text-xs max-w-xs">
                        {(log.newData as object) && (
                          <p className="text-green-700 font-mono truncate" title={JSON.stringify(log.newData)}>
                            +{formatData(log.newData)}
                          </p>
                        )}
                        {(log.oldData as object) && (
                          <p className="text-red-600 font-mono truncate" title={JSON.stringify(log.oldData)}>
                            -{formatData(log.oldData)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} of {total}
              </p>
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

        {/* Activity by Module */}
        {stats?.byTable && stats.byTable.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Activity by Module</h3>
            <div className="space-y-2">
              {stats.byTable.map((t) => {
                const maxCount = stats.byTable[0].count;
                return (
                  <div key={t.tableName} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-40 truncate">{t.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(t.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
