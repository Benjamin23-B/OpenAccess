'use client';

import React, { useEffect, useRef, useState } from 'react';
import { sanitizeSigml } from '../services/signDictionaryService';

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
    CWASA_INITIALIZED?: boolean;
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

  useEffect(() => {
    let scriptEl: HTMLScriptElement | null = null;
    let linkEl: HTMLLinkElement | null = null;

    const initCwasaEngine = () => {
      if (!window.CWASA || typeof window.CWASA.init !== 'function') return;

      if (!window.CWASA_INITIALIZED) {
        window.CWASA_INITIALIZED = true;
        try {
          window.CWASA.init({
            jasBase: '/cwa/',
            cwaBase: '/cwa/',
            sigmlBase: 'sigml',
            avJARBase: 'avatars',
            useClientConfig: false,
            useCwaConfig: true,
            avSettings: [
              {
                width: 512,
                height: 384,
                avList: 'avsfull',
                initAv: (Boolean(avatarName) && (avatarName as string) !== 'null') ? avatarName : 'anna',
                ambIdle: false,
                allowFrameSteps: false,
                allowSiGMLText: true,
              },
            ],
          });
        } catch (e: any) {
          console.warn('CWASA WebGL init warning:', e);
          if (e?.message?.includes('viewport') || e?.message?.includes('WebGL')) {
            setErrorMsg('WebGL Avatar initialization failed. Please switch to Three.js R3F Avatar mode.');
            onStatusChange?.('WebGL Init Error');
            return;
          }
        }
      }

      if (window.CWASA.ready && typeof window.CWASA.ready.then === 'function') {
        window.CWASA.ready
          .then(() => {
            setIsLoaded(true);
            setErrorMsg(null);
            onStatusChange?.('Kozha 3D Avatar Ready');
          })
          .catch((err: any) => {
            console.warn('CWASA ready error:', err);
            setIsLoaded(true);
          });
      } else {
        setIsLoaded(true);
        onStatusChange?.('Kozha 3D Avatar Ready');
      }
    };

    const loadAssets = () => {
      if (!document.getElementById('cwasa-css')) {
        linkEl = document.createElement('link');
        linkEl.id = 'cwasa-css';
        linkEl.rel = 'stylesheet';
        linkEl.href = '/cwa/cwasa.css';
        document.head.appendChild(linkEl);
      }

      // Intercept uncaught CWASA WebGL viewport errors gracefully
      const handleGlobalError = (event: ErrorEvent) => {
        if (event?.message?.includes('viewport') || event?.message?.includes('Context Lost') || event?.filename?.includes('allcsa.js')) {
          console.warn('Handled CWASA WebGL notice:', event.message);
          event.preventDefault();
          setIsLoaded(true);
        }
      };
      window.addEventListener('error', handleGlobalError);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        console.warn('Prevented WebGL Context Lost on avatar canvas');
      };
      if (containerRef.current) {
        containerRef.current.addEventListener('webglcontextlost', handleContextLost, false);
      }

      if (window.CWASA && typeof window.CWASA.init === 'function') {
        setTimeout(initCwasaEngine, 100);
        return () => {
          window.removeEventListener('error', handleGlobalError);
          if (containerRef.current) containerRef.current.removeEventListener('webglcontextlost', handleContextLost);
        };
      }

      const existingScript = document.getElementById('cwasa-js') as HTMLScriptElement;
      if (existingScript) {
        const poll = setInterval(() => {
          if (window.CWASA && typeof window.CWASA.init === 'function') {
            clearInterval(poll);
            initCwasaEngine();
          }
        }, 150);
        return () => {
          clearInterval(poll);
          window.removeEventListener('error', handleGlobalError);
        };
      }

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
          } else if (attempts > 50) {
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

      return () => {
        window.removeEventListener('error', handleGlobalError);
      };
    };

    const cleanup = loadAssets();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const playTimerRef = useRef<any>(null);

  // Play SiGML whenever sigmlText updates (Sequential playback for multi-sign phrases)
  useEffect(() => {
    if (!sigmlText || sigmlText === lastPlayedSigml.current || !isLoaded) return;
    lastPlayedSigml.current = sigmlText;

    const signMatches = sigmlText.match(/<hns_sign[\s\S]*?<\/hns_sign>/gi);
    if (!signMatches || signMatches.length === 0) return;

    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
    }

    let index = 0;

    const playNextSign = () => {
      if (index >= signMatches.length) {
        onStatusChange?.('Kozha 3D Avatar Ready');
        return;
      }

      const singleSigml = sanitizeSigml(`<?xml version="1.0" encoding="utf-8"?>\n<sigml>\n${signMatches[index]}\n</sigml>`);
      const glossMatch = signMatches[index].match(/gloss="([^"]+)"/i);
      const gloss = glossMatch ? glossMatch[1] : `Sign ${index + 1}`;
      
      onStatusChange?.(`Signing (${index + 1}/${signMatches.length}): ${gloss}`);

      if (window.CWASA && typeof window.CWASA.playSiGMLText === 'function') {
        try {
          window.CWASA.playSiGMLText(singleSigml, 0);
        } catch (e) {
          console.warn('CWASA sign playback warning:', e);
        }
      }

      index++;
      const delay = Math.max(900, Math.round(1400 / (signingSpeed || 1.0)));
      playTimerRef.current = setTimeout(playNextSign, delay);
    };

    playNextSign();

    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
      }
    };
  }, [sigmlText, isLoaded, signingSpeed, onStatusChange]);

  // Switch avatar if requested
  useEffect(() => {
    if (!avatarName || (avatarName as string) === 'null' || !isLoaded) return;
    if (window.CWASA && typeof window.CWASA.setAvatar === 'function') {
      try {
        window.CWASA.setAvatar(avatarName, 0);
      } catch (e) {
        // Ignore if unsupported in active mode
      }
    }
  }, [avatarName, isLoaded]);

  return (
    <div
      ref={containerRef}
      className="cwasa-avatar-container relative w-full h-full min-h-[480px] bg-slate-900 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl flex flex-col items-center justify-center"
      style={{ minHeight: '480px', position: 'relative' }}
    >
      <style jsx global>{`
        .CWASAAvatar.av0 {
          width: 100% !important;
          height: 100% !important;
          min-height: 460px !important;
          position: relative !important;
          background: #0f172a !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .CWASAAvatar.av0 canvas,
        .CWASAAvatar.av0 .divAv {
          width: 100% !important;
          height: 100% !important;
          min-height: 460px !important;
          object-fit: contain !important;
        }
      `}</style>

      {/* Loading Overlay */}
      {!isLoaded && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 text-cyan-400 p-6 text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-lg">Initializing Kozha 3D Avatar (Anna / Marc / Francoise)...</p>
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
