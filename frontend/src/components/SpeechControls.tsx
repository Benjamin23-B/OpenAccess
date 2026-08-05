'use client';

import React from 'react';
import { ListeningState, SpeechState } from '@/hooks';
import StatusIndicator from './StatusIndicator';

interface SpeechControlsProps {
  // STT Props
  listeningState: ListeningState;
  displayError?: { type: string; message: string } | null;
  isSTTSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  
  // TTS Props
  speechState: SpeechState;
  isTTSSupported: boolean;
  transcript: string;
  onSpeak: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  
  // Language Settings
  selectedLanguage: 'en-IN' | 'ta-IN' | 'thanglish';
  onLanguageChange: (lang: 'en-IN' | 'ta-IN' | 'thanglish') => void;
  rate: number;
  onRateChange: (rate: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
}

export default function SpeechControls({
  listeningState,
  displayError,
  isSTTSupported,
  onStartListening,
  onStopListening,
  speechState,
  isTTSSupported,
  transcript,
  onSpeak,
  onPause,
  onResume,
  onStop,
  selectedLanguage,
  onLanguageChange,
  rate,
  onRateChange,
  pitch,
  onPitchChange
}: SpeechControlsProps) {
  const isListening = listeningState === 'listening';
  const isProcessing = listeningState === 'processing';
  const isSpeaking = speechState === 'speaking';
  const isPaused = speechState === 'paused';
  const hasTranscript = transcript.trim().length > 0;

  return (
    <div className="apple-card flex flex-col gap-6" role="region" aria-label="Speech controls">
      
      {/* STT Controls */}
      <section className="flex flex-col gap-4" aria-labelledby="stt-heading">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 id="stt-heading" className="text-[20px] font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2.5">
            <svg className="w-5.5 h-5.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Speech-to-Text Dictation
          </h3>
          <StatusIndicator state={listeningState} error={displayError || null} />
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={onStartListening}
            disabled={isListening || isProcessing || !isSTTSupported}
            className={`apple-btn-primary ${
              isListening ? 'bg-rose-600 animate-pulse' : ''
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Start voice dictation"
            aria-pressed={isListening}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="leading-none">{isListening ? 'Listening...' : isProcessing ? 'Starting...' : 'Start Dictation'}</span>
          </button>
          
          <button
            onClick={onStopListening}
            disabled={!isListening && !isProcessing}
            className="apple-btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Stop voice dictation"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="leading-none">Stop Dictation</span>
          </button>
        </div>
      </section>

      {/* TTS Controls */}
      <section className="flex flex-col gap-4" aria-labelledby="tts-heading">
        <h3 id="tts-heading" className="text-[20px] font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2.5">
          <svg className="w-5.5 h-5.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          Text-to-Speech Read Aloud
        </h3>
        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={onSpeak}
            disabled={!hasTranscript || isSpeaking || !isTTSSupported}
            className="apple-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Read transcription aloud"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07" />
            </svg>
            <span className="leading-none">Read Aloud</span>
          </button>
          
          <button
            onClick={onPause}
            disabled={!isSpeaking}
            className="apple-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Pause speech"
            aria-pressed={isPaused}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6" />
            </svg>
            <span className="leading-none">Pause</span>
          </button>
          
          <button
            onClick={onResume}
            disabled={!isPaused}
            className="apple-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Resume speech"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            <span className="leading-none">Resume</span>
          </button>
          
          <button
            onClick={onStop}
            disabled={speechState === 'idle'}
            className="apple-btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Stop speech"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="leading-none">Stop</span>
          </button>
        </div>
      </section>

      {/* Voice Settings */}
      <section className="flex flex-col gap-4 border-t border-slate-200 dark:border-[#273142] pt-5" aria-labelledby="voice-heading">
        <h3 id="voice-heading" className="text-[20px] font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2.5">
          <svg className="w-5.5 h-5.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          Audio Synthesis Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-bold text-[#0F172A] dark:text-[#E2E8F0]">Speech Language:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value as any)}
              className="apple-input font-bold cursor-pointer"
            >
              <option value="en-IN">English (India)</option>
              <option value="ta-IN">Tamil (India)</option>
              <option value="thanglish">Tanglish</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[14px]">
              <label className="font-bold text-[#0F172A] dark:text-[#E2E8F0]">Speech Speed Rate:</label>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-[15px]">{rate}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 dark:accent-blue-400 cursor-pointer my-auto h-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[14px]">
              <label className="font-bold text-[#0F172A] dark:text-[#E2E8F0]">Audio Pitch Tone:</label>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-[15px]">{pitch}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 dark:accent-blue-400 cursor-pointer my-auto h-2"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
