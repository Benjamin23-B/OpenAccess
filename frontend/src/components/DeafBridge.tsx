'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSpeechRecognition } from '@/hooks';
import SignLanguageTranslationR3F from './SignLanguageTranslationR3F';
import CwasaAvatarRenderer from './CwasaAvatarRenderer';
import StatusIndicator from './StatusIndicator';
import { signDictionaryService, ProcessedSignSequence } from '@/services/signDictionaryService';

export default function DeafBridge() {
  const [inputText, setInputText] = useState('');
  const [activeSignText, setActiveSignText] = useState('');
  const [signingStatus, setSigningStatus] = useState('Idle');
  const [signingSpeed, setSigningSpeed] = useState(1.0);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'ta-IN' | 'thanglish'>('en-IN');

  // Kozha Integration State
  const [rendererMode, setRendererMode] = useState<'cwasa' | 'r3f'>('cwasa');
  const [selectedAvatar, setSelectedAvatar] = useState<'anna' | 'marc' | 'francoise' | 'luna' | 'siggi'>('anna');
  const [signLanguage, setSignLanguage] = useState<'ISL' | 'BSL' | 'ASL' | 'DGS' | 'LSF'>('BSL');
  const [useAiTranslator, setUseAiTranslator] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'translate' | 'dictionary' | 'inspector'>('translate');
  const [copiedSigml, setCopiedSigml] = useState(false);

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
    setInputText(phrase);
    setActiveSignText(phrase);
  }, []);

  // Filtered dictionary entries for dictionary tab
  const dictionaryEntries = useMemo(() => {
    return signDictionaryService.searchEntries(searchQuery);
  }, [searchQuery]);

  // Copy SiGML XML to Clipboard
  const handleCopySigml = useCallback(() => {
    if (processedSequence.sigmlSequence) {
      navigator.clipboard.writeText(processedSequence.sigmlSequence);
      setCopiedSigml(true);
      setTimeout(() => setCopiedSigml(false), 2000);
    }
  }, [processedSequence.sigmlSequence]);

  // Categorized quick presets
  const presetCategories = [
    { title: 'Greetings', items: ['Namaste', 'Hello', 'Welcome', 'Thanks'] },
    { title: 'Emergency', items: ['Help', 'Doctor', 'Hospital', 'Danger'] },
    { title: 'Essentials', items: ['Please', 'Sorry', 'Yes', 'No', 'Water'] },
  ];

  return (
    <div className="deaf-bridge flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <span className="text-3xl">🤟</span> Deaf / HoH Assistive Bridge
              </h2>
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                Kozha 3D v2.0
              </span>
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                {signLanguage}
              </span>
            </div>
            <p className="text-slate-400 mt-1.5 text-sm md:text-base max-w-2xl">
              Real-time Speech & Text to 3D Sign Language with Kozha AI Translation, SiGML Parser & HamNoSys Inspector.
            </p>
          </div>

          {/* Unified Global Control Toolbar (No Duplicates) */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
            {/* AI Sign Mode Toggle */}
            <button
              onClick={() => setUseAiTranslator(!useAiTranslator)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                useAiTranslator
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-indigo-400 text-white shadow-md'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Kozha AI LLM Gloss Translation"
            >
              <span>✨ AI Sign Mode:</span>
              <span className="font-extrabold uppercase">{useAiTranslator ? 'ON' : 'OFF'}</span>
            </button>

            {/* Renderer Switcher */}
            <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setRendererMode('cwasa')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  rendererMode === 'cwasa'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CWASA 3D WebGL
              </button>
              <button
                onClick={() => setRendererMode('r3f')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  rendererMode === 'r3f'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Three.js R3F
              </button>
            </div>

            {/* Avatar Selection (Shown when CWASA mode is active) */}
            {rendererMode === 'cwasa' && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <label className="text-xs text-slate-400 font-medium">Character:</label>
                <select
                  value={selectedAvatar}
                  onChange={(e) => setSelectedAvatar(e.target.value as any)}
                  className="bg-slate-950 text-cyan-300 font-bold border border-slate-700 rounded-md px-2 py-0.5 text-xs outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="anna">Anna (Female)</option>
                  <option value="marc">Marc (Male)</option>
                  <option value="francoise">Francoise (Female)</option>
                  <option value="luna">Luna (Stylized)</option>
                  <option value="siggi">Siggi (Male)</option>
                </select>
              </div>
            )}

            {/* Sign Language Selection */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <label className="text-xs text-slate-400 font-medium">Sign System:</label>
              <select
                value={signLanguage}
                onChange={(e) => setSignLanguage(e.target.value as any)}
                className="bg-slate-950 text-cyan-400 font-bold border border-slate-700 rounded-md px-2 py-0.5 text-xs outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ISL">Indian (ISL)</option>
                <option value="BSL">British (BSL)</option>
                <option value="ASL">American (ASL)</option>
                <option value="DGS">German (DGS)</option>
                <option value="LSF">French (LSF)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Studio Viewport + Right Controls Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: 3D Viewport Studio Frame (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Studio Container Box */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col min-h-[500px]">
            
            {/* Viewport Header Bar inside Studio */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-300">
                  {rendererMode === 'cwasa' ? `CWASA 3D (${selectedAvatar.toUpperCase()})` : 'Three.js R3F Avatar'}
                </span>
              </div>

              {/* Speed Controls (0.5x, 0.75x, 1x, 1.25x, 1.5x) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Speed:</span>
                {[0.5, 0.75, 1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSigningSpeed(speed)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                      signingSpeed === speed
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Renderer Canvas Area */}
            <div className="relative flex-1 w-full bg-slate-950 min-h-[440px]">
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

            {/* Viewport Bottom Status Bar */}
            <div className="bg-slate-900 border-t border-slate-800 p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <StatusIndicator
                  state={listeningState}
                  error={speechError ? { type: 'unknown', message: speechError.message } : null}
                />
                <div className="truncate">
                  <span className="text-slate-400 font-medium">Status: </span>
                  <span className={`font-bold ${signingStatus !== 'Idle' ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {signingStatus}
                  </span>
                </div>
              </div>

              {activeSignText && (
                <div className="hidden sm:flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 truncate">
                  <span className="text-slate-400 font-medium">Signing:</span>
                  <span className="text-cyan-300 font-bold truncate max-w-[200px]">{activeSignText}</span>
                  <button
                    onClick={handleClear}
                    className="text-slate-500 hover:text-rose-400 font-bold ml-1 text-xs"
                    title="Stop and clear active phrase"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Tabs & Inputs (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Sub-Navigation Tab Buttons */}
          <div className="grid grid-cols-3 bg-slate-900 p-1.5 rounded-xl border border-slate-800 gap-1 text-center">
            <button
              onClick={() => setActiveTab('translate')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'translate'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⌨️ Translator
            </button>
            <button
              onClick={() => setActiveTab('dictionary')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'dictionary'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📖 Sign Library
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'inspector'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔬 Inspector
            </button>
          </div>

          {/* TAB 1: Live Translator */}
          {activeTab === 'translate' && (
            <div className="flex flex-col gap-4">
              
              {/* Text Translation Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>⌨️</span> Text-to-Sign Input
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {inputText.length} chars
                  </span>
                </div>

                <textarea
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500 resize-none h-24 placeholder-slate-500 font-sans"
                  placeholder="Type text or sentence here (e.g. 'namaste hello doctor help'). Press Enter to sign..."
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
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                    onClick={handleTranslate}
                    disabled={!inputText.trim()}
                  >
                    Translate to 3D Sign
                  </button>
                  <button
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-40"
                    onClick={handleClear}
                    disabled={!inputText && !activeSignText && !transcript}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Real-time Speech Input Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🎙️</span> Voice Speech Input
                  </h3>
                  
                  {/* Voice Language Selector */}
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as any)}
                    className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2 py-1 text-xs outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="en-IN">English (IN)</option>
                    <option value="ta-IN">Tamil (India)</option>
                    <option value="thanglish">Tanglish</option>
                  </select>
                </div>

                <p className="text-xs text-slate-400">
                  Speak clearly into your microphone. Spoken words are converted directly to 3D sign glosses.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={startListening}
                    disabled={listeningState === 'listening' || listeningState === 'processing' || !isSTTSupported}
                    className={`flex-1 font-bold py-2.5 px-4 rounded-xl text-xs transition-all ${
                      listeningState === 'listening'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    🎤 {listeningState === 'listening' ? 'Listening...' : 'Start Listening'}
                  </button>
                  <button
                    onClick={stopListening}
                    disabled={listeningState !== 'listening' && listeningState !== 'processing'}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all disabled:opacity-40"
                  >
                    ⏹️ Stop
                  </button>
                </div>

                {transcript && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                    <span className="text-cyan-400 font-bold">Speech Transcript:</span>{' '}
                    <span className="text-slate-200">{transcript}</span>
                  </div>
                )}
              </div>

              {/* Categorized Quick Sign Presets Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span>⚡</span> Quick Sign Presets
                </h3>
                
                <div className="flex flex-col gap-2.5">
                  {presetCategories.map((cat) => (
                    <div key={cat.title} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {cat.title}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map((phrase) => (
                          <button
                            key={phrase}
                            onClick={() => handlePresetTrigger(phrase)}
                            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 py-1.5 px-3 rounded-lg text-xs font-medium transition-all"
                          >
                            {phrase}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Sign Library */}
          {activeTab === 'dictionary' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4 max-h-[560px]">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">📖 Sign Library ({signLanguage})</h3>
                  <span className="text-xs bg-slate-950 text-cyan-400 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono">
                    {dictionaryEntries.length} Signs
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Search sign dictionary (e.g. 'help', 'doctor', 'thanks')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[340px]">
                {dictionaryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-slate-950 hover:bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-cyan-300">{entry.gloss}</span>
                        <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-semibold">
                          {entry.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{entry.movement} ({entry.location})</p>
                    </div>
                    <button
                      onClick={() => handlePresetTrigger(entry.gloss)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 shadow"
                    >
                      Sign 3D
                    </button>
                  </div>
                ))}

                {dictionaryEntries.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs italic">
                    No matching sign entries found for "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Notation Inspector */}
          {activeTab === 'inspector' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4 max-h-[560px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🔬</span> Notation & SiGML Inspector
                </h3>
                {processedSequence.sigmlSequence && (
                  <button
                    onClick={handleCopySigml}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-400 px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                  >
                    {copiedSigml ? '✓ Copied!' : '📋 Copy SiGML'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                
                {/* Active Sentence & Engine Info */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-cyan-400">Active Sentence:</span>
                    {processedSequence.plannerSource && (
                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded text-[10px] font-mono">
                        {processedSequence.plannerSource}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 font-medium">
                    {activeSignText || '(No active input sentence)'}
                  </p>
                  {processedSequence.facialExpression && processedSequence.facialExpression !== 'neutral' && (
                    <p className="text-[11px] text-purple-300 font-semibold mt-1">
                      😊 Non-Manual Expression: {processedSequence.facialExpression}
                    </p>
                  )}
                </div>

                {/* Token Breakdown List */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-xs font-bold text-cyan-400 mb-2">Gloss Sequence Breakdown:</p>
                  <div className="flex flex-col gap-2">
                    {processedSequence.signBreakdown.map((item, idx) => (
                      <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">{item.word}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            item.isFingerspelled 
                              ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {item.isFingerspelled ? 'Fingerspelled' : 'Gloss Match'}
                          </span>
                        </div>
                        {item.hamnosys && (
                          <p className="text-[11px] text-slate-400 font-mono">HamNoSys: {item.hamnosys}</p>
                        )}
                      </div>
                    ))}

                    {processedSequence.signBreakdown.length === 0 && (
                      <p className="text-xs text-slate-500 italic">No token breakdown available yet.</p>
                    )}
                  </div>
                </div>

                {/* SiGML XML Output Box */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-xs font-bold text-cyan-400 mb-1.5">Generated SiGML XML Output:</p>
                  <pre className="bg-slate-900 p-3 rounded-lg text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-40 border border-slate-800">
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
