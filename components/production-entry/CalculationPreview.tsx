"use client";

import { clsx } from "clsx";
import { ProductionPreview } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { canSeeCost, UserRole } from "@/lib/roles";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  preview: ProductionPreview;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number) {
  return `₹${fmt(n)}`;
}

export default function CalculationPreview({ preview }: Props) {
  const user = getUser();
  const showCost = canSeeCost((user?.role || 'VIEWER') as UserRole);
  const { rateTarget, calculations } = preview;
  const isProfit = calculations.status === 'PROFIT';
  const isLoss = calculations.status === 'LOSS';

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={clsx(
        "rounded-xl p-4 flex items-center justify-between",
        isProfit ? "bg-green-50 border border-green-200" :
        isLoss ? "bg-red-50 border border-red-200" :
        "bg-gray-50 border border-gray-200"
      )}>
        <div className="flex items-center gap-3">
          {isProfit ? <TrendingUp size={24} className="text-green-600" /> :
           isLoss ? <TrendingDown size={24} className="text-red-600" /> :
           <Minus size={24} className="text-gray-500" />}
          <div>
            <p className={clsx("text-lg font-bold",
              isProfit ? "text-green-700" : isLoss ? "text-red-700" : "text-gray-700"
            )}>
              {calculations.status}
            </p>
            <p className="text-sm text-gray-500">Labour Gain/Loss</p>
          </div>
        </div>
        <div className="text-right">
          <p className={clsx("text-2xl font-bold",
            isProfit ? "text-green-600" : isLoss ? "text-red-600" : "text-gray-600"
          )}>
            {fmtCurrency(Math.abs(calculations.labourGainLoss))}
          </p>
          <p className="text-xs text-gray-500">{isProfit ? 'Gain' : isLoss ? 'Loss' : 'Neutral'}</p>
        </div>
      </div>

      {/* Rate Target Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="text-xs font-semibold text-blue-600 mb-2">Rate Target (Effective from {new Date(rateTarget.effectiveFrom).toLocaleDateString('en-IN')})</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><p className="text-gray-500">Hourly Rate</p><p className="font-bold">{fmtCurrency(rateTarget.hourlyRate)}</p></div>
          <div><p className="text-gray-500">Target/Hour</p><p className="font-bold">{rateTarget.targetPerHour}</p></div>
          <div><p className="text-gray-500">Rate/Piece</p><p className="font-bold">{fmtCurrency(rateTarget.ratePerPiece)}</p></div>
        </div>
      </div>

      {/* Calculations Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Man Hours", value: fmt(calculations.totalManHours) },
          { label: "Labour Cost", value: fmtCurrency(calculations.labourCost) },
          { label: "Target Output", value: fmt(calculations.targetOutput, 0) },
          { label: "Actual Output", value: fmt(Number(preview.rateTarget.targetPerHour) > 0 ? calculations.targetOutput + calculations.difference : 0, 0) },
          { label: "Difference", value: fmt(calculations.difference, 0), color: calculations.difference >= 0 ? "text-green-600" : "text-red-600" },
          { label: "Achievement %", value: `${fmt(calculations.achievementPct)}%`, color: calculations.achievementPct >= 100 ? "text-green-600" : "text-red-600" },
          { label: "Target Cost/Unit", value: fmtCurrency(calculations.targetLabourCostPerUnit) },
          { label: "Actual Cost/Unit", value: fmtCurrency(calculations.actualLabourCostPerUnit) },
          { label: "Allowed Labour Cost", value: fmtCurrency(calculations.allowedLabourCost) },
          { label: "Labour Gain/Loss", value: fmtCurrency(calculations.labourGainLoss), color: isProfit ? "text-green-600" : isLoss ? "text-red-600" : "text-gray-600" },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className={clsx("text-sm font-bold mt-0.5", item.color || "text-gray-900")}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
