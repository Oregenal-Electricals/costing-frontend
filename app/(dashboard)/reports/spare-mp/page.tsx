"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Download, AlertTriangle, TrendingDown } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getToken, getUser } from "@/lib/auth";
import { canSeeCost, UserRole } from "@/lib/roles";
import { apiGetSpareMPReport, SpareMPReport, apiGetActiveShifts, ShiftItem } from "@/lib/api";
import * as XLSX from "xlsx";

function fmt(n: number, d = 0) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtCurrency(n: number) {
  return `₹${fmt(Math.abs(n), 2)}`;
}

export default function SpareMPReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftId, setShiftId] = useState('');
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [data, setData] = useState<SpareMPReport | null>(null);
  const [loading, setLoading] = useState(false);
  const user = getUser();
  const showCost = canSeeCost((user?.role || 'VIEWER') as UserRole);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiGetActiveShifts(token).then(setShifts).catch(console.error);
  }, []);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetSpareMPReport(
        token, date,
        shiftId ? Number(shiftId) : undefined,
      );
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date, shiftId]);

  useEffect(() => { load(); }, [load]);

  const exportExcel = () => {
    if (!data) return;
    const rows: any[] = [];

    for (const p of data.processes) {
      rows.push({
        'Process': p.process.name,
        'Total MP (Morning Plan)': p.totalProcessMP,
        'Allocated to Lines': p.allocatedMP,
        'Spare (Idle) MP': p.spareMP,
        'Direct Labour Cost': showCost ? p.totalDirectCost : '——',
        'Spare MP Cost': showCost ? p.totalSpareMPCost : '——',
        'TRUE Total Cost': showCost ? p.totalTrueCost : '——',
        'Target Output': p.totalTargetOutput,
        'Actual Output': p.totalActualOutput,
        'TRUE Gain/Loss': showCost ? p.totalTrueGainLoss : '——',
        'Line': '',
        'Product': '',
        'Line Share %': '',
        'Line Spare Cost': '',
        'Line TRUE Cost': '',
        'Line Gain/Loss': '',
        'Status': '',
      });
      for (const l of p.lines) {
        rows.push({
          'Process': `  → ${p.process.name}`,
          'Total MP (Morning Plan)': '',
          'Allocated to Lines': l.manpowerCount,
          'Spare (Idle) MP': '',
          'Direct Labour Cost': showCost ? l.directCost : '——',
          'Spare MP Cost': showCost ? l.spareMPCost : '——',
          'TRUE Total Cost': showCost ? l.trueTotalCost : '——',
          'Target Output': l.targetOutput,
          'Actual Output': l.actualOutput,
          'TRUE Gain/Loss': showCost ? l.trueGainLoss : '——',
          'Line': l.line.name,
          'Product': l.product.name,
          'Line Share %': `${fmt(l.lineSharePct, 1)}%`,
          'Line Spare Cost': showCost ? l.spareMPCost : '——',
          'Line TRUE Cost': showCost ? l.trueTotalCost : '——',
          'Line Gain/Loss': showCost ? l.trueGainLoss : '——',
          'Status': l.trueStatus,
        });
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Spare MP Report');
    XLSX.writeFile(wb, `spare-mp-report-${date}.xlsx`);
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
            <h2 className="text-xl font-bold text-gray-900">Spare Manpower Cost Report</h2>
            <p className="text-sm text-gray-500">True costing with idle manpower distribution</p>
          </div>
        </div>
        <button onClick={exportExcel}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
          <Download size={16} />
          Excel Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Shift</label>
          <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Shifts</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {data && showCost && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Direct Cost", value: fmtCurrency(data.summary.totalDirectCost), color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Total Spare MP Cost", value: fmtCurrency(data.summary.totalSpareMPCost), color: "text-red-600", bg: "bg-red-50", icon: <AlertTriangle size={18} /> },
            { label: "TRUE Total Cost", value: fmtCurrency(data.summary.totalTrueCost), color: "text-gray-800", bg: "bg-gray-50" },
            {
              label: "TRUE Net Gain/Loss",
              value: `${data.summary.totalTrueGainLoss >= 0 ? '+' : ''}${fmtCurrency(data.summary.totalTrueGainLoss)}`,
              color: data.summary.totalTrueGainLoss >= 0 ? "text-green-600" : "text-red-600",
              bg: data.summary.totalTrueGainLoss >= 0 ? "bg-green-50" : "bg-red-50",
              icon: data.summary.totalTrueGainLoss < 0 ? <TrendingDown size={18} /> : undefined,
            },
          ].map((card) => (
            <div key={card.label} className={clsx("rounded-xl border border-gray-200 p-4", card.bg)}>
              <div className="flex items-center gap-2">
                {card.icon && <span className={card.color}>{card.icon}</span>}
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
              <p className={clsx("text-xl font-bold mt-1", card.color)}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Process Breakdown */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.processes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No production entries found for selected date/shift
        </div>
      ) : (
        <div className="space-y-4">
          {data.processes.map((p) => (
            <div key={p.process.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Process Header */}
              <div className="bg-slate-800 px-5 py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-white font-bold text-lg">{p.process.name}</h3>
                    <p className="text-slate-400 text-sm">{p.shift?.name}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">Total MP</p>
                      <p className="text-white font-bold text-lg">{p.totalProcessMP}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">Allocated</p>
                      <p className="text-blue-400 font-bold text-lg">{p.allocatedMP}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs">Spare (Idle)</p>
                      <p className={clsx("font-bold text-lg", p.spareMP > 0 ? "text-red-400" : "text-green-400")}>
                        {p.spareMP}
                      </p>
                    </div>
                    {showCost && (
                      <>
                        <div className="text-center">
                          <p className="text-slate-400 text-xs">Spare Cost</p>
                          <p className="text-red-400 font-bold">{fmtCurrency(p.totalSpareMPCost)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400 text-xs">TRUE Cost</p>
                          <p className="text-white font-bold">{fmtCurrency(p.totalTrueCost)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400 text-xs">TRUE Gain/Loss</p>
                          <p className={clsx("font-bold",
                            p.totalTrueGainLoss >= 0 ? "text-green-400" : "text-red-400"
                          )}>
                            {p.totalTrueGainLoss >= 0 ? '+' : ''}{fmtCurrency(p.totalTrueGainLoss)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Spare MP warning */}
                {p.spareMP > 0 && showCost && (
                  <div className="mt-3 bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-300 text-xs">
                      {p.spareMP} idle worker(s) costing {fmtCurrency(p.totalSpareMPCost)} distributed across {p.lines.length} line(s)
                    </p>
                  </div>
                )}
              </div>

              {/* Line Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Line</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Direct MP</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Share %</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actual</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ach%</th>
                      {showCost && <>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Direct Cost</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase bg-red-50 text-red-600">Spare Share</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase bg-blue-50">TRUE Cost</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">TRUE G/L</th>
                      </>}
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {p.lines.map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{l.line.name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{l.product.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{l.manpowerCount}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(l.lineSharePct, 1)}%</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(l.targetOutput, 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(l.actualOutput, 0)}</td>
                        <td className={clsx("px-4 py-3 text-right font-bold",
                          l.achievementPct >= 100 ? "text-green-600" : "text-red-600"
                        )}>{fmt(l.achievementPct, 1)}%</td>
                        {showCost && <>
                          <td className="px-4 py-3 text-right text-gray-600">₹{fmt(l.directCost, 0)}</td>
                          <td className="px-4 py-3 text-right bg-red-50">
                            <span className="text-red-600 font-medium">₹{fmt(l.spareMPCost, 0)}</span>
                          </td>
                          <td className="px-4 py-3 text-right bg-blue-50">
                            <span className="text-blue-700 font-bold">₹{fmt(l.trueTotalCost, 0)}</span>
                          </td>
                          <td className={clsx("px-4 py-3 text-right font-bold",
                            l.trueGainLoss >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {l.trueGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(l.trueGainLoss), 0)}
                          </td>
                        </>}
                        <td className="px-4 py-3 text-center">
                          <span className={clsx("text-xs px-2 py-1 rounded-full font-semibold",
                            l.trueStatus === 'PROFIT' ? "bg-green-100 text-green-700" :
                            l.trueStatus === 'LOSS' ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          )}>{l.trueStatus}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Process Total Row */}
                  {showCost && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-300">
                        <td colSpan={7} className="px-4 py-3 font-bold text-gray-700">PROCESS TOTAL</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-700">₹{fmt(p.totalDirectCost, 0)}</td>
                        <td className="px-4 py-3 text-right bg-red-50 font-bold text-red-600">₹{fmt(p.totalSpareMPCost, 0)}</td>
                        <td className="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">₹{fmt(p.totalTrueCost, 0)}</td>
                        <td className={clsx("px-4 py-3 text-right font-bold",
                          p.totalTrueGainLoss >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {p.totalTrueGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(p.totalTrueGainLoss), 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx("text-xs px-2 py-1 rounded-full font-bold",
                            p.totalTrueGainLoss >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {p.totalTrueGainLoss >= 0 ? 'PROFIT' : 'LOSS'}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
