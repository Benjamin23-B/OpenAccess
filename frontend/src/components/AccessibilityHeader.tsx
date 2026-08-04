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
    <header className="w-full bg-[#0F4C81] dark:bg-[#111827] border-b border-[#0C3C66] dark:border-[#334155] shadow-md transition-colors duration-300">
      {/* MeitY Govt Tricolor Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

      <div className="max-w-[1340px] mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left Brand Identity: MeitY Emblem & Portal Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 flex items-center justify-center text-white font-extrabold text-lg shadow-xs">
            🇮🇳
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[19px] md:text-[21px] font-bold text-white tracking-tight flex items-center gap-2">
                OpenAccess
              </h1>

              <span className="bg-[#198754]/20 text-[#86EFAC] border border-[#198754]/40 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#86EFAC] animate-pulse" />
                LIVE SERVICE
              </span>
            </div>
            <p className="text-[13px] text-slate-200 dark:text-slate-400 font-medium">
              AI Multimodal Assistive Platform • Speech, 3D Sign Language & Vision AI Services
            </p>
          </div>
        </div>

        {/* Top-Right Container: Sun/Moon Light & Dark Theme Switcher Button */}
        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2.5 bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-white border border-white/20 dark:border-white/10 rounded-xl transition-all duration-300 active:scale-[0.98] cursor-pointer flex items-center gap-2 text-[13.5px] font-semibold select-none"
            aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {mounted && isDark ? (
              <>
                {/* Sun Icon for Light Mode */}
                <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="hidden sm:inline text-amber-200">Light Mode</span>
              </>
            ) : (
              <>
                {/* Moon Icon for Dark Mode */}
                <svg className="w-5 h-5 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span className="hidden sm:inline text-slate-100">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
