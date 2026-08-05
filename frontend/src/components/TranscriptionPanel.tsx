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
      window.getSelection()?.removeAllRanges();
    }
    onCopy();
  }, [onCopy]);

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  return (
    <section 
      className="apple-card flex flex-col gap-4" 
      aria-labelledby="transcription-heading"
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#273142] pb-3.5 flex-wrap gap-2">
        <h2 id="transcription-heading" className="text-[20px] font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2">
          <svg className="w-5.5 h-5.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Transcription Output Log
        </h2>
        <div className="flex items-center gap-3 text-[13.5px] text-slate-500 dark:text-slate-400 font-bold">
          {timestamp && (
            <span className="flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 font-extrabold" aria-label={`Last updated: ${timestamp}`}>
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timestamp}
            </span>
          )}
          <span aria-label={`${wordCount} words, ${charCount} characters`}>
            {wordCount} words | {charCount} chars
          </span>
        </div>
      </div>

      {/* Screen Reader Live Region */}
      <div 
        aria-live="assertive" 
        aria-atomic="true"
        className="sr-only"
      >
        {interimTranscript && `Transcribing: ${interimTranscript}`}
      </div>

      <div className="relative w-full">
        <textarea
          ref={textareaRef}
          value={transcript}
          readOnly
          className="apple-input w-full resize-none min-h-[140px] max-h-[260px] overflow-y-auto font-sans text-sm font-medium"
          aria-label="Speech transcription output"
          placeholder="Your spoken text will appear here automatically when dictating..."
          rows={5}
        />
        
        {interimTranscript && (
          <div className="absolute bottom-3 left-4 right-4 bg-blue-50 dark:bg-blue-950/60 p-3 rounded-xl text-[14px] text-blue-600 dark:text-blue-300 font-bold animate-pulse border border-blue-200 dark:border-blue-800/60">
            <span>Transcribing live: {interimTranscript}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <button
          onClick={handleCopy}
          disabled={!hasContent}
          className="apple-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Copy text to clipboard"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span className="leading-none">Copy Transcription</span>
        </button>

        <button
          onClick={onClear}
          disabled={!hasContent}
          className="apple-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Clear transcription text"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="leading-none">Clear Output</span>
        </button>
      </div>
    </section>
  );
}
