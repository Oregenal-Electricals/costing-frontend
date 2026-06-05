"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Database, Download, Plus, RefreshCw,
  CheckCircle, AlertCircle, Clock, HardDrive, Shield,
} from "lucide-react";
import { clsx } from "clsx";
import {
  BackupFile, BackupStats,
  apiGetBackupStats, apiListBackups, apiCreateBackup, getBackupDownloadUrl,
} from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import RoleGuard from "@/components/auth/RoleGuard";

export default function SettingsPage() {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const user = getUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [s, b] = await Promise.all([apiGetBackupStats(token), apiListBackups(token)]);
      setStats(s);
      setBackups(b);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const token = getToken();
    if (!token) return;
    setCreating(true);
    try {
      const result: any = await apiCreateBackup(token);
      showToast(`Backup created successfully — ${result.fileName}`);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Backup failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (fileName: string) => {
    const token = getToken();
    if (!token) return;
    const url = getBackupDownloadUrl(fileName);
    const link = document.createElement('a');
    link.href = `${url}?token=${token}`;
    link.download = fileName;
    // Use fetch with auth header instead
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        link.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => showToast('Download failed', 'error'));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div className="space-y-6">
        {toast && (
          <div className={clsx(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium",
            toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
          )}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Backup & Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Protect your factory data</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <RefreshCw size={16} />
            </button>
            <button onClick={handleCreate} disabled={creating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              {creating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? 'Creating...' : 'Create Backup'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Backups",
                value: stats.totalBackups,
                icon: <Database size={20} />,
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Total Size",
                value: formatSize(stats.totalSize),
                icon: <HardDrive size={20} />,
                color: "text-purple-600 bg-purple-50",
              },
              {
                label: "Last Backup",
                value: stats.lastBackup
                  ? new Date(stats.lastBackup.createdAt).toLocaleDateString('en-IN')
                  : 'Never',
                icon: <Clock size={20} />,
                color: stats.lastBackup ? "text-green-600 bg-green-50" : "text-orange-600 bg-orange-50",
              },
              {
                label: "Production Entries",
                value: stats.database.productionEntries,
                icon: <CheckCircle size={20} />,
                color: "text-gray-600 bg-gray-50",
              },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
                  </div>
                  <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center", card.color)}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Database Summary */}
        {stats && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Database Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Users", value: stats.database.users },
                { label: "Products", value: stats.database.products },
                { label: "Customers", value: stats.database.customers },
                { label: "Production Entries", value: stats.database.productionEntries },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backup List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Backup History</h3>
            <span className="text-xs text-gray-400">{backups.length} backups stored</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-16">
              <Database size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No backups yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "Create Backup" to get started</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">File Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Size</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.map((backup, i) => (
                  <tr key={backup.fileName} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Database size={14} className="text-blue-500 flex-shrink-0" />
                        <span className="text-gray-800 font-mono text-xs">{backup.fileName}</span>
                        {i === 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Latest</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {new Date(backup.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{backup.sizeHuman}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDownload(backup.fileName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Download size={13} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">About Backups</p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Backups are JSON exports of all your factory data</li>
                <li>• Download and store backups securely on your computer or Google Drive</li>
                <li>• Create a backup before making major changes</li>
                <li>• Last 10 backups are kept automatically</li>
                {isSuperAdmin && <li>• Contact your system administrator to restore from backup</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-slate-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Security</p>
              <p className="text-sm text-slate-600 mt-1">
                Backup files contain all production data. Keep them secure and do not share them publicly.
                Only Super Admin and Admin roles can create and download backups.
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
