import { useState, useMemo, useEffect } from 'react';
import {
  Building2, Plus, ChevronRight, Briefcase, MapPin, Clock, Users,
  Search, LogOut, Settings, Upload, X, Mail, Shield, ShieldCheck,
  Eye, Edit3, Trash2, UserPlus, Crown, ChevronDown, ChevronUp, Check, Copy,
  MoreHorizontal, UserX, ArrowUpRight, Sun, Moon, History, GripVertical
} from 'lucide-react';
import { useTheme } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { DoubleClickToEdit } from '@/components/DoubleClickToEdit';
import { usePersistedState } from '@/lib/usePersistedState';
import { idbDeleteByPrefix } from '@/lib/useIDBPersistedState';
import type { SessionUser } from './LoginPage';
import { compressImageFile } from '@/lib/imageUtils';
import { ImageIcon } from 'lucide-react';
import { SearchWithSuggestions, type SuggestionItem } from '@/components/SearchWithSuggestions';
import VersionHistoryModal from '@/components/VersionHistoryModal';

// Lightweight lease shape for address-autocomplete in ClientPortal.
interface PortalLease {
  id: number;
  tenant: string;
  property: string;
  address: string;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type PortfolioRole = 'owner' | 'editor' | 'viewer';

export interface PortfolioUser {
  id: number;
  name: string;
  email: string;
  initials: string;
  color: string;
  avatarUrl?: string;
  /** Temporary password created by the Invite flow so this user can sign in. */
  password?: string;
}

export interface PortfolioAssignment {
  userId: number;
  portfolioId: number;
  role: PortfolioRole;
  invitedAt: string;
  invitedBy: string;
}

export interface ClientPortfolio {
  id: number;
  name: string;
  clientName: string;
  locations: number;
  totalSF: string;
  market: string;
  lastUpdated: string;
  status: 'Active' | 'Archived';
  color: string;
  logo?: string;        // Optional client/portfolio logo (data URL)
}

// ── Role Config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<PortfolioRole, { label: string; description: string; icon: typeof Crown; color: string; bgColor: string }> = {
  owner:  { label: 'Owner',  description: 'Full access — manage team, settings, and all data', icon: Crown,       color: '#F59E0B', bgColor: '#F59E0B20' },
  editor: { label: 'Editor', description: 'Edit properties, initiatives, roadmap, and QBR data',  icon: Edit3,       color: '#3B82F6', bgColor: '#3B82F620' },
  viewer: { label: 'Viewer', description: 'View-only access — cannot modify any data',            icon: Eye,         color: '#6B7280', bgColor: '#6B728020' },
};

// ── Seed Data ────────────────────────────────────────────────────────────────

const CURRENT_USER: PortfolioUser = {
  id: 1, name: 'Jordan Wade', email: 'jomwade13@icloud.com', initials: 'JW', color: '#3B82F6',
};

const SEED_USERS: PortfolioUser[] = [
  CURRENT_USER,
  { id: 2, name: 'Alisha Shields', email: 'alisha.shields@transcendcre.com', initials: 'AS', color: '#8B5CF6' },
  { id: 3, name: 'Matt Epperson',  email: 'matt.epperson@transcendcre.com',  initials: 'ME', color: '#10B981' },
  { id: 4, name: 'Travis Hilty',   email: 'travis.hilty@transcendcre.com',   initials: 'TH', color: '#F59E0B' },
  { id: 5, name: 'Sarah Stieferman', email: 'sarah.s@transcendcre.com',      initials: 'SS', color: '#EC4899' },
];

const SEED_ASSIGNMENTS: PortfolioAssignment[] = [
  { userId: 1, portfolioId: 1, role: 'owner',  invitedAt: '2025-01-15', invitedBy: 'System' },
  { userId: 2, portfolioId: 1, role: 'editor', invitedAt: '2025-03-01', invitedBy: 'Jordan Wade' },
  { userId: 3, portfolioId: 1, role: 'viewer', invitedAt: '2025-06-10', invitedBy: 'Jordan Wade' },
];

const INITIAL_PORTFOLIOS: ClientPortfolio[] = [
  { id: 1, name: 'Learfield Portfolio', clientName: 'Learfield Communications', locations: 166, totalSF: '389,572 SF', market: 'National', lastUpdated: 'Today', status: 'Active', color: '#3B82F6' },
];

const PORTFOLIO_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'];
const AVATAR_COLORS    = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#A855F7'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Per-portfolio data isolation ─────────────────────────────────────────────
// Portfolio #1 (the original Learfield portfolio) keeps the legacy un-suffixed
// storage keys so existing data is untouched. Every other portfolio stores its
// data under `<key>__p<portfolioId>` so portfolios never share or overwrite
// each other's leases, notes, photos, or QBR entries.
export function portfolioDataKey(base: string, portfolioId: number): string {
  return portfolioId === 1 ? base : `${base}__p${portfolioId}`;
}

const PORTFOLIO_LOCAL_KEYS = [
  'cre_leases', 'cre_lease_notes', 'cre_qbr_entries', 'cre_manual_dates',
  'cre_milestones', 'cre_pm_stage_plans', 'cre_critical_items', 'cre_decom_data',
  'cre_tracked_fields', 'cre_client_leads',
] as const;
const PORTFOLIO_IDB_KEYS = ['cre_lease_documents', 'cre_lease_photos', 'cre_client_logos'] as const;

/** Read a portfolio's lease list straight from localStorage (no state coupling). */
function readPortfolioLeases(portfolioId: number): any[] {
  try {
    const raw = window.localStorage.getItem(portfolioDataKey('cre_leases', portfolioId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

/** Permanently remove every stored data key belonging to a portfolio. */
function purgePortfolioData(portfolioId: number): void {
  try {
    PORTFOLIO_LOCAL_KEYS.forEach(base => {
      window.localStorage.removeItem(portfolioDataKey(base, portfolioId));
    });
  } catch { /* best-effort */ }
  PORTFOLIO_IDB_KEYS.forEach(base => {
    idbDeleteByPrefix(portfolioDataKey(base, portfolioId)).catch(() => { /* best-effort */ });
  });
}

// ── Tracked categories (per-portfolio field configuration) ──────────────────
export interface TrackedField { key: string; label: string; custom?: boolean }

/** Standard categories available in the picklist — keys mirror lease record fields. */
export const STANDARD_CATEGORIES: TrackedField[] = [
  { key: 'tenant', label: 'Tenant' },
  { key: 'property', label: 'Property' },
  { key: 'address', label: 'Address' },
  { key: 'sqft', label: 'SF' },
  { key: 'rentPSF', label: 'Rent PSF' },
  { key: 'totalRent', label: 'Annual Rent' },
  { key: 'leaseStart', label: 'Lease Start' },
  { key: 'leaseEnd', label: 'Lease Expiration' },
  { key: 'type', label: 'Type' },
  { key: 'clientLead', label: 'Client Lead' },
  { key: 'status', label: 'Status' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'stage', label: 'Stage' },
  { key: 'market', label: 'Market' },
  { key: 'submarket', label: 'Submarket' },
  { key: 'floors', label: 'Floors' },
  { key: 'broker', label: 'Broker' },
  { key: 'lat', label: 'Latitude' },
  { key: 'lng', label: 'Longitude' },
  { key: 'costarId', label: 'CoStar ID' },
  { key: 'recordId', label: 'Record ID' },
  { key: 'division', label: 'Division' },
  { key: 'manager', label: 'Manager' },
  { key: 'suite', label: 'Suite' },
  { key: 'rentType', label: 'Rent Type' },
  { key: 'baseRent', label: 'Base Rent (Monthly)' },
  { key: 'nextOptionEnd', label: 'Next Option End Date' },
  { key: 'renewalActionDate', label: 'Renewal Action Date' },
  { key: 'terminationActionDate', label: 'Termination Action Date' },
  { key: 'restoration', label: 'Restoration / Surrender' },
  { key: 'landlordName', label: 'Landlord Name' },
  { key: 'landlordCell', label: 'Landlord Cell' },
];

const DEFAULT_TRACKED_KEYS = ['tenant', 'property', 'address', 'sqft', 'leaseStart', 'leaseEnd', 'type', 'clientLead', 'status', 'strategy', 'stage', 'market'];
export const DEFAULT_TRACKED_FIELDS: TrackedField[] = STANDARD_CATEGORIES.filter(c => DEFAULT_TRACKED_KEYS.includes(c.key));

/** Generate a friendly temporary password for invited users. */
function generateTempPassword(): string {
  const words = ['Maple', 'Summit', 'Harbor', 'Crest', 'Atlas', 'Beacon', 'Quarry', 'Meridian'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}${n}`;
}

function getRoleBadge(role: PortfolioRole, size: 'sm' | 'md' = 'sm') {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
      style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  );
}

// ── Invite User Modal ────────────────────────────────────────────────────────

function InviteModal({ portfolioId, portfolioName, existingUserIds, users, onInvite, onClose }: {
  portfolioId: number;
  portfolioName: string;
  existingUserIds: Set<number>;
  users: PortfolioUser[];
  onInvite: (email: string, name: string, role: PortfolioRole) => { password?: string };
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [role, setRole]   = useState<PortfolioRole>('viewer');
  const [sent, setSent]   = useState(false);
  const [sentPassword, setSentPassword] = useState<string | undefined>(undefined);
  const [credsCopied, setCredsCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Check if the email matches a known user already in the portfolio
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  const alreadyAssigned = existingUser && existingUserIds.has(existingUser.id);

  const appLink = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  const handleInvite = () => {
    if (!email.trim()) return;
    const n = name.trim() || existingUser?.name || email.split('@')[0];
    const result = onInvite(email.trim(), n, role);
    setSentPassword(result?.password);
    setSent(true);
  };

  const credentialText = `You've been invited to the ${portfolioName} dashboard (${ROLE_CONFIG[role].label} access).\n\nOpen: ${appLink}\nEmail: ${email.trim().toLowerCase()}\nTemporary password: ${sentPassword ?? '(their existing password)'}`;

  const handleCopyCreds = () => {
    navigator.clipboard?.writeText(credentialText).catch(() => {});
    setCredsCopied(true);
    setTimeout(() => setCredsCopied(false), 2000);
  };

  const handleEmailDraft = () => {
    const subject = encodeURIComponent(`Invitation: ${portfolioName} dashboard`);
    const body = encodeURIComponent(credentialText);
    window.location.href = `mailto:${email.trim()}?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(appLink).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 dark:bg-[hsl(222,47%,13%)] dark:border-white/[0.1] dark:text-white">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            Invite to {portfolioName}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Access Created</p>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">{email} now has {ROLE_CONFIG[role].label} access to {portfolioName}.</p>
            <div className="mt-4 text-left bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-white/30">Sign-in details to share</p>
              <p className="text-xs text-slate-700 dark:text-white/70">Link: <span className="font-medium break-all">{appLink}</span></p>
              <p className="text-xs text-slate-700 dark:text-white/70">Email: <span className="font-medium">{email.trim().toLowerCase()}</span></p>
              <p className="text-xs text-slate-700 dark:text-white/70">Password: <span className="font-mono font-semibold">{sentPassword ?? 'uses their existing password'}</span></p>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleCopyCreds} data-testid="button-copy-credentials">
                {credsCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {credsCopied ? 'Copied' : 'Copy Details'}
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white" onClick={handleEmailDraft} data-testid="button-email-invite">
                <Mail className="w-3 h-3" />Email Invite
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-white/50">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/25" />
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white dark:placeholder:text-white/25"
                  data-testid="input-invite-email"
                />
              </div>
              {alreadyAssigned && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />This user already has access to this portfolio.
                </p>
              )}
            </div>

            {/* Name (optional, auto-fills if known) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-white/50">Full Name <span className="text-slate-400 dark:text-white/25">(optional)</span></label>
              <Input
                placeholder={existingUser?.name || 'e.g. Jane Smith'}
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-white dark:placeholder:text-white/25"
                data-testid="input-invite-name"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 dark:text-white/50">Permission Level</label>
              <div className="space-y-1.5">
                {(['editor', 'viewer'] as PortfolioRole[]).map(r => {
                  const cfg = ROLE_CONFIG[r];
                  const Icon = cfg.icon;
                  const selected = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                        selected
                          ? 'border-blue-500/50 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]'
                      }`}
                      data-testid={`button-role-${r}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.bgColor }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${selected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-white/70'}`}>{cfg.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-white/35">{cfg.description}</p>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shareable Link */}
            <div className="border-t border-slate-200 dark:border-white/[0.06] pt-3 mt-1">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 h-8 text-xs text-slate-500 hover:text-slate-800 dark:text-white/40 dark:hover:text-white/60 transition-colors"
              >
                {linkCopied ? <Check className="w-3 h-3 text-green-500 dark:text-green-400" /> : <Copy className="w-3 h-3" />}
                {linkCopied ? 'Link Copied' : 'Copy Invite Link'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/[0.06]" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white gap-1.5"
                onClick={handleInvite}
                disabled={!email.trim() || !!alreadyAssigned}
                data-testid="button-send-invite"
              >
                <Mail className="w-3.5 h-3.5" />Send Invite
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Manage Team Modal ────────────────────────────────────────────────────────

function ManageTeamModal({ portfolioId, portfolioName, users, assignments, onChangeRole, onRemove, onOpenInvite, onClose }: {
  portfolioId: number;
  portfolioName: string;
  users: PortfolioUser[];
  assignments: PortfolioAssignment[];
  onChangeRole: (userId: number, newRole: PortfolioRole) => void;
  onRemove: (userId: number) => void;
  onOpenInvite: () => void;
  onClose: () => void;
}) {
  const portfolioAssignments = assignments
    .filter(a => a.portfolioId === portfolioId)
    .sort((a, b) => {
      const order: Record<PortfolioRole, number> = { owner: 0, editor: 1, viewer: 2 };
      return order[a.role] - order[b.role];
    });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 dark:bg-[hsl(222,47%,13%)] dark:border-white/[0.1] dark:text-white">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            Team — {portfolioName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 mt-2 max-h-[380px] overflow-y-auto pr-1">
          {portfolioAssignments.map(assignment => {
            const user = users.find(u => u.id === assignment.userId);
            if (!user) return null;
            const isOwner = assignment.role === 'owner';
            const isCurrentUser = user.id === CURRENT_USER.id;

            return (
              <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] group transition-colors">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="text-xs font-bold text-white" style={{ backgroundColor: user.color }}>
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                    {user.name}
                    {isCurrentUser && <span className="text-slate-400 dark:text-white/25 ml-1">(you)</span>}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-white/35 truncate">{user.email}</p>
                </div>

                {isOwner ? (
                  getRoleBadge('owner', 'sm')
                ) : (
                  <Select
                    value={assignment.role}
                    onValueChange={(v: string) => onChangeRole(user.id, v as PortfolioRole)}
                  >
                    <SelectTrigger className="h-7 w-[100px] text-[10px] bg-slate-100 border-slate-200 text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor" className="text-xs">
                        <span className="flex items-center gap-1.5"><Edit3 className="w-3 h-3" />Editor</span>
                      </SelectItem>
                      <SelectItem value="viewer" className="text-xs">
                        <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" />Viewer</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {!isOwner && !isCurrentUser && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-white/20 dark:hover:text-white/60 dark:hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-all">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onRemove(user.id)} className="text-red-500 dark:text-red-400 focus:text-red-500 dark:focus:text-red-400">
                        <UserX className="w-3.5 h-3.5 mr-2" />Remove from portfolio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/[0.06]">
          <p className="text-[10px] text-slate-500 dark:text-white/25">{portfolioAssignments.length} member{portfolioAssignments.length !== 1 ? 's' : ''}</p>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white gap-1.5 text-xs"
            onClick={() => { onClose(); setTimeout(onOpenInvite, 150); }}
            data-testid="button-invite-from-team"
          >
            <UserPlus className="w-3.5 h-3.5" />Invite User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface ClientPortalProps {
  currentUser: SessionUser;
  onSelectPortfolio: (portfolio: ClientPortfolio & { userRole: PortfolioRole }) => void;
  onLogout: () => void;
}

export default function ClientPortal({ currentUser, onSelectPortfolio, onLogout }: ClientPortalProps) {
  const isAdmin = currentUser.email.toLowerCase() === CURRENT_USER.email.toLowerCase();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const [portfolios, setPortfolios]       = usePersistedState<ClientPortfolio[]>('cre_portfolios', INITIAL_PORTFOLIOS);
  const [users, setUsers]                 = usePersistedState<PortfolioUser[]>('cre_users', SEED_USERS);
  const [assignments, setAssignments]     = usePersistedState<PortfolioAssignment[]>('cre_assignments', SEED_ASSIGNMENTS);

  // Ensure the admin account (jomwade13@icloud.com / CURRENT_USER) is owner of
  // every portfolio. Promotes any stale viewer/editor records, and adds
  // missing assignments so newly seeded portfolios are also owned.
  useEffect(() => {
    if (!isAdmin) return;
    setAssignments(prev => {
      let changed = false;
      const next = prev.map(a => {
        if (a.userId === CURRENT_USER.id && a.role !== 'owner') {
          changed = true;
          return { ...a, role: 'owner' as PortfolioRole };
        }
        return a;
      });
      const ownedPids = new Set(next.filter(a => a.userId === CURRENT_USER.id).map(a => a.portfolioId));
      portfolios.forEach(p => {
        if (!ownedPids.has(p.id)) {
          next.push({
            userId: CURRENT_USER.id,
            portfolioId: p.id,
            role: 'owner',
            invitedAt: new Date().toISOString().slice(0, 10),
            invitedBy: 'System',
          });
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // Make sure the admin user record itself exists in the users list.
    setUsers(prev => prev.find(u => u.id === CURRENT_USER.id) ? prev : [CURRENT_USER, ...prev]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolios.length]);

  const [search, setSearch]               = useState('');
  const [showAddModal, setShowAddModal]   = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [newName, setNewName]             = useState('');
  const [newClient, setNewClient]         = useState('');
  const [newMarket, setNewMarket]         = useState('');
  const [newLogo, setNewLogo]             = useState<string>('');
  const [newTrackedFields, setNewTrackedFields] = useState<TrackedField[]>(DEFAULT_TRACKED_FIELDS);
  const [newCustomField, setNewCustomField]     = useState('');

  const addTrackedField = (f: TrackedField) =>
    setNewTrackedFields(prev => prev.some(x => x.key === f.key) ? prev : [...prev, f]);
  const removeTrackedField = (key: string) =>
    setNewTrackedFields(prev => prev.filter(f => f.key !== key));
  const moveTrackedField = (key: string, dir: -1 | 1) =>
    setNewTrackedFields(prev => {
      const i = prev.findIndex(f => f.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  // Drag-and-drop reordering for the tracked-categories list
  const [dragFieldKey, setDragFieldKey] = useState<string | null>(null);
  const handleFieldDragOver = (overKey: string) => {
    if (!dragFieldKey || dragFieldKey === overKey) return;
    setNewTrackedFields(prev => {
      const from = prev.findIndex(f => f.key === dragFieldKey);
      const to = prev.findIndex(f => f.key === overKey);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const addCustomTrackedField = () => {
    const label = newCustomField.trim();
    if (!label) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!slug) return;
    addTrackedField({ key: `custom_${slug}`, label, custom: true });
    setNewCustomField('');
  };
  const [logo, setLogo]                   = useState<string>('/transwestern-logo-primary.png');
  const [invitePortfolioId, setInvitePortfolioId] = useState<number | null>(null);
  const [teamPortfolioId, setTeamPortfolioId]     = useState<number | null>(null);

  // Read leases (set inside the active portfolio dashboard) so we can search by address/tenant/property.
  // Read directly from localStorage — do NOT use usePersistedState here, since it writes the initial value
  // and would overwrite the seed leases written by PortfolioTracker.
  const leasesData = useMemo<PortalLease[]>(() => {
    if (typeof window === 'undefined') return [];
    const all: PortalLease[] = [];
    portfolios.forEach(p => { readPortfolioLeases(p.id).forEach(l => all.push(l)); });
    return all;
  // Re-read whenever search or the portfolio list changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, portfolios]);

  // Live per-portfolio stats (location count + total SF) computed from each
  // portfolio's own isolated lease data — always current, never stale.
  const portfolioStats = useMemo<Record<number, { locations: number; totalSF: string }>>(() => {
    const out: Record<number, { locations: number; totalSF: string }> = {};
    portfolios.forEach(p => {
      const leases = readPortfolioLeases(p.id);
      const sf = leases.reduce((sum: number, l: any) => sum + (Number(l?.sqft) || 0), 0);
      out[p.id] = { locations: leases.length, totalSF: `${sf.toLocaleString()} SF` };
    });
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolios, search]);

  // Invited (non-admin) users only see portfolios they've been given access to.
  const visiblePortfolios = isAdmin
    ? portfolios
    : portfolios.filter(p => assignments.some(a => a.portfolioId === p.id && a.userId === currentUser.id));

  const filtered = visiblePortfolios.filter(p => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.clientName.toLowerCase().includes(q)) return true;
    if (p.market.toLowerCase().includes(q)) return true;
    // Also match if any lease matches the search (currently shared across portfolios).
    return leasesData.some(l =>
      (l.tenant && l.tenant.toLowerCase().includes(q)) ||
      (l.property && l.property.toLowerCase().includes(q)) ||
      (l.address && l.address.toLowerCase().includes(q))
    );
  });

  // Combined suggestion list — portfolios first, then leases (deduped by primary).
  const searchSuggestions: SuggestionItem[] = useMemo(() => {
    const items: SuggestionItem[] = [];
    portfolios.forEach(p => {
      items.push({ id: `p:${p.id}`, primary: p.name, secondary: p.clientName, address: p.market });
    });
    leasesData.forEach(l => {
      items.push({ id: `l:${l.id}`, primary: l.tenant || l.property || l.address || '', secondary: l.property, address: l.address });
    });
    return items;
  }, [portfolios, leasesData]);

  // Lookup helpers
  const getPortfolioAssignments = (pid: number) => assignments.filter(a => a.portfolioId === pid);
  const getPortfolioUsers = (pid: number) => {
    const pAssignments = getPortfolioAssignments(pid);
    return pAssignments.map(a => {
      const u = users.find(u => u.id === a.userId);
      return u ? { ...u, role: a.role } : null;
    }).filter(Boolean) as (PortfolioUser & { role: PortfolioRole })[];
  };
  const getCurrentUserRole = (pid: number): PortfolioRole => {
    const a = assignments.find(a => a.portfolioId === pid && a.userId === currentUser.id);
    // The admin account is always the owner; invited users fall back to viewer
    // until an assignment says otherwise.
    return a?.role ?? (isAdmin ? 'owner' : 'viewer');
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Pending delete portfolio (shown in confirmation modal)
  const [deletePortfolioId, setDeletePortfolioId] = useState<number | null>(null);

  const handleDeletePortfolio = (id: number) => {
    setPortfolios(prev => prev.filter(p => p.id !== id));
    setAssignments(prev => prev.filter(a => a.portfolioId !== id));
    // Remove only THIS portfolio's data keys — other portfolios are untouched.
    purgePortfolioData(id);
    setDeletePortfolioId(null);
  };

  const handlePortfolioLogoUpload = async (id: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await compressImageFile(file, { maxDimension: 320, quality: 0.85, targetMaxBytes: 40 * 1024, minQuality: 0.6, minDimension: 200 });
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, logo: dataUrl } : p));
  };

  const handleRemovePortfolioLogo = (id: number) => {
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, logo: undefined } : p));
  };

  const handleChangePortfolioColor = (id: number, color: string) => {
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, color } : p));
  };

  const handleUpdatePortfolioField = <K extends keyof ClientPortfolio>(id: number, field: K, value: ClientPortfolio[K]) => {
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newId = Date.now();
    const newPortfolio: ClientPortfolio = {
      id: newId,
      name: newName.trim(),
      clientName: newClient.trim() || 'Unassigned',
      locations: 0,
      totalSF: '0 SF',
      market: newMarket.trim() || 'TBD',
      lastUpdated: 'Just now',
      status: 'Active',
      color: PORTFOLIO_COLORS[portfolios.length % PORTFOLIO_COLORS.length],
      logo: newLogo || undefined,
    };
    setPortfolios(prev => [...prev, newPortfolio]);
    // Auto-assign creator as owner
    setAssignments(prev => [...prev, {
      userId: currentUser.id,
      portfolioId: newId,
      role: 'owner' as PortfolioRole,
      invitedAt: new Date().toISOString().slice(0, 10),
      invitedBy: 'System',
    }]);
    // Save this portfolio's tracked-category configuration (drives its columns
    // and the mass-import field list, in this exact order).
    try {
      window.localStorage.setItem(`cre_tracked_fields__p${newId}`, JSON.stringify(newTrackedFields));
    } catch { /* best-effort */ }
    setNewName(''); setNewClient(''); setNewMarket(''); setNewLogo('');
    setNewTrackedFields(DEFAULT_TRACKED_FIELDS); setNewCustomField('');
    setShowAddModal(false);
  };

  const handleInvite = (portfolioId: number, email: string, name: string, role: PortfolioRole): { password?: string } => {
    // Check if user already exists
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    let password: string | undefined = user?.password;
    if (!user) {
      password = generateTempPassword();
      user = {
        id: Date.now(),
        name,
        email: email.toLowerCase(),
        initials: getInitials(name),
        color: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
        password,
      };
      setUsers(prev => [...prev, user!]);
    } else if (!user.password) {
      // Existing user without a password (e.g. seeded) — give them one now.
      password = generateTempPassword();
      const uid = user.id;
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, password } : u));
    }
    // Add assignment
    setAssignments(prev => {
      // Remove any existing assignment for this user/portfolio
      const without = prev.filter(a => !(a.userId === user!.id && a.portfolioId === portfolioId));
      return [...without, {
        userId: user!.id,
        portfolioId,
        role,
        invitedAt: new Date().toISOString().slice(0, 10),
        invitedBy: currentUser.name,
      }];
    });
    return { password };
  };

  const handleChangeRole = (portfolioId: number, userId: number, newRole: PortfolioRole) => {
    setAssignments(prev =>
      prev.map(a => a.userId === userId && a.portfolioId === portfolioId ? { ...a, role: newRole } : a)
    );
  };

  const handleRemoveUser = (portfolioId: number, userId: number) => {
    setAssignments(prev => prev.filter(a => !(a.userId === userId && a.portfolioId === portfolioId)));
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await compressImageFile(file, { maxDimension: 320, quality: 0.85, targetMaxBytes: 40 * 1024, minQuality: 0.6, minDimension: 200 });
    setLogo(dataUrl);
  };

  // ── Invite/Team targets ────────────────────────────────────────────────────
  const invitePortfolio = portfolios.find(p => p.id === invitePortfolioId);
  const teamPortfolio   = portfolios.find(p => p.id === teamPortfolioId);

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
                  <Avatar className="w-6 h-6"><AvatarFallback className="bg-blue-500 text-white text-xs font-bold">{getInitials(currentUser.name)}</AvatarFallback></Avatar>
                  <span className="text-xs hidden sm:inline">{currentUser.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="font-semibold">{currentUser.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">{currentUser.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Settings className="w-3.5 h-3.5 mr-2" />Settings</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setVersionHistoryOpen(true)}
                  data-testid="menu-version-history"
                >
                  <History className="w-3.5 h-3.5 mr-2" />Version History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-500 focus:text-red-500">
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
            <p className="text-sm text-slate-500 dark:text-white/40 mt-1">Select a portfolio to manage or create a new one</p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/20 h-9 gap-2 text-xs"
            data-testid="button-add-portfolio"
          >
            <Plus className="w-4 h-4" />Add New Portfolio
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-md">
          <SearchWithSuggestions
            value={search}
            onChange={setSearch}
            items={searchSuggestions}
            onSelect={(_id, item) => {
              // For portfolios: set search to portfolio name. For leases: set to address/property so the user can pick.
              setSearch(item.primary);
            }}
            placeholder="Search portfolios, clients, markets, or addresses…"
            testIdPrefix="portal-search"
            maxResults={10}
          />
        </div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(portfolio => {
            const pUsers = getPortfolioUsers(portfolio.id);
            const myRole = getCurrentUserRole(portfolio.id);
            const canManage = myRole === 'owner' || myRole === 'editor';

            return (
              <div
                key={portfolio.id}
                className="relative group text-left bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] dark:border-white/[0.06] dark:hover:border-white/[0.12] dark:hover:shadow-lg dark:hover:shadow-black/20 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                data-testid={`card-portfolio-${portfolio.id}`}
              >
                {/* Owner-only actions menu */}
                {myRole === 'owner' && (
                  <div className="absolute top-3 right-3 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={e => e.stopPropagation()}
                          className="w-7 h-7 rounded-md flex items-center justify-center bg-white/0 hover:bg-slate-100 text-slate-400 hover:text-slate-700 dark:hover:bg-white/[0.08] dark:text-white/40 dark:hover:text-white transition-colors"
                          aria-label="Portfolio actions"
                          data-testid={`button-portfolio-actions-${portfolio.id}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56" onClick={e => e.stopPropagation()}>
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-white/40">Customize</DropdownMenuLabel>
                        <label className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06]">
                          <Upload className="w-3.5 h-3.5 mr-2" />
                          {portfolio.logo ? 'Replace logo' : 'Upload logo'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handlePortfolioLogoUpload(portfolio.id, f); e.currentTarget.value = ''; }}
                            data-testid={`input-portfolio-logo-${portfolio.id}`}
                          />
                        </label>
                        {portfolio.logo && (
                          <DropdownMenuItem onClick={() => handleRemovePortfolioLogo(portfolio.id)} data-testid={`button-remove-portfolio-logo-${portfolio.id}`}>
                            <X className="w-3.5 h-3.5 mr-2" />Remove logo
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-white/40">Card color</DropdownMenuLabel>
                        <div className="grid grid-cols-4 gap-1.5 px-2 py-1.5">
                          {PORTFOLIO_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => handleChangePortfolioColor(portfolio.id, c)}
                              className={`w-7 h-7 rounded-md flex items-center justify-center transition-transform hover:scale-110 ${portfolio.color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-[hsl(222,47%,13%)]' : ''}`}
                              style={{ backgroundColor: c }}
                              aria-label={`Set color ${c}`}
                              data-testid={`button-portfolio-color-${portfolio.id}-${c}`}
                            >
                              {portfolio.color === c && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          ))}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletePortfolioId(portfolio.id)}
                          className="text-red-500 dark:text-red-400 focus:text-red-500 dark:focus:text-red-400"
                          data-testid={`button-delete-portfolio-${portfolio.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />Delete portfolio
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                {/* Clickable main area */}
                <button
                  onClick={() => onSelectPortfolio({ ...portfolio, userRole: myRole })}
                  className="w-full text-left p-5 pb-3"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {portfolio.logo ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 dark:border-white/[0.06] flex items-center justify-center shrink-0">
                          <img src={portfolio.logo} alt={`${portfolio.clientName} logo`} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${portfolio.color}20` }}>
                          <Briefcase className="w-5 h-5" style={{ color: portfolio.color }} />
                        </div>
                      )}
                      <div className="min-w-0" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300 transition-colors truncate">
                          <DoubleClickToEdit
                            value={portfolio.name}
                            onSave={v => handleUpdatePortfolioField(portfolio.id, 'name', v)}
                            disabled={myRole !== 'owner'}
                            ariaLabel="Portfolio name"
                            testId={`portfolio-name-${portfolio.id}`}
                          />
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate">
                          <DoubleClickToEdit
                            value={portfolio.clientName}
                            onSave={v => handleUpdatePortfolioField(portfolio.id, 'clientName', v)}
                            disabled={myRole !== 'owner'}
                            ariaLabel="Client name"
                            testId={`portfolio-client-${portfolio.id}`}
                          />
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 shrink-0 ${myRole === 'owner' ? 'pr-8' : ''}`}>
                      {getRoleBadge(myRole)}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 dark:text-white/20 dark:group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 dark:text-white/25" />
                      <span className="text-xs text-slate-600 dark:text-white/50">{(portfolioStats[portfolio.id]?.locations ?? portfolio.locations)} locations</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-slate-400 dark:text-white/25" />
                      <span className="text-xs text-slate-600 dark:text-white/50">{portfolioStats[portfolio.id]?.totalSF ?? portfolio.totalSF}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-white/25" />
                      <span className="text-xs text-slate-600 dark:text-white/50">{portfolio.lastUpdated}</span>
                    </div>
                  </div>
                </button>

                {/* Team footer */}
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-200 dark:border-white/[0.04]">
                  <div className="flex items-center gap-1">
                    {/* Avatar stack */}
                    <div className="flex -space-x-1.5">
                      {pUsers.slice(0, 4).map(u => (
                        <Tooltip key={u.id}>
                          <TooltipTrigger asChild>
                            <div className="w-6 h-6 rounded-full border-2 border-white dark:border-[hsl(222,47%,13%)] flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: u.color }}>
                              {u.initials}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-[10px]">
                            {u.name} — {ROLE_CONFIG[u.role].label}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {pUsers.length > 4 && (
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 text-slate-600 dark:border-[hsl(222,47%,13%)] dark:bg-white/10 dark:text-white/50 flex items-center justify-center text-[9px]">
                          +{pUsers.length - 4}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setTeamPortfolioId(portfolio.id); }}
                      className="ml-1 text-[10px] text-slate-500 hover:text-slate-800 dark:text-white/30 dark:hover:text-white/60 transition-colors"
                      data-testid={`button-manage-team-${portfolio.id}`}
                    >
                      {pUsers.length} member{pUsers.length !== 1 ? 's' : ''}
                    </button>
                  </div>

                  {canManage && (
                    <button
                      onClick={e => { e.stopPropagation(); setInvitePortfolioId(portfolio.id); }}
                      className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400/60 dark:hover:text-blue-400 transition-colors"
                      data-testid={`button-invite-${portfolio.id}`}
                    >
                      <UserPlus className="w-3 h-3" />Invite
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Card */}
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
        </div>
      </div>

      {/* Add Portfolio Modal */}
      {showAddModal && (
        <Dialog open onOpenChange={() => setShowAddModal(false)}>
          <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto bg-white border-slate-200 text-slate-900 dark:bg-[hsl(222,47%,13%)] dark:border-white/[0.1] dark:text-white">
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-white/50">Portfolio Logo (optional)</label>
                {newLogo ? (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] p-2.5">
                    <div className="w-12 h-12 rounded-md bg-white border border-slate-200 dark:border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                      <img src={newLogo} alt="Portfolio logo preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-white/70">Logo selected</p>
                      <p className="text-[10px] text-slate-500 dark:text-white/40">Will appear on the portfolio card</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-slate-500 hover:text-red-500 dark:text-white/50 dark:hover:text-red-400"
                      onClick={() => setNewLogo('')}
                      data-testid="button-remove-new-portfolio-logo"
                    >
                      <X className="w-3 h-3 mr-1" />Remove
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="new-portfolio-logo-input"
                    className="flex items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 dark:border-white/[0.1] hover:border-blue-400 dark:hover:border-blue-500/40 bg-slate-50/60 dark:bg-white/[0.02] p-3 cursor-pointer transition-colors"
                    data-testid="label-new-portfolio-logo"
                  >
                    <div className="w-10 h-10 rounded-md bg-white border border-slate-200 dark:border-white/[0.06] flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-slate-400 dark:text-white/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-white/70">Click to upload logo</p>
                      <p className="text-[10px] text-slate-500 dark:text-white/40">PNG, JPG, or SVG · Recommended 200×200px</p>
                    </div>
                    <input
                      id="new-portfolio-logo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      data-testid="input-new-portfolio-logo"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f || !f.type.startsWith('image/')) return;
                        const dataUrl = await compressImageFile(f, { maxDimension: 320, quality: 0.85, targetMaxBytes: 40 * 1024, minQuality: 0.6, minDimension: 200 });
                        setNewLogo(dataUrl);
                      }}
                    />
                  </label>
                )}
              </div>
              {/* Tracked categories — which fields this portfolio tracks, in order */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-white/50">Tracked Categories</label>
                <p className="text-[10px] text-slate-500 dark:text-white/35">These become this portfolio's fields — the order here is also used for the mass-import spreadsheet. Drag rows (or use the arrows) to reorder.</p>
                <div className="rounded-lg border border-slate-200 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-white/[0.05] max-h-52 overflow-y-auto">
                  {newTrackedFields.map((f, i) => (
                    <div
                      key={f.key}
                      draggable
                      onDragStart={e => { setDragFieldKey(f.key); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; handleFieldDragOver(f.key); }}
                      onDrop={e => { e.preventDefault(); setDragFieldKey(null); }}
                      onDragEnd={() => setDragFieldKey(null)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-transparent transition-colors ${dragFieldKey === f.key ? 'opacity-40 bg-blue-50 dark:bg-blue-500/10' : ''} ${dragFieldKey && dragFieldKey !== f.key ? 'cursor-grabbing' : ''}`}
                      data-testid={`tracked-field-${f.key}`}
                    >
                      <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-white/20 dark:hover:text-white/50 shrink-0" title="Drag to reorder" aria-label="Drag to reorder">
                        <GripVertical className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] tabular-nums text-slate-400 dark:text-white/30 w-4">{i + 1}</span>
                      <span className="text-xs flex-1 text-slate-800 dark:text-white/80">{f.label}</span>
                      {f.custom && <span className="text-[9px] px-1.5 py-px rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 font-medium">Custom</span>}
                      <button onClick={() => moveTrackedField(f.key, -1)} disabled={i === 0}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-800 dark:text-white/30 dark:hover:text-white disabled:opacity-20"
                        title="Move up" data-testid={`tracked-up-${f.key}`}><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveTrackedField(f.key, 1)} disabled={i === newTrackedFields.length - 1}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-800 dark:text-white/30 dark:hover:text-white disabled:opacity-20"
                        title="Move down" data-testid={`tracked-down-${f.key}`}><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeTrackedField(f.key)}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 dark:text-white/30 dark:hover:text-red-400"
                        title="Remove" data-testid={`tracked-remove-${f.key}`}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {newTrackedFields.length === 0 && (
                    <p className="px-3 py-3 text-[11px] text-slate-400 dark:text-white/30">No categories yet — add from the picklist below.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select value="" onValueChange={key => { const cat = STANDARD_CATEGORIES.find(c => c.key === key); if (cat) addTrackedField(cat); }}>
                    <SelectTrigger className="h-8 text-xs flex-1 bg-slate-50 border-slate-200 dark:bg-white/[0.06] dark:border-white/[0.1]" data-testid="tracked-picklist">
                      <SelectValue placeholder="Add a standard category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARD_CATEGORIES.filter(c => !newTrackedFields.some(f => f.key === c.key)).map(c => (
                        <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Or add a custom category, e.g. Parking Spaces" value={newCustomField}
                    onChange={e => setNewCustomField(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCustomTrackedField(); }}
                    className="h-8 text-xs flex-1 bg-slate-50 border-slate-200 dark:bg-white/[0.06] dark:border-white/[0.1]" data-testid="input-custom-category" />
                  <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!newCustomField.trim()} onClick={addCustomTrackedField} data-testid="button-add-custom-category">
                    <Plus className="w-3 h-3 mr-1" />Add
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/[0.06]" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white"
                  onClick={handleAdd} disabled={!newName.trim() || newTrackedFields.length === 0} data-testid="button-confirm-add-portfolio">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Create Portfolio
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Modal */}
      {invitePortfolio && (
        <InviteModal
          portfolioId={invitePortfolio.id}
          portfolioName={invitePortfolio.name}
          existingUserIds={new Set(getPortfolioAssignments(invitePortfolio.id).map(a => a.userId))}
          users={users}
          onInvite={(email, name, role) => handleInvite(invitePortfolio.id, email, name, role)}
          onClose={() => setInvitePortfolioId(null)}
        />
      )}

      {/* Manage Team Modal */}
      {teamPortfolio && (
        <ManageTeamModal
          portfolioId={teamPortfolio.id}
          portfolioName={teamPortfolio.name}
          users={users}
          assignments={assignments}
          onChangeRole={(uid, role) => handleChangeRole(teamPortfolio.id, uid, role)}
          onRemove={(uid) => handleRemoveUser(teamPortfolio.id, uid)}
          onOpenInvite={() => setInvitePortfolioId(teamPortfolio.id)}
          onClose={() => setTeamPortfolioId(null)}
        />
      )}

      {/* Delete Portfolio Confirmation Modal */}
      {deletePortfolioId !== null && (() => {
        const target = portfolios.find(p => p.id === deletePortfolioId);
        if (!target) return null;
        return (
          <Dialog open onOpenChange={() => setDeletePortfolioId(null)}>
            <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 dark:bg-[hsl(222,47%,13%)] dark:border-white/[0.1] dark:text-white">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />Delete Portfolio
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-slate-600 dark:text-white/70">
                  Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{target.name}</span>?
                  This will remove the portfolio and all of its team assignments. This action cannot be undone.
                </p>
                <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  Portfolio data, team members, and access history will be permanently removed.
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/[0.06]"
                    onClick={() => setDeletePortfolioId(null)}
                    data-testid="button-cancel-delete-portfolio"
                  >Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-500 text-white"
                    onClick={() => handleDeletePortfolio(target.id)}
                    data-testid="button-confirm-delete-portfolio"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete Portfolio
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

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
