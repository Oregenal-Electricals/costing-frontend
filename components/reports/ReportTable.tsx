"use client";

import { clsx } from "clsx";

interface Props {
  data: any[];
  loading: boolean;
}

function fmt(n: number | string, d = 2) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function ReportTable({ data, loading }: Props) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="text-center py-16 text-gray-400 text-sm">No data found for selected filters</div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Date", "Shift", "Slot", "Process", "Line", "Product", "Customer", "MP", "Target", "Actual", "Diff", "Ach%", "Labour Cost", "Gain/Loss", "Status", "By"].map((h) => (
              <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((entry: any, i: number) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                {new Date(entry.date).toLocaleDateString('en-IN')}
              </td>
              <td className="px-3 py-2.5 text-gray-600">{entry.shift?.name}</td>
              <td className="px-3 py-2.5 text-gray-500">{entry.timeSlot?.label}</td>
              <td className="px-3 py-2.5 text-gray-700">{entry.process?.name}</td>
              <td className="px-3 py-2.5 text-gray-700">{entry.line?.name}</td>
              <td className="px-3 py-2.5 text-gray-700">{entry.product?.name}</td>
              <td className="px-3 py-2.5 text-gray-700">{entry.customer?.name}</td>
              <td className="px-3 py-2.5 font-bold text-blue-700">{entry.manpowerCount}</td>
              <td className="px-3 py-2.5 text-gray-700">{fmt(entry.targetOutput, 0)}</td>
              <td className="px-3 py-2.5 font-bold text-gray-900">{fmt(entry.actualOutput, 0)}</td>
              <td className={clsx("px-3 py-2.5 font-medium", Number(entry.difference) >= 0 ? "text-green-600" : "text-red-600")}>
                {Number(entry.difference) >= 0 ? '+' : ''}{fmt(entry.difference, 0)}
              </td>
              <td className={clsx("px-3 py-2.5 font-bold", Number(entry.achievementPct) >= 100 ? "text-green-600" : "text-red-600")}>
                {fmt(entry.achievementPct)}%
              </td>
              <td className="px-3 py-2.5 text-gray-700">₹{fmt(entry.labourCost)}</td>
              <td className={clsx("px-3 py-2.5 font-bold", Number(entry.labourGainLoss) >= 0 ? "text-green-600" : "text-red-600")}>
                {Number(entry.labourGainLoss) >= 0 ? '+' : ''}₹{fmt(entry.labourGainLoss)}
              </td>
              <td className="px-3 py-2.5">
                <span className={clsx("px-2 py-0.5 rounded-full font-semibold text-xs",
                  entry.status === 'PROFIT' ? "bg-green-100 text-green-700" :
                  entry.status === 'LOSS' ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {entry.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-gray-500">{entry.createdBy?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
