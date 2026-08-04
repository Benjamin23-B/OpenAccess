'use client';

import React, { ReactNode } from 'react';

interface AccessibilityWrapperProps {
  children: ReactNode;
  liveMessage?: string;
  progressMessage?: string;
}

export default function AccessibilityWrapper({ children, liveMessage, progressMessage }: AccessibilityWrapperProps) {
  return (
    <div className="accessibility-wrapper w-full min-h-screen bg-[#F5F7FA] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] transition-colors duration-300 flex flex-col">
      {/* Screen Reader Only Live Region for Assertive Updates */}
      <div 
        aria-live="assertive" 
        className="sr-only" 
        style={srOnlyStyle}
      >
        {liveMessage}
      </div>

      {/* Screen Reader Only Live Region for Status Updates */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
        style={srOnlyStyle}
      >
        {progressMessage}
      </div>

      {/* Main Content Area */}
      <div role="main" className="w-full">
        {children}
      </div>
    </div>
  );
}

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
};
