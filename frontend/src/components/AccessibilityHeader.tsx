'use client';

import React, { useState, useEffect } from 'react';

export default function AccessibilityHeader() {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const hasDarkClass = document.documentElement.classList.contains('dark');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && (prefersDark || hasDarkClass))) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const nextDark = !isCurrentlyDark;

    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    }
  };

  return (
    <header className="w-full bg-white/80 dark:bg-[#161B26]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-[#273142] sticky top-0 z-50 transition-all duration-300">
      {/* MeitY Govt Tricolor Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

      <div className="max-w-[1340px] mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left Brand Identity: MeitY Emblem & Portal Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-lg shadow-sm">
            🇮🇳
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] md:text-[22px] font-extrabold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2 font-sans">
                OpenAccess
              </h1>

              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE SERVICE
              </span>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
              AI Multimodal Assistive Platform • Speech, 3D Sign Language & Vision AI
            </p>
          </div>
        </div>

        {/* Top-Right Container: Light/Dark Theme Switcher Pill */}
        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            type="button"
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-full transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-2 text-[13.5px] font-bold select-none shadow-xs"
            aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {mounted && isDark ? (
              <>
                <svg className="w-4.5 h-4.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="hidden sm:inline text-amber-300">Light Mode</span>
              </>
            ) : (
              <>
                <svg className="w-4.5 h-4.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span className="hidden sm:inline text-slate-700">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
