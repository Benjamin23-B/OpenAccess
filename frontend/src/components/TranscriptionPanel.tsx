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
      className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-7 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex flex-col gap-4" 
      aria-labelledby="transcription-heading"
    >
      <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#334155] pb-3 flex-wrap gap-2">
        <h2 id="transcription-heading" className="text-[20px] font-semibold text-[#16324F] dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Transcription Output Log
        </h2>
        <div className="flex items-center gap-3 text-[13px] text-[#64748B] dark:text-[#94A3B8]">
          {timestamp && (
            <span className="flex items-center gap-1 font-mono" aria-label={`Last updated: ${timestamp}`}>
              <svg className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timestamp}
            </span>
          )}
          <span className="font-semibold" aria-label={`${wordCount} words, ${charCount} characters`}>
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
          className="w-full bg-[#FFFFFF] dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-xl p-5 text-[15px] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/30 resize-none min-h-[140px] max-h-[260px] overflow-y-auto placeholder-[#94A3B8] font-sans transition-all duration-200"
          aria-label="Speech transcription output"
          placeholder="Your spoken text will appear here automatically when dictating..."
          rows={5}
        />
        
        {interimTranscript && (
          <div className="absolute bottom-3 left-4 right-4 bg-[#EFF6FF]/90 dark:bg-[#1E3A8A]/80 p-3 rounded-lg text-[13px] text-[#0F4C81] dark:text-[#93C5FD] font-semibold animate-pulse border border-[#BFDBFE] dark:border-[#3B82F6]/40">
            <span>Transcribing live: {interimTranscript}</span>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <button
          onClick={handleCopy}
          disabled={!hasContent}
          className="h-[48px] px-6 bg-[#0F4C81] dark:bg-[#2563EB] hover:bg-[#0B3D66] dark:hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm cursor-pointer flex items-center justify-center gap-2"
          aria-label="Copy text to clipboard"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          <span className="leading-none">Copy Transcription</span>
        </button>

        <button
          onClick={onClear}
          disabled={!hasContent}
          className="h-[48px] px-6 bg-[#F4F7FB] dark:bg-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#334155] text-[#1E293B] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#475569] font-semibold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer flex items-center justify-center gap-2"
          aria-label="Clear transcription text"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="leading-none">Clear Output</span>
        </button>
      </div>
    </section>
  );
}
