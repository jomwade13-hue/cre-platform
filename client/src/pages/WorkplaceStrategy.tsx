import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  LayoutDashboard, Ruler, MessageSquare, Layers, CheckCircle2,
  Clock, AlertCircle, ChevronDown, ChevronUp, Download, Plus, Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Cell
} from 'recharts';
import { KPICard } from '@/components/KPICard';
import { spaceProgram, questionnaire, spaceEfficiencyData } from '@/data/mock';
import { cn } from '@/lib/utils';

// ── Space Program ──────────────────────────────────────────────────────────────
function SpaceProgramModule() {
  const totalHC = spaceProgram.reduce((s, r) => s + r.headcount, 0);
  const totalSF = spaceProgram.reduce((s, r) => s + r.totalSqft, 0);
  const avgRatio = Math.round(totalSF / totalHC);
  const progHeads = spaceProgram.filter(r => r.headcount > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Headcount" value={String(totalHC)} delta={17} deltaLabel="projected 3yr" icon={<LayoutDashboard className="w-4 h-4" />} accent="purple" />
        <KPICard label="Total Program SF" value={`${totalSF.toLocaleString()} SF`} icon={<Ruler className="w-4 h-4" />} accent="blue" />
        <KPICard label="Avg SF / Person" value={`${avgRatio} SF`} delta={-8} deltaLabel="vs market" icon={<CheckCircle2 className="w-4 h-4" />} accent="green" />
        <KPICard label="Utilization Target" value="58%" delta={-12} deltaLabel="vs industry" icon={<AlertCircle className="w-4 h-4" />} accent="amber" />
      </div>

      {/* Space Program Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Space Program by Department</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Download className="w-3 h-3" />Export</Button>
            <Button size="sm" className="h-7 text-xs gap-1"><Plus className="w-3 h-3" />Add Dept.</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Department</th>
                <th className="px-4 py-2.5 text-left">Headcount</th>
                <th className="px-4 py-2.5 text-left">SF/Person</th>
                <th className="px-4 py-2.5 text-left">Private %</th>
                <th className="px-4 py-2.5 text-left">Collab %</th>
                <th className="px-4 py-2.5 text-left">Total SF</th>
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-left">SF Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {spaceProgram.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{r.department}</td>
                  <td className="px-4 py-3 tabular-nums">{r.headcount > 0 ? r.headcount : '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{r.ratio > 0 ? `${r.ratio} SF` : '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{r.privatePct > 0 ? `${r.privatePct}%` : '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{r.collaborationPct > 0 ? `${r.collaborationPct}%` : '—'}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{r.totalSqft.toLocaleString()} SF</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.type}</td>
                  <td className="px-4 py-3 w-28">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(r.totalSqft / totalSF) * 100 * 3}%`, maxWidth: '100%' }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold border-t-2 border-border">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 tabular-nums">{totalHC}</td>
                <td className="px-4 py-3 tabular-nums">{avgRatio} SF avg</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 tabular-nums">{totalSF.toLocaleString()} SF</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">SF Allocation vs Recommendation</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spaceEfficiencyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={40} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: any) => [`${v.toLocaleString()} SF`]} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="allocated" name="Allocated" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="recommended" name="Recommended" fill="#D1D5DB" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">SF per Department (top 7)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={spaceProgram.filter(r => r.headcount > 0).sort((a, b) => b.totalSqft - a.totalSqft)}
              layout="vertical"
              barSize={16}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 10 }} width={90} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: any) => [`${v.toLocaleString()} SF`, 'Total SF']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }} />
              <Bar dataKey="totalSqft" name="Total SF" radius={[0, 3, 3, 0]}>
                {spaceProgram.filter(r => r.headcount > 0).sort((a, b) => b.totalSqft - a.totalSqft).map((_, i) => (
                  <Cell key={i} fill={['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'][i % 7]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Tenant Questionnaire ───────────────────────────────────────────────────────
function TenantQuestionnaireModule() {
  const [openSection, setOpenSection] = useState<number | null>(1);
  const completed = questionnaire.sections.filter(s => s.complete).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Sections Complete" value={`${completed}/${questionnaire.sections.length}`} icon={<CheckCircle2 className="w-4 h-4" />} accent="green" />
        <KPICard label="Questions Answered" value="22 / 28" icon={<MessageSquare className="w-4 h-4" />} accent="blue" />
        <KPICard label="Completion Rate" value="79%" delta={79} deltaLabel="complete" icon={<AlertCircle className="w-4 h-4" />} accent="amber" />
        <KPICard label="Last Updated" value="Apr 5, 2026" icon={<Clock className="w-4 h-4" />} accent="purple" />
      </div>

      {/* Overall progress */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Questionnaire Progress</h3>
          <span className="text-xs text-muted-foreground">79% complete</span>
        </div>
        <Progress value={79} className="h-2 mb-3" />
        <div className="flex flex-wrap gap-2">
          {questionnaire.sections.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs">
              {s.complete
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <Clock className="w-3.5 h-3.5 text-amber-500" />
              }
              <span className={s.complete ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Accordion sections */}
      <div className="space-y-2">
        {questionnaire.sections.map((section) => (
          <div key={section.id} className="border border-border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
            >
              {section.complete
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                : <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              }
              <span className="flex-1 text-sm font-semibold">{section.title}</span>
              <Badge className={cn('text-xs border-0', section.complete ? 'status-active' : 'status-pending')}>
                {section.complete ? 'Complete' : 'Incomplete'}
              </Badge>
              {openSection === section.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {openSection === section.id && (
              <div className="border-t border-border bg-muted/20 divide-y divide-border">
                {section.responses.map((r, i) => (
                  <div key={i} className="px-4 py-3 flex gap-4">
                    <p className="text-xs text-muted-foreground w-48 shrink-0">{r.q}</p>
                    <p className="text-xs font-medium flex-1">{r.a}</p>
                  </div>
                ))}
                {!section.complete && (
                  <div className="px-4 py-3">
                    <Button size="sm" className="h-7 text-xs gap-1.5">
                      <Plus className="w-3 h-3" />Complete Section
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="gap-1.5 text-sm"><Download className="w-3.5 h-3.5" />Export Responses</Button>
        <Button className="gap-1.5 text-sm">Send Reminder</Button>
      </div>
    </div>
  );
}

// ── Bluebeam / AutoCAD (Workplace) ────────────────────────────────────────────
function WorkplaceCADModule() {
  const floorPlans = [
    { name: 'PwC_FloorPlan_Option-A_25F-26F.pdf', status: 'Current', date: '2025-03-20', note: 'Open plan layout — 85 WS' },
    { name: 'PwC_FloorPlan_Option-B_25F-26F.pdf', status: 'Draft', date: '2025-03-18', note: 'Hybrid — 60 WS + 10 offices' },
    { name: 'PwC_FloorPlan_Option-C_25F-26F.pdf', status: 'Draft', date: '2025-03-15', note: 'Biophilic design concept' },
    { name: 'PwC_Existing-Conditions_25F-26F.dwg', status: 'Reference', date: '2025-02-01', note: 'Current space as-built' },
    { name: 'PwC_Space-Program_Summary.pdf', status: 'Final', date: '2025-03-22', note: 'Approved space program' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Floor Plan Viewer</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs">Option A</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs">Option B</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs">Option C</Button>
            </div>
          </div>
          {/* Simplified floor plan visualization */}
          <div className="bg-slate-50 dark:bg-slate-900 h-72 p-6 relative">
            <svg viewBox="0 0 400 240" className="w-full h-full">
              {/* Floor outline */}
              <rect x="10" y="10" width="380" height="220" rx="4" fill="none" stroke="#94A3B8" strokeWidth="2" />
              {/* Core (elevators/stairs) */}
              <rect x="170" y="90" width="60" height="60" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
              <text x="200" y="124" textAnchor="middle" fontSize="9" fill="#64748B">CORE</text>
              {/* Reception */}
              <rect x="10" y="10" width="80" height="50" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
              <text x="50" y="39" textAnchor="middle" fontSize="8" fill="#1D4ED8">RECEPTION</text>
              {/* Open workspace */}
              <rect x="10" y="70" width="150" height="160" fill="#F0FDF4" stroke="#86EFAC" strokeWidth="1" />
              <text x="85" y="155" textAnchor="middle" fontSize="9" fill="#16A34A">OPEN WORKSPACE</text>
              <text x="85" y="167" textAnchor="middle" fontSize="8" fill="#16A34A">60 Stations</text>
              {/* Offices */}
              <rect x="240" y="10" width="150" height="80" fill="#F5F3FF" stroke="#C4B5FD" strokeWidth="1" />
              <text x="315" y="53" textAnchor="middle" fontSize="9" fill="#7C3AED">PRIVATE OFFICES</text>
              <text x="315" y="65" textAnchor="middle" fontSize="8" fill="#7C3AED">10 Offices</text>
              {/* Conference */}
              <rect x="240" y="100" width="150" height="130" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1" />
              <text x="315" y="168" textAnchor="middle" fontSize="9" fill="#EA580C">CONFERENCE</text>
              <text x="315" y="180" textAnchor="middle" fontSize="8" fill="#EA580C">8 Rooms</text>
              {/* Cafe */}
              <rect x="100" y="10" width="60" height="50" fill="#FEF9C3" stroke="#FDE047" strokeWidth="1" />
              <text x="130" y="39" textAnchor="middle" fontSize="8" fill="#854D0E">CAFÉ</text>
            </svg>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">Layout Legend</h3>
          {[
            { color: '#DBEAFE', label: 'Reception / Entry', sf: '800 SF' },
            { color: '#F0FDF4', label: 'Open Workspace', sf: '8,400 SF' },
            { color: '#F5F3FF', label: 'Private Offices', sf: '3,600 SF' },
            { color: '#FFF7ED', label: 'Conference Rooms', sf: '4,200 SF' },
            { color: '#FEF9C3', label: 'Café / Lounge', sf: '1,200 SF' },
            { color: '#E2E8F0', label: 'Core / Utilities', sf: '1,300 SF' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <div className="w-4 h-3 rounded-sm border border-border shrink-0" style={{ backgroundColor: item.color }} />
              <span className="flex-1">{item.label}</span>
              <span className="font-medium tabular-nums text-muted-foreground">{item.sf}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2">
            <p className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground">19,500 SF</span></p>
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Floor Plan Files</h3>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Plus className="w-3 h-3" />Upload</Button>
        </div>
        <div className="divide-y divide-border">
          {floorPlans.map((f, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <span className="text-xl">📐</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.note}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{f.date}</span>
              <Badge className={cn('text-xs border-0 shrink-0',
                f.status === 'Current' ? 'status-active' :
                f.status === 'Final' ? 'status-complete' :
                f.status === 'Draft' ? 'status-pending' :
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              )}>{f.status}</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><Eye className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Furniture Test Fit ─────────────────────────────────────────────────────────
function FurnitureTestFitModule() {
  const furniture = [
    { type: 'Collaborative Bench Desk', qty: 60, vendor: 'Steelcase', model: 'Flex Active Frames', unitCost: 2800, area: 'Open Workspace', status: 'Specified' },
    { type: 'Private Desk Workstation', qty: 15, vendor: 'Herman Miller', model: 'OE1 Desk', unitCost: 3200, area: 'Private Offices', status: 'Specified' },
    { type: 'Executive Desk', qty: 8, vendor: 'Knoll', model: 'Dividends Horizon', unitCost: 6500, area: 'Private Offices', status: 'Specified' },
    { type: 'Conference Table (12P)', qty: 4, vendor: 'Teknion', model: 'Expansion Table', unitCost: 9800, area: 'Conference Rooms', status: 'Specified' },
    { type: 'Conference Table (6P)', qty: 8, vendor: 'Teknion', model: 'Calibrate Table', unitCost: 5200, area: 'Conference Rooms', status: 'Pending Approval' },
    { type: 'Lounge Seating', qty: 24, vendor: 'Haworth', model: 'Cabana', unitCost: 1850, area: 'Café / Lounge', status: 'Specified' },
    { type: 'Bar Stool', qty: 16, vendor: 'Steelcase', model: 'Buoy', unitCost: 1100, area: 'Café / Lounge', status: 'Specified' },
    { type: 'Phone Booth / Focus Pod', qty: 8, vendor: 'ROOM', model: 'One Pod', unitCost: 8500, area: 'Open Workspace', status: 'Pending Approval' },
    { type: 'Ergonomic Chair', qty: 85, vendor: 'Herman Miller', model: 'Aeron', unitCost: 1800, area: 'All Areas', status: 'Specified' },
  ];

  const total = furniture.reduce((s, f) => s + f.qty * f.unitCost, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Line Items" value={String(furniture.length)} icon={<Layers className="w-4 h-4" />} accent="purple" />
        <KPICard label="Total Pieces" value={String(furniture.reduce((s, f) => s + f.qty, 0))} icon={<LayoutDashboard className="w-4 h-4" />} accent="blue" />
        <KPICard label="Est. FF&E Budget" value={`$${(total / 1000).toFixed(0)}K`} icon={<CheckCircle2 className="w-4 h-4" />} accent="green" />
        <KPICard label="Pending Approval" value="2 items" icon={<AlertCircle className="w-4 h-4" />} accent="amber" />
      </div>

      {/* Test fit visual */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Open Workspace Test Fit — 25F Open Area</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs">Download DWG</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">Request Revision</Button>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg h-56 flex items-center justify-center relative overflow-hidden">
          <svg viewBox="0 0 500 220" className="w-full h-full p-4">
            {/* Room outline */}
            <rect x="20" y="10" width="460" height="200" rx="3" fill="none" stroke="#CBD5E1" strokeWidth="2" />
            {/* Desk clusters - 4 pods of 4 */}
            {[0, 1, 2, 3].map((row) =>
              [0, 1].map((col) => (
                <g key={`${row}-${col}`} transform={`translate(${50 + col * 100}, ${30 + row * 45})`}>
                  {/* 4-person bench desk cluster */}
                  <rect x="0" y="0" width="80" height="20" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1" />
                  <rect x="10" y="5" width="15" height="10" rx="1" fill="#60A5FA" opacity="0.6" />
                  <rect x="30" y="5" width="15" height="10" rx="1" fill="#60A5FA" opacity="0.6" />
                  <rect x="50" y="5" width="15" height="10" rx="1" fill="#60A5FA" opacity="0.6" />
                </g>
              ))
            )}
            {/* Phone pods */}
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={270 + (i % 2) * 55} y={30 + Math.floor(i / 2) * 65} width="45" height="45" rx="4" fill="#F5F3FF" stroke="#C4B5FD" strokeWidth="1" />
            ))}
            <text x="330" y="105" textAnchor="middle" fontSize="8" fill="#7C3AED">Phone Pods</text>
            {/* Labels */}
            <text x="175" y="165" textAnchor="middle" fontSize="9" fill="#3B82F6">Bench Workstations (60)</text>
            <text x="330" y="165" textAnchor="middle" fontSize="9" fill="#7C3AED">Focus Pods (8)</text>
            {/* Circulation paths */}
            <line x1="240" y1="10" x2="240" y2="210" stroke="#E2E8F0" strokeWidth="8" strokeDasharray="2 2" />
            <text x="246" y="185" fontSize="8" fill="#94A3B8">Aisle</text>
          </svg>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Preliminary test fit — pending structural clearance from landlord. Revised drawings expected April 18, 2026.</p>
      </div>

      {/* FF&E Schedule */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">FF&E Specification Schedule</h3>
          <span className="text-xs text-muted-foreground">Est. Total: ${(total / 1000).toFixed(0)}K</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Item</th>
                <th className="px-4 py-2.5 text-left">Vendor</th>
                <th className="px-4 py-2.5 text-left">Model</th>
                <th className="px-4 py-2.5 text-left">Area</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
                <th className="px-4 py-2.5 text-right">Unit $</th>
                <th className="px-4 py-2.5 text-right">Total $</th>
                <th className="px-4 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {furniture.map((f, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{f.type}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.vendor}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{f.model}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{f.area}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{f.qty}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">${f.unitCost.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">${(f.qty * f.unitCost).toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={cn('text-xs border-0',
                      f.status === 'Specified' ? 'status-active' : 'status-pending'
                    )}>{f.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td colSpan={6} className="px-4 py-2.5 text-sm font-semibold">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold">${total.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkplaceStrategy() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const tab = params.get('tab') || 'space';

  const handleTabChange = (value: string) => {
    setLocation(`/workplace?tab=${value}`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-lg">
          <LayoutDashboard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-base font-bold">Workplace Strategy</h2>
          <p className="text-xs text-muted-foreground">290 employees · 47,020 SF program · Midtown Atlanta target</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-8 text-xs flex-wrap">
          <TabsTrigger value="space" className="text-xs gap-1.5"><Ruler className="w-3.5 h-3.5" />Space Program</TabsTrigger>
          <TabsTrigger value="questionnaire" className="text-xs gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Tenant Questionnaire</TabsTrigger>
          <TabsTrigger value="cad" className="text-xs gap-1.5"><Layers className="w-3.5 h-3.5" />Bluebeam / AutoCAD</TabsTrigger>
          <TabsTrigger value="furniture" className="text-xs gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" />Furniture Test Fit</TabsTrigger>
        </TabsList>
        <TabsContent value="space" className="mt-4"><SpaceProgramModule /></TabsContent>
        <TabsContent value="questionnaire" className="mt-4"><TenantQuestionnaireModule /></TabsContent>
        <TabsContent value="cad" className="mt-4"><WorkplaceCADModule /></TabsContent>
        <TabsContent value="furniture" className="mt-4"><FurnitureTestFitModule /></TabsContent>
      </Tabs>
    </div>
  );
}
