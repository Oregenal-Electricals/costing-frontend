"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Share2, ArrowLeft, X, MessageCircle, Copy, Check } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getToken, getUser } from "@/lib/auth";
import { canSeeCost, UserRole } from "@/lib/roles";
import {
  apiGetSnapshotDaily, apiGetSnapshotHourly,
  apiGetSnapshotProduct, apiGetSnapshotProcess, apiGetSnapshotCustomer,
} from "@/lib/api";
import { exportToPNG, shareSnapshot } from "@/lib/export";

const SNAPSHOT_TYPES = [
  { key: 'daily', label: 'Daily Summary' },
  { key: 'hourly', label: 'Hourly Summary' },
  { key: 'product', label: 'Product Summary' },
  { key: 'process', label: 'Process Summary' },
  { key: 'customer', label: 'Customer Summary' },
];

function fmt(n: number, d = 0) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function StatusBadge({ value }: { value: number }) {
  return (
    <span className={clsx("text-sm font-bold px-3 py-1 rounded-full",
      value > 0 ? "bg-green-100 text-green-700" :
      value < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
    )}>
      {value > 0 ? '+' : ''}₹{fmt(Math.abs(value))}
    </span>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={clsx("text-3xl font-black mt-1", color || "text-gray-900")}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// Share Dialog Component
function ShareDialog({
  dataUrl, title, onClose
}: {
  dataUrl: string;
  title: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleWhatsApp = () => {
    // Download image first then open WhatsApp
    const link = document.createElement('a');
    link.download = `${title}.png`;
    link.href = dataUrl;
    link.click();

    // Open WhatsApp after short delay
    setTimeout(() => {
      const text = encodeURIComponent(`${title} — Costing Tool Manufacturing ERP`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }, 500);
  };

  const handleCopyImage = async () => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const link = document.createElement('a');
      link.download = `${title}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `${title}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Share Snapshot</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4">
          <img src={dataUrl} alt="Snapshot preview"
            className="w-full rounded-xl border border-gray-200 max-h-48 object-contain bg-gray-50" />
        </div>

        {/* Share Options */}
        <div className="px-4 pb-5 space-y-2">
          <p className="text-xs text-gray-500 mb-3 text-center">
            Download the image first, then share it on WhatsApp
          </p>

          {/* WhatsApp */}
          <button onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors">
            <MessageCircle size={20} />
            <span>Download & Open WhatsApp</span>
          </button>

          {/* Copy Image */}
          <button onClick={handleCopyImage}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium transition-colors border border-blue-200">
            {copied ? <Check size={20} /> : <Copy size={20} />}
            <span>{copied ? 'Copied!' : 'Copy Image to Clipboard'}</span>
          </button>

          {/* Download Only */}
          <button onClick={handleDownload}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors border border-gray-200">
            <Download size={20} />
            <span>Download PNG</span>
          </button>

          <p className="text-xs text-gray-400 text-center mt-2">
            After downloading, open WhatsApp → Attach → Gallery → Select image
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SnapshotsPage() {
  const [type, setType] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [shareDialog, setShareDialog] = useState<{ dataUrl: string; title: string } | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const apiMap: Record<string, (token: string, date: string) => Promise<any>> = {
        daily: apiGetSnapshotDaily,
        hourly: apiGetSnapshotHourly,
        product: apiGetSnapshotProduct,
        process: apiGetSnapshotProcess,
        customer: apiGetSnapshotCustomer,
      };
      const res = await apiMap[type](token, date);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type, date]);

  useEffect(() => { load(); }, [load]);

  const title = `${SNAPSHOT_TYPES.find((t) => t.key === type)?.label} - ${date}`;

  const handleDownload = () => exportToPNG('snapshot-content', title);

  const handleShare = () => {
    shareSnapshot(
      'snapshot-content',
      title,
      (dataUrl, _blob, t) => setShareDialog({ dataUrl, title: t }),
    );
  };

  return (
    <div className="space-y-5">
      {/* Share Dialog */}
      {shareDialog && (
        <ShareDialog
          dataUrl={shareDialog.dataUrl}
          title={shareDialog.title}
          onClose={() => setShareDialog(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Snapshot Reports</h2>
            <p className="text-sm text-gray-500">WhatsApp-ready factory summaries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Download size={16} />
            PNG
          </button>
          <button onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
          {SNAPSHOT_TYPES.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                type === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot Content */}
      <div id="snapshot-content" className="bg-white rounded-2xl border border-gray-200 p-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Costing Tool — Manufacturing ERP</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">
              {SNAPSHOT_TYPES.find((t) => t.key === type)?.label}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-700">
              {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleTimeString('en-IN')}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <p className="text-center text-gray-400 py-8">No data available</p>
        ) : (
          <>
            {/* DAILY */}
            {type === 'daily' && data.summary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard label="Total Output" value={fmt(data.summary.totalActualOutput)} sub="units produced" color="text-blue-700" />
                  <KpiCard label="Target Output" value={fmt(data.summary.totalTargetOutput)} sub="units planned" />
                  <KpiCard label="Achievement" value={`${fmt(data.summary.avgAchievement, 1)}%`}
                    color={data.summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600"} />
                  <KpiCard label="Total Manpower" value={fmt(data.summary.totalManpower)} sub="workers" color="text-purple-600" />
                </div>
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Net Labour Gain/Loss</p>
                    <p className={clsx("text-4xl font-black mt-1",
                      data.summary.totalGainLoss > 0 ? "text-green-600" :
                      data.summary.totalGainLoss < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {data.summary.totalGainLoss >= 0 ? '+' : ''}₹{fmt(Math.abs(data.summary.totalGainLoss))}
                    </p>
                  </div>
                  <span className={clsx("text-2xl font-black px-4 py-2 rounded-xl",
                    data.summary.totalGainLoss > 0 ? "bg-green-100 text-green-700" :
                    data.summary.totalGainLoss < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                  )}>
                    {data.summary.totalGainLoss > 0 ? 'PROFIT' : data.summary.totalGainLoss < 0 ? 'LOSS' : 'NEUTRAL'}
                  </span>
                </div>
                {data.lineBreakdown?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Line Summary</p>
                    <div className="space-y-2">
                      {data.lineBreakdown.map((lb: any) => (
                        <div key={lb.line.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                          <p className="font-bold text-gray-800">{lb.line.name}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-500">T: {fmt(lb.summary.totalTargetOutput, 0)}</span>
                            <span className="font-bold">A: {fmt(lb.summary.totalActualOutput, 0)}</span>
                            <span className={clsx("font-bold", lb.summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600")}>
                              {fmt(lb.summary.avgAchievement, 1)}%
                            </span>
                            <StatusBadge value={lb.summary.totalGainLoss} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HOURLY */}
            {type === 'hourly' && data.hourly && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-500 font-medium">Day Total Gain/Loss</p>
                  <StatusBadge value={data.summary?.totalGainLoss || 0} />
                </div>
                {data.hourly.map((h: any) => (
                  <div key={h.label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <p className="font-bold text-gray-800 w-28">{h.label}</p>
                    <span className="text-gray-500 text-sm">T: {fmt(h.summary.totalTargetOutput, 0)}</span>
                    <span className="font-bold text-sm">A: {fmt(h.summary.totalActualOutput, 0)}</span>
                    <span className={clsx("font-bold text-sm",
                      h.summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600")}>
                      {fmt(h.summary.avgAchievement, 1)}%
                    </span>
                    <StatusBadge value={h.summary.totalGainLoss} />
                  </div>
                ))}
              </div>
            )}

            {/* PRODUCT */}
            {type === 'product' && data.products && (
              <div className="space-y-2">
                {data.products.map((p: any) => (
                  <div key={p.product.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-bold text-gray-800">{p.product.name}</p>
                      <p className="text-xs text-gray-400">{p.product.code}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">T: {fmt(p.summary.totalTargetOutput, 0)}</span>
                      <span className="font-bold">A: {fmt(p.summary.totalActualOutput, 0)}</span>
                      <span className={clsx("font-bold", p.summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600")}>
                        {fmt(p.summary.avgAchievement, 1)}%
                      </span>
                      <StatusBadge value={p.summary.totalGainLoss} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PROCESS */}
            {type === 'process' && data.processes && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.processes.map((p: any) => (
                  <div key={p.process.id} className={clsx("rounded-2xl p-5 border-2",
                    p.summary.totalGainLoss > 0 ? "border-green-200 bg-green-50" :
                    p.summary.totalGainLoss < 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"
                  )}>
                    <p className="font-black text-gray-900 text-lg">{p.process.name}</p>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Target</span>
                        <span className="font-bold">{fmt(p.summary.totalTargetOutput, 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Actual</span>
                        <span className="font-bold">{fmt(p.summary.totalActualOutput, 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Achievement</span>
                        <span className={clsx("font-bold", p.summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600")}>
                          {fmt(p.summary.avgAchievement, 1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                        <span className="text-gray-500">Gain/Loss</span>
                        <StatusBadge value={p.summary.totalGainLoss} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CUSTOMER */}
            {type === 'customer' && data.customers && (
              <div className="space-y-2">
                {data.customers.map((c: any) => (
                  <div key={c.customer.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-bold text-gray-800">{c.customer.name}</p>
                      <p className="text-xs text-gray-400">{c.customer.code}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">T: {fmt(c.summary.totalTargetOutput, 0)}</span>
                      <span className="font-bold">A: {fmt(c.summary.totalActualOutput, 0)}</span>
                      <span className={clsx("font-bold", c.summary.avgAchievement >= 100 ? "text-green-600" : "text-red-600")}>
                        {fmt(c.summary.avgAchievement, 1)}%
                      </span>
                      <StatusBadge value={c.summary.totalGainLoss} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Generated by Costing Tool — Manufacturing ERP · {new Date().toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </div>
  );
}
