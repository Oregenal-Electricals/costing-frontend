"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { UserRole } from "@/lib/roles";

interface Props {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: Props) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    if (allowedRoles.includes(user.role as UserRole)) {
      setAllowed(true);
    } else {
      router.replace("/dashboard");
    }
  }, [router, allowedRoles]);

  if (!allowed) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
