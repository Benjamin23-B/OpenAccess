/**
 * sceneWorker.ts — TYPE DEFINITIONS ONLY.
 *
 * The actual worker runtime is served from /public/sceneWorker.js
 * (a classic JS worker loaded via URL to bypass Next.js bundler).
 *
 * This file exists only to export shared TypeScript types used by
 * useEnvDetector.ts and sceneIntelligence.ts.
 */

export interface RawDetection {
  classId: number;
  score: number;
  /** Normalised [0–1] bounding box: [ymin, xmin, ymax, xmax] */
  box: [number, number, number, number];
}
