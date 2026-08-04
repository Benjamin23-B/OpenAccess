'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognition, useSpeechSynthesis } from '@/hooks';
import StatusIndicator from './StatusIndicator';
import SpeechControls from './SpeechControls';
import TranscriptionPanel from './TranscriptionPanel';
import EnvDetector from './EnvDetector';

interface VisuallyImpairedBridgeProps {
  onLiveMessage?: (message: string) => void;
}

export default function VisuallyImpairedBridge({ onLiveMessage }: VisuallyImpairedBridgeProps) {
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [prevTranscript, setPrevTranscript] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'ta-IN' | 'thanglish'>('en-IN');
  // Camera stream ref shared with EnvDetector — no new stream created
  const streamRef = useRef<MediaStream | null>(null);

  const {
    speechState,
    voices,
    selectedVoice,
    rate,
    pitch,
    isSupported: isTTSSupported,
    error: synthesisError,
    setSelectedVoice,
    setRate,
    setPitch,
    speak,
    pause,
    resume,
    stop
  } = useSpeechSynthesis();

  const {
    transcript,
    interimTranscript,
    listeningState,
    error: recognitionError,
    isSupported: isSTTSupported,
    startListening,
    stopListening,
    clearTranscript
  } = useSpeechRecognition(selectedLanguage);

  // Automatically update active synthesis voice when language changes
  useEffect(() => {
    if (voices.length === 0) return;

    if (selectedLanguage === 'thanglish') {
      const thanglishVoice = voices.find(v => v.voiceURI === 'thanglish-virtual-voice');
      if (thanglishVoice) setSelectedVoice(thanglishVoice);
    } else if (selectedLanguage === 'ta-IN') {
      // Find a Tamil voice, prioritizing Google voices
      const tamilVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('ta'));
      const googleTamil = tamilVoices.find(v => v.name.toLowerCase().includes('google'));
      const tamilVoice = googleTamil || tamilVoices[0];

      if (tamilVoice) {
        setSelectedVoice(tamilVoice);
      } else {
        // Fallback to Thanglish if no native Tamil voice is found on OS
        const fallback = voices.find(v => v.voiceURI === 'thanglish-virtual-voice') || voices[0];
        setSelectedVoice(fallback);
      }
    } else {
      // Indian English, prioritizing Google voices
      const enINVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
      const googleEnIN = enINVoices.find(v => v.name.toLowerCase().includes('google'));
      const enINVoice = googleEnIN || enINVoices[0];

      if (enINVoice) {
        setSelectedVoice(enINVoice);
      } else {
        // Fallback to any English voice
        const fallbackEnglish = voices.find(v => v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('google')) ||
          voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
          voices[0];
        setSelectedVoice(fallbackEnglish);
      }
    }
  }, [selectedLanguage, voices, setSelectedVoice]);

  // Update timestamp when transcript changes
  useEffect(() => {
    if (transcript !== prevTranscript) {
      setPrevTranscript(transcript);
      setTimestamp(transcript ? new Date().toLocaleTimeString() : null);
    }
  }, [transcript, prevTranscript]);

  // Notify parent of live messages for screen reader
  useEffect(() => {
    if (onLiveMessage) {
      if (interimTranscript) {
        onLiveMessage(`Transcribing: ${interimTranscript}`);
      } else if (listeningState === 'listening') {
        onLiveMessage('Listening for speech...');
      }
    }
  }, [interimTranscript, listeningState, onLiveMessage]);

  const handleStartListening = useCallback(async () => {
    await startListening();
  }, [startListening]);

  const handleStopListening = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handleSpeak = useCallback(() => {
    if (transcript.trim()) {
      speak(transcript, selectedLanguage);
    }
  }, [transcript, speak, selectedLanguage]);

  const handleClear = useCallback(() => {
    clearTranscript();
    setTimestamp(null);
    if (onLiveMessage) {
      onLiveMessage('Transcription cleared');
    }
  }, [clearTranscript, onLiveMessage]);

  const handleCopy = useCallback(() => {
    if (transcript) {
      navigator.clipboard.writeText(transcript).then(() => {
        setCopiedMessage('Transcription copied to clipboard');
        setTimeout(() => setCopiedMessage(null), 3000);
        if (onLiveMessage) {
          onLiveMessage('Text copied to clipboard');
        }
      }).catch(() => {
        // Fallback: textarea selection happens in TranscriptionPanel
        setCopiedMessage('Text copied');
        if (onLiveMessage) {
          onLiveMessage('Text copied to clipboard');
        }
      });
    }
  }, [transcript, onLiveMessage]);

  // Combine errors from both hooks
  const displayError = recognitionError || (synthesisError ? { type: 'unknown', message: synthesisError } : null);

  return (
    <div className="visually-impaired-bridge flex flex-col gap-6 w-full max-w-[1340px] mx-auto p-4 md:p-6 text-[#1E293B] dark:text-[#F8FAFC]">
      {/* Top Banner & Status Header */}
      <div className="flex flex-col gap-4">
        <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-5 md:p-6 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-[22px] font-bold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2.5">
              <svg className="w-6 h-6 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Speech & Audio Assistive Interface
            </h2>
            <p className="text-[14.5px] font-medium text-[#334155] dark:text-[#CBD5E1] mt-1">
              Speech-to-text dictation, text-to-speech read aloud, and spatial scene narration. All controls keyboard accessible.
            </p>
          </div>
          <StatusIndicator state={listeningState} error={displayError} />
        </div>

        {displayError && (
          <div className="bg-[#FEF2F2] dark:bg-[#451A1A] border border-[#FCA5A5] dark:border-[#DC2626] text-[#991B1B] dark:text-[#FCA5A5] p-4 rounded-xl flex items-center gap-3 text-[14px] font-medium" role="alert" aria-live="assertive">
            <svg className="w-5 h-5 text-[#C0392B] dark:text-[#DC2626] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{displayError.message}</span>
          </div>
        )}

        {copiedMessage && (
          <div className="bg-[#E8F5E9] dark:bg-[#166534]/40 border border-[#A5D6A7] dark:border-[#22C55E]/40 text-[#198754] dark:text-[#86EFAC] p-4 rounded-xl flex items-center gap-3 text-[14px] font-medium" role="status" aria-live="polite">
            <svg className="w-5 h-5 text-[#198754] dark:text-[#16A34A] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{copiedMessage}</span>
          </div>
        )}

        {!isSTTSupported && (
          <div className="bg-[#FFFBEB] dark:bg-[#78350F]/30 border border-[#FCD34D] dark:border-[#D97706] text-[#D97706] dark:text-[#FDE68A] p-4 rounded-xl flex items-center gap-3 text-[14px] font-medium" role="alert">
            <svg className="w-5 h-5 text-[#D97706] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span><strong>Speech recognition not supported:</strong> Please use Chrome, Edge, or Safari for voice input.</span>
          </div>
        )}

        {!isTTSSupported && (
          <div className="bg-[#FFFBEB] dark:bg-[#78350F]/30 border border-[#FCD34D] dark:border-[#D97706] text-[#D97706] dark:text-[#FDE68A] p-4 rounded-xl flex items-center gap-3 text-[14px] font-medium" role="alert">
            <svg className="w-5 h-5 text-[#D97706] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span><strong>Text-to-speech not supported:</strong> Your browser does not support speech synthesis.</span>
          </div>
        )}
      </div>

      {/* 2-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Speech Controls & Scene Narration (Span 7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <SpeechControls
            listeningState={listeningState}
            isSTTSupported={isSTTSupported}
            onStartListening={handleStartListening}
            onStopListening={handleStopListening}
            speechState={speechState}
            isTTSSupported={isTTSSupported}
            transcript={transcript}
            onSpeak={handleSpeak}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            rate={rate}
            onRateChange={setRate}
            pitch={pitch}
            onPitchChange={setPitch}
          />

          <EnvDetector
            streamRef={streamRef}
            onAnnouncement={onLiveMessage}
          />
        </div>

        {/* Right Column: Transcription Log & Cheatsheet (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <TranscriptionPanel
            transcript={transcript}
            interimTranscript={interimTranscript}
            timestamp={timestamp}
            onClear={handleClear}
            onCopy={handleCopy}
          />

          {/* Keyboard Shortcuts Cheatsheet */}
          <section className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-5 md:p-6 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex flex-col gap-3.5" aria-labelledby="shortcuts-heading">
            <h3 id="shortcuts-heading" className="text-[18px] font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <svg className="w-5.5 h-5.5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Keyboard Shortcuts Cheatsheet
            </h3>
            <ul className="grid grid-cols-2 gap-3">
              <li className="bg-[#E2E8F0] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] p-3 rounded-xl flex items-center gap-2.5 text-[13.5px] text-[#0F172A] dark:text-[#F8FAFC] font-bold">
                <kbd className="bg-white dark:bg-[#1E293B] border border-[#0F172A] dark:border-[#64748B] px-2 py-0.5 rounded text-[12px] font-black font-mono text-[#0F172A] dark:text-white shadow-xs">Tab</kbd> Move focus
              </li>
              <li className="bg-[#E2E8F0] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] p-3 rounded-xl flex items-center gap-2.5 text-[13.5px] text-[#0F172A] dark:text-[#F8FAFC] font-bold">
                <kbd className="bg-white dark:bg-[#1E293B] border border-[#0F172A] dark:border-[#64748B] px-2 py-0.5 rounded text-[12px] font-black font-mono text-[#0F172A] dark:text-white shadow-xs">Enter</kbd> Activate CTA
              </li>
              <li className="bg-[#E2E8F0] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] p-3 rounded-xl flex items-center gap-2.5 text-[13.5px] text-[#0F172A] dark:text-[#F8FAFC] font-bold">
                <kbd className="bg-white dark:bg-[#1E293B] border border-[#0F172A] dark:border-[#64748B] px-2 py-0.5 rounded text-[12px] font-black font-mono text-[#0F172A] dark:text-white shadow-xs">Shift+Tab</kbd> Backwards
              </li>
              <li className="bg-[#E2E8F0] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] p-3 rounded-xl flex items-center gap-2.5 text-[13.5px] text-[#0F172A] dark:text-[#F8FAFC] font-bold">
                <kbd className="bg-white dark:bg-[#1E293B] border border-[#0F172A] dark:border-[#64748B] px-2 py-0.5 rounded text-[12px] font-black font-mono text-[#0F172A] dark:text-white shadow-xs">Esc</kbd> Stop Audio
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
