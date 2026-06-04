import KpiCard from "@/components/ui/KpiCard";
import { Users, Factory, TrendingUp, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Good morning 👋</h2>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Manpower"
          value="248"
          subtitle="Active today"
          trend="up"
          trendValue="12 vs yesterday"
          icon={<Users size={20} />}
          color="blue"
        />
        <KpiCard
          title="Production Output"
          value="12,480"
          subtitle="Units this shift"
          trend="up"
          trendValue="8.2% above target"
          icon={<Factory size={20} />}
          color="green"
        />
        <KpiCard
          title="Efficiency"
          value="94.2%"
          subtitle="Line average"
          trend="down"
          trendValue="2.1% vs last shift"
          icon={<TrendingUp size={20} />}
          color="yellow"
        />
        <KpiCard
          title="Pending Corrections"
          value="3"
          subtitle="Awaiting approval"
          trend="neutral"
          trendValue="No change"
          icon={<AlertCircle size={20} />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Line-wise Production</h3>
          <div className="space-y-3">
            {["Line A", "Line B", "Line C", "Line D"].map((line, i) => (
              <div key={line} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-14">{line}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${[88, 72, 95, 61][i]}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-10 text-right">
                  {[88, 72, 95, 61][i]}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Shift Summary</h3>
          <div className="space-y-3">
            {[
              { shift: "Morning", mp: 124, output: "6,240", eff: "96%" },
              { shift: "Afternoon", mp: 98, output: "4,890", eff: "91%" },
              { shift: "Night", mp: 26, output: "1,350", eff: "88%" },
            ].map((row) => (
              <div key={row.shift} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{row.shift}</span>
                <span className="text-xs text-gray-400">{row.mp} workers</span>
                <span className="text-sm font-medium text-gray-800">{row.output}</span>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {row.eff}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
