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

  // Aggregate data by line (daily) or by date (monthly)
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (reportType === 'monthly') {
      // Group by date
      const map: Record<string, any> = {};
      for (const e of data) {
        const date = new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        if (!map[date]) {
          map[date] = { label: date, target: 0, actual: 0, gainLoss: 0, profit: 0, loss: 0 };
        }
        map[date].target   += Number(e.targetOutput || 0);
        map[date].actual   += Number(e.actualOutput || 0);
        map[date].gainLoss += Number(e.labourGainLoss || 0);
        if (e.status === 'PROFIT') map[date].profit++;
        else if (e.status === 'LOSS') map[date].loss++;
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

  const maxActual = Math.max(...chartData.map((d: any) => d.actual));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-gray-600">PROFIT / Above Target</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-xs text-gray-600">LOSS / Below Target</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-gray-300 bg-gray-100" />
          <span className="text-xs text-gray-600">Target</span>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-4">
        {chartData.map((item: any, i: number) => {
          const achPct = Math.min(item.achievement, 100);
          const isProfit = item.status === 'PROFIT';
          const barColor = isProfit ? 'bg-green-500' : 'bg-red-500';
          const textColor = isProfit ? 'text-green-600' : 'text-red-600';

          return (
            <div key={i} className="space-y-1">
              {/* Label row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate max-w-48">{item.label}</span>
                  {item.process && reportType !== 'monthly' && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.process}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs flex-shrink-0 ml-4">
                  <span className="text-gray-500">T: {fmt(item.target)}</span>
                  <span className="font-bold text-gray-900">A: {fmt(item.actual)}</span>
                  <span className={clsx("font-bold w-14 text-right", achPct >= 100 ? "text-green-600" : "text-red-600")}>
                    {fmt(item.achievement, 1)}%
                  </span>
                  {showCost && (
                    <span className={clsx("font-bold w-24 text-right", textColor)}>
                      {isProfit ? '+' : ''}₹{fmt(Math.abs(item.gainLoss))}
                    </span>
                  )}
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold",
                    isProfit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>{item.status}</span>
                </div>
              </div>

              {/* Bar */}
              <div className="relative h-7 bg-gray-100 rounded-lg overflow-hidden">
                {/* Target line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10" style={{ left: '100%', transform: 'translateX(-1px)' }} />
                {/* Actual bar */}
                <div
                  className={clsx("h-full rounded-lg transition-all duration-500 flex items-center px-2", barColor)}
                  style={{ width: `${maxActual > 0 ? (item.actual / maxActual) * 100 : 0}%`, minWidth: item.actual > 0 ? '2%' : '0' }}
                >
                  {item.actual > 0 && (item.actual / maxActual) > 0.15 && (
                    <span className="text-white text-xs font-bold">{fmt(item.actual)}</span>
                  )}
                </div>
                {/* Achievement % overlay */}
                <div
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-blue-400 z-10"
                  style={{ left: `${achPct}%` }}
                  title={`Target: ${fmt(item.target)}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Target", value: fmt(chartData.reduce((s: number, d: any) => s + d.target, 0)) },
          { label: "Total Actual", value: fmt(chartData.reduce((s: number, d: any) => s + d.actual, 0)) },
          { label: "Avg Achievement", value: `${fmt(chartData.reduce((s: number, d: any) => s + d.achievement, 0) / chartData.length, 1)}%`,
            color: chartData.reduce((s: number, d: any) => s + d.achievement, 0) / chartData.length >= 100 ? "text-green-600" : "text-red-600" },
          ...(showCost ? [{
            label: "Net Gain/Loss",
            value: `${chartData.reduce((s: number, d: any) => s + d.gainLoss, 0) >= 0 ? '+' : ''}₹${fmt(Math.abs(chartData.reduce((s: number, d: any) => s + d.gainLoss, 0)))}`,
            color: chartData.reduce((s: number, d: any) => s + d.gainLoss, 0) >= 0 ? "text-green-600" : "text-red-600",
          }] : []),
        ].map((card: any) => (
          <div key={card.label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={clsx("text-lg font-bold mt-0.5", card.color || "text-gray-900")}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
