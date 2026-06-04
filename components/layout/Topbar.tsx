"use client";

import { Bell, Search } from "lucide-react";
import { getUser } from "@/lib/auth";
import { ROLE_BADGE_COLOR, ROLE_LABEL, UserRole } from "@/lib/roles";
import { clsx } from "clsx";

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const user = getUser();
  const role = (user?.role || 'VIEWER') as UserRole;
  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-gray-600 outline-none w-40 placeholder-gray-400"
          />
        </div>
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
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
