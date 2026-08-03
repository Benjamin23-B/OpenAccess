'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CwasaAvatarRendererProps {
  sigmlText?: string;
  avatarName?: 'anna' | 'marc' | 'francoise' | 'luna' | 'siggi';
  signingSpeed?: number;
  onStatusChange?: (status: string) => void;
}

declare global {
  interface Window {
    CWASA?: any;
    CWASA_READY?: boolean;
  }
}

export default function CwasaAvatarRenderer({
  sigmlText = '',
  avatarName = 'anna',
  signingSpeed = 1.0,
  onStatusChange,
}: CwasaAvatarRendererProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPlayedSigml = useRef<string>('');
  const initializedRef = useRef<boolean>(false);

  // 1. Inject CWASA CSS and Script on mount, then initialize CWASA
  useEffect(() => {
    let scriptEl: HTMLScriptElement | null = null;
    let linkEl: HTMLLinkElement | null = null;

    const initCwasaEngine = () => {
      if (window.CWASA && typeof window.CWASA.init === 'function') {
        if (!initializedRef.current) {
          try {
            window.CWASA.init({
              jasBase: '/cwa/',
              cwaBase: '/cwa/',
              useClientConfig: false,
              useCwaConfig: true,
              avSettings: [
                {
                  width: 512,
                  height: 384,
                  avList: 'avs',
                  initAv: avatarName || 'anna',
                  ambIdle: false,
                  allowFrameSteps: false,
                  allowSiGMLText: true,
                },
              ],
            });
            initializedRef.current = true;
          } catch (e) {
            console.warn('CWASA init notice:', e);
          }
        }
        setIsLoaded(true);
        onStatusChange?.('3D Avatar Ready');
      }
    };

    const loadAssets = () => {
      // 1. Link stylesheet if missing
      if (!document.getElementById('cwasa-css')) {
        linkEl = document.createElement('link');
        linkEl.id = 'cwasa-css';
        linkEl.rel = 'stylesheet';
        linkEl.href = '/cwa/cwasa.css';
        document.head.appendChild(linkEl);
      }

      // 2. Check if script already loaded
      if (window.CWASA && typeof window.CWASA.init === 'function') {
        initCwasaEngine();
        return;
      }

      const existingScript = document.getElementById('cwasa-js') as HTMLScriptElement;
      if (existingScript) {
        const poll = setInterval(() => {
          if (window.CWASA && typeof window.CWASA.init === 'function') {
            clearInterval(poll);
            initCwasaEngine();
          }
        }, 150);
        return;
      }

      // 3. Inject JS Script
      scriptEl = document.createElement('script');
      scriptEl.id = 'cwasa-js';
      scriptEl.src = '/cwa/allcsa.js';
      scriptEl.async = true;

      scriptEl.onload = () => {
        let attempts = 0;
        const check = setInterval(() => {
          attempts++;
          if (window.CWASA && typeof window.CWASA.init === 'function') {
            clearInterval(check);
            initCwasaEngine();
          } else if (attempts > 40) {
            clearInterval(check);
            setIsLoaded(true);
          }
        }, 100);
      };

      scriptEl.onerror = () => {
        setErrorMsg('Failed to load Kozha 3D Avatar script');
        onStatusChange?.('Engine Error');
      };

      document.body.appendChild(scriptEl);
    };

    loadAssets();
  }, []);

  // 2. Play SiGML whenever sigmlText updates
  useEffect(() => {
    if (!sigmlText || sigmlText === lastPlayedSigml.current || !isLoaded) return;

    if (window.CWASA && typeof window.CWASA.playSiGMLText === 'function') {
      try {
        lastPlayedSigml.current = sigmlText;
        onStatusChange?.('Signing Animation');
        
        // Delay play call slightly to ensure avatar mesh & skeleton are bound
        setTimeout(() => {
          try {
            if (window.CWASA && typeof window.CWASA.playSiGMLText === 'function') {
              window.CWASA.playSiGMLText(sigmlText, 0);
            }
          } catch (e) {
            console.warn('CWASA animation notice:', e);
          }
        }, 300);
      } catch (err: any) {
        console.warn('CWASA Play Error:', err);
      }
    }
  }, [sigmlText, isLoaded, onStatusChange]);

  // 3. Switch avatar if requested
  useEffect(() => {
    if (window.CWASA && typeof window.CWASA.setAvatar === 'function') {
      try {
        window.CWASA.setAvatar(avatarName, 0);
      } catch (e) {
        // Ignore if unsupported in active mode
      }
    }
  }, [avatarName]);

  return (
    <div
      ref={containerRef}
      className="cwasa-avatar-container relative w-full h-full min-h-[480px] bg-slate-900 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl flex flex-col items-center justify-center"
      style={{ minHeight: '480px', position: 'relative' }}
    >
      {/* Loading Overlay */}
      {!isLoaded && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 text-cyan-400 p-6 text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-lg">Initializing 3D Sign Language Avatar Engine...</p>
          <p className="text-sm text-slate-400 mt-1">Loading WebGL shaders and Kozha sign dictionaries</p>
        </div>
      )}

      {/* Error Fallback */}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 z-20 text-red-200 p-6 text-center">
          <span className="text-4xl mb-2">⚠️</span>
          <p className="font-semibold text-lg">{errorMsg}</p>
          <p className="text-sm opacity-80 mt-1">Please check WebGL availability in your browser</p>
        </div>
      )}

      {/* CWASA WebGL Panel Container */}
      <div
        className="CWASAAvatar av0 w-full h-full flex items-center justify-center"
        style={{ width: '100%', height: '100%', minHeight: '460px', background: '#0f172a' }}
      />
    </div>
  );
}
