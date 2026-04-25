import { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Building2,
  ChevronLeft, ChevronRight, Bell, Search, Settings,
  Sun, Moon, User, LogOut, ChevronDown, PanelLeftClose, PanelLeftOpen,
  Database, FileBarChart, CalendarRange,
  Activity, Palette, Upload, X, ImageIcon, Check,
  Crown, Edit3, Eye, Shield
} from 'lucide-react';
import type { PortfolioRole } from '@/pages/ClientPortal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ── Branding Context ──────────────────────────────────────────────────────────
interface BrandingContextType {
  globalLogo: string;
  setGlobalLogo: (logo: string) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
}

const BrandingContext = createContext<BrandingContextType>({
  globalLogo: '', setGlobalLogo: () => {},
  companyName: '', setCompanyName: () => {},
});

export const useBranding = () => useContext(BrandingContext);

// ── Theme Context ─────────────────────────────────────────────────────────────
const ThemeContext = createContext<{ theme: string; toggle: () => void }>({
  theme: 'light', toggle: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<string>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  // Apply on mount
  useState(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  });

  // Global branding state
  const [globalLogo, setGlobalLogo] = useState('');
  const [companyName, setCompanyName] = useState('');

  return (
    <BrandingContext.Provider value={{ globalLogo, setGlobalLogo, companyName, setCompanyName }}>
      <ThemeContext.Provider value={{ theme, toggle }}>
        {children}
      </ThemeContext.Provider>
    </BrandingContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ── Navigation Config ─────────────────────────────────────────────────────────
const navConfig = [
  {
    id: 'portfolio',
    label: 'Portfolio Tracker',
    icon: Building2,
    href: '/',
    color: 'text-blue-400',
    modules: [
      { label: 'Property Database', icon: Database,      tab: 'leases' },
      { label: 'Active Initiatives', icon: Activity,      tab: 'initiatives' },
      { label: 'Roadmap',            icon: CalendarRange,  tab: 'roadmap' },
      { label: 'QBR Report',         icon: FileBarChart,   tab: 'qbr' },
    ]
  },


];

// ── Sidebar ───────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  onBackToPortal?: () => void;
  onLogout?: () => void;
}

function getHashTab(): string {
  const hash = window.location.hash || '#/';
  const qIdx = hash.indexOf('?');
  if (qIdx < 0) return '';
  return new URLSearchParams(hash.slice(qIdx)).get('tab') ?? '';
}

export function Sidebar({ collapsed, onCollapse, onBackToPortal, onLogout }: SidebarProps) {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState<string | null>('portfolio');
  const [currentTab, setCurrentTab] = useState<string>(getHashTab);

  useEffect(() => {
    const onHash = () => setCurrentTab(getHashTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return location === '/' || location === '';
    return location.startsWith(href);
  };

  const isModuleActive = (tab: string, itemHref: string) => {
    if (!isActive(itemHref)) return false;
    if (!currentTab) {
      // Default first tab for each section
      const defaults: Record<string, string> = { '/': 'leases' };
      return tab === (defaults[itemHref] ?? '');
    }
    return currentTab === tab;
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => prev === id ? null : id);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'sidebar-nav flex flex-col border-r border-sidebar-border transition-all duration-300',
          'bg-sidebar text-sidebar-foreground relative',
          collapsed ? 'w-[60px]' : 'w-[240px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-4 border-b border-sidebar-border min-h-[60px]',
          collapsed && 'justify-center px-2'
        )}>
          <svg viewBox="0 0 32 32" fill="none" aria-label="Transcend" className="w-7 h-7 shrink-0">
            <rect width="32" height="32" rx="6" fill="#3B82F6" />
            <rect x="7" y="18" width="4" height="8" fill="white" />
            <rect x="14" y="12" width="4" height="14" fill="white" opacity="0.85" />
            <rect x="21" y="6" width="4" height="20" fill="white" opacity="0.7" />
            <path d="M7 18 L16 10 L25 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          </svg>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Transcend</p>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Client Dashboard</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => onCollapse(true)}
              className="w-6 h-6 flex items-center justify-center rounded text-sidebar-foreground/40 hover:text-white hover:bg-sidebar-accent/60 transition-all"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-2 space-y-0.5">
            {navConfig.map((item) => {
              const active     = isActive(item.href);
              const isExpanded = expanded === item.id;

              return (
                <div key={item.id}>
                  {collapsed ? (
                    // Collapsed mode: show icon with tooltip
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={item.href}>
                          <button
                            onClick={() => { setExpanded(item.id); }}
                            className={cn(
                              'w-full flex items-center justify-center py-2.5 rounded-md transition-all',
                              'hover:bg-sidebar-accent hover:text-white',
                              active ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/70'
                            )}
                          >
                            <item.icon className={cn('w-5 h-5 shrink-0', active && item.color)} />
                          </button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs font-medium">
                        {item.label}
                        <div className="mt-1 space-y-0.5">
                          {item.modules.map(mod => (
                            <p key={mod.tab} className="text-[11px] opacity-70">{mod.label}</p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    // Expanded mode
                    <>
                      <div className="flex items-center">
                        <Link href={item.href} className="flex-1">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all',
                              'hover:bg-sidebar-accent hover:text-white',
                              active ? 'bg-sidebar-accent text-white font-medium' : 'text-sidebar-foreground/80'
                            )}
                          >
                            <item.icon className={cn('w-4 h-4 shrink-0', active && item.color)} />
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            <ChevronDown
                              className={cn('w-3.5 h-3.5 transition-transform opacity-60 shrink-0', isExpanded && 'rotate-180')}
                            />
                          </button>
                        </Link>
                      </div>

                      {/* Sub-modules */}
                      {isExpanded && (
                        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border/40 pl-3">
                          {item.modules.map((mod) => {
                            const modActive = isModuleActive(mod.tab, item.href);
                            return (
                              <button
                                key={mod.tab}
                                onClick={() => {
                                  window.location.hash = mod.tab === 'leases' ? '#/' : `#/?tab=${mod.tab}`;
                                }}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all',
                                  modActive
                                    ? 'bg-sidebar-accent/80 text-white font-medium'
                                    : 'hover:bg-sidebar-accent/60 hover:text-white text-sidebar-foreground/60'
                                )}
                              >
                                <mod.icon className={cn('w-3.5 h-3.5 shrink-0', modActive && 'text-white')} />
                                <span className="truncate">{mod.label}</span>
                                {modActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          {collapsed ? (
            // Collapsed: just expand button
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onCollapse(false)}
                  className="w-full flex items-center justify-center py-2 rounded text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-white transition-all"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <>
              {onBackToPortal && (
                <button
                  onClick={onBackToPortal}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-white transition-all"
                  data-testid="button-back-to-portal"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>All Portfolios</span>
                </button>
              )}
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className="bg-blue-500 text-white text-xs font-bold">JW</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">Jordan Wade</p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">jomwade13@icloud.com</p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  data-testid="button-sidebar-logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Collapse toggle — floating on right edge */}
        {!collapsed && (
          <button
            onClick={() => onCollapse(true)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent transition-all shadow-md"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => onCollapse(false)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent transition-all shadow-md"
            title="Expand sidebar"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </aside>
    </TooltipProvider>
  );
}

// ── Role Badge Helper ─────────────────────────────────────────────────────────
const ROLE_DISPLAY: Record<PortfolioRole, { label: string; icon: typeof Crown; color: string; bgColor: string }> = {
  owner:  { label: 'Owner',  icon: Crown,  color: '#F59E0B', bgColor: '#F59E0B20' },
  editor: { label: 'Editor', icon: Edit3,  color: '#3B82F6', bgColor: '#3B82F620' },
  viewer: { label: 'Viewer', icon: Eye,    color: '#6B7280', bgColor: '#6B728020' },
};

function RoleBadge({ role }: { role: PortfolioRole }) {
  const cfg = ROLE_DISPLAY[role];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5 font-medium"
      style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
      data-testid="badge-user-role"
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
interface HeaderProps {
  title: string;
  subtitle?: string;
  onLogout?: () => void;
  userRole?: PortfolioRole;
}

// ── Branding Settings Panel ───────────────────────────────────────────────────
function BrandingPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { globalLogo, setGlobalLogo, companyName, setCompanyName } = useBranding();
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setGlobalLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Branding Settings</h2>
              <p className="text-xs text-muted-foreground">Upload once, apply across all dashboards</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Company Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Company / Client Name</label>
            <Input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="h-9 text-sm"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Dashboard Logo</label>
            {globalLogo ? (
              <div className="border border-border rounded-lg p-4 flex items-center gap-4">
                <div className="bg-muted/50 rounded-md p-3 flex items-center justify-center min-w-[80px]">
                  <img src={globalLogo} alt="Logo" className="h-10 max-w-[140px] object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Logo uploaded</p>
                  <p className="text-[10px] text-muted-foreground">Displays in both dashboard headers</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => setGlobalLogo('')}>
                  <X className="w-3 h-3 mr-1" />Remove
                </Button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => document.getElementById('branding-logo-input')?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <input id="branding-logo-input" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-xs font-medium">Drop logo image here or click to browse</p>
                <p className="text-[10px] text-muted-foreground mt-1">PNG, SVG, or JPG · Recommended 200×60px</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {(globalLogo || companyName) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Preview</label>
              <div className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  {globalLogo ? (
                    <img src={globalLogo} alt="Preview" className="h-8 max-w-[120px] object-contain" />
                  ) : (
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-md">
                      <Building2 className="w-4 h-4 text-blue-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold">{companyName || 'Dashboard Title'}</p>
                    <p className="text-[10px] text-muted-foreground">As it appears in dashboard headers</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground">Changes apply to all dashboards instantly</p>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave}>
            {saved ? <><Check className="w-3 h-3" />Saved</> : 'Done'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Header({ title, subtitle, onLogout, userRole }: HeaderProps) {
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);

  return (
    <header className="dashboard-header bg-card border-b border-border px-6 py-3 flex items-center gap-4 min-h-[60px]">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-foreground leading-tight">{title}</h1>
          {userRole && <RoleBadge role={userRole} />}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className={cn('relative transition-all duration-200', searchOpen ? 'w-64' : 'w-auto')}>
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search properties, leases, comps…"
              className="pl-9 pr-3 h-8 text-sm w-64"
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost" size="sm"
            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">Search…</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
          </Button>
        )}
      </div>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {[
            { icon: '🔴', msg: 'PwC lease negotiations in final stage', time: '1h ago' },
            { icon: '🟡', msg: 'United Airlines counterproposal submitted', time: '3h ago' },
            { icon: '🟢', msg: 'NCR construction — change order #4 executed', time: '1d ago' },
            { icon: '📄', msg: 'Q1 2026 QBR report ready for review', time: '2d ago' },
          ].map((n, i) => (
            <DropdownMenuItem key={i} className="flex gap-3 py-2.5">
              <span className="text-base">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{n.msg}</p>
                <p className="text-[10px] text-muted-foreground">{n.time}</p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

      {/* Settings */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Dashboard Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setBrandingOpen(true)}>
            <Palette className="w-3.5 h-3.5 mr-2" />Branding & Logo
          </DropdownMenuItem>
          <DropdownMenuItem>Manage columns</DropdownMenuItem>
          <DropdownMenuItem>Export data</DropdownMenuItem>
          <DropdownMenuItem>Notification preferences</DropdownMenuItem>
          <DropdownMenuItem>Currency & units</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Integrations</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Branding Settings Panel */}
      <BrandingPanel open={brandingOpen} onClose={() => setBrandingOpen(false)} />

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2 pl-1 pr-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">JW</AvatarFallback>
            </Avatar>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <div>
              <p className="font-semibold">Jordan Wade</p>
              <p className="text-xs font-normal text-muted-foreground">jomwade13@icloud.com</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem><User className="w-3.5 h-3.5 mr-2" />Profile settings</DropdownMenuItem>
          <DropdownMenuItem><Settings className="w-3.5 h-3.5 mr-2" />Preferences</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onLogout}>
            <LogOut className="w-3.5 h-3.5 mr-2" />Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

// ── App Layout ────────────────────────────────────────────────────────────────
export function AppLayout({ children, title, subtitle, onBackToPortal, onLogout, userRole }: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onBackToPortal?: () => void;
  onLogout?: () => void;
  userRole?: PortfolioRole;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} onBackToPortal={onBackToPortal} onLogout={onLogout} />
      <Header title={title} subtitle={subtitle} onLogout={onLogout} userRole={userRole} />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
