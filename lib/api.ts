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
    const msg =
      typeof error?.message === 'string'
        ? error.message
        : Array.isArray(error?.message)
        ? error.message.join(', ')
        : 'Something went wrong';
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
