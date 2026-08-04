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
        <svg className="w-5 h-5 text-[#0B5CAD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        Scene Narration
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
            {isActive ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
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
          <svg className="w-4 h-4 text-[#16A34A] inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Hardware acceleration active
        </p>
      )}

      {/* ── Model unavailable warning ── */}
      {!isModelReady && (
        <div className="warning-banner" role="alert">
          <svg className="w-5 h-5 text-[#F59E0B] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
