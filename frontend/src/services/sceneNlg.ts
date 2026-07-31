/**
 * sceneNlg.ts — Natural language generation for scene narration.
 *
 * Stage 5: Template engine (primary, on-device, < 1ms, no network).
 *   Simple  (1–5 objects): "A {object} is {position}, {depth}."
 *   Complex (> 5 objects): POST to /api/scene-narrate/ on Django backend
 */

import type { Detection } from './sceneIntelligence';

const COMPLEX_THRESHOLD = 5;
const BACKEND_URL = '/api/scene-narrate/';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function article(word: string): string {
  return word && VOWELS.has(word[0].toLowerCase()) ? 'An' : 'A';
}

function positionPhrase(position: string): string {
  return position === 'centre' ? 'ahead of you' : `on your ${position}`;
}

export function describeSingle(det: Detection): string {
  return `${article(det.label)} ${det.label} is ${positionPhrase(det.position)}, ${det.depth}.`;
}

function describeScene(detections: Detection[]): string {
  if (!detections.length) return '';
  const parts = detections.map(d => {
    const pos = d.position === 'centre' ? 'ahead' : `on your ${d.position}`;
    return `${article(d.label).toLowerCase()} ${d.label} ${pos}, ${d.depth}`;
  });
  if (parts.length === 1) return `You are in a scene with ${parts[0]}.`;
  return `You are in a busy scene — ${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`;
}

export async function generateNarration(detections: Detection[]): Promise<string[]> {
  if (!detections.length) return [];
  if (detections.length <= COMPLEX_THRESHOLD) {
    return detections.map(describeSingle);
  }

  // Complex path — try backend, fall back to local
  const localFallback = [describeScene(detections)];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detections: detections.map(d => ({
          label: d.label, position: d.position, depth: d.depth, confidence: d.confidence,
        })),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json() as { sentence: string };
      return [data.sentence];
    }
  } catch { /* timeout or network error — use local */ }

  return localFallback;
}

/** Synchronous single-detection fast path. Never waits for network. */
export function generateSync(det: Detection): string {
  return describeSingle(det);
}
