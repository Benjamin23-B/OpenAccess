'use client';

import React from 'react';
import { ListeningState } from '@/hooks';

interface StatusIndicatorProps {
  state: ListeningState;
  error: { type: string; message: string } | null;
}

export default function StatusIndicator({ state, error }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    if (error) {
      return {
        text: 'Error',
        className: 'status-error',
        icon: '⚠️',
        ariaLive: 'assertive' as const
      };
    }
    
    switch (state) {
      case 'listening':
        return {
          text: 'Listening...',
          className: 'status-listening',
          icon: '🎤',
          ariaLive: 'polite' as const
        };
      case 'processing':
        return {
          text: 'Processing speech...',
          className: 'status-processing',
          icon: '⏳',
          ariaLive: 'polite' as const
        };
      default:
        return {
          text: 'Ready',
          className: 'status-idle',
          icon: '⏸️',
          ariaLive: 'off' as const
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div 
      className={`status-indicator ${config.className}`}
      role="status"
      aria-live={config.ariaLive}
      aria-atomic="true"
    >
      <span className="status-icon" aria-hidden="true">
        {config.icon}
      </span>
      <span className="status-text">{config.text}</span>
      {state === 'listening' && (
        <span className="microphone-pulse" aria-hidden="true">
          <span className="pulse-ring"></span>
          <span className="pulse-ring"></span>
        </span>
      )}
    </div>
  );
}
