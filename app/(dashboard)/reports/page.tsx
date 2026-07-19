"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, FileSpreadsheet, Camera } from "lucide-react";
import { clsx } from "clsx";
import {
  MasterItem, ShiftItem, ReportSummary,
  apiGetDailyReport, apiGetLineReport, apiGetProductReport,
  apiGetProcessReport, apiGetCustomerReport, apiGetMonthlyReport,
  apiGetUserReport, apiGetHourlyReport,
  apiGetActiveProcesses, apiGetActiveShifts, apiGetActiveLines,
  apiGetActiveProducts, apiGetActiveCustomers,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import { exportToExcel } from "@/lib/export";
import ReportFilters from "@/components/reports/ReportFilters";
import SummaryCards from "@/components/reports/SummaryCards";
import ReportTable from "@/components/reports/ReportTable";
import Link from "next/link";
import { AlertTriangle, Calculator, BarChart2 } from "lucide-react";
import ReportChart from "@/components/reports/ReportChart";

const REPORT_TYPES = [
  { key: 'daily', label: 'Daily' },
  { key: 'hourly', label: 'Hourly' },
  { key: 'line', label: 'Line-wise' },
  { key: 'product', label: 'Product-wise' },
  { key: 'process', label: 'Process-wise' },
  { key: 'customer', label: 'Customer-wise' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'user', label: 'User Entry' },
];

const defaultFilters = {
  dateFrom: new Date(new Date().setDate(1)).toISOString().split('T')[0],
  dateTo: new Date().toISOString().split('T')[0],
  shiftId: '', processId: '', lineId: '', productId: '', customerId: '',
};

const defaultSummary: ReportSummary = {
  totalEntries: 0, totalManpower: 0, totalTargetOutput: 0,
  totalActualOutput: 0, totalLabourCost: 0, totalGainLoss: 0,
  profit: 0, loss: 0, neutral: 0, avgAchievement: 0,
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState('daily');
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<ReportSummary>(defaultSummary);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [processes, setProcesses] = useState<MasterItem[]>([]);
  const [lines, setLines] = useState<MasterItem[]>([]);
  const [products, setProducts] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<MasterItem[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      apiGetActiveShifts(token), apiGetActiveProcesses(token),
      apiGetActiveLines(token), apiGetActiveProducts(token), apiGetActiveCustomers(token),
    ]).then(([sh, pr, ln, pd, cu]) => {
      setShifts(sh); setProcesses(pr); setLines(ln); setProducts(pd); setCustomers(cu);
    });
  }, []);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const q = {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        shiftId: filters.shiftId ? Number(filters.shiftId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
        lineId: filters.lineId ? Number(filters.lineId) : undefined,
        productId: filters.productId ? Number(filters.productId) : undefined,
        customerId: filters.customerId ? Number(filters.customerId) : undefined,
        limit: 500,
      };

      const apiMap: Record<string, Function> = {
        daily: apiGetDailyReport, hourly: apiGetHourlyReport,
        line: apiGetLineReport, product: apiGetProductReport,
        process: apiGetProcessReport, customer: apiGetCustomerReport,
        monthly: apiGetMonthlyReport, user: apiGetUserReport,
      };

      const res = await apiMap[reportType](token, q);

      // Grouped reports return data array differently
      if (Array.isArray(res.data) && res.data[0]?.entries) {
        // Flatten grouped data for table
        const flat: any[] = [];
        for (const group of res.data) {
          flat.push(...(group.entries || []));
        }
        setData(flat);
      } else {
        setData(res.data || []);
      }
      setSummary(res.summary || defaultSummary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [reportType, filters]);

  useEffect(() => { load(); }, [load]);

  const handleExcelExport = () => {
    exportToExcel(
      data,
      [
        { key: 'date', label: 'Date' },
        { key: 'manpowerCount', label: 'Manpower' },
        { key: 'targetOutput', label: 'Target Output' },
        { key: 'actualOutput', label: 'Actual Output' },
        { key: 'difference', label: 'Difference' },
        { key: 'achievementPct', label: 'Achievement %' },
        { key: 'labourCost', label: 'Labour Cost' },
        { key: 'labourGainLoss', label: 'Gain/Loss' },
        { key: 'status', label: 'Status' },
      ],
      {
        'Total Entries': summary.totalEntries,
        'Total Output': summary.totalActualOutput,
        'Total Labour Cost': summary.totalLabourCost,
        'Net Gain/Loss': summary.totalGainLoss,
        'Avg Achievement': `${summary.avgAchievement.toFixed(1)}%`,
      },
      `${reportType}-report-${filters.dateFrom}-${filters.dateTo}`,
      `${REPORT_TYPES.find((r) => r.key === reportType)?.label} Report`,
      `${filters.dateFrom} to ${filters.dateTo}`,
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Production performance analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExcelExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <Link href="/reports/per-piece"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Calculator size={16} />
            Per Piece Cost
          </Link>
          <Link href="/reports/spare-mp"
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
            <AlertTriangle size={16} />
            Spare MP
          </Link>
          <Link href="/reports/snapshots"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Camera size={16} />
            Snapshots
          </Link>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-1 flex-wrap bg-gray-100 p-1 rounded-xl w-fit">
        {REPORT_TYPES.map((rt) => (
          <button key={rt.key}
            onClick={() => setReportType(rt.key)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              reportType === rt.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {rt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <ReportFilters
        filters={filters} onChange={setFilters}
        shifts={shifts} processes={processes} lines={lines}
        products={products} customers={customers}
      />

      {/* Summary */}
      <SummaryCards summary={summary} />

      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'table', label: '📋 Table' },
          { key: 'chart', label: '📊 Chart' },
        ].map((v) => (
          <button key={v.key} onClick={() => setViewMode(v.key as 'table' | 'chart')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>{v.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            {REPORT_TYPES.find((r) => r.key === reportType)?.label} Report — {data.length} entries
          </h3>
        </div>
        {viewMode === 'table' ? (
          <ReportTable data={data} loading={loading} />
        ) : (
          <ReportChart data={data} reportType={reportType} loading={loading} />
        )}
      </div>
    </div>
  );
}
