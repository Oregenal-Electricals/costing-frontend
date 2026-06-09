"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Minus, Share2, MessageCircle, Copy, Check, X } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getToken, getUser } from "@/lib/auth";
import { canSeeCost, UserRole } from "@/lib/roles";
import { apiGetPerPieceCostReport, apiGetActiveShifts, apiGetActiveProcesses, MasterItem, ShiftItem } from "@/lib/api";
import * as XLSX from "xlsx";

function fmt(n: number, d = 2) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold",
      status === 'PROFIT' ? "bg-green-100 text-green-700" :
      status === 'LOSS' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
    )}>
      {status === 'PROFIT' ? <TrendingUp size={10} /> : status === 'LOSS' ? <TrendingDown size={10} /> : <Minus size={10} />}
      {status}
    </span>
  );
}

function ShareDialog({ dataUrl, title, onClose }: { dataUrl: string; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleWhatsApp = () => {
    const link = document.createElement('a');
    link.download = `${title}.png`;
    link.href = dataUrl;
    link.click();
    setTimeout(() => window.open(`https://wa.me/?text=${encodeURIComponent(title)}`, '_blank'), 500);
  };

  const handleCopy = async () => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const link = document.createElement('a');
      link.download = `${title}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Share Report</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-4">
          <img src={dataUrl} alt="preview" className="w-full rounded-xl border border-gray-200 max-h-48 object-contain bg-gray-50" />
        </div>
        <div className="px-4 pb-5 space-y-2">
          <p className="text-xs text-gray-500 text-center mb-3">Download image then share on WhatsApp</p>
          <button onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium">
            <MessageCircle size={20} />Download & Open WhatsApp
          </button>
          <button onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium border border-blue-200">
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button onClick={() => { const l = document.createElement('a'); l.download = `${title}.png`; l.href = dataUrl; l.click(); }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200">
            <Download size={20} />Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PerPieceCostPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [processes, setProcesses] = useState<MasterItem[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'card'>('table');
  const [shareDialog, setShareDialog] = useState<{ dataUrl: string; title: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    shiftId: '',
    processId: '',
  });
  const user = getUser();
  const showCost = canSeeCost((user?.role || 'VIEWER') as UserRole);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([apiGetActiveShifts(token), apiGetActiveProcesses(token)])
      .then(([sh, pr]) => { setShifts(sh); setProcesses(pr); });
  }, []);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetPerPieceCostReport(token, {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        shiftId: filters.shiftId ? Number(filters.shiftId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
      });
      setData(res.data || []);
      setSummary(res.summary);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleShare = async () => {
    const el = cardRef.current;
    if (!el) return;
    try {
      const domtoimage = (await import('dom-to-image-more')).default;
      const dataUrl = await domtoimage.toPng(el, { scale: 2, bgcolor: '#ffffff' });
      const title = `Per Piece Cost Report ${filters.dateFrom}`;
      setShareDialog({ dataUrl, title });
    } catch (err) {
      console.error(err);
      // Fallback: just download as PNG directly
      alert('Share not supported on this browser. Use Excel export instead.');
    }
  };

  const exportExcel = () => {
    const rows: any[] = [];
    for (const d of data) {
      for (const r of d.rows) {
        rows.push({
          'Date': d.date,
          'Process': d.process.name,
          'Shift': d.shift?.name,
          'Time Slot': r.timeSlot?.label,
          'Total MP (Plan)': d.totalProcessMP,
          'Allocated MP': d.allocatedMP,
          'Supporting MP': d.supportingMP,
          'Line': r.line.name,
          'Product': r.product.name,
          'Line MP': r.lineMP,
          'Line Share %': fmt(r.lineSharePct, 1) + '%',
          'Slot Cost': showCost ? fmt(r.slotCost) : '——',
          'Line Cost': showCost ? fmt(r.lineTrueCost) : '——',
          'Target Qty': fmt(r.targetOutput, 0),
          'Actual Qty': fmt(r.actualOutput, 0),
          'Achievement %': fmt(r.achievementPct, 1) + '%',
          'TARGET ₹/Piece': showCost ? fmt(r.targetCostPerPiece, 2) : '——',
          'ACTUAL ₹/Piece': showCost ? fmt(r.actualCostPerPiece, 2) : '——',
          'Diff ₹/Piece': showCost ? fmt(r.costDifference, 2) : '——',
          'Gain/Loss': showCost ? fmt(r.gainLoss) : '——',
          'Status': r.status,
        });
      }
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Per Piece Cost');
    XLSX.writeFile(wb, `per-piece-${filters.dateFrom}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {shareDialog && <ShareDialog dataUrl={shareDialog.dataUrl} title={shareDialog.title} onClose={() => setShareDialog(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Per Piece Cost Report</h2>
            <p className="text-sm text-gray-500">Target vs Actual cost per piece — hourly</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            <Download size={16} />Excel
          </button>
          <button onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Share2 size={16} />Share
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
          <input type="date" value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
          <input type="date" value={filters.dateTo}
            onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Shift</label>
          <select value={filters.shiftId} onChange={(e) => setFilters(f => ({ ...f, shiftId: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Shifts</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Process</label>
          <select value={filters.processId} onChange={(e) => setFilters(f => ({ ...f, processId: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Processes</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && showCost && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Process Cost", value: `₹${fmt(summary.totalProcessCost)}`, color: "text-blue-700" },
            { label: "Total Target Output", value: fmt(summary.totalTargetOutput, 0), color: "text-gray-700" },
            { label: "Total Actual Output", value: fmt(summary.totalActualOutput, 0), color: "text-gray-900" },
            { label: "Net Gain/Loss", value: `${summary.totalGainLoss >= 0 ? '+' : ''}₹${fmt(Math.abs(summary.totalGainLoss))}`,
              color: summary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={clsx("text-xl font-bold mt-1", c.color)}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ key: 'table', label: '📊 Detailed Table' }, { key: 'card', label: '📱 WhatsApp Card' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">No data found</div>
      ) : (
        <>
          {/* TABLE TAB */}
          {activeTab === 'table' && (
            <div className="space-y-5">
              {data.map((d, di) => (
                <div key={di} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {/* Process Header */}
                  <div className="bg-slate-800 px-6 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wider">{d.date} · {d.shift?.name}</p>
                        <h3 className="text-white font-black text-xl mt-0.5">{d.process.name}</h3>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-center">
                          <p className="text-slate-400 text-xs">Total MP</p>
                          <p className="text-white font-black text-2xl">{d.totalProcessMP}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400 text-xs">Allocated</p>
                          <p className="text-blue-400 font-black text-2xl">{d.allocatedMP}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400 text-xs">Supporting</p>
                          <p className="text-yellow-400 font-black text-2xl">{d.supportingMP}</p>
                        </div>
                        {showCost && (
                          <>
                            <div className="text-center">
                              <p className="text-slate-400 text-xs">Total Cost</p>
                              <p className="text-white font-bold text-lg">₹{fmt(d.totalLineCost, 0)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-slate-400 text-xs">Overall ₹/Target</p>
                              <p className="text-green-400 font-bold">₹{fmt(d.overallTargetCPP, 2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-slate-400 text-xs">Overall ₹/Actual</p>
                              <p className={clsx("font-bold", d.overallActualCPP <= d.overallTargetCPP ? "text-green-400" : "text-red-400")}>
                                ₹{fmt(d.overallActualCPP, 2)}
                              </p>
                            </div>
                          </>
                        )}
                        <StatusBadge status={d.overallStatus} />
                      </div>
                    </div>
                  </div>

                  {/* Rows Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Time Slot</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Line</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Product</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Line MP</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Share%</th>
                          {showCost && <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase bg-blue-50">Line Cost</th>}
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Target</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Actual</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Ach%</th>
                          {showCost && <>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-green-600 uppercase bg-green-50">Target ₹/pc</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-red-600 uppercase bg-red-50">Actual ₹/pc</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Diff</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">G/L</th>
                          </>}
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {d.rows.map((r: any, ri: number) => (
                          <tr key={ri} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs font-medium text-blue-700">{r.timeSlot?.label}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{r.line.name}</td>
                            <td className="px-4 py-2.5 text-gray-600 text-xs">{r.product.name}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-blue-700">{r.lineMP}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500">{fmt(r.lineSharePct, 1)}%</td>
                            {showCost && <td className="px-4 py-2.5 text-right bg-blue-50 font-medium text-blue-700">₹{fmt(r.lineTrueCost, 0)}</td>}
                            <td className="px-4 py-2.5 text-right text-gray-700">{fmt(r.targetOutput, 0)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmt(r.actualOutput, 0)}</td>
                            <td className={clsx("px-4 py-2.5 text-right font-bold", r.achievementPct >= 100 ? "text-green-600" : "text-red-600")}>
                              {fmt(r.achievementPct, 1)}%
                            </td>
                            {showCost && <>
                              <td className="px-4 py-2.5 text-right bg-green-50 font-bold text-green-700">₹{fmt(r.targetCostPerPiece, 2)}</td>
                              <td className={clsx("px-4 py-2.5 text-right bg-red-50 font-bold",
                                r.actualCostPerPiece <= r.targetCostPerPiece ? "text-green-600" : "text-red-600")}>
                                ₹{fmt(r.actualCostPerPiece, 2)}
                              </td>
                              <td className={clsx("px-4 py-2.5 text-right font-bold",
                                r.costDifference <= 0 ? "text-green-600" : "text-red-600")}>
                                {r.costDifference >= 0 ? '+' : ''}₹{fmt(r.costDifference, 2)}
                              </td>
                              <td className={clsx("px-4 py-2.5 text-right font-bold",
                                r.gainLoss >= 0 ? "text-green-600" : "text-red-600")}>
                                {r.gainLoss >= 0 ? '+' : ''}₹{fmt(r.gainLoss, 0)}
                              </td>
                            </>}
                            <td className="px-4 py-2.5 text-center"><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                          <td colSpan={showCost ? 5 : 5} className="px-4 py-3 text-gray-700 font-black">TOTAL</td>
                          {showCost && <td className="px-4 py-3 text-right bg-blue-50 text-blue-700 font-black">₹{fmt(d.totalLineCost, 0)}</td>}
                          <td className="px-4 py-3 text-right text-gray-700">{fmt(d.totalTargetOutput, 0)}</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-black">{fmt(d.totalActualOutput, 0)}</td>
                          <td className={clsx("px-4 py-3 text-right font-black", d.avgAchievement >= 100 ? "text-green-600" : "text-red-600")}>
                            {fmt(d.avgAchievement, 1)}%
                          </td>
                          {showCost && <>
                            <td className="px-4 py-3 bg-green-50 text-right font-black text-green-700">₹{fmt(d.overallTargetCPP, 2)}</td>
                            <td className={clsx("px-4 py-3 bg-red-50 text-right font-black",
                              d.overallActualCPP <= d.overallTargetCPP ? "text-green-600" : "text-red-600")}>
                              ₹{fmt(d.overallActualCPP, 2)}
                            </td>
                            <td className="px-4 py-3"></td>
                            <td className={clsx("px-4 py-3 text-right font-black", d.totalGainLoss >= 0 ? "text-green-600" : "text-red-600")}>
                              {d.totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(d.totalGainLoss), 0)}
                            </td>
                          </>}
                          <td className="px-4 py-3 text-center"><StatusBadge status={d.overallStatus} /></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WHATSAPP CARD TAB */}
          {activeTab === 'card' && (
            <div>
              <div ref={cardRef} className="bg-white rounded-2xl border border-gray-200 p-6 max-w-2xl">
                {/* Card Header */}
                <div className="bg-slate-800 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-widest">Costing Tool — Manufacturing ERP</p>
                    <h3 className="text-white font-black text-2xl mt-0.5">Per Piece Cost Report</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-sm font-bold">{filters.dateFrom === filters.dateTo ? filters.dateFrom : `${filters.dateFrom} to ${filters.dateTo}`}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Hourly Breakdown</p>
                  </div>
                </div>

                {/* Summary row */}
                {showCost && summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: "Total Cost", value: `₹${fmt(summary.totalProcessCost, 0)}`, color: "text-blue-700" },
                      { label: "Target Output", value: fmt(summary.totalTargetOutput, 0), color: "text-gray-700" },
                      { label: "Actual Output", value: fmt(summary.totalActualOutput, 0), color: "text-gray-900" },
                      { label: "Net Gain/Loss", value: `${summary.totalGainLoss >= 0 ? '+' : ''}₹${fmt(Math.abs(summary.totalGainLoss), 0)}`,
                        color: summary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600" },
                    ].map(c => (
                      <div key={c.label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">{c.label}</p>
                        <p className={clsx("text-lg font-black mt-0.5", c.color)}>{c.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Process cards */}
                {data.map((d, di) => (
                  <div key={di} className="rounded-xl overflow-hidden mb-3 border border-gray-200">
                    <div className={clsx("px-4 py-3 flex items-center justify-between",
                      d.overallStatus === 'PROFIT' ? "bg-green-600" :
                      d.overallStatus === 'LOSS' ? "bg-red-600" : "bg-gray-600"
                    )}>
                      <div>
                        <p className="font-black text-white text-lg">{d.process.name}</p>
                        <p className="text-xs text-white/70">{d.shift?.name} &nbsp;|&nbsp; Total MP: {d.totalProcessMP} &nbsp;|&nbsp; Allocated: {d.allocatedMP} &nbsp;|&nbsp; Supporting: {d.supportingMP}</p>
                      </div>
                      <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{d.overallStatus}</span>
                    </div>
                    <div className="bg-white p-3">
                    <div className="space-y-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400">
                            <th className="text-left py-1.5 font-medium">Time Slot</th>
                            <th className="text-left py-1.5 font-medium">Line</th>
                            <th className="text-right py-1.5 font-medium">Target</th>
                            <th className="text-right py-1.5 font-medium">Actual</th>
                            <th className="text-right py-1.5 font-medium">Ach%</th>
                            {showCost && <>
                              <th className="text-right py-1.5 font-medium text-green-600">₹/Target</th>
                              <th className="text-right py-1.5 font-medium text-red-600">₹/Actual</th>
                            </>}
                            <th className="text-center py-1.5 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {d.rows.map((r: any, ri: number) => (
                            <tr key={ri}>
                              <td className="py-2 text-blue-600 font-semibold">{r.timeSlot?.label}</td>
                              <td className="py-2 text-gray-700">{r.line.name}</td>
                              <td className="py-2 text-right text-gray-600">{fmt(r.targetOutput, 0)}</td>
                              <td className="py-2 text-right font-bold text-gray-900">{fmt(r.actualOutput, 0)}</td>
                              <td className={clsx("py-2 text-right font-bold", r.achievementPct >= 100 ? "text-green-600" : "text-red-600")}>
                                {fmt(r.achievementPct, 1)}%
                              </td>
                              {showCost && <>
                                <td className="py-2 text-right text-green-600 font-medium">₹{fmt(r.targetCostPerPiece, 2)}</td>
                                <td className={clsx("py-2 text-right font-bold", r.actualCostPerPiece <= r.targetCostPerPiece ? "text-green-600" : "text-red-600")}>
                                  ₹{fmt(r.actualCostPerPiece, 2)}
                                </td>
                              </>}
                              <td className="py-2 text-center"><StatusBadge status={r.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {showCost && (
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500 font-medium">Total: <b>{fmt(d.totalActualOutput, 0)}</b> / {fmt(d.totalTargetOutput, 0)} units &nbsp;|&nbsp; Ach: {fmt(d.avgAchievement, 1)}%</span>
                        <span className={clsx("font-black text-base",
                          d.totalGainLoss >= 0 ? "text-green-600" : "text-red-600")}>
                          {d.totalGainLoss >= 0 ? 'GAIN: +' : 'LOSS: '}₹{fmt(Math.abs(d.totalGainLoss), 0)}
                        </span>
                      </div>
                    )}
                    </div>
                  </div>
                ))}

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">Generated by Costing Tool — Manufacturing ERP</p>
                  <p className="text-xs text-gray-400">{new Date().toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
