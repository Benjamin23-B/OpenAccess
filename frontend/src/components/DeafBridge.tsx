'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from '@/hooks';
import SignLanguage2DAvatar from './SignLanguage2DAvatar';
import StatusIndicator from './StatusIndicator';

export default function DeafBridge() {
  const [inputText, setInputText] = useState('');
  const [activeSignText, setActiveSignText] = useState('');
  const [signingStatus, setSigningStatus] = useState('Idle');
  const [signingSpeed, setSigningSpeed] = useState(1.0);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'ta-IN' | 'thanglish'>('en-IN');

  // Speech-to-text hook
  const {
    transcript,
    listeningState,
    error: speechError,
    isSupported: isSTTSupported,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition(selectedLanguage);

  // Watch for new voice transcripts and forward them to the avatar
  useEffect(() => {
    if (transcript) {
      setActiveSignText(transcript);
    }
  }, [transcript]);

  // Handle typing translation
  const handleTranslate = useCallback(() => {
    if (inputText.trim()) {
      setActiveSignText(inputText);
      setInputText('');
    }
  }, [inputText]);

  const handleClear = useCallback(() => {
    setInputText('');
    setActiveSignText('');
    clearTranscript();
    setSigningStatus('Idle');
  }, [clearTranscript]);

  // Fast preset phrases triggers
  const handlePresetTrigger = useCallback((phrase: string) => {
    setActiveSignText(phrase);
  }, []);

  return (
    <div className="deaf-bridge">
      <div className="bridge-header">
        <h2 className="bridge-title">
          <span aria-hidden="true">👋</span> Deaf / HoH Assistive Bridge
        </h2>
        <p className="bridge-description">
          Convert spoken speech and typed text into Indian Sign Language (ISL) animations in real time.
        </p>
      </div>

      <div className="deaf-layout">
        {/* Left Column: 2D Animated Avatar Viewport Pane */}
        <div className="avatar-column">
          <div className="avatar-container-wrapper">
            <SignLanguage2DAvatar
              textToSign={activeSignText}
              signingSpeed={signingSpeed}
              onStatusChange={setSigningStatus}
            />
          </div>

          {/* Status Indicators */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <StatusIndicator
              state={listeningState}
              error={speechError ? { type: 'unknown', message: speechError.message } : null}
            />
            <div className="env-detector-status" style={{ margin: 0 }}>
              <span className={`env-status-dot ${signingStatus !== 'Idle' ? 'active' : ''}`} style={{ backgroundColor: signingStatus !== 'Idle' ? 'var(--color-accent-primary)' : 'var(--color-border)' }} />
              <span className="env-status-text" style={{ fontSize: 'var(--font-size-sm)' }}>
                Avatar: <strong>{signingStatus}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Controls and Input */}
        <div className="controls-column">
          {/* Text Input Panel */}
          <section className="text-translation-panel" aria-labelledby="text-translation-heading">
            <h3 id="text-translation-heading" className="section-title">
              <span aria-hidden="true">⌨️</span> Text-to-Sign Translation
            </h3>
            
            <textarea
              className="translation-textarea"
              placeholder="Type words here (e.g. 'hello thank you please help') to sign..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTranslate();
                }
              }}
              aria-label="Text translation input"
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="control-btn primary"
                onClick={handleTranslate}
                disabled={!inputText.trim()}
                style={{ flex: 1 }}
              >
                Translate to Sign
              </button>
              <button
                className="control-btn secondary"
                onClick={handleClear}
                disabled={!inputText && !activeSignText && !transcript}
              >
                Clear
              </button>
            </div>
          </section>

          {/* Audio Input Panel */}
          <section className="text-translation-panel" aria-labelledby="audio-input-heading">
            <h3 id="audio-input-heading" className="section-title">
              <span aria-hidden="true">🎙️</span> Speech-to-Sign Input
            </h3>
            <p className="env-detector-description" style={{ margin: 0 }}>
              Speak clearly into your microphone; your spoken words will be instantly animated on the avatar.
            </p>

            <div className="setting-item" style={{ marginTop: '10px', marginBottom: '10px' }}>
              <label htmlFor="deaf-lang-select" className="setting-label" style={{ fontSize: 'var(--font-size-sm)', display: 'block', marginBottom: '5px' }}>
                Select Language
              </label>
              <select
                id="deaf-lang-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as any)}
                className="setting-select"
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
              >
                <option value="en-IN">Indian English</option>
                <option value="ta-IN">Tamil</option>
                <option value="thanglish">Thanglish</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <button
                onClick={startListening}
                disabled={listeningState === 'listening' || listeningState === 'processing' || !isSTTSupported}
                className={`control-btn primary ${listeningState === 'listening' ? 'active' : ''}`}
                style={{ flex: 1 }}
                aria-label="Start voice input"
              >
                🎤 Start Voice Input
              </button>
              <button
                onClick={stopListening}
                disabled={listeningState !== 'listening' && listeningState !== 'processing'}
                className="control-btn secondary"
                aria-label="Stop voice input"
              >
                ⏹️ Stop
              </button>
            </div>

            {transcript && (
              <div className="env-last-announcement" style={{ margin: 0, padding: 'var(--space-sm)' }}>
                <span className="env-announcement-label">Heard:</span>{' '}
                <span className="env-announcement-text" style={{ color: 'var(--color-text-primary)' }}>{transcript}</span>
              </div>
            )}
          </section>

          {/* Quick Phrases Preset Grid */}
          <section className="text-translation-panel" aria-labelledby="presets-heading">
            <h3 id="presets-heading" className="section-title">
              <span aria-hidden="true">💡</span> Quick Expressions (ISL Preset)
            </h3>
            <div className="preset-grid">
              {['Namaste', 'Thanks', 'Please', 'Help', 'Yes', 'No', 'Sorry', 'Love', 'Happy'].map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => handlePresetTrigger(phrase)}
                  className="preset-btn"
                  aria-label={`Sign ${phrase}`}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
