/**
 * StorageRecoveryDialog
 * --------------------------------------------------------------------
 * Global listener for IndexedDB write failures. Two distinct causes are
 * handled:
 *
 * 1. The browser is genuinely out of room (usage close to quota).
 *    → Offer to clear auto-snapshots.
 * 2. A single record is too large for one transaction even though
 *    overall usage is tiny (e.g. uncompressed legacy photos).
 *    → Offer to recompress all stored images in place.
 *
 * The dialog detects the cause from `navigator.storage.estimate()` and
 * `err.name`, then surfaces the appropriate primary action plus a
 * fallback option.
 */

import { useEffect, useMemo, useState } from 'react';
import { onIdbWriteFailure } from '@/lib/useIDBPersistedState';
import { clearAutoSnapshots, formatBytes } from '@/lib/snapshots';
import { forceCompressAllStoredImages } from '@/lib/legacyImageMigration';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ImageDown, Trash2 } from 'lucide-react';

type Cause = 'quota' | 'oversized-record' | 'unknown';

export function StorageRecoveryDialog() {
  const [open, setOpen] = useState(false);
  const [failedKey, setFailedKey] = useState<string>('');
  const [error, setError] = useState<unknown>(undefined);
  const [estimate, setEstimate] = useState<{ usage?: number; quota?: number } | undefined>(undefined);
  const [working, setWorking] = useState<'snapshots' | 'images' | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onIdbWriteFailure((detail) => {
      setFailedKey(detail.key);
      setError(detail.error);
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

  const usedPct = estimate?.usage && estimate.quota
    ? Math.min(100, Math.round((estimate.usage / estimate.quota) * 100))
    : null;

  // Detect what actually went wrong so the dialog tells the truth rather
  // than always blaming snapshots/quota.
  const cause: Cause = useMemo(() => {
    const errName = (error as { name?: string } | undefined)?.name;
    const isQuotaError = errName === 'QuotaExceededError' || errName === 'NS_ERROR_DOM_QUOTA_REACHED';
    // If overall quota usage is high, treat it as a real quota problem.
    if (usedPct !== null && usedPct >= 50) return 'quota';
    // If usage is low but the browser reported a quota error, the single
    // record is probably too large for one transaction.
    if (isQuotaError) return 'oversized-record';
    // If usage is low and there's no name, it's an oversized record by
    // process of elimination (snapshots are excluded from blob writes now).
    if (usedPct !== null && usedPct < 50) return 'oversized-record';
    return 'unknown';
  }, [error, usedPct]);

  const isImageKey = failedKey === 'cre_lease_photos' || failedKey === 'cre_client_logos';

  const handleClearSnapshots = async () => {
    setWorking('snapshots');
    try {
      const { removed, bytesFreed } = await clearAutoSnapshots();
      setResultMsg(
        removed > 0
          ? `Removed ${removed} auto-saved snapshot${removed === 1 ? '' : 's'} and freed ${formatBytes(bytesFreed)}. You can now retry your upload.`
          : 'No auto-saved snapshots found. Try compressing stored images, or remove older photos / documents.'
      );
    } catch {
      setResultMsg('Cleanup failed. Please try refreshing the page.');
    } finally {
      setWorking(null);
    }
  };

  const handleCompressImages = async () => {
    setWorking('images');
    try {
      const r = await forceCompressAllStoredImages();
      const total = r.logosCompressed + r.photosCompressed;
      setResultMsg(
        total > 0
          ? `Recompressed ${r.logosCompressed} logo${r.logosCompressed === 1 ? '' : 's'} and ${r.photosCompressed} photo${r.photosCompressed === 1 ? '' : 's'} and freed ${formatBytes(r.bytesFreed)}. You can now retry your upload.`
          : 'All stored images are already compressed. Try clearing auto-snapshots, or remove the largest photos manually.'
      );
    } catch {
      setResultMsg('Image compression failed. Please try refreshing the page.');
    } finally {
      setWorking(null);
    }
  };

  const headline = cause === 'quota'
    ? 'Storage quota reached'
    : "Couldn't save that upload";

  const explanation = cause === 'quota'
    ? `Your browser couldn't save the ${friendlyKey(failedKey)} you just uploaded — stored data is taking up too much space.`
    : isImageKey
      ? `Your browser couldn't save the ${friendlyKey(failedKey)} you just uploaded. Older photos or logos in storage are likely too large to fit alongside the new one — recompressing them usually fixes this.`
      : `A stored record (${friendlyKey(failedKey)}) was too large to write in a single transaction.`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            {headline}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground space-y-2 pt-2">
            <span className="block">{explanation}</span>
            {estimate && (
              <span className="block text-xs">
                Storage used: <span className="font-medium text-foreground">{formatBytes(estimate.usage || 0)}</span>
                {estimate.quota ? <> of <span className="font-medium text-foreground">{formatBytes(estimate.quota)}</span> ({usedPct}%)</> : null}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {(cause === 'oversized-record' || cause === 'unknown') && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1.5">
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <ImageDown className="w-3.5 h-3.5" />
                Compress stored images
              </p>
              <p className="text-muted-foreground">
                Re-encodes every saved photo and logo at the app's normal upload size.
                Your photos and logos stay — they just take up less room.
              </p>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              Clear auto-saved snapshots
            </p>
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
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={working !== null}>
            Close
          </Button>
          {(cause === 'oversized-record' || cause === 'unknown') ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSnapshots}
                disabled={working !== null}
                className="gap-1.5"
                data-testid="button-clear-auto-snapshots"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {working === 'snapshots' ? 'Cleaning…' : 'Clear snapshots'}
              </Button>
              <Button
                size="sm"
                onClick={handleCompressImages}
                disabled={working !== null}
                className="gap-1.5"
                data-testid="button-compress-stored-images"
              >
                <ImageDown className="w-3.5 h-3.5" />
                {working === 'images' ? 'Compressing…' : 'Compress images'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCompressImages}
                disabled={working !== null}
                className="gap-1.5"
                data-testid="button-compress-stored-images"
              >
                <ImageDown className="w-3.5 h-3.5" />
                {working === 'images' ? 'Compressing…' : 'Compress images'}
              </Button>
              <Button
                size="sm"
                onClick={handleClearSnapshots}
                disabled={working !== null}
                className="gap-1.5"
                data-testid="button-clear-auto-snapshots"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {working === 'snapshots' ? 'Cleaning…' : 'Clear auto-snapshots'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StorageRecoveryDialog;
