'use client';

import React from 'react';

export type BridgeType = 'deaf' | 'blind' | 'object_detection';

interface BridgeTabsProps {
  activeModule: BridgeType;
  onModuleChange: (module: BridgeType) => void;
}

interface BridgeTab {
  id: BridgeType;
  label: string;
  badge: string;
  description: string;
  svgIcon: React.ReactNode;
}

const BRIDGE_TABS: BridgeTab[] = [
  {
    id: 'deaf',
    label: 'Deaf / HoH Assistive Bridge',
    badge: 'Kozha 3D v2.0',
    description: 'Real-time 3D Sign Language translation and HamNoSys parser',
    svgIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5a1.5 1.5 0 013 0v5.5m0 0V8a1.5 1.5 0 013 0v4.5" />
      </svg>
    )
  },
  {
    id: 'blind',
    label: 'Visually Impaired Bridge',
    badge: 'Audio STT/TTS',
    description: 'Keyboard-accessible speech-to-text and speech synthesis interface',
    svgIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  },
  {
    id: 'object_detection',
    label: 'Spatial Object AI',
    badge: 'WebNN Real-Time',
    description: 'Spatial camera scene narration and visual question answering',
    svgIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

export default function BridgeTabs({ activeModule, onModuleChange }: BridgeTabsProps) {
  return (
    <nav 
      className="w-full bg-transparent transition-all duration-300 my-2 mb-6" 
      role="navigation" 
      aria-label="Accessibility bridge navigation"
    >
      <div className="max-w-[1340px] mx-auto px-4 md:px-6 py-2">
        <div className="flex bg-white/70 dark:bg-[#161B26]/70 backdrop-blur-xl p-2 rounded-3xl border border-slate-200/80 dark:border-[#273142] gap-3 shadow-lg shadow-slate-900/5 dark:shadow-black/30 transition-all duration-300">
          {BRIDGE_TABS.map((tab) => {
            const isActive = activeModule === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onModuleChange(tab.id)}
                className={`flex-1 h-[52px] px-5 rounded-2xl font-bold text-[14px] md:text-[15px] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`bridge-panel-${tab.id}`}
                aria-describedby={`tab-desc-${tab.id}`}
                tabIndex={0}
              >
                <span className="shrink-0">{tab.svgIcon}</span>
                <span className="truncate tracking-tight">{tab.label}</span>
                <span className={`hidden lg:inline text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border transition-all ${
                  isActive
                    ? 'bg-white/20 text-white border-white/30 backdrop-blur-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {tab.badge}
                </span>
                <span id={`tab-desc-${tab.id}`} className="sr-only">
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
