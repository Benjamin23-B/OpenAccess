'use client';

import React, { useState } from 'react';
import { SpeechBridge } from '../services/speechBridge';

interface AACBoardProps {
  speechBridge: SpeechBridge | null;
}

const COMMON_WORDS = [
  'I', 'You', 'Want', 'Need', 'Help', 'Yes', 'No', 
  'More', 'Stop', 'Go', 'Eat', 'Drink', 'Please', 'Thank you'
];

export default function AACBoard({ speechBridge }: AACBoardProps) {
  const [sentence, setSentence] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<string[]>([]);

  // Mock next-word prediction based on current sentence
  const updatePredictions = (currentSentence: string[]) => {
    if (currentSentence.length === 0) {
      setPredictions(['I', 'Can', 'Do', 'What']);
    } else if (currentSentence[currentSentence.length - 1].toLowerCase() === 'i') {
      setPredictions(['want', 'need', 'feel', 'am']);
    } else if (currentSentence[currentSentence.length - 1].toLowerCase() === 'want') {
      setPredictions(['to', 'food', 'water', 'help']);
    } else {
      setPredictions([]);
    }
  };

  const handleWordClick = (word: string) => {
    const newSentence = [...sentence, word];
    setSentence(newSentence);
    updatePredictions(newSentence);
    
    // Speak the word immediately for auditory feedback
    if (speechBridge) {
      speechBridge.speak(word);
    }
  };

  const handleSpeakSentence = () => {
    const fullSentence = sentence.join(' ');
    if (speechBridge && fullSentence) {
      speechBridge.speak(fullSentence);
    }
  };

  const handleClear = () => {
    setSentence([]);
    updatePredictions([]);
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#334155] pb-3">
        <h3 className="text-[20px] font-semibold text-[#16324F] dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          Augmentative & Alternative Communication (AAC) Board
        </h3>
        <span className="text-[13px] text-[#64748B] dark:text-[#94A3B8] font-semibold">{COMMON_WORDS.length} Core Symbols</span>
      </div>

      <div className="bg-[#F4F7FB] dark:bg-[#0F172A] border border-[#D8E2EC] dark:border-[#334155] rounded-xl p-4 min-h-[60px] flex items-center gap-3 text-[15px] font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
        <span className="text-[#0F4C81] dark:text-[#3B82F6] font-bold">Constructed Sentence:</span>
        <span className="text-[#1E293B] dark:text-[#F8FAFC] flex-1">{sentence.join(' ') || <span className="text-[#64748B] dark:text-[#94A3B8] italic font-normal">(Select core symbols below to build a sentence)</span>}</span>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <button
          onClick={handleSpeakSentence}
          disabled={sentence.length === 0}
          className="h-[48px] px-6 bg-[#0F4C81] dark:bg-[#2563EB] hover:bg-[#0B3D66] dark:hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <span className="leading-none">Speak Sentence</span>
        </button>
        <button
          onClick={handleClear}
          disabled={sentence.length === 0}
          className="h-[48px] px-6 bg-[#C0392B] dark:bg-[#DC2626] hover:bg-[#A93226] dark:hover:bg-[#B91C1C] text-white font-semibold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="leading-none">Clear</span>
        </button>
        <button
          onClick={() => setSentence(sentence.slice(0, -1))}
          disabled={sentence.length === 0}
          className="h-[48px] px-6 bg-[#F4F7FB] dark:bg-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#334155] text-[#1E293B] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] font-semibold rounded-xl text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer flex items-center justify-center gap-2"
        >
          <span className="leading-none">Backspace</span>
        </button>
      </div>

      {predictions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-[13px] font-bold text-[#0F4C81] dark:text-[#3B82F6] uppercase tracking-wider">Next-Word Predictions:</h4>
          <div className="flex gap-3 flex-wrap">
            {predictions.map(word => (
              <button
                key={word}
                onClick={() => handleWordClick(word)}
                className="bg-[#EFF6FF] dark:bg-[#1E3A8A]/40 hover:bg-[#0F4C81] dark:hover:bg-[#3B82F6] border border-[#BFDBFE] dark:border-[#3B82F6]/40 text-[#0F4C81] dark:text-[#93C5FD] hover:text-white dark:hover:text-white px-4.5 py-2 rounded-full text-[14px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                + {word}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {COMMON_WORDS.map(word => (
          <button
            key={word}
            onClick={() => handleWordClick(word)}
            className="bg-white dark:bg-[#0F172A] hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A]/30 border border-[#D8E2EC] dark:border-[#334155] hover:border-[#0F4C81] dark:hover:border-[#3B82F6] text-[#1E293B] dark:text-[#F8FAFC] hover:text-[#0F4C81] dark:hover:text-[#3B82F6] h-[64px] px-4 py-3 rounded-xl text-[15px] font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex items-center justify-center shadow-xs"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
