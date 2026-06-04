export const APP_NAME = "Costing Tool";
export const APP_VERSION = "1.0.0";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const NAV_ITEMS = [
  {
    group: "Operations",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "Morning MP Plan", href: "/morning-plan", icon: "ClipboardList" },
      { label: "Line MP Allocation", href: "/line-allocation", icon: "Users" },
      { label: "MP Movement", href: "/manpower-movement", icon: "ArrowLeftRight" },
      { label: "Production Entry", href: "/production-entry", icon: "Factory" },
    ],
  },
  {
    group: "Management",
    items: [
      { label: "Correction Approval", href: "/corrections", icon: "CheckSquare" },
      { label: "Reports", href: "/reports", icon: "BarChart2" },
    ],
  },
  {
    group: "Admin",
    items: [
      { label: "Rate Targets", href: "/rate-targets", icon: "Target" },
      { label: "Master Data", href: "/master-data", icon: "Database" },
      { label: "User Management", href: "/users", icon: "UserCog" },
      { label: "Backup & Settings", href: "/settings", icon: "Settings" },
    ],
  },
];
