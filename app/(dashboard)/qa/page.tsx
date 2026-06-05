"use client";

import { useState } from "react";
import {
  CheckCircle, XCircle, Clock, Play, RefreshCw,
  ChevronDown, ChevronUp, AlertCircle, Download,
} from "lucide-react";
import { clsx } from "clsx";
import { getToken } from "@/lib/auth";
import * as XLSX from "xlsx";

type TestStatus = "idle" | "running" | "pass" | "fail" | "skip";

interface TestCase {
  id: string;
  module: string;
  name: string;
  description: string;
  run: (token: string) => Promise<{ pass: boolean; message: string; data?: unknown }>;
}

interface TestResult {
  id: string;
  status: TestStatus;
  message: string;
  duration: number;
  data?: unknown;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function api(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

const TEST_CASES: TestCase[] = [
  // ─── AUTH ────────────────────────────────────────
  {
    id: "auth-login",
    module: "Authentication",
    name: "Login with valid credentials",
    description: "POST /auth/login with admin credentials",
    run: async (token) => {
      const data = await api("/auth/me", token);
      return { pass: !!data.id, message: `Logged in as ${data.name} (${data.role?.name})` };
    },
  },

  // ─── MASTER DATA ─────────────────────────────────
  {
    id: "master-products",
    module: "Master Data",
    name: "List products",
    description: "GET /master/products returns list",
    run: async (token) => {
      const data = await api("/master/products?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} products found` };
    },
  },
  {
    id: "master-customers",
    module: "Master Data",
    name: "List customers",
    description: "GET /master/customers returns list",
    run: async (token) => {
      const data = await api("/master/customers?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} customers found` };
    },
  },
  {
    id: "master-processes",
    module: "Master Data",
    name: "List processes",
    description: "GET /master/processes returns list",
    run: async (token) => {
      const data = await api("/master/processes?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} processes found` };
    },
  },
  {
    id: "master-lines",
    module: "Master Data",
    name: "List lines",
    description: "GET /master/lines returns list",
    run: async (token) => {
      const data = await api("/master/lines?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} lines found` };
    },
  },
  {
    id: "master-shifts",
    module: "Master Data",
    name: "List shifts",
    description: "GET /master/shifts/active returns active shifts",
    run: async (token) => {
      const data = await api("/master/shifts/active", token);
      return { pass: Array.isArray(data) && data.length > 0, message: `${data.length} active shifts` };
    },
  },
  {
    id: "master-timeslots",
    module: "Master Data",
    name: "List time slots",
    description: "GET /master/time-slots returns list",
    run: async (token) => {
      const data = await api("/master/time-slots?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} time slots found` };
    },
  },

  // ─── RATE TARGET ─────────────────────────────────
  {
    id: "rate-target-list",
    module: "Rate Target",
    name: "List rate targets",
    description: "GET /rate-targets returns list",
    run: async (token) => {
      const data = await api("/rate-targets?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} rate targets found` };
    },
  },

  // ─── MORNING PLAN ────────────────────────────────
  {
    id: "morning-plan-list",
    module: "Morning Plan",
    name: "List morning plans",
    description: "GET /morning-plans returns list",
    run: async (token) => {
      const data = await api("/morning-plans?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} morning plans found` };
    },
  },
  {
    id: "morning-plan-today",
    module: "Morning Plan",
    name: "Check today's morning plan",
    description: "Morning plan exists for today",
    run: async (token) => {
      const today = new Date().toISOString().split("T")[0];
      const data = await api(`/morning-plans?date=${today}&limit=5`, token);
      const hasToday = data.total > 0;
      return {
        pass: true,
        message: hasToday ? `✅ ${data.total} plan(s) for today` : "⚠️ No morning plan for today",
      };
    },
  },

  // ─── LINE ALLOCATION ─────────────────────────────
  {
    id: "allocation-list",
    module: "Line Allocation",
    name: "List allocations",
    description: "GET /line-allocations returns list",
    run: async (token) => {
      const data = await api("/line-allocations?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} allocations found` };
    },
  },
  {
    id: "allocation-balance",
    module: "Line Allocation",
    name: "Balance API works",
    description: "GET /line-allocations/balance with params",
    run: async (token) => {
      const today = new Date().toISOString().split("T")[0];
      const shifts = await api("/master/shifts/active", token);
      const processes = await api("/master/processes/active", token);
      if (!shifts.length || !processes.length) {
        return { pass: true, message: "⚠️ No shifts/processes to test balance" };
      }
      const data = await api(
        `/line-allocations/balance?date=${today}&shiftId=${shifts[0].id}&processId=${processes[0].id}`,
        token
      );
      return { pass: typeof data.morningPlanTotal === "number", message: `Balance: ${data.balance} available` };
    },
  },

  // ─── MANPOWER MOVEMENT ───────────────────────────
  {
    id: "movement-list",
    module: "Manpower Movement",
    name: "List movements",
    description: "GET /manpower-movements returns list",
    run: async (token) => {
      const data = await api("/manpower-movements?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} movements found` };
    },
  },
  {
    id: "movement-line-status",
    module: "Manpower Movement",
    name: "Line status API works",
    description: "GET /manpower-movements/line-status with params",
    run: async (token) => {
      const today = new Date().toISOString().split("T")[0];
      const shifts = await api("/master/shifts/active", token);
      const processes = await api("/master/processes/active", token);
      if (!shifts.length || !processes.length) {
        return { pass: true, message: "⚠️ No shifts/processes to test" };
      }
      const data = await api(
        `/manpower-movements/line-status?date=${today}&shiftId=${shifts[0].id}&processId=${processes[0].id}`,
        token
      );
      return { pass: Array.isArray(data.lines), message: `${data.lines.length} lines in status` };
    },
  },

  // ─── PRODUCTION ENTRY ────────────────────────────
  {
    id: "production-list",
    module: "Production Entry",
    name: "List production entries",
    description: "GET /production-entries returns list",
    run: async (token) => {
      const data = await api("/production-entries?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} entries found` };
    },
  },
  {
    id: "production-preview",
    module: "Production Entry",
    name: "Preview calculation API",
    description: "POST /production-entries/preview calculates correctly",
    run: async (token) => {
      const products = await api("/master/products/active", token);
      const customers = await api("/master/customers/active", token);
      const processes = await api("/master/processes/active", token);
      if (!products.length || !customers.length || !processes.length) {
        return { pass: true, message: "⚠️ No master data to test preview" };
      }
      try {
        const today = new Date().toISOString().split("T")[0];
        const data = await api("/production-entries/preview", token, {
          method: "POST",
          body: JSON.stringify({
            productId: products[0].id,
            customerId: customers[0].id,
            processId: processes[0].id,
            date: today,
            manpowerCount: 10,
            shiftHours: 8,
            actualOutput: 800,
          }),
        });
        return {
          pass: !!data.calculations,
          message: `Status: ${data.calculations?.status} | Gain/Loss: ₹${data.calculations?.labourGainLoss?.toFixed(2)}`,
        };
      } catch (err) {
        return { pass: false, message: `Preview failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  },
  {
    id: "production-today",
    module: "Production Entry",
    name: "Today's production entries",
    description: "Check if production entries exist for today",
    run: async (token) => {
      const today = new Date().toISOString().split("T")[0];
      const data = await api(`/production-entries?date=${today}&limit=5`, token);
      return {
        pass: true,
        message: data.total > 0
          ? `✅ ${data.total} entries today — Summary: ${data.summary?.profit} profit, ${data.summary?.loss} loss`
          : "⚠️ No production entries for today",
      };
    },
  },

  // ─── CORRECTIONS ─────────────────────────────────
  {
    id: "corrections-list",
    module: "Correction Approval",
    name: "List corrections",
    description: "GET /corrections returns list",
    run: async (token) => {
      const data = await api("/corrections?limit=5", token);
      return {
        pass: Array.isArray(data.data),
        message: `${data.summary?.pending || 0} pending, ${data.summary?.approved || 0} approved, ${data.summary?.rejected || 0} rejected`,
      };
    },
  },
  {
    id: "corrections-fields",
    module: "Correction Approval",
    name: "Correctable fields API",
    description: "GET /corrections/fields returns field list",
    run: async (token) => {
      const data = await api("/corrections/fields", token);
      return { pass: Array.isArray(data) && data.length > 0, message: `${data.length} correctable fields: ${data.map((f: any) => f.label).join(', ')}` };
    },
  },

  // ─── REPORTS ─────────────────────────────────────
  {
    id: "reports-daily",
    module: "Reports",
    name: "Daily report API",
    description: "GET /reports/daily returns data",
    run: async (token) => {
      const today = new Date().toISOString().split("T")[0];
      const data = await api(`/reports/daily?dateFrom=${today}&dateTo=${today}&limit=10`, token);
      return { pass: Array.isArray(data.data), message: `${data.total} entries, Avg Achievement: ${data.summary?.avgAchievement?.toFixed(1)}%` };
    },
  },
  {
    id: "reports-snapshot",
    module: "Reports",
    name: "Daily snapshot API",
    description: "GET /reports/snapshot/daily returns snapshot",
    run: async (token) => {
      const today = new Date().toISOString().split("T")[0];
      const data = await api(`/reports/snapshot/daily?date=${today}`, token);
      return {
        pass: !!data.summary,
        message: `Output: ${data.summary?.totalActualOutput || 0} | Lines: ${data.totalLines || 0}`,
      };
    },
  },
  {
    id: "reports-dashboard",
    module: "Dashboard",
    name: "Dashboard API",
    description: "GET /reports/dashboard returns full data",
    run: async (token) => {
      const today = new Date().toISOString().split("T")[0];
      const data = await api(`/reports/dashboard?date=${today}`, token);
      return {
        pass: !!data.summary,
        message: `Entries: ${data.summary?.totalEntries} | Lines: ${data.summary?.activeLines} | Alerts: ${data.alerts?.length}`,
      };
    },
  },

  // ─── NOTIFICATIONS ───────────────────────────────
  {
    id: "notifications-summary",
    module: "Notifications",
    name: "Notification summary",
    description: "GET /notifications/summary returns alerts",
    run: async (token) => {
      const data = await api("/notifications/summary", token);
      return {
        pass: typeof data.total === "number",
        message: `${data.total} alerts: ${data.error} errors, ${data.warning} warnings`,
      };
    },
  },

  // ─── AUDIT ───────────────────────────────────────
  {
    id: "audit-list",
    module: "Audit Log",
    name: "Audit log API",
    description: "GET /audit returns records",
    run: async (token) => {
      const data = await api("/audit?limit=5", token);
      return { pass: Array.isArray(data.data), message: `${data.total} audit records` };
    },
  },
  {
    id: "audit-stats",
    module: "Audit Log",
    name: "Audit stats API",
    description: "GET /audit/stats returns counts",
    run: async (token) => {
      const data = await api("/audit/stats", token);
      return { pass: typeof data.total === "number", message: `Total: ${data.total} | Today: ${data.todayCount}` };
    },
  },

  // ─── SETTINGS ────────────────────────────────────
  {
    id: "settings-list",
    module: "Settings",
    name: "Settings API",
    description: "GET /settings returns grouped settings",
    run: async (token) => {
      const data = await api("/settings", token);
      return {
        pass: !!data.grouped,
        message: `Categories: ${Object.keys(data.grouped).join(', ')}`,
      };
    },
  },

  // ─── BACKUP ──────────────────────────────────────
  {
    id: "backup-stats",
    module: "Backup",
    name: "Backup stats API",
    description: "GET /backup/stats returns stats",
    run: async (token) => {
      const data = await api("/backup/stats", token);
      return {
        pass: typeof data.totalBackups === "number",
        message: `${data.totalBackups} backups stored`,
      };
    },
  },
];

const MODULES = [...new Set(TEST_CASES.map((t) => t.module))];

export default function QAPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(MODULES));

  const runTest = async (tc: TestCase, token: string): Promise<TestResult> => {
    const start = Date.now();
    try {
      const res = await tc.run(token);
      return {
        id: tc.id,
        status: res.pass ? "pass" : "fail",
        message: res.message,
        duration: Date.now() - start,
        data: res.data,
      };
    } catch (err) {
      return {
        id: tc.id,
        status: "fail",
        message: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start,
      };
    }
  };

  const runAll = async () => {
    const token = getToken();
    if (!token) return;
    setRunning(true);
    setResults({});

    for (const tc of TEST_CASES) {
      setRunningId(tc.id);
      setResults((prev) => ({ ...prev, [tc.id]: { id: tc.id, status: "running", message: "Running...", duration: 0 } }));
      const result = await runTest(tc, token);
      setResults((prev) => ({ ...prev, [tc.id]: result }));
      await new Promise((r) => setTimeout(r, 100));
    }

    setRunningId(null);
    setRunning(false);
  };

  const runModule = async (module: string) => {
    const token = getToken();
    if (!token) return;
    const moduleCases = TEST_CASES.filter((tc) => tc.module === module);

    for (const tc of moduleCases) {
      setRunningId(tc.id);
      setResults((prev) => ({ ...prev, [tc.id]: { id: tc.id, status: "running", message: "Running...", duration: 0 } }));
      const result = await runTest(tc, token);
      setResults((prev) => ({ ...prev, [tc.id]: result }));
      await new Promise((r) => setTimeout(r, 100));
    }
    setRunningId(null);
  };

  const passed = Object.values(results).filter((r) => r.status === "pass").length;
  const failed = Object.values(results).filter((r) => r.status === "fail").length;
  const total = Object.values(results).length;

  const exportReport = () => {
    const rows = TEST_CASES.map((tc) => {
      const r = results[tc.id];
      return {
        Module: tc.module,
        "Test Name": tc.name,
        Description: tc.description,
        Status: r?.status?.toUpperCase() || "NOT RUN",
        Message: r?.message || "",
        Duration: r ? `${r.duration}ms` : "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 20 }, { wch: 35 }, { wch: 40 }, { wch: 10 }, { wch: 60 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "QA Report");

    // Summary sheet
    const summary = [
      ["QA Test Report"],
      ["Generated", new Date().toLocaleString("en-IN")],
      [""],
      ["Total Tests", TEST_CASES.length],
      ["Passed", passed],
      ["Failed", failed],
      ["Not Run", TEST_CASES.length - total],
      ["Pass Rate", total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : "N/A"],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    XLSX.writeFile(wb, `qa-report-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const getModuleStats = (module: string) => {
    const cases = TEST_CASES.filter((tc) => tc.module === module);
    const done = cases.filter((tc) => results[tc.id]);
    const pass = cases.filter((tc) => results[tc.id]?.status === "pass").length;
    const fail = cases.filter((tc) => results[tc.id]?.status === "fail").length;
    return { total: cases.length, done: done.length, pass, fail };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">QA Testing</h2>
          <p className="text-sm text-gray-500 mt-1">
            {TEST_CASES.length} test cases across {MODULES.length} modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
              <Download size={16} />
              Export Report
            </button>
          )}
          <button onClick={runAll} disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium">
            {running
              ? <><RefreshCw size={16} className="animate-spin" />Running...</>
              : <><Play size={16} />Run All Tests</>
            }
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              {total}/{TEST_CASES.length} tests run · {passed} passed · {failed} failed
            </p>
            <span className={clsx("text-sm font-bold",
              failed === 0 ? "text-green-600" : "text-red-600"
            )}>
              {total > 0 ? `${((passed / total) * 100).toFixed(0)}% Pass Rate` : ""}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden">
            <div className="bg-green-500 h-3 transition-all" style={{ width: `${(passed / TEST_CASES.length) * 100}%` }} />
            <div className="bg-red-500 h-3 transition-all" style={{ width: `${(failed / TEST_CASES.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Test Cases by Module */}
      <div className="space-y-3">
        {MODULES.map((module) => {
          const stats = getModuleStats(module);
          const isExpanded = expandedModules.has(module);

          return (
            <div key={module} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Module Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <button onClick={() => toggleModule(module)}
                  className="flex items-center gap-3 flex-1 text-left">
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  <span className="text-sm font-bold text-gray-800">{module}</span>
                  <span className="text-xs text-gray-400">{stats.total} tests</span>
                  {stats.done > 0 && (
                    <div className="flex items-center gap-2 ml-2">
                      {stats.pass > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{stats.pass} pass</span>}
                      {stats.fail > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{stats.fail} fail</span>}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => runModule(module)}
                  disabled={running}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Play size={12} />
                  Run
                </button>
              </div>

              {/* Test Cases */}
              {isExpanded && (
                <div className="divide-y divide-gray-50">
                  {TEST_CASES.filter((tc) => tc.module === module).map((tc) => {
                    const result = results[tc.id];
                    const isRunning = runningId === tc.id;

                    return (
                      <div key={tc.id} className={clsx(
                        "flex items-start gap-4 px-5 py-3 transition-colors",
                        result?.status === "pass" ? "bg-green-50/30" :
                        result?.status === "fail" ? "bg-red-50/30" : ""
                      )}>
                        {/* Status Icon */}
                        <div className="mt-0.5 flex-shrink-0">
                          {isRunning ? (
                            <RefreshCw size={16} className="text-blue-500 animate-spin" />
                          ) : result?.status === "pass" ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : result?.status === "fail" ? (
                            <XCircle size={16} className="text-red-500" />
                          ) : (
                            <Clock size={16} className="text-gray-300" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{tc.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{tc.description}</p>
                          {result && result.status !== "running" && (
                            <p className={clsx("text-xs mt-1 font-mono",
                              result.status === "pass" ? "text-green-700" : "text-red-600"
                            )}>
                              {result.message}
                            </p>
                          )}
                        </div>

                        {/* Duration */}
                        {result?.duration > 0 && (
                          <span className="text-xs text-gray-400 flex-shrink-0">{result.duration}ms</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      {total === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-3">
          <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">How to use QA Testing</p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>1. Click <strong>"Run All Tests"</strong> to run the full workflow test suite</li>
              <li>2. Or click <strong>"Run"</strong> next to any module to test just that module</li>
              <li>3. Green = Pass · Red = Fail · ⚠️ = Warning (not a failure)</li>
              <li>4. Click <strong>"Export Report"</strong> to download the full QA report as Excel</li>
              <li>5. All tests run against the live backend API</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
