"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import {
  CorrectionRequest,
  apiGetCorrections, apiApproveCorrection, apiRejectCorrection,
} from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import RoleGuard from "@/components/auth/RoleGuard";

const LIMIT = 15;

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const FIELD_LABELS: Record<string, string> = {
  actualOutput: 'Actual Output',
  rejectedQty: 'Rejected Qty',
  manpowerCount: 'Manpower Count',
  shiftHours: 'Shift Hours',
  remarks: 'Remarks',
};

export default function CorrectionsPage() {
  const [data, setData] = useState<CorrectionRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const currentUser = getUser();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiGetCorrections(token, {
        status: activeTab || undefined,
        page, limit: LIMIT,
      });
      setData(res.data);
      setTotal(res.total);
      setSummary(res.summary);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async () => {
    if (!reviewId || !reviewAction) return;
    const token = getToken();
    if (!token) return;
    try {
      if (reviewAction === 'approve') {
        await apiApproveCorrection(token, reviewId, remarks || undefined);
        showToast('Correction approved and production entry updated');
      } else {
        await apiRejectCorrection(token, reviewId, remarks || undefined);
        showToast('Correction rejected');
      }
      load();
      setReviewId(null);
      setReviewAction(null);
      setRemarks("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const isApprover = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser?.role || '');

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR"]}>
      <div className="space-y-5">
        {toast && (
          <div className={clsx(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium",
            toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
          )}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Correction Approval</h2>
          <p className="text-sm text-gray-500 mt-1">Manage production entry correction requests</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending", value: summary.pending, color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: <Clock size={18} /> },
            { label: "Approved", value: summary.approved, color: "text-green-600 bg-green-50 border-green-200", icon: <CheckCircle size={18} /> },
            { label: "Rejected", value: summary.rejected, color: "text-red-600 bg-red-50 border-red-200", icon: <XCircle size={18} /> },
          ].map((card) => (
            <div key={card.label} className={clsx("rounded-xl border p-4 flex items-center gap-3", card.color)}>
              {card.icon}
              <div>
                <p className="text-xs font-medium opacity-70">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {STATUS_TABS.map((tab) => (
            <button key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}>
              {tab.label}
              {tab.key === 'PENDING' && summary.pending > 0 && (
                <span className="ml-1.5 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {summary.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No correction requests found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Entry", "Field", "Old Value", "New Value", "Reason", "Requested By", "Status", "Reviewed By", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">#{item.productionEntryId}</p>
                        <p className="text-xs text-gray-400">{item.productionEntry.product.name}</p>
                        <p className="text-xs text-gray-400">{new Date(item.productionEntry.date).toLocaleDateString('en-IN')}</p>
                        <p className="text-xs text-gray-400">{item.productionEntry.line.name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-blue-700">
                        {FIELD_LABELS[item.fieldName] || item.fieldName}
                      </td>
                      <td className="px-4 py-3 text-xs text-red-600 font-mono">{item.oldValue}</td>
                      <td className="px-4 py-3 text-xs text-green-600 font-mono font-bold">{item.newValue}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-32 truncate" title={item.reason}>{item.reason}</td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium text-gray-700">{item.requestedBy.name}</p>
                        <p className="text-gray-400">{new Date(item.createdAt).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          "text-xs px-2.5 py-1 rounded-full font-semibold",
                          item.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                          item.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.approvedBy ? (
                          <div>
                            <p className="font-medium text-gray-700">{item.approvedBy.name}</p>
                            {item.approvedAt && <p className="text-gray-400">{new Date(item.approvedAt).toLocaleDateString('en-IN')}</p>}
                            {item.remarks && <p className="text-gray-400 italic truncate max-w-24" title={item.remarks}>{item.remarks}</p>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'PENDING' && isApprover && item.requestedBy.id !== currentUser?.id && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setReviewId(item.id); setReviewAction('approve'); }}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => { setReviewId(item.id); setReviewAction('reject'); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                        {item.status === 'PENDING' && (!isApprover || item.requestedBy.id === currentUser?.id) && (
                          <span className="text-xs text-gray-400">Awaiting</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} of {total}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 rounded-lg hover:bg-gray-100">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-600 px-2">{page}/{totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-40 rounded-lg hover:bg-gray-100">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Review Modal */}
        {reviewId && reviewAction && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {reviewAction === 'approve' ? '✅ Approve Correction' : '❌ Reject Correction'}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {reviewAction === 'approve'
                  ? 'Approving will update the production entry with the new value and recalculate all figures.'
                  : 'Rejecting will keep the original production entry unchanged.'}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks {reviewAction === 'reject' ? '*' : '(optional)'}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add remarks..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setReviewId(null); setReviewAction(null); setRemarks(""); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={reviewAction === 'reject' && !remarks.trim()}
                  className={clsx(
                    "flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium disabled:opacity-50",
                    reviewAction === 'approve'
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  )}>
                  {reviewAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
