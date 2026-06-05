import { apiRequest } from './queryClient';

export type AppRole = 'admin' | 'client';
export type AssignmentRole = 'owner' | 'editor' | 'viewer';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
}

export interface AssignedPortfolio {
  id: number;
  name: string;
  clientName: string | null;
  market: string | null;
  status: 'Active' | 'Archived';
  createdAt: string;
  assignmentRole: AssignmentRole;
}

export interface MeResponse {
  user: AuthUser;
  portfolios: AssignedPortfolio[];
}

const API_BASE = '__PORT_5000__'.startsWith('__') ? '' : '__PORT_5000__';

export async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function login(email: string, password: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let message = 'Invalid email or password. Please try again.';
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
}
