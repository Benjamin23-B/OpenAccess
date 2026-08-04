'use client';

import React from 'react';

export type BridgeType = 'deaf' | 'blind' | 'object_detection';

interface DashboardSidebarProps {
  activeModule: BridgeType;
  onModuleChange: (module: BridgeType) => void;
}

interface SidebarItem {
  id: BridgeType;
  label: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'deaf',
    label: 'Deaf / HoH Assistive Bridge',
    badge: 'Kozha 3D v2.0',
    description: '3D Sign Language Avatar & SiGML Inspector',
    icon: (
      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5a1.5 1.5 0 013 0v5.5m0 0V8a1.5 1.5 0 013 0v4.5" />
      </svg>
    )
  },
  {
    id: 'blind',
    label: 'Visually Impaired Bridge',
    badge: 'Audio STT/TTS',
    description: 'Speech Dictation & AAC Symbol Board',
    icon: (
      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  },
  {
    id: 'object_detection',
    label: 'Spatial Object AI',
    badge: 'WebNN Real-Time',
    description: 'Real-time Camera Vision & Scene Narration',
    icon: (
      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

export default function DashboardSidebar({ activeModule, onModuleChange }: DashboardSidebarProps) {
  return (
    <aside 
      className="w-full lg:w-[310px] shrink-0 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-[16px] p-5 shadow-sm flex flex-col justify-between gap-6 transition-all duration-300"
      aria-label="Dashboard Navigation Sidebar"
    >
      <div className="flex flex-col gap-5">
        {/* Navigation Group Header */}
        <div className="px-2 pt-1 flex items-center justify-between">
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Accessibility Services
          </span>
          <span className="text-[11px] font-bold bg-[#EAF3FF] dark:bg-[#1E3A5F] text-[#0F4C81] dark:text-[#BFDBFE] border border-[#BFDBFE] dark:border-[#3B82F6]/40 px-2.5 py-0.5 rounded-full">
            3 Active
          </span>
        </div>

        {/* Sidebar Nav Buttons */}
        <nav className="flex flex-col gap-2.5" role="tablist">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeModule === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onModuleChange(item.id)}
                role="tab"
                aria-selected={isActive}
                className={`w-full p-3.5 rounded-xl font-semibold text-left transition-all duration-300 active:scale-[0.98] flex items-start gap-3.5 cursor-pointer relative group ${
                  isActive
                    ? 'bg-[#0F4C81] dark:bg-[#3B82F6] hover:bg-[#0C3C66] dark:hover:bg-[#2563EB] text-white shadow-md shadow-[#0F4C81]/20 dark:shadow-[#3B82F6]/20'
                    : 'bg-[#F5F7FA] dark:bg-[#1E293B] hover:bg-[#EEF2F6] dark:hover:bg-[#243447] text-[#1E293B] dark:text-[#F8FAFC] border border-[#D9E2EC] dark:border-[#334155]'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white dark:bg-[#111827] text-[#0F4C81] dark:text-[#60A5FA] border border-[#D9E2EC] dark:border-[#334155]'
                }`}>
                  {item.icon}
                </div>

                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-bold text-[14.5px] truncate leading-tight">{item.label}</span>
                  </div>
                  <span className={`text-[12px] truncate ${isActive ? 'text-blue-100' : 'text-[#475569] dark:text-[#CBD5E1]'}`}>
                    {item.description}
                  </span>
                </div>

                {isActive && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar System Telemetry Footbar */}
      <div className="bg-[#EEF2F6] dark:bg-[#1E293B] border border-[#D9E2EC] dark:border-[#334155] rounded-xl p-4 flex flex-col gap-2.5 text-[13px] transition-colors duration-300">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#1E293B] dark:text-[#F8FAFC] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#198754] dark:bg-[#22C55E] animate-pulse" />
            AI Services Engine
          </span>
          <span className="text-[11px] font-mono font-bold text-[#198754] dark:text-[#22C55E]">ONLINE</span>
        </div>
        <div className="flex flex-col gap-1 text-[12px] text-[#475569] dark:text-[#CBD5E1]">
          <div className="flex justify-between">
            <span>Kozha 3D Avatar:</span>
            <span className="font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Active</span>
          </div>
          <div className="flex justify-between">
            <span>Speech Recognition:</span>
            <span className="font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Ready</span>
          </div>
          <div className="flex justify-between">
            <span>WebNN Object AI:</span>
            <span className="font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
