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
    <div 
      id="bridge-panel-blind"
      className="visually-impaired-bridge"
      role="tabpanel"
      aria-labelledby="tab-blind"
      tabIndex={0}
    >
      <div className="bridge-header">
        <h2 className="bridge-title">
          <span aria-hidden="true">👁️</span> Speech / Audio Interface
        </h2>
        <p className="bridge-description">
          Speech-to-text and text-to-speech for visually impaired users. 
          All controls are keyboard accessible.
        </p>
      </div>

      {/* Status & Error Display */}
      <StatusIndicator state={listeningState} error={displayError} />
      
      {displayError && (
        <div 
          className="error-banner" 
          role="alert" 
          aria-live="assertive"
        >
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <span className="error-message">{displayError.message}</span>
        </div>
      )}

      {copiedMessage && (
        <div 
          className="success-banner" 
          role="status" 
          aria-live="polite"
        >
          <span className="success-icon" aria-hidden="true">✅</span>
          <span>{copiedMessage}</span>
        </div>
      )}

      {/* Feature Not Supported Warnings */}
      {!isSTTSupported && (
        <div className="warning-banner" role="alert">
          <span aria-hidden="true">🚫</span>
          <strong>Speech recognition not supported:</strong> Please use Chrome, Edge, or Safari for voice input.
        </div>
      )}
      
      {!isTTSSupported && (
        <div className="warning-banner" role="alert">
          <span aria-hidden="true">🚫</span>
          <strong>Text-to-speech not supported:</strong> Your browser does not support speech synthesis.
        </div>
      )}

      {/* Speech Controls */}
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

      {/* Transcription Display */}
      <TranscriptionPanel
        transcript={transcript}
        interimTranscript={interimTranscript}
        timestamp={timestamp}
        onClear={handleClear}
        onCopy={handleCopy}
      />

      {/* Scene Narration — reuses existing camera stream */}
      <EnvDetector
        streamRef={streamRef}
        onAnnouncement={onLiveMessage}
      />

      {/* Keyboard Shortcuts Help */}
      <section className="keyboard-help" aria-labelledby="shortcuts-heading">
        <h3 id="shortcuts-heading" className="help-title">
          <span aria-hidden="true">⌨️</span> Keyboard Shortcuts
        </h3>
        <ul className="shortcuts-list">
          <li><kbd>Tab</kbd> Navigate between controls</li>
          <li><kbd>Enter</kbd> or <kbd>Space</kbd> Activate buttons</li>
          <li><kbd>Shift + Tab</kbd> Navigate backwards</li>
          <li><kbd>Esc</kbd> Stop listening or speaking</li>
        </ul>
      </section>
    </div>
  );
}
