'use client';

import React, { useState, useCallback } from 'react';
import {
  AccessibilityWrapper,
  AccessibilityHeader,
  BridgeTabs,
  VisuallyImpairedBridge,
  DeafBridge,
  ObjectDetectionBridge,
  type BridgeType
} from '@/components';

export default function Home() {
  const [activeModule, setActiveModule] = useState<BridgeType>('blind'); // Default to blind module as requested
  const [liveMsg, setLiveMsg] = useState('');
  const [progressMsg, setProgressMsg] = useState('');

  // Handle live messages from the visually impaired bridge
  const handleLiveMessage = useCallback((message: string) => {
    setLiveMsg(message);
  }, []);

  return (
    <AccessibilityWrapper liveMessage={liveMsg} progressMessage={progressMsg}>
      <div className="app-container">
        {/* Accessibility Header with Skip Link */}
        <AccessibilityHeader />
        
        {/* Bridge Navigation Tabs */}
        <BridgeTabs 
          activeModule={activeModule} 
          onModuleChange={setActiveModule} 
        />

        {/* Main Content Area */}
        <main id="main-content" className="main-content" tabIndex={-1}>
          
          {/* Module 1: Deaf / HoH Bridge */}
          {activeModule === 'deaf' && (
            <div 
              id="bridge-panel-deaf"
              role="tabpanel"
              aria-labelledby="tab-deaf"
              tabIndex={0}
            >
              <DeafBridge />
            </div>
          )}

          {/* Module 2: Visually Impaired Bridge - FULLY FUNCTIONAL */}
          {activeModule === 'blind' && (
            <VisuallyImpairedBridge 
              onLiveMessage={handleLiveMessage}
            />
          )}

          {/* Module 3: Object Detection & Multimodal Scene AI */}
          {activeModule === 'object_detection' && (
            <div 
              id="bridge-panel-object-detection"
              role="tabpanel"
              aria-labelledby="tab-object-detection"
              tabIndex={0}
            >
              <ObjectDetectionBridge />
            </div>
          )}

        </main>
      </div>
    </AccessibilityWrapper>
  );
}

