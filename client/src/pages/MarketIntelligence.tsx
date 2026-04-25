import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Map as MapIcon, BarChart3, Globe, ClipboardList,
  Search, Download, Filter, Plus, ChevronUp, ChevronDown,
  MoreHorizontal, TrendingUp, TrendingDown, Building2, MapPin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import { leaseComps, mapProperties, timList, marketRentBySubmarket, rentTrendData } from '@/data/mock';
import { cn } from '@/lib/utils';

// ── Lease Comps ───────────────────────────────────────────────────────────────
function LeaseCompsModule() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'leaseDate', dir: 'desc' });

  const filtered = useMemo(() => {
    let data = [...leaseComps];
    if (search) data = data.filter(c =>
      c.tenant.toLowerCase().includes(search.toLowerCase()) ||
      c.property.toLowerCase().includes(search.toLowerCase())
    );
    if (typeFilter !== 'all') data = data.filter(c => c.leaseType === typeFilter);
    if (subFilter !== 'all') data = data.filter(c => c.submarket === subFilter);
    data.sort((a: any, b: any) => {
      const v = a[sort.col] < b[sort.col] ? -1 : a[sort.col] > b[sort.col] ? 1 : 0;
      return sort.dir === 'asc' ? v : -v;
    });
    return data;
  }, [search, typeFilter, subFilter, sort]);

  const avgRent = filtered.length ? (filtered.reduce((s, c) => s + c.rentPSF, 0) / filtered.length) : 0;
  const totalSqft = filtered.reduce((s, c) => s + c.sqft, 0);

  const toggleSort = (col: string) => setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  const SortIcon = ({ col }: { col: string }) => (
    sort.col === col
      ? sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />
  );

  const typeColors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    Renewal: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    Expansion: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Comps" value={String(filtered.length)} delta={8} deltaLabel="vs last qtr" icon={<BarChart3 className="w-4 h-4" />} accent="amber" />
        <KPICard label="Avg Rent PSF" value={`$${avgRent.toFixed(2)}`} delta={3.4} deltaLabel="YoY" icon={<TrendingUp className="w-4 h-4" />} accent="blue" />
        <KPICard label="Total SF Transacted" value={`${(totalSqft / 1000).toFixed(0)}K SF`} icon={<Building2 className="w-4 h-4" />} accent="green" />
        <KPICard label="Highest Rent PSF" value={`$${Math.max(...filtered.map(c => c.rentPSF)).toFixed(2)}`} icon={<TrendingUp className="w-4 h-4" />} accent="purple" />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Avg Rent PSF by Submarket</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={marketRentBySubmarket} barSize={26}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="submarket" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 55]} />
              <Tooltip formatter={(v: any, n: string) => [n === 'rent' ? `$${v} PSF` : `${v}%`, n === 'rent' ? 'Avg Rent' : 'Vacancy']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }} />
              <Bar dataKey="rent" name="rent" radius={[4, 4, 0, 0]}>
                {marketRentBySubmarket.map((_, i) => (
                  <Cell key={i} fill={['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'][i % 6]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Market Rent Trend (Portfolio vs Market)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={rentTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} domain={[35, 50]} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: any, n: string) => [`$${v} PSF`, n]} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="marketAvg" name="Market Avg" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avgRent" name="Portfolio Avg" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search tenants or properties…" className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[130px] text-sm"><SelectValue placeholder="Lease Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="New">New Lease</SelectItem>
            <SelectItem value="Renewal">Renewal</SelectItem>
            <SelectItem value="Expansion">Expansion</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subFilter} onValueChange={setSubFilter}>
          <SelectTrigger className="h-8 w-[130px] text-sm"><SelectValue placeholder="Submarket" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Submarkets</SelectItem>
            <SelectItem value="Midtown">Midtown</SelectItem>
            <SelectItem value="Buckhead">Buckhead</SelectItem>
            <SelectItem value="CBD">CBD</SelectItem>
            <SelectItem value="Perimeter">Perimeter</SelectItem>
            <SelectItem value="Cumberland">Cumberland</SelectItem>
            <SelectItem value="Decatur">Decatur</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 gap-1.5"><Download className="w-3.5 h-3.5" />Export</Button>
      </div>

      {/* Comps Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                {[
                  { col: 'tenant', label: 'Tenant' },
                  { col: 'property', label: 'Property' },
                  { col: 'submarket', label: 'Submarket' },
                  { col: 'sqft', label: 'SF' },
                  { col: 'rentPSF', label: 'Rent PSF' },
                  { col: 'leaseType', label: 'Type' },
                  { col: 'term', label: 'Term' },
                  { col: 'leaseDate', label: 'Date' },
                  { col: 'landlord', label: 'Landlord' },
                ].map(({ col, label }) => (
                  <th key={col} className="px-4 py-2.5 text-left font-semibold cursor-pointer hover:text-foreground whitespace-nowrap"
                    onClick={() => toggleSort(col)}>
                    <span className="flex items-center gap-1">{label}<SortIcon col={col} /></span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left">Concessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{c.tenant}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap max-w-[160px] truncate">{c.property}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.submarket}</td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">{c.sqft.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold whitespace-nowrap">${c.rentPSF.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-xs border-0', typeColors[c.leaseType] || '')}>{c.leaseType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.term} yrs</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.leaseDate}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.landlord}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{c.concessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border bg-muted/30 text-xs text-muted-foreground flex justify-between">
          <span>{filtered.length} of {leaseComps.length} comps</span>
          <span>Avg rent: ${avgRent.toFixed(2)} PSF · {(totalSqft / 1000).toFixed(0)}K SF total</span>
        </div>
      </div>
    </div>
  );
}

// ── Interactive Map ────────────────────────────────────────────────────────────
function InteractiveMapModule() {
  const [selected, setSelected] = useState<typeof mapProperties[0] | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  const filtered = filterType === 'all' ? mapProperties : mapProperties.filter(p => p.status === filterType);

  useEffect(() => {
    // Dynamically load the map to avoid SSR issues
    const loadMap = async () => {
      try {
        const { MapContainer, TileLayer, Marker, Popup, Circle } = await import('react-leaflet');
        const L = await import('leaflet');

        // Fix Leaflet default icon
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        const colorMap: Record<string, string> = {
          Active: '#3B82F6',
          Expiring: '#F59E0B',
          Comp: '#10B981',
          Expired: '#EF4444',
        };

        const DynamicMap = ({ properties, onSelect }: { properties: typeof mapProperties; onSelect: (p: any) => void }) => (
          <MapContainer center={[33.80, -84.38]} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {properties.map((p) => (
              <Circle
                key={p.id}
                center={[p.lat, p.lng]}
                radius={Math.sqrt(p.sqft) * 2}
                pathOptions={{
                  color: colorMap[p.status] || '#6366F1',
                  fillColor: colorMap[p.status] || '#6366F1',
                  fillOpacity: 0.5,
                  weight: 2,
                }}
                eventHandlers={{ click: () => onSelect(p) }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-sm mb-1">{p.name}</p>
                    <p>Tenant: {p.tenant}</p>
                    <p>SF: {p.sqft.toLocaleString()}</p>
                    <p>Rent PSF: ${p.rentPSF}</p>
                    <p>Status: {p.status}</p>
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        );

        setMapComponent(() => ({ properties, onSelect }: any) =>
          <DynamicMap properties={properties} onSelect={onSelect} />
        );
      } catch (e) {
        console.error('Map load error:', e);
      }
    };
    loadMap();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Properties on Map" value={String(mapProperties.length)} icon={<Globe className="w-4 h-4" />} accent="amber" />
        <KPICard label="Active Leases" value={String(mapProperties.filter(p => p.status === 'Active').length)} icon={<Building2 className="w-4 h-4" />} accent="blue" />
        <KPICard label="Lease Comps" value={String(mapProperties.filter(p => p.status === 'Comp').length)} icon={<BarChart3 className="w-4 h-4" />} accent="green" />
        <KPICard label="Expiring Soon" value={String(mapProperties.filter(p => p.status === 'Expiring').length)} icon={<MapPin className="w-4 h-4" />} accent="red" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Map */}
        <div className="md:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Atlanta Office Market</h3>
            <div className="flex items-center gap-2">
              {['all', 'Active', 'Expiring', 'Comp'].map((v) => (
                <Button key={v} variant={filterType === v ? 'default' : 'outline'} size="sm" className="h-7 text-xs"
                  onClick={() => setFilterType(v)}>{v === 'all' ? 'All' : v}</Button>
              ))}
            </div>
          </div>
          <div style={{ height: '400px' }}>
            {MapComponent
              ? <MapComponent properties={filtered} onSelect={setSelected} />
              : (
                <div className="h-full flex items-center justify-center bg-muted/20">
                  <div className="text-center">
                    <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading map…</p>
                  </div>
                </div>
              )
            }
          </div>
          {/* Legend */}
          <div className="px-4 py-2 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Active Lease</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />Expiring</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Comp</div>
            <span className="ml-auto">Circle size = SF leased</span>
          </div>
        </div>

        {/* Property list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <h3 className="text-sm font-semibold">Properties</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} shown</p>
          </div>
          <div className="overflow-y-auto flex-1" style={{ maxHeight: '430px' }}>
            {filtered.map((p) => (
              <button
                key={p.id}
                className={cn(
                  'w-full px-4 py-3 text-left border-b border-border hover:bg-muted/30 transition-colors',
                  selected?.id === p.id && 'bg-primary/5 border-l-2 border-l-primary'
                )}
                onClick={() => setSelected(selected?.id === p.id ? null : p)}
              >
                <div className="flex items-start gap-2">
                  <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0',
                    p.status === 'Active' ? 'bg-blue-500' :
                    p.status === 'Expiring' ? 'bg-amber-500' :
                    p.status === 'Comp' ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.tenant}</p>
                    <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>{p.sqft.toLocaleString()} SF</span>
                      <span className="font-medium text-foreground">${p.rentPSF} PSF</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {selected && (
            <div className="px-4 py-3 border-t border-border bg-primary/5 flex-shrink-0">
              <p className="text-xs font-semibold">{selected.name}</p>
              <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
                <span>Tenant: <span className="text-foreground">{selected.tenant}</span></span>
                <span>SF: <span className="text-foreground">{selected.sqft.toLocaleString()}</span></span>
                <span>Rent: <span className="text-foreground">${selected.rentPSF} PSF</span></span>
                <span>Status: <Badge className={cn('text-[10px] border-0 ml-1',
                  selected.status === 'Active' ? 'status-active' :
                  selected.status === 'Expiring' ? 'status-pending' :
                  selected.status === 'Comp' ? 'status-complete' : 'status-expired'
                )}>{selected.status}</Badge></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TIM List ──────────────────────────────────────────────────────────────────
function TIMListModule() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let data = [...timList];
    if (search) data = data.filter(t =>
      t.tenant.toLowerCase().includes(search.toLowerCase()) ||
      t.submarket.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== 'all') data = data.filter(t => t.status === statusFilter);
    return data;
  }, [search, statusFilter]);

  const statusColors: Record<string, string> = {
    'Active Search': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Site Touring': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'LOI Stage': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'RFP Issued': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'Preliminary': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Tenants in Market" value={String(timList.length)} delta={3} deltaLabel="vs last qtr" icon={<ClipboardList className="w-4 h-4" />} accent="amber" />
        <KPICard label="Total SF Demand" value="280K–490K" icon={<Building2 className="w-4 h-4" />} accent="blue" />
        <KPICard label="LOI Stage" value={String(timList.filter(t => t.status === 'LOI Stage').length)} icon={<TrendingUp className="w-4 h-4" />} accent="green" />
        <KPICard label="Avg Budget PSF" value="$43–50" icon={<BarChart3 className="w-4 h-4" />} accent="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search tenants or submarkets…" className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active Search">Active Search</SelectItem>
            <SelectItem value="Site Touring">Site Touring</SelectItem>
            <SelectItem value="LOI Stage">LOI Stage</SelectItem>
            <SelectItem value="RFP Issued">RFP Issued</SelectItem>
            <SelectItem value="Preliminary">Preliminary</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 gap-1.5"><Download className="w-3.5 h-3.5" />Export</Button>
        <Button size="sm" className="h-8 gap-1.5"><Plus className="w-3.5 h-3.5" />Add Tenant</Button>
      </div>

      {/* TIM Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{t.tenant}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.requirement} · {t.submarket}</p>
              </div>
              <Badge className={cn('text-xs border-0 shrink-0', statusColors[t.status] || '')}>{t.status}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">SF Range</p>
                <p className="font-semibold mt-0.5">{t.size}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="font-semibold mt-0.5">{t.budget}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target Move-in</p>
                <p className="font-semibold mt-0.5">{t.timing}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-2">{t.notes}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
              <span>Broker: <span className="text-foreground font-medium">{t.broker}</span></span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">View Details</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketIntelligence() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const tab = params.get('tab') || 'comps';

  const handleTabChange = (value: string) => {
    setLocation(`/market?tab=${value}`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
          <MapIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold">Market Intelligence</h2>
          <p className="text-xs text-muted-foreground">12 lease comps · {mapProperties.length} mapped properties · {timList.length} tenants in market</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="comps" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Lease Comps</TabsTrigger>
          <TabsTrigger value="map" className="text-xs gap-1.5"><Globe className="w-3.5 h-3.5" />Interactive Map</TabsTrigger>
          <TabsTrigger value="tim" className="text-xs gap-1.5"><ClipboardList className="w-3.5 h-3.5" />TIM List</TabsTrigger>
        </TabsList>
        <TabsContent value="comps" className="mt-4"><LeaseCompsModule /></TabsContent>
        <TabsContent value="map" className="mt-4"><InteractiveMapModule /></TabsContent>
        <TabsContent value="tim" className="mt-4"><TIMListModule /></TabsContent>
      </Tabs>
    </div>
  );
}
