export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'OPERATOR'
  | 'VIEWER';

export const ROLE_NAV_ACCESS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  MANAGER: [
    '/dashboard',
    '/morning-plan',
    '/line-allocation',
    '/manpower-movement',
    '/production-entry',
    '/corrections',
    '/reports',
  ],
  SUPERVISOR: [
    '/dashboard',
    '/morning-plan',
    '/line-allocation',
    '/manpower-movement',
    '/production-entry',
  ],
  OPERATOR: ['/production-entry'],
  VIEWER: ['/reports'],
};

// ─── COST VISIBILITY ─────────────────────────────────────
const COST_VISIBLE_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
export function canSeeCost(role: UserRole): boolean {
  return COST_VISIBLE_ROLES.includes(role);
}

export function canAccess(role: UserRole, href: string): boolean {
  const allowed = ROLE_NAV_ACCESS[role];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;
  return allowed.includes(href);
}

export const ROLE_BADGE_COLOR: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-green-100 text-green-700',
  SUPERVISOR: 'bg-yellow-100 text-yellow-700',
  OPERATOR: 'bg-orange-100 text-orange-700',
  VIEWER: 'bg-gray-100 text-gray-700',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operator',
  VIEWER: 'Viewer',
};
