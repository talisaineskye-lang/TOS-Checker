/**
 * store-result.ts — Local JSON file storage for snapshots, changes, and scan logs.
 *
 * Replaces StackDrift's Supabase storage with flat JSON files.
 * All data stays local — no external database required.
 *
 * Storage layout:
 *   data/snapshots/{vendor-slug}-{doc-type}.json   — latest snapshot (hash + content + timestamp)
 *   data/changes/{YYYY-MM-DD}-{vendor-slug}-{doc-type}.json — detected change records
 *   data/review-queue.json  — changes held for manual review (90% removal gate)
 *   data/scan-log.json      — running log of all scan attempts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const CHANGES_DIR = path.join(DATA_DIR, 'changes');
const REVIEW_QUEUE_PATH = path.join(DATA_DIR, 'review-queue.json');
const SCAN_LOG_PATH = path.join(DATA_DIR, 'scan-log.json');

// Ensure directories exist
function ensureDirs() {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  fs.mkdirSync(CHANGES_DIR, { recursive: true });
}

// --- Snapshot storage ---

export interface Snapshot {
  hash: string;
  content: string;
  scannedAt: string;
}

/**
 * Get the stored snapshot for a vendor document.
 * Returns null if no snapshot exists (first scan).
 */
export function getSnapshot(vendorSlug: string, docType: string): Snapshot | null {
  ensureDirs();
  const filePath = path.join(SNAPSHOTS_DIR, `${vendorSlug}-${docType}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Snapshot;
  } catch {
    return null;
  }
}

/**
 * Save a new snapshot for a vendor document.
 */
export function saveSnapshot(vendorSlug: string, docType: string, hash: string, content: string): void {
  ensureDirs();
  const snapshot: Snapshot = {
    hash,
    content,
    scannedAt: new Date().toISOString(),
  };
  const filePath = path.join(SNAPSHOTS_DIR, `${vendorSlug}-${docType}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
}

// --- Change storage ---

export interface ChangeRecord {
  vendorSlug: string;
  vendorName: string;
  docType: string;
  summary: string;
  impact: string;
  action: string;
  riskLevel: string;
  riskBucket: string | null;
  categories: string[];
  isNoise: boolean;
  analysisFailed: boolean;
  detectedAt: string;
  pendingReview?: boolean;        // true when a signal was detected
  signal?: {                      // the detected signal, if any
    type: 'NEW_DOCUMENT' | 'DEPRECATED';
    documentName: string;
    details: string;
  };
  diffExcerpt?: {
    added: string[];
    removed: string[];
  };
}

/**
 * Save a detected change record.
 */
export function saveChange(record: ChangeRecord): string {
  ensureDirs();
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${date}-${record.vendorSlug}-${record.docType}.json`;
  const filePath = path.join(CHANGES_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  return filePath;
}

// --- Review queue ---

export interface ReviewItem {
  vendorSlug: string;
  vendorName: string;
  docType: string;
  removalRatio: number;
  detectedAt: string;
  snapshotFile: string;
}

/**
 * Add a change to the review queue (90% removal gate).
 */
export function addToReviewQueue(item: ReviewItem): void {
  ensureDirs();
  let queue: ReviewItem[] = [];
  if (fs.existsSync(REVIEW_QUEUE_PATH)) {
    try {
      queue = JSON.parse(fs.readFileSync(REVIEW_QUEUE_PATH, 'utf-8'));
    } catch { /* start fresh */ }
  }
  queue.push(item);
  fs.writeFileSync(REVIEW_QUEUE_PATH, JSON.stringify(queue, null, 2));
}

// --- Scan log ---

export interface ScanLogEntry {
  timestamp: string;
  vendorSlug: string;
  vendorName: string;
  docType: string;
  docUrl: string;
  status: string;
  details?: Record<string, unknown>;
}

/**
 * Append an entry to the scan log.
 */
export function logScan(entry: ScanLogEntry): void {
  ensureDirs();
  let log: ScanLogEntry[] = [];
  if (fs.existsSync(SCAN_LOG_PATH)) {
    try {
      log = JSON.parse(fs.readFileSync(SCAN_LOG_PATH, 'utf-8'));
    } catch { /* start fresh */ }
  }
  log.push(entry);

  // Keep last 1000 entries to prevent unbounded growth
  if (log.length > 1000) {
    log = log.slice(-1000);
  }

  fs.writeFileSync(SCAN_LOG_PATH, JSON.stringify(log, null, 2));
}

/**
 * Check if the previous scan for a document was a failure.
 * Used for recovery baseline logic — after a failure, the next successful
 * scan saves a new baseline without alerting.
 */
export function wasPreviousScanFailure(vendorSlug: string, docType: string): boolean {
  if (!fs.existsSync(SCAN_LOG_PATH)) return false;

  try {
    const log: ScanLogEntry[] = JSON.parse(fs.readFileSync(SCAN_LOG_PATH, 'utf-8'));
    // Find the most recent entry for this document
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].vendorSlug === vendorSlug && log[i].docType === docType) {
        return log[i].status === 'fetch_failed';
      }
    }
  } catch { /* no log */ }

  return false;
}
