"use client";

import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm mb-6">You don't have permission to view this page.</p>
        <button
          onClick={() => router.replace("/dashboard")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
