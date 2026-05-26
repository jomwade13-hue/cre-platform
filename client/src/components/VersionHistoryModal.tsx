import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  createSnapshot,
  deleteSnapshot,
  exportSnapshotJSON,
  formatBytes,
  formatSnapshotTime,
  importSnapshotJSON,
  listSnapshots,
  MAX_SNAPSHOTS,
  restoreSnapshot,
  type SnapshotSummary,
} from '@/lib/snapshots';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistoryModal({ open, onOpenChange }: Props) {
  const [items, setItems] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listSnapshots());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      refresh();
    }
  }, [open, refresh]);

  const onCreate = async () => {
    setBusyId('create');
    setError(null);
    try {
      const label = window.prompt(
        'Label for this snapshot (e.g., "Before Learfield Q2 cleanup"):',
        `Manual ${new Date().toLocaleString()}`
      );
      if (label === null) {
        setBusyId(null);
        return;
      }
      await createSnapshot({ label: label.trim() || 'Manual snapshot', autoSaved: false });
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to create snapshot');
    } finally {
      setBusyId(null);
    }
  };

  const onRestore = async (id: string) => {
    const ok = window.confirm(
      'Restore the dashboard to this version?\n\n' +
        'Your current state will be saved as a "Before restore" snapshot first, ' +
        'so you can roll back if needed. The page will reload after restore.'
    );
    if (!ok) return;
    setBusyId(id);
    setError(null);
    try {
      await restoreSnapshot(id);
      // restoreSnapshot reloads the page; we won't reach the line below.
    } catch (e: any) {
      setError(e?.message || 'Failed to restore snapshot');
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this snapshot? This cannot be undone.')) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteSnapshot(id);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete snapshot');
    } finally {
      setBusyId(null);
    }
  };

  const onDownload = async (s: SnapshotSummary) => {
    setBusyId(s.id);
    setError(null);
    try {
      const json = await exportSnapshotJSON(s.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date(s.createdAt)
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      a.download = `cre-snapshot-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Failed to download snapshot');
    } finally {
      setBusyId(null);
    }
  };

  const onImportClick = () => {
    fileInputRef.current?.click();
  };

  const onImportFile = async (file: File) => {
    setBusyId('import');
    setError(null);
    try {
      const text = await file.text();
      await importSnapshotJSON(text);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to import snapshot');
    } finally {
      setBusyId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-gray-600 mb-3">
          Restore the dashboard to any previous saved version. Snapshots capture all
          properties, notes, photos, floor plans, PDFs, milestones, and custom fields.
          Auto-snapshots run every 10 minutes when data changes. The most recent {MAX_SNAPSHOTS} are kept.
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            onClick={onCreate}
            disabled={busyId === 'create'}
            data-testid="button-create-snapshot"
          >
            {busyId === 'create' ? 'Saving…' : 'Create snapshot now'}
          </Button>
          <Button
            variant="outline"
            onClick={onImportClick}
            disabled={busyId === 'import'}
            data-testid="button-import-snapshot"
          >
            {busyId === 'import' ? 'Importing…' : 'Import from file'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
            }}
          />
          <div className="ml-auto text-xs text-gray-500 self-center">
            {items.length} / {MAX_SNAPSHOTS} stored
          </div>
        </div>

        {error && (
          <div
            className="mb-3 px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm"
            data-testid="version-history-error"
          >
            {error}
          </div>
        )}

        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              No snapshots yet. The first auto-snapshot will be taken shortly,
              or click "Create snapshot now."
            </div>
          ) : (
            <ul className="divide-y border rounded">
              {items.map(s => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2"
                  data-testid={`snapshot-${s.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {s.label}
                      {s.autoSaved && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-600">
                          AUTO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatSnapshotTime(s.createdAt)} · {formatBytes(s.sizeBytes)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onRestore(s.id)}
                    disabled={busyId === s.id}
                    data-testid={`button-restore-${s.id}`}
                  >
                    {busyId === s.id ? 'Working…' : 'Restore'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(s)}
                    disabled={busyId === s.id}
                    data-testid={`button-download-${s.id}`}
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(s.id)}
                    disabled={busyId === s.id}
                    data-testid={`button-delete-snapshot-${s.id}`}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VersionHistoryModal;
