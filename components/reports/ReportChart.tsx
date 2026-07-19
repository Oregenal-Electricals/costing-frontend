"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { canSeeCost, UserRole } from "@/lib/roles";
import { getUser } from "@/lib/auth";

interface Props {
  data: any[];
  reportType: string;
  loading: boolean;
}

function fmt(n: number, d = 0) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function ReportChart({ data, reportType, loading }: Props) {
  const user = getUser();
  const showCost = canSeeCost((user?.role || 'VIEWER') as UserRole);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (reportType === 'monthly') {
      const map: Record<string, any> = {};
      for (const e of data) {
        const date = new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        if (!map[date]) {
          map[date] = { label: date, target: 0, actual: 0, gainLoss: 0 };
        }
        map[date].target   += Number(e.targetOutput || 0);
        map[date].actual   += Number(e.actualOutput || 0);
        map[date].gainLoss += Number(e.labourGainLoss || 0);
      }
      return Object.values(map).map((d: any) => ({
        ...d,
        achievement: d.target > 0 ? (d.actual / d.target) * 100 : 0,
        status: d.gainLoss >= 0 ? 'PROFIT' : 'LOSS',
      }));
    } else {
      // Group by line
      const map: Record<string, any> = {};
      for (const e of data) {
        const key = e.line?.name || 'Unknown';
        if (!map[key]) {
          map[key] = { label: key, process: e.process?.name, target: 0, actual: 0, gainLoss: 0 };
        }
        map[key].target   += Number(e.targetOutput || 0);
        map[key].actual   += Number(e.actualOutput || 0);
        map[key].gainLoss += Number(e.labourGainLoss || 0);
      }
      return Object.values(map).map((d: any) => ({
        ...d,
        achievement: d.target > 0 ? (d.actual / d.target) * 100 : 0,
        status: d.gainLoss >= 0 ? 'PROFIT' : 'LOSS',
      }));
    }
  }, [data, reportType]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (chartData.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
      No data found for selected filters
    </div>
  );

  // For vertical bar chart
  const values = showCost
    ? chartData.map((d: any) => d.gainLoss)
    : chartData.map((d: any) => d.achievement - 100); // center at 100% for non-cost

  const maxVal = Math.max(...values.map(Math.abs), 1);
  const chartHeight = 260; // px height of chart area

  const totalGainLoss = chartData.reduce((s: number, d: any) => s + d.gainLoss, 0);
  const totalTarget   = chartData.reduce((s: number, d: any) => s + d.target, 0);
  const totalActual   = chartData.reduce((s: number, d: any) => s + d.actual, 0);
  const avgAch        = chartData.reduce((s: number, d: any) => s + d.achievement, 0) / chartData.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Total Target</p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalTarget)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Total Actual</p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalActual)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Avg Achievement</p>
          <p className={clsx("text-lg font-bold", avgAch >= 100 ? "text-green-600" : "text-red-600")}>
            {fmt(avgAch, 1)}%
          </p>
        </div>
        {showCost && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Net Gain/Loss</p>
            <p className={clsx("text-lg font-bold", totalGainLoss >= 0 ? "text-green-600" : "text-red-600")}>
              {totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(totalGainLoss))}
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-gray-600">PROFIT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-xs text-gray-600">LOSS</span>
        </div>
        <span className="text-xs text-gray-400">
          {showCost ? 'Y-axis: Gain/Loss (₹)' : 'Y-axis: Achievement above/below 100%'}
        </span>
      </div>

      {/* Vertical bar chart */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: Math.max(chartData.length * 60, 400) }}>

          {/* Y-axis labels + bars */}
          <div className="flex items-end gap-0">

            {/* Y-axis */}
            <div className="flex flex-col justify-between text-right pr-2 flex-shrink-0"
              style={{ height: chartHeight + 24, width: 70 }}>
              <span className="text-xs text-green-600 font-medium">
                {showCost ? `+₹${fmt(maxVal)}` : `+${fmt(maxVal, 0)}%`}
              </span>
              <span className="text-xs text-gray-400">0</span>
              <span className="text-xs text-red-600 font-medium">
                {showCost ? `-₹${fmt(maxVal)}` : `-${fmt(maxVal, 0)}%`}
              </span>
            </div>

            {/* Bars area */}
            <div className="flex items-end gap-1 relative flex-1"
              style={{ height: chartHeight + 24 }}>

              {/* Zero line */}
              <div className="absolute left-0 right-0 border-t-2 border-gray-300 z-10"
                style={{ top: chartHeight / 2 }} />

              {chartData.map((item: any, i: number) => {
                const val = showCost ? item.gainLoss : (item.achievement - 100);
                const isPositive = val >= 0;
                const barHeightPct = Math.abs(val) / maxVal;
                const barPx = Math.max(barHeightPct * (chartHeight / 2), 2);

                return (
                  <div key={i} className="flex flex-col items-center flex-1 group relative"
                    style={{ height: chartHeight + 24 }}>

                    {/* Profit bar — above zero line */}
                    <div style={{ height: chartHeight / 2, display: 'flex', alignItems: 'flex-end' }}>
                      {isPositive && (
                        <div
                          className="w-full bg-green-500 hover:bg-green-400 rounded-t-md transition-all cursor-pointer relative"
                          style={{ height: barPx, minWidth: 28 }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 z-20 pointer-events-none">
                            {item.label}<br />
                            Ach: {fmt(item.achievement, 1)}%<br />
                            {showCost && `+₹${fmt(item.gainLoss)}`}
                          </div>
                        </div>
                      )}
                      {!isPositive && <div style={{ height: 0 }} />}
                    </div>

                    {/* Zero line spacer */}
                    <div style={{ height: 2 }} />

                    {/* Loss bar — below zero line */}
                    <div style={{ height: chartHeight / 2, display: 'flex', alignItems: 'flex-start' }}>
                      {!isPositive && (
                        <div
                          className="w-full bg-red-500 hover:bg-red-400 rounded-b-md transition-all cursor-pointer relative"
                          style={{ height: barPx, minWidth: 28 }}
                        >
                          {/* Tooltip */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 z-20 pointer-events-none">
                            {item.label}<br />
                            Ach: {fmt(item.achievement, 1)}%<br />
                            {showCost && `-₹${fmt(Math.abs(item.gainLoss))}`}
                          </div>
                        </div>
                      )}
                      {isPositive && <div style={{ height: 0 }} />}
                    </div>

                    {/* X label */}
                    <div className="text-center mt-1" style={{ height: 24 }}>
                      <span className="text-xs text-gray-500 truncate block" style={{ maxWidth: 56 }}>
                        {item.label.length > 8 ? item.label.slice(0, 8) + '…' : item.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis label */}
          <p className="text-center text-xs text-gray-400 mt-2">
            {reportType === 'monthly' ? 'Date' : 'Line'} — Hover over bar for details
          </p>
        </div>
      </div>

      {/* Detail table below chart */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-semibold text-gray-500">
                {reportType === 'monthly' ? 'Date' : 'Line'}
              </th>
              {reportType !== 'monthly' && (
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Process</th>
              )}
              <th className="text-right px-3 py-2 font-semibold text-gray-500">Target</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500">Actual</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-500">Ach%</th>
              {showCost && (
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Gain/Loss</th>
              )}
              <th className="text-center px-3 py-2 font-semibold text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {chartData.map((item: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-800">{item.label}</td>
                {reportType !== 'monthly' && (
                  <td className="px-3 py-2 text-gray-500">{item.process}</td>
                )}
                <td className="px-3 py-2 text-right text-gray-600">{fmt(item.target)}</td>
                <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(item.actual)}</td>
                <td className={clsx("px-3 py-2 text-right font-bold",
                  item.achievement >= 100 ? "text-green-600" : "text-red-600")}>
                  {fmt(item.achievement, 1)}%
                </td>
                {showCost && (
                  <td className={clsx("px-3 py-2 text-right font-bold",
                    item.gainLoss >= 0 ? "text-green-600" : "text-red-600")}>
                    {item.gainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(item.gainLoss))}
                  </td>
                )}
                <td className="px-3 py-2 text-center">
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold",
                    item.status === 'PROFIT' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
