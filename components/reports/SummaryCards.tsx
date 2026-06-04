import { clsx } from "clsx";
import { ReportSummary } from "@/lib/api";

interface Props { summary: ReportSummary; }

function fmt(n: number, d = 0) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function SummaryCards({ summary }: Props) {
  const isGain = summary.totalGainLoss >= 0;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
      {[
        { label: "Total Entries", value: fmt(summary.totalEntries), color: "text-blue-600" },
        { label: "Total Output", value: fmt(summary.totalActualOutput), color: "text-purple-600" },
        { label: "Avg Achievement", value: `${fmt(summary.avgAchievement, 1)}%`, color: summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600" },
        { label: "Total Labour Cost", value: `₹${fmt(summary.totalLabourCost)}`, color: "text-gray-700" },
        { label: "Net Gain/Loss", value: `${isGain ? '+' : ''}₹${fmt(Math.abs(summary.totalGainLoss))}`, color: isGain ? "text-green-600" : "text-red-600" },
        { label: "Profit Entries", value: fmt(summary.profit), color: "text-green-600" },
        { label: "Loss Entries", value: fmt(summary.loss), color: "text-red-600" },
        { label: "Neutral", value: fmt(summary.neutral), color: "text-gray-500" },
        { label: "Target Output", value: fmt(summary.totalTargetOutput), color: "text-gray-600" },
        { label: "Total Manpower", value: fmt(summary.totalManpower), color: "text-blue-500" },
      ].map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-3">
          <p className="text-xs text-gray-500">{card.label}</p>
          <p className={clsx("text-lg font-bold mt-0.5", card.color)}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
