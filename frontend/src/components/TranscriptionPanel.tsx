'use client';

import React, { useRef, useCallback } from 'react';

interface TranscriptionPanelProps {
  transcript: string;
  interimTranscript: string;
  timestamp: string | null;
  onClear: () => void;
  onCopy: () => void;
}

export default function TranscriptionPanel({
  transcript,
  interimTranscript,
  timestamp,
  onClear,
  onCopy
}: TranscriptionPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasContent = transcript.trim().length > 0 || interimTranscript.length > 0;

  const handleCopy = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.select();
      document.execCommand('copy');
      // Remove selection
      window.getSelection()?.removeAllRanges();
    }
    onCopy();
  }, [onCopy]);

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  return (
    <section 
      className="transcription-panel" 
      aria-labelledby="transcription-heading"
    >
      <div className="panel-header">
        <h2 id="transcription-heading" className="panel-title">
          <span aria-hidden="true">📝</span> Transcription
        </h2>
        <div className="panel-meta">
          {timestamp && (
            <span className="timestamp" aria-label={`Last updated: ${timestamp}`}>
              <span aria-hidden="true">🕐</span> {timestamp}
            </span>
          )}
          <span className="stats" aria-label={`${wordCount} words, ${charCount} characters`}>
            {wordCount} words | {charCount} chars
          </span>
        </div>
      </div>

      {/* Live region for screen reader announcements */}
      <div 
        aria-live="assertive" 
        aria-atomic="true"
        className="sr-only"
      >
        {interimTranscript && `Transcribing: ${interimTranscript}`}
      </div>

      <div className="transcription-container">
        <textarea
          ref={textareaRef}
          value={transcript}
          readOnly
          className="transcription-textarea"
          aria-label="Speech transcription output"
          aria-describedby="transcription-help"
          placeholder="Your speech will appear here..."
          rows={8}
        />
        
        {/* Interim results overlay */}
        {interimTranscript && (
          <div 
            className="interim-overlay"
            aria-hidden="true"
          >
            <span className="interim-text">{interimTranscript}</span>
            <span className="interim-cursor">|</span>
          </div>
        )}
      </div>

      <p id="transcription-help" className="sr-only">
        This area displays your speech transcription. 
        Use the buttons below to copy or clear the text.
      </p>

      <div className="panel-actions">
        <button
          onClick={handleCopy}
          disabled={!hasContent}
          className="action-btn"
          aria-label="Copy transcription to clipboard"
        >
          <span aria-hidden="true">📋</span> Copy Text
        </button>
        
        <button
          onClick={onClear}
          disabled={!hasContent}
          className="action-btn danger"
          aria-label="Clear transcription"
        >
          <span aria-hidden="true">🗑️</span> Clear
        </button>
      </div>

      {!hasContent && (
        <div className="empty-state" role="status" aria-live="polite">
          <span className="empty-icon" aria-hidden="true">🎤</span>
          <p>Click &quot;Start Dictation&quot; to begin speech recognition</p>
        </div>
      )}
    </section>
  );
}
