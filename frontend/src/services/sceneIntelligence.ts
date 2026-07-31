/**
 * sceneIntelligence.ts — Stage 4 of the scene narration pipeline.
 *
 * Three components, all pure TypeScript — no ML, no network:
 *
 *   filterDetections   — confidence threshold + minimum box area
 *   SpatialMapper      — box centre → position label + depth label
 *   SceneDeltaEngine   — IoU-based change detection; stale suppression
 *   ScenePriorityQueue — tier-based ordering of new detections
 */

import type { RawDetection } from '../workers/sceneWorker';

// ── COCO label map (must match sceneWorker) ───────────────────────────────────

export const COCO_LABELS: string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train',
  'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign',
  'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep',
  'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella',
  'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
  'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard',
  'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork',
  'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv',
  'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave',
  'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
  'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

// ── Shared Detection type (enriched from RawDetection) ───────────────────────

export interface Detection {
  label: string;
  confidence: number;
  /** Normalised [0–1] */
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  /** Derived */
  cx: number;
  cy: number;
  area: number;
  /** Added by SpatialMapper */
  position: string;
  depth: string;
}

// ── Tier definitions ──────────────────────────────────────────────────────────

const TIER_1 = new Set([
  'person', 'dog', 'cat', 'car', 'truck', 'bus', 'motorcycle',
  'bicycle', 'traffic light', 'stop sign',
]);
const TIER_2 = new Set([
  'chair', 'couch', 'bed', 'dining table', 'toilet', 'bench',
  'refrigerator', 'oven', 'sink', 'tv', 'desk',
]);

const TIER_DELAY: Record<number, number> = { 1: 0, 2: 500, 3: 999999 };

// Stale suppression — do not re-announce unless object has moved (ms)
const STALE_MS = 3000;
// IoU threshold below which an object is considered moved
const MOVE_IOU_THRESHOLD = 0.45;
// Confidence threshold
const CONFIDENCE_THRESHOLD = 0.55;
// Minimum bounding box area (fraction of frame) — filters noise
const MIN_BOX_AREA = 0.002;

// ── Helpers ───────────────────────────────────────────────────────────────────

function iou(a: Detection, b: Detection): number {
  const ix1 = Math.max(a.xmin, b.xmin);
  const iy1 = Math.max(a.ymin, b.ymin);
  const ix2 = Math.min(a.xmax, b.xmax);
  const iy2 = Math.min(a.ymax, b.ymax);

  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;

  const union = a.area + b.area - inter;
  return union > 0 ? inter / union : 0;
}

function tier(label: string): number {
  if (TIER_1.has(label)) return 1;
  if (TIER_2.has(label)) return 2;
  return 3;
}

// ── Step 1: Filter raw detections ────────────────────────────────────────────

export function enrichDetection(raw: RawDetection): Detection | null {
  if (raw.score < CONFIDENCE_THRESHOLD) return null;
  if (raw.classId < 0 || raw.classId >= COCO_LABELS.length) return null;

  const [ymin, xmin, ymax, xmax] = raw.box;
  const cx   = (xmin + xmax) / 2;
  const cy   = (ymin + ymax) / 2;
  const area = Math.max(0, xmax - xmin) * Math.max(0, ymax - ymin);

  if (area < MIN_BOX_AREA) return null;

  return {
    label: COCO_LABELS[raw.classId],
    confidence: raw.score,
    xmin, ymin, xmax, ymax,
    cx, cy, area,
    position: '',
    depth: '',
  };
}

/** Non-maximum suppression over same-label detections */
export function nms(detections: Detection[], iouThreshold = 0.45): Detection[] {
  const result: Detection[] = [];
  const byLabel: Record<string, Detection[]> = {};

  for (const d of detections) {
    (byLabel[d.label] ??= []).push(d);
  }

  for (const dets of Object.values(byLabel)) {
    // Sort descending by confidence
    dets.sort((a, b) => b.confidence - a.confidence);

    const kept: Detection[] = [];
    for (const d of dets) {
      if (kept.every(k => iou(d, k) < iouThreshold)) {
        kept.push(d);
      }
    }
    result.push(...kept);
  }

  return result;
}

// ── Step 2: SpatialMapper ────────────────────────────────────────────────────

const X_BINS: Array<[number, number, string]> = [
  [0.00, 0.20, 'far left'],
  [0.20, 0.40, 'left'],
  [0.40, 0.60, 'centre'],
  [0.60, 0.80, 'right'],
  [0.80, 1.00, 'far right'],
];

const DEPTH_THRESHOLDS: Array<[number, string]> = [
  [0.25, 'very close'],
  [0.08, 'close'],
  [0.02, 'mid distance'],
];

export class SpatialMapper {
  static map(det: Detection): Detection {
    // Position
    let position = 'far right';
    for (const [lo, hi, label] of X_BINS) {
      if (det.cx >= lo && det.cx < hi) {
        position = label;
        break;
      }
    }

    // Depth
    let depth = 'far away';
    for (const [threshold, label] of DEPTH_THRESHOLDS) {
      if (det.area >= threshold) {
        depth = label;
        break;
      }
    }

    return { ...det, position, depth };
  }
}

// ── Step 3: SceneDeltaEngine ─────────────────────────────────────────────────

interface TrackedObject {
  detection: Detection;
  lastAnnounced: number;
  lastSeen: number;
}

export class SceneDeltaEngine {
  private tracked: Map<string, TrackedObject[]> = new Map();

  /**
   * Feed current frame's detections.
   * Returns only detections that are new, moved, or stale (> STALE_MS since last announcement).
   */
  update(detections: Detection[]): Detection[] {
    const now = Date.now();
    const newObjects: Detection[] = [];

    const byLabel: Map<string, Detection[]> = new Map();
    for (const det of detections) {
      const arr = byLabel.get(det.label) ?? [];
      arr.push(det);
      byLabel.set(det.label, arr);
    }

    const nextTracked: Map<string, TrackedObject[]> = new Map();

    for (const [label, dets] of byLabel) {
      const prevList = this.tracked.get(label) ?? [];
      const nextList: TrackedObject[] = [];

      for (const det of dets) {
        let bestIou = 0;
        let matchedPrev: TrackedObject | null = null;

        for (const prev of prevList) {
          const score = iou(det, prev.detection);
          if (score > bestIou) {
            bestIou = score;
            matchedPrev = prev;
          }
        }

        if (matchedPrev === null) {
          // Brand new
          newObjects.push(det);
          nextList.push({ detection: det, lastAnnounced: now, lastSeen: now });
        } else if (bestIou < MOVE_IOU_THRESHOLD) {
          // Moved significantly
          newObjects.push(det);
          nextList.push({ detection: det, lastAnnounced: now, lastSeen: now });
        } else {
          // Same position — check if stale
          const tracked: TrackedObject = {
            detection: det,
            lastAnnounced: matchedPrev.lastAnnounced,
            lastSeen: now,
          };
          if (now - matchedPrev.lastAnnounced >= STALE_MS) {
            newObjects.push(det);
            tracked.lastAnnounced = now;
          }
          nextList.push(tracked);
        }
      }

      nextTracked.set(label, nextList);
    }

    this.tracked = nextTracked;
    return newObjects;
  }

  markAnnounced(det: Detection): void {
    const now = Date.now();
    const list = this.tracked.get(det.label);
    if (!list) return;
    for (const t of list) {
      if (iou(det, t.detection) > 0.3) {
        t.lastAnnounced = now;
        break;
      }
    }
  }

  reset(): void {
    this.tracked.clear();
  }
}

// ── Step 4: PriorityQueue ────────────────────────────────────────────────────

export interface RankedDetection {
  detection: Detection;
  /** Recommended delay in ms before speaking this item */
  delayMs: number;
  tier: number;
}

export class ScenePriorityQueue {
  /**
   * Sort new detections by tier + confidence.
   * Tier 3 objects are suppressed unless fewer than 2 Tier-1/2 objects exist.
   */
  rank(detections: Detection[]): RankedDetection[] {
    const withTier = detections.map(d => ({ d, t: tier(d.label) }));

    const higherTierCount = withTier.filter(x => x.t <= 2).length;
    const filtered = withTier.filter(x => x.t <= 2 || higherTierCount < 2);

    // Sort: tier ascending, confidence descending
    filtered.sort((a, b) => a.t - b.t || b.d.confidence - a.d.confidence);

    const result: RankedDetection[] = [];
    let cumulativeMs = 0;

    for (const { d, t } of filtered) {
      const baseDelay = TIER_DELAY[t];
      const speakAt = Math.max(cumulativeMs, baseDelay);
      result.push({ detection: d, delayMs: speakAt, tier: t });
      cumulativeMs = speakAt + 800; // 800 ms gap between announcements
    }

    return result;
  }
}
