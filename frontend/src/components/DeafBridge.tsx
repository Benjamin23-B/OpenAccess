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
    <div className="deaf-bridge flex flex-col gap-6 md:gap-7 w-full max-w-[1340px] mx-auto p-4 md:p-6 text-[#1E293B] dark:text-[#F8FAFC]">

      {/* Section 1: Header Banner Card */}
      <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-8 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex flex-col gap-6 mb-2 overflow-hidden">
        {/* Top Title & Badges Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-[24px] md:text-[26px] font-bold text-[#16324F] dark:text-white tracking-tight flex items-center gap-2.5">
                <svg className="w-6.5 h-6.5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5a1.5 1.5 0 013 0v5.5m0 0V8a1.5 1.5 0 013 0v4.5" />
                </svg>
                Deaf / HoH Assistive Bridge
              </h2>
              <span className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/50 text-[#0F4C81] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#3B82F6]/40 text-[13px] font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap">
                Kozha 3D v2.0
              </span>
              <span className="bg-[#E8F5E9] dark:bg-[#166534]/40 text-[#198754] dark:text-[#86EFAC] border border-[#A5D6A7] dark:border-[#22C55E]/40 text-[13px] font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap">
                {signLanguage}
              </span>
            </div>
            <p className="text-[#475569] dark:text-[#CBD5E1] mt-1.5 text-[15px] leading-relaxed">
              Real-time Speech & Text to 3D Sign Language with Kozha AI Translation, SiGML Parser & HamNoSys Inspector.
            </p>
          </div>
        </div>

        {/* Dedicated Global Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#F4F7FB] dark:bg-[#0F172A] p-5 rounded-xl border border-[#D8E2EC] dark:border-[#334155] transition-colors duration-200 mt-1">

          <div className="flex flex-wrap items-center gap-4">
            {/* AI Sign Mode Toggle */}
            <button
              onClick={() => setUseAiTranslator(!useAiTranslator)}
              className={`h-[44px] px-5 py-2.5 text-[13px] font-bold rounded-xl border transition-all duration-200 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${useAiTranslator
                  ? 'bg-[#0F4C81] dark:bg-[#2563EB] border-[#0F4C81] dark:border-[#2563EB] text-white shadow-sm'
                  : 'bg-white dark:bg-[#1E293B] border-[#D8E2EC] dark:border-[#334155] text-[#64748B] dark:text-[#CBD5E1] hover:text-[#0F4C81]'
                }`}
              title="Toggle Kozha AI LLM Gloss Translation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>AI Sign Mode:</span>
              <span className="font-extrabold uppercase">{useAiTranslator ? 'ON' : 'OFF'}</span>
            </button>

            {/* Renderer Switcher */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#1E293B] rounded-xl p-1.5 border border-[#D8E2EC] dark:border-[#334155] shrink-0">
              <button
                onClick={() => setRendererMode('cwasa')}
                className={`h-[36px] px-4 py-2 text-[13px] font-bold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${rendererMode === 'cwasa'
                    ? 'bg-[#0F4C81] dark:bg-[#2563EB] text-white shadow-sm'
                    : 'text-[#64748B] dark:text-[#CBD5E1] hover:text-[#0F4C81]'
                  }`}
              >
                CWASA 3D WebGL
              </button>
              <button
                onClick={() => setRendererMode('r3f')}
                className={`h-[36px] px-4 py-2 text-[13px] font-bold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${rendererMode === 'r3f'
                    ? 'bg-[#0F4C81] dark:bg-[#2563EB] text-white shadow-sm'
                    : 'text-[#64748B] dark:text-[#CBD5E1] hover:text-[#0F4C81]'
                  }`}
              >
                Three.js R3F
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Avatar Selection */}
            {rendererMode === 'cwasa' && (
              <div className="flex items-center gap-3 bg-white dark:bg-[#1E293B] px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#475569] h-[44px] shrink-0">
                <label className="text-[13px] text-[#475569] dark:text-[#CBD5E1] font-bold whitespace-nowrap">Character:</label>
                <select
                  value={selectedAvatar}
                  onChange={(e) => setSelectedAvatar(e.target.value as any)}
                  className="bg-transparent text-[#0F4C81] dark:text-[#60A5FA] font-bold border-none text-[13px] outline-none cursor-pointer pr-2 py-1"
                >
                  <option value="anna" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">Anna (Female)</option>
                  <option value="marc" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">Marc (Male)</option>
                  <option value="francoise" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">Francoise (Female)</option>
                  <option value="luna" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">Luna (Stylized)</option>
                  <option value="siggi" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">Siggi (Male)</option>
                </select>
              </div>
            )}

            {/* Sign Language Selection */}
            <div className="flex items-center gap-3 bg-white dark:bg-[#1E293B] px-4 py-2 rounded-xl border border-[#CBD5E1] dark:border-[#475569] h-[44px] shrink-0">
              <label className="text-[13px] text-[#475569] dark:text-[#CBD5E1] font-bold whitespace-nowrap">System:</label>
              <select
                value={signLanguage}
                onChange={(e) => setSignLanguage(e.target.value as any)}
                className="bg-transparent text-[#0F4C81] dark:text-[#60A5FA] font-bold border-none text-[13px] outline-none cursor-pointer pr-2 py-1"
              >
                <option value="ISL" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">Indian (ISL)</option>
                <option value="BSL" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">British (BSL)</option>
                <option value="ASL" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">American (ASL)</option>
                <option value="DGS" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">German (DGS)</option>
                <option value="LSF" className="bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F8FAFC]">French (LSF)</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-7 items-start">

        {/* LEFT HERO COLUMN: 3D Viewport Studio Frame (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Hero Studio Container Box (16px Radius) */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-[#D8E2EC] dark:border-[#334155] bg-[#16324F] dark:bg-[#0F172A] shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200 flex flex-col min-h-[520px] mb-4">

            {/* Studio Header Bar */}
            <div className="bg-[#16324F] dark:bg-[#111827] border-b border-slate-700/80 px-6 py-3.5 flex items-center justify-between z-10 text-white">
              <div className="flex items-center gap-2.5 text-[13px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#198754] animate-pulse" />
                <span className="font-semibold text-slate-200">
                  {rendererMode === 'cwasa' ? `CWASA 3D Studio (${selectedAvatar.toUpperCase()})` : 'Three.js R3F Avatar Studio'}
                </span>
              </div>

              {/* Speed Controls Segmented Pills */}
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-slate-300 font-medium">Speed:</span>
                {[0.5, 0.75, 1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSigningSpeed(speed)}
                    className={`px-3.5 py-1.5 text-[13px] font-bold rounded-md transition-all duration-150 cursor-pointer ${signingSpeed === speed
                        ? 'bg-[#0F4C81] dark:bg-[#2563EB] text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Renderer Canvas Frame */}
            <div className="relative flex-1 w-full bg-[#16324F] dark:bg-[#0F172A] min-h-[440px]">
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

            {/* Viewport Footer Status Bar */}
            <div className="bg-[#16324F] dark:bg-[#111827] border-t border-slate-700/80 px-6 py-3.5 flex items-center justify-between gap-3 text-[13px] text-white">
              <div className="flex items-center gap-2 min-w-0">
                <StatusIndicator
                  state={listeningState}
                  error={speechError ? { type: 'unknown', message: speechError.message } : null}
                />
                <div className="truncate">
                  <span className="text-slate-300 font-medium">Status: </span>
                  <span className={`font-bold ${signingStatus !== 'Idle' ? 'text-sky-300' : 'text-slate-200'}`}>
                    {signingStatus}
                  </span>
                </div>
              </div>

              {activeSignText && (
                <div className="hidden sm:flex items-center gap-2 bg-slate-800 dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 truncate">
                  <span className="text-slate-300 font-medium">Signing:</span>
                  <span className="text-sky-300 font-bold truncate max-w-[220px]">{activeSignText}</span>
                  <button
                    onClick={handleClear}
                    className="text-slate-400 hover:text-rose-400 font-bold ml-1 text-xs px-1.5 py-0.5 rounded cursor-pointer"
                    title="Stop and clear active phrase"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT WORKFLOW COLUMN: Interactive Controls (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Sub-Navigation Tab Segmented Control */}
          <div className="grid grid-cols-3 bg-[#F4F7FB] dark:bg-[#0F172A] p-2 rounded-2xl border border-[#D8E2EC] dark:border-[#334155] gap-2 text-center shadow-sm transition-colors duration-200 mb-1">
            <button
              onClick={() => setActiveTab('translate')}
              className={`h-[44px] px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'translate'
                  ? 'bg-[#0F4C81] dark:bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#CBD5E1] hover:text-[#0F4C81]'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
              </svg>
              Translator
            </button>
            <button
              onClick={() => setActiveTab('dictionary')}
              className={`h-[44px] px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'dictionary'
                  ? 'bg-[#0F4C81] dark:bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#CBD5E1] hover:text-[#0F4C81]'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Sign Library
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`h-[44px] px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'inspector'
                  ? 'bg-[#0F4C81] dark:bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#64748B] dark:text-[#CBD5E1] hover:text-[#0F4C81]'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Inspector
            </button>
          </div>

          {/* TAB 1: Live Translator Workflow */}
          {activeTab === 'translate' && (
            <div className="flex flex-col gap-6">

              {/* Card 1: Text Translation */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-8 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex flex-col gap-5 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-[20px] font-semibold text-[#16324F] dark:text-white flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
                    </svg>
                    Text-to-Sign Input
                  </h3>
                  <span className="text-[13px] text-[#64748B] dark:text-[#94A3B8] font-mono font-semibold">
                    {inputText.length} chars
                  </span>
                </div>

                <textarea
                  className="w-full bg-[#FFFFFF] dark:bg-[#0F172A] text-[#16324F] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-xl p-4.5 text-[15px] leading-relaxed focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/30 resize-none h-32 placeholder-[#64748B] dark:placeholder-[#94A3B8] font-sans transition-all duration-200"
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

                <div className="flex flex-wrap items-center gap-3.5 mt-1 w-full">
                  <button
                    className="flex-1 min-w-[200px] h-[48px] bg-[#0F4C81] dark:bg-[#2563EB] hover:bg-[#0B3D66] dark:hover:bg-[#1D4ED8] text-white font-semibold px-6 rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm cursor-pointer whitespace-nowrap flex items-center justify-center"
                    onClick={handleTranslate}
                    disabled={!inputText.trim()}
                  >
                    Translate to 3D Sign
                  </button>
                  <button
                    className="h-[48px] min-w-[110px] bg-white dark:bg-[#1E293B] hover:bg-[#EFF6FF] dark:hover:bg-[#334155] text-[#0F4C81] dark:text-white border border-[#CBD5E1] dark:border-[#475569] font-semibold px-6 rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer shrink-0 whitespace-nowrap flex items-center justify-center"
                    onClick={handleClear}
                    disabled={!inputText && !activeSignText && !transcript}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Card 2: Voice Speech Input */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-8 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex flex-col gap-5 overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-[20px] font-semibold text-[#16324F] dark:text-white flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Voice Speech Input
                  </h3>

                  {/* Voice Language Selector */}
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as any)}
                    className="bg-white dark:bg-[#0F172A] text-[#16324F] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#475569] rounded-xl px-4 py-2.5 text-[13.5px] font-bold outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/30 cursor-pointer shadow-xs"
                  >
                    <option value="en-IN" className="bg-white dark:bg-[#0F172A] text-[#16324F] dark:text-[#F8FAFC]">English (IN)</option>
                    <option value="ta-IN" className="bg-white dark:bg-[#0F172A] text-[#16324F] dark:text-[#F8FAFC]">Tamil (India)</option>
                    <option value="thanglish" className="bg-white dark:bg-[#0F172A] text-[#16324F] dark:text-[#F8FAFC]">Tanglish</option>
                  </select>
                </div>

                <p className="text-[14px] text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
                  Speak clearly into your microphone. Spoken words are converted directly to 3D sign glosses.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 mt-1 w-full">
                  <button
                    onClick={startListening}
                    disabled={listeningState === 'listening' || listeningState === 'processing' || !isSTTSupported}
                    className={`flex-1 min-w-[180px] h-[48px] font-semibold px-6 rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer whitespace-nowrap flex items-center justify-center ${listeningState === 'listening'
                        ? 'bg-[#C0392B] dark:bg-[#DC2626] text-white animate-pulse'
                        : 'bg-[#198754] dark:bg-[#16A34A] hover:bg-[#146c43] text-white shadow-sm'
                      } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  >
                    Start Dictation
                  </button>
                  <button
                    onClick={stopListening}
                    disabled={listeningState !== 'listening' && listeningState !== 'processing'}
                    className="h-[48px] min-w-[100px] bg-[#C0392B] dark:bg-[#DC2626] hover:bg-[#A93226] text-white font-semibold px-6 rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer shrink-0 whitespace-nowrap flex items-center justify-center shadow-sm"
                  >
                    Stop
                  </button>
                </div>

                {transcript && (
                  <div className="bg-[#F4F7FB] dark:bg-[#0F172A] p-4.5 rounded-xl border border-[#D8E2EC] dark:border-[#334155] text-[14px] mt-1">
                    <span className="text-[#0F4C81] dark:text-[#3B82F6] font-bold">Speech Transcript:</span>{' '}
                    <span className="text-[#1E293B] dark:text-[#F8FAFC]">{transcript}</span>
                  </div>
                )}
              </div>

              {/* Card 3: Quick Sign Presets Chips */}
              <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-8 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex flex-col gap-5 overflow-hidden">
                <h3 className="text-[20px] font-semibold text-[#16324F] dark:text-white flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Sign Presets
                </h3>

                <div className="flex flex-col gap-4">
                  {presetCategories.map((cat) => (
                    <div key={cat.title} className="flex flex-col gap-2.5">
                      <span className="text-[13px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                        {cat.title}
                      </span>
                      <div className="flex flex-wrap gap-3">
                        {cat.items.map((phrase) => (
                          <button
                            key={phrase}
                            onClick={() => handlePresetTrigger(phrase)}
                            className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/40 hover:bg-[#0F4C81] dark:hover:bg-[#3B82F6] border border-[#BFDBFE] dark:border-[#3B82F6]/40 text-[#0F4C81] dark:text-[#93C5FD] hover:text-white dark:hover:text-white py-2.5 px-5 rounded-full text-[14px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-sm cursor-pointer"
                          >
                            [ {phrase} ]
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
            <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-8 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[20px] font-semibold text-[#16324F] dark:text-white">Sign Library ({signLanguage})</h3>
                  <span className="text-[13px] bg-[#EFF6FF] dark:bg-[#1E3A8A]/50 text-[#0F4C81] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#3B82F6]/40 px-3.5 py-1.5 rounded-full font-mono font-bold">
                    {dictionaryEntries.length} Signs
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Search sign dictionary (e.g. 'help', 'doctor', 'thanks')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FFFFFF] dark:bg-[#0F172A] text-[#16324F] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-xl px-5 py-3.5 text-[15px] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 transition-all duration-200"
                />
              </div>

              <div className="flex flex-col gap-3">
                {dictionaryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[#F4F7FB] dark:bg-[#0F172A] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A]/30 border border-[#D8E2EC] dark:border-[#334155] rounded-xl p-4.5 flex items-center justify-between gap-3 transition-all duration-200"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[15px] text-[#0F4C81] dark:text-[#60A5FA]">{entry.gloss}</span>
                        <span className="text-[12px] bg-[#EEF3F8] dark:bg-[#334155] text-[#1E293B] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#475569] px-3 py-1 rounded-md font-semibold">
                          {entry.category}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#64748B] dark:text-[#CBD5E1] truncate">{entry.movement} ({entry.location})</p>
                    </div>
                    <button
                      onClick={() => handlePresetTrigger(entry.gloss)}
                      className="bg-[#0F4C81] dark:bg-[#2563EB] hover:bg-[#0B3D66] dark:hover:bg-[#1D4ED8] text-white font-semibold px-4.5 py-2.5 rounded-xl text-[13px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shrink-0 shadow-sm cursor-pointer"
                    >
                      Sign 3D
                    </button>
                  </div>
                ))}

                {dictionaryEntries.length === 0 && (
                  <div className="text-center py-8 text-[#64748B] dark:text-[#94A3B8] text-[15px] italic">
                    No matching sign entries found for &quot;{searchQuery}&quot;.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Notation Inspector */}
          {activeTab === 'inspector' && (
            <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-8 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[20px] font-semibold text-[#16324F] dark:text-white flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Notation & SiGML Inspector
                </h3>
                {processedSequence.sigmlSequence && (
                  <button
                    onClick={handleCopySigml}
                    className="bg-[#F4F7FB] dark:bg-[#0F172A] hover:bg-[#EFF6FF] border border-[#D8E2EC] dark:border-[#334155] text-[#0F4C81] dark:text-[#60A5FA] px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 cursor-pointer"
                  >
                    {copiedSigml ? '✓ Copied!' : '📋 Copy SiGML'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-4">

                {/* Active Sentence & Engine Info */}
                <div className="bg-[#F4F7FB] dark:bg-[#0F172A] p-4.5 rounded-xl border border-[#D8E2EC] dark:border-[#334155] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="font-bold text-[#0F4C81] dark:text-[#60A5FA]">Active Sentence:</span>
                    {processedSequence.plannerSource && (
                      <span className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/50 text-[#0F4C81] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#3B82F6]/40 px-3 py-1 rounded text-[11px] font-mono font-bold">
                        {processedSequence.plannerSource}
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] text-[#1E293B] dark:text-[#F8FAFC] font-semibold">
                    {activeSignText || '(No active input sentence)'}
                  </p>
                  {processedSequence.facialExpression && processedSequence.facialExpression !== 'neutral' && (
                    <p className="text-[13px] text-[#0F4C81] dark:text-[#60A5FA] font-semibold mt-1">
                      Non-Manual Expression: {processedSequence.facialExpression}
                    </p>
                  )}
                </div>

                {/* Token Breakdown List */}
                <div className="bg-[#F4F7FB] dark:bg-[#0F172A] p-4.5 rounded-xl border border-[#D8E2EC] dark:border-[#334155]">
                  <p className="text-[13px] font-bold text-[#0F4C81] dark:text-[#60A5FA] mb-2">Gloss Sequence Breakdown:</p>
                  <div className="flex flex-col gap-2.5">
                    {processedSequence.signBreakdown.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-[#1E293B] p-3.5 rounded-lg border border-[#D8E2EC] dark:border-[#334155] text-[13px] flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#1E293B] dark:text-white">{item.word}</span>
                          <span className={`text-[11px] px-3 py-1 rounded font-semibold ${item.isFingerspelled
                              ? 'bg-[#FEF3C7] dark:bg-[#78350F]/40 text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#D97706]'
                              : 'bg-[#E8F5E9] dark:bg-[#166534]/40 text-[#198754] dark:text-[#86EFAC] border border-[#A5D6A7] dark:border-[#22C55E]/40'
                            }`}>
                            {item.isFingerspelled ? 'Fingerspelled' : 'Gloss Match'}
                          </span>
                        </div>
                        {item.hamnosys && (
                          <p className="text-[12px] text-[#64748B] dark:text-[#CBD5E1] font-mono">HamNoSys: {item.hamnosys}</p>
                        )}
                      </div>
                    ))}

                    {processedSequence.signBreakdown.length === 0 && (
                      <p className="text-[13px] text-[#64748B] dark:text-[#94A3B8] italic">No token breakdown available yet.</p>
                    )}
                  </div>
                </div>

                {/* SiGML XML Output Box */}
                <div className="bg-[#F4F7FB] dark:bg-[#0F172A] p-4.5 rounded-xl border border-[#D8E2EC] dark:border-[#334155]">
                  <p className="text-[13px] font-bold text-[#0F4C81] dark:text-[#60A5FA] mb-2">Generated SiGML XML Output:</p>
                  <pre className="bg-[#16324F] dark:bg-[#0F172A] p-4 rounded-xl text-[12px] text-[#86EFAC] font-mono overflow-x-auto max-h-40 border border-slate-700">
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
