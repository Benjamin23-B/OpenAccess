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
        badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        dotClass: 'bg-rose-600 dark:bg-rose-500',
        ariaLive: 'assertive' as const
      };
    }
    
    switch (state) {
      case 'listening':
        return {
          text: 'Listening...',
          badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          dotClass: 'bg-emerald-600 dark:bg-emerald-500 animate-ping',
          ariaLive: 'polite' as const
        };
      case 'processing':
        return {
          text: 'Processing speech...',
          badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          dotClass: 'bg-amber-600 dark:bg-amber-500 animate-pulse',
          ariaLive: 'polite' as const
        };
      default:
        return {
          text: 'Ready',
          badgeClass: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          dotClass: 'bg-slate-400 dark:bg-slate-500',
          ariaLive: 'off' as const
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[13px] font-bold shadow-xs transition-all duration-300 ${config.badgeClass}`}
      role="status"
      aria-live={config.ariaLive}
      aria-atomic="true"
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
        {state === 'listening' && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotClass}`} />
      </span>
      <span className="leading-none">{config.text}</span>
    </div>
  );
}

