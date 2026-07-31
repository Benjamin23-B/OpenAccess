'use client';

/**
 * useEnvDetector.ts — React hook owning the full scene narration pipeline.
 */

// ImageCapture is a browser API not yet included in TypeScript's default lib
declare class ImageCapture {
  constructor(track: MediaStreamTrack);
  grabFrame(): Promise<ImageBitmap>;
}

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  enrichDetection,
  nms,
  SpatialMapper,
  SceneDeltaEngine,
  ScenePriorityQueue,
  type Detection,
} from '../services/sceneIntelligence';
import { generateNarration, generateSync } from '../services/sceneNlg';
import { SceneAudioQueue, panForPosition } from '../services/sceneAudioQueue';
import type { RawDetection } from '../workers/sceneWorker';

// Frame sampling interval (ms) — 10 fps
const FRAME_INTERVAL_MS = 100;

export interface EnvDetectorState {
  isActive: boolean;
  isModelReady: boolean;
  webnnAvailable: boolean;
  lastAnnouncement: string;
  detectionCount: number;
  toggle: () => void;
}

export function useEnvDetector(
  streamRef: React.RefObject<MediaStream | null>
): EnvDetectorState {
  const [isActive, setIsActive]         = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [webnnAvailable, setWebnn]      = useState(false);
  const [lastAnnouncement, setLast]     = useState('');
  const [detectionCount, setCount]      = useState(0);

  const workerRef     = useRef<Worker | null>(null);
  const canvasRef     = useRef<HTMLCanvasElement | null>(null);
  const deltaEngine   = useRef(new SceneDeltaEngine());
  const priorityQueue = useRef(new ScenePriorityQueue());
  const audioQueue    = useRef(new SceneAudioQueue());
  const activeRef     = useRef(false);
  const lastFrameTime = useRef(0);
  const rafId         = useRef<number>(0);

  // ── Boot worker once on mount ─────────────────────────────────────────────
  useEffect(() => {
    // Load worker from /public — bypasses Next.js bundler entirely.
    // This is the correct pattern for WASM/CDN-dependent workers.
    const worker = new Worker('/sceneWorker.js');

    worker.onmessage = async (e: MessageEvent) => {
      const { type, payload } = e.data;

      if (type === 'READY') {
        setIsModelReady(payload.modelReady ?? false);
        setWebnn(payload.webnnAvailable ?? false);
      } else if (type === 'DETECTIONS') {
        const rawList = payload as RawDetection[];

        // Enrich → NMS → spatial map
        const enriched: Detection[] = rawList
          .map(enrichDetection)
          .filter((d): d is Detection => d !== null)
          .map(SpatialMapper.map);
        const deduped = nms(enriched);

        setCount(deduped.length);

        // Delta engine — keep only new/moved
        const newDets = deltaEngine.current.update(deduped);
        if (newDets.length === 0) return;

        // Priority queue
        const ranked = priorityQueue.current.rank(newDets);

        // NLG + audio
        for (const { detection: det, delayMs, tier } of ranked) {
          const sentences =
            tier === 1
              ? [generateSync(det)]           // fast path for hazards
              : await generateNarration([det]);

          for (const sentence of sentences) {
            setLast(sentence);
            deltaEngine.current.markAnnounced(det);
            audioQueue.current.enqueue({
              text: sentence,
              pan: panForPosition(det.position),
              delayMs,
              tier,
            });
          }
        }
      }
    };

    worker.postMessage({ type: 'INIT' });
    workerRef.current = worker;

    // Offscreen canvas for frame capture
    canvasRef.current = document.createElement('canvas');

    return () => {
      worker.postMessage({ type: 'DESTROY' });
      worker.terminate();
      audioQueue.current.destroy();
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const frameLoopRef = useRef<() => void>(() => {});

  // ── Frame sampling loop ────────────────────────────────────────────────────
  const frameLoop = useCallback(() => {
    if (!activeRef.current) return;

    const now = performance.now();
    if (now - lastFrameTime.current >= FRAME_INTERVAL_MS) {
      lastFrameTime.current = now;

      const stream = streamRef.current;
      const canvas = canvasRef.current;
      const worker = workerRef.current;

      if (stream && canvas && worker) {
        // Get a video track frame
        const track = stream.getVideoTracks()[0];
        if (track && track.readyState === 'live') {
          // Use ImageCapture if available, else draw via video element
          if (typeof ImageCapture !== 'undefined') {
            const capture = new ImageCapture(track);
            capture.grabFrame().then(bitmap => {
              canvas.width  = bitmap.width;
              canvas.height = bitmap.height;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(bitmap, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              // Transfer the underlying ArrayBuffer — zero copy
              worker.postMessage(
                { type: 'PROCESS_FRAME', payload: { buffer: imageData.data.buffer, width: canvas.width, height: canvas.height } },
                [imageData.data.buffer]
              );
            }).catch(() => {});
          }
        }
      }
    }

    rafId.current = requestAnimationFrame(frameLoopRef.current);
  }, [streamRef]);

  // Keep frameLoopRef updated with the memoized frameLoop
  useEffect(() => {
    frameLoopRef.current = frameLoop;
  }, [frameLoop]);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback(() => {
    setIsActive(prev => {
      const next = !prev;
      activeRef.current = next;

      if (next) {
        deltaEngine.current.reset();
        audioQueue.current.clear();
        lastFrameTime.current = 0;
        rafId.current = requestAnimationFrame(frameLoopRef.current);
      } else {
        cancelAnimationFrame(rafId.current);
        audioQueue.current.clear();
        setLast('');
        setCount(0);
      }

      return next;
    });
  }, []);

  return { isActive, isModelReady, webnnAvailable, lastAnnouncement, detectionCount, toggle };
}
