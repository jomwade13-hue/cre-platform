/**
 * Legacy image compression migration
 * --------------------------------------------------------------------
 * Photos and logos uploaded BEFORE the upload-time compression fix
 * (commit 3ffcc2c) are still stored at full resolution (2–10 MB each)
 * in IndexedDB. Because each write to `cre_client_logos` or
 * `cre_lease_photos` rewrites the entire record in a single transaction,
 * a few legacy multi-MB photos can push individual writes over the
 * per-transaction limit even when the user's overall quota usage is
 * still tiny (e.g. 1%).
 *
 * This module recompresses those legacy images in place. It runs once
 * on boot (gated by a localStorage flag) and can also be triggered
 * manually from the recovery dialog.
 */

import { compressDataUrl, dataUrlByteSize } from './imageUtils';
import { idbGet, idbSet } from './useIDBPersistedState';

const LOGOS_KEY = 'cre_client_logos';
const PHOTOS_KEY = 'cre_lease_photos';
const MIGRATION_FLAG = 'cre_legacy_image_compression_v1';

// Anything larger than these triggers a recompress. Matches the upload-time
// caps in PortfolioTracker.tsx / ClientPortal.tsx.
const LOGO_TARGET_BYTES = 40 * 1024;          // 40 KB
const PHOTO_TARGET_BYTES = 300 * 1024;        // 300 KB

const LOGO_OPTS = {
  maxDimension: 320,
  quality: 0.85,
  targetMaxBytes: LOGO_TARGET_BYTES,
  minDimension: 160,
  minQuality: 0.6,
};
const PHOTO_OPTS = {
  maxDimension: 1280,
  quality: 0.8,
  targetMaxBytes: PHOTO_TARGET_BYTES,
  minDimension: 640,
  minQuality: 0.4,
};

export interface LegacyCompressionResult {
  logosCompressed: number;
  photosCompressed: number;
  bytesFreed: number;
  errors: number;
}

interface LeasePhotoLike {
  url?: string;
  [k: string]: unknown;
}

async function compressLogos(): Promise<{ compressed: number; bytesFreed: number; errors: number }> {
  let compressed = 0;
  let bytesFreed = 0;
  let errors = 0;
  try {
    const logos = (await idbGet<Record<string, string>>(LOGOS_KEY)) || {};
    const keys = Object.keys(logos);
    if (keys.length === 0) return { compressed, bytesFreed, errors };

    const next: Record<string, string> = { ...logos };
    let changed = false;
    for (const k of keys) {
      const v = logos[k];
      if (!v || typeof v !== 'string' || !v.startsWith('data:image/')) continue;
      const beforeBytes = dataUrlByteSize(v);
      if (beforeBytes <= LOGO_TARGET_BYTES) continue;
      try {
        const recomp = await compressDataUrl(v, LOGO_OPTS);
        const afterBytes = dataUrlByteSize(recomp);
        if (afterBytes < beforeBytes) {
          next[k] = recomp;
          bytesFreed += beforeBytes - afterBytes;
          compressed += 1;
          changed = true;
        }
      } catch {
        errors += 1;
      }
    }
    if (changed) {
      await idbSet(LOGOS_KEY, next);
    }
  } catch {
    errors += 1;
  }
  return { compressed, bytesFreed, errors };
}

async function compressPhotos(): Promise<{ compressed: number; bytesFreed: number; errors: number }> {
  let compressed = 0;
  let bytesFreed = 0;
  let errors = 0;
  try {
    const photos = (await idbGet<Record<string, LeasePhotoLike[]>>(PHOTOS_KEY)) || {};
    const leaseIds = Object.keys(photos);
    if (leaseIds.length === 0) return { compressed, bytesFreed, errors };

    const next: Record<string, LeasePhotoLike[]> = {};
    let changed = false;

    for (const leaseId of leaseIds) {
      const list = Array.isArray(photos[leaseId]) ? photos[leaseId] : [];
      const newList: LeasePhotoLike[] = [];
      for (const photo of list) {
        if (!photo || typeof photo.url !== 'string' || !photo.url.startsWith('data:image/')) {
          newList.push(photo);
          continue;
        }
        const beforeBytes = dataUrlByteSize(photo.url);
        if (beforeBytes <= PHOTO_TARGET_BYTES) {
          newList.push(photo);
          continue;
        }
        try {
          const recomp = await compressDataUrl(photo.url, PHOTO_OPTS);
          const afterBytes = dataUrlByteSize(recomp);
          if (afterBytes < beforeBytes) {
            newList.push({ ...photo, url: recomp });
            bytesFreed += beforeBytes - afterBytes;
            compressed += 1;
            changed = true;
          } else {
            newList.push(photo);
          }
        } catch {
          newList.push(photo);
          errors += 1;
        }
      }
      next[leaseId] = newList;
    }

    if (changed) {
      await idbSet(PHOTOS_KEY, next);
    }
  } catch {
    errors += 1;
  }
  return { compressed, bytesFreed, errors };
}

/**
 * Recompress every oversized entry in `cre_client_logos` and
 * `cre_lease_photos`. Safe to call multiple times — only entries above
 * the target byte size are re-encoded.
 */
export async function compressAllStoredImages(): Promise<LegacyCompressionResult> {
  const [logoR, photoR] = await Promise.all([compressLogos(), compressPhotos()]);
  return {
    logosCompressed: logoR.compressed,
    photosCompressed: photoR.compressed,
    bytesFreed: logoR.bytesFreed + photoR.bytesFreed,
    errors: logoR.errors + photoR.errors,
  };
}

/**
 * Run `compressAllStoredImages()` exactly once per browser using a
 * localStorage flag. Subsequent boots skip the work. Safe in browsers
 * without localStorage (no-op).
 */
export async function runLegacyImageCompressionOnce(): Promise<LegacyCompressionResult | null> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    if (window.localStorage.getItem(MIGRATION_FLAG)) return null;
    const result = await compressAllStoredImages();
    window.localStorage.setItem(MIGRATION_FLAG, String(Date.now()));
    return result;
  } catch {
    return null;
  }
}

/**
 * Force the migration to run again (used by the recovery dialog when
 * the user explicitly asks to compress stored images).
 */
export async function forceCompressAllStoredImages(): Promise<LegacyCompressionResult> {
  const result = await compressAllStoredImages();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MIGRATION_FLAG, String(Date.now()));
    }
  } catch { /* noop */ }
  return result;
}
