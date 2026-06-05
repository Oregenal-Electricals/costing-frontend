"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Database, Download, Plus, RefreshCw, Building2,
  Settings, Shield, Save, AlertCircle, HardDrive, Clock,
} from "lucide-react";
import { clsx } from "clsx";
import {
  BackupFile, BackupStats, SystemSetting,
  apiGetBackupStats, apiListBackups, apiCreateBackup, getBackupDownloadUrl,
  apiGetSettings, apiUpdateSettings,
} from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import RoleGuard from "@/components/auth/RoleGuard";

const TABS = [
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'system', label: 'System', icon: Settings },
  { key: 'roles', label: 'Role Permissions', icon: Shield },
  { key: 'backup', label: 'Backup & Restore', icon: Database },
];

const SETTING_LABELS: Record<string, string> = {
  company_name: 'Company Name',
  company_address: 'Address',
  company_gst: 'GST Number',
  company_phone: 'Contact Phone',
  company_email: 'Contact Email',
  company_logo: 'Logo URL',
  fiscal_year_start: 'Fiscal Year Start Month',
  currency: 'Currency',
  timezone: 'Timezone',
  default_shift_hours: 'Default Shift Hours',
  date_format: 'Date Format',
  role_manager_can_finalize: 'Manager Can Finalize Plans',
  role_supervisor_can_create_entry: 'Supervisor Can Create Production Entry',
  role_operator_can_view_reports: 'Operator Can View Reports',
};

const BOOLEAN_KEYS = [
  'role_manager_can_finalize',
  'role_supervisor_can_create_entry',
  'role_operator_can_view_reports',
];

const SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  currency: [{ value: 'INR', label: 'INR — Indian Rupee' }, { value: 'USD', label: 'USD — US Dollar' }],
  timezone: [{ value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' }, { value: 'UTC', label: 'UTC' }],
  date_format: [{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }],
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState<Record<string, SystemSetting[]>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const user = getUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSettings = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await apiGetSettings(token);
      setSettings(res.grouped);
      const vals: Record<string, string> = {};
      res.settings.forEach((s) => { vals[s.key] = s.value; });
      setFormValues(vals);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadBackups = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setBackupLoading(true);
    try {
      const [s, b] = await Promise.all([apiGetBackupStats(token), apiListBackups(token)]);
      setBackupStats(s);
      setBackups(b);
    } catch (err) {
      console.error(err);
    } finally {
      setBackupLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadBackups();
  }, [loadSettings, loadBackups]);

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const updates = Object.entries(formValues).map(([key, value]) => ({ key, value }));
      await apiUpdateSettings(token, updates);
      showToast('Settings saved successfully');
      loadSettings();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    const token = getToken();
    if (!token) return;
    setCreating(true);
    try {
      const result: any = await apiCreateBackup(token);
      showToast(`Backup created: ${result.fileName}`);
      loadBackups();
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
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => showToast('Download failed', 'error'));
  };

  const currentSettings = settings[activeTab] || [];

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isSuperAdmin ? 'Full access' : 'View only — Super Admin required to save'}
            </p>
          </div>
          {activeTab !== 'backup' && isSuperAdmin && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          {activeTab === 'backup' && (
            <button onClick={handleCreateBackup} disabled={creating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
              {creating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? 'Creating...' : 'Create Backup'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}>
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Form */}
        {activeTab !== 'backup' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {!isSuperAdmin && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-lg mb-5">
                <AlertCircle size={16} />
                Only Super Admin can modify settings. You are in view-only mode.
              </div>
            )}

            <div className="space-y-5 max-w-2xl">
              {currentSettings.length === 0 ? (
                <p className="text-gray-400 text-sm">No settings in this category.</p>
              ) : (
                currentSettings.map((setting) => (
                  <div key={setting.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {SETTING_LABELS[setting.key] || setting.key}
                      {setting.description && (
                        <span className="text-xs text-gray-400 font-normal ml-2">({setting.description})</span>
                      )}
                    </label>
                    {BOOLEAN_KEYS.includes(setting.key) ? (
                      <div className="flex items-center gap-3">
                        <button
                          disabled={!isSuperAdmin}
                          onClick={() => setFormValues((f) => ({
                            ...f,
                            [setting.key]: f[setting.key] === 'true' ? 'false' : 'true',
                          }))}
                          className={clsx(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            formValues[setting.key] === 'true' ? "bg-blue-600" : "bg-gray-200",
                            !isSuperAdmin && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <span className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            formValues[setting.key] === 'true' ? "translate-x-6" : "translate-x-1"
                          )} />
                        </button>
                        <span className="text-sm text-gray-600">
                          {formValues[setting.key] === 'true' ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ) : SELECT_OPTIONS[setting.key] ? (
                      <select
                        value={formValues[setting.key] || ''}
                        onChange={(e) => setFormValues((f) => ({ ...f, [setting.key]: e.target.value }))}
                        disabled={!isSuperAdmin}
                        className={inputCls}
                      >
                        {SELECT_OPTIONS[setting.key].map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formValues[setting.key] || ''}
                        onChange={(e) => setFormValues((f) => ({ ...f, [setting.key]: e.target.value }))}
                        disabled={!isSuperAdmin}
                        className={inputCls}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-5">
            {/* Stats */}
            {backupStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Backups", value: backupStats.totalBackups, icon: <Database size={18} />, color: "text-blue-600 bg-blue-50" },
                  { label: "Last Backup", value: backupStats.lastBackup ? new Date(backupStats.lastBackup.createdAt).toLocaleDateString('en-IN') : 'Never', icon: <Clock size={18} />, color: backupStats.lastBackup ? "text-green-600 bg-green-50" : "text-orange-600 bg-orange-50" },
                  { label: "Users", value: backupStats.database.users, icon: <Shield size={18} />, color: "text-purple-600 bg-purple-50" },
                  { label: "Production Entries", value: backupStats.database.productionEntries, icon: <HardDrive size={18} />, color: "text-gray-600 bg-gray-50" },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                    <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", card.color)}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{card.label}</p>
                      <p className="font-bold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Backup List */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">Backup History</h3>
                <span className="text-xs text-gray-400">{backups.length} backups</span>
              </div>
              {backupLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-12">
                  <Database size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No backups yet. Click "Create Backup" to start.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">File</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Size</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {backups.map((b, i) => (
                      <tr key={b.fileName} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Database size={13} className="text-blue-500" />
                            <span className="font-mono text-xs text-gray-700">{b.fileName}</span>
                            {i === 0 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Latest</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600">{new Date(b.createdAt).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{b.sizeHuman}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => handleDownload(b.fileName)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                            <Download size={12} />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Backups export all factory data as JSON. Download and store them safely in Google Drive or your computer.
                Last 10 backups are kept automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
