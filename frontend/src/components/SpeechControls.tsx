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
    <div className="speech-controls" role="region" aria-label="Speech controls">
      {/* STT Controls */}
      <section className="control-section" aria-labelledby="stt-heading">
        <h3 id="stt-heading" className="section-title">
          <span aria-hidden="true">🎙️</span> Speech-to-Text
        </h3>
        <div className="control-buttons">
          <button
            onClick={onStartListening}
            disabled={isListening || isProcessing || !isSTTSupported}
            className={`control-btn primary ${isListening ? 'active' : ''}`}
            aria-label="Start voice dictation"
            aria-pressed={isListening}
          >
            <span className="btn-icon" aria-hidden="true">
              {isListening ? '🔴' : '🎤'}
            </span>
            <span className="btn-text">
              {isListening ? 'Listening' : isProcessing ? 'Starting...' : 'Start Dictation'}
            </span>
          </button>
          
          <button
            onClick={onStopListening}
            disabled={!isListening && !isProcessing}
            className="control-btn secondary"
            aria-label="Stop voice dictation"
          >
            <span className="btn-icon" aria-hidden="true">⏹️</span>
            <span className="btn-text">Stop Dictation</span>
          </button>
        </div>
      </section>

      {/* TTS Controls */}
      <section className="control-section" aria-labelledby="tts-heading">
        <h3 id="tts-heading" className="section-title">
          <span aria-hidden="true">🔊</span> Text-to-Speech
        </h3>
        <div className="control-buttons">
          <button
            onClick={onSpeak}
            disabled={!hasTranscript || isSpeaking || !isTTSSupported}
            className="control-btn primary"
            aria-label="Read transcription aloud"
          >
            <span className="btn-icon" aria-hidden="true">📢</span>
            <span className="btn-text">Read Aloud</span>
          </button>
          
          <button
            onClick={onPause}
            disabled={!isSpeaking}
            className="control-btn secondary"
            aria-label="Pause speech"
            aria-pressed={isPaused}
          >
            <span className="btn-icon" aria-hidden="true">⏸️</span>
            <span className="btn-text">Pause</span>
          </button>
          
          <button
            onClick={onResume}
            disabled={!isPaused}
            className="control-btn secondary"
            aria-label="Resume speech"
          >
            <span className="btn-icon" aria-hidden="true">▶️</span>
            <span className="btn-text">Resume</span>
          </button>
          
          <button
            onClick={onStop}
            disabled={speechState === 'idle'}
            className="control-btn danger"
            aria-label="Stop speech"
          >
            <span className="btn-icon" aria-hidden="true">⏹️</span>
            <span className="btn-text">Stop</span>
          </button>
        </div>
      </section>

      {/* Voice Settings */}
      <section className="control-section voice-settings" aria-labelledby="voice-heading">
        <h3 id="voice-heading" className="section-title">
          <span aria-hidden="true">⚙️</span> Voice Settings
        </h3>
        
        <div className="settings-grid">
          <div className="setting-item">
            <label htmlFor="lang-select" className="setting-label">
              Select Language
            </label>
            <select
              id="lang-select"
              value={selectedLanguage}
              onChange={(e) => {
                onLanguageChange(e.target.value as any);
              }}
              disabled={!isTTSSupported}
              className="setting-select"
              aria-describedby="voice-help"
            >
              <option value="en-IN">Indian English</option>
              <option value="ta-IN">Tamil</option>
              <option value="thanglish">Thanglish</option>
            </select>
            <span id="voice-help" className="sr-only">
              Choose a language for Speech-to-Text and Text-to-Speech.
            </span>
          </div>

          <div className="setting-item">
            <label htmlFor="rate-slider" className="setting-label">
              Speech Rate: <span className="setting-value">{rate.toFixed(1)}x</span>
            </label>
            <input
              id="rate-slider"
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              disabled={!isTTSSupported}
              className="setting-slider"
              aria-label="Adjust speech rate"
              aria-valuemin={0.1}
              aria-valuemax={2}
              aria-valuenow={rate}
            />
            <div className="slider-labels">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>

          <div className="setting-item">
            <label htmlFor="pitch-slider" className="setting-label">
              Pitch: <span className="setting-value">{pitch.toFixed(1)}</span>
            </label>
            <input
              id="pitch-slider"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              disabled={!isTTSSupported}
              className="setting-slider"
              aria-label="Adjust voice pitch"
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={pitch}
            />
            <div className="slider-labels">
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
