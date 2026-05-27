/**
 * StorageRecoveryDialog
 * --------------------------------------------------------------------
 * Global listener for IndexedDB write failures. When a write fails
 * (almost always: browser storage quota exceeded), this dialog opens
 * with a clear explanation and one-click recovery action — purging all
 * auto-saved snapshots, which historically were the biggest space hog.
 *
 * Manual snapshots are preserved. Photos, documents, and logos are
 * untouched — those live in the kv store, not in snapshots.
 */

import { useEffect, useState } from 'react';
import { onIdbWriteFailure } from '@/lib/useIDBPersistedState';
import { clearAutoSnapshots, formatBytes } from '@/lib/snapshots';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export function StorageRecoveryDialog() {
  const [open, setOpen] = useState(false);
  const [failedKey, setFailedKey] = useState<string>('');
  const [estimate, setEstimate] = useState<{ usage?: number; quota?: number } | undefined>(undefined);
  const [working, setWorking] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onIdbWriteFailure((detail) => {
      setFailedKey(detail.key);
      setEstimate(detail.estimate);
      setResultMsg(null);
      setOpen(true);
    });
    return unsub;
  }, []);

  const friendlyKey = (k: string): string => {
    if (k === 'cre_lease_photos') return 'building photos';
    if (k === 'cre_client_logos') return 'client logos';
    if (k === 'cre_lease_documents') return 'lease documents';
    return k;
  };

  const handleCleanup = async () => {
    setWorking(true);
    try {
      const { removed, bytesFreed } = await clearAutoSnapshots();
      setResultMsg(
        removed > 0
          ? `Removed ${removed} auto-saved snapshot${removed === 1 ? '' : 's'} and freed ${formatBytes(bytesFreed)}. You can now retry your upload.`
          : 'No auto-saved snapshots found. Try removing older photos or documents.'
      );
    } catch (err) {
      setResultMsg('Cleanup failed. Please try refreshing the page.');
    } finally {
      setWorking(false);
    }
  };

  const usedPct = estimate?.usage && estimate.quota
    ? Math.min(100, Math.round((estimate.usage / estimate.quota) * 100))
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            Storage quota reached
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground space-y-2 pt-2">
            <span className="block">
              Your browser couldn't save the {friendlyKey(failedKey)} you just uploaded.
              This usually means stored snapshots are taking up too much space.
            </span>
            {estimate && (
              <span className="block text-xs">
                Storage used: <span className="font-medium text-foreground">{formatBytes(estimate.usage || 0)}</span>
                {estimate.quota ? <> of <span className="font-medium text-foreground">{formatBytes(estimate.quota)}</span> ({usedPct}%)</> : null}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">Clear auto-saved snapshots</p>
            <p className="text-muted-foreground">
              Removes all <span className="font-medium">auto-saved</span> version history.
              Your manual snapshots, photos, documents, and current data stay intact.
            </p>
          </div>

          {resultMsg && (
            <div className="rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              {resultMsg}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={working}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleCleanup}
            disabled={working}
            className="gap-1.5"
            data-testid="button-clear-auto-snapshots"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {working ? 'Cleaning…' : 'Clear auto-snapshots'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StorageRecoveryDialog;
