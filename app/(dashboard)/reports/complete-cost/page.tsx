"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getToken, getUser } from "@/lib/auth";
import { canSeeCost, UserRole } from "@/lib/roles";
import { apiGetLatestCostPerPiece, apiGetActiveProducts, MasterItem } from "@/lib/api";

function safe(n: any) { return isNaN(Number(n)) || !isFinite(Number(n)) ? 0 : Number(n); }
function fmt(n: number, d = 2) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function CompleteProductCostPage() {
  const [products, setProducts] = useState<MasterItem[]>([]);
  const [productId, setProductId] = useState('');
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

  const load = async () => {
    if (!productId) { setError('Please select a product'); return; }
    setError('');
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetLatestCostPerPiece(token, Number(productId));
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const isProfit = data?.summary?.status === 'PROFIT';
  const maxCPP = data ? Math.max(...data.processes.map((p: any) => p.actualCPP), 1) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/reports" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Complete Product Cost</h2>
          <p className="text-sm text-gray-500">Latest cost per piece — process wise breakdown</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Select Product *</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Choose a product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
          {loading ? 'Loading...' : 'Generate'}
        </button>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>

      {/* Result */}
      {data && data.product && (
        <div className="space-y-4">

          {/* Summary Banner */}
          {showCost && data.summary && (
            <div className={clsx("rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4",
              isProfit ? "bg-green-700" : "bg-red-700")}>
              <div>
                <p className="text-white/70 text-xs uppercase tracking-wider">Complete Product Cost</p>
                <p className="text-white font-black text-2xl mt-0.5">{data.product.name}</p>
                <p className="text-white/70 text-sm">Last Packing: {data.packingDate} → {fmt(data.finalOutput, 0)} pcs finished</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-white/70 text-xs">Target ₹/Piece</p>
                  <p className="text-2xl font-black text-white">₹{fmt(safe(data.summary.totalTargetCPP))}</p>
                </div>
                <div className="text-center bg-white/20 rounded-xl px-5 py-3">
                  <p className="text-white/70 text-xs">Actual ₹/Piece</p>
                  <p className="text-3xl font-black text-white">₹{fmt(safe(data.summary.totalCPP))}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/70 text-xs">Variance</p>
                  <p className={clsx("text-xl font-black", isProfit ? "text-green-300" : "text-red-300")}>
                    {isProfit ? '-' : '+'}₹{fmt(safe(Math.abs(safe(data.summary.variance))))}
                  </p>
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {isProfit ? '✅ PROFIT' : '❌ LOSS'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Process Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.processes.map((p: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Process Header */}
                <div className="bg-slate-800 px-4 py-3">
                  <p className="text-slate-400 text-xs">{p.latestDate}</p>
                  <p className="text-white font-black text-lg">{p.process.name}</p>
                  <p className="text-slate-400 text-xs">{p.lines.join(', ')}</p>
                </div>

                {/* Stats */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Manpower</span>
                    <span className="font-bold text-blue-700">{p.totalMP} workers</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Hours</span>
                    <span className="font-medium text-gray-700">{p.totalHours} hrs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Target Output</span>
                    <span className="font-medium text-gray-700">{fmt(safe(p.totalTarget), 0)} pcs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Actual Output</span>
                    <span className="font-bold text-gray-900">{fmt(safe(p.totalOutput), 0)} pcs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Achievement</span>
                    <span className={clsx("font-bold", p.achievementPct >= 100 ? "text-green-600" : "text-red-600")}>
                      {fmt(safe(p.achievementPct), 1)}%
                    </span>
                  </div>

                  {p.wipEntries > 0 && (
                    <div className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-1.5">
                      ⚠️ Includes {p.wipEntries} WIP entry cost
                    </div>
                  )}
                  {showCost && (
                    <>
                      <div className="border-t border-gray-100 pt-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Cost</span>
                          <span className="font-medium text-gray-700">₹{fmt(safe(p.totalCost), 0)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Target ₹/Piece</span>
                        <span className="font-bold text-green-600">₹{fmt(safe(p.targetCPP))}</span>
                      </div>

                      {/* Cost per piece highlight */}
                      <div className={clsx("rounded-xl p-3 text-center mt-2",
                        p.status === 'PROFIT' ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
                        <p className="text-xs text-gray-500 mb-1">Cost per Piece</p>
                        <p className={clsx("text-2xl font-black",
                          p.status === 'PROFIT' ? "text-green-700" : "text-red-700")}>
                          ₹{fmt(safe(p.actualCPP))}
                        </p>
                        <span className={clsx("text-xs font-bold",
                          p.status === 'PROFIT' ? "text-green-600" : "text-red-600")}>
                          {p.status === 'PROFIT' ? '✅ PROFIT' : '❌ LOSS'}
                        </span>
                      </div>

                      {/* Bar showing proportion */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Share of total cost</span>
                          <span>{fmt(safe(data.summary.totalCPP) > 0 ? (safe(p.actualCPP) / safe(data.summary.totalCPP)) * 100 : 0, 1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${maxCPP > 0 ? (safe(p.actualCPP) / maxCPP) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Table */}
          {showCost && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-bold text-gray-800">Cost Per Piece Summary</h4>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Process</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MP</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Output</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Batch Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase bg-orange-50">Allocated Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase bg-green-50">Target ₹/pc</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-blue-600 uppercase bg-blue-50">Actual ₹/pc</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.processes.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900">{p.process.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.latestDate}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">{p.totalMP}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmt(safe(p.totalOutput), 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">₹{fmt(safe(p.totalCost), 0)}</td>
                      <td className="px-4 py-3 text-right bg-orange-50 font-medium text-orange-700">₹{fmt(safe(p.allocatedCost), 0)}</td>
                      <td className="px-4 py-3 text-right bg-green-50 font-bold text-green-700">₹{fmt(safe(p.targetCPP))}</td>
                      <td className="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">₹{fmt(safe(p.actualCPP))}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold",
                          p.status === 'PROFIT' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={clsx("border-t-2 font-black",
                    isProfit ? "bg-green-600 text-white" : "bg-red-600 text-white")}>
                    <td colSpan={5} className="px-4 py-3 text-sm">
                      COMPLETE COST PER PIECE — {data.product.name}
                    </td>
                    <td className="px-4 py-3 text-right text-lg">₹{fmt(safe(data.summary.totalTargetCPP))}</td>
                    <td className="px-4 py-3 text-right text-xl">₹{fmt(safe(data.summary.totalCPP))}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {isProfit ? '✅ PROFIT' : '❌ LOSS'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-4xl mb-3">🏭</p>
          <p className="text-gray-700 font-medium">Select a product to see complete cost per piece</p>
          <p className="text-gray-400 text-sm mt-1">Shows latest production data for each process</p>
        </div>
      )}
    </div>
  );
}
