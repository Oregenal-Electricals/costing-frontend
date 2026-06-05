"use client";

import { Bell, Search } from "lucide-react";
import { getUser } from "@/lib/auth";
import { ROLE_BADGE_COLOR, ROLE_LABEL, UserRole } from "@/lib/roles";
import { clsx } from "clsx";
import { useEffect, useState, useRef } from "react";
import { apiGetNotificationSummary, NotificationSummary, Alert } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Link from "next/link";

interface TopbarProps {
  title: string;
}

const SEVERITY_COLORS = {
  error: 'bg-red-50 border-red-100 text-red-700',
  warning: 'bg-yellow-50 border-yellow-100 text-yellow-700',
  info: 'bg-blue-50 border-blue-100 text-blue-700',
};

const SEVERITY_DOT = {
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

export default function Topbar({ title }: TopbarProps) {
  const user = getUser();
  const role = (user?.role || 'VIEWER') as UserRole;
  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const s = await apiGetNotificationSummary(token);
        setSummary(s);
      } catch { /* silent */ }
    };
    load();
    const interval = setInterval(load, 60 * 1000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const alertCount = summary?.total || 0;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="Search..."
            className="bg-transparent text-sm text-gray-600 outline-none w-40 placeholder-gray-400" />
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} />
            {alertCount > 0 && (
              <span className={clsx(
                "absolute top-1 right-1 min-w-[16px] h-4 rounded-full text-white text-xs font-bold flex items-center justify-center px-0.5",
                (summary?.error || 0) > 0 ? "bg-red-500" : "bg-yellow-500"
              )}>
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Alerts</p>
                <div className="flex items-center gap-2">
                  {(summary?.error || 0) > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      {summary?.error} error
                    </span>
                  )}
                  {(summary?.warning || 0) > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      {summary?.warning} warning
                    </span>
                  )}
                </div>
              </div>

              {/* Alerts List */}
              <div className="max-h-80 overflow-y-auto">
                {!summary || summary.alerts.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400">✅ No alerts — all good!</p>
                  </div>
                ) : (
                  summary.alerts.map((alert: Alert) => (
                    <div key={alert.id}
                      className={clsx("px-4 py-3 border-b border-gray-50 last:border-0", SEVERITY_COLORS[alert.severity])}>
                      <div className="flex items-start gap-2.5">
                        <div className={clsx("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", SEVERITY_DOT[alert.severity])} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{alert.title}</p>
                          <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{alert.message}</p>
                          {alert.link && (
                            <Link href={alert.link} onClick={() => setShowDropdown(false)}
                              className="text-xs font-medium underline mt-1 inline-block opacity-70 hover:opacity-100">
                              View →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 text-center">
                  Auto-refreshes every minute
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Role Badge + Avatar */}
        <div className="flex items-center gap-2">
          <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium hidden sm:block", ROLE_BADGE_COLOR[role])}>
            {ROLE_LABEL[role]}
          </span>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
