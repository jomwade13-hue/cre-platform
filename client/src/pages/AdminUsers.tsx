import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, LogOut, Plus, Shield, ShieldCheck, UserPlus, Trash2, KeyRound,
  UserCheck, UserX, Briefcase, Sun, Moon, Copy, Check, X,
} from 'lucide-react';
import { useTheme } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { AppRole, AssignmentRole } from '@/lib/auth';

interface AdminPortfolio {
  id: number;
  name: string;
  clientName: string | null;
  market: string | null;
  status: 'Active' | 'Archived';
  assignmentRole?: AssignmentRole;
}

interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  portfolios: AdminPortfolio[];
}

const ROLE_OPTIONS: AssignmentRole[] = ['owner', 'editor', 'viewer'];

function initialsOf(u: AdminUser) {
  return (u.name || u.email).split(/[\s@.]+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

interface AdminUsersProps {
  onBack: () => void;
  onLogout: () => void;
}

export default function AdminUsers({ onBack, onLogout }: AdminUsersProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const qc = useQueryClient();
  const { toast } = useToast();

  const usersQuery = useQuery<AdminUser[]>({ queryKey: ['/api/admin/users'] });
  const portfoliosQuery = useQuery<AdminPortfolio[]>({ queryKey: ['/api/admin/portfolios'] });

  const [showCreate, setShowCreate] = useState(false);
  const [assignFor, setAssignFor] = useState<AdminUser | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
    qc.invalidateQueries({ queryKey: ['/api/admin/portfolios'] });
  };

  const setActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest('PATCH', `/api/admin/users/${id}`, { isActive });
    },
    onSuccess: invalidate,
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const resetPassword = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await apiRequest('PATCH', `/api/admin/users/${id}`, { password });
    },
    onSuccess: () => { invalidate(); toast({ title: 'Password reset', description: 'The new password is active immediately.' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => { await apiRequest('DELETE', `/api/admin/users/${id}`); },
    onSuccess: invalidate,
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const users = usersQuery.data ?? [];
  const portfolios = portfoliosQuery.data ?? [];

  const handleResetPassword = (u: AdminUser) => {
    const pw = window.prompt(`Enter a new password for ${u.email} (min 8 chars):`);
    if (!pw) return;
    if (pw.length < 8) { toast({ title: 'Too short', description: 'Password must be at least 8 characters.', variant: 'destructive' }); return; }
    resetPassword.mutate({ id: u.id, password: pw });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-[hsl(222,47%,11%)] dark:via-[hsl(222,47%,13%)] dark:to-[hsl(221,83%,18%)]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 gap-1.5 text-xs text-slate-600 dark:text-white/60" data-testid="button-admin-back">
              <ChevronLeft className="w-3.5 h-3.5" />All Portfolios
            </Button>
            <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">Admin — User Management</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/[0.06] dark:text-white/60"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="h-8 gap-1.5 text-xs text-red-500" data-testid="button-admin-logout">
              <LogOut className="w-3.5 h-3.5" />Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Client Accounts</h2>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-1">Create logins and control which portfolios each client can access.</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/20 h-9 gap-2 text-xs"
            data-testid="button-create-user"
          >
            <UserPlus className="w-4 h-4" />New Client Account
          </Button>
        </div>

        {usersQuery.isLoading ? (
          <p className="text-sm text-slate-500 dark:text-white/40">Loading…</p>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <div
                key={u.id}
                className="bg-white border border-slate-200 dark:bg-white/[0.04] dark:border-white/[0.06] rounded-xl p-4 flex items-center gap-4"
                data-testid={`row-user-${u.id}`}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-blue-500 text-white text-xs font-bold">{initialsOf(u)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.name || u.email}</p>
                    {u.role === 'admin' ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]"><ShieldCheck className="w-3 h-3" />Admin</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Client</Badge>
                    )}
                    {!u.isActive && <Badge variant="destructive" className="text-[10px]">Disabled</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40 truncate">{u.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {u.portfolios.length === 0 ? (
                      <span className="text-[10px] text-slate-400 dark:text-white/25">{u.role === 'admin' ? 'Sees all portfolios' : 'No portfolios assigned'}</span>
                    ) : u.portfolios.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-600 dark:text-white/60">
                        <Briefcase className="w-2.5 h-2.5" />{p.name}
                        <span className="text-slate-400 dark:text-white/30">· {p.assignmentRole}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.role !== 'admin' && (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAssignFor(u)} data-testid={`button-assign-${u.id}`}>
                      <Briefcase className="w-3.5 h-3.5" />Portfolios
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-user-menu-${u.id}`}>
                        <span className="text-lg leading-none">⋯</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleResetPassword(u)} data-testid={`menu-reset-${u.id}`}>
                        <KeyRound className="w-3.5 h-3.5 mr-2" />Reset password
                      </DropdownMenuItem>
                      {u.isActive ? (
                        <DropdownMenuItem onClick={() => setActive.mutate({ id: u.id, isActive: false })} data-testid={`menu-disable-${u.id}`}>
                          <UserX className="w-3.5 h-3.5 mr-2" />Disable account
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setActive.mutate({ id: u.id, isActive: true })} data-testid={`menu-enable-${u.id}`}>
                          <UserCheck className="w-3.5 h-3.5 mr-2" />Enable account
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={() => { if (window.confirm(`Delete ${u.email}? This cannot be undone.`)) deleteUser.mutate(u.id); }}
                        data-testid={`menu-delete-${u.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />Delete account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onCreated={invalidate}
        />
      )}
      {assignFor && (
        <AssignPortfoliosDialog
          user={assignFor}
          allPortfolios={portfolios}
          onClose={() => setAssignFor(null)}
          onChanged={invalidate}
        />
      )}
    </div>
  );
}

// ── Create User Dialog ─────────────────────────────────────────────────────────

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let p = '';
    const arr = new Uint32Array(16);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 16; i++) p += chars[arr[i] % chars.length];
    setPassword(p);
  };

  const create = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/admin/users', { email: email.trim(), name: name.trim(), password, role: 'client' });
    },
    onSuccess: () => { onCreated(); toast({ title: 'Client created', description: `${email} can now sign in.` }); onClose(); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const copy = () => { navigator.clipboard?.writeText(password).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 dark:bg-[hsl(222,47%,13%)] dark:border-white/[0.1] dark:text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-500" />New Client Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-white/50">Email</label>
            <Input type="email" placeholder="client@company.com" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-create-email"
              className="h-10 bg-slate-50 border-slate-200 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-white/50">Full Name (optional)</label>
            <Input placeholder="e.g. Jane Smith" value={name} onChange={e => setName(e.target.value)} data-testid="input-create-name"
              className="h-10 bg-slate-50 border-slate-200 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-white/50">Temporary Password (min 8 chars)</label>
            <div className="flex gap-2">
              <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Set or generate" data-testid="input-create-password"
                className="h-10 bg-slate-50 border-slate-200 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white" />
              <Button type="button" variant="outline" size="sm" className="h-10 px-2.5" onClick={generate} data-testid="button-generate-password">Generate</Button>
              <Button type="button" variant="outline" size="sm" className="h-10 px-2.5" onClick={copy} disabled={!password}>
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-white/30">Share this with the client securely. They can sign in immediately.</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              disabled={!email.trim() || password.length < 8 || create.isPending}
              onClick={() => create.mutate()} data-testid="button-confirm-create-user">
              <Plus className="w-3.5 h-3.5 mr-1.5" />Create Account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Assign Portfolios Dialog ───────────────────────────────────────────────────

function AssignPortfoliosDialog({ user, allPortfolios, onClose, onChanged }: {
  user: AdminUser;
  allPortfolios: AdminPortfolio[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [portfolioId, setPortfolioId] = useState<string>('');
  const [role, setRole] = useState<AssignmentRole>('viewer');

  const assigned = new Map(user.portfolios.map(p => [p.id, p.assignmentRole]));
  const available = allPortfolios.filter(p => !assigned.has(p.id));

  const assign = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/admin/users/${user.id}/assignments`, { portfolioId: Number(portfolioId), role });
    },
    onSuccess: () => { onChanged(); setPortfolioId(''); setRole('viewer'); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const unassign = useMutation({
    mutationFn: async (pid: number) => { await apiRequest('DELETE', `/api/admin/users/${user.id}/assignments/${pid}`); },
    onSuccess: onChanged,
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 dark:bg-[hsl(222,47%,13%)] dark:border-white/[0.1] dark:text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-500" />Portfolios — {user.name || user.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 mt-2 max-h-[280px] overflow-y-auto pr-1">
          {user.portfolios.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-white/30 py-2">No portfolios assigned yet.</p>
          )}
          {user.portfolios.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03]" data-testid={`assigned-${p.id}`}>
              <Briefcase className="w-4 h-4 text-slate-400 dark:text-white/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-white/40">{p.clientName}</p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">{p.assignmentRole}</Badge>
              <button
                onClick={() => unassign.mutate(p.id)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500"
                data-testid={`button-unassign-${p.id}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-white/[0.06] pt-3 mt-1">
          <p className="text-xs font-medium text-slate-600 dark:text-white/50 mb-2">Assign a portfolio</p>
          <div className="flex gap-2">
            <Select value={portfolioId} onValueChange={setPortfolioId}>
              <SelectTrigger className="h-9 flex-1 text-xs" data-testid="select-portfolio">
                <SelectValue placeholder={available.length ? 'Select portfolio' : 'All portfolios assigned'} />
              </SelectTrigger>
              <SelectContent>
                {available.map(p => <SelectItem key={p.id} value={String(p.id)} className="text-xs">{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={(v) => setRole(v as AssignmentRole)}>
              <SelectTrigger className="h-9 w-[110px] text-xs" data-testid="select-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm" className="h-9 bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              disabled={!portfolioId || assign.isPending}
              onClick={() => assign.mutate()}
              data-testid="button-confirm-assign"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
