'use client';

/**
 * EnvDetector.tsx — Scene narration UI component.
 *
 * Renders a toggle button + status panel inside the VisuallyImpairedBridge.
 * Consumes the useEnvDetector hook. Uses the existing camera MediaStream
 * from the parent — no new camera stream is created.
 *
 * Fully keyboard accessible; all state changes announced via ARIA live region.
 */

import React, { useRef } from 'react';
import { useEnvDetector } from '@/hooks/useEnvDetector';

interface EnvDetectorProps {
  /** Existing MediaStream from the parent's getUserMedia call. */
  streamRef: React.RefObject<MediaStream | null>;
  /** Optional callback so parent can show announcements in its own live region. */
  onAnnouncement?: (text: string) => void;
}

export default function EnvDetector({ streamRef, onAnnouncement }: EnvDetectorProps) {
  const {
    isActive,
    isModelReady,
    webnnAvailable,
    lastAnnouncement,
    detectionCount,
    toggle,
  } = useEnvDetector(streamRef);

  // Notify parent whenever we get a new announcement
  const prevAnnouncement = useRef('');
  React.useEffect(() => {
    if (lastAnnouncement && lastAnnouncement !== prevAnnouncement.current) {
      prevAnnouncement.current = lastAnnouncement;
      onAnnouncement?.(lastAnnouncement);
    }
  }, [lastAnnouncement, onAnnouncement]);

  const statusText = !isModelReady
    ? 'Loading detection model…'
    : isActive
    ? detectionCount > 0
      ? `Scanning — ${detectionCount} object${detectionCount !== 1 ? 's' : ''} detected`
      : 'Scanning scene…'
    : 'Scene narration off';

  return (
    <section
      className="env-detector-panel"
      aria-labelledby="env-detector-heading"
    >
      {/* ── Heading ── */}
      <h3 id="env-detector-heading" className="section-title">
        <span aria-hidden="true">🌐</span> Scene Narration
      </h3>

      <p className="env-detector-description">
        Detects objects around you and announces them aloud with spatial audio.
        Objects on your left are heard from the left speaker.
      </p>

      {/* ── Toggle button ── */}
      <div className="env-detector-controls">
        <button
          id="env-detector-toggle"
          onClick={toggle}
          disabled={!isModelReady}
          className={`control-btn ${isActive ? 'danger' : 'primary'} env-detector-btn`}
          aria-pressed={isActive}
          aria-label={isActive ? 'Disable scene narration' : 'Enable scene narration'}
        >
          <span className="btn-icon" aria-hidden="true">
            {isActive ? '🔇' : '🔊'}
          </span>
          <span className="btn-text">
            {isActive ? 'Stop Scene Narration' : 'Start Scene Narration'}
          </span>
        </button>
      </div>

      {/* ── Status row ── */}
      <div className="env-detector-status">
        <span
          className={`env-status-dot ${isActive ? 'active' : ''}`}
          aria-hidden="true"
        />
        <span className="env-status-text">{statusText}</span>
      </div>

      {/* ── Last announcement (visible for testing / sighted users) ── */}
      {lastAnnouncement && (
        <div className="env-last-announcement" aria-live="off">
          <span className="env-announcement-label">Last:</span>{' '}
          <span className="env-announcement-text">{lastAnnouncement}</span>
        </div>
      )}

      {/* ── WebNN badge ── */}
      {webnnAvailable && (
        <p className="env-webnn-badge" title="Hardware-accelerated inference active">
          <span aria-hidden="true">⚡</span> Hardware acceleration active
        </p>
      )}

      {/* ── Model unavailable warning ── */}
      {!isModelReady && (
        <div className="warning-banner" role="alert">
          <span aria-hidden="true">⏳</span>
          <span> Loading EfficientDet-Lite0 model… first load may take a moment.</span>
        </div>
      )}

      {/* ── ARIA live region for screen readers ── */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {lastAnnouncement}
      </div>
    </section>
  );
}
