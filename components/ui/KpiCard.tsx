import { clsx } from "clsx";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  yellow: "bg-yellow-50 text-yellow-600",
};

export default function KpiCard({
  title, value, subtitle, trend, trendValue, icon, color = "blue",
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trendValue && (
            <div className={clsx(
              "inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-0.5 rounded-full",
              trend === "up" && "bg-green-50 text-green-600",
              trend === "down" && "bg-red-50 text-red-600",
              trend === "neutral" && "bg-gray-50 text-gray-600",
            )}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
            </div>
          )}
        </div>
        {icon && (
          <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
