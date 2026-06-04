"use client";

import Link from "next/link";
import { Package, Users, Cog, GitBranch, Clock, AlarmClock } from "lucide-react";

const SECTIONS = [
  { title: "Products", desc: "Manage product catalog", href: "/master-data/products", icon: Package, color: "bg-blue-50 text-blue-600" },
  { title: "Customers", desc: "Manage customer list", href: "/master-data/customers", icon: Users, color: "bg-green-50 text-green-600" },
  { title: "Processes", desc: "Manage production processes", href: "/master-data/processes", icon: Cog, color: "bg-purple-50 text-purple-600" },
  { title: "Lines", desc: "Manage production lines", href: "/master-data/lines", icon: GitBranch, color: "bg-orange-50 text-orange-600" },
  { title: "Shifts", desc: "Manage work shifts", href: "/master-data/shifts", icon: Clock, color: "bg-yellow-50 text-yellow-600" },
  { title: "Time Slots", desc: "Manage time slots per shift", href: "/master-data/time-slots", icon: AlarmClock, color: "bg-red-50 text-red-600" },
];

export default function MasterDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Master Data</h2>
        <p className="text-sm text-gray-500 mt-1">Manage all reference data for the system</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition-all group">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon size={20} />
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{s.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
