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
    __nativeWebAssembly?: any;
  }
}

export default function CwasaAvatarRenderer({
  sigmlText = '',
  avatarName = 'luna',
  signingSpeed = 1.0,
  onStatusChange,
}: CwasaAvatarRendererProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPlayedSigml = useRef<string>('');
  const initializedRef = useRef(false);

  useEffect(() => {
    // 1. Snapshot browser's native WebAssembly BEFORE allcsa.js (exact Kozha app.html pattern)
    if (typeof window !== 'undefined' && window.WebAssembly && !window.__nativeWebAssembly) {
      window.__nativeWebAssembly = window.WebAssembly;
    }

    const initCWASA = () => {
      if (initializedRef.current) return;
      if (!window.CWASA || typeof window.CWASA.init !== 'function') return;
      initializedRef.current = true;

      try {
        // Kozha app.html exact init configuration
        window.CWASA.init({
          useClientConfig: false,
          useCwaConfig: true,
          avSettings: [
            {
              width: 512,
              height: 384,
              avList: 'avsfull',
              initAv: avatarName || 'luna',
              ambIdle: false,
              allowFrameSteps: false,
              allowSiGMLText: false,
            },
          ],
        });

        const onReady = () => {
          setIsLoaded(true);
          onStatusChange?.('Kozha 3D Avatar Ready');
        };

        if (window.CWASA.ready && typeof window.CWASA.ready.then === 'function') {
          window.CWASA.ready.then(onReady).catch(() => setIsLoaded(true));
        } else {
          setTimeout(onReady, 2000);
        }

        if (typeof window.CWASA.addHook === 'function') {
          window.CWASA.addHook('avatarready', onReady, 0);
        }
      } catch (e) {
        console.warn('CWASA init notice:', e);
        setIsLoaded(true);
      }
    };

    // Load cwasa.css
    if (!document.getElementById('cwasa-css')) {
      const link = document.createElement('link');
      link.id = 'cwasa-css';
      link.rel = 'stylesheet';
      link.href = '/cwa/cwasa.css';
      document.head.appendChild(link);
    }

    // Load allcsa.js if not already present
    if (window.CWASA && typeof window.CWASA.init === 'function') {
      initCWASA();
      return;
    }

    const existingScript = document.getElementById('cwasa-js');
    if (existingScript) {
      const poll = setInterval(() => {
        if (window.CWASA && typeof window.CWASA.init === 'function') {
          clearInterval(poll);
          initCWASA();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'cwasa-js';
    script.src = '/cwa/allcsa.js';
    script.defer = true;

    script.onload = () => {
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.CWASA && typeof window.CWASA.init === 'function') {
          clearInterval(check);
          initCWASA();
        } else if (attempts > 50) {
          clearInterval(check);
          setIsLoaded(true);
        }
      }, 100);
    };

    script.onerror = () => {
      setErrorMsg('Failed to load Kozha 3D avatar script (/cwa/allcsa.js)');
      onStatusChange?.('Engine Error');
    };

    document.body.appendChild(script);
  }, []);

  // Play SiGML whenever sigmlText updates
  useEffect(() => {
    if (!sigmlText || sigmlText === lastPlayedSigml.current || !isLoaded) return;
    if (typeof sigmlText !== 'string' || !sigmlText.trim()) return;
    if (sigmlText.includes('[object Object]')) return;

    if (window.CWASA && typeof window.CWASA.playSiGMLText === 'function') {
      try {
        lastPlayedSigml.current = sigmlText;
        onStatusChange?.('Signing Animation');
        
        setTimeout(() => {
          try {
            if (window.CWASA && typeof window.CWASA.playSiGMLText === 'function') {
              window.CWASA.playSiGMLText(sigmlText, 0);
            }
          } catch (e) {
            console.warn('CWASA animation notice:', e);
          }
        }, 200);
      } catch (err: any) {
        console.warn('CWASA Play Error:', err);
      }
    }
  }, [sigmlText, isLoaded, onStatusChange]);

  // Switch avatar character
  useEffect(() => {
    if (!avatarName || !isLoaded) return;
    try {
      const cwaMenu = document.querySelector('.menuAv.av0') as HTMLSelectElement;
      if (cwaMenu && cwaMenu.value !== avatarName) {
        cwaMenu.value = avatarName;
        cwaMenu.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      console.warn('Avatar switch error:', e);
    }
  }, [avatarName, isLoaded]);

  return (
    <div
      ref={containerRef}
      className="cwasa-avatar-container relative w-full h-[480px] min-h-[480px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center"
      style={{ width: '100%', height: '480px', minHeight: '480px', position: 'relative' }}
    >
      <style jsx global>{`
        .CWASAAvatar.av0,
        .CWASAAvatar {
          width: 100% !important;
          height: 480px !important;
          min-height: 480px !important;
          position: relative !important;
          background: #020617 !important;
          display: block !important;
        }
        .CWASAAvatar.av0 canvas,
        .CWASAAvatar canvas,
        .CWASAAvatar.av0 .divAv,
        .CWASAAvatar .divAv {
          width: 100% !important;
          height: 480px !important;
          min-height: 480px !important;
          display: block !important;
          object-fit: contain !important;
        }
      `}</style>

      {/* Loading Overlay */}
      {!isLoaded && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 text-cyan-400 p-6 text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-lg text-white">Initializing Kozha 3D Avatar ({avatarName.toUpperCase()})...</p>
          <p className="text-sm text-slate-400 mt-1">Loading Kozha WebGL engine & avatar models</p>
        </div>
      )}

      {/* Error Fallback */}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30 text-cyan-200 p-6 text-center">
          <span className="text-4xl mb-3">⚠️</span>
          <p className="font-bold text-lg text-white">CWASA WebGL Avatar Notice</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">{errorMsg}</p>
        </div>
      )}

      {/* CWASA WebGL Canvas Container - Exact Kozha app.html DOM structure */}
      <div
        className="CWASAAvatar av0 w-full h-[480px] block"
        style={{ width: '100%', height: '480px', minHeight: '480px', background: '#020617', display: 'block' }}
      />
      <div className="CWASAAvMenu av0" style={{ display: 'none' }} aria-hidden="true" />
      <div className="CWASAGUI av0" style={{ display: 'none' }} aria-hidden="true" />
    </div>
  );
}
