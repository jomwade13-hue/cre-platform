import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Trash2, CheckCircle2, AlertCircle, Save, ChevronDown, ChevronUp,
  Printer, X, MapPin, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ─────────────────────────── Types ─────────────────────────── */

export interface DecomTask {
  id: string;
  task: string;
  owner: string;
  dueDate: string;      // ISO YYYY-MM-DD
  done: boolean;
}

export interface DecomData {
  checklist: DecomTask[];
  surrender: string;          // free-form note
  services: string[];         // bullet list
  leaseExpiration?: string;   // ISO YYYY-MM-DD — manual override per decom workflow
  landlordBroker?: string;    // manual entry
  propertyManager?: string;   // manual entry
}

export interface ClosedLeaseInfo {
  id: number;
  tenant: string;
  property: string;
  address?: string;
  sqft?: number;
  leaseEnd?: string;
  status?: string;
  clientLead?: string;  // PM contact
}

/** Default tasks pre-populated for any new closed location. */
const DEFAULT_TASKS: Omit<DecomTask, 'id'>[] = [
  { task: 'Provide written termination notice to landlord', owner: '', dueDate: '', done: false },
  { task: 'Schedule final move-out inspection',              owner: '', dueDate: '', done: false },
  { task: 'Coordinate FF&E removal',                          owner: '', dueDate: '', done: false },
  { task: 'Disconnect utilities & services',                  owner: '', dueDate: '', done: false },
  { task: 'Final cleaning & broom-swept condition',           owner: '', dueDate: '', done: false },
  { task: 'Return keys, access cards & parking passes',       owner: '', dueDate: '', done: false },
  { task: 'Final landlord walk-through',                      owner: '', dueDate: '', done: false },
  { task: 'Submit security deposit refund request',           owner: '', dueDate: '', done: false },
];

export const newDecomData = (): DecomData => ({
  checklist: DEFAULT_TASKS.map((t, i) => ({ ...t, id: `t-${Date.now()}-${i}` })),
  surrender: '',
  services: [],
  leaseExpiration: '',
  landlordBroker: '',
  propertyManager: '',
});

/* ───────────────────── Helpers ───────────────────── */

type Status = 'On Track' | 'At Risk' | 'Pending';

function statusOf(task: DecomTask): Status {
  if (task.done) return 'On Track';
  if (!task.dueDate) return 'Pending';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
  const diff = (due.getTime() - today.getTime()) / 86_400_000;
  return diff <= 7 ? 'At Risk' : 'Pending';
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

function fmtSqft(n?: number): string {
  if (!n) return '— SF';
  return `${n.toLocaleString()} SF`;
}

function progressSummary(data: DecomData) {
  const total = data.checklist.length;
  const done = data.checklist.filter(t => t.done).length;
  const atRisk = data.checklist.filter(t => !t.done && statusOf(t) === 'At Risk').length;
  return { total, done, atRisk };
}

/* ───────────────────── Single-lease panel ───────────────────── */

function LeasePanel({
  lease, data, onChange, readOnly, onViewProfile,
}: {
  lease: ClosedLeaseInfo;
  data: DecomData;
  onChange: (next: DecomData) => void;
  readOnly?: boolean;
  onViewProfile?: (leaseId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newService, setNewService] = useState('');
  const [surrenderDraft, setSurrenderDraft] = useState(data.surrender);
  const [surrenderDirty, setSurrenderDirty] = useState(false);

  // sync surrender draft if external data changes (e.g., other session)
  useEffect(() => { setSurrenderDraft(data.surrender); setSurrenderDirty(false); }, [data.surrender]);

  const { total, done, atRisk } = progressSummary(data);

  /* tasks */
  const updateTask = (id: string, patch: Partial<DecomTask>) =>
    onChange({ ...data, checklist: data.checklist.map(t => t.id === id ? { ...t, ...patch } : t) });
  const removeTask = (id: string) =>
    onChange({ ...data, checklist: data.checklist.filter(t => t.id !== id) });
  const addTask = () =>
    onChange({
      ...data,
      checklist: [...data.checklist, { id: `t-${Date.now()}`, task: '', owner: '', dueDate: '', done: false }],
    });
  const moveTask = (id: string, direction: 'up' | 'down') => {
    const idx = data.checklist.findIndex(t => t.id === id);
    if (idx < 0) return;
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= data.checklist.length) return;
    const next = data.checklist.slice();
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    onChange({ ...data, checklist: next });
  };

  /* services */
  const addService = () => {
    const v = newService.trim();
    if (!v) return;
    onChange({ ...data, services: [...data.services, v] });
    setNewService('');
  };
  const removeService = (idx: number) =>
    onChange({ ...data, services: data.services.filter((_, i) => i !== idx) });

  /* surrender */
  const saveSurrender = () => {
    onChange({ ...data, surrender: surrenderDraft });
    setSurrenderDirty(false);
  };

  return (
    <Card className="border-red-200 dark:border-red-900/40 overflow-hidden">
      {/* ── Collapsible Header — the "building location" summary ─────── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-4 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors flex items-start gap-3"
        data-testid={`decom-card-toggle-${lease.id}`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            {onViewProfile ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onViewProfile(lease.id); }}
                className="text-sm font-bold text-foreground hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors"
                title="Open building profile"
                data-testid={`decom-card-title-${lease.id}`}
              >
                {lease.tenant} — {lease.property}
              </button>
            ) : (
              <>
                <span className="text-sm font-bold text-foreground">{lease.tenant}</span>
                <span className="text-xs text-muted-foreground">— {lease.property}</span>
              </>
            )}
            <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 text-[10px] ml-auto">
              {lease.status || 'Decommission'}
            </Badge>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
            {lease.address && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />{lease.address}
              </span>
            )}
            {lease.leaseEnd && <span>LCD: {fmtDate(lease.leaseEnd)}</span>}
            <span>{fmtSqft(lease.sqft)}</span>
            {lease.clientLead && <span>PM: {lease.clientLead}</span>}
          </div>

          {/* Progress chips */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] bg-muted px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              {done} / {total} complete
            </span>
            {atRisk > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">
                <AlertCircle className="w-3 h-3" />
                {atRisk} At Risk
              </span>
            )}
            {data.services.length > 0 && (
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                {data.services.length} services to terminate
              </span>
            )}
            {data.surrender.trim() && (
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">Surrender note set</span>
            )}
          </div>
        </div>
      </button>

      {/* ── Expanded body ─────── */}
      {open && (
        <CardContent className="space-y-6 border-t pt-4">
          {/* Key Contacts & Dates */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                  Lease Expiration Date
                </label>
                <Input
                  type="date"
                  value={data.leaseExpiration || ''}
                  onChange={e => onChange({ ...data, leaseExpiration: e.target.value })}
                  disabled={readOnly}
                  className="h-8 text-xs"
                  data-testid={`decom-leaseexp-${lease.id}`}
                />
                {data.leaseExpiration && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(data.leaseExpiration)}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                  Landlord Broker
                </label>
                <Input
                  value={data.landlordBroker || ''}
                  onChange={e => onChange({ ...data, landlordBroker: e.target.value })}
                  placeholder="Name / firm…"
                  disabled={readOnly}
                  className="h-8 text-xs"
                  data-testid={`decom-broker-${lease.id}`}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                  Property Manager
                </label>
                <Input
                  value={data.propertyManager || ''}
                  onChange={e => onChange({ ...data, propertyManager: e.target.value })}
                  placeholder="Name / firm…"
                  disabled={readOnly}
                  className="h-8 text-xs"
                  data-testid={`decom-pm-${lease.id}`}
                />
              </div>
            </div>
          </section>

          {/* Checklist */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Real Estate Decommission Check List
              </h4>
              {!readOnly && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addTask}
                  data-testid={`decom-add-task-${lease.id}`}>
                  <Plus className="w-3 h-3" /> Add Task
                </Button>
              )}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="w-8 px-2 py-2"></th>
                    <th className="px-2 py-2 font-semibold">Task</th>
                    <th className="px-2 py-2 font-semibold w-40">Owner</th>
                    <th className="px-2 py-2 font-semibold w-32">Due Date</th>
                    <th className="px-2 py-2 font-semibold w-24">Status</th>
                    {!readOnly && <th className="w-10 px-1 py-2"><span className="sr-only">Reorder</span></th>}
                    {!readOnly && <th className="w-8 px-2 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.checklist.length === 0 && (
                    <tr><td colSpan={readOnly ? 5 : 7} className="px-2 py-4 text-center text-muted-foreground italic">
                      No tasks yet. Click "Add Task" to begin.
                    </td></tr>
                  )}
                  {data.checklist.map((task, taskIdx) => {
                    const status = statusOf(task);
                    const ringClass =
                      status === 'On Track' ? 'border-green-500 bg-green-500 text-white' :
                      status === 'At Risk'  ? 'border-red-500 border-2 bg-white dark:bg-transparent' :
                                              'border-slate-400 bg-white dark:bg-transparent';
                    const statusClass =
                      status === 'On Track' ? 'text-green-600 dark:text-green-400 font-semibold' :
                      status === 'At Risk'  ? 'text-red-600 dark:text-red-400 font-semibold' :
                                              'text-slate-900 dark:text-slate-100';
                    return (
                      <tr key={task.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-2 py-2 align-middle">
                          <button
                            onClick={() => !readOnly && updateTask(task.id, { done: !task.done })}
                            disabled={readOnly}
                            className={cn(
                              'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                              ringClass,
                              !readOnly && 'cursor-pointer hover:opacity-80',
                              readOnly && 'cursor-not-allowed opacity-70',
                            )}
                            title={status}
                            data-testid={`decom-task-toggle-${task.id}`}
                            aria-label={`Mark task ${task.done ? 'incomplete' : 'complete'}`}
                          >
                            {task.done && <CheckCircle2 className="w-4 h-4 -m-0.5" strokeWidth={3} />}
                            {!task.done && status === 'At Risk' && <AlertCircle className="w-3 h-3 text-red-500" strokeWidth={2.5} />}
                          </button>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={task.task}
                            onChange={e => updateTask(task.id, { task: e.target.value })}
                            placeholder="Task description…"
                            disabled={readOnly}
                            className="h-7 text-xs border-transparent hover:border-input focus:border-input"
                            data-testid={`decom-task-input-${task.id}`}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={task.owner}
                            onChange={e => updateTask(task.id, { owner: e.target.value })}
                            placeholder="Owner…"
                            disabled={readOnly}
                            className="h-7 text-xs border-transparent hover:border-input focus:border-input"
                            data-testid={`decom-task-owner-${task.id}`}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="date"
                            value={task.dueDate}
                            onChange={e => updateTask(task.id, { dueDate: e.target.value })}
                            disabled={readOnly}
                            className="h-7 text-xs"
                            data-testid={`decom-task-date-${task.id}`}
                          />
                          {task.dueDate && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(task.dueDate)}</p>
                          )}
                        </td>
                        <td className={cn('px-2 py-1.5 text-xs', statusClass)} data-testid={`decom-task-status-${task.id}`}>
                          {status}
                        </td>
                        {!readOnly && (
                          <td className="px-1 py-1.5 align-middle">
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => moveTask(task.id, 'up')}
                                disabled={taskIdx === 0}
                                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move task up"
                                aria-label="Move task up"
                                data-testid={`decom-task-move-up-${task.id}`}
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => moveTask(task.id, 'down')}
                                disabled={taskIdx === data.checklist.length - 1}
                                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move task down"
                                aria-label="Move task down"
                                data-testid={`decom-task-move-down-${task.id}`}
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                        {!readOnly && (
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => removeTask(task.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove task"
                              data-testid={`decom-task-remove-${task.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-slate-400" /> Pending
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-red-500" /> At Risk (≤ 7 days)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500" /> On Track (complete)
              </span>
            </div>
          </section>

          {/* Surrender */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Surrender of Premises Requirements
              </h4>
              {!readOnly && surrenderDirty && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={saveSurrender}
                  data-testid={`decom-save-surrender-${lease.id}`}>
                  <Save className="w-3 h-3" /> Save
                </Button>
              )}
            </div>
            <Textarea
              value={surrenderDraft}
              onChange={e => { setSurrenderDraft(e.target.value); setSurrenderDirty(e.target.value !== data.surrender); }}
              onBlur={() => { if (surrenderDirty) saveSurrender(); }}
              placeholder="Enter surrender requirements: condition standards, restoration scope, removal of improvements, signage removal, holdover terms, etc."
              disabled={readOnly}
              rows={5}
              className="text-xs leading-relaxed"
              data-testid={`decom-surrender-${lease.id}`}
            />
          </section>

          {/* Services */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Services to Terminate
            </h4>
            {data.services.length === 0 && (
              <p className="text-xs italic text-muted-foreground mb-2">No services listed yet.</p>
            )}
            <ul className="space-y-1 mb-2">
              {data.services.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-xs group">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="flex-1">{s}</span>
                  {!readOnly && (
                    <button
                      onClick={() => removeService(i)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      title="Remove service"
                      data-testid={`decom-service-remove-${lease.id}-${i}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  value={newService}
                  onChange={e => setNewService(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addService(); } }}
                  placeholder="Add service (e.g., Electricity, Internet, Janitorial)…"
                  className="h-7 text-xs"
                  data-testid={`decom-service-input-${lease.id}`}
                />
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addService}
                  data-testid={`decom-add-service-${lease.id}`}>
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            )}
          </section>
        </CardContent>
      )}
    </Card>
  );
}

/* ───────────────────── Print Modal ───────────────────── */

function PrintChecklistsModal({
  leases, decomData, portfolioName, dashboardLogo, onClose,
}: {
  leases: ClosedLeaseInfo[];
  decomData: Record<number, DecomData>;
  portfolioName: string;
  dashboardLogo?: string;
  onClose: () => void;
}) {
  const reportDate = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Inject print CSS once
  useEffect(() => {
    const id = 'decom-print-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #decom-print-root, #decom-print-root * { visibility: visible; }
        #decom-print-root {
          position: absolute; top: 0; left: 0; right: 0;
          background: white !important; color: black !important;
        }
        .decom-print-controls { display: none !important; }
        .decom-print-page { page-break-after: always; }
        .decom-print-page:last-child { page-break-after: auto; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const triggerPrint = () => window.print();

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white text-black w-full max-w-4xl rounded-lg shadow-2xl my-8">
        {/* Toolbar — hidden on print */}
        <div className="decom-print-controls sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between rounded-t-lg z-10">
          <div className="text-sm font-semibold">Print Decommission Checklists</div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={triggerPrint} className="gap-1.5 text-xs h-8 bg-red-600 hover:bg-red-700 text-white">
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} className="gap-1.5 text-xs h-8">
              <X className="w-3.5 h-3.5" /> Close
            </Button>
          </div>
        </div>

        <div id="decom-print-root" className="p-8 font-sans text-[12px]">
          {/* Report header */}
          <div className="decom-print-page">
            <div className="border-b-2 border-red-600 pb-3 mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                {dashboardLogo
                  ? <img src={dashboardLogo} alt={portfolioName} style={{ height: 32, maxWidth: 160, objectFit: 'contain' }} />
                  : <div className="w-8 h-8 rounded bg-red-600" />}
                <div>
                  <div className="text-[16px] font-bold">{portfolioName}</div>
                  <div className="text-[18px] font-bold mt-1">Decommission Checklists</div>
                  <div className="text-[10px] text-gray-500">Prepared {reportDate} · {leases.length} {leases.length === 1 ? 'location' : 'locations'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* One page per lease */}
          {leases.map((lease, idx) => {
            const data = decomData[lease.id] ?? newDecomData();
            const { total, done, atRisk } = progressSummary(data);
            return (
              <div key={lease.id} className="decom-print-page" style={{ marginBottom: 32 }}>
                {idx > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    {dashboardLogo
                      ? <img src={dashboardLogo} alt="" style={{ height: 20, maxWidth: 100, objectFit: 'contain' }} />
                      : null}
                    <div className="text-[10px] text-gray-500">{portfolioName} · Decommission Checklists · {reportDate}</div>
                  </div>
                )}

                {/* Location header */}
                <div className="border-l-4 border-red-600 pl-3 mb-4">
                  <div className="text-[15px] font-bold">{lease.tenant} — {lease.property}</div>
                  <div className="text-[11px] text-gray-600">
                    {[lease.address, fmtSqft(lease.sqft)].filter(Boolean).join(' · ')}
                  </div>
                  <div className="text-[11px] mt-1">
                    <span className="font-semibold text-green-700">{done} / {total} complete</span>
                    {atRisk > 0 && <span className="font-semibold text-red-700 ml-3">{atRisk} At Risk</span>}
                  </div>
                </div>

                {/* Key Contacts & Dates */}
                <div className="mb-4 grid grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-gray-600 text-[9px]">Lease Expiration</div>
                    <div>{data.leaseExpiration ? fmtDate(data.leaseExpiration) : (lease.leaseEnd ? fmtDate(lease.leaseEnd) : <span className="italic text-gray-400">—</span>)}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-gray-600 text-[9px]">Landlord Broker</div>
                    <div>{data.landlordBroker || <span className="italic text-gray-400">—</span>}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-gray-600 text-[9px]">Property Manager</div>
                    <div>{data.propertyManager || lease.clientLead || <span className="italic text-gray-400">—</span>}</div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="mb-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-600 mb-1">
                    Real Estate Decommission Check List
                  </div>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300 text-left">
                        <th className="w-6 py-1.5"></th>
                        <th className="py-1.5 font-bold">Task</th>
                        <th className="py-1.5 font-bold w-32">Owner</th>
                        <th className="py-1.5 font-bold w-24">Due Date</th>
                        <th className="py-1.5 font-bold w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.checklist.length === 0 && (
                        <tr><td colSpan={5} className="py-2 italic text-gray-500">No tasks.</td></tr>
                      )}
                      {data.checklist.map(t => {
                        const s = statusOf(t);
                        const sColor = s === 'On Track' ? '#16a34a' : s === 'At Risk' ? '#dc2626' : '#0f172a';
                        return (
                          <tr key={t.id} className="border-b border-gray-100">
                            <td className="py-1.5 align-top">
                              <span style={{
                                display: 'inline-block',
                                width: 12, height: 12, borderRadius: '50%',
                                border: s === 'At Risk' ? '2px solid #dc2626' : '1px solid #94a3b8',
                                background: t.done ? '#16a34a' : 'white',
                                position: 'relative', top: 1,
                              }}>
                                {t.done && (
                                  <span style={{ color: 'white', fontSize: 9, position: 'absolute', top: -1, left: 2, fontWeight: 900 }}>✓</span>
                                )}
                              </span>
                            </td>
                            <td className="py-1.5">{t.task || <span className="italic text-gray-400">—</span>}</td>
                            <td className="py-1.5">{t.owner || <span className="italic text-gray-400">—</span>}</td>
                            <td className="py-1.5">{t.dueDate ? fmtDate(t.dueDate) : <span className="italic text-gray-400">—</span>}</td>
                            <td className="py-1.5 font-semibold" style={{ color: sColor }}>{s}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Surrender */}
                <div className="mb-5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-600 mb-1">
                    Surrender of Premises Requirements
                  </div>
                  <div className="text-[11px] whitespace-pre-wrap border border-gray-200 rounded p-2 min-h-[60px] bg-gray-50">
                    {data.surrender || <span className="italic text-gray-400">No requirements documented.</span>}
                  </div>
                </div>

                {/* Services */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-600 mb-1">
                    Services to Terminate
                  </div>
                  {data.services.length === 0 ? (
                    <div className="text-[11px] italic text-gray-400">No services listed.</div>
                  ) : (
                    <ul className="text-[11px] space-y-0.5">
                      {data.services.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span style={{ marginTop: 6, width: 4, height: 4, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="text-[9px] text-gray-400 pt-3 border-t text-center">
            {portfolioName} — Confidential · {reportDate}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────────────── Module export ───────────────────── */

export function DecommissionChecklistModule({
  closedLeases, decomData, onSetDecomData, readOnly,
  portfolioName, dashboardLogo, onViewProfile,
}: {
  closedLeases: ClosedLeaseInfo[];
  decomData: Record<number, DecomData>;
  onSetDecomData: (leaseId: number, next: DecomData) => void;
  readOnly?: boolean;
  portfolioName: string;
  dashboardLogo?: string;
  onViewProfile?: (leaseId: number) => void;
}) {
  const [printOpen, setPrintOpen] = useState(false);
  const [expandAll, setExpandAll] = useState<null | 'open' | 'closed'>(null);

  useEffect(() => {
    closedLeases.forEach(l => {
      if (!decomData[l.id]) onSetDecomData(l.id, newDecomData());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedLeases.map(l => l.id).join(',')]);

  if (closedLeases.length === 0) return null;

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center gap-2 pb-2 border-b flex-wrap">
        <div className="w-1 h-5 bg-red-500 rounded-sm" />
        <h3 className="text-sm font-bold">Decommission Checklists by Location</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
          {closedLeases.length} {closedLeases.length === 1 ? 'location' : 'locations'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPrintOpen(true)}
            data-testid="decom-print-all">
            <Printer className="w-3 h-3" /> Print All / Save PDF
          </Button>
        </div>
      </div>

      {closedLeases.map(l => (
        <LeasePanel
          key={l.id}
          lease={l}
          data={decomData[l.id] ?? newDecomData()}
          onChange={next => onSetDecomData(l.id, next)}
          readOnly={readOnly}
          onViewProfile={onViewProfile}
        />
      ))}

      {printOpen && (
        <PrintChecklistsModal
          leases={closedLeases}
          decomData={decomData}
          portfolioName={portfolioName}
          dashboardLogo={dashboardLogo}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
