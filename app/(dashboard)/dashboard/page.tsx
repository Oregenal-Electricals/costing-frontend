"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Factory, Users, TrendingUp, TrendingDown, AlertCircle,
  CheckCircle, Clock, ArrowRight, Activity, Target,
  BarChart2, RefreshCw, Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { getToken, getUser } from "@/lib/auth";
import { apiGetDashboard } from "@/lib/api";
import Link from "next/link";

function fmt(n: number | string, d = 0) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtCurrency(n: number) {
  return `₹${fmt(Math.abs(n))}`;
}

function StatusChip({ status, value }: { status: string; value?: number }) {
  const isProfit = status === 'PROFIT' || (value !== undefined && value > 0);
  const isLoss = status === 'LOSS' || (value !== undefined && value < 0);
  return (
    <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
      isProfit ? "bg-green-100 text-green-700" :
      isLoss ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
    )}>
      {status || (isProfit ? 'PROFIT' : isLoss ? 'LOSS' : 'NEUTRAL')}
    </span>
  );
}

function AchievementBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={clsx("h-1.5 rounded-full transition-all",
          pct >= 100 ? "bg-green-500" : pct >= 80 ? "bg-yellow-500" : "bg-red-500"
        )} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={clsx("text-xs font-bold w-12 text-right",
        pct >= 100 ? "text-green-600" : pct >= 80 ? "text-yellow-600" : "text-red-600"
      )}>{fmt(pct, 1)}%</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetDashboard(token, date);
      setData(res);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const s = data?.summary;
  const isProfit = s?.totalGainLoss >= 0;

  const QUICK_ACTIONS = [
    { label: "Morning Plan", href: "/morning-plan", icon: Clock, color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "Line Allocation", href: "/line-allocation", icon: Users, color: "bg-purple-50 text-purple-700 border-purple-200" },
    { label: "MP Movement", href: "/manpower-movement", icon: Activity, color: "bg-orange-50 text-orange-700 border-orange-200" },
    { label: "Production Entry", href: "/production-entry", icon: Factory, color: "bg-green-50 text-green-700 border-green-200" },
    { label: "Corrections", href: "/corrections", icon: CheckCircle, color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    { label: "Reports", href: "/reports", icon: BarChart2, color: "bg-red-50 text-red-700 border-red-200" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Factory Control Room · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN')}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={load}
            className={clsx("p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", loading && "animate-spin")}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading factory data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── SECTION 1: KPI CARDS ─────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Today's Output",
                value: fmt(s?.totalActualOutput || 0),
                sub: `Target: ${fmt(s?.totalTargetOutput || 0)}`,
                icon: <Factory size={22} />,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Achievement",
                value: `${fmt(s?.avgAchievement || 0, 1)}%`,
                sub: s?.avgAchievement >= 100 ? "Above target 🎯" : "Below target",
                icon: <Target size={22} />,
                color: s?.avgAchievement >= 100 ? "text-green-600" : "text-red-600",
                bg: s?.avgAchievement >= 100 ? "bg-green-50" : "bg-red-50",
              },
              {
                label: "Labour Gain/Loss",
                value: `${isProfit ? '+' : '-'}${fmtCurrency(s?.totalGainLoss || 0)}`,
                sub: isProfit ? "PROFIT" : "LOSS",
                icon: isProfit ? <TrendingUp size={22} /> : <TrendingDown size={22} />,
                color: isProfit ? "text-green-600" : "text-red-600",
                bg: isProfit ? "bg-green-50" : "bg-red-50",
              },
              {
                label: "Total Manpower",
                value: fmt(s?.totalManpower || 0),
                sub: `${s?.activeLines || 0} active lines`,
                icon: <Users size={22} />,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                label: "Total Entries",
                value: fmt(s?.totalEntries || 0),
                sub: `${s?.profit || 0} profit · ${s?.loss || 0} loss`,
                icon: <BarChart2 size={22} />,
                color: "text-gray-700",
                bg: "bg-gray-50",
              },
              {
                label: "Pending Corrections",
                value: fmt(s?.pendingCorrections || 0),
                sub: s?.pendingCorrections > 0 ? "Action required" : "All clear",
                icon: <AlertCircle size={22} />,
                color: s?.pendingCorrections > 0 ? "text-yellow-600" : "text-green-600",
                bg: s?.pendingCorrections > 0 ? "bg-yellow-50" : "bg-green-50",
              },
              {
                label: "Morning Plans",
                value: fmt(data?.morningPlanCount || 0),
                sub: data?.morningPlanCount > 0 ? "Plans created" : "No plans today",
                icon: <Clock size={22} />,
                color: data?.morningPlanCount > 0 ? "text-blue-600" : "text-orange-600",
                bg: data?.morningPlanCount > 0 ? "bg-blue-50" : "bg-orange-50",
              },
              {
                label: "Labour Cost",
                value: `₹${fmt(s?.totalLabourCost || 0)}`,
                sub: "Today's total",
                icon: <Zap size={22} />,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                    <p className={clsx("text-2xl font-black mt-1", card.color)}>{card.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                  </div>
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", card.bg, card.color)}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── SECTION 2: ALERTS ────────────────────────── */}
          {data?.alerts?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-500" />
                Alert Center
              </h3>
              <div className="space-y-2">
                {data.alerts.map((alert: any, i: number) => (
                  <div key={i} className={clsx("flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm",
                    alert.severity === 'error' ? "bg-red-50 text-red-700 border border-red-100" :
                    alert.severity === 'warning' ? "bg-yellow-50 text-yellow-700 border border-yellow-100" :
                    "bg-blue-50 text-blue-700 border border-blue-100"
                  )}>
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── SECTION 3: PROCESS STATUS ────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Process Status</h3>
              {!data?.processSummary?.length ? (
                <p className="text-sm text-gray-400 text-center py-6">No data for today</p>
              ) : (
                <div className="space-y-3">
                  {data.processSummary.map((p: any) => (
                    <div key={p.process.id} className={clsx("rounded-xl p-4 border",
                      p.summary.totalGainLoss > 0 ? "border-green-200 bg-green-50" :
                      p.summary.totalGainLoss < 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-900 text-sm">{p.process.name}</p>
                        <StatusChip status="" value={p.summary.totalGainLoss} />
                      </div>
                      <AchievementBar pct={p.summary.avgAchievement} />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>T: {fmt(p.summary.totalTargetOutput)}</span>
                        <span>A: {fmt(p.summary.totalActualOutput)}</span>
                        <span className={p.summary.totalGainLoss >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                          {p.summary.totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(p.summary.totalGainLoss))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── SECTION 4: LINE PERFORMANCE ──────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Line Performance</h3>
              {!data?.lineSummary?.length ? (
                <p className="text-sm text-gray-400 text-center py-6">No data for today</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium mb-1">Top Lines</p>
                  {data.topLines?.map((l: any) => (
                    <div key={l.line.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">{l.line.name}</span>
                        <span className={clsx("text-xs font-bold",
                          l.summary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {l.summary.totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(l.summary.totalGainLoss))}
                        </span>
                      </div>
                      <AchievementBar pct={l.summary.avgAchievement} />
                    </div>
                  ))}
                  {data.bottomLines?.length > 0 && data.bottomLines[0]?.line?.id !== data.topLines?.[data.topLines.length - 1]?.line?.id && (
                    <>
                      <p className="text-xs text-gray-400 font-medium mt-3 mb-1">Bottom Lines</p>
                      {data.bottomLines?.map((l: any) => (
                        <div key={`b-${l.line.id}`} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">{l.line.name}</span>
                            <span className={clsx("text-xs font-bold",
                              l.summary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {l.summary.totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(l.summary.totalGainLoss))}
                            </span>
                          </div>
                          <AchievementBar pct={l.summary.avgAchievement} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ─── SECTION 5: QUICK ACTIONS ─────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link key={action.href} href={action.href}
                    className={clsx("flex flex-col items-center gap-2 p-3 rounded-xl border text-center hover:shadow-sm transition-all", action.color)}>
                    <action.icon size={20} />
                    <span className="text-xs font-semibold leading-tight">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ─── SECTION 6: PRODUCT PERFORMANCE ──────── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">Top Products</h3>
              </div>
              {!data?.productSummary?.length ? (
                <p className="text-sm text-gray-400 text-center py-8">No data for today</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Product</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Target</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Actual</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Ach%</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">G/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.productSummary.map((p: any) => (
                      <tr key={p.product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{p.product.name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{fmt(p.summary.totalTargetOutput)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmt(p.summary.totalActualOutput)}</td>
                        <td className={clsx("px-4 py-2.5 text-right font-bold",
                          p.summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600")}>
                          {fmt(p.summary.avgAchievement, 1)}%
                        </td>
                        <td className={clsx("px-4 py-2.5 text-right font-bold",
                          p.summary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600")}>
                          {p.summary.totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(p.summary.totalGainLoss))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ─── SECTION 7: CUSTOMER PERFORMANCE ─────── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">Customer Performance</h3>
              </div>
              {!data?.customerSummary?.length ? (
                <p className="text-sm text-gray-400 text-center py-8">No data for today</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Customer</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Target</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Actual</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Ach%</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">G/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.customerSummary.map((c: any) => (
                      <tr key={c.customer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{c.customer.name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{fmt(c.summary.totalTargetOutput)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmt(c.summary.totalActualOutput)}</td>
                        <td className={clsx("px-4 py-2.5 text-right font-bold",
                          c.summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600")}>
                          {fmt(c.summary.avgAchievement, 1)}%
                        </td>
                        <td className={clsx("px-4 py-2.5 text-right font-bold",
                          c.summary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600")}>
                          {c.summary.totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(c.summary.totalGainLoss))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ─── SECTION 8: TODAY'S SNAPSHOT ──────────────── */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Costing Tool — Manufacturing ERP</p>
                <h3 className="text-lg font-black mt-0.5">Today's Factory Summary</h3>
              </div>
              <div className="text-right">
                <p className="text-slate-300 text-sm font-bold">
                  {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <Link href="/reports/snapshots"
                  className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1 justify-end mt-1">
                  Full Snapshot <ArrowRight size={10} />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Production", value: fmt(s?.totalActualOutput || 0), color: "text-blue-400" },
                { label: "Achievement", value: `${fmt(s?.avgAchievement || 0, 1)}%`, color: s?.avgAchievement >= 100 ? "text-green-400" : "text-red-400" },
                { label: "Manpower", value: fmt(s?.totalManpower || 0), color: "text-purple-400" },
                {
                  label: "Gain/Loss",
                  value: `${isProfit ? '+' : '-'}${fmtCurrency(s?.totalGainLoss || 0)}`,
                  color: isProfit ? "text-green-400" : "text-red-400"
                },
              ].map((item) => (
                <div key={item.label} className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs">{item.label}</p>
                  <p className={clsx("text-xl font-black mt-1", item.color)}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className={clsx("text-lg font-black px-4 py-1.5 rounded-xl",
                isProfit ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              )}>
                {isProfit ? '✅ PROFIT' : '❌ LOSS'}
              </span>
              <span className="text-slate-400 text-xs">
                {s?.activeLines || 0} active lines · {s?.totalEntries || 0} entries
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
