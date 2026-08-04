'use client';

import React from 'react';
import { ListeningState, SpeechState } from '@/hooks';

interface SpeechControlsProps {
  // STT Props
  listeningState: ListeningState;
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
    <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-7 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex flex-col gap-6" role="region" aria-label="Speech controls">
      
      {/* STT Controls */}
      <section className="flex flex-col gap-4" aria-labelledby="stt-heading">
        <h3 id="stt-heading" className="text-[20px] font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
          <svg className="w-5.5 h-5.5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Speech-to-Text Dictation
        </h3>
        <div className="flex gap-4 flex-wrap items-center">
          <button
            onClick={onStartListening}
            disabled={isListening || isProcessing || !isSTTSupported}
            className={`h-[48px] px-6 font-bold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex items-center justify-center gap-2 text-white shadow-sm ${
              isListening ? 'bg-[#DC2626] dark:bg-[#DC2626] animate-pulse' : 'bg-[#15803D] dark:bg-[#16A34A] hover:bg-[#166534]'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
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
            className="h-[48px] px-6 bg-[#B91C1C] dark:bg-[#DC2626] hover:bg-[#991B1B] dark:hover:bg-[#B91C1C] text-white font-bold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
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
        <h3 id="tts-heading" className="text-[20px] font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
          <svg className="w-5.5 h-5.5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          Text-to-Speech Read Aloud
        </h3>
        <div className="flex gap-4 flex-wrap items-center">
          <button
            onClick={onSpeak}
            disabled={!hasTranscript || isSpeaking || !isTTSSupported}
            className="h-[48px] px-6 bg-[#0F4C81] dark:bg-[#2563EB] hover:bg-[#0C3C66] dark:hover:bg-[#1D4ED8] text-white font-bold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm cursor-pointer flex items-center justify-center gap-2"
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
            className="h-[48px] px-6 bg-[#E2E8F0] dark:bg-[#0F172A] hover:bg-[#CBD5E1] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] border-2 border-[#94A3B8] dark:border-[#475569] font-bold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer flex items-center justify-center gap-2"
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
            className="h-[48px] px-6 bg-[#E2E8F0] dark:bg-[#0F172A] hover:bg-[#CBD5E1] dark:hover:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] border-2 border-[#94A3B8] dark:border-[#475569] font-bold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer flex items-center justify-center gap-2"
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
            className="h-[48px] px-6 bg-[#B91C1C] dark:bg-[#DC2626] hover:bg-[#991B1B] dark:hover:bg-[#B91C1C] text-white font-bold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
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
      <section className="flex flex-col gap-4 border-t-2 border-[#CBD5E1] dark:border-[#334155] pt-5" aria-labelledby="voice-heading">
        <h3 id="voice-heading" className="text-[20px] font-bold text-[#0F172A] dark:text-white flex items-center gap-2.5">
          <svg className="w-5.5 h-5.5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border-2 border-[#0F4C81] dark:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] font-bold outline-none focus:ring-2 focus:ring-[#3B82F6]/40 cursor-pointer shadow-xs"
            >
              <option value="en-IN" className="bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]">English (India)</option>
              <option value="ta-IN" className="bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]">Tamil (India)</option>
              <option value="thanglish" className="bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC]">Tanglish</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[14px]">
              <label className="font-bold text-[#0F172A] dark:text-[#E2E8F0]">Speech Speed Rate:</label>
              <span className="font-mono font-black text-[#0F4C81] dark:text-[#3B82F6] text-[15px]">{rate}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              className="w-full accent-[#0F4C81] dark:accent-[#3B82F6] cursor-pointer my-auto h-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[14px]">
              <label className="font-bold text-[#0F172A] dark:text-[#E2E8F0]">Audio Pitch Tone:</label>
              <span className="font-mono font-black text-[#0F4C81] dark:text-[#3B82F6] text-[15px]">{pitch}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              className="w-full accent-[#0F4C81] dark:accent-[#3B82F6] cursor-pointer my-auto h-2"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
