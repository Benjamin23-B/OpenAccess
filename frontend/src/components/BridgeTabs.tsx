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
  description: string;
  icon: string;
}

const BRIDGE_TABS: BridgeTab[] = [
  {
    id: 'deaf',
    label: 'Deaf / HoH Bridge',
    description: 'Sign language translation and visual alerts',
    icon: '✋'
  },
  {
    id: 'blind',
    label: 'Visually Impaired Bridge',
    description: 'Speech-to-text and text-to-speech interface',
    icon: '👁️'
  },
  {
    id: 'object_detection',
    label: 'Object Detection AI',
    description: 'Real-time spatial scene narration and VQA',
    icon: '📷'
  }
];

export default function BridgeTabs({ activeModule, onModuleChange }: BridgeTabsProps) {
  return (
    <nav 
      className="bridge-tabs" 
      role="navigation" 
      aria-label="Accessibility bridge navigation"
    >
      <div className="tabs-container">
        {BRIDGE_TABS.map((tab) => {
          const isActive = activeModule === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onModuleChange(tab.id)}
              className={`bridge-tab ${isActive ? 'active' : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`bridge-panel-${tab.id}`}
              aria-describedby={`tab-desc-${tab.id}`}
              tabIndex={0}
            >
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="tab-label">{tab.label}</span>
              <span 
                id={`tab-desc-${tab.id}`} 
                className="sr-only"
              >
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
