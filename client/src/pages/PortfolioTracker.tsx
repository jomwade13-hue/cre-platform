import React, { useState, useMemo, useEffect } from 'react';
// wouter routing not used for tab navigation — hash is set directly
import {
  Building2, Database, Activity, CalendarRange, FileBarChart,
  Search, Download, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ArrowUpRight, CheckCircle2, Clock, AlertCircle, FileText, FileSpreadsheet,
  File, Image, X, StickyNote, Folder, Presentation, MessageSquare,
  MapPin, User, Layers, Camera, ImagePlus, HardHat, Filter,
  BarChart2, Calendar, Edit3, Trash2, DollarSign, Briefcase, Award, Flag, Diamond,
  Printer, Upload, Sun, Moon, ImageIcon, Share2, Link2, Copy, Check, TrendingUp, ShieldCheck, PieChart, ExternalLink,
  FileUp, Table2, AlertTriangle, CheckCircle, XCircle, Grid3X3, ArrowRight, Save, FolderOpen, SlidersHorizontal, Eye, EyeOff
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import {
  leases as leasesInit, initialLeaseNotes, initialLeaseDocuments,
  leaseExpirationByYear, rentTrendData,
  type LeaseNote, type LeaseDocument
} from '@/data/mock';
import { cn } from '@/lib/utils';
import { useBranding } from '@/components/Layout';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = ['Office', 'Healthcare', 'Industrial', 'Retail'];
const CLIENT_LEADS   = ['Alisha Shields', 'Brittney McDonald', 'George Scott', 'Keith Swartzentruber', 'Kim Boren', 'Kristine Schroeder', 'Matt Epperson', 'Sarah Stieferman', 'Travis Hilty'];
const STATUSES       = ['—', 'Active Disposition', 'Active Initiative', 'Inactive', 'Archive'];
const STRATEGIES     = [
  '—', 'Close', 'Maintain / Renew', 'New Project', 'Project Management',
  'Restructure / Renew', 'Relocate', 'Sublease / Buyout', 'Sale', 'Purchase'
];

const STRATEGY_STAGES: Record<string, string[]> = {
  '—':                 ['—'],
  'Maintain / Renew':    ['—','1. Plan and Program','2. Market Survey','3. Tour','4. Proposal/LOI','5. Lease Negotiations','6. Approvals','7. Design','8. Construction'],
  'New Project':         ['—','1. Plan and Program','2. Market Survey','3. Tour','4. Proposal/LOI','5. Lease Negotiations','6. Approvals','7. Design','8. Construction'],
  'Restructure / Renew': ['—','1. Plan and Program','2. Market Survey','3. Tour','4. Proposal/LOI','5. Lease Negotiations','6. Approvals','7. Design','8. Construction'],
  'Relocate':            ['—','1. Plan and Program','2. Market Survey','3. Tour','4. Proposal/LOI','5. Lease Negotiations','6. Approvals','7. Design','8. Construction'],
  'Close':               ['—','1. Lease Review','2. Cancel Vendors','3. Move Coordination','4. Furniture Liquidation','5. Landlord Walkthrough'],
  'Sublease / Buyout':   ['—','1. Lease Review','2. Disposition Package','3. Marketing Package','4. Proposal/LOI','5. Negotiations','6. Approvals'],
  'Sale':                ['—','1. Property Review','2. Disposition Package','3. Marketing Package','4. Proposal/LOI','5. PSA Negotiations','6. Due Diligence','7. Closing Period'],
  'Purchase':            ['—','1. Property Review','2. Disposition Package','3. Marketing Package','4. Proposal/LOI','5. PSA Negotiations','6. Due Diligence','7. Closing Period'],
  'Project Management':  ['—','1. Site Selection','2. Architect Procurement','3. Test Fit','4. Schematic Design','5. Design Development','6. Pricing & Permitting','7. Construction','8. Move'],
};

const STATUS_STYLES: Record<string, string> = {
  '—':                  'bg-transparent text-muted-foreground',
  'Active Disposition': 'bg-blue-100  text-blue-800  dark:bg-blue-900/30  dark:text-blue-400',
  'Active Initiative':  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Inactive':           'bg-gray-100  text-gray-600  dark:bg-gray-800     dark:text-gray-400',
  'Archive':            'bg-slate-100 text-slate-500 dark:bg-slate-900/30 dark:text-slate-500',
};

const PRIORITY_STYLES: Record<string, string> = {
  'Critical': 'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400',
  'High':     'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'Medium':   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Low':      'bg-gray-100   text-gray-700   dark:bg-gray-800      dark:text-gray-400',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` :
  n >= 1000    ? `$${(n / 1000).toFixed(0)}K`    :
  `$${n.toLocaleString()}`;

const fmtSqft = (n: number) => `${n.toLocaleString()} SF`;

// Progress calculation: skip blank "—" entry at index 0
const calcProgress = (stages: string[], stage: string): number => {
  if (!stages.length || stage === '—' || !stage) return 0;
  const realStages = stages.filter(s => s !== '—');
  const idx = realStages.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / realStages.length) * 100);
};

/** Format YYYY-MM-DD → MM/DD/YY */
const fmtDateShort = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${m}/${day}/${y.slice(2)}`;
};

// ── Types ─────────────────────────────────────────────────────────────────────

type LeaseRecord = typeof leasesInit[0];

interface Milestone {
  id: number;
  label: string;
  date: string; // YYYY-MM-DD
}

interface ValueAddItem {
  id: number;
  label: string;
  amount: number; // 0 for non-monetary
  category: 'monetary' | 'non-monetary';
}

interface QBREntry {
  id: number;
  leaseId: number;
  tenant: string;
  property: string;
  completedDate: string;
  strategy: string;
  sqft: number;
  originalRent: number;
  newRent: number;
  savings: number; // kept for legacy seed data — renamed display to "Value Add"
  valueAddItems: ValueAddItem[];
  servicesProvided: string[];
  summary: string;
  qbrYear: number;
}

// ── SelectCell — inline editable cell ────────────────────────────────────────

function SelectCell({ value, options, onChange, colorMap, disabled }: {
  value: string; options: string[];
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="px-1 text-xs">
        {colorMap ? (
          <Badge className={cn('text-xs border-0 font-medium', colorMap[value] || '')}>{value}</Badge>
        ) : (
          <span className="text-xs text-foreground">{value || '—'}</span>
        )}
      </span>
    );
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-full min-w-0 border-0 bg-transparent shadow-none px-1 text-xs focus:ring-0 hover:bg-muted/60 rounded transition-colors">
        {colorMap ? (
          <Badge className={cn('text-xs border-0 font-medium pointer-events-none', colorMap[value] || '')}>{value}</Badge>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o} value={o} className="text-xs">
            {colorMap ? <Badge className={cn('text-xs border-0', colorMap[o] || '')}>{o}</Badge> : o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Document icon helper ───────────────────────────────────────────────────────

function DocIcon({ type }: { type: string }) {
  if (type === 'PDF')   return <FileText className="w-4 h-4 text-red-500 shrink-0" />;
  if (type === 'Excel') return <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />;
  if (type === 'Word')  return <File className="w-4 h-4 text-blue-600 shrink-0" />;
  if (type === 'CAD')   return <Layers className="w-4 h-4 text-purple-500 shrink-0" />;
  if (type === 'Image') return <Image className="w-4 h-4 text-amber-500 shrink-0" />;
  return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
}

// ── Client Logos (per tenant) ─────────────────────────────────────────────────

const INITIAL_CLIENT_LOGOS: Record<string, string> = {}; // tenant name → data URL or empty

// ── QBR Services & Seed Data ──────────────────────────────────────────────────

const CRE_SERVICES = [
  'Lease Negotiation', 'Market Analysis', 'Space Planning', 'Construction Management',
  'Disposition', 'Sublease Marketing', 'Move Coordination', 'Furniture Liquidation',
  'Tenant Representation', 'Project Management', 'Site Selection', 'Financial Analysis'
];

const INITIAL_QBR_ENTRIES: QBREntry[] = [
  {
    id: 1, leaseId: 15, tenant: 'Honeywell Intl.', property: 'Woodland Falls Corp Park',
    completedDate: '2024-11-15', strategy: 'Close', sqft: 110000,
    originalRent: 3520000, newRent: 0, savings: 3520000,
    valueAddItems: [
      { id: 1, label: 'Rent Savings', amount: 3520000, category: 'monetary' },
      { id: 2, label: 'Furniture Liquidation Recovery', amount: 185000, category: 'monetary' },
      { id: 3, label: 'Full Security Deposit Returned', amount: 0, category: 'non-monetary' },
      { id: 4, label: 'Zero Deficiency Walkthrough', amount: 0, category: 'non-monetary' },
    ],
    servicesProvided: ['Lease Negotiation', 'Move Coordination', 'Furniture Liquidation'],
    summary: 'Successfully closed Honeywell Morris Plains facility ahead of lease expiration. Coordinated full move-out, furniture liquidation recovered $185K. Landlord walkthrough passed with zero deficiency items, full security deposit returned.',
    qbrYear: 2026
  },
];

// ── Photo type ────────────────────────────────────────────────────────────────

export interface LeasePhoto {
  id: number;
  url: string;
  label: string;          // e.g. "Building Exterior", "Floor 22 Plan"
  category: 'building' | 'floorplan' | 'other';
}

// Placeholder images for demo (gradient SVG data URIs)
const PLACEHOLDER_PHOTOS: Record<number, LeasePhoto[]> = {
  1:  [{ id: 1, url: '', label: 'One Peachtree Center — Exterior', category: 'building' }, { id: 2, url: '', label: 'Floor 22 Plan', category: 'floorplan' }],
  3:  [{ id: 1, url: '', label: 'Terminus 100 — Lobby', category: 'building' }, { id: 2, url: '', label: 'Floor 10 Plan', category: 'floorplan' }],
  4:  [{ id: 1, url: '', label: '1180 Peachtree — Exterior', category: 'building' }],
  7:  [{ id: 1, url: '', label: 'NCR Global HQ — Exterior', category: 'building' }, { id: 2, url: '', label: 'Full Building Plan', category: 'floorplan' }, { id: 3, url: '', label: 'Construction Progress', category: 'other' }],
  11: [{ id: 1, url: '', label: '500 W Madison — Exterior', category: 'building' }, { id: 2, url: '', label: 'Floor 29 Plan', category: 'floorplan' }],
  12: [{ id: 1, url: '', label: 'Willis Tower — Exterior', category: 'building' }],
  5:  [{ id: 1, url: '', label: 'Promenade — Exterior', category: 'building' }],
};

function placeholderGradient(label: string, category: string) {
  const hue = category === 'building' ? 215 : category === 'floorplan' ? 160 : 270;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, hsl(${hue} 40% 30%), hsl(${hue} 50% 18%))` }}>
      {category === 'floorplan'
        ? <Layers className="w-10 h-10 text-white/30" />
        : <Building2 className="w-10 h-10 text-white/30" />
      }
      <span className="text-white/50 text-xs font-medium px-4 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Building Profile Modal ────────────────────────────────────────────────────

function BuildingProfileModal({
  lease, notes, documents, photos, clientLogo, onAddNote, onAddDocument, onAddPhoto, onSetClientLogo, onClose, onUpdate, onAddToQBR, qbrEntries, milestones, onAddMilestone, onRemoveMilestone
}: {
  lease: LeaseRecord;
  notes: LeaseNote[];
  documents: LeaseDocument[];
  photos: LeasePhoto[];
  clientLogo: string;
  onAddNote: (text: string, author: string) => void;
  onAddDocument: (doc: Omit<LeaseDocument, 'id'>) => void;
  onAddPhoto: (label: string, category: LeasePhoto['category'], url: string) => void;
  onSetClientLogo: (dataUrl: string) => void;
  onClose: () => void;
  onUpdate: (updated: LeaseRecord) => void;
  onAddToQBR?: (leaseId: number, year: number, newRent: number, services: string[], summary: string, valueAddItems?: ValueAddItem[]) => void;
  qbrEntries?: QBREntry[];
  milestones: Milestone[];
  onAddMilestone: (label: string, date: string) => void;
  onRemoveMilestone: (milestoneId: number) => void;
}) {
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [newNote, setNewNote]         = useState('');
  const [noteAuthor, setNoteAuthor]   = useState('Jordan Wade');
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [newPhotoLabel, setNewPhotoLabel] = useState('');
  const [newPhotoCat, setNewPhotoCat] = useState<LeasePhoto['category']>('building');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setNewPhotoUrl(reader.result as string); if (!newPhotoLabel) setNewPhotoLabel(file.name.replace(/\.[^.]+$/, '')); };
    reader.readAsDataURL(file);
  };
  const [editOpen, setEditOpen] = useState(false);
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneDate, setNewMilestoneDate]   = useState('');
  const [showQBRForm, setShowQBRForm] = useState(false);
  const [qbrYear, setQbrYear] = useState(String(new Date().getFullYear()));
  const [qbrNewRent, setQbrNewRent] = useState('');
  const [qbrSummary, setQbrSummary] = useState('');
  const [qbrServices, setQbrServices] = useState<string[]>([]);
  const [qbrAdded, setQbrAdded] = useState(false);
  const [qbrValueAddItems, setQbrValueAddItems] = useState<ValueAddItem[]>([]);
  const [qbrVALabel, setQbrVALabel]   = useState('');
  const [qbrVAAmount, setQbrVAAmount] = useState('');
  const [qbrVACat, setQbrVACat]       = useState<'monetary' | 'non-monetary'>('monetary');

  const isAlreadyInQBR = qbrEntries?.some(e => e.leaseId === lease.id) ?? false;

  const stages = STRATEGY_STAGES[lease.strategy] ?? [];
  const stageIdx = stages.indexOf(lease.stage);

  const safeIdx = Math.min(carouselIdx, Math.max(photos.length - 1, 0));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* ─── Photo Carousel (top half) ─── */}
        <div className="relative bg-black/95 w-full" style={{ minHeight: '440px', maxHeight: '520px' }}>
          {photos.length > 0 ? (
            <>
              {/* Current photo */}
              <div className="w-full h-[480px] relative">
                {photos[safeIdx]?.url ? (
                  <img src={photos[safeIdx].url} alt={photos[safeIdx].label} className="w-full h-full object-contain" />
                ) : (
                  placeholderGradient(photos[safeIdx]?.label ?? '', photos[safeIdx]?.category ?? 'building')
                )}
              </div>

              {/* Carousel nav */}
              {photos.length > 1 && (
                <>
                  <button onClick={() => setCarouselIdx(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCarouselIdx(i => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Label + dots */}
              <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-end justify-between">
                  <div>
                    <Badge className="bg-white/15 text-white border-0 text-[10px] mb-1">
                      {photos[safeIdx]?.category === 'floorplan' ? 'Floor Plan' : photos[safeIdx]?.category === 'building' ? 'Building' : 'Photo'}
                    </Badge>
                    <p className="text-white text-sm font-medium">{photos[safeIdx]?.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setCarouselIdx(i)}
                        className={cn('rounded-full transition-all h-1.5', i === safeIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60')} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-[440px] flex flex-col items-center justify-center gap-3" style={{ background: 'linear-gradient(135deg, hsl(215 40% 25%), hsl(215 50% 14%))' }}>
              <Camera className="w-12 h-12 text-white/20" />
              <p className="text-white/40 text-sm">No photos yet</p>
            </div>
          )}

          {/* Add Photo button (overlay) */}
          <button onClick={() => setShowAddPhoto(true)}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur text-white text-xs font-medium transition-colors">
            <ImagePlus className="w-3.5 h-3.5" />Add Photo
          </button>
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 px-5 py-2 bg-muted/30 border-b border-border overflow-x-auto">
            {photos.map((p, i) => (
              <button key={p.id} onClick={() => setCarouselIdx(i)}
                className={cn('shrink-0 w-16 h-11 rounded overflow-hidden border-2 transition-all',
                  i === safeIdx ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                )}>
                {p.url ? (
                  <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] text-white/60 font-medium"
                    style={{ background: `linear-gradient(135deg, hsl(${p.category === 'floorplan' ? 160 : 215} 40% 30%), hsl(${p.category === 'floorplan' ? 160 : 215} 50% 18%))` }}>
                    {p.category === 'floorplan' ? 'FP' : 'BLD'}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Add photo form (inline) */}
        {showAddPhoto && (
          <div className="px-5 py-3 border-b border-border bg-muted/20 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border bg-background hover:bg-muted/50 cursor-pointer text-xs font-medium transition-colors">
                <Upload className="w-3.5 h-3.5" />{newPhotoUrl ? 'Change File' : 'Choose Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
              </label>
              {newPhotoUrl && <img src={newPhotoUrl} alt="Preview" className="h-8 w-12 rounded object-cover border border-border" />}
              <Input placeholder="Photo label (e.g. Lobby, Floor 4 Plan)" value={newPhotoLabel} onChange={e => setNewPhotoLabel(e.target.value)} className="h-8 text-sm flex-1 min-w-[160px]" />
              <Select value={newPhotoCat} onValueChange={v => setNewPhotoCat(v as LeasePhoto['category'])}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="building" className="text-xs">Building</SelectItem>
                  <SelectItem value="floorplan" className="text-xs">Floor Plan</SelectItem>
                  <SelectItem value="other" className="text-xs">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs" disabled={!newPhotoUrl || !newPhotoLabel.trim()}
                onClick={() => { onAddPhoto(newPhotoLabel.trim(), newPhotoCat, newPhotoUrl); setNewPhotoLabel(''); setNewPhotoUrl(''); setShowAddPhoto(false); }}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAddPhoto(false); setNewPhotoUrl(''); setNewPhotoLabel(''); }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* ─── Content (scrollable bottom) ─── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Client logo */}
          <div className="flex items-center gap-3">
            {clientLogo ? (
              <div className="relative group">
                <img src={clientLogo} alt={`${lease.tenant} logo`} className="h-10 max-w-[160px] object-contain" />
                <button onClick={() => onSetClientLogo('')}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px]">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Add Client Logo
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => onSetClientLogo(reader.result as string);
                  reader.readAsDataURL(file);
                }} />
              </label>
            )}
          </div>

          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight">{lease.property}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                <MapPin className="w-3 h-3" />{lease.address}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge className="text-xs">{lease.tenant}</Badge>
                <Badge variant="outline" className="text-xs">{lease.type}</Badge>
                <Badge className={cn('text-xs border-0', STATUS_STYLES[lease.status])}>{lease.status}</Badge>
                <Badge variant="outline" className="text-xs">{lease.strategy}</Badge>
                {lease.stage && <Badge variant="outline" className="text-xs">{lease.stage}</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 text-xs h-7" onClick={() => setEditOpen(!editOpen)}>
              {editOpen ? 'Done' : 'Edit'}
            </Button>
          </div>

          {/* Edit panel (inline toggle) */}
          {editOpen && (
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Type',        field: 'type',       options: PROPERTY_TYPES },
                  { label: 'Client Lead', field: 'clientLead', options: CLIENT_LEADS },
                  { label: 'Status',      field: 'status',     options: STATUSES },
                  { label: 'Strategy',    field: 'strategy',   options: STRATEGIES },
                ].map(({ label, field, options }) => (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                    <Select value={(lease as any)[field]} onValueChange={v => {
                      const updated: any = { ...lease, [field]: v };
                      if (field === 'strategy') {
                        const newStages = STRATEGY_STAGES[v] ?? [];
                        if (!newStages.includes(updated.stage)) updated.stage = newStages[0] ?? '';
                      }
                      onUpdate(updated);
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Stage</label>
                  <Select value={lease.stage} onValueChange={v => onUpdate({ ...lease, stage: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(STRATEGY_STAGES[lease.strategy] ?? []).map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location & CoStar fields */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 font-semibold">Location & References</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 33.7573"
                      value={(lease as any).lat ?? ''}
                      onChange={e => {
                        const raw = e.target.value;
                        const num = raw === '' ? undefined : Number(raw);
                        onUpdate({ ...lease, lat: Number.isFinite(num as number) ? (num as number) : undefined } as any);
                      }}
                      className="h-8 text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="e.g. -84.3862"
                      value={(lease as any).lng ?? ''}
                      onChange={e => {
                        const raw = e.target.value;
                        const num = raw === '' ? undefined : Number(raw);
                        onUpdate({ ...lease, lng: Number.isFinite(num as number) ? (num as number) : undefined } as any);
                      }}
                      className="h-8 text-xs tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">CoStar ID</label>
                    <Input
                      type="text"
                      placeholder="e.g. 8001373"
                      value={(lease as any).costarId ?? ''}
                      onChange={e => onUpdate({ ...lease, costarId: e.target.value } as any)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {typeof (lease as any).lat === 'number' && typeof (lease as any).lng === 'number' && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    ✓ Plotted on map at {(lease as any).lat.toFixed(4)}, {(lease as any).lng.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Key metrics */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {[
              { label: 'SF',          value: fmtSqft(lease.sqft) },
              { label: 'Rent PSF',    value: `$${lease.rentPSF.toFixed(2)}` },
              { label: 'Annual Rent', value: fmt(lease.totalRent) },
              { label: 'Lease End',   value: lease.leaseEnd },
              { label: 'Floors',      value: lease.floors },
            ].map(m => (
              <div key={m.label} className="border-l-2 border-primary pl-2.5 py-0.5">
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                <p className="text-sm font-bold">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Stage progress */}
          {stages.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Strategy Progress — {lease.strategy}</p>
                <span className="text-xs font-medium text-primary">{lease.stage}</span>
              </div>
              <div className="flex gap-1">
                {stages.map((s, i) => (
                  <div key={i} title={s} className={cn(
                    'flex-1 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-all',
                    i < stageIdx  ? 'bg-primary/20 text-primary' :
                    i === stageIdx ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground/40'
                  )}>{i + 1}</div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Milestones ─── */}
          <div className="bg-muted/30 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-500" />Milestone Dates
              </h4>
              <span className="text-[10px] text-muted-foreground">{milestones.length} milestones</span>
            </div>
            {milestones.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {milestones.sort((a, b) => a.date < b.date ? -1 : 1).map(ms => {
                  const isOverdue = ms.date < new Date().toISOString().slice(0, 10);
                  const isUpcoming = !isOverdue && ms.date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                  return (
                    <div key={ms.id} className="flex items-center gap-2 text-xs group">
                      <Diamond className={cn('w-3 h-3 shrink-0', isOverdue ? 'text-red-500' : isUpcoming ? 'text-amber-500' : 'text-blue-500')} />
                      <span className="font-medium flex-1 truncate">{ms.label}</span>
                      <span className={cn('tabular-nums', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>{fmtDateShort(ms.date)}</span>
                      {isOverdue && <Badge className="text-[9px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">Overdue</Badge>}
                      {isUpcoming && !isOverdue && <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">Soon</Badge>}
                      <button onClick={() => onRemoveMilestone(ms.id)}
                        className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input placeholder="Milestone name" value={newMilestoneLabel} onChange={e => setNewMilestoneLabel(e.target.value)} className="h-7 text-xs flex-1" />
              <Input type="date" value={newMilestoneDate} onChange={e => setNewMilestoneDate(e.target.value)} className="h-7 text-xs w-36" />
              <Button size="sm" className="h-7 text-xs px-2" disabled={!newMilestoneLabel.trim() || !newMilestoneDate}
                onClick={() => { onAddMilestone(newMilestoneLabel.trim(), newMilestoneDate); setNewMilestoneLabel(''); setNewMilestoneDate(''); }}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* ─── Add to QBR ─── */}
          {onAddToQBR && (
            <div className="bg-muted/30 rounded-lg border border-border p-3">
              {qbrAdded ? (
                <div className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">Added to {qbrYear} QBR Report</span>
                </div>
              ) : isAlreadyInQBR ? (
                <div className="flex items-center gap-2 py-1">
                  <FileBarChart className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">This location is already in the QBR Report</span>
                </div>
              ) : !showQBRForm ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileBarChart className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold">QBR Report</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowQBRForm(true)}>
                    <Plus className="w-3 h-3" />Add to QBR
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold flex items-center gap-2">
                      <FileBarChart className="w-3.5 h-3.5 text-primary" />Add to QBR Report
                    </h4>
                    <button onClick={() => setShowQBRForm(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">QBR Year</label>
                      <Select value={qbrYear} onValueChange={setQbrYear}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026, 2027, 2028].map(y => (
                            <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">New Annual Rent (0 if closed)</label>
                      <Input type="number" placeholder="0" value={qbrNewRent} onChange={e => setQbrNewRent(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs">
                    <span className="text-muted-foreground">Original rent:</span>
                    <span className="font-medium">{fmt(lease.totalRent)}</span>
                    <span className="text-muted-foreground ml-2">SF:</span>
                    <span className="font-medium">{fmtSqft(lease.sqft)}</span>
                    <span className="text-muted-foreground ml-2">Strategy:</span>
                    <span className="font-medium">{lease.strategy}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Services Provided</label>
                    <div className="flex flex-wrap gap-1">
                      {CRE_SERVICES.map(svc => (
                        <button key={svc}
                          onClick={() => setQbrServices(prev => prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc])}
                          className={cn('px-2 py-0.5 rounded-full text-[10px] border transition-colors',
                            qbrServices.includes(svc) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
                          )}>
                          {svc}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Value Add Items */}
                  <div className="border border-border rounded-lg p-2.5 bg-muted/10">
                    <p className="text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-green-600" />Value Add Items
                    </p>
                    {qbrValueAddItems.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {qbrValueAddItems.map(item => (
                          <div key={item.id} className="flex items-center gap-1.5 text-[10px]">
                            <Badge variant="outline" className={cn('text-[8px] h-3.5 border-0 shrink-0',
                              item.category === 'monetary' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            )}>{item.category === 'monetary' ? '$' : 'NM'}</Badge>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.category === 'monetary' && <span className="font-medium text-green-700 dark:text-green-400">{fmt(item.amount)}</span>}
                            <button onClick={() => setQbrValueAddItems(prev => prev.filter(v => v.id !== item.id))}
                              className="text-muted-foreground/50 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 flex-wrap">
                      <div className="flex border border-border rounded overflow-hidden">
                        <button onClick={() => setQbrVACat('monetary')}
                          className={cn('px-1.5 py-0.5 text-[9px]', qbrVACat === 'monetary' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : 'hover:bg-muted')}>
                          Monetary
                        </button>
                        <button onClick={() => setQbrVACat('non-monetary')}
                          className={cn('px-1.5 py-0.5 text-[9px]', qbrVACat === 'non-monetary' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' : 'hover:bg-muted')}>
                          Non-Mon.
                        </button>
                      </div>
                      <Input placeholder="Label" value={qbrVALabel} onChange={e => setQbrVALabel(e.target.value)} className="h-6 text-[10px] flex-1 min-w-[80px]" />
                      {qbrVACat === 'monetary' && (
                        <Input type="number" placeholder="Amt" value={qbrVAAmount} onChange={e => setQbrVAAmount(e.target.value)} className="h-6 text-[10px] w-20" />
                      )}
                      <Button size="sm" className="h-6 text-[10px] px-1.5" disabled={!qbrVALabel.trim()}
                        onClick={() => {
                          setQbrValueAddItems(prev => [...prev, { id: Date.now(), label: qbrVALabel.trim(), amount: qbrVACat === 'monetary' ? (Number(qbrVAAmount) || 0) : 0, category: qbrVACat }]);
                          setQbrVALabel(''); setQbrVAAmount('');
                        }}>
                        <Plus className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Summary</label>
                    <Textarea placeholder="Brief summary of the project, key outcomes, client value…"
                      value={qbrSummary} onChange={e => setQbrSummary(e.target.value)} className="text-xs min-h-[50px]" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1.5" disabled={!qbrSummary.trim()}
                      onClick={() => {
                        onAddToQBR(lease.id, parseInt(qbrYear, 10), Number(qbrNewRent) || 0, qbrServices, qbrSummary, qbrValueAddItems);
                        setQbrAdded(true);
                        setShowQBRForm(false);
                      }}>
                      <FileBarChart className="w-3 h-3" />Add to {qbrYear} QBR
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowQBRForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents (compact) */}
          {documents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Documents ({documents.length})</p>
              <div className="flex flex-wrap gap-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 px-2.5 py-1.5 border border-border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                    <DocIcon type={doc.fileType} />
                    <span className="text-xs font-medium truncate max-w-[140px]">{doc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Notes (inline, always visible) ─── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3">Notes ({notes.length})</p>

            {/* Add note form */}
            <div className="flex gap-2 mb-3">
              <Textarea
                placeholder="Add a note…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="min-h-[60px] text-sm resize-none flex-1"
                rows={2}
              />
              <div className="flex flex-col gap-1.5 shrink-0">
                <Input placeholder="Name" value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)} className="h-7 text-xs w-28" />
                <Button size="sm" className="h-7 text-xs" disabled={!newNote.trim()}
                  onClick={() => { if (newNote.trim()) { onAddNote(newNote.trim(), noteAuthor); setNewNote(''); } }}>
                  Save
                </Button>
              </div>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No notes yet — add one above</p>
            ) : (
              <div className="space-y-2">
                {notes.map(note => (
                  <div key={note.id} className="bg-muted/30 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <User className="w-3 h-3" />{note.author}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{note.date}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Slide Deck View ───────────────────────────────────────────────────────────

function SlideDeckView({ leases, notes, onClose }: {
  leases: LeaseRecord[];
  notes: Record<number, LeaseNote[]>;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        setCurrent(c => Math.min(c + 1, leases.length - 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        setCurrent(c => Math.max(c - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [leases.length, onClose]);

  if (leases.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0c1628] flex items-center justify-center">
        <div className="text-center text-white">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-xl font-semibold">No Project Management locations</p>
          <p className="text-white/50 text-sm mt-1">Assign a lease Strategy of "Project Management" to populate this view.</p>
          <Button className="mt-6" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const lease = leases[current];
  const lNotes = notes[lease.id] ?? [];
  const latestNote = lNotes[0];
  const stages = STRATEGY_STAGES['Project Management'];
  const stageIdx = stages.findIndex(s => s === lease.stage);

  const pct = (() => {
    const start = new Date(lease.leaseStart).getTime();
    const end   = new Date(lease.leaseEnd).getTime();
    const now   = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-[#0c1628] flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/50 text-sm">Transcend · Project Management Roadmap</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-sm">{current + 1} / {leases.length}</span>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide */}
      <div className="flex-1 overflow-auto flex items-center justify-center px-8 py-6">
        <div className="w-full max-w-5xl space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">Project Management</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium border-0',
                  lease.status === 'Active Initiative' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/60'
                )}>{lease.status}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-white/40 border border-white/10">{lease.type}</span>
              </div>
              <h1 className="text-3xl font-bold text-white leading-tight">{lease.property}</h1>
              <p className="text-white/50 text-lg mt-1">{lease.tenant}</p>
              <p className="text-white/30 text-sm mt-1 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />{lease.address}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Client Lead</p>
              <p className="text-white font-bold text-2xl">{lease.clientLead}</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Square Footage', value: fmtSqft(lease.sqft) },
              { label: 'Annual Rent',    value: fmt(lease.totalRent) },
              { label: 'Rent PSF',       value: `$${lease.rentPSF.toFixed(2)}` },
              { label: 'Lease End',      value: lease.leaseEnd.slice(0, 7) },
            ].map(m => (
              <div key={m.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/40 text-xs mb-1">{m.label}</p>
                <p className="text-white font-bold text-xl">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Stage progress */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-sm font-medium">Project Stage Progress</p>
              <span className="px-2.5 py-1 rounded bg-blue-500 text-white text-xs font-semibold">{lease.stage}</span>
            </div>
            <div className="flex gap-1">
              {stages.map((s, i) => (
                <div key={i} title={s} className={cn(
                  'flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all',
                  i < stageIdx  ? 'bg-blue-800/60 text-blue-300' :
                  i === stageIdx ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' :
                  'bg-white/5 text-white/20'
                )}>{i + 1}</div>
              ))}
            </div>
            <div className="flex gap-1 mt-1.5">
              {stages.map((s, i) => (
                <div key={i} className={cn('flex-1 text-center text-[9px] leading-tight px-0.5 truncate',
                  i === stageIdx ? 'text-blue-300' : 'text-white/15'
                )}>
                  {i === stageIdx ? s.split('. ')[1] ?? '' : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Latest note */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-white/40 text-xs mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />Latest Note
              </p>
              {latestNote ? (
                <>
                  <p className="text-white/80 text-sm leading-relaxed">{latestNote.text}</p>
                  <p className="text-white/30 text-xs mt-3">{latestNote.author} · {latestNote.date}</p>
                </>
              ) : (
                <p className="text-white/20 text-sm">No notes recorded</p>
              )}
            </div>

            {/* Lease timeline */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-white/40 text-xs mb-3 flex items-center gap-1.5">
                <CalendarRange className="w-3 h-3" />Lease Timeline
              </p>
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="text-white/30 text-xs">Start</p>
                  <p className="text-white font-semibold text-sm">{lease.leaseStart.slice(0,7)}</p>
                </div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden mx-1">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-right">
                  <p className="text-white/30 text-xs">End</p>
                  <p className="text-white font-semibold text-sm">{lease.leaseEnd.slice(0,7)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-white/30 text-xs">Market</p>
                  <p className="text-white/70 text-sm">{lease.market}</p>
                </div>
                <div>
                  <p className="text-white/30 text-xs">Submarket</p>
                  <p className="text-white/70 text-sm">{lease.submarket}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-center gap-8 pb-5 shrink-0">
        <button
          onClick={() => setCurrent(c => Math.max(c - 1, 0))}
          disabled={current === 0}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />Previous
        </button>
        <div className="flex items-center gap-2">
          {leases.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={cn('rounded-full transition-all h-2', i === current ? 'w-8 bg-blue-400' : 'w-2 bg-white/20 hover:bg-white/40')}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrent(c => Math.min(c + 1, leases.length - 1))}
          disabled={current === leases.length - 1}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          Next<ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Property Database ─────────────────────────────────────────────────────────

// ── Leaflet marker icon fix (default icons break with bundlers) ──────────────
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// Custom colored icons per status
const statusMarkerColors: Record<string, string> = {
  'Active Initiative':  '#3B82F6',
  'Active Disposition': '#F59E0B',
  'Inactive':           '#94A3B8',
  'Archive':            '#6B7280',
};

function createColoredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="13" r="5.5" fill="white" opacity="0.9"/>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

function FitBoundsHelper({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 12);
    } else {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

function PortfolioMap({ leases: allLeases, onViewProfile, mapStyle = 'grey' }: { leases: LeaseRecord[]; onViewProfile: (id: number) => void; mapStyle?: 'grey' | 'light' }) {
  // Only plot leases that have valid lat/lng coordinates
  const leases = allLeases.filter(l =>
    typeof (l as any).lat === 'number' && typeof (l as any).lng === 'number' &&
    Number.isFinite((l as any).lat) && Number.isFinite((l as any).lng)
  );
  const positions: [number, number][] = leases.filter(l => l.lat && l.lng).map(l => [l.lat, l.lng]);
  const center: [number, number] = positions.length > 0
    ? [positions.reduce((s, p) => s + p[0], 0) / positions.length, positions.reduce((s, p) => s + p[1], 0) / positions.length]
    : [33.78, -84.39]; // Atlanta default

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden shadow-sm portfolio-map', mapStyle === 'grey' ? 'map-grey' : 'map-light')} style={{ height: 420 }}>
      <MapContainer center={center} zoom={5} scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }} className="z-0">
        <TileLayer
          key={mapStyle}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={mapStyle === 'grey'
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'}
        />
        <FitBoundsHelper positions={positions} />
        {leases.filter(l => l.lat && l.lng).map(l => {
          const icon = createColoredIcon(statusMarkerColors[l.status] || '#3B82F6');
          return (
            <Marker key={l.id} position={[l.lat, l.lng]} icon={icon}>
              <Popup>
                <div className="text-xs space-y-1 min-w-[180px]">
                  <p className="font-bold text-sm">{l.tenant}</p>
                  <p className="text-gray-600">{l.property}</p>
                  <p className="text-gray-500">{l.address}</p>
                  <div className="flex gap-3 pt-1">
                    <span>{fmtSqft(l.sqft)}</span>
                    <span>${l.rentPSF.toFixed(2)} PSF</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className={`inline-block w-2 h-2 rounded-full`}
                      style={{ backgroundColor: statusMarkerColors[l.status] || '#3B82F6' }} />
                    <span>{l.status}</span>
                  </div>
                  <p className="text-gray-500">Strategy: {l.strategy}</p>
                  <button onClick={() => onViewProfile(l.id)}
                    className="mt-1 text-blue-600 hover:underline font-medium text-xs">View Profile →</button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

function LeasesModule({ data, notes, onUpdate, onViewProfile, onMassUpload, onMassDelete, readOnly }: {
  data: LeaseRecord[];
  notes: Record<number, LeaseNote[]>;
  onUpdate: (l: LeaseRecord) => void;
  onViewProfile: (id: number) => void;
  onMassUpload?: () => void;
  onMassDelete?: () => void;
  readOnly?: boolean;
}) {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter]   = useState<Set<string>>(new Set());
  const [leadFilter, setLeadFilter]   = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'leaseEnd', dir: 'asc' });
  const [showMap, setShowMap] = useState(true);
  const [mapStyle, setMapStyle] = useState<'grey' | 'light'>('grey');

  // Multi-select filter helper
  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };
  const filterLabel = (set: Set<string>, allLabel: string, items: string[]) =>
    set.size === 0 ? allLabel : set.size === items.length ? allLabel : set.size === 1 ? [...set][0] : `${set.size} selected`;

  // Column visibility
  const LEASE_COLUMNS = [
    { key: 'tenant', label: 'Tenant' },
    { key: 'address', label: 'Address' },
    { key: 'type', label: 'Type' },
    { key: 'campusType', label: 'Campus Type' },
    { key: 'clientLead', label: 'Client Lead' },
    { key: 'status', label: 'Status' },
    { key: 'strategy', label: 'Strategy' },
    { key: 'expiration', label: 'Expiration' },
    { key: 'stage', label: 'Stage' },
    { key: 'latitude', label: 'Latitude' },
    { key: 'longitude', label: 'Longitude' },
    { key: 'costarId', label: 'CoStar ID' },
    { key: 'lastNote', label: 'Last Note' },
  ] as const;
  const ALL_COL_KEYS = LEASE_COLUMNS.map(c => c.key);
  // Hide lat/lng/costarId by default (advanced columns) but keep available via column picker
  const DEFAULT_COL_KEYS = ALL_COL_KEYS.filter(k => k !== 'latitude' && k !== 'longitude' && k !== 'costarId');
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () => new Set(DEFAULT_COL_KEYS)
  );
  const toggleCol = (key: string) => setVisibleCols(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const isColVisible = (key: string) => visibleCols.has(key);

  // Saved column layouts
  type ColLayout = { name: string; columns: string[] };
  const [savedLayouts, setSavedLayouts] = useState<ColLayout[]>(() => {
    try { const s = localStorage.getItem('cre_col_layouts'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [activeLayoutName, setActiveLayoutName] = useState<string | null>(null);
  const [showSaveLayout, setShowSaveLayout] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const persistLayouts = (layouts: ColLayout[]) => {
    setSavedLayouts(layouts);
    try { localStorage.setItem('cre_col_layouts', JSON.stringify(layouts)); } catch {}
  };
  const saveCurrentLayout = () => {
    if (!newLayoutName.trim()) return;
    const layout: ColLayout = { name: newLayoutName.trim(), columns: [...visibleCols] };
    const existing = savedLayouts.filter(l => l.name !== layout.name);
    persistLayouts([...existing, layout]);
    setActiveLayoutName(layout.name);
    setNewLayoutName('');
    setShowSaveLayout(false);
  };
  const loadLayout = (layout: ColLayout) => {
    setVisibleCols(new Set(layout.columns));
    setActiveLayoutName(layout.name);
  };
  const deleteLayout = (name: string) => {
    persistLayouts(savedLayouts.filter(l => l.name !== name));
    if (activeLayoutName === name) setActiveLayoutName(null);
  };
  const resetToDefault = () => {
    setVisibleCols(new Set(DEFAULT_COL_KEYS));
    setActiveLayoutName(null);
  };

  const filtered = useMemo(() => {
    let d = [...data];
    if (search)             d = d.filter(l => l.tenant.toLowerCase().includes(search.toLowerCase()) || l.property.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter.size)  d = d.filter(l => statusFilter.has(l.status));
    if (typeFilter.size)    d = d.filter(l => typeFilter.has(l.type));
    if (leadFilter.size)    d = d.filter(l => leadFilter.has(l.clientLead));
    d.sort((a: any, b: any) => {
      const v = a[sort.col] < b[sort.col] ? -1 : a[sort.col] > b[sort.col] ? 1 : 0;
      return sort.dir === 'asc' ? v : -v;
    });
    return d;
  }, [data, search, statusFilter, typeFilter, leadFilter, sort]);

  const totalSqft   = filtered.reduce((s, l) => s + l.sqft, 0);
  const totalRent   = filtered.reduce((s, l) => s + l.totalRent, 0);
  const activeCount = filtered.filter(l => l.status === 'Active Initiative' || l.status === 'Active Disposition').length;

  const toggleSort = (col: string) =>
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });

  const SortIcon = ({ col }: { col: string }) => (
    sort.col === col
      ? sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />
      : <ChevronDown className="w-3 h-3 shrink-0 opacity-30" />
  );

  const handleFieldUpdate = (lease: LeaseRecord, field: keyof LeaseRecord, value: string) => {
    const updated: any = { ...lease, [field]: value };
    if (field === 'strategy') {
      const newStages = STRATEGY_STAGES[value] ?? [];
      if (!newStages.includes(updated.stage)) updated.stage = newStages[0] ?? '';
    }
    onUpdate(updated);
  };

  const exportToExcel = () => {
    const rows = filtered.map((l, idx) => ({
      '#': idx + 1,
      'Record ID': l.id,
      'Tenant': l.tenant,
      'Address': l.address || '',
      'Type': l.type,
      'Campus Type': l.property,
      'Client Lead': l.clientLead,
      'Status': l.status,
      'Strategy': l.strategy,
      'Stage': l.stage || '',
      'Lease Start': l.leaseStart,
      'Lease End': l.leaseEnd,
      'SF': l.sqft,
      'Rent PSF': l.rentPSF,
      'Annual Rent': l.totalRent,
      'Market': l.market,
      'Submarket': l.submarket,
      'Floors': l.floors,
      'Broker': l.broker,
      'Latitude': (l as any).lat ?? '',
      'Longitude': (l as any).lng ?? '',
      'CoStar ID': (l as any).costarId ?? '',
      'Last Note': (notes[l.id] ?? [])[0]?.text || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns based on header + content widths
    const colWidths = Object.keys(rows[0] || {}).map(key => {
      const maxLen = Math.max(key.length, ...rows.map(r => String((r as any)[key] ?? '').length));
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Property Database');
    XLSX.writeFile(wb, 'Transcend_Property_Database.xlsx');
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Total Leases"    value={String(filtered.length)}           delta={5}   deltaLabel="vs last yr"   icon={<Database className="w-4 h-4" />} accent="blue" />
        <KPICard label="Active"          value={String(activeCount)}                                                      icon={<CheckCircle2 className="w-4 h-4" />} accent="green" />
        <KPICard label="Total SF"        value={fmtSqft(totalSqft)}                delta={3.2} deltaLabel="YoY"           icon={<Building2 className="w-4 h-4" />} accent="purple" />
        <KPICard label="Avg Rent PSF"    value={filtered.length ? `$${(filtered.reduce((s,l)=>s+l.rentPSF,0)/filtered.length).toFixed(2)}` : '—'} delta={4.1} deltaLabel="YoY" icon={<ArrowUpRight className="w-4 h-4" />} accent="amber" />
        <KPICard label="Annual Rent"     value={fmt(totalRent)}                    delta={7.8} deltaLabel="YoY"           icon={<FileBarChart className="w-4 h-4" />} accent="blue" />
      </div>

      {/* Portfolio Map */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Portfolio Map</h3>
            <Badge variant="secondary" className="text-[10px] font-normal">{filtered.filter(l => l.lat && l.lng).length} locations</Badge>
          </div>
          <div className="flex items-center gap-2">
            {showMap && (
              <div className="flex border border-border rounded-md overflow-hidden h-7">
                <button
                  onClick={() => setMapStyle('grey')}
                  className={cn('px-2 text-[11px] flex items-center gap-1 transition-colors', mapStyle === 'grey' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}
                  title="Greyscale map"
                  data-testid="button-map-grey"
                >
                  <Moon className="w-3 h-3" />Greyscale
                </button>
                <button
                  onClick={() => setMapStyle('light')}
                  className={cn('px-2 text-[11px] flex items-center gap-1 transition-colors border-l border-border', mapStyle === 'light' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground')}
                  title="Light colored map"
                  data-testid="button-map-light"
                >
                  <Sun className="w-3 h-3" />Light
                </button>
              </div>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowMap(!showMap)}>
              {showMap ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showMap ? 'Hide Map' : 'Show Map'}
            </Button>
          </div>
        </div>
        {showMap && <PortfolioMap leases={filtered} onViewProfile={onViewProfile} mapStyle={mapStyle} />}
        {showMap && (
          <div className="flex gap-4 text-[10px] text-muted-foreground flex-wrap items-center mt-3 pt-3 border-t border-border">
            {Object.entries(statusMarkerColors).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                {status}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search tenants, properties…" className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Status Filter (multi-select) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 w-[160px] text-xs justify-between font-normal', statusFilter.size > 0 && 'border-primary/50 text-primary')}>
              {filterLabel(statusFilter, 'All Statuses', STATUSES)}
              <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-xs font-semibold text-muted-foreground">Status</p>
              {statusFilter.size > 0 && <button className="text-[10px] text-primary hover:underline" onClick={() => setStatusFilter(new Set())}>Clear</button>}
            </div>
            {STATUSES.map(s => (
              <label key={s} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox checked={statusFilter.has(s)} onCheckedChange={() => toggleFilter(statusFilter, s, setStatusFilter)} className="h-4 w-4" />
                {s}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {/* Type Filter (multi-select) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 w-[130px] text-xs justify-between font-normal', typeFilter.size > 0 && 'border-primary/50 text-primary')}>
              {filterLabel(typeFilter, 'All Types', PROPERTY_TYPES)}
              <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-2" align="start">
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-xs font-semibold text-muted-foreground">Type</p>
              {typeFilter.size > 0 && <button className="text-[10px] text-primary hover:underline" onClick={() => setTypeFilter(new Set())}>Clear</button>}
            </div>
            {PROPERTY_TYPES.map(t => (
              <label key={t} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox checked={typeFilter.has(t)} onCheckedChange={() => toggleFilter(typeFilter, t, setTypeFilter)} className="h-4 w-4" />
                {t}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {/* Lead Filter (multi-select) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 w-[130px] text-xs justify-between font-normal', leadFilter.size > 0 && 'border-primary/50 text-primary')}>
              {filterLabel(leadFilter, 'All Leads', CLIENT_LEADS)}
              <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="start">
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-xs font-semibold text-muted-foreground">Lead</p>
              {leadFilter.size > 0 && <button className="text-[10px] text-primary hover:underline" onClick={() => setLeadFilter(new Set())}>Clear</button>}
            </div>
            {CLIENT_LEADS.map(l => (
              <label key={l} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox checked={leadFilter.has(l)} onCheckedChange={() => toggleFilter(leadFilter, l, setLeadFilter)} className="h-4 w-4" />
                {l}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {/* Saved Layout Quick Switch */}
        {savedLayouts.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            {savedLayouts.map(layout => (
              <Button key={layout.name} variant={activeLayoutName === layout.name ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] px-2"
                onClick={() => loadLayout(layout)}>
                {layout.name}
              </Button>
            ))}
            <Button variant={activeLayoutName === null ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] px-2" onClick={resetToDefault}>All</Button>
          </div>
        )}
        {/* Column Toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 gap-1.5 text-xs', savedLayouts.length === 0 && 'ml-auto')}>
              <SlidersHorizontal className="w-3.5 h-3.5" />Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <div className="p-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground px-1 mb-1">Toggle Columns</p>
              {LEASE_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer text-sm">
                  <Checkbox checked={isColVisible(col.key)} onCheckedChange={() => { toggleCol(col.key); setActiveLayoutName(null); }} className="h-4 w-4" />
                  {col.label}
                </label>
              ))}
            </div>
            {/* Saved Layouts Section */}
            <div className="p-2 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground px-1">Saved Layouts</p>
              {savedLayouts.length === 0 && <p className="text-[11px] text-muted-foreground/60 px-1">No saved layouts yet</p>}
              {savedLayouts.map(layout => (
                <div key={layout.name} className={cn('flex items-center gap-1.5 px-1.5 py-1 rounded text-xs', activeLayoutName === layout.name ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50')}>
                  <button className="flex-1 text-left font-medium truncate" onClick={() => loadLayout(layout)}>{layout.name}</button>
                  <span className="text-[10px] text-muted-foreground shrink-0">{layout.columns.length} cols</span>
                  <button onClick={() => deleteLayout(layout.name)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors" title="Delete layout">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Save current */}
              {showSaveLayout ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input placeholder="Layout name…" value={newLayoutName} onChange={e => setNewLayoutName(e.target.value)}
                    className="h-7 text-xs flex-1" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveCurrentLayout(); if (e.key === 'Escape') setShowSaveLayout(false); }} />
                  <Button size="sm" className="h-7 text-[10px] px-2" disabled={!newLayoutName.trim()} onClick={saveCurrentLayout}>
                    <Save className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1.5" onClick={() => setShowSaveLayout(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs gap-1 justify-start" onClick={() => setShowSaveLayout(true)}>
                  <Save className="w-3 h-3" />Save Current Layout
                </Button>
              )}
              {activeLayoutName && (
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs gap-1 justify-start text-muted-foreground" onClick={resetToDefault}>
                  Reset to All Columns
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {!readOnly && onMassUpload && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onMassUpload}>
            <FileUp className="w-3.5 h-3.5" />Mass Upload
          </Button>
        )}
        {!readOnly && onMassDelete && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={onMassDelete}>
            <Trash2 className="w-3.5 h-3.5" />Mass Delete
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportToExcel}>
          <Download className="w-3.5 h-3.5" />Export
        </Button>
        {!readOnly && (
          <Button size="sm" className="h-8 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />Add Property
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left font-semibold w-[60px]">#</th>
                {isColVisible('tenant') && <th className="px-3 py-2.5 text-left font-semibold cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort('tenant')}>
                  <span className="flex items-center gap-1">Tenant <SortIcon col="tenant" /></span>
                </th>}
                {isColVisible('address') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Address</th>}
                {isColVisible('type') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Type</th>}
                {isColVisible('campusType') && <th className="px-3 py-2.5 text-left font-semibold cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort('property')}>
                  <span className="flex items-center gap-1">Campus Type <SortIcon col="property" /></span>
                </th>}
                {isColVisible('clientLead') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Client Lead</th>}
                {isColVisible('status') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Status</th>}
                {isColVisible('strategy') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Strategy</th>}
                {isColVisible('expiration') && <th className="px-3 py-2.5 text-left font-semibold cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort('leaseEnd')}>
                  <span className="flex items-center gap-1">Expiration <SortIcon col="leaseEnd" /></span>
                </th>}
                {isColVisible('stage') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Stage</th>}
                {isColVisible('latitude') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Latitude</th>}
                {isColVisible('longitude') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Longitude</th>}
                {isColVisible('costarId') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">CoStar ID</th>}
                {isColVisible('lastNote') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Last Note</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l, idx) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors group">
                  {/* # with profile button */}
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onViewProfile(l.id)}
                      className="w-7 h-7 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-xs font-bold tabular-nums transition-colors flex items-center justify-center"
                      title={`Open profile: ${l.property}`}
                    >
                      {idx + 1}
                    </button>
                  </td>
                  {/* Tenant */}
                  {isColVisible('tenant') && <td className="px-3 py-2.5 font-medium whitespace-normal break-words">{l.tenant}</td>}
                  {/* Address */}
                  {isColVisible('address') && <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-normal break-words">{l.address || '—'}</td>}
                  {/* Type */}
                  {isColVisible('type') && <td className="px-1 py-1.5 min-w-[110px]">
                    <SelectCell value={l.type} options={PROPERTY_TYPES} onChange={v => handleFieldUpdate(l, 'type', v)} disabled={readOnly} />
                  </td>}
                  {/* Campus Type */}
                  {isColVisible('campusType') && <td className="px-3 py-2.5 text-muted-foreground whitespace-normal break-words">{l.property}</td>}
                  {/* Client Lead */}
                  {isColVisible('clientLead') && <td className="px-1 py-1.5 min-w-[100px]">
                    <SelectCell value={l.clientLead} options={CLIENT_LEADS} onChange={v => handleFieldUpdate(l, 'clientLead', v)} disabled={readOnly} />
                  </td>}
                  {/* Status */}
                  {isColVisible('status') && <td className="px-1 py-1.5 min-w-[160px]">
                    <SelectCell value={l.status} options={STATUSES} onChange={v => handleFieldUpdate(l, 'status', v)} colorMap={STATUS_STYLES} disabled={readOnly} />
                  </td>}
                  {/* Strategy */}
                  {isColVisible('strategy') && <td className="px-1 py-1.5 min-w-[160px]">
                    <SelectCell
                      value={l.strategy}
                      options={STRATEGIES}
                      onChange={v => handleFieldUpdate(l, 'strategy', v)}
                      disabled={readOnly}
                    />
                  </td>}
                  {/* Expiration */}
                  {isColVisible('expiration') && <td className="px-3 py-2.5 tabular-nums whitespace-nowrap font-medium text-xs">{l.leaseEnd}</td>}
                  {/* Stage */}
                  {isColVisible('stage') && <td className="px-1 py-1.5 min-w-[160px]">
                    {(STRATEGY_STAGES[l.strategy] ?? []).length > 0 ? (
                      <SelectCell
                        value={l.stage}
                        options={STRATEGY_STAGES[l.strategy]}
                        onChange={v => handleFieldUpdate(l, 'stage', v)}
                        disabled={readOnly}
                      />
                    ) : (
                      <span className="px-2 text-xs text-muted-foreground">—</span>
                    )}
                  </td>}
                  {/* Latitude */}
                  {isColVisible('latitude') && <td className="px-2 py-1.5 min-w-[110px]">
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="—"
                      value={(l as any).lat ?? ''}
                      disabled={readOnly}
                      onChange={e => {
                        const raw = e.target.value;
                        const num = raw === '' ? undefined : Number(raw);
                        const updated: any = { ...l, lat: Number.isFinite(num as number) ? num : undefined };
                        onUpdate(updated);
                      }}
                      className="h-7 text-xs tabular-nums px-1.5"
                    />
                  </td>}
                  {/* Longitude */}
                  {isColVisible('longitude') && <td className="px-2 py-1.5 min-w-[110px]">
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="—"
                      value={(l as any).lng ?? ''}
                      disabled={readOnly}
                      onChange={e => {
                        const raw = e.target.value;
                        const num = raw === '' ? undefined : Number(raw);
                        const updated: any = { ...l, lng: Number.isFinite(num as number) ? num : undefined };
                        onUpdate(updated);
                      }}
                      className="h-7 text-xs tabular-nums px-1.5"
                    />
                  </td>}
                  {/* CoStar ID */}
                  {isColVisible('costarId') && <td className="px-2 py-1.5 min-w-[110px]">
                    <Input
                      type="text"
                      placeholder="—"
                      value={(l as any).costarId ?? ''}
                      disabled={readOnly}
                      onChange={e => onUpdate({ ...l, costarId: e.target.value } as any)}
                      className="h-7 text-xs tabular-nums px-1.5"
                    />
                  </td>}
                  {/* Last Note */}
                  {isColVisible('lastNote') && <td className="px-3 py-2.5 min-w-[280px]">
                    {(() => {
                      const latest = (notes[l.id] ?? [])[0];
                      if (!latest) return <span className="text-xs text-muted-foreground italic">—</span>;
                      return (
                        <div className="space-y-0.5">
                          <p className="text-xs leading-snug whitespace-normal break-words">{latest.text}</p>
                          <p className="text-[10px] text-muted-foreground">{latest.author} · {latest.date}</p>
                        </div>
                      );
                    })()}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} of {data.length} leases · sorted by expiration</span>
          <span>Total: {fmtSqft(totalSqft)} · {fmt(totalRent)} annual rent</span>
        </div>
      </div>
    </div>
  );
}

// ── Active Initiatives ────────────────────────────────────────────────────────

function InitiativesModule({ allLeases, notes, onUpdate, onViewProfile, onShareSnapshot, milestones, readOnly }: {
  allLeases: LeaseRecord[];
  notes: Record<number, LeaseNote[]>;
  onUpdate: (updated: LeaseRecord) => void;
  onViewProfile: (id: number) => void;
  onShareSnapshot: () => void;
  milestones: Record<number, Milestone[]>;
  readOnly?: boolean;
}) {
  // Internal filter: only Active Initiative + Active Disposition
  const activeLeases = useMemo(
    () => allLeases.filter(l => l.status === 'Active Initiative' || l.status === 'Active Disposition'),
    [allLeases]
  );

  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<Set<string>>(new Set());
  const [strategyFilter, setStrategyFilter] = useState<Set<string>>(new Set());
  const [leadFilter, setLeadFilter]       = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'leaseEnd', dir: 'asc' });
  const [viewMode, setViewMode]           = useState<'cards' | 'table'>('table');

  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    setter(next);
  };
  const filterLabel = (set: Set<string>, allLabel: string) =>
    set.size === 0 ? allLabel : set.size === 1 ? [...set][0] : `${set.size} selected`;

  // Column visibility
  const AI_COLUMNS = [
    { key: 'tenant',   label: 'Tenant' },
    { key: 'address',  label: 'Address' },
    { key: 'property', label: 'Property' },
    { key: 'type',     label: 'Type' },
    { key: 'status',   label: 'Status' },
    { key: 'strategy', label: 'Strategy' },
    { key: 'stage',    label: 'Stage' },
    { key: 'progress', label: 'Progress' },
    { key: 'leaseExp', label: 'Lease Exp' },
    { key: 'urgency',  label: 'Urgency' },
    { key: 'sf',       label: 'SF' },
    { key: 'lead',     label: 'Lead' },
    { key: 'lastNote', label: 'Last Note' },
  ] as const;
  const [aiVisibleCols, setAiVisibleCols] = useState<Set<string>>(
    () => new Set(AI_COLUMNS.map(c => c.key))
  );
  const toggleAiCol = (key: string) => setAiVisibleCols(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const isAiColVisible = (key: string) => aiVisibleCols.has(key);

  const toggleSort = (col: string) =>
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  const SortIcon = ({ col }: { col: string }) => (
    sort.col === col
      ? sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />
      : <ChevronDown className="w-3 h-3 shrink-0 opacity-30" />
  );

  const filtered = useMemo(() => {
    let d = [...activeLeases];
    if (search)            d = d.filter(l =>
      l.tenant.toLowerCase().includes(search.toLowerCase()) ||
      l.property.toLowerCase().includes(search.toLowerCase()) ||
      l.address?.toLowerCase().includes(search.toLowerCase()) ||
      l.strategy.toLowerCase().includes(search.toLowerCase()) ||
      l.stage.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter.size)   d = d.filter(l => statusFilter.has(l.status));
    if (strategyFilter.size) d = d.filter(l => strategyFilter.has(l.strategy));
    if (leadFilter.size)     d = d.filter(l => leadFilter.has(l.clientLead));
    d.sort((a: any, b: any) => {
      const v = a[sort.col] < b[sort.col] ? -1 : a[sort.col] > b[sort.col] ? 1 : 0;
      return sort.dir === 'asc' ? v : -v;
    });
    return d;
  }, [activeLeases, search, statusFilter, strategyFilter, leadFilter, sort]);

  const handleFieldUpdate = (lease: LeaseRecord, field: keyof LeaseRecord, value: string) => {
    const updated: any = { ...lease, [field]: value };
    if (field === 'strategy') {
      const newStages = STRATEGY_STAGES[value] ?? [];
      if (!newStages.includes(updated.stage)) updated.stage = newStages[0] ?? '';
    }
    onUpdate(updated);
  };

  // KPI calculations
  const totalActive  = activeLeases.length;
  const pmProjects   = activeLeases.filter(l => l.strategy === 'Project Management').length;
  const totalSqft    = activeLeases.reduce((s, l) => s + l.sqft, 0);
  const avgProgress  = activeLeases.length ? Math.round(activeLeases.reduce((s, l) => {
    const stages = STRATEGY_STAGES[l.strategy] ?? [];
    return s + calcProgress(stages, l.stage);
  }, 0) / activeLeases.length) : 0;

  const getUrgencyColor = (leaseEnd: string) => {
    const months = (new Date(leaseEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    if (months < 6)  return 'border-red-400 dark:border-red-600';
    if (months < 18) return 'border-amber-400 dark:border-amber-600';
    return 'border-border';
  };

  const getUrgencyBadge = (leaseEnd: string) => {
    const months = (new Date(leaseEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    if (months < 0)  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px]">Expired</Badge>;
    if (months < 6)  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px]">{'<'}6mo</Badge>;
    if (months < 12) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px]">{'<'}12mo</Badge>;
    if (months < 24) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 text-[10px]">{'<'}24mo</Badge>;
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">24mo+</Badge>;
  };

  const activeStatuses   = ['Active Initiative', 'Active Disposition'];
  const activeStrategies = [...new Set(activeLeases.map(l => l.strategy))].filter(Boolean).sort();

  return (
    <div className="space-y-4">
      {/* Active-only banner */}
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-lg">
        <Filter className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
        <span className="text-xs font-medium text-green-800 dark:text-green-300">Showing {activeLeases.length} active initiative{activeLeases.length !== 1 ? 's' : ''}</span>
        <span className="text-xs text-green-600/80 dark:text-green-400/60">— filtered from {allLeases.length} total leases</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Active" value={String(totalActive)} icon={<Activity className="w-4 h-4" />} accent="green" />
        <KPICard label="PM Projects" value={String(pmProjects)} icon={<HardHat className="w-4 h-4" />} accent="purple" />
        <KPICard label="Total Active SF" value={fmtSqft(totalSqft)} icon={<Building2 className="w-4 h-4" />} accent="blue" />
        <KPICard label="Avg Progress" value={`${avgProgress}%`} icon={<BarChart2 className="w-4 h-4" />} accent="amber" />
      </div>

      {/* Milestone Completion Tracker */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const soonStr = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        const allMs: (Milestone & { leaseId: number; tenant: string; property: string })[] = [];
        activeLeases.forEach(l => {
          (milestones[l.id] ?? []).forEach(ms => allMs.push({ ...ms, leaseId: l.id, tenant: l.tenant, property: l.property }));
        });
        const overdue  = allMs.filter(m => m.date < todayStr);
        const upcoming = allMs.filter(m => m.date >= todayStr && m.date <= soonStr);
        const onTrack  = allMs.filter(m => m.date > soonStr);

        if (allMs.length === 0) return null;

        return (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-500" />Milestone Completion Tracker
              </h3>
              <span className="text-xs text-muted-foreground">{allMs.length} milestones across {activeLeases.filter(l => (milestones[l.id] ?? []).length > 0).length} locations</span>
            </div>

            {/* Summary counters */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">Overdue</span>
                </div>
                <span className="text-xl font-bold text-red-700 dark:text-red-400 tabular-nums">{overdue.length}</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Upcoming (30d)</span>
                </div>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">{upcoming.length}</span>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">On Track</span>
                </div>
                <span className="text-xl font-bold text-green-700 dark:text-green-400 tabular-nums">{onTrack.length}</span>
              </div>
            </div>

            {/* Milestone list */}
            {allMs.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {allMs.sort((a, b) => a.date < b.date ? -1 : 1).map(ms => {
                  const isOverdue = ms.date < todayStr;
                  const isUpcoming = !isOverdue && ms.date <= soonStr;
                  return (
                    <div key={ms.id} className={cn('flex items-center gap-3 px-3 py-1.5 rounded-md text-xs',
                      isOverdue ? 'bg-red-50/50 dark:bg-red-950/20' : isUpcoming ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'bg-muted/30'
                    )}>
                      <Diamond className={cn('w-3 h-3 shrink-0',
                        isOverdue ? 'text-red-500 fill-red-500' : isUpcoming ? 'text-amber-500 fill-amber-500' : 'text-blue-500 fill-blue-500'
                      )} />
                      <span className="font-medium flex-1 truncate">{ms.label}</span>
                      <span className="text-muted-foreground truncate max-w-[140px]">{ms.tenant} — {ms.property}</span>
                      <span className={cn('tabular-nums shrink-0', isOverdue ? 'text-red-600 font-semibold dark:text-red-400' : 'text-muted-foreground')}>{fmtDateShort(ms.date)}</span>
                      {isOverdue && <Badge className="text-[9px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 shrink-0">Overdue</Badge>}
                      {isUpcoming && <Badge className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 shrink-0">Soon</Badge>}
                      {!isOverdue && !isUpcoming && <Badge className="text-[9px] px-1 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 shrink-0">On Track</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search tenant, property, strategy, stage…" className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Status filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 w-[160px] text-xs justify-between font-normal', statusFilter.size > 0 && 'border-primary/50 text-primary')}>
              {filterLabel(statusFilter, 'All Statuses')}
              <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-xs font-semibold text-muted-foreground">Status</p>
              {statusFilter.size > 0 && <button className="text-[10px] text-primary hover:underline" onClick={() => setStatusFilter(new Set())}>Clear</button>}
            </div>
            {activeStatuses.map(s => (
              <label key={s} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox checked={statusFilter.has(s)} onCheckedChange={() => toggleFilter(statusFilter, s, setStatusFilter)} className="h-4 w-4" />
                {s}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {/* Strategy filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 w-[150px] text-xs justify-between font-normal', strategyFilter.size > 0 && 'border-primary/50 text-primary')}>
              {filterLabel(strategyFilter, 'All Strategies')}
              <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-xs font-semibold text-muted-foreground">Strategy</p>
              {strategyFilter.size > 0 && <button className="text-[10px] text-primary hover:underline" onClick={() => setStrategyFilter(new Set())}>Clear</button>}
            </div>
            {activeStrategies.map(s => (
              <label key={s} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox checked={strategyFilter.has(s)} onCheckedChange={() => toggleFilter(strategyFilter, s, setStrategyFilter)} className="h-4 w-4" />
                {s}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {/* Lead filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-8 w-[130px] text-xs justify-between font-normal', leadFilter.size > 0 && 'border-primary/50 text-primary')}>
              {filterLabel(leadFilter, 'All Leads')}
              <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-2" align="start">
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-xs font-semibold text-muted-foreground">Lead</p>
              {leadFilter.size > 0 && <button className="text-[10px] text-primary hover:underline" onClick={() => setLeadFilter(new Set())}>Clear</button>}
            </div>
            {CLIENT_LEADS.map(l => (
              <label key={l} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox checked={leadFilter.has(l)} onCheckedChange={() => toggleFilter(leadFilter, l, setLeadFilter)} className="h-4 w-4" />
                {l}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        {/* Column Toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs ml-auto">
              <SlidersHorizontal className="w-3.5 h-3.5" />Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="end">
            <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Toggle Columns</p>
            {AI_COLUMNS.map(col => (
              <label key={col.key} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox checked={isAiColVisible(col.key)} onCheckedChange={() => toggleAiCol(col.key)} className="h-4 w-4" />
                {col.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onShareSnapshot}>
          <Share2 className="w-3.5 h-3.5" />Share Snapshot
        </Button>
        <div className="flex border border-border rounded-md overflow-hidden">
          <button onClick={() => setViewMode('table')} className={cn('px-2 py-1.5 text-xs', viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')} title="Table view">
            <Database className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode('cards')} className={cn('px-2 py-1.5 text-xs', viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')} title="Card view">
            <BarChart2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active initiatives match your filters.</p>
        </div>
      )}

      {/* Table View — inline editable cells */}
      {viewMode === 'table' && filtered.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
                  <th className="px-3 py-2.5 text-left font-semibold w-[48px]">#</th>
                  {isAiColVisible('tenant')   && <th className="px-3 py-2.5 text-left font-semibold cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort('tenant')}><span className="flex items-center gap-1">Tenant <SortIcon col="tenant" /></span></th>}
                  {isAiColVisible('address')  && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Address</th>}
                  {isAiColVisible('property') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Property</th>}
                  {isAiColVisible('type')     && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Type</th>}
                  {isAiColVisible('status')   && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Status</th>}
                  {isAiColVisible('strategy') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Strategy</th>}
                  {isAiColVisible('stage')    && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Stage</th>}
                  {isAiColVisible('progress') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Progress</th>}
                  {isAiColVisible('leaseExp') && <th className="px-3 py-2.5 text-left font-semibold cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort('leaseEnd')}><span className="flex items-center gap-1">Lease Exp <SortIcon col="leaseEnd" /></span></th>}
                  {isAiColVisible('urgency')  && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Urgency</th>}
                  {isAiColVisible('sf')       && <th className="px-3 py-2.5 text-left font-semibold cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort('sqft')}><span className="flex items-center gap-1">SF <SortIcon col="sqft" /></span></th>}
                  {isAiColVisible('lead')     && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Lead</th>}
                  {isAiColVisible('lastNote') && <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Last Note</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((lease, idx) => {
                  const stages   = STRATEGY_STAGES[lease.strategy] ?? [];
                  const progress = calcProgress(stages, lease.stage);
                  const lastNote = (notes[lease.id] ?? [])[0];
                  return (
                    <tr key={lease.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-3 py-2.5">
                        <button onClick={() => onViewProfile(lease.id)}
                          className="w-7 h-7 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground text-xs font-bold tabular-nums transition-colors flex items-center justify-center"
                          title={`Open profile: ${lease.property}`}>
                          {idx + 1}
                        </button>
                      </td>
                      {isAiColVisible('tenant')   && <td className="px-3 py-2.5 font-medium whitespace-normal break-words text-sm">{lease.tenant}</td>}
                      {isAiColVisible('address')  && <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-normal break-words">{lease.address || '—'}</td>}
                      {isAiColVisible('property') && <td className="px-3 py-2.5 text-xs whitespace-normal break-words">{lease.property}</td>}
                      {isAiColVisible('type')     && <td className="px-1 py-1.5 min-w-[110px]"><SelectCell value={lease.type} options={PROPERTY_TYPES} onChange={v => handleFieldUpdate(lease, 'type', v)} disabled={readOnly} /></td>}
                      {isAiColVisible('status')   && <td className="px-1 py-1.5 min-w-[160px]"><SelectCell value={lease.status} options={STATUSES} onChange={v => handleFieldUpdate(lease, 'status', v)} colorMap={STATUS_STYLES} disabled={readOnly} /></td>}
                      {isAiColVisible('strategy') && <td className="px-1 py-1.5 min-w-[160px]"><SelectCell value={lease.strategy} options={STRATEGIES} onChange={v => handleFieldUpdate(lease, 'strategy', v)} disabled={readOnly} /></td>}
                      {isAiColVisible('stage')    && <td className="px-1 py-1.5 min-w-[160px]">
                        {stages.length > 0
                          ? <SelectCell value={lease.stage} options={stages} onChange={v => handleFieldUpdate(lease, 'stage', v)} disabled={readOnly} />
                          : <span className="px-2 text-xs text-muted-foreground">—</span>}
                      </td>}
                      {isAiColVisible('progress') && <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{progress}%</span>
                        </div>
                      </td>}
                      {isAiColVisible('leaseExp') && <td className="px-3 py-2.5 text-xs font-medium whitespace-nowrap tabular-nums">{fmtDateShort(lease.leaseEnd)}</td>}
                      {isAiColVisible('urgency')  && <td className="px-3 py-2.5">{getUrgencyBadge(lease.leaseEnd)}</td>}
                      {isAiColVisible('sf')       && <td className="px-3 py-2.5 text-xs tabular-nums">{lease.sqft.toLocaleString()}</td>}
                      {isAiColVisible('lead')     && <td className="px-1 py-1.5 min-w-[140px]"><SelectCell value={lease.clientLead} options={CLIENT_LEADS} onChange={v => handleFieldUpdate(lease, 'clientLead', v)} disabled={readOnly} /></td>}
                      {isAiColVisible('lastNote') && <td className="px-3 py-2.5 min-w-[260px]">
                        {lastNote ? (
                          <div className="space-y-0.5">
                            <p className="text-xs leading-snug whitespace-normal break-words">{lastNote.text}</p>
                            <p className="text-[10px] text-muted-foreground">{lastNote.author} · {lastNote.date}</p>
                          </div>
                        ) : <span className="text-xs text-muted-foreground italic">—</span>}
                      </td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} of {activeLeases.length} active initiatives</span>
            <span>Total: {fmtSqft(filtered.reduce((s,l) => s + l.sqft, 0))}</span>
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'cards' && filtered.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((lease) => {
            const lNotes     = notes[lease.id] ?? [];
            const latestNote = lNotes[0];
            const stages     = STRATEGY_STAGES[lease.strategy] ?? [];
            const progress   = calcProgress(stages, lease.stage);
            return (
              <div key={lease.id} className={cn('bg-card border-l-4 border rounded-lg p-4 space-y-3', getUrgencyColor(lease.leaseEnd))}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{lease.property}</p>
                    {lease.address && <p className="text-xs text-muted-foreground/80 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{lease.address}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{lease.tenant} · {lease.submarket}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn('text-[10px] border-0', STATUS_STYLES[lease.status] || '')}>{lease.status}</Badge>
                    {getUrgencyBadge(lease.leaseEnd)}
                    <button onClick={() => onViewProfile(lease.id)}
                      className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title="Open building profile">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Strategy:</span>
                  <span className="font-medium">{lease.strategy}</span>
                  {lease.stage && <><span className="text-muted-foreground">·</span><span className="font-medium text-primary">{lease.stage}</span></>}
                </div>
                {stages.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                )}
                {latestNote && (
                  <div className="bg-muted/40 rounded-md px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      <StickyNote className="w-3 h-3" />{latestNote.author} · {latestNote.date}
                    </p>
                    <p className="text-xs leading-relaxed line-clamp-2">{latestNote.text}</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>Lead: <span className="font-medium text-foreground">{lease.clientLead}</span></span>
                  <span>Expires: <span className="font-medium text-foreground">{fmtDateShort(lease.leaseEnd)}</span></span>
                  <span>{fmtSqft(lease.sqft)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Portfolio Roadmap ─────────────────────────────────────────────────────────

function RoadmapModule({ allLeases, notes, onViewProfile, manualDates, onSetManualDate, milestones, clientLogos, dashboardLogo, portfolioName, readOnly }: {
  allLeases: LeaseRecord[];
  notes: Record<number, LeaseNote[]>;
  onViewProfile: (id: number) => void;
  manualDates: Record<number, string>;
  onSetManualDate: (leaseId: number, date: string) => void;
  milestones: Record<number, Milestone[]>;
  clientLogos: Record<string, string>;
  dashboardLogo: string;
  portfolioName: string;
  readOnly?: boolean;
}) {
  const [editingDate, setEditingDate] = useState<number | null>(null);
  const [tempDate, setTempDate]       = useState('');
  const [filterLead, setFilterLead]   = useState('all');
  const [showBulkDate, setShowBulkDate] = useState(false);
  const [bulkDate, setBulkDate]         = useState('');

  // Sliding window state
  type ViewRange = 6 | 12 | 18 | 24 | 'all';
  const [viewRange, setViewRange] = useState<ViewRange>(12);
  // windowOffset = # of months to shift the window start (negative = past, positive = future)
  const [windowOffset, setWindowOffset] = useState(0);

  // Active initiatives for the Gantt — split into PM vs Non-PM
  const activeLeases = useMemo(() => {
    let d = allLeases.filter(l => l.status === 'Active Initiative' || l.status === 'Active Disposition');
    if (filterLead !== 'all') d = d.filter(l => l.clientLead === filterLead);
    return d.sort((a, b) => a.leaseEnd < b.leaseEnd ? -1 : 1);
  }, [allLeases, filterLead]);

  const nonPmLeases = useMemo(() => activeLeases.filter(l => l.strategy !== 'Project Management'), [activeLeases]);
  const pmLeases    = useMemo(() => activeLeases.filter(l => l.strategy === 'Project Management'), [activeLeases]);

  const pmCount = pmLeases.length;

  // Full date range (for PDF and 'all' mode)
  const today = new Date();
  const fullGanttStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const fullGanttEnd   = new Date(today.getFullYear() + 5, 11, 31);
  const fullTotalDays  = Math.ceil((fullGanttEnd.getTime() - fullGanttStart.getTime()) / (1000 * 60 * 60 * 24));

  // Sliding window date range
  const windowMonths = viewRange === 'all' ? 0 : viewRange;
  const ganttStart = viewRange === 'all'
    ? fullGanttStart
    : new Date(today.getFullYear(), today.getMonth() - 1 + windowOffset, 1);
  const ganttEnd = viewRange === 'all'
    ? fullGanttEnd
    : new Date(ganttStart.getFullYear(), ganttStart.getMonth() + windowMonths, 0); // last day of window
  const totalDays = Math.ceil((ganttEnd.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24));

  // Window label for display
  const MONTH_NAMES_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const windowLabel = viewRange === 'all' ? 'All Projects'
    : `${MONTH_NAMES_FULL[ganttStart.getMonth()]} ${ganttStart.getFullYear()} — ${MONTH_NAMES_FULL[ganttEnd.getMonth()]} ${ganttEnd.getFullYear()}`;

  const toPercent = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = Math.ceil((d.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100; // allow negative and > 100 for clipping
  };

  // Clipped version for visibility checks
  const toClipped = (dateStr: string) => Math.max(0, Math.min(100, toPercent(dateStr)));

  const todayPercent = toPercent(today.toISOString().slice(0, 10));

  // Full-range toPercent for PDF export
  const toPercentFull = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = Math.ceil((d.getTime() - fullGanttStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, (days / fullTotalDays) * 100));
  };

  // Month markers for the visible window
  const MONTH_ABBREV = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthMarkers: { label: string; pct: number; isJan: boolean; year: number; fullLabel: string }[] = [];
  const mCursor = new Date(ganttStart.getFullYear(), ganttStart.getMonth(), 1);
  const mEnd = new Date(ganttEnd.getFullYear(), ganttEnd.getMonth() + 1, 1);
  while (mCursor <= mEnd) {
    const pct = toPercent(mCursor.toISOString().slice(0, 10));
    if (pct >= 0 && pct <= 100) {
      monthMarkers.push({
        label: MONTH_ABBREV[mCursor.getMonth()],
        fullLabel: `${MONTH_ABBREV[mCursor.getMonth()]} ${mCursor.getFullYear()}`,
        pct,
        isJan: mCursor.getMonth() === 0,
        year: mCursor.getFullYear(),
      });
    }
    mCursor.setMonth(mCursor.getMonth() + 1);
  }

  // Year markers (for PDF export)
  const yearMarkers: { year: number; pct: number }[] = [];
  for (let y = fullGanttStart.getFullYear(); y <= fullGanttEnd.getFullYear(); y++) {
    const pct = toPercentFull(`${y}-01-01`);
    if (pct > 0 && pct < 100) yearMarkers.push({ year: y, pct });
  }

  // Navigation handlers
  const slideLeft  = () => setWindowOffset(o => o - (viewRange === 'all' ? 0 : Math.max(3, Math.round(windowMonths / 2))));
  const slideRight = () => setWindowOffset(o => o + (viewRange === 'all' ? 0 : Math.max(3, Math.round(windowMonths / 2))));
  const slideToToday = () => setWindowOffset(0);

  // Reset offset when view range changes
  useEffect(() => { setWindowOffset(0); }, [viewRange]);

  // Color by strategy type
  const STRATEGY_COLORS: Record<string, { bg: string; light: string }> = {
    'Project Management':  { bg: '#8B5CF6', light: '#EDE9FE' },
    'Maintain / Renew':    { bg: '#22C55E', light: '#DCFCE7' },
    'New Project':         { bg: '#06B6D4', light: '#CFFAFE' },
    'Relocate':            { bg: '#F59E0B', light: '#FEF3C7' },
    'Restructure / Renew': { bg: '#3B82F6', light: '#DBEAFE' },
    'Close':               { bg: '#EF4444', light: '#FEE2E2' },
    'Sublease / Buyout':   { bg: '#EC4899', light: '#FCE7F3' },
    'Sale':                { bg: '#F97316', light: '#FFEDD5' },
    'Purchase':            { bg: '#84CC16', light: '#F7FEE7' },
  };
  const DEFAULT_COLOR = { bg: '#94A3B8', light: '#F1F5F9' };

  const getGanttColor = (lease: LeaseRecord) =>
    STRATEGY_COLORS[lease.strategy] ?? DEFAULT_COLOR;

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const exportRoadmapPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 40;
    const labelW = 130;
    const chartX = margin + labelW + 10;
    const chartW = pw - chartX - margin;
    const barH = 18;
    const barGap = 4;
    const headerH = 70;
    const todayStr = today.toISOString().slice(0, 10);

    // Colors
    const navy = [26, 42, 68];
    const white = [255, 255, 255];
    const lightGray = [240, 240, 240];

    // Header
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, pw, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(portfolioName || 'Transcend Portfolio', margin, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Active Project Timeline — Roadmap Gantt', margin, 46);
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(reportDate, pw - margin, 30, { align: 'right' });
    doc.text(`${activeLeases.length} active projects`, pw - margin, 46, { align: 'right' });

    let y = headerH + 20;

    // Year headers
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    yearMarkers.forEach(({ year, pct }) => {
      const xPos = chartX + (pct / 100) * chartW;
      doc.text(String(year), xPos, y, { align: 'center' });
    });
    y += 14;

    // Draw bars
    activeLeases.forEach((lease, idx) => {
      // Check page overflow
      if (y + barH + barGap > ph - 50) {
        doc.addPage();
        y = margin;
      }

      const stages = STRATEGY_STAGES[lease.strategy] ?? [];
      const progress = calcProgress(stages, lease.stage) / 100;
      const endDate = manualDates[lease.id] || lease.leaseEnd;
      const startPct = toPercentFull(lease.leaseStart) / 100;
      const endPct = toPercentFull(endDate) / 100;
      const bw = Math.max(0.02, endPct - startPct);
      const colors = getGanttColor(lease);

      // Row background
      if (idx % 2 === 0) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(margin, y - 1, pw - 2 * margin, barH + 2, 'F');
      }

      // Year grid lines
      yearMarkers.forEach(({ pct }) => {
        const xPos = chartX + (pct / 100) * chartW;
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.5);
        doc.line(xPos, y - 1, xPos, y + barH + 1);
      });

      // Label
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      const label = lease.tenant.length > 22 ? lease.tenant.slice(0, 20) + '...' : lease.tenant;
      doc.text(label, margin + 4, y + barH / 2 + 2.5);

      // Bar background (light)
      const hexToRgb = (hex: string): [number, number, number] => {
        const v = parseInt(hex.replace('#', ''), 16);
        return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
      };
      const lightRgb = hexToRgb(colors.light);
      doc.setFillColor(lightRgb[0], lightRgb[1], lightRgb[2]);
      const bx = chartX + startPct * chartW;
      const bWidth = bw * chartW;
      doc.roundedRect(bx, y, bWidth, barH, 2, 2, 'F');

      // Progress fill
      const bgRgb = hexToRgb(colors.bg);
      doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
      doc.roundedRect(bx, y, bWidth * progress, barH, 2, 2, 'F');

      // Stage text on bar
      if (bWidth > 40) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(progress > 0.3 ? 255 : bgRgb[0], progress > 0.3 ? 255 : bgRgb[1], progress > 0.3 ? 255 : bgRgb[2]);
        doc.text(lease.stage || '', bx + 4, y + barH / 2 + 2);
      }

      // Milestone diamonds on bar
      (milestones[lease.id] ?? []).forEach(ms => {
        const msPct = toPercentFull(ms.date) / 100;
        const mx = chartX + msPct * chartW;
        const isOverdue = ms.date < todayStr;
        const dColor = isOverdue ? [239, 68, 68] : [245, 158, 11];
        doc.setFillColor(dColor[0], dColor[1], dColor[2]);
        // Draw diamond shape
        const dy = y + barH / 2;
        const ds = 4;
        doc.triangle(mx, dy - ds, mx + ds, dy, mx, dy + ds, 'F');
        doc.triangle(mx, dy - ds, mx - ds, dy, mx, dy + ds, 'F');
      });

      y += barH + barGap;
    });

    // Today line
    const todayX = chartX + (toPercentFull(todayStr) / 100) * chartW;
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(1.5);
    doc.line(todayX, headerH + 30, todayX, y + 4);
    doc.setFontSize(6);
    doc.setTextColor(239, 68, 68);
    doc.text('Today', todayX + 3, headerH + 36);

    // Legend at bottom
    y += 16;
    if (y > ph - 50) { doc.addPage(); y = margin; }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Legend:', margin, y);
    let lx = margin + 35;
    const usedStrategies = [...new Set(activeLeases.map(l => l.strategy))];
    usedStrategies.forEach(strat => {
      const col = STRATEGY_COLORS[strat] ?? DEFAULT_COLOR;
      const rgb = hexToRgbArr(col.bg);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(lx, y - 6, 10, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(strat, lx + 13, y);
      lx += doc.getTextWidth(strat) + 22;
    });
    // Today legend
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(1.5);
    doc.line(lx, y - 5, lx, y + 1);
    doc.setTextColor(80, 80, 80);
    doc.text('Today', lx + 4, y);
    lx += 30;
    // Milestone legend
    doc.setFillColor(245, 158, 11);
    const mly = y - 3;
    doc.triangle(lx + 4, mly - 3.5, lx + 7.5, mly, lx + 4, mly + 3.5, 'F');
    doc.triangle(lx + 4, mly - 3.5, lx + 0.5, mly, lx + 4, mly + 3.5, 'F');
    doc.text('Milestone', lx + 11, y);

    // Footer
    const footY = ph - 20;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footY - 10, pw - margin, footY - 10);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Transcend — Confidential', margin, footY);
    doc.text(reportDate, pw - margin, footY, { align: 'right' });

    doc.save('Transcend_Roadmap_Gantt.pdf');
  };

  const hexToRgbArr = (hex: string): [number, number, number] => {
    const v = parseInt(hex.replace('#', ''), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };

  const startEditDate = (leaseId: number) => {
    setEditingDate(leaseId);
    setTempDate(manualDates[leaseId] ?? '');
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Active Projects" value={String(activeLeases.length)}                                              icon={<Activity className="w-4 h-4" />}     accent="green" />
        <KPICard label="PM Projects"     value={String(pmCount)}                                                           icon={<Layers className="w-4 h-4" />}       accent="purple" />
        <KPICard label="Expiring 2025"   value={`${allLeases.filter(l=>l.leaseEnd.startsWith('2025')).length} leases`}    icon={<AlertCircle className="w-4 h-4" />}   accent="red" />
        <KPICard label="Expiring 2026"   value={`${allLeases.filter(l=>l.leaseEnd.startsWith('2026')).length} leases`}    icon={<AlertCircle className="w-4 h-4" />}   accent="amber" />
      </div>

      {/* Gantt Chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold">Active Project Timeline — Gantt Chart</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Click any bar to view building profile · end date = lease expiration or manual override · color = strategy</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', ...CLIENT_LEADS].map(lead => (
              <Button key={lead} variant={filterLead === lead ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] px-2"
                onClick={() => setFilterLead(lead)}>
                {lead === 'all' ? 'All' : lead}
              </Button>
            ))}
            <Button variant={showBulkDate ? 'default' : 'outline'} size="sm" className="h-7 text-[10px] px-2 gap-1" onClick={() => setShowBulkDate(!showBulkDate)}>
              <Calendar className="w-3 h-3" />Bulk Dates
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 gap-1" onClick={() => exportRoadmapPDF()}>
              <Download className="w-3 h-3" />Export PDF
            </Button>
          </div>
        </div>

        {/* Sliding view controls */}
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap border-b border-border pb-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-medium mr-1">View:</span>
            {([6, 12, 18, 24, 'all'] as ViewRange[]).map(r => (
              <button key={String(r)} onClick={() => setViewRange(r)}
                className={cn('px-2 py-1 text-[10px] rounded-md border transition-colors',
                  viewRange === r
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:bg-muted text-foreground'
                )}>
                {r === 'all' ? 'All' : `${r}mo`}
              </button>
            ))}
          </div>
          {viewRange !== 'all' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={slideLeft} title="Slide earlier">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <button onClick={slideToToday}
                className="text-[10px] font-medium text-primary hover:underline px-1">
                Today
              </button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={slideRight} title="Slide later">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">{windowLabel}</span>
            </div>
          )}
        </div>

        {activeLeases.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active initiatives to display.</p>
          </div>
        )}

        {activeLeases.length > 0 && (
          <div className="relative">
            {/* Month header row */}
            <div className="flex mb-2">
              <div className="w-44 shrink-0" />
              <div className="flex-1 relative h-8 overflow-hidden">
                {monthMarkers.map((m, i) => (
                  <div key={`${m.label}-${m.year}-${i}`} className="absolute top-0 flex flex-col items-center" style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}>
                    {m.isJan && <span className="text-[9px] font-bold text-primary leading-none">{m.year}</span>}
                    <span className={cn('text-[8px] leading-none', m.isJan ? 'text-primary font-semibold' : 'text-muted-foreground')}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bars — render helper */}
            {(() => {
              const renderGanttRow = (lease: typeof activeLeases[0]) => {
                const stages   = STRATEGY_STAGES[lease.strategy] ?? [];
                const progress = calcProgress(stages, lease.stage) / 100;
                const endDate  = manualDates[lease.id] || lease.leaseEnd;
                const rawStart = toPercent(lease.leaseStart);
                const rawEnd   = toPercent(endDate);
                const barOutside = rawEnd < 0 || rawStart > 100;
                const clippedStart = Math.max(0, Math.min(100, rawStart));
                const clippedEnd   = Math.max(0, Math.min(100, rawEnd));
                const startPct = clippedStart;
                const width    = barOutside ? 0 : Math.max(0.5, clippedEnd - clippedStart);
                const colors   = getGanttColor(lease);

                return (
                  <div key={lease.id} className="flex items-center group">
                    <div className="w-44 shrink-0 flex items-center gap-1.5 pr-2">
                      <span className="text-xs font-medium truncate flex-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => onViewProfile(lease.id)}
                        title={`${lease.tenant} — ${lease.property}${lease.address ? '\n' + lease.address : ''}\nStrategy: ${lease.strategy}`}>
                        {lease.tenant}
                      </span>
                      {!readOnly && (
                        <button onClick={(e) => { e.stopPropagation(); startEditDate(lease.id); }}
                          className="w-4 h-4 shrink-0 flex items-center justify-center text-muted-foreground/40 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                          title="Set manual end date">
                          <Calendar className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 relative h-7 rounded bg-muted/20 cursor-pointer overflow-hidden" onClick={() => onViewProfile(lease.id)}
                      title={`${lease.tenant} — ${lease.property}${lease.address ? '\n' + lease.address : ''}\nStrategy: ${lease.strategy} · Stage: ${lease.stage || 'N/A'} · Exp: ${lease.leaseEnd}`}>
                      {monthMarkers.map((m, i) => (
                        <div key={`grid-${m.label}-${m.year}-${i}`} className={cn('absolute top-0 bottom-0 border-l', m.isJan ? 'border-border/60' : 'border-border/15')} style={{ left: `${m.pct}%` }} />
                      ))}
                      {todayPercent >= 0 && todayPercent <= 100 && (
                        <div className="absolute top-0 bottom-0 border-l-2 border-red-400 z-10" style={{ left: `${todayPercent}%` }} />
                      )}
                      <div className="absolute top-0.5 bottom-0.5 rounded-sm overflow-hidden transition-all"
                        style={{ left: `${startPct}%`, width: `${width}%`, backgroundColor: colors.light }}>
                        <div className="h-full rounded-sm transition-all"
                          style={{ width: `${progress * 100}%`, backgroundColor: colors.bg, opacity: 0.85 }} />
                      </div>
                      {width > 8 && (
                        <div className="absolute top-0.5 bottom-0.5 flex items-center px-2 text-[9px] font-medium pointer-events-none"
                          style={{ left: `${startPct + 0.5}%`, color: progress > 0.3 ? 'white' : colors.bg }}>
                          {lease.stage}
                        </div>
                      )}
                      {(milestones[lease.id] ?? []).map(ms => {
                        const msPct = toPercent(ms.date);
                        if (msPct < -2 || msPct > 102) return null;
                        const isOverdue = ms.date < today.toISOString().slice(0, 10);
                        return (
                          <div key={ms.id} className="absolute top-0 bottom-0 flex items-center z-20 pointer-events-auto"
                            style={{ left: `${Math.max(0, Math.min(100, msPct))}%`, transform: 'translateX(-50%)' }}
                            title={`${ms.label} — ${fmtDateShort(ms.date)}${isOverdue ? ' (Overdue)' : ''}`}>
                            <Diamond className={cn('w-3.5 h-3.5 drop-shadow', isOverdue ? 'text-red-500 fill-red-500' : 'text-amber-500 fill-amber-500')} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-1">
                  {/* Active Initiatives (non-PM) */}
                  {nonPmLeases.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 py-1.5 mt-1">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Active Initiatives</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{nonPmLeases.length}</Badge>
                        <div className="flex-1 border-b border-border/40" />
                      </div>
                      {nonPmLeases.map(renderGanttRow)}
                    </>
                  )}
                  {/* Project Management */}
                  {pmLeases.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 py-1.5 mt-3">
                        <HardHat className="w-3.5 h-3.5 text-violet-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400">Project Management</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400">{pmLeases.length}</Badge>
                        <div className="flex-1 border-b border-violet-200 dark:border-violet-800/40" />
                      </div>
                      {pmLeases.map(renderGanttRow)}
                    </>
                  )}
                </div>
              );
            })()}

            {/* Legend */}
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground flex-wrap items-center">
              {Object.entries(STRATEGY_COLORS).map(([strat, col]) => {
                const hasIt = activeLeases.some(l => l.strategy === strat);
                if (!hasIt) return null;
                return (
                  <span key={strat} className="flex items-center gap-1.5">
                    <span className="w-3 h-2.5 rounded-sm inline-block" style={{ backgroundColor: col.bg }} />
                    {strat}
                  </span>
                );
              })}
              <span className="flex items-center gap-1.5"><span className="w-0 h-4 border-l-2 border-red-400 inline-block" />Today</span>
              <span className="flex items-center gap-1.5"><Diamond className="w-3 h-3 text-amber-500 fill-amber-500" />Milestone</span>
              <span className="text-[10px] text-muted-foreground/70">(filled portion = progress)</span>
            </div>
          </div>
        )}

        {/* Manual date editor (single) */}
        {editingDate !== null && (
          <div className="mt-3 p-3 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs font-medium">Override end date for: <span className="text-primary">{allLeases.find(l => l.id === editingDate)?.tenant}</span></p>
              <Input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} className="h-7 w-40 text-xs" />
              <Button size="sm" className="h-7 text-xs" disabled={!tempDate}
                onClick={() => { onSetManualDate(editingDate, tempDate); setEditingDate(null); }}>
                Save
              </Button>
              {manualDates[editingDate] && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                  onClick={() => { onSetManualDate(editingDate, ''); setEditingDate(null); }}>
                  Clear
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDate(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Bulk date panel */}
        {showBulkDate && (
          <div className="mt-3 p-4 bg-muted/30 border border-border rounded-lg space-y-3">
            <h4 className="text-sm font-semibold">Bulk Set End Dates</h4>
            <p className="text-xs text-muted-foreground">Apply a single end date to all active initiatives, or set each individually.</p>
            <div className="flex items-center gap-3 pb-3 border-b border-border flex-wrap">
              <label className="text-xs font-medium whitespace-nowrap">Apply to all:</label>
              <Input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} className="h-7 w-40 text-xs" />
              <Button size="sm" className="h-7 text-xs" disabled={!bulkDate}
                onClick={() => { activeLeases.forEach(l => onSetManualDate(l.id, bulkDate)); setShowBulkDate(false); setBulkDate(''); }}>
                Apply to All ({activeLeases.length})
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                onClick={() => { activeLeases.forEach(l => onSetManualDate(l.id, '')); }}>
                Clear All Overrides
              </Button>
            </div>
            <div className="max-h-[240px] overflow-y-auto space-y-1.5">
              {activeLeases.map(l => (
                <div key={l.id} className="flex items-center gap-3 text-xs">
                  <span className="w-36 truncate font-medium" title={l.address || ''}>{l.tenant}</span>
                  <span className="w-28 text-muted-foreground">Exp: {fmtDateShort(l.leaseEnd)}</span>
                  <Input type="date" value={manualDates[l.id] ?? ''}
                    onChange={e => onSetManualDate(l.id, e.target.value)}
                    className="h-6 w-36 text-xs" />
                  {manualDates[l.id] && (
                    <button onClick={() => onSetManualDate(l.id, '')} className="text-destructive hover:text-destructive/80 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowBulkDate(false)}>Close</Button>
          </div>
        )}
      </div>

      {/* Lease expiration bar chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-4">Lease Expiration Schedule — SF by Year</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={leaseExpirationByYear} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              formatter={(v: any) => [`${(+v).toLocaleString()} SF`, 'Square Footage']}
              contentStyle={{ backgroundColor:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:'6px',fontSize:'12px' }} />
            <Bar dataKey="sqft" radius={[4,4,0,0]}>
              {leaseExpirationByYear.map((entry, i) => (
                <Cell key={i} fill={entry.year==='2025'||entry.year==='2024' ? '#EF4444' : '#3B82F6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── QBR Report ────────────────────────────────────────────────────────────────

// ── Portfolio Health Scorecard ────────────────────────────────────────────────

function PortfolioHealthScorecard({ leases }: { leases: LeaseRecord[] }) {
  const active = leases.filter(l => l.status === 'Active Initiative' || l.status === 'Active Disposition');

  // 1. Avg stage progress across active initiatives
  const avgProgress = active.length ? Math.round(active.reduce((sum, l) => {
    const stages = STRATEGY_STAGES[l.strategy] ?? [];
    return sum + calcProgress(stages, l.stage);
  }, 0) / active.length) : 0;

  // 2. Leases expiring within 12 months
  const now = Date.now();
  const expiringIn12 = active.filter(l => {
    const months = (new Date(l.leaseEnd).getTime() - now) / (1000 * 60 * 60 * 24 * 30);
    return months > 0 && months <= 12;
  });

  // 3. Total SF by strategy (active initiatives only)
  const sfByStrategy: Record<string, number> = {};
  active.forEach(l => {
    sfByStrategy[l.strategy] = (sfByStrategy[l.strategy] || 0) + l.sqft;
  });
  const sfEntries = Object.entries(sfByStrategy).sort((a, b) => b[1] - a[1]);
  const totalActiveSF = active.reduce((s, l) => s + l.sqft, 0);

  // Health grade
  const healthScore = (() => {
    let score = 100;
    // Penalize for high expiring ratio
    if (active.length > 0) score -= Math.min(40, (expiringIn12.length / active.length) * 60);
    // Penalize low average progress
    if (avgProgress < 30) score -= 20;
    else if (avgProgress < 50) score -= 10;
    // Bonus for high progress
    if (avgProgress > 70) score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  })();

  const gradeLabel = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Fair' : 'At Risk';
  const gradeColor = healthScore >= 85
    ? 'text-green-600 dark:text-green-400'
    : healthScore >= 70
    ? 'text-blue-600 dark:text-blue-400'
    : healthScore >= 50
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';
  const gradeBg = healthScore >= 85
    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40'
    : healthScore >= 70
    ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40'
    : healthScore >= 50
    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40'
    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40';
  const ringColor = healthScore >= 85
    ? '#22c55e'
    : healthScore >= 70
    ? '#3b82f6'
    : healthScore >= 50
    ? '#f59e0b'
    : '#ef4444';

  // Strategy bar colors
  const STRATEGY_COLORS: Record<string, string> = {
    'Maintain / Renew':    'bg-blue-500',
    'New Project':         'bg-purple-500',
    'Restructure / Renew': 'bg-teal-500',
    'Relocate':            'bg-amber-500',
    'Close':               'bg-red-500',
    'Sublease / Buyout':   'bg-orange-500',
    'Sale':                'bg-rose-500',
    'Purchase':            'bg-emerald-500',
    'Project Management':  'bg-indigo-500',
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDash = (healthScore / 100) * circumference;

  // 4. Expiration heatmap: SF by quarter × strategy (next 24 months)
  const heatmapNow = new Date();
  const heatmapQuarters: { label: string; start: Date; end: Date }[] = [];
  for (let i = 0; i < 8; i++) {
    const qStart = new Date(heatmapNow.getFullYear(), heatmapNow.getMonth() + i * 3, 1);
    const qEnd   = new Date(heatmapNow.getFullYear(), heatmapNow.getMonth() + (i + 1) * 3, 0);
    const qNum   = Math.floor(qStart.getMonth() / 3) + 1;
    heatmapQuarters.push({ label: `Q${qNum} ${qStart.getFullYear()}`, start: qStart, end: qEnd });
  }

  const heatStrategies = Array.from(new Set(active.map(l => l.strategy))).sort();
  const heatData: Record<string, Record<string, number>> = {};
  let heatMax = 0;
  heatStrategies.forEach(s => {
    heatData[s] = {};
    heatmapQuarters.forEach(q => {
      const sf = active
        .filter(l => l.strategy === s && new Date(l.leaseEnd) >= q.start && new Date(l.leaseEnd) <= q.end)
        .reduce((sum, l) => sum + l.sqft, 0);
      heatData[s][q.label] = sf;
      if (sf > heatMax) heatMax = sf;
    });
  });

  const heatColor = (val: number) => {
    if (val === 0) return '';
    const intensity = heatMax > 0 ? val / heatMax : 0;
    if (intensity > 0.7) return 'bg-red-500/80 dark:bg-red-500/70 text-white';
    if (intensity > 0.4) return 'bg-amber-400/70 dark:bg-amber-500/60 text-amber-950 dark:text-white';
    if (intensity > 0.1) return 'bg-yellow-300/60 dark:bg-yellow-500/40 text-yellow-900 dark:text-yellow-200';
    return 'bg-green-200/50 dark:bg-green-800/30 text-green-800 dark:text-green-300';
  };

  // Quarter totals
  const qTotals: Record<string, number> = {};
  heatmapQuarters.forEach(q => {
    qTotals[q.label] = heatStrategies.reduce((sum, s) => sum + (heatData[s]?.[q.label] ?? 0), 0);
  });

  return (
    <div className={cn('border rounded-lg p-5', gradeBg)}>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className={cn('w-4.5 h-4.5', gradeColor)} />
        <h3 className="text-sm font-bold">Portfolio Health Scorecard</h3>
        <Badge className={cn('text-[10px] border-0 ml-auto', gradeBg, gradeColor)}>{gradeLabel}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Score ring + avg progress */}
        <div className="flex items-center gap-4">
          <div className="relative w-[96px] h-[96px] shrink-0">
            <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
              <circle cx="48" cy="48" r="40" fill="none" stroke={ringColor} strokeWidth="6"
                strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-xl font-bold', gradeColor)}>{healthScore}</span>
              <span className="text-[9px] text-muted-foreground leading-none">SCORE</span>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Avg Stage Progress</span>
                <span className="text-xs font-bold">{avgProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${avgProgress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{active.length} active initiatives tracked</span>
            </div>
          </div>
        </div>

        {/* Expiring within 12mo */}
        <div className="bg-card/60 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-2.5">
            <AlertCircle className={cn('w-3.5 h-3.5', expiringIn12.length > 3 ? 'text-red-500' : expiringIn12.length > 0 ? 'text-amber-500' : 'text-green-500')} />
            <span className="text-xs font-semibold">Expiring Within 12 Months</span>
            <span className={cn('ml-auto text-sm font-bold',
              expiringIn12.length > 3 ? 'text-red-600 dark:text-red-400' : expiringIn12.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
            )}>{expiringIn12.length}</span>
          </div>
          {expiringIn12.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No active leases expiring in the next 12 months</p>
          ) : (
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
              {expiringIn12.sort((a, b) => a.leaseEnd < b.leaseEnd ? -1 : 1).map(l => {
                const months = Math.max(0, Math.round((new Date(l.leaseEnd).getTime() - now) / (1000 * 60 * 60 * 24 * 30)));
                return (
                  <div key={l.id} className="flex items-center gap-2 text-[11px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', months < 6 ? 'bg-red-500' : 'bg-amber-500')} />
                    <span className="font-medium truncate flex-1">{l.tenant}</span>
                    <span className="text-muted-foreground shrink-0">{fmtDateShort(l.leaseEnd)}</span>
                    <Badge className={cn('text-[9px] h-4 border-0 shrink-0',
                      months < 6 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    )}>{months}mo</Badge>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-2.5 pt-2 border-t border-border text-[10px] text-muted-foreground">
            {fmtSqft(expiringIn12.reduce((s, l) => s + l.sqft, 0))} at risk · {fmt(expiringIn12.reduce((s, l) => s + l.totalRent, 0))} annual rent
          </div>
        </div>

        {/* SF by strategy */}
        <div className="bg-card/60 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-2.5">
            <PieChart className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold">SF by Strategy</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{fmtSqft(totalActiveSF)}</span>
          </div>
          <div className="space-y-2">
            {sfEntries.map(([strategy, sqft]) => {
              const pct = totalActiveSF ? Math.round((sqft / totalActiveSF) * 100) : 0;
              return (
                <div key={strategy}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-medium truncate">{strategy}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{fmtSqft(sqft)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', STRATEGY_COLORS[strategy] || 'bg-primary')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Lease Expiration Heatmap ── */}
      {heatStrategies.length > 0 && (
        <div className="mt-5 bg-card/60 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Grid3X3 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold">Lease Expiration Heatmap — Next 24 Months</span>
            <div className="ml-auto flex items-center gap-3 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-green-200/50 dark:bg-green-800/30 inline-block" />Low</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-yellow-300/60 dark:bg-yellow-500/40 inline-block" />Med</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-amber-400/70 dark:bg-amber-500/60 inline-block" />High</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm bg-red-500/80 dark:bg-red-500/70 inline-block" />Critical</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="text-left font-semibold px-2 py-1.5 text-muted-foreground whitespace-nowrap">Strategy</th>
                  {heatmapQuarters.map(q => (
                    <th key={q.label} className="text-center font-semibold px-1.5 py-1.5 text-muted-foreground whitespace-nowrap">{q.label}</th>
                  ))}
                  <th className="text-right font-semibold px-2 py-1.5 text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {heatStrategies.map(strategy => {
                  const rowTotal = heatmapQuarters.reduce((s, q) => s + (heatData[strategy]?.[q.label] ?? 0), 0);
                  return (
                    <tr key={strategy} className="border-t border-border/50">
                      <td className="px-2 py-1.5 font-medium whitespace-nowrap">{strategy}</td>
                      {heatmapQuarters.map(q => {
                        const val = heatData[strategy]?.[q.label] ?? 0;
                        return (
                          <td key={q.label} className={cn('text-center px-1.5 py-1.5 rounded-sm font-semibold', val > 0 ? heatColor(val) : 'text-muted-foreground/30')}>
                            {val > 0 ? `${(val / 1000).toFixed(0)}k` : '—'}
                          </td>
                        );
                      })}
                      <td className="text-right px-2 py-1.5 font-bold">{rowTotal > 0 ? fmtSqft(rowTotal) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold">
                  <td className="px-2 py-1.5">Total</td>
                  {heatmapQuarters.map(q => (
                    <td key={q.label} className={cn('text-center px-1.5 py-1.5', qTotals[q.label] > 0 ? '' : 'text-muted-foreground/30')}>
                      {qTotals[q.label] > 0 ? `${(qTotals[q.label] / 1000).toFixed(0)}k` : '—'}
                    </td>
                  ))}
                  <td className="text-right px-2 py-1.5">{fmtSqft(Object.values(qTotals).reduce((a, b) => a + b, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chart Export Helper ──────────────────────────────────────────────────────

function ExportImageButton({ targetId, label }: { targetId: string; label: string }) {
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = `${label.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };
  return (
    <button onClick={handleExport} disabled={exporting}
      className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
      title={`Export ${label} as image`}>
      <ImageIcon className="w-3 h-3" />{exporting ? 'Exporting…' : 'Export Image'}
    </button>
  );
}

// ── QBR Module ───────────────────────────────────────────────────────────────

function QBRModule({ leases, qbrEntries, notes, onAddQBREntry, onViewProfile, readOnly }: {
  leases: LeaseRecord[];
  qbrEntries: QBREntry[];
  notes: Record<number, LeaseNote[]>;
  onAddQBREntry: (entry: Omit<QBREntry, 'id'>) => void;
  onViewProfile: (id: number) => void;
  readOnly?: boolean;
}) {
  const [showLogForm, setShowLogForm] = useState(false);
  const [logLeaseId, setLogLeaseId]     = useState('');
  const [logSummary, setLogSummary]     = useState('');
  const [logNewRent, setLogNewRent]     = useState('');
  const [logServices, setLogServices]   = useState<string[]>([]);
  const [logQBRYear, setLogQBRYear]     = useState(String(new Date().getFullYear()));
  const [logValueAddItems, setLogValueAddItems] = useState<ValueAddItem[]>([]);
  const [logVALabel, setLogVALabel]   = useState('');
  const [logVAAmount, setLogVAAmount] = useState('');
  const [logVACat, setLogVACat]       = useState<'monetary' | 'non-monetary'>('monetary');

  // Year filter for QBR entries
  const [qbrYearFilter, setQbrYearFilter] = useState<string>('all');
  const availableYears = useMemo(() => {
    const years = [...new Set(qbrEntries.map(e => e.qbrYear))].sort((a, b) => b - a);
    return years;
  }, [qbrEntries]);
  const filteredEntries = qbrYearFilter === 'all' ? qbrEntries : qbrEntries.filter(e => e.qbrYear === Number(qbrYearFilter));

  const quarter = 'Q1 2026';
  const totalSqft = leases.reduce((s, l) => s + l.sqft, 0);
  const totalRent = leases.reduce((s, l) => s + l.totalRent, 0);
  const avgPSF    = leases.length ? leases.reduce((s,l)=>s+l.rentPSF,0)/leases.length : 0;
  const activeCount = leases.filter(l => l.status === 'Active Initiative' || l.status === 'Active Disposition').length;

  const totalValueAdd = filteredEntries.reduce((s, e) => {
    const monetary = (e.valueAddItems ?? []).filter(v => v.category === 'monetary').reduce((a, v) => a + v.amount, 0);
    return s + (monetary > 0 ? monetary : e.savings);
  }, 0);
  const completedSF  = filteredEntries.reduce((s, e) => s + e.sqft, 0);

  // Candidate leases for logging (final stage or archive)
  const logCandidates = leases.filter(l => {
    if (l.status === 'Archive') return true;
    const stages = STRATEGY_STAGES[l.strategy] ?? [];
    const idx = stages.indexOf(l.stage);
    return idx === stages.length - 1;
  }).filter(l => !qbrEntries.some(e => e.leaseId === l.id));

  const selectedLease = leases.find(l => l.id === Number(logLeaseId));

  const handleLogSubmit = () => {
    if (!selectedLease) return;
    const newRentVal = Number(logNewRent) || 0;
    onAddQBREntry({
      leaseId: selectedLease.id,
      tenant: selectedLease.tenant,
      property: selectedLease.property,
      completedDate: new Date().toISOString().slice(0, 10),
      strategy: selectedLease.strategy,
      sqft: selectedLease.sqft,
      originalRent: selectedLease.totalRent,
      newRent: newRentVal,
      savings: selectedLease.totalRent - newRentVal,
      valueAddItems: logValueAddItems,
      servicesProvided: logServices,
      summary: logSummary,
      qbrYear: parseInt(logQBRYear, 10),
    });
    setShowLogForm(false);
    setLogLeaseId('');
    setLogSummary('');
    setLogNewRent('');
    setLogServices([]);
    setLogValueAddItems([]);
    setLogVALabel(''); setLogVAAmount(''); setLogVACat('monetary');
    setLogQBRYear(String(new Date().getFullYear()));
  };

  const metrics = [
    { label: 'Total Leases Managed',     value: String(leases.length),   change: '+3 YoY' },
    { label: 'Total Portfolio SF',        value: fmtSqft(totalSqft),     change: '+8.5% YoY' },
    { label: 'Completed Locations',       value: String(filteredEntries.length), change: `${fmtSqft(completedSF)} closed` },
    { label: 'Total Value Add',            value: fmt(totalValueAdd),      change: `${filteredEntries.length} projects` },
    { label: 'Active Lease Rate',         value: `${Math.round((activeCount/leases.length)*100)}%`, change: 'Active & Disposition' },
    { label: 'Leases Expiring < 18mo',   value: `${leases.filter(l=>{ const m=(new Date(l.leaseEnd).getTime()-Date.now())/(1000*60*60*24*30); return m<18&&m>0; }).length} leases`, change: 'Action Required' },
  ];

  return (
    <div id="qbr-report-content" className="space-y-4">
      {/* QBR Header */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold">Portfolio Tracker — {quarter} QBR</h2>
            <p className="text-sm text-muted-foreground mt-1">Prepared for Jordan Wade · Generated April 13, 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={qbrYearFilter} onValueChange={setQbrYearFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Years</SelectItem>
                {availableYears.map(y => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 text-xs" onClick={() => {
              const el = document.getElementById('qbr-report-content');
              if (!el) return;
              html2canvas(el, { backgroundColor: null, scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
                const pw = doc.internal.pageSize.getWidth();
                const ph = doc.internal.pageSize.getHeight();
                const imgW = pw - 60;
                const imgH = (canvas.height / canvas.width) * imgW;
                let y = 30;
                if (imgH <= ph - 60) {
                  doc.addImage(imgData, 'PNG', 30, y, imgW, imgH);
                } else {
                  // Multi-page
                  const pageContentH = ph - 60;
                  let srcY = 0;
                  while (srcY < canvas.height) {
                    const sliceH = Math.min(canvas.height - srcY, (pageContentH / imgW) * canvas.width);
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = canvas.width;
                    sliceCanvas.height = sliceH;
                    const ctx = sliceCanvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
                      const sliceData = sliceCanvas.toDataURL('image/png');
                      const drawH = (sliceH / canvas.width) * imgW;
                      doc.addImage(sliceData, 'PNG', 30, 30, imgW, drawH);
                    }
                    srcY += sliceH;
                    if (srcY < canvas.height) doc.addPage();
                  }
                }
                doc.save('QBR_Report.pdf');
              });
            }}><Download className="w-3.5 h-3.5" />Download PDF</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
          {metrics.map(m => (
            <div key={m.label} className="border-l-2 border-primary pl-3">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-base font-bold mt-0.5">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.change}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Portfolio Health Scorecard ── */}
      <div id="qbr-chart-health-scorecard">
        <PortfolioHealthScorecard leases={leases} />
        <div className="flex justify-end -mt-2 mb-2 pr-2">
          <ExportImageButton targetId="qbr-chart-health-scorecard" label="Portfolio Health Scorecard" />
        </div>
      </div>

      {/* Completed Projects Log */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" />
              Completed Locations Log
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Locations moved to completion are automatically logged here</p>
          </div>
          {!readOnly && (
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowLogForm(true)}>
              <Plus className="w-3 h-3" />Log Completion
            </Button>
          )}
        </div>

        {/* Log completion form */}
        {showLogForm && (
          <div className="mb-4 p-4 border border-border rounded-lg bg-muted/20 space-y-3">
            <h4 className="text-sm font-semibold">Log Completed Location</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                <Select value={logLeaseId} onValueChange={setLogLeaseId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select location…" /></SelectTrigger>
                  <SelectContent>
                    {logCandidates.map(l => (
                      <SelectItem key={l.id} value={String(l.id)} className="text-xs">{l.tenant} — {l.property}</SelectItem>
                    ))}
                    {logCandidates.length === 0 && (
                      <SelectItem value="none" disabled className="text-xs">No eligible locations</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">QBR Year</label>
                <Select value={logQBRYear} onValueChange={setLogQBRYear}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">New Annual Rent (0 if closed)</label>
                <Input type="number" placeholder="0" value={logNewRent} onChange={e => setLogNewRent(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            {selectedLease && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="text-muted-foreground">Original rent:</span>
                <span className="font-medium">{fmt(selectedLease.totalRent)}</span>
                <span className="text-muted-foreground ml-2">SF:</span>
                <span className="font-medium">{fmtSqft(selectedLease.sqft)}</span>
                <span className="text-muted-foreground ml-2">Strategy:</span>
                <span className="font-medium">{selectedLease.strategy}</span>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Services Provided</label>
              <div className="flex flex-wrap gap-1.5">
                {CRE_SERVICES.map(svc => (
                  <button key={svc}
                    onClick={() => setLogServices(prev => prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc])}
                    className={cn('px-2 py-1 rounded-full text-[10px] border transition-colors',
                      logServices.includes(svc) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
                    )}>
                    {svc}
                  </button>
                ))}
              </div>
            </div>
            {/* Value Add Items */}
            <div className="border border-border rounded-lg p-3 bg-muted/10">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />Value Add Items
              </p>
              {logValueAddItems.length > 0 && (
                <div className="space-y-1 mb-2">
                  {logValueAddItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-[11px]">
                      <Badge variant="outline" className={cn('text-[9px] h-4 border-0 shrink-0',
                        item.category === 'monetary' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      )}>{item.category === 'monetary' ? 'Monetary' : 'Non-Monetary'}</Badge>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.category === 'monetary' && <span className="font-medium text-green-700 dark:text-green-400">{fmt(item.amount)}</span>}
                      <button onClick={() => setLogValueAddItems(prev => prev.filter(v => v.id !== item.id))}
                        className="text-muted-foreground/50 hover:text-destructive"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex border border-border rounded-md overflow-hidden">
                  <button onClick={() => setLogVACat('monetary')}
                    className={cn('px-2 py-1 text-[10px]', logVACat === 'monetary' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' : 'hover:bg-muted')}>
                    Monetary
                  </button>
                  <button onClick={() => setLogVACat('non-monetary')}
                    className={cn('px-2 py-1 text-[10px]', logVACat === 'non-monetary' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' : 'hover:bg-muted')}>
                    Non-Monetary
                  </button>
                </div>
                <Input placeholder="e.g. Savings to P&L" value={logVALabel} onChange={e => setLogVALabel(e.target.value)} className="h-7 text-xs flex-1 min-w-[120px]" />
                {logVACat === 'monetary' && (
                  <Input type="number" placeholder="Amount" value={logVAAmount} onChange={e => setLogVAAmount(e.target.value)} className="h-7 text-xs w-24" />
                )}
                <Button size="sm" className="h-7 text-xs px-2" disabled={!logVALabel.trim()}
                  onClick={() => {
                    setLogValueAddItems(prev => [...prev, { id: Date.now(), label: logVALabel.trim(), amount: logVACat === 'monetary' ? (Number(logVAAmount) || 0) : 0, category: logVACat }]);
                    setLogVALabel(''); setLogVAAmount('');
                  }}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Summary</label>
              <Textarea placeholder="Brief summary of the completed project, key outcomes, client value delivered…"
                value={logSummary} onChange={e => setLogSummary(e.target.value)} className="text-sm min-h-[60px]" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs" disabled={!logLeaseId || !logSummary.trim()} onClick={handleLogSubmit}>Log Completion</Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowLogForm(false); setLogLeaseId(''); setLogSummary(''); setLogNewRent(''); setLogServices([]); setLogValueAddItems([]); }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Completed entries */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{qbrYearFilter === 'all' ? 'No completed locations logged yet.' : `No completed locations for ${qbrYearFilter}.`}</p>
            <p className="text-xs mt-1">As locations finish, their details will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{entry.tenant}</h4>
                      <Badge variant="outline" className="text-[10px]">{entry.strategy}</Badge>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">Completed</Badge>
                      <Badge variant="outline" className="text-[10px]">{entry.qbrYear}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.property} · Completed {entry.completedDate}</p>
                  </div>
                  <button onClick={() => onViewProfile(entry.leaseId)}
                    className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="View location">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs leading-relaxed mb-3">{entry.summary}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="bg-muted/30 rounded px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground">Square Feet</p>
                    <p className="text-xs font-bold">{fmtSqft(entry.sqft)}</p>
                  </div>
                  <div className="bg-muted/30 rounded px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground">Original Rent</p>
                    <p className="text-xs font-bold">{fmt(entry.originalRent)}</p>
                  </div>
                  <div className="bg-muted/30 rounded px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground">New Rent</p>
                    <p className="text-xs font-bold">{fmt(entry.newRent)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded px-2 py-1.5">
                    <p className="text-[10px] text-green-700 dark:text-green-400">Total Value Add</p>
                    <p className="text-xs font-bold text-green-700 dark:text-green-400">
                      {fmt((entry.valueAddItems ?? []).filter(v => v.category === 'monetary').reduce((a, v) => a + v.amount, 0) || entry.savings)}
                    </p>
                  </div>
                </div>

                {/* Value Add Items — Monetary & Non-Monetary */}
                {(entry.valueAddItems ?? []).length > 0 && (
                  <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Monetary */}
                    {(entry.valueAddItems ?? []).some(v => v.category === 'monetary') && (
                      <div className="bg-green-50/50 dark:bg-green-900/10 rounded-lg p-2.5 border border-green-200/50 dark:border-green-800/30">
                        <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />Monetary Value Add
                        </p>
                        <div className="space-y-1">
                          {(entry.valueAddItems ?? []).filter(v => v.category === 'monetary').map(v => (
                            <div key={v.id} className="flex items-center justify-between text-[11px]">
                              <span className="text-foreground">{v.label}</span>
                              <span className="font-semibold text-green-700 dark:text-green-400">{fmt(v.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Non-Monetary */}
                    {(entry.valueAddItems ?? []).some(v => v.category === 'non-monetary') && (
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-2.5 border border-blue-200/50 dark:border-blue-800/30">
                        <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1">
                          <Award className="w-3 h-3" />Non-Monetary Value Add
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(entry.valueAddItems ?? []).filter(v => v.category === 'non-monetary').map(v => (
                            <Badge key={v.id} variant="outline" className="text-[10px] h-5 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300">{v.label}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {entry.servicesProvided.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground mr-1 leading-5">Services:</span>
                    {entry.servicesProvided.map(svc => (
                      <Badge key={svc} variant="outline" className="text-[10px] h-5">{svc}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div id="qbr-chart-rent-psf" className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center mb-3">
            <h3 className="text-sm font-semibold">Rent PSF Trend vs Market Average</h3>
            <ExportImageButton targetId="qbr-chart-rent-psf" label="Rent PSF Trend" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rentTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[35,50]} tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: any, name: string) => [`$${v}`, name === 'avgRent' ? 'Portfolio Avg' : 'Market Avg']} contentStyle={{ backgroundColor:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:'6px',fontSize:'12px' }} />
              <Legend formatter={v => v === 'avgRent' ? 'Portfolio Avg' : 'Market Avg'} wrapperStyle={{ fontSize:'12px' }} />
              <Line type="monotone" dataKey="avgRent"    stroke="#3B82F6" strokeWidth={2} dot={{ r:3 }} />
              <Line type="monotone" dataKey="marketAvg" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 2" dot={{ r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div id="qbr-chart-lease-exp" className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center mb-3">
            <h3 className="text-sm font-semibold">Lease Expirations by Year (SF)</h3>
            <ExportImageButton targetId="qbr-chart-lease-exp" label="Lease Expirations" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leaseExpirationByYear} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: any) => [`${(+v).toLocaleString()} SF`]} contentStyle={{ backgroundColor:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:'6px',fontSize:'12px' }} />
              <Bar dataKey="sqft" radius={[3,3,0,0]}>
                {leaseExpirationByYear.map((_, i) => <Cell key={i} fill={i<2?'#EF4444':'#3B82F6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Action Items */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Priority Action Items — {quarter}</h3>
        <div className="space-y-2">
          {[
            { priority: 'Critical', action: 'Execute PwC relocation — LOI signed, lease negotiations in progress', owner: 'Travis Hilty' },
            { priority: 'Critical', action: 'Submit counterproposal on United Airlines Willis Tower renewal at $43 PSF', owner: 'Travis Hilty' },
            { priority: 'High',     action: 'Finalize Bank of America sublease marketing — 2 tours scheduled', owner: 'Alisha Shields' },
            { priority: 'High',     action: 'Complete NCR construction punch list review by August 2026', owner: 'Matt Epperson' },
            { priority: 'Medium',   action: 'Initiate Cox Perimeter renewal restructure negotiations', owner: 'Alisha Shields' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <Badge className={cn('text-xs border-0 shrink-0 mt-0.5', PRIORITY_STYLES[item.priority])}>{item.priority}</Badge>
              <p className="text-sm flex-1">{item.action}</p>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{item.owner}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── Shareable Active Initiatives Snapshot ────────────────────────────────────

function ShareableSnapshotModal({ leases, notes, clientLogos, portfolioName, onClose }: {
  leases: LeaseRecord[];
  notes: Record<number, LeaseNote[]>;
  clientLogos: Record<string, string>;
  portfolioName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [printMode, setPrintMode] = useState<'light' | 'dark'>('light');
  const reportDate = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const activeLeases = leases.filter(l => l.status === 'Active Initiative' || l.status === 'Active Disposition')
    .sort((a, b) => a.leaseEnd < b.leaseEnd ? -1 : 1);

  // Compute scorecard metrics for the snapshot
  const avgProgress = activeLeases.length ? Math.round(activeLeases.reduce((sum, l) => {
    const stages = STRATEGY_STAGES[l.strategy] ?? [];
    return sum + calcProgress(stages, l.stage);
  }, 0) / activeLeases.length) : 0;

  const now = Date.now();
  const expiringIn12 = activeLeases.filter(l => {
    const months = (new Date(l.leaseEnd).getTime() - now) / (1000 * 60 * 60 * 24 * 30);
    return months > 0 && months <= 12;
  });

  const sfByStrategy: Record<string, number> = {};
  activeLeases.forEach(l => { sfByStrategy[l.strategy] = (sfByStrategy[l.strategy] || 0) + l.sqft; });
  const sfEntries = Object.entries(sfByStrategy).sort((a, b) => b[1] - a[1]);
  const totalActiveSF = activeLeases.reduce((s, l) => s + l.sqft, 0);

  // Health score for cover page
  const healthScore = (() => {
    let score = 100;
    if (activeLeases.length > 0) score -= Math.min(40, (expiringIn12.length / activeLeases.length) * 60);
    if (avgProgress < 30) score -= 20;
    else if (avgProgress < 50) score -= 10;
    if (avgProgress > 70) score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  })();
  const gradeLabel = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Fair' : 'At Risk';

  const executiveSummary = healthScore >= 85
    ? `Portfolio health is excellent — ${avgProgress}% avg stage completion across ${activeLeases.length} active initiatives with ${expiringIn12.length} lease${expiringIn12.length !== 1 ? 's' : ''} expiring within 12 months.`
    : healthScore >= 70
    ? `Portfolio performing well — ${avgProgress}% avg completion, ${expiringIn12.length} lease${expiringIn12.length !== 1 ? 's' : ''} require near-term action within 12 months.`
    : healthScore >= 50
    ? `Portfolio requires attention — ${expiringIn12.length} lease${expiringIn12.length !== 1 ? 's' : ''} expiring within 12 months at ${avgProgress}% avg completion. Accelerated execution recommended.`
    : `Portfolio at risk — ${expiringIn12.length} lease${expiringIn12.length !== 1 ? 's' : ''} expiring within 12 months with only ${avgProgress}% avg progress. Immediate action required.`;

  // Grab the first non-empty client logo for the cover
  const coverLogo = Object.values(clientLogos).find(v => v) || '';

  const isDark = printMode === 'dark';
  const bg = isDark ? '#1a1a2e' : '#ffffff';
  const fg = isDark ? '#e0e0e0' : '#1a1a1a';
  const fgMuted2 = isDark ? '#888888' : '#6b7280';
  const border2 = isDark ? '#333355' : '#e5e7eb';
  const cardBg2 = isDark ? '#16213e' : '#f9fafb';
  const accent2 = isDark ? '#60a5fa' : '#2563eb';
  const green2 = isDark ? '#4ade80' : '#16a34a';
  const amber2 = isDark ? '#fbbf24' : '#d97706';
  const red2 = isDark ? '#f87171' : '#dc2626';
  const scoreColor = healthScore >= 85 ? green2 : healthScore >= 70 ? accent2 : healthScore >= 50 ? amber2 : red2;

  const generateHTML = () => {
    const locationCards = activeLeases.map((lease, idx) => {
      const stages = STRATEGY_STAGES[lease.strategy] ?? [];
      const progress = calcProgress(stages, lease.stage);
      const lastNote = (notes[lease.id] ?? [])[0];
      const logo = clientLogos[lease.tenant];
      const logoHTML = logo ? `<img src="${logo}" alt="${lease.tenant}" style="height:24px;max-width:100px;object-fit:contain;"/>` : '';

      return `
        <div style="border:1px solid ${border2};border-radius:8px;padding:16px;margin-bottom:12px;background:${cardBg2}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:10px">
              ${logoHTML}
              <div>
                <p style="font-size:14px;font-weight:700">${idx + 1}. ${lease.tenant} &mdash; ${lease.property}</p>
                <p style="font-size:11px;color:${fgMuted2}">${lease.address}</p>
              </div>
            </div>
            <span style="font-size:10px;background:${accent2};color:white;padding:2px 8px;border-radius:4px;font-weight:600">${lease.status}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:10px;font-size:11px">
            <div><span style="color:${fgMuted2}">Strategy</span><br/><strong>${lease.strategy}</strong></div>
            <div><span style="color:${fgMuted2}">Stage</span><br/><strong>${lease.stage}</strong></div>
            <div><span style="color:${fgMuted2}">Progress</span><br/><strong>${progress}%</strong></div>
            <div><span style="color:${fgMuted2}">SF</span><br/><strong>${lease.sqft.toLocaleString()}</strong></div>
            <div><span style="color:${fgMuted2}">Lease Exp</span><br/><strong>${fmtDateShort(lease.leaseEnd)}</strong></div>
            <div><span style="color:${fgMuted2}">Lead</span><br/><strong>${lease.clientLead}</strong></div>
          </div>
          <div style="background:${isDark ? '#2a2a4a' : '#e5e7eb'};border-radius:4px;height:6px;margin-bottom:8px">
            <div style="background:${accent2};height:100%;border-radius:4px;width:${progress}%"></div>
          </div>
          ${lastNote ? `<div style="background:${isDark ? '#1e1e3f' : '#f3f4f6'};border-radius:4px;padding:8px 10px;font-size:11px">
            <span style="color:${fgMuted2}">${lastNote.author} &middot; ${lastNote.date}:</span> ${lastNote.text}
          </div>` : ''}
        </div>`;
    }).join('');

    const sfBreakdownHTML = sfEntries.map(([strategy, sqft]) => {
      const pct = totalActiveSF ? Math.round((sqft / totalActiveSF) * 100) : 0;
      return `<div style="display:flex;align-items:center;gap:8px;font-size:11px;margin-bottom:4px">
        <span style="flex:1;font-weight:500">${strategy}</span>
        <span style="color:${fgMuted2}">${sqft.toLocaleString()} SF (${pct}%)</span>
        <div style="width:80px;height:6px;background:${isDark ? '#2a2a4a' : '#e5e7eb'};border-radius:3px;overflow:hidden">
          <div style="height:100%;border-radius:3px;background:${accent2};width:${pct}%"></div>
        </div>
      </div>`;
    }).join('');

    const coverLogoHTML = coverLogo ? `<img src="${coverLogo}" alt="Client Logo" style="max-height:48px;max-width:200px;object-fit:contain;margin-bottom:16px;"/>` : '';

    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${portfolioName} — Active Initiatives Snapshot</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:${bg}; color:${fg}; padding:0; margin:0; }
  @media print { .cover-page { page-break-after:always; } body { padding:0; } }
  @media (max-width:640px) { .cover-page { padding:32px !important; min-height:auto !important; } }
</style></head><body>
  <!-- COVER PAGE -->
  <div class="cover-page" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:64px 32px;background:${isDark ? 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f172a 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)'}">
    ${coverLogoHTML}
    <div style="margin-bottom:16px">
      <svg viewBox="0 0 32 32" fill="none" width="40" height="40">
        <rect width="32" height="32" rx="6" fill="${accent2}"/>
        <rect x="7" y="18" width="4" height="8" fill="white"/>
        <rect x="14" y="12" width="4" height="14" fill="white" opacity="0.85"/>
        <rect x="21" y="6" width="4" height="20" fill="white" opacity="0.7"/>
      </svg>
    </div>
    <p style="font-size:11px;color:${fgMuted2};text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px">Transcend</p>
    <h1 style="font-size:32px;font-weight:800;margin-bottom:6px;line-height:1.2">${portfolioName}</h1>
    <p style="font-size:18px;font-weight:600;color:${accent2};margin-bottom:24px">Active Initiatives Snapshot</p>
    <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:24px;background:${cardBg2};border:1px solid ${border2};margin-bottom:20px">
      <span style="font-size:22px;font-weight:800;color:${scoreColor}">${healthScore}</span>
      <span style="font-size:13px;font-weight:600;color:${scoreColor}">${gradeLabel}</span>
    </div>
    <p style="font-size:13px;color:${fgMuted2};max-width:560px;line-height:1.6">${executiveSummary}</p>
    <div style="margin-top:32px;font-size:11px;color:${fgMuted2}">
      <p>Prepared for Jordan Wade &middot; ${reportDate}</p>
      <p style="margin-top:4px">${activeLeases.length} Active Locations &middot; ${totalActiveSF.toLocaleString()} SF</p>
    </div>
  </div>

  <!-- REPORT BODY -->
  <div style="padding:32px;max-width:900px;margin:0 auto">
  <div style="border-bottom:2px solid ${accent2};padding-bottom:16px;margin-bottom:24px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
          <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
            <rect width="32" height="32" rx="6" fill="${accent2}"/>
            <rect x="7" y="18" width="4" height="8" fill="white"/>
            <rect x="14" y="12" width="4" height="14" fill="white" opacity="0.85"/>
            <rect x="21" y="6" width="4" height="20" fill="white" opacity="0.7"/>
          </svg>
          <span style="font-size:18px;font-weight:700">Transcend</span>
        </div>
        <p style="font-size:20px;font-weight:700;margin-top:8px">${portfolioName} — Active Initiatives</p>
        <p style="font-size:12px;color:${fgMuted2}">Prepared for Jordan Wade</p>
      </div>
      <div style="text-align:right">
        <p style="font-size:11px;color:${fgMuted2}">Snapshot Generated</p>
        <p style="font-size:13px;font-weight:600">${reportDate}</p>
      </div>
    </div>
  </div>

  <!-- Scorecard Summary -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    <div style="background:${cardBg2};padding:12px;border-radius:6px;border:1px solid ${border2}">
      <p style="font-size:10px;color:${fgMuted2};text-transform:uppercase;letter-spacing:0.05em">Active Locations</p>
      <p style="font-size:18px;font-weight:700;margin-top:2px">${activeLeases.length}</p>
    </div>
    <div style="background:${cardBg2};padding:12px;border-radius:6px;border:1px solid ${border2}">
      <p style="font-size:10px;color:${fgMuted2};text-transform:uppercase;letter-spacing:0.05em">Avg Progress</p>
      <p style="font-size:18px;font-weight:700;margin-top:2px;color:${avgProgress >= 50 ? green2 : amber2}">${avgProgress}%</p>
    </div>
    <div style="background:${cardBg2};padding:12px;border-radius:6px;border:1px solid ${border2}">
      <p style="font-size:10px;color:${fgMuted2};text-transform:uppercase;letter-spacing:0.05em">Expiring &lt;12mo</p>
      <p style="font-size:18px;font-weight:700;margin-top:2px;color:${expiringIn12.length > 0 ? red2 : green2}">${expiringIn12.length}</p>
    </div>
    <div style="background:${cardBg2};padding:12px;border-radius:6px;border:1px solid ${border2}">
      <p style="font-size:10px;color:${fgMuted2};text-transform:uppercase;letter-spacing:0.05em">Total Active SF</p>
      <p style="font-size:18px;font-weight:700;margin-top:2px">${totalActiveSF.toLocaleString()}</p>
    </div>
  </div>

  <!-- SF by Strategy -->
  <div style="background:${cardBg2};padding:14px;border-radius:6px;border:1px solid ${border2};margin-bottom:20px">
    <p style="font-size:12px;font-weight:700;margin-bottom:8px">SF by Strategy</p>
    ${sfBreakdownHTML}
  </div>

  <!-- Location Cards -->
  ${locationCards}

  <div style="border-top:1px solid ${border2};padding-top:12px;margin-top:16px;text-align:center">
    <p style="font-size:10px;color:${fgMuted2}">Transcend — Confidential · ${reportDate}</p>
  </div>
  </div><!-- end report body wrapper -->
</body></html>`;
  };

  const handleOpenSnapshot = () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2"><Share2 className="w-3.5 h-3.5" />Shareable Snapshot — Active Initiatives</h2>
            <p className="text-xs text-muted-foreground">{activeLeases.length} active locations · {reportDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-md overflow-hidden">
              <button onClick={() => setPrintMode('light')}
                className={cn('px-2.5 py-1.5 text-xs flex items-center gap-1', printMode === 'light' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <Sun className="w-3 h-3" />Light
              </button>
              <button onClick={() => setPrintMode('dark')}
                className={cn('px-2.5 py-1.5 text-xs flex items-center gap-1', printMode === 'dark' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <Moon className="w-3 h-3" />Dark
              </button>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleCopyLink}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleOpenSnapshot}>
              <ExternalLink className="w-3.5 h-3.5" />Open Snapshot
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="flex-1 overflow-y-auto p-5">
          <div style={{ backgroundColor: bg, color: fg, borderRadius: '8px', overflow: 'hidden' }}>
            {/* ── Cover Page Preview ── */}
            <div style={{
              minHeight: '360px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              textAlign: 'center', padding: '48px 24px',
              background: isDark
                ? 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f172a 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)'
            }}>
              {coverLogo && <img src={coverLogo} alt="Client Logo" style={{ maxHeight: '40px', maxWidth: '180px', objectFit: 'contain', marginBottom: '14px' }} />}
              <div style={{ marginBottom: '14px' }}>
                <svg viewBox="0 0 32 32" fill="none" width="36" height="36">
                  <rect width="32" height="32" rx="6" fill={accent2} />
                  <rect x="7" y="18" width="4" height="8" fill="white" />
                  <rect x="14" y="12" width="4" height="14" fill="white" opacity="0.85" />
                  <rect x="21" y="6" width="4" height="20" fill="white" opacity="0.7" />
                </svg>
              </div>
              <p style={{ fontSize: '10px', color: fgMuted2, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>Transcend</p>
              <p style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px', lineHeight: 1.2 }}>{portfolioName}</p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: accent2, marginBottom: '20px' }}>Active Initiatives Snapshot</p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
                borderRadius: '20px', background: cardBg2, border: `1px solid ${border2}`, marginBottom: '14px'
              }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: scoreColor }}>{healthScore}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: scoreColor }}>{gradeLabel}</span>
              </div>
              <p style={{ fontSize: '12px', color: fgMuted2, maxWidth: '480px', lineHeight: 1.6 }}>{executiveSummary}</p>
              <div style={{ marginTop: '24px', fontSize: '10px', color: fgMuted2 }}>
                <p>Prepared for Jordan Wade · {reportDate}</p>
                <p style={{ marginTop: '3px' }}>{activeLeases.length} Active Locations · {totalActiveSF.toLocaleString()} SF</p>
              </div>
            </div>

            {/* ── Report Body ── */}
            <div style={{ padding: '24px' }}>
            {/* Report Header */}
            <div style={{ borderBottom: `2px solid ${accent2}`, paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
                      <rect width="32" height="32" rx="6" fill={accent2} />
                      <rect x="7" y="18" width="4" height="8" fill="white" />
                      <rect x="14" y="12" width="4" height="14" fill="white" opacity="0.85" />
                      <rect x="21" y="6" width="4" height="20" fill="white" opacity="0.7" />
                    </svg>
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>Transcend</span>
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 700, marginTop: '8px' }}>{portfolioName} — Active Initiatives</p>
                  <p style={{ fontSize: '12px', color: fgMuted2 }}>Prepared for Jordan Wade</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: fgMuted2 }}>Snapshot Generated</p>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{reportDate}</p>
                </div>
              </div>
            </div>

            {/* Scorecard Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Active Locations', value: String(activeLeases.length), color: fg },
                { label: 'Avg Progress', value: `${avgProgress}%`, color: avgProgress >= 50 ? green2 : amber2 },
                { label: 'Expiring <12mo', value: String(expiringIn12.length), color: expiringIn12.length > 0 ? red2 : green2 },
                { label: 'Total Active SF', value: totalActiveSF.toLocaleString(), color: fg },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: cardBg2, padding: '12px', borderRadius: '6px', border: `1px solid ${border2}` }}>
                  <p style={{ fontSize: '10px', color: fgMuted2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px', color: kpi.color }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* SF by Strategy */}
            <div style={{ background: cardBg2, padding: '14px', borderRadius: '6px', border: `1px solid ${border2}`, marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>SF by Strategy</p>
              {sfEntries.map(([strategy, sqft]) => {
                const pct = totalActiveSF ? Math.round((sqft / totalActiveSF) * 100) : 0;
                return (
                  <div key={strategy} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ flex: 1, fontWeight: 500 }}>{strategy}</span>
                    <span style={{ color: fgMuted2 }}>{sqft.toLocaleString()} SF ({pct}%)</span>
                    <div style={{ width: '80px', height: '6px', background: isDark ? '#2a2a4a' : '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '3px', background: accent2, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Location Cards */}
            {activeLeases.map((lease, idx) => {
              const stages = STRATEGY_STAGES[lease.strategy] ?? [];
              const progress = calcProgress(stages, lease.stage);
              const lastNote = (notes[lease.id] ?? [])[0];
              const logo = clientLogos[lease.tenant];

              return (
                <div key={lease.id} style={{ border: `1px solid ${border2}`, borderRadius: '8px', padding: '16px', marginBottom: '12px', background: cardBg2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {logo && <img src={logo} alt={lease.tenant} style={{ height: '24px', maxWidth: '100px', objectFit: 'contain' }} />}
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700 }}>{idx + 1}. {lease.tenant} — {lease.property}</p>
                        <p style={{ fontSize: '11px', color: fgMuted2 }}>{lease.address}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', background: accent2, color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{lease.status}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '10px', fontSize: '11px' }}>
                    <div><span style={{ color: fgMuted2 }}>Strategy</span><br/><strong>{lease.strategy}</strong></div>
                    <div><span style={{ color: fgMuted2 }}>Stage</span><br/><strong>{lease.stage}</strong></div>
                    <div><span style={{ color: fgMuted2 }}>Progress</span><br/><strong>{progress}%</strong></div>
                    <div><span style={{ color: fgMuted2 }}>SF</span><br/><strong>{lease.sqft.toLocaleString()}</strong></div>
                    <div><span style={{ color: fgMuted2 }}>Lease Exp</span><br/><strong>{fmtDateShort(lease.leaseEnd)}</strong></div>
                    <div><span style={{ color: fgMuted2 }}>Lead</span><br/><strong>{lease.clientLead}</strong></div>
                  </div>

                  <div style={{ background: isDark ? '#2a2a4a' : '#e5e7eb', borderRadius: '4px', height: '6px', marginBottom: '8px' }}>
                    <div style={{ background: accent2, height: '100%', borderRadius: '4px', width: `${progress}%` }} />
                  </div>

                  {lastNote && (
                    <div style={{ background: isDark ? '#1e1e3f' : '#f3f4f6', borderRadius: '4px', padding: '8px 10px', fontSize: '11px' }}>
                      <span style={{ color: fgMuted2 }}>{lastNote.author} · {lastNote.date}:</span> {lastNote.text}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ borderTop: `1px solid ${border2}`, paddingTop: '12px', marginTop: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: fgMuted2 }}>Transcend — Confidential · {reportDate}</p>
            </div>
            </div>{/* end report body wrapper */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Mass Upload Modal ─────────────────────────────────────────────────────────

const CSV_TEMPLATE_FIELDS = ['Record ID','Tenant','Property','Address','SF','Rent PSF','Total Rent','Lease Start','Lease End','Type','Client Lead','Status','Strategy','Stage','Market','Submarket','Floors','Broker'] as const;
const CSV_FIELD_MAP: Record<string, keyof LeaseRecord> = {
  'record id': 'id', 'tenant': 'tenant', 'property': 'property', 'address': 'address',
  'sf': 'sqft', 'rent psf': 'rentPSF', 'total rent': 'totalRent',
  'lease start': 'leaseStart', 'lease end': 'leaseEnd', 'type': 'type',
  'client lead': 'clientLead', 'status': 'status', 'strategy': 'strategy',
  'stage': 'stage', 'market': 'market', 'submarket': 'submarket',
  'floors': 'floors', 'broker': 'broker',
};

/** All mappable target fields shown in the field-mapping dropdowns */
const MAPPABLE_FIELDS: { key: keyof LeaseRecord; label: string }[] = [
  { key: 'id', label: 'Record ID' },
  { key: 'tenant', label: 'Tenant' },
  { key: 'property', label: 'Property' },
  { key: 'address', label: 'Address' },
  { key: 'sqft', label: 'SF' },
  { key: 'rentPSF', label: 'Rent PSF' },
  { key: 'totalRent', label: 'Total Rent' },
  { key: 'leaseStart', label: 'Lease Start' },
  { key: 'leaseEnd', label: 'Lease End' },
  { key: 'type', label: 'Type' },
  { key: 'clientLead', label: 'Client Lead' },
  { key: 'status', label: 'Status' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'stage', label: 'Stage' },
  { key: 'market', label: 'Market' },
  { key: 'submarket', label: 'Submarket' },
  { key: 'floors', label: 'Floors' },
  { key: 'broker', label: 'Broker' },
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

interface UploadRow {
  raw: Record<string, string>;
  parsed: Partial<LeaseRecord>;
  errors: string[];
}

interface MappingTemplate {
  name: string;
  mappings: { csvCol: string; dbField: string }[];
}

function MassUploadModal({ onImport, onClose, savedTemplates, onSaveTemplate, onDeleteTemplate, onExportTemplates, onImportTemplates }: {
  onImport: (rows: Partial<LeaseRecord>[]) => void;
  onClose: () => void;
  savedTemplates: MappingTemplate[];
  onSaveTemplate: (t: MappingTemplate) => void;
  onDeleteTemplate: (name: string) => void;
  onExportTemplates: () => void;
  onImportTemplates: (templates: MappingTemplate[]) => void;
}) {
  // Wizard step: 1=Upload, 2=Map, 3=Preview, 4=Done
  const [step, setStep] = useState<1|2|3|4>(1);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [previewMode, setPreviewMode] = useState<'cards'|'table'>('cards');

  // Field mapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [mappings, setMappings] = useState<{ csvCol: string; dbField: string }[]>([]);

  // Pending picklist selections for the "add row" controls
  const [pendingCsvCol, setPendingCsvCol] = useState<string | undefined>(undefined);
  const [pendingDbField, setPendingDbField] = useState<string | undefined>(undefined);
  const [selectResetKey, setSelectResetKey] = useState(0);

  // Template save/load state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const STEP_LABELS = ['Upload File', 'Map Fields', 'Preview & Import', 'Done'];

  const downloadTemplate = () => {
    const csv = CSV_TEMPLATE_FIELDS.join(',') + '\n' +
      '1001,Acme Corp,Main Office,"123 Main St, Dallas TX",15000,28.50,427500,2024-01-01,2029-12-31,Office,Alisha Shields,Active Initiative,"Maintain / Renew","1. Plan and Program",Dallas,Uptown,"3,4","Jones Lang LaSalle"\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'CRE_Lease_Upload_Template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const autoMapHeaders = (headers: string[]): { csvCol: string; dbField: string }[] => {
    const result: { csvCol: string; dbField: string }[] = [];
    headers.forEach(h => {
      const match = CSV_FIELD_MAP[h.toLowerCase().trim()];
      if (match) result.push({ csvCol: h, dbField: match });
    });
    return result;
  };

  const applyMapping = (lines: string[], headers: string[], maps: { csvCol: string; dbField: string }[]) => {
    const mapLookup: Record<string, string> = {};
    maps.forEach(m => { mapLookup[m.csvCol] = m.dbField; });
    const hasIdMap = maps.some(m => m.dbField === 'id');
    const idHeader = maps.find(m => m.dbField === 'id')?.csvCol;
    const idColIdx = idHeader ? headers.indexOf(idHeader) : -1;
    let autoId = Date.now();
    return lines.map(line => {
      const vals = parseCSVLine(line);
      const raw: Record<string, string> = {};
      headers.forEach((h, i) => { raw[h] = vals[i] ?? ''; });
      const record: any = {};
      const errors: string[] = [];
      if (hasIdMap && idColIdx >= 0) {
        const idVal = vals[idColIdx]?.trim();
        record.id = idVal ? (parseInt(idVal, 10) || 0) : autoId++;
      } else { record.id = autoId++; }
      headers.forEach((h, i) => {
        const field = mapLookup[h] as keyof LeaseRecord | undefined;
        if (!field || field === 'id') return;
        const v = vals[i]?.trim();
        if (!v) return;
        if (field === 'sqft' || field === 'rentPSF' || field === 'totalRent') {
          record[field] = parseFloat(v.replace(/[,$]/g, '')) || 0;
        } else { record[field] = v; }
      });
      return { raw, parsed: record, errors } as UploadRow;
    });
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setRows([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setCsvHeaders([]); return; }
      const headers = parseCSVLine(lines[0]).map(h => h.trim());
      const dataLines = lines.slice(1);
      setCsvHeaders(headers);
      setRawLines(dataLines);
      const autoMaps = autoMapHeaders(headers);
      setMappings(autoMaps);
      setPendingCsvCol(undefined);
      setPendingDbField(undefined);
      setSelectResetKey(k => k + 1);
      setStep(2); // auto-advance to Map step
    };
    reader.readAsText(file);
  };

  const confirmMapping = () => {
    const parsed = applyMapping(rawLines, csvHeaders, mappings);
    setRows(parsed);
    setStep(3);
  };

  const addMappingRow = () => {
    if (!pendingCsvCol || !pendingDbField) return;
    setMappings(prev => [...prev, { csvCol: pendingCsvCol, dbField: pendingDbField }]);
    setPendingCsvCol(undefined);
    setPendingDbField(undefined);
    setSelectResetKey(k => k + 1);
  };

  const removeMappingRow = (idx: number) => setMappings(prev => prev.filter((_, i) => i !== idx));

  const saveTemplate = () => {
    if (!templateName.trim() || mappings.length === 0) return;
    onSaveTemplate({ name: templateName.trim(), mappings: mappings.map(m => ({ csvCol: m.csvCol, dbField: m.dbField })) });
    setTemplateName('');
    setShowSaveTemplate(false);
  };

  const loadTemplate = (tpl: MappingTemplate) => {
    const applicable = tpl.mappings.filter(m => csvHeaders.includes(m.csvCol));
    setMappings(applicable);
    setPendingCsvCol(undefined);
    setPendingDbField(undefined);
    setSelectResetKey(k => k + 1);
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { try { const d = JSON.parse(reader.result as string); if (Array.isArray(d)) onImportTemplates(d); } catch {} };
      reader.readAsText(file);
    };
    input.click();
  };

  const usedCsvCols = new Set(mappings.map(m => m.csvCol));
  const usedDbFields = new Set(mappings.map(m => m.dbField));
  const availableCsvCols = csvHeaders.filter(h => !usedCsvCols.has(h));
  const availableDbFields = MAPPABLE_FIELDS.filter(f => !usedDbFields.has(f.key));
  const hasMappings = mappings.length > 0;
  const validRows = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);
  const dbLabel = (key: string) => MAPPABLE_FIELDS.find(f => f.key === key)?.label ?? key;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = () => {
    onImport(validRows.map(r => r.parsed));
    setStep(4);
  };

  /** Build a full lease record (with defaults) for previewing */
  const buildPreviewRecord = (row: UploadRow): LeaseRecord => ({
    id: row.parsed.id ?? 0,
    tenant: row.parsed.tenant ?? 'Unknown Tenant',
    property: row.parsed.property ?? 'TBD',
    address: row.parsed.address ?? '',
    sqft: row.parsed.sqft ?? 0,
    rentPSF: row.parsed.rentPSF ?? 0,
    totalRent: row.parsed.totalRent ?? 0,
    leaseStart: row.parsed.leaseStart ?? '',
    leaseEnd: row.parsed.leaseEnd ?? '',
    type: row.parsed.type ?? 'Office',
    clientLead: row.parsed.clientLead ?? '',
    status: row.parsed.status ?? 'Active Initiative',
    strategy: row.parsed.strategy ?? 'Maintain / Renew',
    stage: row.parsed.stage ?? (STRATEGY_STAGES[row.parsed.strategy ?? 'Maintain / Renew']?.[0] ?? ''),
    market: row.parsed.market ?? '',
    submarket: row.parsed.submarket ?? '',
    floors: row.parsed.floors ?? '',
    broker: row.parsed.broker ?? '',
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden flex flex-col">
        {/* Header with step indicator */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2"><FileUp className="w-3.5 h-3.5" />Mass Upload Locations</h2>
              <p className="text-xs text-muted-foreground">Guided import wizard · {STEP_LABELS[step - 1]}</p>
            </div>
            {step === 1 && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={downloadTemplate}>
                <Download className="w-3.5 h-3.5" />Download Template
              </Button>
            )}
          </div>
          {/* Step progress bar */}
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === step;
              const isComplete = stepNum < step;
              return (
                <div key={label} className="flex-1 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                      isComplete ? 'bg-green-500 text-white' :
                      isActive ? 'bg-primary text-primary-foreground' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {isComplete ? <Check className="w-3 h-3" /> : stepNum}
                    </div>
                    <span className={cn('text-[10px] font-medium truncate', isActive ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
                  </div>
                  {i < 3 && <div className={cn('h-px flex-1 min-w-[12px]', isComplete ? 'bg-green-500' : 'bg-border')} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-5">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
                dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50'
              )}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <input id="csv-file-input" type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold">Drop your CSV file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">Accepts .csv files · Your columns will be mapped in the next step</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="border border-border rounded-lg p-3 text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                  <FileUp className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-[10px] font-semibold">1. Upload</p>
                <p className="text-[10px] text-muted-foreground">Drop or select CSV</p>
              </div>
              <div className="border border-border rounded-lg p-3 text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-[10px] font-semibold">2. Map Fields</p>
                <p className="text-[10px] text-muted-foreground">Match columns to fields</p>
              </div>
              <div className="border border-border rounded-lg p-3 text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                  <Table2 className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-[10px] font-semibold">3. Preview</p>
                <p className="text-[10px] text-muted-foreground">See rows before importing</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Map Fields ── */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* File info bar */}
            <div className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-2.5">
              <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{fileName}</p>
                <p className="text-[10px] text-muted-foreground">{csvHeaders.length} columns · {rawLines.length} row{rawLines.length !== 1 ? 's' : ''}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setStep(1); setFileName(''); setCsvHeaders([]); setRawLines([]); setMappings([]); }}>Change File</Button>
            </div>

            {/* Auto-detected notice */}
            {mappings.length > 0 && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <p className="text-xs text-green-800 dark:text-green-300">{mappings.length} field{mappings.length !== 1 ? 's' : ''} auto-detected from your column headers. Review and adjust below.</p>
              </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Field Mapping</span>
                  <span className="text-[10px] text-muted-foreground">{mappings.length} mapped{!mappings.some(m => m.dbField === 'id') ? ' · IDs auto-generated' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {savedTemplates.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={onExportTemplates}><Download className="w-3 h-3" />Export</Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={handleImportConfig}><Upload className="w-3 h-3" />Import</Button>
                  {savedTemplates.length > 0 && (
                    <Select onValueChange={v => { const tpl = savedTemplates.find(t => t.name === v); if (tpl) loadTemplate(tpl); }}>
                      <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs gap-1.5 border-border">
                        <FolderOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Load template" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedTemplates.map(t => (
                          <SelectItem key={t.name} value={t.name} className="text-xs">{t.name} · {t.mappings.length} fields</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {mappings.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={() => setShowSaveTemplate(!showSaveTemplate)}><Save className="w-3 h-3" />Save</Button>
                  )}
                </div>
              </div>

              {showSaveTemplate && (
                <div className="px-4 py-2.5 border-b border-border bg-primary/5 flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-primary shrink-0" />
                  <Input placeholder="Template name (e.g. CoStar Export)" value={templateName} onChange={e => setTemplateName(e.target.value)} className="h-7 text-xs flex-1" />
                  <Button size="sm" className="h-7 px-3 text-xs" disabled={!templateName.trim()} onClick={saveTemplate}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}>Cancel</Button>
                </div>
              )}

              <div className="p-4 space-y-3">
                {mappings.length > 0 && (
                  <div className="space-y-1.5">
                    {mappings.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-md px-3 py-2">
                        <span className="text-xs font-medium min-w-0 flex-1">{m.csvCol}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold text-primary min-w-0 flex-1">{dbLabel(m.dbField)}</span>
                        <button onClick={() => removeMappingRow(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {availableCsvCols.length > 0 && availableDbFields.length > 0 && (
                  <div className="flex items-end gap-3 pt-1">
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Spreadsheet Column</label>
                      <Select key={`csv-${selectResetKey}`} value={pendingCsvCol} onValueChange={setPendingCsvCol}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{availableCsvCols.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mb-1.5" />
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Location Field</label>
                      <Select key={`db-${selectResetKey}`} value={pendingDbField} onValueChange={setPendingDbField}>
                        <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{availableDbFields.map(f => <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs shrink-0" disabled={!pendingCsvCol || !pendingDbField} onClick={addMappingRow}><Plus className="w-3 h-3" /></Button>
                  </div>
                )}

                {mappings.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No fields mapped yet. Use the picklists above to map a spreadsheet column to a location field.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="font-medium">{validRows.length} ready to import</span>
              </div>
              {invalidRows.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="font-medium text-red-600 dark:text-red-400">{invalidRows.length} with errors</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">{rows.length} total · {mappings.length} fields mapped{!mappings.some(m => m.dbField === 'id') ? ' · IDs auto-generated' : ''}</span>
              <div className="ml-auto flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
                <button onClick={() => setPreviewMode('cards')} className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors', previewMode === 'cards' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>Cards</button>
                <button onClick={() => setPreviewMode('table')} className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors', previewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>Table</button>
              </div>
            </div>

            {/* Card-based preview — mirrors Property Database */}
            {previewMode === 'cards' && (
              <div className="space-y-2">
                {rows.slice(0, 50).map((row, i) => {
                  const rec = buildPreviewRecord(row);
                  const hasError = row.errors.length > 0;
                  const stages = STRATEGY_STAGES[rec.strategy] ?? [];
                  const progress = calcProgress(stages, rec.stage);

                  return (
                    <div key={i} className={cn(
                      'border rounded-lg p-3 transition-colors',
                      hasError ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20' : 'border-border bg-card'
                    )}>
                      <div className="flex items-start gap-3">
                        {/* Row number & status */}
                        <div className="flex flex-col items-center gap-1 pt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono w-5 text-center">{i + 1}</span>
                          {hasError
                            ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            : <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          }
                        </div>

                        {/* Main content — mirrors the lease table row */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold truncate">{rec.tenant}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground truncate">{rec.property}</span>
                            {rec.type && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">{rec.type}</Badge>}
                            {rec.status && <Badge className={cn('text-[9px] px-1.5 py-0 h-4 shrink-0', STATUS_STYLES[rec.status] ?? 'bg-gray-100 text-gray-700')}>{rec.status}</Badge>}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-1 text-[10px]">
                            {rec.address && <div><span className="text-muted-foreground">Address</span><br/><span className="font-medium">{rec.address}</span></div>}
                            <div><span className="text-muted-foreground">SF</span><br/><span className="font-medium font-mono">{rec.sqft ? rec.sqft.toLocaleString() : '—'}</span></div>
                            <div><span className="text-muted-foreground">Rent PSF</span><br/><span className="font-medium font-mono">{rec.rentPSF ? `$${rec.rentPSF.toFixed(2)}` : '—'}</span></div>
                            <div><span className="text-muted-foreground">Total Rent</span><br/><span className="font-medium font-mono">{rec.totalRent ? fmt(rec.totalRent) : '—'}</span></div>
                            <div><span className="text-muted-foreground">Strategy</span><br/><span className="font-medium">{rec.strategy}</span></div>
                            <div><span className="text-muted-foreground">Stage</span><br/><span className="font-medium">{rec.stage || '—'}</span></div>
                            {rec.market && <div><span className="text-muted-foreground">Market</span><br/><span className="font-medium">{rec.market}{rec.submarket ? ` · ${rec.submarket}` : ''}</span></div>}
                          </div>

                          {/* Progress bar */}
                          {stages.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-1.5">
                                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-[9px] text-muted-foreground font-mono">{progress}%</span>
                            </div>
                          )}

                          {/* Lease dates, lead, broker row */}
                          <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground">
                            {rec.leaseStart && <span>Start: {fmtDateShort(rec.leaseStart)}</span>}
                            {rec.leaseEnd && <span>End: {fmtDateShort(rec.leaseEnd)}</span>}
                            {rec.clientLead && <span>Lead: {rec.clientLead}</span>}
                            {rec.broker && <span>Broker: {rec.broker}</span>}
                            {rec.floors && <span>Floors: {rec.floors}</span>}
                          </div>
                        </div>
                      </div>

                      {hasError && (
                        <div className="mt-2 ml-8 text-[10px] text-red-600 dark:text-red-400">
                          {row.errors.join(' · ')}
                        </div>
                      )}
                    </div>
                  );
                })}
                {rows.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing first 50 of {rows.length} rows. All {validRows.length} valid rows will be imported.
                  </p>
                )}
              </div>
            )}

            {/* Table preview */}
            {previewMode === 'table' && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/70 text-muted-foreground uppercase tracking-wide">
                        <th className="px-2 py-2 text-left font-semibold w-8">#</th>
                        <th className="px-2 py-2 text-left font-semibold w-8"></th>
                        <th className="px-2 py-2 text-left font-semibold">ID</th>
                        <th className="px-2 py-2 text-left font-semibold">Tenant</th>
                        <th className="px-2 py-2 text-left font-semibold">Property</th>
                        <th className="px-2 py-2 text-left font-semibold">SF</th>
                        <th className="px-2 py-2 text-left font-semibold">Rent PSF</th>
                        <th className="px-2 py-2 text-left font-semibold">Total Rent</th>
                        <th className="px-2 py-2 text-left font-semibold">Strategy</th>
                        <th className="px-2 py-2 text-left font-semibold">Stage</th>
                        <th className="px-2 py-2 text-left font-semibold">Status</th>
                        <th className="px-2 py-2 text-left font-semibold">Market</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const rec = buildPreviewRecord(row);
                        return (
                          <tr key={i} className={cn('border-t border-border/50', row.errors.length > 0 && 'bg-red-50/50 dark:bg-red-950/20')}>
                            <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-2 py-1.5">{row.errors.length === 0 ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}</td>
                            <td className="px-2 py-1.5 font-mono font-medium">{rec.id}</td>
                            <td className="px-2 py-1.5 font-medium">{rec.tenant}</td>
                            <td className="px-2 py-1.5">{rec.property}</td>
                            <td className="px-2 py-1.5 font-mono">{rec.sqft ? rec.sqft.toLocaleString() : '—'}</td>
                            <td className="px-2 py-1.5 font-mono">{rec.rentPSF ? `$${rec.rentPSF.toFixed(2)}` : '—'}</td>
                            <td className="px-2 py-1.5 font-mono">{rec.totalRent ? fmt(rec.totalRent) : '—'}</td>
                            <td className="px-2 py-1.5">{rec.strategy}</td>
                            <td className="px-2 py-1.5">{rec.stage || '—'}</td>
                            <td className="px-2 py-1.5"><Badge className={cn('text-[9px] px-1 py-0 h-4', STATUS_STYLES[rec.status] ?? '')}>{rec.status}</Badge></td>
                            <td className="px-2 py-1.5">{rec.market || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 4 && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-base font-bold">Import Complete</p>
              <p className="text-xs text-muted-foreground mt-1">{validRows.length} location{validRows.length !== 1 ? 's' : ''} added to your Property Database</p>
              <div className="grid grid-cols-3 gap-3 mt-5 max-w-sm mx-auto">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-primary">{validRows.length}</p>
                  <p className="text-[10px] text-muted-foreground">Imported</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{mappings.length}</p>
                  <p className="text-[10px] text-muted-foreground">Fields Mapped</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-muted-foreground">{invalidRows.length}</p>
                  <p className="text-[10px] text-muted-foreground">Skipped</p>
                </div>
              </div>
              <Button className="mt-6 gap-1.5 text-xs" onClick={onClose}>
                <Check className="w-3 h-3" />Done
              </Button>
            </div>
          </div>
        )}

        {/* Footer navigation */}
        {step !== 4 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { if (step === 1) onClose(); else setStep((step - 1) as 1|2|3); }}>
              {step === 1 ? 'Cancel' : <><ChevronLeft className="w-3 h-3 mr-1" />Back</>}
            </Button>
            <div className="flex items-center gap-2">
              {step === 2 && (
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={!hasMappings} onClick={confirmMapping}>
                  Preview {rawLines.length} Rows<ArrowRight className="w-3 h-3" />
                </Button>
              )}
              {step === 3 && (
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={validRows.length === 0} onClick={handleImport}>
                  <Table2 className="w-3.5 h-3.5" />Import {validRows.length} Record{validRows.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Mass Delete Modal ─────────────────────────────────────────────────────────

function MassDeleteModal({ leases, onDelete, onClose }: {
  leases: LeaseRecord[];
  onDelete: (ids: number[]) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'select' | 'csv'>('select');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [csvIds, setCsvIds] = useState<number[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = leases.filter(l =>
    !search || l.tenant.toLowerCase().includes(search.toLowerCase()) || l.property.toLowerCase().includes(search.toLowerCase()) || String(l.id).includes(search)
  );

  const toggleId = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(l => l.id)));
  };

  const processCSV = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const ids: number[] = [];
      // Try to detect header row
      const first = lines[0]?.toLowerCase().trim();
      const startIdx = (first === 'record id' || first === 'id') ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const val = parseCSVLine(lines[i])[0]?.trim();
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) ids.push(num);
      }
      setCsvIds(ids);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) processCSV(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCSV(file);
  };

  const idsToDelete = mode === 'select' ? Array.from(selectedIds) : csvIds;
  const matchedLeases = leases.filter(l => idsToDelete.includes(l.id));
  const unmatchedIds = idsToDelete.filter(id => !leases.find(l => l.id === id));

  const handleDelete = () => {
    onDelete(matchedLeases.map(l => l.id));
    setDeleted(true);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2"><Trash2 className="w-3.5 h-3.5 text-red-500" />Mass Delete Locations</h2>
            <p className="text-xs text-muted-foreground">Remove multiple lease records by selection or CSV upload.</p>
          </div>
          <div className="flex border border-border rounded-md overflow-hidden">
            <button onClick={() => { setMode('select'); setConfirmStep(false); }}
              className={cn('px-3 py-1.5 text-xs font-medium', mode === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              Select
            </button>
            <button onClick={() => { setMode('csv'); setConfirmStep(false); }}
              className={cn('px-3 py-1.5 text-xs font-medium', mode === 'csv' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              CSV Upload
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {deleted ? (
            <div className="text-center py-10">
              <Trash2 className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <p className="text-sm font-bold">Successfully Deleted</p>
              <p className="text-xs text-muted-foreground mt-1">{matchedLeases.length} location{matchedLeases.length !== 1 ? 's' : ''} removed from the database</p>
            </div>
          ) : confirmStep ? (
            /* Confirmation step */
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-bold text-red-700 dark:text-red-300">Confirm Deletion</span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  You are about to permanently delete {matchedLeases.length} location{matchedLeases.length !== 1 ? 's' : ''}. This action cannot be undone.
                </p>
              </div>
              {unmatchedIds.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {unmatchedIds.length} Record ID{unmatchedIds.length !== 1 ? 's' : ''} not found in database and will be skipped: {unmatchedIds.slice(0, 10).join(', ')}{unmatchedIds.length > 10 ? '...' : ''}
                  </p>
                </div>
              )}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[280px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/70 text-muted-foreground uppercase tracking-wide">
                        <th className="px-2 py-2 text-left font-semibold">Record ID</th>
                        <th className="px-2 py-2 text-left font-semibold">Tenant</th>
                        <th className="px-2 py-2 text-left font-semibold">Property</th>
                        <th className="px-2 py-2 text-left font-semibold">SF</th>
                        <th className="px-2 py-2 text-left font-semibold">Strategy</th>
                        <th className="px-2 py-2 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedLeases.map(l => (
                        <tr key={l.id} className="border-t border-border/50">
                          <td className="px-2 py-1.5 font-mono font-medium">{l.id}</td>
                          <td className="px-2 py-1.5">{l.tenant}</td>
                          <td className="px-2 py-1.5">{l.property}</td>
                          <td className="px-2 py-1.5 font-mono">{l.sqft.toLocaleString()}</td>
                          <td className="px-2 py-1.5">{l.strategy}</td>
                          <td className="px-2 py-1.5">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', STATUS_STYLES[l.status] || '')}>{l.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : mode === 'select' ? (
            /* Selection mode */
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search by tenant, property, or Record ID…" className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[340px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/70 text-muted-foreground uppercase tracking-wide">
                        <th className="px-2 py-2 text-left font-semibold w-8">
                          <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
                            onChange={toggleAll} className="rounded border-border" />
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">Record ID</th>
                        <th className="px-2 py-2 text-left font-semibold">Tenant</th>
                        <th className="px-2 py-2 text-left font-semibold">Property</th>
                        <th className="px-2 py-2 text-left font-semibold">SF</th>
                        <th className="px-2 py-2 text-left font-semibold">Strategy</th>
                        <th className="px-2 py-2 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(l => (
                        <tr key={l.id} className={cn('border-t border-border/50 cursor-pointer', selectedIds.has(l.id) && 'bg-red-50/50 dark:bg-red-950/20')}
                          onClick={() => toggleId(l.id)}>
                          <td className="px-2 py-1.5">
                            <input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => toggleId(l.id)} className="rounded border-border" />
                          </td>
                          <td className="px-2 py-1.5 font-mono font-medium">{l.id}</td>
                          <td className="px-2 py-1.5">{l.tenant}</td>
                          <td className="px-2 py-1.5">{l.property}</td>
                          <td className="px-2 py-1.5 font-mono">{l.sqft.toLocaleString()}</td>
                          <td className="px-2 py-1.5">{l.strategy}</td>
                          <td className="px-2 py-1.5">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', STATUS_STYLES[l.status] || '')}>{l.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* CSV mode */
            <div className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  dragOver ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20' : 'border-border hover:border-red-300'
                )}
                onClick={() => document.getElementById('csv-delete-input')?.click()}
              >
                <input id="csv-delete-input" type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
                <FileUp className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                {csvFileName ? (
                  <>
                    <p className="text-sm font-medium">{csvFileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{csvIds.length} Record ID{csvIds.length !== 1 ? 's' : ''} found · Click or drop to replace</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Drop CSV with Record IDs or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">One Record ID per row · Optional header row</p>
                  </>
                )}
              </div>
              {csvIds.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="font-medium">{matchedLeases.length} matched in database</span>
                  </div>
                  {unmatchedIds.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-medium text-amber-600 dark:text-amber-400">{unmatchedIds.length} not found</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!deleted && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            {confirmStep ? (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmStep(false)}>Back</Button>
                <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5" />Delete {matchedLeases.length} Record{matchedLeases.length !== 1 ? 's' : ''}
                </Button>
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">
                  {idsToDelete.length} selected
                </span>
                <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs" disabled={idsToDelete.length === 0}
                  onClick={() => setConfirmStep(true)}>
                  <Trash2 className="w-3.5 h-3.5" />Review & Delete
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Print Report Modal ────────────────────────────────────────────────────────

function PrintReportModal({ leases, notes, clientLogos, onClose }: {
  leases: LeaseRecord[];
  notes: Record<number, LeaseNote[]>;
  clientLogos: Record<string, string>;
  onClose: () => void;
}) {
  const [printMode, setPrintMode] = useState<'light' | 'dark'>('light');
  const reportDate = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filteredActive = leases.filter(l => l.status === 'Active Initiative' || l.status === 'Active Disposition');
  // Group Project Management first, then everything else — within each group, sort by nearest lease expiration
  const pmGroup = filteredActive
    .filter(l => l.strategy === 'Project Management')
    .sort((a, b) => a.leaseEnd < b.leaseEnd ? -1 : 1);
  const otherGroup = filteredActive
    .filter(l => l.strategy !== 'Project Management')
    .sort((a, b) => a.leaseEnd < b.leaseEnd ? -1 : 1);
  const activeLeases = [...pmGroup, ...otherGroup];

  const isDark = printMode === 'dark';
  const bg = isDark ? '#1a1a2e' : '#ffffff';
  const fg = isDark ? '#e0e0e0' : '#1a1a1a';
  const fgMuted = isDark ? '#888888' : '#6b7280';
  const border = isDark ? '#333355' : '#e5e7eb';
  const cardBg = isDark ? '#16213e' : '#f9fafb';
  const accent = isDark ? '#60a5fa' : '#2563eb';
  // Project Management unified color
  const pmColor = isDark ? '#A86FDF' : '#7A39BB';
  const pmCardBg = isDark ? '#2a1d3e' : '#F5EFFB';
  const pmBorder = isDark ? '#4A2E6E' : '#D9C3EF';
  const isPmLease = (l: LeaseRecord) => l.strategy === 'Project Management';
  const colorFor = (l: LeaseRecord) => isPmLease(l) ? pmColor : accent;
  const cardBgFor = (l: LeaseRecord) => isPmLease(l) ? pmCardBg : cardBg;
  const borderFor = (l: LeaseRecord) => isPmLease(l) ? pmBorder : border;

  const handlePrint = () => {
    const el = document.getElementById('print-report-content');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Active Initiatives Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${bg}; color: ${fg}; padding: 32px; }
        @media print { body { padding: 16px; } }
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-bold">Print Report — Active Locations</h2>
            <p className="text-xs text-muted-foreground">{activeLeases.length} active locations</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-md overflow-hidden">
              <button onClick={() => setPrintMode('light')}
                className={cn('px-2.5 py-1.5 text-xs flex items-center gap-1', printMode === 'light' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <Sun className="w-3 h-3" />Light
              </button>
              <button onClick={() => setPrintMode('dark')}
                className={cn('px-2.5 py-1.5 text-xs flex items-center gap-1', printMode === 'dark' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <Moon className="w-3 h-3" />Dark
              </button>
            </div>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" />Print
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div id="print-report-content" style={{ backgroundColor: bg, color: fg, padding: '24px', borderRadius: '8px' }}>
            {/* Report Header */}
            <div style={{ borderBottom: `2px solid ${accent}`, paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
                      <rect width="32" height="32" rx="6" fill={accent} />
                      <rect x="7" y="18" width="4" height="8" fill="white" />
                      <rect x="14" y="12" width="4" height="14" fill="white" opacity="0.85" />
                      <rect x="21" y="6" width="4" height="20" fill="white" opacity="0.7" />
                    </svg>
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>Transcend</span>
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 700, marginTop: '8px' }}>Active Initiatives Report</p>
                  <p style={{ fontSize: '12px', color: fgMuted }}>Prepared for Jordan Wade</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: fgMuted }}>Report Generated</p>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{reportDate}</p>
                </div>
              </div>
            </div>

            {/* KPI Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'Active Locations', value: String(activeLeases.length) },
                { label: 'Total SF', value: fmtSqft(activeLeases.reduce((s,l) => s + l.sqft, 0)) },
                { label: 'Annual Rent', value: fmt(activeLeases.reduce((s,l) => s + l.totalRent, 0)) },
                { label: 'Construction', value: String(activeLeases.filter(l => l.stage.toLowerCase().includes('construction') || l.strategy === 'Project Management').length) },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: cardBg, padding: '12px', borderRadius: '6px', border: `1px solid ${border}` }}>
                  <p style={{ fontSize: '10px', color: fgMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</p>
                  <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Location Cards — grouped: Project Management first, then all others. Sorted by nearest lease expiration within each group. */}
            {activeLeases.map((lease, idx) => {
              const stages = STRATEGY_STAGES[lease.strategy] ?? [];
              const progress = calcProgress(stages, lease.stage);
              const lastNote = (notes[lease.id] ?? [])[0];
              const logo = clientLogos[lease.tenant];
              const isFirstInGroup = idx === 0 || (idx === pmGroup.length && otherGroup.length > 0);
              const groupTitle =
                idx === 0 && pmGroup.length > 0 ? 'Project Management'
                : idx === pmGroup.length && otherGroup.length > 0 ? 'Active Transactions'
                : null;
              const groupCount = groupTitle === 'Project Management' ? pmGroup.length : otherGroup.length;
              const groupColor = groupTitle === 'Project Management' ? pmColor : accent;

              return (
                <React.Fragment key={lease.id}>
                  {isFirstInGroup && groupTitle && (
                    <div style={{ marginTop: idx === 0 ? '0' : '24px', marginBottom: '14px', paddingBottom: '8px', borderBottom: `2px solid ${groupColor}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '4px', height: '18px', background: groupColor, borderRadius: '2px' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: fg, letterSpacing: '0.02em' }}>{groupTitle}</span>
                      <span style={{ fontSize: '10px', color: fgMuted, background: cardBg, padding: '2px 8px', borderRadius: '10px', border: `1px solid ${border}` }}>{groupCount} {groupCount === 1 ? 'location' : 'locations'}</span>
                    </div>
                  )}
                <div style={{ border: `1px solid ${borderFor(lease)}`, borderLeft: isPmLease(lease) ? `4px solid ${pmColor}` : `1px solid ${borderFor(lease)}`, borderRadius: '8px', padding: '16px', marginBottom: '12px', background: cardBgFor(lease) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {logo && <img src={logo} alt={lease.tenant} style={{ height: '24px', maxWidth: '100px', objectFit: 'contain' }} />}
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700 }}>{idx + 1}. {lease.tenant} — {lease.property}</p>
                        <p style={{ fontSize: '11px', color: fgMuted }}>{lease.address}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', background: colorFor(lease), color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{lease.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '10px', fontSize: '11px' }}>
                    <div><span style={{ color: fgMuted }}>Strategy</span><br/><strong>{lease.strategy}</strong></div>
                    <div><span style={{ color: fgMuted }}>Stage</span><br/><strong>{lease.stage}</strong></div>
                    <div><span style={{ color: fgMuted }}>Progress</span><br/><strong>{progress}%</strong></div>
                    <div><span style={{ color: fgMuted }}>SF</span><br/><strong>{lease.sqft.toLocaleString()}</strong></div>
                    <div><span style={{ color: fgMuted }}>Lease Exp</span><br/><strong>{fmtDateShort(lease.leaseEnd)}</strong></div>
                    <div><span style={{ color: fgMuted }}>Lead</span><br/><strong>{lease.clientLead}</strong></div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ background: isPmLease(lease) ? (isDark ? '#3a2a4e' : '#E9DAF5') : (isDark ? '#2a2a4a' : '#e5e7eb'), borderRadius: '4px', height: '6px', marginBottom: '8px' }}>
                    <div style={{ background: colorFor(lease), height: '100%', borderRadius: '4px', width: `${progress}%`, transition: 'width 0.3s' }} />
                  </div>

                  {lastNote && (
                    <div style={{ background: isPmLease(lease) ? (isDark ? '#25193a' : '#EFE6F8') : (isDark ? '#1e1e3f' : '#f3f4f6'), borderRadius: '4px', padding: '8px 10px', fontSize: '11px' }}>
                      <span style={{ color: fgMuted }}>{lastNote.author} · {lastNote.date}:</span> {lastNote.text}
                    </div>
                  )}
                </div>
                </React.Fragment>
              );
            })}

            {/* Footer */}
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: '12px', marginTop: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: fgMuted }}>Transcend — Confidential · {reportDate}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function getTabFromHash(): string {
  const hash = window.location.hash || '#/';
  const qIdx = hash.indexOf('?');
  if (qIdx < 0) return 'leases';
  const params = new URLSearchParams(hash.slice(qIdx));
  return params.get('tab') || 'leases';
}

export default function PortfolioTracker({ userRole = 'owner' }: { userRole?: 'owner' | 'editor' | 'viewer' }) {
  const readOnly = userRole === 'viewer';
  const [tab, setTab] = useState<string>(getTabFromHash);

  // Listen for hash changes (e.g. sidebar clicks, back/forward)
  useEffect(() => {
    const onHash = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Shared state
  const [leasesData, setLeasesData] = useState<LeaseRecord[]>(() =>
    [...leasesInit].sort((a, b) => a.leaseEnd < b.leaseEnd ? -1 : 1)
  );
  const [notes,     setNotes]     = useState<Record<number, LeaseNote[]>>(initialLeaseNotes);
  const [documents, setDocuments] = useState<Record<number, LeaseDocument[]>>(initialLeaseDocuments);
  const [photos,    setPhotos]    = useState<Record<number, LeasePhoto[]>>(PLACEHOLDER_PHOTOS);
  const [qbrEntries, setQbrEntries] = useState<QBREntry[]>(INITIAL_QBR_ENTRIES);
  const [manualDates, setManualDates] = useState<Record<number, string>>({});
  const [profileId,   setProfileId]   = useState<number | null>(null);
  const [slideDeckOpen, setSlideDeckOpen] = useState(false);
  const [clientLogos, setClientLogos] = useState<Record<string, string>>(INITIAL_CLIENT_LOGOS);
  const [printReportOpen, setPrintReportOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [portfolioName, setPortfolioName] = useState('Transcend Portfolio');
  const [massUploadOpen, setMassUploadOpen] = useState(false);
  const [massDeleteOpen, setMassDeleteOpen] = useState(false);
  const [mappingTemplates, setMappingTemplates] = useState<MappingTemplate[]>([]);
  const { globalLogo: dashboardLogo, setGlobalLogo: setDashboardLogo } = useBranding();
  const [milestones, setMilestones] = useState<Record<number, Milestone[]>>({});

  const addMilestone = (leaseId: number, label: string, date: string) => {
    setMilestones(prev => {
      const existing = prev[leaseId] ?? [];
      return { ...prev, [leaseId]: [...existing, { id: Date.now(), label, date }] };
    });
  };

  const removeMilestone = (leaseId: number, milestoneId: number) => {
    setMilestones(prev => {
      const existing = prev[leaseId] ?? [];
      return { ...prev, [leaseId]: existing.filter(m => m.id !== milestoneId) };
    });
  };

  const profileLease = leasesData.find(l => l.id === profileId) ?? null;
  const pmLeases     = leasesData.filter(l => l.strategy === 'Project Management');
  const activeInit   = leasesData.filter(l => l.status === 'Active Initiative' || l.status === 'Active Disposition');

  const handleTabChange = (value: string) => {
    window.location.hash = value === 'leases' ? '#/' : `#/?tab=${value}`;
    setTab(value);
  };

  const updateLease = (updated: LeaseRecord) =>
    setLeasesData(prev => prev.map(l => l.id === updated.id ? updated : l));

  const addNote = (leaseId: number, text: string, author: string) => {
    const note: LeaseNote = { id: Date.now(), date: new Date().toISOString().slice(0,10), author, text };
    setNotes(prev => ({ ...prev, [leaseId]: [note, ...(prev[leaseId] ?? [])] }));
  };

  const addDocument = (leaseId: number, doc: Omit<LeaseDocument, 'id'>) => {
    const d: LeaseDocument = { ...doc, id: Date.now() };
    setDocuments(prev => ({ ...prev, [leaseId]: [...(prev[leaseId] ?? []), d] }));
  };

  const addPhoto = (leaseId: number, label: string, category: LeasePhoto['category'], url: string) => {
    const newPhoto: LeasePhoto = { id: Date.now(), url, label, category };
    setPhotos(prev => ({ ...prev, [leaseId]: [...(prev[leaseId] ?? []), newPhoto] }));
  };

  const addQBREntry = (entry: Omit<QBREntry, 'id'>) => {
    setQbrEntries(prev => [...prev, { ...entry, id: Date.now() }]);
  };

  const setManualDate = (leaseId: number, date: string) => {
    setManualDates(prev => {
      const next = { ...prev };
      if (date) next[leaseId] = date;
      else delete next[leaseId];
      return next;
    });
  };

  const setClientLogo = (tenant: string, dataUrl: string) => {
    setClientLogos(prev => ({ ...prev, [tenant]: dataUrl }));
  };

  const handleMassImport = (rows: Partial<LeaseRecord>[]) => {
    setLeasesData(prev => {
      const next = [...prev];
      rows.forEach(row => {
        if (row.id == null) return;
        const existing = next.findIndex(l => l.id === row.id);
        if (existing >= 0) {
          // Merge: only overwrite non-empty fields from CSV
          const merged = { ...next[existing] };
          Object.entries(row).forEach(([k, v]) => {
            if (v !== undefined && v !== '' && k !== 'id') (merged as any)[k] = v;
          });
          next[existing] = merged;
        } else {
          // New record — fill defaults for missing fields
          const newRecord: LeaseRecord = {
            id: row.id,
            tenant: row.tenant ?? 'Unknown Tenant',
            property: row.property ?? 'TBD',
            address: row.address ?? '',
            sqft: row.sqft ?? 0,
            rentPSF: row.rentPSF ?? 0,
            totalRent: row.totalRent ?? 0,
            leaseStart: row.leaseStart ?? '',
            leaseEnd: row.leaseEnd ?? '',
            type: row.type ?? 'Office',
            clientLead: row.clientLead ?? '',
            status: row.status ?? 'Active Initiative',
            strategy: row.strategy ?? 'Maintain / Renew',
            stage: row.stage ?? (STRATEGY_STAGES[row.strategy ?? 'Maintain / Renew']?.[0] ?? ''),
            market: row.market ?? '',
            submarket: row.submarket ?? '',
            floors: row.floors ?? '',
            broker: row.broker ?? '',
          };
          next.push(newRecord);
        }
      });
      return next.sort((a, b) => a.leaseEnd < b.leaseEnd ? -1 : 1);
    });
  };

  const handleMassDelete = (ids: number[]) => {
    setLeasesData(prev => prev.filter(l => !ids.includes(l.id)));
  };

  return (
    <div className="p-6 space-y-4">
      {/* View-only banner for viewers */}
      {readOnly && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400 shrink-0"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">View-only access</span>
          <span className="text-xs text-amber-600/80 dark:text-amber-400/60">— You have viewer permissions on this portfolio. Editing is disabled.</span>
        </div>
      )}

      {/* Building Profile Modal */}
      {profileLease && (
        <BuildingProfileModal
          lease={profileLease}
          notes={notes[profileLease.id] ?? []}
          documents={documents[profileLease.id] ?? []}
          photos={photos[profileLease.id] ?? []}
          clientLogo={clientLogos[profileLease.tenant] ?? ''}
          onAddNote={(text, author) => addNote(profileLease.id, text, author)}
          onAddDocument={doc => addDocument(profileLease.id, doc)}
          onAddPhoto={(label, category, url) => addPhoto(profileLease.id, label, category, url)}
          onSetClientLogo={(dataUrl) => setClientLogo(profileLease.tenant, dataUrl)}
          onClose={() => setProfileId(null)}
          onUpdate={updateLease}
          qbrEntries={qbrEntries}
          milestones={milestones[profileLease.id] ?? []}
          onAddMilestone={(label, date) => addMilestone(profileLease.id, label, date)}
          onRemoveMilestone={(msId) => removeMilestone(profileLease.id, msId)}
          onAddToQBR={(leaseId, year, newRent, services, summary, valueAddItems) => {
            const lease = leasesData.find(l => l.id === leaseId);
            if (!lease) return;
            addQBREntry({
              leaseId: lease.id,
              tenant: lease.tenant,
              property: lease.property,
              completedDate: new Date().toISOString().slice(0, 10),
              strategy: lease.strategy,
              sqft: lease.sqft,
              originalRent: lease.totalRent,
              newRent,
              savings: lease.totalRent - newRent,
              valueAddItems: valueAddItems ?? [],
              servicesProvided: services,
              summary,
              qbrYear: year,
            });
          }}
        />
      )}

      {/* Print Report Modal */}
      {printReportOpen && (
        <PrintReportModal
          leases={leasesData}
          notes={notes}
          clientLogos={clientLogos}
          onClose={() => setPrintReportOpen(false)}
        />
      )}

      {/* Shareable Snapshot Modal */}
      {snapshotOpen && (
        <ShareableSnapshotModal
          leases={leasesData}
          notes={notes}
          clientLogos={clientLogos}
          portfolioName={portfolioName}
          onClose={() => setSnapshotOpen(false)}
        />
      )}

      {/* Mass Upload Modal */}
      {massUploadOpen && (
        <MassUploadModal
          onImport={handleMassImport}
          onClose={() => setMassUploadOpen(false)}
          savedTemplates={mappingTemplates}
          onSaveTemplate={(t) => setMappingTemplates(prev => {
            const idx = prev.findIndex(p => p.name === t.name);
            if (idx >= 0) { const next = [...prev]; next[idx] = t; return next; }
            return [...prev, t];
          })}
          onDeleteTemplate={(name) => setMappingTemplates(prev => prev.filter(t => t.name !== name))}
          onExportTemplates={() => {
            const json = JSON.stringify(mappingTemplates, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'mapping-templates.json'; a.click();
            URL.revokeObjectURL(url);
          }}
          onImportTemplates={(imported) => {
            setMappingTemplates(prev => {
              const next = [...prev];
              imported.forEach(t => {
                if (t.name && Array.isArray(t.mappings)) {
                  const idx = next.findIndex(p => p.name === t.name);
                  if (idx >= 0) next[idx] = t;
                  else next.push(t);
                }
              });
              return next;
            });
          }}
        />
      )}

      {/* Mass Delete Modal */}
      {massDeleteOpen && (
        <MassDeleteModal
          leases={leasesData}
          onDelete={handleMassDelete}
          onClose={() => setMassDeleteOpen(false)}
        />
      )}

      {/* Slide Deck */}
      {slideDeckOpen && (
        <SlideDeckView
          leases={pmLeases}
          notes={notes}
          onClose={() => setSlideDeckOpen(false)}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {dashboardLogo ? (
            <div className="relative group">
              <img src={dashboardLogo} alt="Client logo" className="h-10 max-w-[160px] object-contain" />
              <button onClick={() => setDashboardLogo('')}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove logo"><X className="w-2.5 h-2.5" /></button>
            </div>
          ) : (
            <label className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors" title="Upload client logo">
              <ImagePlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setDashboardLogo(reader.result as string);
                reader.readAsDataURL(file);
              }} />
            </label>
          )}
          <div>
            <h2 className="text-base font-bold">Portfolio Tracker</h2>
            <p className="text-xs text-muted-foreground">
              {leasesData.length} leases · {fmtSqft(leasesData.reduce((s,l)=>s+l.sqft,0))} · {fmt(leasesData.reduce((s,l)=>s+l.totalRent,0))} annual rent
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setPrintReportOpen(true)}>
          <Printer className="w-3.5 h-3.5" />Print Report
        </Button>
      </div>

      {/* Module Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-9">
          <TabsTrigger value="leases"      className="text-xs gap-1.5"><Database      className="w-3.5 h-3.5" />Property Database</TabsTrigger>
          <TabsTrigger value="initiatives" className={cn('text-xs gap-1.5', activeInit.length > 0 && 'ring-1 ring-green-400/50 dark:ring-green-500/40')}><Activity className="w-3.5 h-3.5" />Active Initiatives
            {activeInit.length > 0 && <span className="ml-1.5 bg-green-500 text-white rounded-full text-[10px] px-1.5 py-0.5 leading-none font-semibold">{activeInit.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="roadmap"     className="text-xs gap-1.5"><CalendarRange className="w-3.5 h-3.5" />Roadmap</TabsTrigger>
          <TabsTrigger value="qbr"         className="text-xs gap-1.5"><FileBarChart  className="w-3.5 h-3.5" />QBR Report</TabsTrigger>
        </TabsList>

        <TabsContent value="leases" className="mt-4">
          <LeasesModule data={leasesData} notes={notes} onUpdate={updateLease} onViewProfile={setProfileId} onMassUpload={() => setMassUploadOpen(true)} onMassDelete={() => setMassDeleteOpen(true)} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="initiatives" className="mt-4">
          <InitiativesModule allLeases={leasesData} notes={notes} onUpdate={updateLease} onViewProfile={setProfileId} onShareSnapshot={() => setSnapshotOpen(true)} milestones={milestones} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="roadmap" className="mt-4">
          <RoadmapModule allLeases={leasesData} notes={notes} onViewProfile={setProfileId} manualDates={manualDates} onSetManualDate={setManualDate} milestones={milestones} clientLogos={clientLogos} dashboardLogo={dashboardLogo} portfolioName={portfolioName} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="qbr" className="mt-4">
          <QBRModule leases={leasesData} qbrEntries={qbrEntries} notes={notes} onAddQBREntry={addQBREntry} onViewProfile={setProfileId} readOnly={readOnly} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
