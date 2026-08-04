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
  const [activeModule, setActiveModule] = useState<BridgeType>('deaf'); // Default to deaf 3D sign module
  const [liveMsg, setLiveMsg] = useState('');
  const [progressMsg, setProgressMsg] = useState('');

  // Handle live messages from the visually impaired bridge
  const handleLiveMessage = useCallback((message: string) => {
    setLiveMsg(message);
  }, []);

  return (
    <AccessibilityWrapper liveMessage={liveMsg} progressMessage={progressMsg}>
      <div className="app-container w-full bg-[#F5F7FA] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] transition-colors duration-300">
        {/* Government Accessibility Header with Theme Switcher */}
        <AccessibilityHeader />

        {/* Top Horizontal Navigation Dock for Accessibility Services */}
        <BridgeTabs
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />

        {/* Main Workspace Area Container */}
        <main id="main-content" className="max-w-[1340px] mx-auto px-4 md:px-6 pb-8 min-w-0" tabIndex={-1}>
          
          {/* Module 1: Deaf / HoH 3D Sign Language Bridge */}
          {activeModule === 'deaf' && (
            <div 
              id="bridge-panel-deaf"
              role="tabpanel"
              aria-labelledby="tab-deaf"
              tabIndex={0}
              className="w-full"
            >
              <DeafBridge />
            </div>
          )}

          {/* Module 2: Visually Impaired Speech Interface */}
          {activeModule === 'blind' && (
            <div
              id="bridge-panel-blind"
              role="tabpanel"
              aria-labelledby="tab-blind"
              tabIndex={0}
              className="w-full"
            >
              <VisuallyImpairedBridge 
                onLiveMessage={handleLiveMessage}
              />
            </div>
          )}

          {/* Module 3: Object Detection & Spatial Scene AI */}
          {activeModule === 'object_detection' && (
            <div 
              id="bridge-panel-object-detection"
              role="tabpanel"
              aria-labelledby="tab-object-detection"
              tabIndex={0}
              className="w-full"
            >
              <ObjectDetectionBridge />
            </div>
          )}

        </main>
      </div>
    </AccessibilityWrapper>
  );
}
