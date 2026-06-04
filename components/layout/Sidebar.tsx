"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, Users, ArrowLeftRight,
  Factory, CheckSquare, BarChart2, Database, UserCog,
  Settings, ChevronDown, ChevronRight, Zap, Menu, X,
} from "lucide-react";
import { clsx } from "clsx";
import { NAV_ITEMS, APP_NAME } from "@/lib/constants";

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  ClipboardList: <ClipboardList size={18} />,
  Users: <Users size={18} />,
  ArrowLeftRight: <ArrowLeftRight size={18} />,
  Factory: <Factory size={18} />,
  CheckSquare: <CheckSquare size={18} />,
  BarChart2: <BarChart2 size={18} />,
  Database: <Database size={18} />,
  UserCog: <UserCog size={18} />,
  Settings: <Settings size={18} />,
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["Operations", "Management", "Admin"]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-white font-bold text-sm leading-none">{APP_NAME}</p>
              <p className="text-slate-400 text-xs mt-0.5">Manufacturing ERP</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white hidden md:block transition-colors"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-slate-400 hover:text-white md:hidden transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.group)}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
              >
                {group.group}
                {openGroups.includes(group.group)
                  ? <ChevronDown size={12} />
                  : <ChevronRight size={12} />}
              </button>
            )}
            {(collapsed || openGroups.includes(group.group)) && (
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "text-slate-300 hover:bg-slate-700 hover:text-white"
                      )}
                    >
                      <span className={clsx(isActive ? "text-white" : "text-slate-400")}>
                        {ICON_MAP[item.icon]}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Admin User</p>
              <p className="text-slate-400 text-xs truncate">Administrator</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-800 p-2 rounded-lg text-white"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={clsx(
        "md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </div>

      <div className={clsx(
        "hidden md:flex flex-col bg-slate-900 border-r border-slate-700 transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </div>
    </>
  );
}
