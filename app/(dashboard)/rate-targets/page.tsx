"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight, Pencil, ToggleLeft, ToggleRight, Filter } from "lucide-react";
import { clsx } from "clsx";
import {
  RateTarget, MasterItem,
  apiGetRateTargets, apiCreateRateTarget, apiUpdateRateTarget, apiToggleRateTarget,
  apiGetActiveProducts, apiGetActiveCustomers, apiGetActiveProcesses,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import RateTargetFormModal from "@/components/rate-targets/RateTargetFormModal";

const LIMIT = 10;

export default function RateTargetsPage() {
  const [data, setData] = useState<RateTarget[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ productId: "", customerId: "", processId: "", effectiveFrom: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<MasterItem[]>([]);
  const [processes, setProcesses] = useState<MasterItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RateTarget | null>(null);
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
      const res = await apiGetRateTargets(token, {
        search,
        productId: filters.productId ? Number(filters.productId) : undefined,
        customerId: filters.customerId ? Number(filters.customerId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
        effectiveFrom: filters.effectiveFrom || undefined,
        page,
        limit: LIMIT,
      });
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filters, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiGetActiveProducts(token),
      apiGetActiveCustomers(token),
      apiGetActiveProcesses(token),
    ]).then(([p, c, pr]) => {
      setProducts(p);
      setCustomers(c);
      setProcesses(pr);
    }).catch(console.error);
  }, []);

  const handleToggle = async (item: RateTarget) => {
    const token = getToken();
    if (!token) return;
    try {
      await apiToggleRateTarget(token, item.id);
      showToast(`Rate target ${item.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handleSave = async (formData: object, id?: number) => {
    const token = getToken();
    if (!token) return;
    if (id) {
      await apiUpdateRateTarget(token, id, formData);
      showToast('Rate target updated');
    } else {
      await apiCreateRateTarget(token, formData);
      showToast('Rate target created');
    }
    load();
    setShowForm(false);
    setEditItem(null);
  };

  const totalPages = Math.ceil(total / LIMIT);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN');

  return (
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
          <h2 className="text-xl font-bold text-gray-900">Rate Target Master</h2>
          <p className="text-sm text-gray-500 mt-1">{total} total records</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Rate Target
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search product, customer, process..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-gray-700 outline-none flex-1 placeholder-gray-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
            showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          <Filter size={16} />
          Filters
        </button>
        <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
            <select value={filters.productId} onChange={(e) => { setFilters((f) => ({ ...f, productId: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Products</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
            <select value={filters.customerId} onChange={(e) => { setFilters((f) => ({ ...f, customerId: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Customers</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Process</label>
            <select value={filters.processId} onChange={(e) => { setFilters((f) => ({ ...f, processId: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Processes</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Effective From</label>
            <input type="date" value={filters.effectiveFrom}
              onChange={(e) => { setFilters((f) => ({ ...f, effectiveFrom: e.target.value })); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2 sm:col-span-4 flex justify-end">
            <button onClick={() => { setFilters({ productId: "", customerId: "", processId: "", effectiveFrom: "" }); setPage(1); }}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors">
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No rate targets found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Product", "Customer", "Process", "Hourly Rate", "Target/Hr", "Rate/Piece", "Effective From", "Effective To", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{item.product.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{item.customer.name}</p>
                      <p className="text-xs text-gray-400">{item.customer.code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.process.name}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">₹{Number(item.hourlyRate).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(item.targetPerHour).toFixed(0)}</td>
                    <td className="px-4 py-3 text-gray-700">₹{Number(item.ratePerPiece).toFixed(4)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(item.effectiveFrom)}</td>
                    <td className="px-4 py-3 text-gray-600">{item.effectiveTo ? formatDate(item.effectiveTo) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        item.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditItem(item); setShowForm(true); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleToggle(item)}
                          className={clsx("p-1.5 rounded-lg transition-colors",
                            item.isActive ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                          )} title={item.isActive ? "Deactivate" : "Activate"}>
                          {item.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
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
        <RateTargetFormModal
          item={editItem}
          products={products}
          customers={customers}
          processes={processes}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}
