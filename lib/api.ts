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

// ─── PRODUCTION ENTRY ────────────────────────────────

export interface ProductionEntry {
  id: number;
  date: string;
  shiftId: number;
  timeSlotId: number;
  processId: number;
  lineId: number;
  productId: number;
  customerId: number;
  supervisorId: number | null;
  manpowerCount: number;
  shiftHours: string;
  actualOutput: string;
  rejectedQty: string;
  remarks: string | null;
  notes: string | null;
  hourlyRate: string;
  targetPerHour: string;
  ratePerPiece: string;
  totalManHours: string;
  labourCost: string;
  targetOutput: string;
  difference: string;
  achievementPct: string;
  targetLabourCostPerUnit: string;
  actualLabourCostPerUnit: string;
  allowedLabourCost: string;
  labourGainLoss: string;
  status: 'PROFIT' | 'LOSS' | 'NEUTRAL';
  isCorrected: boolean;
  createdAt: string;
  shift: { id: number; name: string; type: string };
  timeSlot: { id: number; label: string; startTime: string; endTime: string };
  process: { id: number; code: string; name: string };
  line: { id: number; code: string; name: string };
  product: { id: number; code: string; name: string; unit: string };
  customer: { id: number; code: string; name: string };
  supervisor: { id: number; name: string; employeeCode: string } | null;
  createdBy: { id: number; name: string; employeeCode: string };
}

export interface ProductionPreview {
  rateTarget: {
    hourlyRate: number;
    targetPerHour: number;
    ratePerPiece: number;
    effectiveFrom: string;
  };
  calculations: {
    totalManHours: number;
    labourCost: number;
    targetOutput: number;
    difference: number;
    achievementPct: number;
    targetLabourCostPerUnit: number;
    actualLabourCostPerUnit: number;
    allowedLabourCost: number;
    labourGainLoss: number;
    status: string;
  };
}

export interface PreloadData {
  manpowerCount: number;
  supervisorId: number | null;
  supervisor: { id: number; name: string; employeeCode: string } | null;
  hasAllocation: boolean;
  allocationStatus: string | null;
}

export interface TimeSlotOption {
  id: number;
  label: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

export async function apiGetProductionEntries(
  token: string,
  query?: {
    date?: string; shiftId?: number; processId?: number;
    lineId?: number; productId?: number; customerId?: number;
    status?: string; page?: number; limit?: number;
  }
): Promise<PaginatedResponse<ProductionEntry> & {
  summary: { totalEntries: number; profit: number; loss: number; neutral: number; totalOutput: number; totalGainLoss: number }
}> {
  const q = new URLSearchParams();
  if (query?.date) q.set('date', query.date);
  if (query?.shiftId) q.set('shiftId', String(query.shiftId));
  if (query?.processId) q.set('processId', String(query.processId));
  if (query?.lineId) q.set('lineId', String(query.lineId));
  if (query?.productId) q.set('productId', String(query.productId));
  if (query?.customerId) q.set('customerId', String(query.customerId));
  if (query?.status) q.set('status', query.status);
  if (query?.page) q.set('page', String(query.page));
  if (query?.limit) q.set('limit', String(query.limit));
  return apiFetch(`/api/v1/production-entries?${q}`, token);
}

export async function apiPreviewProductionEntry(token: string, data: object): Promise<ProductionPreview> {
  return apiFetch('/api/v1/production-entries/preview', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiGetPreloadData(
  token: string, date: string, shiftId: number, processId: number, lineId: number
): Promise<PreloadData> {
  return apiFetch(`/api/v1/production-entries/preload?date=${date}&shiftId=${shiftId}&processId=${processId}&lineId=${lineId}`, token);
}

export async function apiGetTimeSlots(token: string, shiftId: number): Promise<TimeSlotOption[]> {
  return apiFetch(`/api/v1/production-entries/time-slots?shiftId=${shiftId}`, token);
}

export async function apiCreateProductionEntry(token: string, data: object): Promise<ProductionEntry> {
  return apiFetch('/api/v1/production-entries', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateProductionEntry(token: string, id: number, data: object): Promise<ProductionEntry> {
  return apiFetch(`/api/v1/production-entries/${id}`, token, { method: 'PUT', body: JSON.stringify(data) });
}

// ─── CORRECTIONS ─────────────────────────────────────

export interface CorrectionRequest {
  id: number;
  productionEntryId: number;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  productionEntry: {
    id: number;
    date: string;
    product: { id: number; name: string; code: string };
    customer: { id: number; name: string };
    process: { id: number; name: string };
    line: { id: number; name: string };
    shift: { id: number; name: string };
  };
  requestedBy: { id: number; name: string; employeeCode: string };
  approvedBy: { id: number; name: string; employeeCode: string } | null;
}

export interface CorrectableField {
  field: string;
  label: string;
}

export async function apiGetCorrections(
  token: string,
  query?: { status?: string; productionEntryId?: number; page?: number; limit?: number }
): Promise<PaginatedResponse<CorrectionRequest> & { summary: { pending: number; approved: number; rejected: number } }> {
  const q = new URLSearchParams();
  if (query?.status) q.set('status', query.status);
  if (query?.productionEntryId) q.set('productionEntryId', String(query.productionEntryId));
  if (query?.page) q.set('page', String(query.page));
  if (query?.limit) q.set('limit', String(query.limit));
  return apiFetch(`/api/v1/corrections?${q}`, token);
}

export async function apiGetCorrectableFields(token: string): Promise<CorrectableField[]> {
  return apiFetch('/api/v1/corrections/fields', token);
}

export async function apiCreateCorrection(token: string, data: object): Promise<CorrectionRequest> {
  return apiFetch('/api/v1/corrections', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiApproveCorrection(token: string, id: number, remarks?: string): Promise<CorrectionRequest> {
  return apiFetch(`/api/v1/corrections/${id}/approve`, token, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  });
}

export async function apiRejectCorrection(token: string, id: number, remarks?: string): Promise<CorrectionRequest> {
  return apiFetch(`/api/v1/corrections/${id}/reject`, token, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  });
}

// ─── REPORTS ─────────────────────────────────────────

export interface ReportSummary {
  totalEntries: number;
  totalManpower: number;
  totalTargetOutput: number;
  totalActualOutput: number;
  totalLabourCost: number;
  totalGainLoss: number;
  profit: number;
  loss: number;
  neutral: number;
  avgAchievement: number;
}

export interface ReportQuery {
  dateFrom?: string;
  dateTo?: string;
  shiftId?: number;
  processId?: number;
  lineId?: number;
  productId?: number;
  customerId?: number;
  createdById?: number;
  page?: number;
  limit?: number;
}

function buildReportQuery(q?: ReportQuery): string {
  const params = new URLSearchParams();
  if (q?.dateFrom) params.set('dateFrom', q.dateFrom);
  if (q?.dateTo) params.set('dateTo', q.dateTo);
  if (q?.shiftId) params.set('shiftId', String(q.shiftId));
  if (q?.processId) params.set('processId', String(q.processId));
  if (q?.lineId) params.set('lineId', String(q.lineId));
  if (q?.productId) params.set('productId', String(q.productId));
  if (q?.customerId) params.set('customerId', String(q.customerId));
  if (q?.createdById) params.set('createdById', String(q.createdById));
  if (q?.page) params.set('page', String(q.page));
  if (q?.limit) params.set('limit', String(q.limit));
  return params.toString();
}

export async function apiGetDailyReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/daily?${buildReportQuery(q)}`, token);
}
export async function apiGetHourlyReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/hourly?${buildReportQuery(q)}`, token);
}
export async function apiGetLineReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/line?${buildReportQuery(q)}`, token);
}
export async function apiGetProductReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/product?${buildReportQuery(q)}`, token);
}
export async function apiGetProcessReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/process?${buildReportQuery(q)}`, token);
}
export async function apiGetCustomerReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/customer?${buildReportQuery(q)}`, token);
}
export async function apiGetMonthlyReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/monthly?${buildReportQuery(q)}`, token);
}
export async function apiGetUserReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/user?${buildReportQuery(q)}`, token);
}
export async function apiGetSnapshotDaily(token: string, date: string) {
  return apiFetch<any>(`/api/v1/reports/snapshot/daily?date=${date}`, token);
}
export async function apiGetSnapshotHourly(token: string, date: string) {
  return apiFetch<any>(`/api/v1/reports/snapshot/hourly?date=${date}`, token);
}
export async function apiGetSnapshotProduct(token: string, date: string) {
  return apiFetch<any>(`/api/v1/reports/snapshot/product?date=${date}`, token);
}
export async function apiGetSnapshotProcess(token: string, date: string) {
  return apiFetch<any>(`/api/v1/reports/snapshot/process?date=${date}`, token);
}
export async function apiGetSnapshotCustomer(token: string, date: string) {
  return apiFetch<any>(`/api/v1/reports/snapshot/customer?date=${date}`, token);
}

// ─── DASHBOARD ───────────────────────────────────────
export async function apiGetDashboard(token: string, date: string) {
  return apiFetch<any>(`/api/v1/reports/dashboard?date=${date}`, token);
}

// ─── AUDIT LOG ───────────────────────────────────────
export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  tableName: string;
  moduleLabel: string;
  recordId: number | null;
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    employeeCode: string;
    role: { name: string };
  };
}

export interface AuditStats {
  total: number;
  todayCount: number;
  byAction: { action: string; count: number }[];
  byTable: { tableName: string; label: string; count: number }[];
}

export async function apiGetAuditLogs(
  token: string,
  query?: {
    dateFrom?: string; dateTo?: string;
    userId?: number; action?: string; tableName?: string;
    page?: number; limit?: number;
  }
): Promise<PaginatedResponse<AuditLog> & {
  filters: { actions: string[]; tables: { value: string; label: string }[] }
}> {
  const q = new URLSearchParams();
  if (query?.dateFrom) q.set('dateFrom', query.dateFrom);
  if (query?.dateTo) q.set('dateTo', query.dateTo);
  if (query?.userId) q.set('userId', String(query.userId));
  if (query?.action) q.set('action', query.action);
  if (query?.tableName) q.set('tableName', query.tableName);
  if (query?.page) q.set('page', String(query.page));
  if (query?.limit) q.set('limit', String(query.limit));
  return apiFetch(`/api/v1/audit?${q}`, token);
}

export async function apiGetAuditStats(token: string): Promise<AuditStats> {
  return apiFetch('/api/v1/audit/stats', token);
}

// ─── BACKUP ──────────────────────────────────────────
export interface BackupFile {
  fileName: string;
  size: number;
  sizeHuman: string;
  createdAt: string;
}

export interface BackupStats {
  totalBackups: number;
  lastBackup: BackupFile | null;
  totalSize: number;
  database: {
    users: number;
    products: number;
    customers: number;
    productionEntries: number;
  };
}

export async function apiGetBackupStats(token: string): Promise<BackupStats> {
  return apiFetch('/api/v1/backup/stats', token);
}

export async function apiListBackups(token: string): Promise<BackupFile[]> {
  return apiFetch('/api/v1/backup/list', token);
}

export async function apiCreateBackup(token: string): Promise<object> {
  return apiFetch('/api/v1/backup/create', token, { method: 'POST' });
}

export function getBackupDownloadUrl(fileName: string): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return `${API_URL}/api/v1/backup/download/${fileName}`;
}

// ─── NOTIFICATIONS ───────────────────────────────────
export interface Alert {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  link?: string;
  count?: number;
  createdAt: string;
}

export interface NotificationSummary {
  total: number;
  error: number;
  warning: number;
  info: number;
  alerts: Alert[];
}

export async function apiGetNotifications(token: string): Promise<Alert[]> {
  return apiFetch('/api/v1/notifications', token);
}

export async function apiGetNotificationSummary(token: string): Promise<NotificationSummary> {
  return apiFetch('/api/v1/notifications/summary', token);
}

// ─── SETTINGS ────────────────────────────────────────
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  updatedAt: string;
}

export async function apiGetSettings(token: string): Promise<{ settings: SystemSetting[]; grouped: Record<string, SystemSetting[]> }> {
  return apiFetch('/api/v1/settings', token);
}

export async function apiUpdateSettings(token: string, updates: { key: string; value: string }[]): Promise<SystemSetting[]> {
  return apiFetch('/api/v1/settings', token, {
    method: 'PUT',
    body: JSON.stringify({ updates }),
  });
}

export async function apiGetPublicSettings(): Promise<Record<string, string>> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${API_URL}/api/v1/settings/public`);
  return res.json();
}

// ─── IMPORT ──────────────────────────────────────────
export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
  skippedRows: string[];
}

export async function apiImportData(
  token: string,
  type: string,
  rows: Record<string, unknown>[]
): Promise<ImportResult> {
  return apiFetch(`/api/v1/import/${type}`, token, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

// ─── SPARE MP REPORT ─────────────────────────────────
export interface SpareMPReport {
  date: string;
  processes: {
    process: { id: number; name: string };
    shift: { id: number; name: string };
    totalProcessMP: number;
    allocatedMP: number;
    spareMP: number;
    totalSpareMPCost: number;
    totalDirectCost: number;
    totalTrueCost: number;
    totalTrueGainLoss: number;
    totalActualOutput: number;
    totalTargetOutput: number;
    lines: {
      line: { id: number; name: string };
      product: { id: number; name: string };
      manpowerCount: number;
      lineSharePct: number;
      spareMPCost: number;
      directCost: number;
      trueTotalCost: number;
      actualOutput: number;
      targetOutput: number;
      achievementPct: number;
      trueGainLoss: number;
      trueStatus: string;
    }[];
  }[];
  summary: {
    totalSpareMPCost: number;
    totalDirectCost: number;
    totalTrueCost: number;
    totalTrueGainLoss: number;
  };
}

export async function apiGetSpareMPReport(
  token: string,
  date: string,
  shiftId?: number,
  processId?: number,
): Promise<SpareMPReport> {
  const q = new URLSearchParams({ date });
  if (shiftId) q.set('shiftId', String(shiftId));
  if (processId) q.set('processId', String(processId));
  return apiFetch(`/api/v1/production-entries/spare-mp-report?${q}`, token);
}

// ─── PER PIECE COST REPORT ───────────────────────────
export async function apiGetPerPieceCostReport(token: string, q?: ReportQuery) {
  return apiFetch<any>(`/api/v1/reports/per-piece-cost?${buildReportQuery(q)}`, token);
}
