import { useState, useMemo } from 'react';
import {
  Building2, Plus, ChevronRight, Briefcase, MapPin, Clock,
  LogOut, Settings, Upload, X, Crown, Edit3, Eye, Sun, Moon, History, Shield,
  Database,
} from 'lucide-react';
import { leases as leasesInit } from '@/data/mock';
import { useTheme } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { compressImageFile } from '@/lib/imageUtils';
import { SearchWithSuggestions, type SuggestionItem } from '@/components/SearchWithSuggestions';
import VersionHistoryModal from '@/components/VersionHistoryModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { MeResponse, AssignedPortfolio } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

export type PortfolioRole = 'owner' | 'editor' | 'viewer';

export interface ClientPortfolio {
  id: number;
  name: string;
  clientName: string;
  market: string;
  status: 'Active' | 'Archived';
  color: string;
}

// ── Role Config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<PortfolioRole, { label: string; icon: typeof Crown; color: string; bgColor: string }> = {
  owner:  { label: 'Owner',  icon: Crown, color: '#F59E0B', bgColor: '#F59E0B20' },
  editor: { label: 'Editor', icon: Edit3, color: '#3B82F6', bgColor: '#3B82F620' },
  viewer: { label: 'Viewer', icon: Eye,   color: '#6B7280', bgColor: '#6B728020' },
};

const PORTFOLIO_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];

function getRoleBadge(role: PortfolioRole) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-medium text-[10px] px-1.5 py-0.5"
      style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function toClientPortfolio(p: AssignedPortfolio, idx: number): ClientPortfolio {
  return {
    id: p.id,
    name: p.name,
    clientName: p.clientName || 'Unassigned',
    market: p.market || 'TBD',
    status: p.status,
    color: PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length],
  };
}

// ── Main Component ───────────────────────────────────────────────────────────

interface ClientPortalProps {
  session: MeResponse;
  onSelectPortfolio: (portfolio: ClientPortfolio & { userRole: PortfolioRole }) => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export default function ClientPortal({ session, onSelectPortfolio, onLogout, onOpenAdmin }: ClientPortalProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const qc = useQueryClient();

  const isAdmin = session.user.role === 'admin';
  const displayName = session.user.name || session.user.email;
  const initials = (session.user.name || session.user.email)
    .split(/[\s@.]+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // Server is the source of truth for which portfolios this user may see.
  const portfolios = useMemo<(ClientPortfolio & { userRole: PortfolioRole })[]>(
    () => session.portfolios.map((p, i) => ({ ...toClientPortfolio(p, i), userRole: p.assignmentRole as PortfolioRole })),
    [session.portfolios],
  );

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newMarket, setNewMarket] = useState('');
  const [logo, setLogo] = useState<string>('/transwestern-logo-primary.png');

  const createPortfolio = useMutation({
    mutationFn: async (data: { name: string; clientName: string; market: string }) => {
      const res = await apiRequest('POST', '/api/admin/portfolios', data);
      return res.json();
    },
    onSuccess: () => {
      // Refresh session so the new portfolio appears (admins see all).
      qc.invalidateQueries();
      window.location.reload();
    },
  });

  // Portfolio-wide lease totals. Reads the same persisted `cre_leases` source the
  // Property Database uses (falling back to the seed dataset) so the home cards
  // stay in sync with the Property Database's full-portfolio Total Leases / Total SF.
  const { leaseCount, totalSqft } = useMemo(() => {
    let src: Array<{ sqft: number }> = leasesInit as Array<{ sqft: number }>;
    try {
      const raw = typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem('cre_leases') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) src = parsed;
      }
    } catch { /* fall back to seed */ }
    return {
      leaseCount: src.length,
      totalSqft: src.reduce((s, l) => s + (Number(l.sqft) || 0), 0),
    };
  }, []);
  const fmtSqft = (n: number) => `${new Intl.NumberFormat('en-US').format(n)} SF`;

  const filtered = portfolios.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.market.toLowerCase().includes(q)
    );
  });

  const searchSuggestions: SuggestionItem[] = useMemo(
    () => portfolios.map((p) => ({ id: `p:${p.id}`, primary: p.name, secondary: p.clientName, address: p.market })),
    [portfolios],
  );

  const handleAdd = () => {
    if (!newName.trim()) return;
    createPortfolio.mutate({ name: newName.trim(), clientName: newClient.trim(), market: newMarket.trim() });
    setNewName(''); setNewClient(''); setNewMarket('');
    setShowAddModal(false);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await compressImageFile(file, { maxDimension: 320, quality: 0.85, targetMaxBytes: 40 * 1024, minQuality: 0.6, minDimension: 200 });
    setLogo(dataUrl);
  };

  return (
    <TooltipProvider delayDuration={0}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-[hsl(222,47%,11%)] dark:via-[hsl(222,47%,13%)] dark:to-[hsl(221,83%,18%)]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <div className="relative group">
                <img
                  src={logo}
                  alt="Company logo"
                  className="h-9 max-w-[180px] object-contain dark:brightness-0 dark:invert"
                />
                <button onClick={() => setLogo('')} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer group" title="Upload logo">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-shadow">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
              </label>
            )}
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">Client Portal</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenAdmin}
                className="h-8 gap-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/[0.06]"
                data-testid="button-open-admin"
              >
                <Shield className="w-3.5 h-3.5" />Admin
              </Button>
            )}
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-white/60 dark:hover:text-white"
              aria-label="Toggle theme"
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/[0.06]">
                  <Avatar className="w-6 h-6"><AvatarFallback className="bg-blue-500 text-white text-xs font-bold">{initials}</AvatarFallback></Avatar>
                  <span className="text-xs hidden sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-xs font-normal text-muted-foreground">{session.user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={onOpenAdmin} data-testid="menu-admin">
                    <Shield className="w-3.5 h-3.5 mr-2" />Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem><Settings className="w-3.5 h-3.5 mr-2" />Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVersionHistoryOpen(true)} data-testid="menu-version-history">
                  <History className="w-3.5 h-3.5 mr-2" />Version History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-500 focus:text-red-500" data-testid="menu-logout">
                  <LogOut className="w-3.5 h-3.5 mr-2" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Title Section */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Portfolios</h2>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-1">
              {isAdmin ? 'Select a portfolio to manage or create a new one' : 'Select a portfolio to view'}
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/20 h-9 gap-2 text-xs"
              data-testid="button-add-portfolio"
            >
              <Plus className="w-4 h-4" />Add New Portfolio
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="mb-6 max-w-md">
          <SearchWithSuggestions
            value={search}
            onChange={setSearch}
            items={searchSuggestions}
            onSelect={(_id, item) => setSearch(item.primary)}
            placeholder="Search portfolios, clients, or markets…"
            testIdPrefix="portal-search"
            maxResults={10}
          />
        </div>

        {/* Portfolio Grid */}
        {filtered.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
            <Briefcase className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-white/20" />
            <p className="text-sm font-medium text-slate-500 dark:text-white/40">
              {isAdmin ? 'No portfolios yet. Create one to get started.' : 'No portfolios have been assigned to your account yet.'}
            </p>
            {!isAdmin && <p className="text-xs text-slate-400 dark:text-white/25 mt-1">Contact your administrator for access.</p>}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(portfolio => (
            <div
              key={portfolio.id}
              className="relative group text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] dark:border-white/[0.06] dark:hover:border-white/[0.12] dark:hover:shadow-lg dark:hover:shadow-black/20 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              data-testid={`card-portfolio-${portfolio.id}`}
            >
              <button
                onClick={() => onSelectPortfolio(portfolio)}
                className="w-full text-left p-5 pb-3"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${portfolio.color}20` }}>
                      <Briefcase className="w-5 h-5" style={{ color: portfolio.color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300 transition-colors truncate">
                        {portfolio.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-white/40 truncate">{portfolio.clientName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getRoleBadge(portfolio.userRole)}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 dark:text-white/20 dark:group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400 dark:text-white/25" />
                    <span className="text-xs text-slate-600 dark:text-white/50">{portfolio.market}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-slate-400 dark:text-white/25" />
                    <span className="text-xs text-slate-600 dark:text-white/50">{portfolio.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400 dark:text-white/25" />
                    <span className="text-xs text-slate-600 dark:text-white/50">Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Database className="w-3 h-3 text-slate-400 dark:text-white/25 shrink-0" />
                    <span className="text-xs text-slate-500 dark:text-white/40">Total Leases</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-white/70 ml-auto">{leaseCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 className="w-3 h-3 text-slate-400 dark:text-white/25 shrink-0" />
                    <span className="text-xs text-slate-500 dark:text-white/40">Total SF</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-white/70 ml-auto truncate">{fmtSqft(totalSqft)}</span>
                  </div>
                </div>
              </button>
            </div>
          ))}

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 dark:border-white/[0.08] dark:hover:border-blue-400/30 rounded-xl p-5 flex flex-col items-center justify-center min-h-[180px] transition-all duration-200 hover:bg-white/60 dark:hover:bg-white/[0.02] group"
              data-testid="button-add-portfolio-card"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-50 dark:bg-white/[0.04] dark:group-hover:bg-blue-500/10 flex items-center justify-center mb-3 transition-colors">
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-600 dark:text-white/20 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              <p className="text-sm font-medium text-slate-500 group-hover:text-slate-700 dark:text-white/30 dark:group-hover:text-white/50 transition-colors">Add New Portfolio</p>
              <p className="text-[10px] text-slate-400 dark:text-white/15 mt-1">Create a new client portfolio</p>
            </button>
          )}
        </div>
        )}
      </div>

      {/* Add Portfolio Modal (admin only) */}
      {showAddModal && (
        <Dialog open onOpenChange={() => setShowAddModal(false)}>
          <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 dark:bg-[hsl(222,47%,13%)] dark:border-white/[0.1] dark:text-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500 dark:text-blue-400" />Add New Portfolio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-white/50">Portfolio Name</label>
                <Input placeholder="e.g. Northeast Office Portfolio" value={newName} onChange={e => setNewName(e.target.value)}
                  className="h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white dark:placeholder:text-white/25" data-testid="input-new-portfolio-name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-white/50">Client Name</label>
                <Input placeholder="e.g. Acme Corporation" value={newClient} onChange={e => setNewClient(e.target.value)}
                  className="h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white dark:placeholder:text-white/25" data-testid="input-new-client-name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-white/50">Market / Region</label>
                <Input placeholder="e.g. Southeast, National" value={newMarket} onChange={e => setNewMarket(e.target.value)}
                  className="h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white dark:placeholder:text-white/25" data-testid="input-new-market" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/[0.06]" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white"
                  onClick={handleAdd} disabled={!newName.trim() || createPortfolio.isPending} data-testid="button-confirm-add-portfolio">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Create Portfolio
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/80 dark:border-white/[0.04] dark:bg-[hsl(222,47%,10%)]/80 backdrop-blur-sm py-3">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-[10px] text-slate-500 dark:text-white/20">
          <span>Client Dashboard</span>
          <span>{portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''} &middot; &copy; {new Date().getFullYear()}</span>
        </div>
      </div>
      <VersionHistoryModal open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen} />
    </div>
    </TooltipProvider>
  );
}
