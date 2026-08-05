'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSpeechRecognition } from '@/hooks';
import CwasaAvatarRenderer from './CwasaAvatarRenderer';
import StatusIndicator from './StatusIndicator';
import { signDictionaryService, ProcessedSignSequence } from '@/services/signDictionaryService';

export default function DeafBridge() {
  const [inputText, setInputText] = useState('');
  const [activeSignText, setActiveSignText] = useState('');
  const [signingStatus, setSigningStatus] = useState('Idle');
  const [signingSpeed, setSigningSpeed] = useState(1.0);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'ta-IN' | 'thanglish'>('en-IN');
  const [playNonce, setPlayNonce] = useState(0);

  // Kozha Integration State (BSL + ISL only)
  const [selectedAvatar, setSelectedAvatar] = useState<'anna' | 'marc' | 'francoise' | 'luna' | 'siggi'>('anna');
  const [signLanguage, setSignLanguage] = useState<'ISL' | 'BSL'>('ISL');
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

    // Start with the local Kozha database mapping so the UI isn't blocked.
    signDictionaryService.processTextToSign(activeSignText, signLanguage).then((localPlan) => {
      if (isMounted && localPlan.sigmlSequence) {
        setProcessedSequence(localPlan);
      }
    });

    // Then fetch the real Kozha NLP plan (port 8001) and re-map onto the DB.
    signDictionaryService.fetchKozhaPlan(activeSignText, signLanguage).then((plan) => {
      if (isMounted && plan && plan.sigmlSequence) {
        setProcessedSequence(plan);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeSignText, signLanguage]);

  // Watch for new voice transcripts and forward them to the avatar
  useEffect(() => {
    if (transcript) {
      setActiveSignText(transcript);
      setPlayNonce((prev) => prev + 1);
    }
  }, [transcript]);

  // Handle typing translation
  const handleTranslate = useCallback(() => {
    if (inputText.trim()) {
      setActiveSignText(inputText);
      setPlayNonce((prev) => prev + 1);
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
    setPlayNonce((prev) => prev + 1);
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
    <div className="deaf-bridge flex flex-col gap-6 w-full max-w-[1340px] mx-auto p-4 md:p-6 text-[#1E293B] dark:text-[#F8FAFC]">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-5 md:p-6 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2.5">
                <span className="text-3xl">🤟</span> Deaf / HoH Assistive Bridge
              </h2>
              <span className="navy-badge-pill">
                Kozha 3D v2.0
              </span>
              <span className="navy-badge-pill bg-[#0F4C81]/15 text-[#0F4C81] dark:bg-[#3B82F6]/20 dark:text-[#93C5FD]">
                {signLanguage}
              </span>
            </div>
            <p className="text-[#475569] dark:text-[#CBD5E1] mt-1.5 text-sm md:text-base max-w-2xl font-medium">
              Real-time Speech & Text to 3D Sign Language with Kozha AI Translation, SiGML Parser & HamNoSys Inspector.
            </p>
          </div>

          {/* Unified Global Control Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#CBD5E1] dark:border-[#334155]">
            {/* Avatar Selection */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#1E293B] px-2.5 py-1 rounded-lg border border-[#CBD5E1] dark:border-[#334155]">
              <label className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">Character:</label>
              <select
                value={selectedAvatar}
                onChange={(e) => setSelectedAvatar(e.target.value as any)}
                className="bg-transparent text-[#0F4C81] dark:text-[#60A5FA] font-bold text-xs outline-none cursor-pointer"
              >
                <option value="anna">Anna (Female)</option>
                <option value="marc">Marc (Male)</option>
                <option value="francoise">Francoise (Female)</option>
                <option value="luna">Luna (Stylized)</option>
                <option value="siggi">Siggi (Male)</option>
              </select>
            </div>

            {/* Sign Language Selection (BSL + ISL only) */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#1E293B] px-2.5 py-1 rounded-lg border border-[#CBD5E1] dark:border-[#334155]">
              <label className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold">Sign System:</label>
              <select
                value={signLanguage}
                onChange={(e) => setSignLanguage(e.target.value as any)}
                className="bg-transparent text-[#0F4C81] dark:text-[#60A5FA] font-bold text-xs outline-none cursor-pointer"
              >
                <option value="ISL">Indian (ISL)</option>
                <option value="BSL">British (BSL)</option>
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
          <div className="relative w-full rounded-2xl overflow-hidden border border-[#D8E2EC] dark:border-[#334155] bg-[#0F172A] shadow-xl flex flex-col min-h-[500px]">
            
            {/* Viewport Header Bar inside Studio */}
            <div className="bg-[#1E293B]/90 border-b border-[#334155] px-4 py-2.5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-200">
                  {`CWASA 3D (${selectedAvatar.toUpperCase()})`}
                </span>
              </div>

              {/* Speed Controls (0.5x, 0.75x, 1x, 1.25x, 1.5x) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Speed:</span>
                {[0.5, 0.75, 1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSigningSpeed(speed)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all cursor-pointer ${
                      signingSpeed === speed
                        ? 'bg-[#0F4C81] dark:bg-[#3B82F6] text-white shadow-xs'
                        : 'bg-[#0F172A] text-slate-400 hover:text-slate-200 border border-[#334155]'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Renderer Canvas Area (Kozha / CWASA) */}
            <div className="relative flex-1 w-full bg-[#0F172A] min-h-[440px]">
              <CwasaAvatarRenderer
                sigmlText={processedSequence.sigmlSequence}
                avatarName={selectedAvatar}
                signingSpeed={signingSpeed}
                onStatusChange={setSigningStatus}
                playNonce={playNonce}
              />
            </div>

            {/* Viewport Bottom Status Bar */}
            <div className="bg-[#1E293B] border-t border-[#334155] p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <StatusIndicator
                  state={listeningState}
                  error={speechError ? { type: 'unknown', message: speechError.message } : null}
                />
                <div className="truncate">
                  <span className="text-slate-400 font-medium">Status: </span>
                  <span className={`font-bold ${signingStatus !== 'Idle' ? 'text-[#38BDF8]' : 'text-slate-300'}`}>
                    {signingStatus}
                  </span>
                </div>
              </div>

              {activeSignText && (
                <div className="hidden sm:flex items-center gap-2 bg-[#0F172A] px-3 py-1 rounded-lg border border-[#334155] truncate">
                  <span className="text-slate-400 font-medium">Signing:</span>
                  <span className="text-[#38BDF8] font-bold truncate max-w-[200px]">{activeSignText}</span>
                  <button
                    onClick={handleClear}
                    className="text-slate-400 hover:text-rose-400 font-bold ml-1 text-xs cursor-pointer"
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
          <div className="grid grid-cols-3 bg-[#EEF2F6] dark:bg-[#0F172A] p-1.5 rounded-xl border border-[#CBD5E1] dark:border-[#334155] gap-1 text-center">
            <button
              onClick={() => setActiveTab('translate')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'translate'
                  ? 'bg-[#0F4C81] dark:bg-[#3B82F6] text-white shadow-md'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F4C81] dark:hover:text-slate-200'
              }`}
            >
              ⌨️ Translator
            </button>
            <button
              onClick={() => setActiveTab('dictionary')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'dictionary'
                  ? 'bg-[#0F4C81] dark:bg-[#3B82F6] text-white shadow-md'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F4C81] dark:hover:text-slate-200'
              }`}
            >
              📖 Sign Library
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'inspector'
                  ? 'bg-[#0F4C81] dark:bg-[#3B82F6] text-white shadow-md'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F4C81] dark:hover:text-slate-200'
              }`}
            >
              🔬 Inspector
            </button>
          </div>

          {/* TAB 1: Live Translator */}
          {activeTab === 'translate' && (
            <div className="flex flex-col gap-4">
              
              {/* Text Translation Card */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-xl p-5 shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                    <span>⌨️</span> Text-to-Sign Input
                  </h3>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-500 font-mono">
                    {inputText.length} chars
                  </span>
                </div>

                <textarea
                  className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] text-[#1E293B] dark:text-slate-100 border border-[#CBD5E1] dark:border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-[#0F4C81] dark:focus:border-[#3B82F6] resize-none h-24 placeholder-slate-400 font-sans"
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
                    className="flex-1 navy-btn-primary py-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                    onClick={handleTranslate}
                    disabled={!inputText.trim()}
                  >
                    Translate to 3D Sign
                  </button>
                  <button
                    className="navy-btn-secondary py-2.5 text-xs disabled:opacity-40"
                    onClick={handleClear}
                    disabled={!inputText && !activeSignText && !transcript}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Real-time Speech Input Card */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-xl p-5 shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                    <span>🎙️</span> Voice Speech Input
                  </h3>
                  
                  {/* Voice Language Selector */}
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as any)}
                    className="bg-[#F8FAFC] dark:bg-[#0F172A] text-[#1E293B] dark:text-slate-300 border border-[#CBD5E1] dark:border-[#334155] rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
                  >
                    <option value="en-IN">English (IN)</option>
                    <option value="ta-IN">Tamil (India)</option>
                    <option value="thanglish">Tanglish</option>
                  </select>
                </div>

                <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
                  Speak clearly into your microphone. Spoken words are converted directly to 3D sign glosses.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={startListening}
                    disabled={listeningState === 'listening' || listeningState === 'processing' || !isSTTSupported}
                    className={`flex-1 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer ${
                      listeningState === 'listening'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'navy-btn-primary'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    🎤 {listeningState === 'listening' ? 'Listening...' : 'Start Listening'}
                  </button>
                  <button
                    onClick={stopListening}
                    disabled={listeningState !== 'listening' && listeningState !== 'processing'}
                    className="navy-btn-secondary py-2.5 text-xs disabled:opacity-40"
                  >
                    ⏹️ Stop
                  </button>
                </div>

                {transcript && (
                  <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-xs">
                    <span className="text-[#0F4C81] dark:text-[#60A5FA] font-bold">Speech Transcript:</span>{' '}
                    <span className="text-[#1E293B] dark:text-slate-200">{transcript}</span>
                  </div>
                )}
              </div>

              {/* Categorized Quick Sign Presets Card */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-xl p-4 shadow-md flex flex-col gap-3">
                <h3 className="text-xs font-bold text-[#334155] dark:text-slate-300 flex items-center gap-1.5">
                  <span>⚡</span> Quick Sign Presets
                </h3>
                
                <div className="flex flex-col gap-2.5">
                  {presetCategories.map((cat) => (
                    <div key={cat.title} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                        {cat.title}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map((phrase) => (
                          <button
                            key={phrase}
                            onClick={() => handlePresetTrigger(phrase)}
                            className="bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#EEF2F6] dark:hover:bg-[#1E293B] border border-[#CBD5E1] dark:border-[#334155] text-[#1E293B] dark:text-slate-200 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer"
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
            <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-xl p-5 shadow-md flex flex-col gap-4 max-h-[560px]">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">📖 Sign Library ({signLanguage})</h3>
                  <span className="text-xs navy-badge-pill">
                    {dictionaryEntries.length} Signs
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Search sign dictionary (e.g. 'help', 'doctor', 'thanks')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="navy-input w-full text-xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[340px]">
                {dictionaryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] rounded-xl p-3 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#0F4C81] dark:text-[#60A5FA]">{entry.gloss}</span>
                        <span className="text-[10px] navy-badge-pill">
                          {entry.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">{entry.movement} ({entry.location})</p>
                    </div>
                    <button
                      onClick={() => handlePresetTrigger(entry.gloss)}
                      className="navy-btn-primary px-3 py-1.5 text-xs shrink-0 shadow-xs"
                    >
                      Sign 3D
                    </button>
                  </div>
                ))}

                {dictionaryEntries.length === 0 && (
                  <div className="text-center py-8 text-[#64748B] dark:text-slate-500 text-xs italic">
                    No matching sign entries found for "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Notation Inspector */}
          {activeTab === 'inspector' && (
            <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-xl p-5 shadow-md flex flex-col gap-4 max-h-[560px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span>🔬</span> Notation & SiGML Inspector
                </h3>
                {processedSequence.sigmlSequence && (
                  <button
                    onClick={handleCopySigml}
                    className="navy-btn-secondary px-2.5 py-1 text-xs font-bold"
                  >
                    {copiedSigml ? '✓ Copied!' : '📋 Copy SiGML'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                
                {/* Active Sentence & Engine Info */}
                <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#CBD5E1] dark:border-[#334155] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#0F4C81] dark:text-[#60A5FA]">Active Sentence:</span>
                    {processedSequence.plannerSource && (
                      <span className="navy-badge-pill text-[10px] font-mono">
                        {processedSequence.plannerSource}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#1E293B] dark:text-slate-200 font-medium">
                    {activeSignText || '(No active input sentence)'}
                  </p>
                  {processedSequence.facialExpression && processedSequence.facialExpression !== 'neutral' && (
                    <p className="text-[11px] text-purple-600 dark:text-purple-300 font-semibold mt-1">
                      😊 Non-Manual Expression: {processedSequence.facialExpression}
                    </p>
                  )}
                </div>

                {/* Token Breakdown List */}
                <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#CBD5E1] dark:border-[#334155]">
                  <p className="text-xs font-bold text-[#0F4C81] dark:text-[#60A5FA] mb-2">Gloss Sequence Breakdown:</p>
                  <div className="flex flex-col gap-2">
                    {processedSequence.signBreakdown.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-[#1E293B] p-2.5 rounded-lg border border-[#CBD5E1] dark:border-[#334155] text-xs flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#0F172A] dark:text-white">{item.word}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            item.isFingerspelled 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                              : 'navy-badge-live'
                          }`}>
                            {item.isFingerspelled ? 'Fingerspelled' : 'Gloss Match'}
                          </span>
                        </div>
                        {item.hamnosys && (
                          <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono">HamNoSys: {item.hamnosys}</p>
                        )}
                      </div>
                    ))}

                    {processedSequence.signBreakdown.length === 0 && (
                      <p className="text-xs text-[#64748B] dark:text-slate-500 italic">No token breakdown available yet.</p>
                    )}
                  </div>
                </div>

                {/* SiGML XML Output Box */}
                <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#CBD5E1] dark:border-[#334155]">
                  <p className="text-xs font-bold text-[#0F4C81] dark:text-[#60A5FA] mb-1.5">Generated SiGML XML Output:</p>
                  <pre className="bg-[#0F172A] p-3 rounded-lg text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-40 border border-slate-800">
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
