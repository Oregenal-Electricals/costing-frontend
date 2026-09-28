"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Download, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getToken, getUser } from "@/lib/auth";
import { canSeeCost, UserRole } from "@/lib/roles";
import { apiGetCompleteProductCost, apiGetActiveProducts, MasterItem } from "@/lib/api";
import * as XLSX from "xlsx";

function fmt(n: number, d = 2) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function CompleteProductCostPage() {
  const [products, setProducts] = useState<MasterItem[]>([]);
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const user = getUser();
  const showCost = canSeeCost((user?.role || 'VIEWER') as UserRole);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGetActiveProducts(token).then(setProducts).catch(console.error);
  }, []);

  const load = useCallback(async () => {
    if (!productId) { setError('Please select a product'); return; }
    if (!dateFrom || !dateTo) { setError('Please select date range'); return; }
    setError('');
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetCompleteProductCost(token, Number(productId), dateFrom, dateTo);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [productId, dateFrom, dateTo]);

  const exportExcel = () => {
    if (!data) return;
    const rows: any[] = [];
    for (const p of data.processes) {
      rows.push({
        'Process': p.process.name,
        'Lines': p.lines.join(', '),
        'Dates': p.dates.join(', '),
        'Slots': p.slots,
        'Total Man Hours': fmt(p.totalManHours),
        'Total Cost': showCost ? fmt(p.totalCost) : '——',
        'Target Output': fmt(p.totalTargetOutput, 0),
        'Actual Output': fmt(p.totalActualOutput, 0),
        'Achievement %': fmt(p.achievementPct, 1) + '%',
        'Target ₹/Piece': showCost ? fmt(p.targetCPP) : '——',
        'Actual ₹/Piece': showCost ? fmt(p.actualCPP) : '——',
      });
    }
    if (data.summary && showCost) {
      rows.push({});
      rows.push({
        'Process': 'TOTAL',
        'Total Cost': fmt(data.summary.totalCost),
        'Actual Output': fmt(data.summary.finalOutput, 0),
        'Target ₹/Piece': fmt(data.summary.targetCPP),
        'Actual ₹/Piece': fmt(data.summary.completeCPP),
        'Achievement %': data.summary.status,
      });
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Complete Product Cost');
    XLSX.writeFile(wb, `complete-cost-${data.product?.name}-${dateFrom}-${dateTo}.xlsx`);
  };

  const isProfit = data?.summary?.status === 'PROFIT';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Complete Product Cost</h2>
            <p className="text-sm text-gray-500">Total labour cost per finished piece across all processes</p>
          </div>
        </div>
        {data && (
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            <Download size={16} />Excel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Product *</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date From *</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date To *</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-end">
            <button onClick={load} disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {/* Results */}
      {data && data.product && (
        <div className="space-y-4">

          {/* Product + Summary Header */}
          <div className={clsx("rounded-2xl p-6 text-white",
            isProfit ? "bg-green-700" : "bg-red-700")}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white/70 text-sm uppercase tracking-wider">Complete Product Cost Report</p>
                <h3 className="text-2xl font-black mt-1">{data.product.name}</h3>
                <p className="text-white/70 text-sm mt-1">{dateFrom} → {dateTo}</p>
              </div>
              {showCost && data.summary && (
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-white/70 text-xs">Total Cost</p>
                    <p className="text-2xl font-black">₹{fmt(data.summary.totalCost, 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/70 text-xs">Final Output ({data.summary.finalProcess})</p>
                    <p className="text-2xl font-black">{fmt(data.summary.finalOutput, 0)} pcs</p>
                  </div>
                  <div className="text-center bg-white/20 rounded-xl px-4 py-3">
                    <p className="text-white/70 text-xs">Target ₹/Piece</p>
                    <p className="text-xl font-black">₹{fmt(data.summary.targetCPP)}</p>
                  </div>
                  <div className="text-center bg-white/20 rounded-xl px-4 py-3">
                    <p className="text-white/70 text-xs">Complete ₹/Piece</p>
                    <p className="text-xl font-black">₹{fmt(data.summary.completeCPP)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/70 text-xs">Variance</p>
                    <p className={clsx("text-xl font-black", isProfit ? "text-green-300" : "text-red-300")}>
                      {isProfit ? '-' : '+'}₹{fmt(Math.abs(data.summary.variance))}
                    </p>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      {isProfit ? '✅ PROFIT' : '❌ LOSS'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Process Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-bold text-gray-800">Process-wise Breakdown</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Process</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lines</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dates</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Slots</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Man Hrs</th>
                    {showCost && <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase bg-blue-50">Total Cost</th>}
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actual</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ach%</th>
                    {showCost && <>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase bg-green-50">Target ₹/pc</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-red-600 uppercase bg-red-50">Actual ₹/pc</th>
                    </>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.processes.map((p: any, i: number) => {
                    const isPack = p.process.name.toUpperCase().includes('PACK');
                    return (
                      <tr key={i} className={clsx("hover:bg-gray-50", isPack && "bg-blue-50/40")}>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {p.process.name}
                          {isPack && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Final</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{p.lines.join(', ')}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {p.dates.length === 1 ? p.dates[0] : `${p.dates[0]} → ${p.dates[p.dates.length-1]} (${p.dates.length}d)`}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{p.slots}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(p.totalManHours, 0)}</td>
                        {showCost && <td className="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">₹{fmt(p.totalCost, 0)}</td>}
                        <td className="px-4 py-3 text-right text-gray-700">{fmt(p.totalTargetOutput, 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(p.totalActualOutput, 0)}</td>
                        <td className={clsx("px-4 py-3 text-right font-bold",
                          p.achievementPct >= 100 ? "text-green-600" : "text-red-600")}>
                          {fmt(p.achievementPct, 1)}%
                        </td>
                        {showCost && <>
                          <td className="px-4 py-3 text-right bg-green-50 font-bold text-green-700">₹{fmt(p.targetCPP)}</td>
                          <td className={clsx("px-4 py-3 text-right bg-red-50 font-bold",
                            p.actualCPP <= p.targetCPP ? "text-green-600" : "text-red-600")}>
                            ₹{fmt(p.actualCPP)}
                          </td>
                        </>}
                      </tr>
                    );
                  })}
                </tbody>
                {showCost && data.summary && (
                  <tfoot>
                    <tr className={clsx("border-t-2 font-black text-white",
                      isProfit ? "bg-green-600" : "bg-red-600")}>
                      <td colSpan={5} className="px-4 py-3">COMPLETE PRODUCT COST</td>
                      <td className="px-4 py-3 text-right">₹{fmt(data.summary.totalCost, 0)}</td>
                      <td className="px-4 py-3 text-right">{fmt(data.summary.finalOutput, 0)}</td>
                      <td className="px-4 py-3 text-right">{fmt(data.summary.finalOutput, 0)}</td>
                      <td className="px-4 py-3 text-right">{isProfit ? '✅' : '❌'} {data.summary.status}</td>
                      <td className="px-4 py-3 text-right">₹{fmt(data.summary.targetCPP)}</td>
                      <td className="px-4 py-3 text-right">₹{fmt(data.summary.completeCPP)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Cost breakdown visual */}
          {showCost && data.summary && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h4 className="font-bold text-gray-800 mb-4">Cost Per Piece Breakdown</h4>
              <div className="space-y-3">
                {data.processes.map((p: any, i: number) => {
                  const pct = data.summary.completeCPP > 0 ? (p.actualCPP / data.summary.completeCPP) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{p.process.name}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">₹{fmt(p.actualCPP)}/pc</span>
                          <span className="text-gray-400">{fmt(pct, 1)}% of total</span>
                        </div>
                      </div>
                      <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-lg flex items-center px-2"
                          style={{ width: `${pct}%` }}>
                          {pct > 10 && <span className="text-white text-xs font-bold">₹{fmt(p.actualCPP)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-black text-gray-900">COMPLETE ₹/PIECE</span>
                  <span className={clsx("text-2xl font-black", isProfit ? "text-green-600" : "text-red-600")}>
                    ₹{fmt(data.summary.completeCPP)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Select a product and date range, then click Generate Report</p>
        </div>
      )}
    </div>
  );
}
