'use client';

import React, { ReactNode, useEffect, useState } from 'react';

interface AccessibilityWrapperProps {
  children: ReactNode;
  liveMessage?: string;
  progressMessage?: string;
}

export default function AccessibilityWrapper({ children, liveMessage, progressMessage }: AccessibilityWrapperProps) {
  // We use aria-live regions for screen reader announcements
  // assertive: interrupts whatever the screen reader is currently saying
  // polite: waits until the screen reader finishes current sentence
  
  return (
    <div className="accessibility-wrapper">
      {/* Screen Reader Only Live Region for Assertive Updates (e.g., immediate sign-to-text translation) */}
      <div 
        aria-live="assertive" 
        className="sr-only" 
        style={srOnlyStyle}
      >
        {liveMessage}
      </div>

      {/* Screen Reader Only Live Region for Status Updates (e.g., loading models) */}
      <div 
        role="status" 
        aria-live="polite" 
        className="sr-only"
        style={srOnlyStyle}
      >
        {progressMessage}
      </div>

      {/* Main Content Area */}
      <main role="main">
        {children}
      </main>
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
