'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSpeechRecognition } from '@/hooks';
import SignLanguageCanvas from './SignLanguageCanvas';
import SignLanguageTranslationR3F from './SignLanguageTranslationR3F';
import AvatarRenderer from './AvatarRenderer';
import CwasaAvatarRenderer from './CwasaAvatarRenderer';
import StatusIndicator from './StatusIndicator';
import { signDictionaryService, ProcessedSignSequence, CURATED_SIGN_DICTIONARY } from '@/services/signDictionaryService';

export default function DeafBridge() {
  const [inputText, setInputText] = useState('');
  const [activeSignText, setActiveSignText] = useState('');
  const [signingStatus, setSigningStatus] = useState('Idle');
  const [signingSpeed, setSigningSpeed] = useState(1.0);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'ta-IN' | 'thanglish'>('en-IN');

  // Kozha Integration State
  const [rendererMode, setRendererMode] = useState<'cwasa' | 'r3f'>('r3f');
  const [selectedAvatar, setSelectedAvatar] = useState<'anna' | 'marc' | 'francoise' | 'luna' | 'siggi'>('anna');
  const [signLanguage, setSignLanguage] = useState<'ISL' | 'BSL' | 'ASL' | 'DGS' | 'LSF'>('ISL');
  const [useAiTranslator, setUseAiTranslator] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'translate' | 'dictionary' | 'inspector'>('translate');

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

  // Async Kozha NLP Plan state
  const [processedSequence, setProcessedSequence] = useState<ProcessedSignSequence>({
    tokens: [],
    sigmlSequence: '',
    signBreakdown: [],
  });

  // Process input text through signDictionaryService (Kozha Backend + Local Fallback)
  useEffect(() => {
    let isMounted = true;
    if (!activeSignText.trim()) {
      setProcessedSequence({ tokens: [], sigmlSequence: '', signBreakdown: [] });
      return;
    }

    // Set immediate local processing so responsive UI isn't blocked
    const initialLocal = signDictionaryService.processTextToSign(activeSignText, signLanguage);
    setProcessedSequence(initialLocal);

    // Fetch async NLP plan from Kozha Engine on port 8001
    signDictionaryService.fetchKozhaPlan(activeSignText, signLanguage, useAiTranslator).then((plan) => {
      if (isMounted && plan && plan.sigmlSequence) {
        setProcessedSequence(plan);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeSignText, signLanguage, useAiTranslator]);

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
    setProcessedSequence({ tokens: [], sigmlSequence: '', signBreakdown: [] });
  }, [clearTranscript]);

  // Fast preset phrases triggers
  const handlePresetTrigger = useCallback((phrase: string) => {
    setActiveSignText(phrase);
  }, []);

  // Filtered dictionary entries for dictionary tab
  const dictionaryEntries = useMemo(() => {
    return signDictionaryService.searchEntries(searchQuery);
  }, [searchQuery]);

  return (
    <div className="deaf-bridge flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bridge-header bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="bridge-title text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <span aria-hidden="true" className="text-3xl">🤟</span> Deaf / HoH Assistive Bridge
            </h2>
            <p className="bridge-description text-slate-400 mt-1 text-sm md:text-base">
              Real-time Speech & Text to 3D Sign Language (ISL / BSL / ASL) with Kozha AI Translation & SiGML pipeline.
            </p>
          </div>

          {/* Renderer & Sign Language & Avatar Model Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 shadow-md">
            {/* AI Translator Toggle */}
            <button
              onClick={() => setUseAiTranslator(!useAiTranslator)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                useAiTranslator
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-indigo-400 text-white shadow-md'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Toggle AI LLM Text-to-Sign Gloss Translation"
            >
              <span>✨ AI Sign Mode:</span>
              <span className="uppercase">{useAiTranslator ? 'ON' : 'OFF'}</span>
            </button>

            {/* Renderer Switcher */}
            <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setRendererMode('cwasa')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  rendererMode === 'cwasa'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CWASA 3D Avatar
              </button>
              <button
                onClick={() => setRendererMode('r3f')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  rendererMode === 'r3f'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Three.js R3F Avatar
              </button>
            </div>

            {/* Avatar Model Choice (Anna, Marc, Francoise, Luna, Siggi) */}
            {rendererMode === 'cwasa' && (
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  👤 Avatar:
                </span>
                <select
                  value={selectedAvatar}
                  onChange={(e) => setSelectedAvatar(e.target.value as any)}
                  className="bg-slate-950 text-cyan-300 font-bold border border-cyan-500/40 rounded-md px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="anna">Anna (Female)</option>
                  <option value="marc">Marc (Male)</option>
                  <option value="francoise">Francoise (Female)</option>
                  <option value="luna">Luna (Stylized)</option>
                  <option value="siggi">Siggi (Male)</option>
                </select>
              </div>
            )}

            {/* Sign Language Selector */}
            <select
              value={signLanguage}
              onChange={(e) => setSignLanguage(e.target.value as any)}
              className="bg-slate-900 text-cyan-400 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="ISL">Indian Sign Language (ISL)</option>
              <option value="BSL">British Sign Language (BSL)</option>
              <option value="ASL">American Sign Language (ASL)</option>
              <option value="DGS">German Sign Language (DGS)</option>
              <option value="LSF">French Sign Language (LSF)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="deaf-layout grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar Viewport Pane (7 cols) */}
        <div className="avatar-column lg:col-span-7 flex flex-col gap-4">
          {/* Avatar Viewport Wrapper */}
          <div className="avatar-container-wrapper relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 min-h-[480px]">
            {rendererMode === 'cwasa' ? (
              <CwasaAvatarRenderer
                sigmlText={processedSequence.sigmlSequence}
                avatarName={selectedAvatar}
                signingSpeed={signingSpeed}
                onStatusChange={setSigningStatus}
              />
            ) : (
              <SignLanguageTranslationR3F
                textToSign={activeSignText}
                signingSpeed={signingSpeed}
                onStatusChange={setSigningStatus}
              />
            )}
          </div>

          {/* Avatar Bar Controls */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusIndicator
                state={listeningState}
                error={speechError ? { type: 'unknown', message: speechError.message } : null}
              />
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    signingStatus !== 'Idle' ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span>Status: <strong className="text-cyan-400">{signingStatus}</strong></span>
              </div>
            </div>

            {/* CWASA Avatar Choice & Speed controls */}
            {rendererMode === 'cwasa' && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 font-medium">Avatar:</label>
                <select
                  value={selectedAvatar}
                  onChange={(e) => setSelectedAvatar(e.target.value as any)}
                  className="bg-slate-950 text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 text-xs outline-none"
                >
                  <option value="anna">Anna (Female)</option>
                  <option value="marc">Marc (Male)</option>
                  <option value="francoise">Francoise (Female)</option>
                  <option value="luna">Luna (Stylized)</option>
                  <option value="siggi">Siggi (Male)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Tabs & Inputs (5 cols) */}
        <div className="controls-column lg:col-span-5 flex flex-col gap-4">
          {/* Sub-Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/40 rounded-t-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('translate')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'translate'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⌨️ Live Translator
            </button>
            <button
              onClick={() => setActiveTab('dictionary')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'dictionary'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📖 Sign Library
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'inspector'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔬 Notation Inspector
            </button>
          </div>

          {/* TAB 1: Live Translator & Speech */}
          {activeTab === 'translate' && (
            <div className="flex flex-col gap-4">
              {/* Text Translation Panel */}
              <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⌨️</span> Text-to-Sign Translation
                </h3>
                <textarea
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none h-24 placeholder-slate-500"
                  placeholder="Type words here (e.g. 'hello thank you please help doctor') to sign..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTranslate();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all disabled:opacity-50"
                    onClick={handleTranslate}
                    disabled={!inputText.trim()}
                  >
                    Translate to Sign
                  </button>
                  <button
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-xl text-xs transition-all disabled:opacity-50"
                    onClick={handleClear}
                    disabled={!inputText && !activeSignText && !transcript}
                  >
                    Clear
                  </button>
                </div>
              </section>

              {/* Speech Input Panel */}
              <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🎙️</span> Real-time Speech Input
                </h3>
                <p className="text-xs text-slate-400">
                  Speak clearly into your microphone; spoken sentences are converted to 3D sign language in real time.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={startListening}
                    disabled={listeningState === 'listening' || listeningState === 'processing' || !isSTTSupported}
                    className={`flex-1 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all ${
                      listeningState === 'listening'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    } disabled:opacity-50`}
                  >
                    🎤 Start Listening
                  </button>
                  <button
                    onClick={stopListening}
                    disabled={listeningState !== 'listening' && listeningState !== 'processing'}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-50"
                  >
                    ⏹️ Stop
                  </button>
                </div>

                {transcript && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                    <span className="text-cyan-400 font-bold">Heard speech:</span>{' '}
                    <span className="text-slate-200">{transcript}</span>
                  </div>
                )}
              </section>

              {/* Quick Expressions Grid */}
              <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-2">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <span>⚡</span> Quick Sign Presets
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {['Namaste', 'Thanks', 'Please', 'Help', 'Doctor', 'Hospital', 'Yes', 'No', 'Sorry'].map((phrase) => (
                    <button
                      key={phrase}
                      onClick={() => handlePresetTrigger(phrase)}
                      className="bg-slate-950 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: Sign Dictionary Library */}
          {activeTab === 'dictionary' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4 max-h-[500px] overflow-hidden">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-white">📖 Sign Language Dictionary ({signLanguage})</h3>
                <input
                  type="text"
                  placeholder="Search sign words (e.g. 'help', 'doctor', 'thanks')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 min-h-[300px]">
                {dictionaryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-cyan-300">{entry.gloss}</span>
                        <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-semibold">
                          {entry.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{entry.movement} ({entry.location})</p>
                    </div>
                    <button
                      onClick={() => handlePresetTrigger(entry.gloss)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shrink-0"
                    >
                      Sign 3D
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: HamNoSys & SiGML Inspector */}
          {activeTab === 'inspector' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4 max-h-[500px] overflow-y-auto">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔬</span> HamNoSys & SiGML Notation Inspector
              </h3>
              
              <div className="flex flex-col gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-cyan-400">Active Input Sentence:</span>
                    {processedSequence.plannerSource && (
                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded text-[10px] font-mono">
                        {processedSequence.plannerSource}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200">{activeSignText || '(No active input)'}</p>
                  {processedSequence.facialExpression && processedSequence.facialExpression !== 'neutral' && (
                    <p className="text-[11px] text-purple-300 font-semibold mt-1">
                      😊 Expression / Non-Manual Marker: {processedSequence.facialExpression}
                    </p>
                  )}
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-xs font-bold text-cyan-400 mb-2">Token Gloss Breakdown:</p>
                  <div className="flex flex-col gap-2">
                    {processedSequence.signBreakdown.map((item, idx) => (
                      <div key={idx} className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">{item.word}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${item.isFingerspelled ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
                            {item.isFingerspelled ? 'Fingerspelled' : 'Gloss Match'}
                          </span>
                        </div>
                        {item.hamnosys && (
                          <p className="text-[11px] text-slate-400 font-mono">HamNoSys: {item.hamnosys}</p>
                        )}
                      </div>
                    ))}
                    {processedSequence.signBreakdown.length === 0 && (
                      <p className="text-xs text-slate-500 italic">No breakdown available yet.</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-xs font-bold text-cyan-400 mb-1">Generated SiGML XML Output:</p>
                  <pre className="bg-black/50 p-2.5 rounded-lg text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-36">
                    {processedSequence.sigmlSequence || '<!-- Waiting for input to generate SiGML -->'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
