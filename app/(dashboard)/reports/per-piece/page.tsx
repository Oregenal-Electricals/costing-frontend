"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getToken, getUser } from "@/lib/auth";
import { canSeeCost, UserRole } from "@/lib/roles";
import {
  apiGetPerPieceCostReport, apiGetActiveShifts,
  apiGetActiveProcesses, MasterItem, ShiftItem
} from "@/lib/api";
import * as XLSX from "xlsx";

function fmt(n: number, d = 2) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold",
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

export default function PerPieceCostPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [processes, setProcesses] = useState<MasterItem[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    shiftId: '',
    processId: '',
  });
  const user = getUser();
  const showCost = canSeeCost((user?.role || 'VIEWER') as UserRole);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([apiGetActiveShifts(token), apiGetActiveProcesses(token)])
      .then(([sh, pr]) => { setShifts(sh); setProcesses(pr); });
  }, []);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetPerPieceCostReport(token, {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        shiftId: filters.shiftId ? Number(filters.shiftId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
      });
      setData(res.data || []);
      setSummary(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const exportExcel = () => {
    const rows: any[] = [];
    for (const d of data) {
      for (const l of d.lines) {
        rows.push({
          'Date': d.date,
          'Process': d.process.name,
          'Shift': d.shift?.name,
          'Total MP (Plan)': d.totalProcessMP,
          'Allocated MP': d.allocatedMP,
          'Supporting MP': d.supportingMP,
          'Line': l.line.name,
          'Product': l.product.name,
          'Line MP': l.manpowerCount,
          'Line Share %': fmt(l.lineSharePct, 1) + '%',
          'Line True Cost': showCost ? fmt(l.lineTrueCost) : '——',
          'Target Output': fmt(l.targetOutput, 0),
          'Actual Output': fmt(l.actualOutput, 0),
          'Achievement %': fmt(l.achievementPct, 1) + '%',
          'TARGET ₹/Piece': showCost ? fmt(l.targetCostPerPiece, 4) : '——',
          'ACTUAL ₹/Piece': showCost ? fmt(l.actualCostPerPiece, 4) : '——',
          'Cost Diff/Piece': showCost ? fmt(l.costDifference, 4) : '——',
          'Gain/Loss': showCost ? fmt(l.gainLoss) : '——',
          'Status': l.status,
        });
      }
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Per Piece Cost Report');
    XLSX.writeFile(wb, `per-piece-cost-${filters.dateFrom}-${filters.dateTo}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/reports"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Per Piece Cost Report</h2>
            <p className="text-sm text-gray-500">Target vs Actual cost per piece by process</p>
          </div>
        </div>
        <button onClick={exportExcel}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
          <Download size={16} />Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
          <input type="date" value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
          <input type="date" value={filters.dateTo}
            onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Shift</label>
          <select value={filters.shiftId}
            onChange={(e) => setFilters(f => ({ ...f, shiftId: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Shifts</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Process</label>
          <select value={filters.processId}
            onChange={(e) => setFilters(f => ({ ...f, processId: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Processes</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      {summary && showCost && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Process Cost", value: `₹${fmt(summary.totalProcessCost)}`, color: "text-blue-700" },
            { label: "Total Target Output", value: fmt(summary.totalTargetOutput, 0), color: "text-gray-700" },
            { label: "Total Actual Output", value: fmt(summary.totalActualOutput, 0), color: "text-gray-900" },
            {
              label: "Net Gain/Loss",
              value: `${summary.totalGainLoss >= 0 ? '+' : ''}₹${fmt(Math.abs(summary.totalGainLoss))}`,
              color: summary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
            },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={clsx("text-xl font-bold mt-1", c.color)}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No data found for selected filters
        </div>
      ) : (
        <div className="space-y-5">
          {data.map((d, di) => (
            <div key={di} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

              {/* Process Header */}
              <div className="bg-slate-800 px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-wider">{d.date} · {d.shift?.name}</p>
                    <h3 className="text-white font-black text-xl mt-0.5">{d.process.name}</h3>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">Total MP</p>
                      <p className="text-white font-bold text-2xl">{d.totalProcessMP}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">Allocated</p>
                      <p className="text-blue-400 font-bold text-2xl">{d.allocatedMP}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">Supporting</p>
                      <p className="text-yellow-400 font-bold text-2xl">{d.supportingMP}</p>
                    </div>
                    {showCost && (
                      <div className="text-center">
                        <p className="text-slate-400 text-xs">Total Cost</p>
                        <p className="text-white font-bold text-xl">₹{fmt(d.totalProcessCost, 0)}</p>
                      </div>
                    )}
                    <StatusBadge status={d.overallStatus} />
                  </div>
                </div>
              </div>

              {/* Line Details */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Line</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MP</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Share%</th>
                      {showCost && <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase bg-blue-50">Line Cost</th>}
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target Qty</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actual Qty</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ach%</th>
                      {showCost && <>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 uppercase bg-green-50">Target ₹/Piece</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-red-600 uppercase bg-red-50">Actual ₹/Piece</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Diff ₹/Piece</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Gain/Loss</th>
                      </>}
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {d.lines.map((l: any, li: number) => (
                      <tr key={li} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{l.line.name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{l.product.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{l.manpowerCount}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{fmt(l.lineSharePct, 1)}%</td>
                        {showCost && (
                          <td className="px-4 py-3 text-right bg-blue-50 font-medium text-blue-700">
                            ₹{fmt(l.lineTrueCost, 0)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-gray-700">{fmt(l.targetOutput, 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(l.actualOutput, 0)}</td>
                        <td className={clsx("px-4 py-3 text-right font-bold",
                          l.achievementPct >= 100 ? "text-green-600" : "text-red-600"
                        )}>{fmt(l.achievementPct, 1)}%</td>
                        {showCost && <>
                          <td className="px-4 py-3 text-right bg-green-50">
                            <span className="font-bold text-green-700">₹{fmt(l.targetCostPerPiece, 2)}</span>
                          </td>
                          <td className="px-4 py-3 text-right bg-red-50">
                            <span className={clsx("font-bold",
                              l.actualCostPerPiece <= l.targetCostPerPiece ? "text-green-600" : "text-red-600"
                            )}>₹{fmt(l.actualCostPerPiece, 2)}</span>
                          </td>
                          <td className={clsx("px-4 py-3 text-right font-bold",
                            l.costDifference <= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {l.costDifference >= 0 ? '+' : ''}₹{fmt(l.costDifference, 2)}
                          </td>
                          <td className={clsx("px-4 py-3 text-right font-bold",
                            l.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {l.gainLoss >= 0 ? '+' : ''}₹{fmt(l.gainLoss, 0)}
                          </td>
                        </>}
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={l.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Process Total */}
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                      <td colSpan={showCost ? 4 : 4} className="px-4 py-3 text-gray-700 font-black">
                        TOTAL — {d.process.name}
                      </td>
                      {showCost && (
                        <td className="px-4 py-3 text-right bg-blue-50 text-blue-700 font-black">
                          ₹{fmt(d.totalProcessCost, 0)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-gray-700">{fmt(d.totalTargetOutput, 0)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-black">{fmt(d.totalActualOutput, 0)}</td>
                      <td className={clsx("px-4 py-3 text-right font-black",
                        d.avgAchievement >= 100 ? "text-green-600" : "text-red-600"
                      )}>{fmt(d.avgAchievement, 1)}%</td>
                      {showCost && <>
                        <td className="px-4 py-3 bg-green-50"></td>
                        <td className="px-4 py-3 bg-red-50"></td>
                        <td className="px-4 py-3"></td>
                        <td className={clsx("px-4 py-3 text-right font-black",
                          d.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {d.totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(d.totalGainLoss), 0)}
                        </td>
                      </>}
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={d.overallStatus} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
