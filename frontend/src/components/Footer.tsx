'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer 
      role="contentinfo"
      className="w-full bg-white dark:bg-[#161B26] border-t border-slate-200/80 dark:border-[#273142] mt-auto transition-colors duration-300"
    >
      {/* Decorative Gradient Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-blue-500 to-[#138808]" />

      <div className="max-w-[1340px] mx-auto px-4 md:px-6 py-6 flex flex-col items-center justify-center text-center gap-2">
        {/* Main Platform Title */}
        <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-white font-extrabold text-base tracking-tight">
          <span>🇮🇳</span>
          <span>OpenAccess AI Multimodal Platform</span>
        </div>

        {/* Centered Credit Line with Highlighted Link to Portfolio */}
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          by{' '}
          <a
            href="https://portfolio-pwu3.vercel.app/#"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit Benjamin Bruce's Portfolio"
            aria-label="Visit Benjamin Bruce's Portfolio (opens in new tab)"
            className="font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent hover:underline underline-offset-4 cursor-pointer transition-all duration-200"
          >
            Benjamin Bruce
          </a>
        </p>

        {/* Tagline */}
        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          Empowering Inclusive Communication & Accessibility
        </p>
      </div>
    </footer>
  );
}
