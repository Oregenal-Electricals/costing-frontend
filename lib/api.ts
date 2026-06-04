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
      const msg = typeof error?.message === 'string'
        ? error.message
        : Array.isArray(error?.message)
        ? error.message.join(', ')
        : 'Invalid credentials. Please check and try again.';
      throw new Error(msg);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Invalid credentials. Please check and try again.') throw e;
      throw new Error('Invalid credentials. Please check and try again.');
    }
  }

  return res.json();
}

export async function apiGetMe(token: string): Promise<AuthUser> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Cannot connect to server.');
  }

  if (!res.ok) throw new Error('Unauthorized');

  const data = await res.json();
  return data.user;
}
