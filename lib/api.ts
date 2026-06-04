const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
  user: AuthUser;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  employeeCode: string;
  role: string;
  department: string | null;
  designation: string | null;
}

export interface User {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  employeeType: string;
  department: string | null;
  designation: string | null;
  joiningDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: { id: number; name: string };
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
}

async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
  } catch {
    throw new Error('Cannot connect to server. Please try again.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    let msg = 'Something went wrong';
    if (typeof error?.message === 'string') {
      msg = error.message;
    } else if (Array.isArray(error?.message)) {
      msg = error.message.join(', ');
    } else if (typeof error?.message?.message === 'string') {
      msg = error.message.message;
    }
    throw new Error(msg);
  }

  return res.json();
}

export async function apiLogin(identifier: string, password: string): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
  } catch {
    throw new Error('Cannot connect to server. Please try again.');
  }

  if (!res.ok) {
    try {
      const error = await res.json();
      const msg =
        typeof error?.message === 'string'
          ? error.message
          : Array.isArray(error?.message)
          ? error.message.join(', ')
          : 'Invalid credentials. Please check and try again.';
      throw new Error(msg);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Invalid credentials. Please check and try again.')
        throw e;
      throw new Error('Invalid credentials. Please check and try again.');
    }
  }

  return res.json();
}

export async function apiGetMe(token: string): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser }>('/api/v1/auth/me', token);
  return data.user;
}

// Users
export async function apiGetUsers(token: string): Promise<User[]> {
  return apiFetch<User[]>('/api/v1/users', token);
}

export async function apiGetUser(token: string, id: number): Promise<User> {
  return apiFetch<User>(`/api/v1/users/${id}`, token);
}

export async function apiGetRoles(token: string): Promise<Role[]> {
  return apiFetch<Role[]>('/api/v1/users/roles', token);
}

export async function apiCreateUser(token: string, data: object): Promise<User> {
  return apiFetch<User>('/api/v1/users', token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateUser(token: string, id: number, data: object): Promise<User> {
  return apiFetch<User>(`/api/v1/users/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiToggleUserActive(token: string, id: number): Promise<User> {
  return apiFetch<User>(`/api/v1/users/${id}/toggle-active`, token, {
    method: 'PATCH',
  });
}

export async function apiResetPassword(token: string, id: number, newPassword: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/v1/users/${id}/reset-password`, token, {
    method: 'PATCH',
    body: JSON.stringify({ newPassword }),
  });
}

// ─── MASTER DATA ─────────────────────────────────────

export interface MasterItem {
  id: number;
  code?: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ShiftItem extends MasterItem {
  type: string;
  startTime: string;
  endTime: string;
  timeSlots?: TimeSlotItem[];
}

export interface TimeSlotItem extends MasterItem {
  shiftId: number;
  label: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  shift?: { id: number; name: string };
}

type MasterEntity = 'products' | 'customers' | 'processes' | 'lines' | 'shifts' | 'time-slots';

export async function apiGetMasterList<T>(
  token: string,
  entity: MasterEntity,
  params?: { search?: string; page?: number; limit?: number },
): Promise<PaginatedResponse<T>> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return apiFetch<PaginatedResponse<T>>(`/api/v1/master/${entity}?${q}`, token);
}

export async function apiCreateMaster<T>(token: string, entity: MasterEntity, data: object): Promise<T> {
  return apiFetch<T>(`/api/v1/master/${entity}`, token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateMaster<T>(token: string, entity: MasterEntity, id: number, data: object): Promise<T> {
  return apiFetch<T>(`/api/v1/master/${entity}/${id}`, token, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiToggleMaster<T>(token: string, entity: MasterEntity, id: number): Promise<T> {
  return apiFetch<T>(`/api/v1/master/${entity}/${id}/toggle`, token, { method: 'PATCH' });
}

export async function apiGetActiveShifts(token: string): Promise<ShiftItem[]> {
  return apiFetch<ShiftItem[]>('/api/v1/master/shifts/active', token);
}

// ─── RATE TARGET MASTER ──────────────────────────────

export interface RateTarget {
  id: number;
  productId: number;
  customerId: number;
  processId: number;
  hourlyRate: string;
  targetPerHour: string;
  ratePerPiece: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: { id: number; code: string; name: string };
  customer: { id: number; code: string; name: string };
  process: { id: number; code: string; name: string };
  users: { id: number; name: string; employeeCode: string } | null;
}

export interface RateTargetQuery {
  search?: string;
  productId?: number;
  customerId?: number;
  processId?: number;
  effectiveFrom?: string;
  page?: number;
  limit?: number;
}

export async function apiGetRateTargets(token: string, query?: RateTargetQuery): Promise<PaginatedResponse<RateTarget>> {
  const q = new URLSearchParams();
  if (query?.search) q.set('search', query.search);
  if (query?.productId) q.set('productId', String(query.productId));
  if (query?.customerId) q.set('customerId', String(query.customerId));
  if (query?.processId) q.set('processId', String(query.processId));
  if (query?.effectiveFrom) q.set('effectiveFrom', query.effectiveFrom);
  if (query?.page) q.set('page', String(query.page));
  if (query?.limit) q.set('limit', String(query.limit));
  return apiFetch<PaginatedResponse<RateTarget>>(`/api/v1/rate-targets?${q}`, token);
}

export async function apiCreateRateTarget(token: string, data: object): Promise<RateTarget> {
  return apiFetch<RateTarget>('/api/v1/rate-targets', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateRateTarget(token: string, id: number, data: object): Promise<RateTarget> {
  return apiFetch<RateTarget>(`/api/v1/rate-targets/${id}`, token, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiToggleRateTarget(token: string, id: number): Promise<RateTarget> {
  return apiFetch<RateTarget>(`/api/v1/rate-targets/${id}/toggle`, token, { method: 'PATCH' });
}

export async function apiGetActiveProducts(token: string): Promise<MasterItem[]> {
  return apiFetch<MasterItem[]>('/api/v1/master/products/active', token);
}

export async function apiGetActiveCustomers(token: string): Promise<MasterItem[]> {
  return apiFetch<MasterItem[]>('/api/v1/master/customers/active', token);
}

export async function apiGetActiveProcesses(token: string): Promise<MasterItem[]> {
  return apiFetch<MasterItem[]>('/api/v1/master/processes/active', token);
}

// ─── MORNING PLAN ────────────────────────────────────

export interface MorningPlan {
  id: number;
  date: string;
  shiftId: number;
  processId: number;
  department: string | null;
  totalManpower: number;
  supervisorId: number | null;
  notes: string | null;
  status: 'DRAFT' | 'FINAL';
  createdById: number;
  createdAt: string;
  updatedAt: string;
  shift: { id: number; name: string; type: string };
  process: { id: number; code: string; name: string };
  supervisor: { id: number; name: string; employeeCode: string } | null;
  createdBy: { id: number; name: string; employeeCode: string };
}

export interface MorningPlanSummary {
  date: string;
  totalManpower: number;
  count: number;
  byProcess: {
    process: { id: number; code: string; name: string };
    shift: { id: number; name: string; type: string };
    totalManpower: number;
    status: string;
    department: string | null;
  }[];
}

export interface Supervisor {
  id: number;
  name: string;
  employeeCode: string;
  designation: string | null;
}

export async function apiGetMorningPlans(
  token: string,
  query?: { date?: string; shiftId?: number; processId?: number; status?: string; page?: number; limit?: number }
): Promise<PaginatedResponse<MorningPlan> & { summary: { total: number; totalManpower: number; draft: number; final: number } }> {
  const q = new URLSearchParams();
  if (query?.date) q.set('date', query.date);
  if (query?.shiftId) q.set('shiftId', String(query.shiftId));
  if (query?.processId) q.set('processId', String(query.processId));
  if (query?.status) q.set('status', query.status);
  if (query?.page) q.set('page', String(query.page));
  if (query?.limit) q.set('limit', String(query.limit));
  return apiFetch(`/api/v1/morning-plans?${q}`, token);
}

export async function apiGetMorningPlanSummary(token: string, date: string): Promise<MorningPlanSummary> {
  return apiFetch(`/api/v1/morning-plans/summary?date=${date}`, token);
}

export async function apiCreateMorningPlan(token: string, data: object): Promise<MorningPlan> {
  return apiFetch('/api/v1/morning-plans', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateMorningPlan(token: string, id: number, data: object): Promise<MorningPlan> {
  return apiFetch(`/api/v1/morning-plans/${id}`, token, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiFinalizeMorningPlan(token: string, id: number): Promise<MorningPlan> {
  return apiFetch(`/api/v1/morning-plans/${id}/finalize`, token, { method: 'PATCH' });
}

export async function apiGetSupervisors(token: string): Promise<Supervisor[]> {
  return apiFetch('/api/v1/morning-plans/supervisors', token);
}

// ─── LINE ALLOCATION ─────────────────────────────────

export interface LineAllocation {
  id: number;
  date: string;
  shiftId: number;
  processId: number;
  lineId: number;
  productId: number;
  customerId: number;
  allocatedCount: number;
  supervisorId: number | null;
  notes: string | null;
  status: 'DRAFT' | 'FINAL';
  createdById: number;
  createdAt: string;
  updatedAt: string;
  shift: { id: number; name: string; type: string };
  process: { id: number; code: string; name: string };
  line: { id: number; code: string; name: string };
  product: { id: number; code: string; name: string };
  customer: { id: number; code: string; name: string };
  supervisor: { id: number; name: string; employeeCode: string } | null;
  createdBy: { id: number; name: string; employeeCode: string };
}

export interface AllocationBalance {
  morningPlanTotal: number;
  allocated: number;
  balance: number;
  hasMorningPlan: boolean;
  morningPlanStatus: string | null;
}

export async function apiGetLineAllocations(
  token: string,
  query?: { date?: string; shiftId?: number; processId?: number; lineId?: number; status?: string; page?: number; limit?: number }
): Promise<PaginatedResponse<LineAllocation> & { totalAllocated: number }> {
  const q = new URLSearchParams();
  if (query?.date) q.set('date', query.date);
  if (query?.shiftId) q.set('shiftId', String(query.shiftId));
  if (query?.processId) q.set('processId', String(query.processId));
  if (query?.lineId) q.set('lineId', String(query.lineId));
  if (query?.status) q.set('status', query.status);
  if (query?.page) q.set('page', String(query.page));
  if (query?.limit) q.set('limit', String(query.limit));
  return apiFetch(`/api/v1/line-allocations?${q}`, token);
}

export async function apiGetAllocationBalance(
  token: string,
  date: string,
  shiftId: number,
  processId: number,
): Promise<AllocationBalance> {
  return apiFetch(`/api/v1/line-allocations/balance?date=${date}&shiftId=${shiftId}&processId=${processId}`, token);
}

export async function apiCreateLineAllocation(token: string, data: object): Promise<LineAllocation> {
  return apiFetch('/api/v1/line-allocations', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateLineAllocation(token: string, id: number, data: object): Promise<LineAllocation> {
  return apiFetch(`/api/v1/line-allocations/${id}`, token, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiFinalizeLineAllocation(token: string, id: number): Promise<LineAllocation> {
  return apiFetch(`/api/v1/line-allocations/${id}/finalize`, token, { method: 'PATCH' });
}

export async function apiGetActiveLines(token: string): Promise<MasterItem[]> {
  return apiFetch<MasterItem[]>('/api/v1/master/lines/active', token);
}

// ─── MANPOWER MOVEMENT ───────────────────────────────

export interface ManpowerMovement {
  id: number;
  date: string;
  shiftId: number;
  processId: number;
  fromLineId: number;
  toLineId: number;
  productId: number;
  customerId: number;
  manpowerCount: number;
  movementTime: string;
  reason: string | null;
  notes: string | null;
  isReversed: boolean;
  reversalNotes: string | null;
  beforeFromLine: number;
  afterFromLine: number;
  beforeToLine: number;
  afterToLine: number;
  createdAt: string;
  shift: { id: number; name: string; type: string };
  process: { id: number; code: string; name: string };
  fromLine: { id: number; code: string; name: string };
  toLine: { id: number; code: string; name: string };
  product: { id: number; code: string; name: string };
  customer: { id: number; code: string; name: string };
  approvedBy: { id: number; name: string; employeeCode: string } | null;
  reversedBy: { id: number; name: string; employeeCode: string } | null;
  createdBy: { id: number; name: string; employeeCode: string };
}

export interface LineStatus {
  lines: {
    line: { id: number; code: string; name: string };
    allocated: number;
    movedOut: number;
    movedIn: number;
    current: number;
  }[];
  totalAllocated: number;
  totalMoved: number;
  movementCount: number;
}

export async function apiGetMovements(
  token: string,
  query?: { date?: string; shiftId?: number; processId?: number; fromLineId?: number; toLineId?: number; page?: number; limit?: number }
): Promise<PaginatedResponse<ManpowerMovement> & { totalMoved: number }> {
  const q = new URLSearchParams();
  if (query?.date) q.set('date', query.date);
  if (query?.shiftId) q.set('shiftId', String(query.shiftId));
  if (query?.processId) q.set('processId', String(query.processId));
  if (query?.fromLineId) q.set('fromLineId', String(query.fromLineId));
  if (query?.toLineId) q.set('toLineId', String(query.toLineId));
  if (query?.page) q.set('page', String(query.page));
  if (query?.limit) q.set('limit', String(query.limit));
  return apiFetch(`/api/v1/manpower-movements?${q}`, token);
}

export async function apiGetLineStatus(
  token: string,
  date: string,
  shiftId: number,
  processId: number,
): Promise<LineStatus> {
  return apiFetch(`/api/v1/manpower-movements/line-status?date=${date}&shiftId=${shiftId}&processId=${processId}`, token);
}

export async function apiCreateMovement(token: string, data: object): Promise<ManpowerMovement> {
  return apiFetch('/api/v1/manpower-movements', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiReverseMovement(token: string, id: number, reversalNotes: string): Promise<ManpowerMovement> {
  return apiFetch(`/api/v1/manpower-movements/${id}/reverse`, token, {
    method: 'PATCH',
    body: JSON.stringify({ reversalNotes }),
  });
}
