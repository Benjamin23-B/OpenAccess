'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognition, useSpeechSynthesis } from '@/hooks';
import StatusIndicator from './StatusIndicator';
import SpeechControls from './SpeechControls';
import TranscriptionPanel from './TranscriptionPanel';

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
    <div className="visually-impaired-bridge flex flex-col gap-6 w-full max-w-[1340px] mx-auto p-4 md:p-6 text-[#0F172A] dark:text-[#F8FAFC]">
      {/* Top Banner & Status Header */}
      <div className="flex flex-col gap-4">
        <div className="apple-banner flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2.5">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Speech & Audio Assistive Interface
            </h2>
            <p className="text-[14.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              Speech-to-text dictation and text-to-speech read aloud. All controls keyboard accessible.
            </p>
          </div>
          <StatusIndicator state={listeningState} error={displayError} />
        </div>

        {displayError && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-2xl flex items-center gap-3 text-[14px] font-medium" role="alert" aria-live="assertive">
            <svg className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{displayError.message}</span>
          </div>
        )}

        {copiedMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 rounded-2xl flex items-center gap-3 text-[14px] font-medium" role="status" aria-live="polite">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{copiedMessage}</span>
          </div>
        )}

        {!isSTTSupported && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 p-4 rounded-2xl flex items-center gap-3 text-[14px] font-medium" role="alert">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span><strong>Speech recognition not supported:</strong> Please use Chrome, Edge, or Safari for voice input.</span>
          </div>
        )}

        {!isTTSSupported && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 p-4 rounded-2xl flex items-center gap-3 text-[14px] font-medium" role="alert">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span><strong>Text-to-speech not supported:</strong> Your browser does not support speech synthesis.</span>
          </div>
        )}
      </div>

      {/* 2-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Speech Controls (Span 7) */}
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
        </div>

        {/* Right Column: Transcription Log (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <TranscriptionPanel
            transcript={transcript}
            interimTranscript={interimTranscript}
            timestamp={timestamp}
            onClear={handleClear}
            onCopy={handleCopy}
          />
        </div>
      </div>
    </div>
  );
}
