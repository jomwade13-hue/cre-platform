import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, Save } from 'lucide-react';
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
  dueDate: string;   // ISO YYYY-MM-DD
  done: boolean;
}

export interface DecomData {
  checklist: DecomTask[];
  surrender: string;     // free-form note
  services: string[];    // bullet list
}

/** Default tasks pre-populated for any new closed location. */
const DEFAULT_TASKS: Omit<DecomTask, 'id'>[] = [
  { task: 'Provide written termination notice to landlord', owner: '',           dueDate: '', done: false },
  { task: 'Schedule final move-out inspection',              owner: '',           dueDate: '', done: false },
  { task: 'Coordinate FF&E removal',                          owner: '',           dueDate: '', done: false },
  { task: 'Disconnect utilities & services',                  owner: '',           dueDate: '', done: false },
  { task: 'Final cleaning & broom-swept condition',           owner: '',           dueDate: '', done: false },
  { task: 'Return keys, access cards & parking passes',       owner: '',           dueDate: '', done: false },
  { task: 'Final landlord walk-through',                      owner: '',           dueDate: '', done: false },
  { task: 'Submit security deposit refund request',           owner: '',           dueDate: '', done: false },
];

export const newDecomData = (): DecomData => ({
  checklist: DEFAULT_TASKS.map((t, i) => ({ ...t, id: `t-${Date.now()}-${i}` })),
  surrender: '',
  services: [],
});

/* ───────────────────── Status helpers ───────────────────── */

/** "On Track" (done), "At Risk" (within 7 days incl. overdue), "Pending" otherwise. */
function statusOf(task: DecomTask): 'On Track' | 'At Risk' | 'Pending' {
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

/* ───────────────────── Single-lease panel ───────────────────── */

function LeasePanel({
  leaseId, tenant, property, data, onChange, readOnly,
}: {
  leaseId: number;
  tenant: string;
  property: string;
  data: DecomData;
  onChange: (next: DecomData) => void;
  readOnly?: boolean;
}) {
  const [newService, setNewService] = useState('');
  const [surrenderDraft, setSurrenderDraft] = useState(data.surrender);
  const [surrenderDirty, setSurrenderDirty] = useState(false);

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
    <Card className="border-red-200 dark:border-red-900/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm font-bold">{tenant}</CardTitle>
            <p className="text-xs text-muted-foreground">{property}</p>
          </div>
          <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-300 text-[10px]">
            Decommission
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Checklist ─────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Real Estate Decommission Check List
            </h4>
            {!readOnly && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addTask}
                data-testid={`decom-add-task-${leaseId}`}>
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
                  {!readOnly && <th className="w-8 px-2 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {data.checklist.length === 0 && (
                  <tr><td colSpan={readOnly ? 5 : 6} className="px-2 py-4 text-center text-muted-foreground italic">
                    No tasks yet. Click "Add Task" to begin.
                  </td></tr>
                )}
                {data.checklist.map(task => {
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

          {/* legend */}
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

        {/* ── Surrender of Premises ─────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Surrender of Premises Requirements
            </h4>
            {!readOnly && surrenderDirty && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={saveSurrender}
                data-testid={`decom-save-surrender-${leaseId}`}>
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
            data-testid={`decom-surrender-${leaseId}`}
          />
          {!readOnly && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {surrenderDirty ? 'Unsaved changes — click outside or press Save.' : 'Saved automatically when you click outside the field.'}
            </p>
          )}
        </section>

        {/* ── Services to Terminate ─────────────── */}
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
                    data-testid={`decom-service-remove-${leaseId}-${i}`}
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
                data-testid={`decom-service-input-${leaseId}`}
              />
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addService}
                data-testid={`decom-add-service-${leaseId}`}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

/* ───────────────────── Module export ───────────────────── */

interface ClosedLease {
  id: number;
  tenant: string;
  property: string;
}

export function DecommissionChecklistModule({
  closedLeases, decomData, onSetDecomData, readOnly,
}: {
  closedLeases: ClosedLease[];
  decomData: Record<number, DecomData>;
  onSetDecomData: (leaseId: number, next: DecomData) => void;
  readOnly?: boolean;
}) {
  // Initialize default checklist data the first time a closed lease appears, so task IDs stay stable across renders.
  useEffect(() => {
    closedLeases.forEach(l => {
      if (!decomData[l.id]) onSetDecomData(l.id, newDecomData());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedLeases.map(l => l.id).join(',')]);

  if (closedLeases.length === 0) return null;
  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-2 pb-2 border-b">
        <div className="w-1 h-5 bg-red-500 rounded-sm" />
        <h3 className="text-sm font-bold">Decommission Detail</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
          {closedLeases.length} {closedLeases.length === 1 ? 'location' : 'locations'}
        </span>
      </div>
      {closedLeases.map(l => (
        <LeasePanel
          key={l.id}
          leaseId={l.id}
          tenant={l.tenant}
          property={l.property}
          data={decomData[l.id] ?? newDecomData()}
          onChange={next => onSetDecomData(l.id, next)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
